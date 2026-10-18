// Real HTTP release regression, including GitHub Pages subpaths and all 82 years.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.ttf':'font/ttf'};
(async()=>{
 const data=JSON.parse(await fs.readFile(path.join(root,'data/divided-empire/records.json'),'utf8'));
 const manifest=JSON.parse(await fs.readFile(path.join(site,'asset-manifest.json'),'utf8'));
 const errors=[],requests=new Set();
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-republic-fasti\//,'/');requests.add(new URL(req.url,'http://localhost').pathname);
  if(name.endsWith('/'))name+='index.html';const file=path.resolve(site,'.'+name);
  if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const origin=`http://127.0.0.1:${server.address().port}`;
  for(const base of ['/','/roman-republic-fasti/']){
   const url=origin+base+'divided-empire/';
   await page.goto(url);await page.waitForSelector('.milestone');assert.equal(await page.locator('.milestone').count(),6);
   for(const value of ['394','477','0','-395','abc','4.5']){await page.fill('#year-input',value);await page.locator('#year-form').evaluate(f=>f.requestSubmit());assert.match(await page.locator('#year-error').textContent(),/395.*476/);}
   await page.fill('#year-input','395');await page.locator('#year-form').evaluate(f=>f.requestSubmit());await page.waitForSelector('.courts-grid');assert.ok(await page.isDisabled('#previous-year'));
   await page.click('#next-year');await page.waitForURL(/year=396$/);await page.waitForFunction(()=>document.title.startsWith('396年'));
   for(let y=395;y<=476;y++){
    await page.goto(url+'#year='+y);await page.waitForFunction(y=>document.title.startsWith(y+'年'),y);
    const actual=await page.locator('.ruler-card').evaluateAll(ns=>ns.map(n=>`${n.dataset.side}:${n.dataset.person}:${n.dataset.kind}`).sort());
    const expected=data.years[y].rulers.map(o=>`${data.people[o.person].reigns[o.reign].side}:${o.person}:${data.people[o.person].reigns[o.reign].kind}`).sort();
    assert.deepEqual(actual,expected,'Annual roster '+y);assert.equal(await page.locator('.event-row').count(),data.years[y].events.length);
    assert.equal(await page.locator('.vacancy-card').count(),data.years[y].vacancies.length);
    assert.equal(await page.locator('.ruler-card .native-name[lang=la]').count(),expected.length);
   }
   assert.ok(await page.isDisabled('#next-year'));
   await page.locator('#year-slider').fill('466');await page.locator('#year-slider').dispatchEvent('change');await page.waitForURL(/year=466$/);await page.waitForSelector('.no-emperor');
   await page.goto(url+'#year=476');await page.waitForSelector('#places-svg');assert.match(await page.locator('.map-caveat').allTextContents().then(t=>t.join(' ')),/不代表476年的城市控制权/);
   assert.ok(await page.locator('.map-territory-west').count()>0);assert.ok(await page.locator('.map-territory-east').count()>0);
   await page.click('#map-in');assert.match(await page.locator('#map-content').getAttribute('transform'),/scale\(1\.4\)/);await page.click('#map-reset');assert.match(await page.locator('#map-content').getAttribute('transform'),/scale\(1\)/);
   await page.selectOption('#event-side','east');assert.equal(await page.locator('.event-row:visible').count(),1);
   await page.selectOption('#event-side','');assert.equal(await page.locator('.event-row:visible').count(),2);
   for(const p of Object.values(data.people)){
    await page.goto(url+'#person='+p.id);await page.waitForSelector('.person-page');assert.equal(await page.locator('.person-heading h1').textContent(),p.zh);
    assert.equal(await page.locator('.person-heading .native-name').textContent(),p.nativeName.text);assert.equal(await page.locator('.person-body>p').count(),p.bio.length);
    assert.equal(await page.locator('.reign-entry').count(),p.reigns.length);
   }
   await page.goto(url+'#people');await page.waitForSelector('#person-search');assert.equal(await page.locator('.person-card').count(),33);
   await page.fill('#person-search','Θεοδοσιος');assert.ok(await page.locator('.person-card').count()>=2);
   await page.fill('#person-search','Iulius Nepos');assert.equal(await page.locator('.person-card').count(),1);
   await page.fill('#person-search','');await page.selectOption('#side-filter','east');await page.selectOption('#kind-filter','central');
   assert.equal(await page.locator('.person-card').count(),7);await page.reload();await page.waitForSelector('#kind-filter');assert.equal(await page.locator('#kind-filter').inputValue(),'central');
   await page.selectOption('#side-filter','');await page.selectOption('#kind-filter','');
   for(const [id]of Object.entries(data.dynasties)){await page.selectOption('#dynasty-filter',id);assert.equal(await page.locator('.person-card').count(),Object.values(data.people).filter(p=>p.dynasty===id).length);}
   await page.goto(url+'#sources');await page.waitForSelector('.source-catalog');assert.equal(await page.locator('.source-catalog>li').count(),Object.keys(data.sources).length);
   await page.goto(url);await page.waitForSelector('#download-years');
   let pending=page.waitForEvent('download');await page.click('#download-years');let file=await pending;const csv=await fs.readFile(await file.path(),'utf8');assert.equal(csv.trim().split('\r\n').length,83);assert.ok(csv.includes('达尔马提亚'));
   pending=page.waitForEvent('download');await page.click('#download-json');file=await pending;assert.deepEqual(JSON.parse(await fs.readFile(await file.path(),'utf8')),data);
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    for(const hash of ['','#year=395','#year=410','#year=466','#year=476','#people','#person=julius-nepos','#sources']){
     await page.goto(url+hash);await page.waitForFunction(()=>!document.querySelector('.initial-status')||!!document.querySelector('.courts-grid'));
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${base} ${width} ${theme} ${hash}`);
    }
   }
   for(const hash of ['#year=394','#year=477','#year=0','#year=abc','#person=missing','#unknown']){await page.goto(url+hash);await page.waitForSelector('.empty-state[role=alert]');}
   for(const key of ['divided-empire/app.js','divided-empire/style.css','data/divided-empire/records.json','data/divided-empire/places.json','data/divided-empire/territories.json'])assert.ok(requests.has(base+manifest[key]),key+' must use fingerprint');
   // Shared theme, and the transition to the next volume, remain normal links.
   await page.goto(url+'#year=476');await page.waitForSelector('.courts-grid');await page.click('#theme-button');const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
   await page.locator('.volume-footer a[href="../byzantine/"]').click();await page.waitForSelector('.hero-word');assert.equal(await page.locator('.hero-word').textContent(),'ῬΩΜΗ');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   await page.goto(origin+base+'byzantine/#year=476');await page.waitForSelector('.ruler-card');assert.equal(await page.locator('.name-language').count(),0);assert.ok(await page.locator('.ruler-greek[lang]').count()>0);
  }
  const url=origin+'/roman-republic-fasti/divided-empire/',failure=await context.newPage();failure.on('pageerror',e=>errors.push(e.message));
  const dataURL='**/'+manifest['data/divided-empire/records.json'],placesURL='**/'+manifest['data/divided-empire/territories.json'];
  await failure.route(dataURL,r=>r.fulfill({status:503,body:'unavailable'}));await failure.goto(url);await failure.waitForSelector('#retry-data');await failure.unroute(dataURL);await failure.click('#retry-data');await failure.waitForSelector('.milestone');
  await failure.route(placesURL,r=>r.fulfill({status:503,body:'unavailable'}));await failure.goto(url+'#year=476');await failure.waitForSelector('#retry-map');assert.ok(await failure.locator('.ruler-card').count()>0);await failure.unroute(placesURL);await failure.click('#retry-map');await failure.waitForSelector('#places-svg');await failure.close();
  if(process.env.FASTI_OUTPUTS){
   await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});
   for(const [name,hash,width,theme]of [['divided-home','',1440,'light'],['divided-476','#year=476',1440,'light'],['divided-mobile','#year=410',390,'dark'],['divided-466','#year=466',1440,'dark']]){
    await page.setViewportSize({width,height:1000});await page.goto(url+hash);await page.waitForFunction(()=>!document.querySelector('.initial-status'));await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,name+'.png'),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);console.log('Divided Empire browser checks passed: both deployment bases, all 82 years and 33 people, filters, downloads, map, retries, mobile themes, historical vacancies, and Byzantine copy.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
