// Test old public URLs and new period entries at both domain root and Pages subpath.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const site=path.resolve(__dirname,'../_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);
  if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file))}
  catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext();
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()}: ${r.url()}`)});
  for(const base of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${base}`;
   await page.goto(origin);
   await page.waitForFunction(()=>document.querySelector('#available-periods')?.textContent.includes('483'));
   assert.equal(await page.locator('.period-card').count(),5);
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Catalogue overflow: ${width}/${theme}`);
    if(process.env.FASTI_OUTPUTS&&base==='/'&&theme==='light'&&[390,1440].includes(width)){
      await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});
      await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`catalog-${width}.png`),fullPage:true,animations:"disabled"});
    }
   }
   await page.locator('#theme-button').click();
   const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
   await page.locator('a.period-card[href="empire/"]').click();await page.waitForSelector('.story-card');
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   await page.locator('.site-header a[href="../"]').click();await page.waitForSelector('.period-card');
   for(const [old,target] of [
    ['?from=bookmark#year=44','republic/?from=bookmark#year=44'],
    ['index.html#stories','republic/#stories'],
    ['#story=sertorian-rome&year=77','republic/#story=sertorian-rome&year=77']
   ]){
    await page.goto(origin+old);await page.waitForURL(origin+target);
    await page.waitForFunction(()=>!document.querySelector('.initial-status'));
    if(target.includes('year=44'))await page.waitForFunction(()=>document.querySelector('#year-number')?.textContent==='44');
   }
   for(const retired of ['emperor.html','emperors.html']){
    const response=await context.request.get(origin+retired);
    assert.equal(response.status(),404,`${retired} must not be published`);
   }
   // Hash changes on the already loaded catalogue are also old-style navigation.
   await page.goto(origin);await page.waitForSelector('.period-card');
   await page.evaluate(()=>location.hash='year=509');await page.waitForURL(origin+'republic/#year=509');
   await page.waitForFunction(()=>document.querySelector('#year-number')?.textContent==='509');

   // Follow every chronological handoff, including Republic's positive BCE URLs.
   const handoffs=[
    ['kingdom',-509,'republic',509],['republic',509,'kingdom',-509],
    ['republic',27,'empire',-27],['empire',-27,'republic',27],
    ['empire',395,'divided-empire',395],['divided-empire',395,'empire',395],
    ['divided-empire',476,'byzantine',476],['byzantine',476,'divided-empire',476]
   ];
   for(const [from,y,to,target] of handoffs){
    await page.goto(`${origin}${from}/#year=${y}`);
    const link=page.locator('.period-boundary a');
    await link.waitFor({state:'visible'});
    assert.equal(await link.getAttribute('href'),`../${to}/#year=${target}`);
    await link.click();await page.waitForURL(`${origin}${to}/#year=${target}`);
    await page.waitForSelector('#year-slider');
    assert.ok(await page.locator('h1:visible').textContent().then(t=>t.includes(String(Math.abs(target)))));
   }
   for(const [id,y] of [['kingdom',-753],['byzantine',1453],['republic',44],['divided-empire',410]]){
    await page.goto(`${origin}${id}/#year=${y}`);await page.waitForSelector('#year-slider');
    assert.equal(await page.locator('.period-boundary a').count(),0,`${id}/${y} must not wrap or jump volumes`);
   }
   const periods=['kingdom','republic','empire','divided-empire','byzantine'];
   for(const [i,id] of periods.entries()){
    await page.goto(`${origin}${id}/`);await page.waitForSelector('.period-footer');
    const links=await page.locator('.period-footer a').evaluateAll(as=>as.map(a=>a.getAttribute('href')));
    assert.deepEqual(links,[...(i?[`../${periods[i-1]}/`]:[]),'../',...(i<4?[`../${periods[i+1]}/`]:[])]);
    const crossVolume=await page.locator('footer a').evaluateAll(as=>as.map(a=>a.getAttribute('href')).filter(h=>/^\.\.\/[a-z-]+\/$/.test(h)));
    assert.deepEqual(crossVolume,links.filter(h=>h!=='../'),'No obsolete or duplicate volume footer');
   }
   for(const id of ['empire','byzantine','divided-empire']){
    const y=id==='empire'?260:id==='byzantine'?1204:410;
    await page.goto(`${origin}${id}/#year=${y}`);await page.waitForSelector('#year-slider');
    assert.equal(await page.locator('.year-note,.year-explanation').count(),0);
    if(id==='divided-empire')await page.locator('.site-header a[href="#sources"]').click();
    else await page.locator('#sources-button').click();
    const note=page.locator('.reading-method');await note.waitFor({state:'visible'});
    assert.equal(await note.getAttribute('open'),null);
    await note.locator('summary').click();assert.ok(await note.locator('p').isVisible());
   }
   await page.goto(`${origin}divided-empire/`);await page.waitForSelector('.dual-hero');
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1100});
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    await page.evaluate(()=>document.fonts.ready);
    const geometry=await page.evaluate(()=>{
     const box=s=>document.querySelector(s).getBoundingClientRect();
     const middle=r=>(r.left+r.right)/2;
     const textRight=s=>{const range=document.createRange();range.selectNodeContents(document.querySelector(s));return range.getBoundingClientRect().right};
     return {axis:middle(box('.dual-hero')),lines:[...document.querySelectorAll('.hero-line')].map(el=>middle(el.getBoundingClientRect())),latin:textRight('[data-side=east]>.eyebrow'),chinese:textRight('[data-side=east]>h2'),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(!geometry.overflow,`Divided hero overflow ${width}/${theme}`);
    for(const center of geometry.lines)assert.ok(Math.abs(center-geometry.axis)<1,`Hero axis ${width}/${theme}`);
    assert.ok(Math.abs(geometry.latin-geometry.chinese)<2,`East court alignment ${width}/${theme}`);
    if(process.env.FASTI_OUTPUTS&&base==='/'&&[390,1440].includes(width))await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`divided-${width}-${theme}.png`),fullPage:true,animations:"disabled"});
   }
  }
  assert.deepEqual(errors,[]);
  // Static fallback remains usable if JavaScript is disabled or catalogue data fails.
  const noJS=await browser.newContext({javaScriptEnabled:false});
  const fallback=await noJS.newPage();await fallback.goto(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await fallback.locator('.period-card').count(),5);
  // Catalogue cards are generated at build time, with no runtime data fetch.
  const failed=await context.newPage();await failed.route('**/*.json',route=>route.fulfill({status:503,body:'unavailable'}));
  await failed.goto(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await failed.locator('.period-card').count(),5);
  console.log('Routes verified: root + Pages subpath, 8 chronological handoffs, volume footers, reading notes, hero alignment, catalogue, legacy redirects, static fallback and responsive themes.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
