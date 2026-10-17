// Real-HTTP regression for the imperial volume, including Pages subpath and failure recovery.
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname,'..');
const site = path.join(root,'_site');
const base = '/roman-republic-fasti/';
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async () => {
  const manifest = JSON.parse(await fs.readFile(path.join(site,'asset-manifest.json'),'utf8'));
  const data = JSON.parse(await fs.readFile(path.join(root,'data/empire.json'),'utf8'));
  const requests = new Set(), errors = [];
  const server = http.createServer(async (req,res) => {
    const url = new URL(req.url,'http://localhost'); requests.add(url.pathname);
    if (!url.pathname.startsWith(base)) return res.writeHead(404).end();
    const file = path.resolve(site,url.pathname.slice(base.length) || 'index.html');
    if (!file.startsWith(site+path.sep)) return res.writeHead(404).end();
    try { res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream'); res.end(await fs.readFile(file)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser = await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL ? {channel:process.env.PLAYWRIGHT_CHANNEL} : {})});
    const context = await browser.newContext({viewport:{width:1440,height:1000}});
    const page = await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
    const origin = `http://127.0.0.1:${server.address().port}${base}`;
    const url = origin+'emperors.html';
    await page.goto(url); await page.waitForSelector('.story-card');
    assert.equal(await page.locator('.story-card').count(),6);
    await page.locator('#home-form-year').fill('0'); await page.locator('#home-form').evaluate(f=>f.requestSubmit());
    assert.match(await page.locator('#year-error').textContent(),/没有公元0年/);
    await page.selectOption('#home-form-era','BC'); await page.locator('#home-form-year').fill('1');
    await page.locator('#home-form').evaluate(f=>f.requestSubmit()); await page.waitForURL(/year=-1$/);
    await page.waitForSelector('#next-year'); await page.click('#next-year'); await page.waitForURL(/year=1$/);
    await page.click('#previous-year'); await page.waitForURL(/year=-1$/);
    await page.goto(url+'#year=-27'); await page.waitForSelector('#previous-year'); assert.equal(await page.isDisabled('#previous-year'),true);
    await page.goto(url+'#year=395'); await page.waitForSelector('#next-year'); assert.equal(await page.isDisabled('#next-year'),true);
    // Every accession, death and title transition: compare the rendered membership to authored records.
    const sample = new Set([-27,-1,1,14,69,193,238,250,251,253,260,269,272,273,274,293,305,306,309,310,337,350,360,378,383,393,395]);
    for (const p of Object.values(data.people)) for (const r of p.reigns) { if(data.years[r.start])sample.add(r.start); if(data.years[r.end])sample.add(r.end); }
    for (const y of [...sample].sort((a,b)=>a-b)) {
      await page.goto(url+`#year=${y}`);
      await page.waitForFunction(y=>document.title.startsWith(y<0?`前${-y}年`:`${y}年`),y);
      const count = data.years[y].rulers.length;
      assert.equal(await page.locator('.ruler-card').count(),count,`Rulers not rendered: ${y}`);
      assert.equal(await page.locator('.event-row').count(),data.years[y].events.length);
    }
    // Every person has a standalone, directly addressable three-paragraph biography.
    for (const person of Object.values(data.people)) {
      await page.goto(url+`#person=${person.id}`); await page.waitForSelector('.person-body');
      assert.equal(await page.locator('.person-heading h1').textContent(),person.zh);
      assert.equal(await page.locator('.person-body>p').count(),person.bio.length);
    }
    await page.goto(url+'#people'); await page.waitForSelector('#person-search');
    await page.locator('#person-search').fill('Zenobia'); assert.equal(await page.locator('.person-card').count(),1);
    await page.reload(); await page.waitForSelector('#person-search'); assert.equal(await page.locator('#person-search').inputValue(),'Zenobia');
    await page.locator('#person-search').fill('不存在的名字'); assert.equal(await page.locator('.person-card').count(),0);
    await page.locator('#person-search').fill(''); await page.selectOption('#kind-filter','caesar');
    assert.equal(await page.locator('.person-card').count(),Object.values(data.people).filter(p=>p.reigns.some(r=>r.kind==='caesar')).length);
    await page.goto(url+'#year=150'); await page.waitForSelector('#dated-only'); await page.check('#dated-only');
    assert.equal(await page.locator('#no-dated-events').isVisible(),true);
    await page.goto(url+'#year=260'); await page.waitForSelector('#empire-map-svg');
    await page.click('.ruler-card[data-person="postumus"] summary'); assert.equal(await page.locator('.ruler-card[data-person="postumus"] details').getAttribute('open'),'');
    await page.click('#sources-button'); assert.equal(await page.locator('#sources-dialog').isVisible(),true); await page.keyboard.press('Escape');
    await page.click('#map-zoom-in'); assert.match(await page.locator('#imperial-map-content').getAttribute('transform'),/scale\(1\.4\)/);
    await page.click('#map-reset'); assert.match(await page.locator('#imperial-map-content').getAttribute('transform'),/scale\(1\)/);
    const output = process.env.FASTI_OUTPUTS;
    if(output) await fs.mkdir(output,{recursive:true});
    for (const width of [320,390,768,1440]) {
      await page.setViewportSize({width,height:1000});
      for (const theme of ['light','dark']) {
        await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
        for (const hash of ['','#year=260','#year=293','#people','#person=diocletian']) {
          await page.goto(url+hash); await page.waitForFunction(()=>!document.querySelector('.initial-status'));
          assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${width}/${theme}/${hash}`);
        }
      }
    }
    if(output) {
      for(const [name,hash,width] of [['imperial-home','#',1440],['imperial-260','#year=260',1440],['imperial-mobile','#year=293',390]]) {
        await page.setViewportSize({width,height:1000}); await page.goto(url+hash); await page.waitForTimeout(150);
        await page.screenshot({path:path.join(output,name+'.png'),fullPage:true});
      }
    }
    for (const hash of ['#year=0','#year=396','#year=-28','#year=abc','#person=missing','#nonsense']) {
      await page.goto(url+hash); await page.waitForSelector('.empty-state[role=alert]');
      assert.equal(await page.locator('.ruler-card').count(),0);
    }
    for (const name of ['style.css','imperial.css','imperial-app.js','data/empire.json','data/imperial-territories.json']) {
      assert.ok(requests.has(base+manifest[name]),`No fingerprinted request: ${name}`);
      assert.ok(!requests.has(base+name),`Unversioned request: ${name}`);
    }
    // Network errors must leave a usable retry action, for both data and map.
    const failContext = await browser.newContext(); const failure = await failContext.newPage();
    failure.on('pageerror',e=>errors.push(e.message));
    const empireURL = '**/'+manifest['data/empire.json'];
    await failure.route(empireURL,route=>route.fulfill({status:503,body:'unavailable'}));
    await failure.goto(url); await failure.waitForSelector('#retry-data'); await failure.unroute(empireURL); await failure.click('#retry-data'); await failure.waitForSelector('.story-card');
    const mapURL = '**/'+manifest['data/imperial-territories.json'];
    await failure.route(mapURL,route=>route.fulfill({status:503,body:'unavailable'}));
    await failure.goto(url+'#year=293'); await failure.waitForSelector('#retry-map');
    assert.ok(await failure.locator('.ruler-card').count()>0);
    await failure.unroute(mapURL); await failure.click('#retry-map'); await failure.waitForSelector('#empire-map-svg');
    await failContext.close();
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`Imperial browser checks passed: ${sample.size} transition years, all ${data.stats.people} biographies, BCE/CE boundary, filters, maps, error recovery, Pages subpath, four widths and both themes.`);
  } finally { if(browser) await browser.close(); await new Promise(resolve=>server.close(resolve)); }
})().catch(error=>{console.error(error);process.exitCode=1;});
