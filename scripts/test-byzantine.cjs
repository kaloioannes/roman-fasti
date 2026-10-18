// Real HTTP checks at both the domain root and GitHub Pages project subpath.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(site,'asset-manifest.json'),'utf8'));
 const data=JSON.parse(await fs.readFile(path.join(root,'data/byzantine/records.json'),'utf8'));
 const requests=new Set(),errors=[];
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');requests.add(url.pathname);
  let name=url.pathname.replace(/^\/roman-republic-fasti\//,'/');if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file))}
  catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const serverOrigin=`http://127.0.0.1:${server.address().port}`;
  for(const base of ['/','/roman-republic-fasti/']){
   const url=serverOrigin+base+'byzantine/';
   await page.goto(url);await page.waitForSelector('.story-card');
   assert.equal(await page.locator('.story-card').count(),6);
   assert.match(await page.title(),/拜占庭/);
   for(const y of ['475','1454','0','abc']){
    await page.locator('#home-form-year').fill(y);await page.locator('#home-form').evaluate(f=>f.requestSubmit());
    assert.match(await page.locator('#year-error').textContent(),/476.*1453/);
   }
   await page.locator('#home-form-year').fill('476');await page.locator('#home-form').evaluate(f=>f.requestSubmit());
   await page.waitForSelector('#previous-year');assert.equal(await page.isDisabled('#previous-year'),true);
   await page.click('#next-year');await page.waitForURL(/year=477$/);
   await page.waitForFunction(()=>document.title.startsWith('477年'));await page.waitForSelector('.event-row');
   assert.equal(await page.locator('.empty-year').count(),0);
   assert.match(await page.locator('.event-row').textContent(),/阿尔马图斯/);
   await page.goto(url+'#year=1453');await page.waitForFunction(()=>document.title.startsWith('1453年'));assert.equal(await page.isDisabled('#next-year'),true);
   await page.locator('#year-slider').fill('0');await page.locator('#year-slider').dispatchEvent('change');await page.waitForURL(/year=476$/);
   const sample=new Set([476,477,527,641,674,705,743,797,920,945,960,1042,1119,1180,1204,1205,1208,1221,1242,1243,1259,1261,1347,1354,1378,1390,1399,1402,1403,1406,1407,1448,1449,1453]);
   for(const p of Object.values(data.people))for(const r of p.reigns){if(data.years[r.start])sample.add(r.start);if(data.years[r.end])sample.add(r.end)}
   for(const y of sample){
    await page.goto(url+`#year=${y}`);await page.waitForFunction(y=>document.title.startsWith(`${y}年`),y);
    const actual=await page.locator('.ruler-card').evaluateAll(ns=>ns.map(n=>`${n.dataset.person}:${n.dataset.kind}`).sort());
    const expected=data.years[y].rulers.map(o=>`${o.person}:${data.people[o.person].reigns[o.reign].kind}`).sort();
    assert.deepEqual(actual,expected,`Wrong rendered membership ${y}`);
    assert.equal(await page.locator('.event-row').count(),data.years[y].events.length,`Wrong events ${y}`);
    assert.equal(await page.locator('.ruler-greek[lang]').count(),expected.length);
    assert.equal(await page.locator('.regnal-dates').count(),expected.length);
    for(const o of data.years[y].rulers){const p=data.people[o.person];assert.ok(await page.locator(`[data-person="${p.id}"] .ruler-greek[lang="${p.nativeName.lang}"]`).count());}
    assert.equal(await page.locator('.ruler-card .purple-tag').count(),data.years[y].rulers.filter(o=>data.people[o.person].purple).length);
   }
   // Every person can be linked directly and renders the authored paragraphs.
   for(const p of Object.values(data.people)){
    await page.goto(url+'#person='+p.id);await page.waitForFunction(id=>document.querySelector('.person-page .ruler-greek')?.textContent===id,p.nativeName.text);
    assert.equal(await page.locator('.person-heading .ruler-greek').getAttribute('lang'),p.nativeName.lang);
    assert.equal(await page.locator('.regnal-dates').count(),p.reigns.length);
    for(const r of p.reigns){assert.ok((await page.locator('.reign-list').textContent()).includes(r.startDate.label));assert.ok((await page.locator('.reign-list').textContent()).includes(r.endDate.label));}
    assert.equal(await page.locator('.person-body>p').count(),p.bio.length,p.id);
    assert.equal(await page.locator('.person-heading .purple-tag').count(),p.purple?1:0);
    assert.equal(await page.locator('.purple-evidence').count(),p.purple?1:0);
    if(p.purple)assert.ok((await page.locator('.purple-evidence').textContent()).includes(p.purple.note));
   }
   await page.goto(url+'#people');await page.waitForSelector('#purple-only');await page.check('#purple-only');
   assert.equal(await page.locator('.person-card').count(),data.stats.purple);
   await page.reload();await page.waitForSelector('#purple-only');assert.equal(await page.isChecked('#purple-only'),true);
   await page.uncheck('#purple-only');
   await page.locator('#person-search').fill('Κωνσταντινος');assert.ok(await page.locator('.person-card').count()>5,'Greek accent-insensitive search');
   await page.locator('#person-search').fill('Iustinianus');assert.equal(await page.locator('.person-card').count(),1,'Early Latin alias');
   await page.locator('#person-search').fill('');
   for(const id of Object.keys(data.dynasties)){
    await page.selectOption('#dynasty-filter',id);
    assert.equal(await page.locator('.person-card').count(),Object.values(data.people).filter(p=>p.dynasty===id).length,id);
   }
   for(const alias of ['vatatzes','瓦塔齐斯家族']){
    await page.goto(url+'#people&dynasty='+encodeURIComponent(alias));await page.waitForSelector('#dynasty-filter');
    assert.equal(await page.locator('#dynasty-filter').inputValue(),'laskaris');
    assert.equal(await page.locator('.person-card').count(),4);
   }
   await page.goto(url+'#year=1208');await page.waitForSelector('#empire-map-svg');
   assert.ok(await page.locator('.polity-nicaea').count()>0);assert.ok(await page.locator('.polity-latin').count()>0);assert.ok(await page.locator('.polity-trebizond').count()>0);
   await page.click('#map-zoom-in');assert.match(await page.locator('#imperial-map-content').getAttribute('transform'),/scale\(1\.4\)/);
   await page.click('#map-reset');assert.match(await page.locator('#imperial-map-content').getAttribute('transform'),/scale\(1\)/);
   await page.goto(url+'#year=1402');await page.waitForFunction(()=>document.querySelector('#map-caption')?.textContent.includes('源GIS缺少1402'));
   await page.click('#sources-button');assert.equal(await page.locator('#sources-dialog').isVisible(),true);
   assert.match(await page.locator('#method-content').textContent(),/原名语言/);await page.keyboard.press('Escape');
   await page.goto(url+'#year=1013');await page.waitForFunction(()=>document.title.startsWith('1013年'));
   await page.check('#dated-only');assert.equal(await page.locator('.event-row').isVisible(),false);
   assert.equal(await page.locator('#no-dated-events').isVisible(),true);
   await page.uncheck('#dated-only');assert.equal(await page.locator('.event-row').isVisible(),true);
   await page.goto(url);await page.waitForSelector('#download-years');
   const csvPromise=page.waitForEvent('download');await page.click('#download-years');const csv=await csvPromise;
   const csvText=await fs.readFile(await csv.path(),'utf8');assert.equal(csvText.trim().split('\r\n').length,979);assert.ok(csvText.includes('1453'));
   const jsonPromise=page.waitForEvent('download');await page.click('#download-json');const j=await jsonPromise;
   assert.equal(JSON.parse(await fs.readFile(await j.path(),'utf8')).stats.years,978);
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    for(const hash of ['','#year=476','#year=1042','#year=1453','#people&purple=1','#person=constantine-vii']){
     await page.goto(url+hash);await page.waitForFunction(()=>!document.querySelector('.initial-status'));
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${base}/${width}/${theme}/${hash}`);
    }
   }
   for(const hash of ['#year=475','#year=1454','#year=0','#year=-1','#year=abc','#person=missing','#nonsense']){
    await page.goto(url+hash);await page.waitForSelector('.empty-state[role=alert]');assert.equal(await page.locator('.ruler-card').count(),0);
   }
   for(const name of ['byzantine/app.js','byzantine/style.css','data/byzantine/records.json','data/byzantine/territories.json'])assert.ok(requests.has(base+manifest[name]),`Unfingerprinted resource ${name}`);
  }
  const url=serverOrigin+'/roman-republic-fasti/byzantine/';
  // Data and map failures recover independently without losing readable annual data.
  const fail=await context.newPage();fail.on('pageerror',e=>errors.push(e.message));
  const dataURL='**/'+manifest['data/byzantine/records.json'];
  await fail.route(dataURL,r=>r.fulfill({status:503,body:'unavailable'}));await fail.goto(url);await fail.waitForSelector('#retry-data');
  await fail.unroute(dataURL);await fail.click('#retry-data');await fail.waitForSelector('.story-card');
  const mapURL='**/'+manifest['data/byzantine/territories.json'];
  await fail.route(mapURL,r=>r.fulfill({status:503,body:'unavailable'}));await fail.goto(url+'#year=1261');await fail.waitForSelector('#retry-map');
  assert.ok(await fail.locator('.ruler-card').count()>0);await fail.unroute(mapURL);await fail.click('#retry-map');await fail.waitForSelector('#empire-map-svg');
  await fail.close();
  if(process.env.FASTI_OUTPUTS){
   await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});
   for(const [name,hash,width,theme] of [['byzantine-home','',1440,'light'],['byzantine-1208','#year=1208',1440,'light'],['byzantine-purple','#person=constantine-vii',1440,'light'],['byzantine-mobile','#year=1453',390,'dark']]){
    await page.setViewportSize({width,height:1000});await page.goto(url+hash);await page.waitForFunction(()=>!document.querySelector('.initial-status'));
    if(hash.startsWith('#year'))await page.waitForSelector('#empire-map-svg');
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,name+'.png'),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);await context.close();
  console.log(`Byzantine browser checks passed: both deployment bases, all ${data.stats.people} biographies, title boundaries, Greek/Latin search, all families, purple evidence/filter, complete annual entries, precise regnal dates, downloads, maps, retries, four widths and both themes.`);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(e=>{console.error(e);process.exitCode=1});
