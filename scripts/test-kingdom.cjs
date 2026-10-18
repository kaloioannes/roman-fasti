// Real HTTP tests of both root and Pages deployments; no external requests needed.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-republic-fasti\//,'/');
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
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  // Hash URL changes precede the app's hashchange render, especially in headless CI.
  const waitYear=year=>page.waitForFunction(y=>document.querySelector('.year-top h1')?.firstChild?.textContent.trim()===String(-y),year);
  const waitMap=()=>page.waitForSelector('.place-map[data-basemap="ready"] .map-land');
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()}: ${r.url()}`)});
  for(const base of ['/','/roman-republic-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${base}`;
   const url=origin+'kingdom/';
   await page.goto(origin);await page.locator('a.period-card[href="kingdom/"]').click();
   await page.waitForSelector('#year-form');
   assert.equal(await page.locator('.king-card').count(),8);
   await page.locator('#year-input').fill('0');await page.locator('#year-form button').click();
   assert.match(await page.locator('#year-error').innerText(),/753.*509/);
   await page.locator('#year-input').fill('753');await page.locator('#year-form button').click();
   await page.waitForURL(url+'#year=-753');
   await page.waitForSelector('#annual-events [data-event="foundation"]');
   assert.equal(await page.locator('#previous-year').isDisabled(),true);
   await page.locator('.skip-link').focus();await page.keyboard.press('Enter');
   assert.equal(new URL(page.url()).hash,'#year=-753');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'content');
   assert.equal(await page.locator('.year-columns [data-person]').count(),1);
   await waitMap();
   const coast=await page.locator('.place-map .map-land').evaluate(e=>({d:e.getAttribute('d'),box:{width:e.getBBox().width,height:e.getBBox().height}}));
   assert.ok(coast.d.length>100&&!/NaN|Infinity/.test(coast.d),'Coast must have valid projected geometry');
   assert.ok(coast.box.width>100&&coast.box.width<=600&&coast.box.height>200&&coast.box.height<=361,'Coast must occupy the map viewport');
   assert.equal(await page.locator('.map-place[data-place="rome"] circle').count(),1);
   assert.match(await page.locator('#map-description').textContent(),/现代.*不绘制领土边界/);
   assert.match(await page.locator('.year-columns').innerText(),/共治.*未定/);
   await page.locator('#next-year').click();await page.waitForURL(url+'#year=-752');
   await waitYear(-752);
   assert.equal(await page.locator('#annual-events .event').count(),0);
   assert.match(await page.locator('#annual-events').innerText(),/无可定年记载/);
   assert.ok(await page.locator('.traditions [data-dating="undated"]').count()>0);
   await page.locator('#year-slider').fill('-700');
   await page.locator('#year-slider').dispatchEvent('change');await page.waitForURL(url+'#year=-700');
   await waitYear(-700);
   assert.match(await page.locator('.year-columns').innerText(),/努马/);
   for(const [year,count] of [[-716,1],[-715,1],[-672,2],[-640,2],[-616,2],[-578,2],[-534,2],[-509,1]]){
    await page.goto(url+`#year=${year}`);await waitYear(year);
    assert.equal(await page.locator('.year-columns [data-person]').count(),count,`Rulers ${year}`);
    assert.equal(await page.locator('[data-interregnum]').count(),[-716,-715].includes(year)?1:0);
    assert.equal(await page.locator('.place-map').count(),1);
    assert.match(await page.locator('.place-map').textContent(),/不表示疆域/);
   }
   assert.equal(await page.locator('#next-year').isDisabled(),true);
   // Every annual route must show a real basemap, including interregna and transitions.
   const records=JSON.parse(await fs.readFile(path.join(root,'data/kingdom/records.json'),'utf8'));
   for(let year=-753;year<=-509;year++){
    await page.evaluate(y=>location.hash=`year=${y}`,year);await waitYear(year);await waitMap();
    const expected=[...new Set(records.years[year].rulers.flatMap(id=>records.people[id].places))].sort();
    assert.deepEqual(await page.locator('.map-place').evaluateAll(nodes=>nodes.map(n=>n.dataset.place).sort()),expected,`Places ${year}`);
   }
   await page.locator('a[href="../republic/#year=509"]').click();
   await page.waitForFunction(()=>document.querySelector('#year-number')?.textContent==='509');
   await page.goto(url+'#people');await page.waitForSelector('#person-query');
   await page.locator('#person-query').fill('Numa');
   assert.equal(await page.locator('#person-results .king-card').count(),1);
   await page.locator('#person-query').fill('老塔克文');
   assert.equal(await page.locator('#person-results [data-person="tarquinius-priscus"]').count(),1);
   await page.locator('#person-query').fill('nobody');
   assert.match(await page.locator('#person-results').innerText(),/未找到/);
   await page.goto(url+'#person=titus-tatius');await page.waitForSelector('.bio');
   assert.match(await page.locator('.bio').innerText(),/共治起讫未定/);
   assert.ok(await page.locator('.bio>.sources a').count()>=2);
   await page.goto(url+'#sources');await page.waitForSelector('.method-item');
   assert.match(await page.locator('#content').innerText(),/空位|空缺/);
   for(const bad of ['year=753','year=-754','year=-508','year=','year=-600.5','person=unknown','unknown']){
    await page.goto(url+'#'+bad);await page.waitForSelector('[role="alert"]');
    assert.match(await page.locator('h1').innerText(),/链接需要修正/);
   }
   for(const route of ['','#year=-534','#people','#person=servius-tullius','#sources']){
    await page.goto(url+route);await page.waitForFunction(()=>!document.querySelector('.initial-status'));
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
     await page.setViewportSize({width,height:1000});
     await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Kingdom overflow ${route}/${width}/${theme}`);
     if(process.env.FASTI_OUTPUTS&&base==='/'&&[390,1440].includes(width)&&theme==='light'&&['','#year=-534'].includes(route)){
      await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});
      await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`kingdom-${route?'year':'home'}-${width}.png`),fullPage:true});
     }
     if(route.startsWith('#year=')){
      await waitMap();
      const fills=await page.evaluate(()=>['.map-land','.map-ocean'].map(s=>getComputedStyle(document.querySelector('.place-map '+s)).fill));
      assert.notEqual(fills[0],fills[1],`Land/sea contrast ${width}/${theme}`);
      if(process.env.FASTI_OUTPUTS&&base==='/'&&[390,1440].includes(width))await page.locator('.place-map').screenshot({path:path.join(process.env.FASTI_OUTPUTS,`kingdom-map-${width}-${theme}.png`),style:'.site-header{visibility:hidden}'});
     }
    }
   }
   await page.goto(url);await page.waitForSelector('#export-years');
   const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#export-years').click()]);
   assert.equal(download.suggestedFilename(),'roman-kingdom-years.csv');
   const csv=await fs.readFile(await download.path(),'utf8');
   assert.equal(csv.split('\r\n').length,246);assert.ok(csv.includes('Interregnum (transition)'));
   assert.ok(csv.includes('no-datable-record'));
   const [jsonDownload]=await Promise.all([page.waitForEvent('download'),page.locator('#export-data').click()]);
   assert.equal(JSON.parse(await fs.readFile(await jsonDownload.path(),'utf8')).stats.years,245);
   await page.locator('#theme-button').click();
   const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
   await page.locator('a[href="../"]').first().click();await page.waitForSelector('.period-card');
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
  }
  assert.deepEqual(errors,[]);
  // One failed JSON request must be recoverable without losing the requested year.
  const failed=await context.newPage();let fail=true;
  await failed.route('**/records.*.json',route=>fail?route.fulfill({status:503,body:'unavailable'}):route.continue());
  const url=`http://127.0.0.1:${server.address().port}/roman-republic-fasti/kingdom/#year=-640`;
  await failed.goto(url);await failed.waitForSelector('#retry');
  fail=false;await failed.locator('#retry').click();await failed.waitForSelector('[data-event="ancus-accession"]');
  assert.match(await failed.locator('.year-top h1').innerText(),/640/);
  // A failed basemap must not hide the rulers or places; retry keeps the year.
  const mapFailure=await context.newPage();let failMap=true;
  await mapFailure.route('**/land-50m.json',route=>failMap?route.fulfill({status:503,body:'unavailable'}):route.continue());
  await mapFailure.goto(url);await mapFailure.waitForSelector('.place-map[data-basemap="error"]');
  assert.ok(await mapFailure.locator('.king-card').count()>0);
  assert.ok(await mapFailure.locator('.map-place').count()>0);
  failMap=false;await mapFailure.locator('.map-status button').click();
  await mapFailure.waitForSelector('.place-map[data-basemap="ready"] .map-land');
  assert.equal(new URL(mapFailure.url()).hash,'#year=-640');
  // Navigate away during a slow map request, then return before it completes.
  const slow=await context.newPage();let releaseMap;
  const gate=new Promise(resolve=>releaseMap=resolve);
  await slow.route('**/land-50m.json',async route=>{await gate;await route.continue()});
  await slow.goto(url,{waitUntil:'domcontentloaded'});await slow.waitForSelector('.place-map');
  await slow.evaluate(()=>location.hash='people');await slow.waitForSelector('#person-query');
  await slow.evaluate(()=>location.hash='year=-534');await slow.waitForSelector('.place-map');
  releaseMap();await slow.waitForSelector('.place-map[data-basemap="ready"] .map-land');
  assert.match(await slow.locator('.year-top h1').innerText(),/534/);
  const noJS=await browser.newContext({javaScriptEnabled:false});const fallback=await noJS.newPage();
  await fallback.goto(url);assert.ok(await fallback.locator('noscript a').isVisible());
  console.log('Kingdom browser checks passed: root + Pages, all 245 annual basemaps, transitions, unknown years, people, sources, CSV/JSON, data/map retry, slow navigation, theme and mobile; no external requests.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
