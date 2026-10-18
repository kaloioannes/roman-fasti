// Exercise the published, fingerprinted assets at both supported deployment paths.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}};

(async()=>{
 const manifest=await read('_site/asset-manifest.json');
 const data=await read('data/republic/records.json'),atlas=await read('data/republic/territories.json');
 const resources={records:manifest['data/republic/records.json'],atlas:manifest['data/republic/territories.json'],land:'shared/assets/land-50m.json',stories:manifest['data/republic/stories.json']};
 const errors=[];
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/(?:roman-fasti\/)?/,'');
  if(!name||name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,name);
  if(!file.startsWith(site+path.sep)){res.writeHead(404).end();return}
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file))}
  catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  for(const base of ['/','/roman-fasti/']){
   async function session(modes={},options={}){
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    const counts={records:0,atlas:0,land:0,stories:0},gates={};
    for(const [key,name] of Object.entries(resources)){
     gates[key]=deferred();
     await context.route(origin+base+name,async route=>{
      counts[key]++;
      const mode=modes[key];
      if(mode?.startsWith('delay'))await gates[key].promise;
      if(mode==='503'||mode==='delay-503')return route.fulfill({status:503,body:'Unavailable'});
      if(mode==='abort')return route.abort('failed');
      if(mode==='json')return route.fulfill({contentType:'application/json',body:'{broken'});
      if(mode==='empty')return route.fulfill({json:{features:[]}});
      if(mode==='topology')return route.fulfill({json:{objects:{}}});
      return route.fallback();
     });
    }
    const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    if(options.timeout)await page.clock.install();
    await page.goto(origin+base+'republic/'+(options.hash??'#year=44'));
    return {page,counts,modes,gates,context,close:async()=>{Object.values(gates).forEach(g=>g.resolve());await context.close()}};
   }
   async function year(page,y,story){
    await page.evaluate(hash=>location.hash=hash,story?`story=${story}&year=${y}`:`year=${y}`);
    await readable(page,y,story);
   }
   async function readable(page,y=44,story){
    await page.waitForFunction(y=>!document.querySelector('#detail').hidden&&document.querySelector('#year-number').textContent===String(y),y);
    assert.equal(await page.locator('.official-card').count(),data.years[y].officers.length);
    assert.equal(await page.locator('.event-body h3').first().textContent(),data.years[y].events[0].title);
    assert.ok(await page.locator('#year-source-links a').count());
    assert.equal(await page.locator('#archive-error').isVisible(),false);
    assert.equal(await page.locator('#loading').isVisible(),false);
    if(story)assert.equal(await page.locator('.chapter-reading h3').count(),1);
   }
   async function map(page,y=44){
    await page.waitForFunction(y=>document.querySelector('#map-svg').dataset.year===String(y),y);
    assert.equal(await page.locator('.map-territory').count(),1);
    assert.ok((await page.locator('.map-territory').getAttribute('d')).length>80);
    const feature=atlas.features.find(f=>-y>=f.properties.from&&-y<=f.properties.to);
    assert.equal(await page.locator('#map-year-label').textContent(),feature.properties.label);
    assert.ok((await page.locator('#map-caption').textContent()).startsWith(feature.properties.caption));
    assert.match(await page.locator('#map').getAttribute('aria-label'),new RegExp(`前${y}年`));
    assert.equal(await page.locator('#map-status').isVisible(),false);
    assert.equal(await page.locator('.territory-section .map-card').getAttribute('aria-busy'),'false');
   }
   async function retry(page){await page.locator('#retry-map').focus();await page.keyboard.press('Enter')}

   // Landing page and source dialog need no map; subsequent reading reuses text.
   {
    const s=await session({},{hash:''});
    await s.page.waitForSelector('.story-card');
    assert.equal(s.counts.records+s.counts.atlas+s.counts.land,0);
    await s.page.locator('#sources-button').click();await s.page.waitForSelector('.stats-line');
    assert.equal(s.counts.atlas+s.counts.land,0);
    await s.page.keyboard.press('Escape');await year(s.page,44);await map(s.page);
    assert.deepEqual(s.counts,{records:1,atlas:1,land:1,stories:1});await s.close();
   }
   // Both map resources independently survive HTTP, network and JSON failures.
   for(const key of ['atlas','land'])for(const mode of ['503','abort','json',key==='atlas'?'empty':'topology']){
    const s=await session({[key]:mode},{hash:'#story=sertorian-rome&year=80'});
    await readable(s.page,80,'sertorian-rome');await s.page.waitForSelector('#retry-map');
    assert.equal(await s.page.locator('#map').isVisible(),false);
    assert.equal(await s.page.locator('.map-territory').count(),0);
    assert.match(await s.page.locator('#map-status').textContent(),/仍可阅读/);
    await s.page.locator('#sources-button').click();await s.page.waitForSelector('.stats-line');await s.page.keyboard.press('Escape');
    // Spoiler controls and chapter navigation remain usable during the outage.
    await s.page.locator('.global-spoiler').click();assert.equal(await s.page.locator('.event-body').count(),0);
    await s.page.locator('#reveal-chapter').click();assert.equal(await s.page.locator('.chapter-reading h3').count(),1);
    await s.page.locator('.global-spoiler').click();
    await year(s.page,77,'sertorian-rome');assert.equal(s.counts[key],1,'Navigation must not repeatedly retry a failed resource');
    s.modes[key]=null;await retry(s.page);await map(s.page,77);
    assert.equal(s.counts[key],2);assert.equal(s.counts[key==='atlas'?'land':'atlas'],1);
    assert.equal(s.counts.records,1);assert.equal(s.counts.stories,1);
    await s.page.locator('#map-zoom-in').click();
    await s.page.waitForFunction(()=>document.querySelector('#map-content').getAttribute('transform')==='translate(-190,-127.5) scale(1.5)');
    await s.page.locator('#map-reset').click();
    await s.page.waitForFunction(()=>document.querySelector('#map-content').getAttribute('transform')==='translate(0,0) scale(1)');
    await s.close();
   }
   // Simultaneous failures: a success is retained across later partial retries.
   {
    const s=await session({atlas:'503',land:'503'});await readable(s.page);await s.page.waitForSelector('#retry-map');
    await s.page.waitForFunction(()=>document.querySelector('.map-card').getAttribute('aria-busy')==='false');
    s.modes.atlas=null;await retry(s.page);
    await s.page.waitForFunction(()=>document.querySelector('#map-status').textContent.includes('疆域：已就绪'));
    s.modes.land=null;await retry(s.page);await map(s.page);
    assert.deepEqual(s.counts,{records:1,atlas:2,land:3,stories:1});await s.close();
   }
   // Retry while the other resource is pending: share that in-flight request.
   {
    const s=await session({atlas:'503',land:'delay'});await readable(s.page);await s.page.waitForSelector('#retry-map');
    s.modes.atlas=null;await retry(s.page);
    await s.page.waitForFunction(()=>document.querySelector('#map-status').textContent.includes('疆域：已就绪'));
    assert.equal(s.counts.land,1);s.gates.land.resolve();await map(s.page);await s.close();
   }
   // Text failure is local, starts no map work and recovers without a reload.
   for(const mode of ['503','abort','json','empty']){
    const s=await session({records:mode},{hash:'#story=sertorian-rome&year=80'});
    await s.page.waitForSelector('#retry-data',{state:'visible'});
    assert.equal(await s.page.locator('#detail').isVisible(),false);
    assert.equal(await s.page.locator('.story-card').count(),10);
    assert.equal(s.counts.atlas+s.counts.land,0);
    s.modes.records=null;await s.page.locator('#retry-data').focus();await s.page.keyboard.press('Enter');
    await readable(s.page,80,'sertorian-rome');await map(s.page,80);
    assert.deepEqual(s.counts,{records:2,atlas:1,land:1,stories:1});await s.close();
   }
   // The method dialog shares text requests, has its own retry, and needs no map.
   {
    const s=await session({records:'503'},{hash:''});await s.page.locator('#sources-button').click();
    await s.page.waitForSelector('#retry-method');assert.equal(s.counts.atlas+s.counts.land,0);
    s.modes.records=null;await s.page.locator('#retry-method').click();await s.page.waitForSelector('.stats-line');
    await s.page.keyboard.press('Escape');await year(s.page,44);await map(s.page);assert.equal(s.counts.records,2);await s.close();
   }
   // Delayed map completion renders only the current year, including history.
   {
    const s=await session({atlas:'delay',land:'delay'});await readable(s.page);
    await year(s.page,509);await year(s.page,80,'sertorian-rome');
    s.gates.atlas.resolve();s.gates.land.resolve();await map(s.page,80);
    await s.page.goBack();await readable(s.page,509);await map(s.page,509);
    await s.page.goForward();await readable(s.page,80,'sertorian-rome');await map(s.page,80);
    assert.deepEqual(s.counts,{records:1,atlas:1,land:1,stories:1});await s.close();
   }
   // Late successes and failures cannot repopulate a map after leaving the year.
   for(const mode of ['delay','delay-503']){
    const s=await session({atlas:mode,land:'delay'});await readable(s.page);
    await s.page.evaluate(()=>location.hash='');await s.page.waitForSelector('#home',{state:'visible'});
    s.gates.atlas.resolve();s.gates.land.resolve();await s.page.waitForLoadState('networkidle');
    assert.equal(await s.page.locator('#map-svg').getAttribute('data-year'),null);
    assert.equal(await s.page.locator('.map-territory').count(),0);
    assert.equal(await s.page.locator('#archive-error').isVisible(),false);
    s.modes.atlas=null;await year(s.page,509);
    if(mode==='delay-503'){await s.page.waitForSelector('#retry-map');await retry(s.page)}
    await map(s.page,509);assert.equal(s.counts.land,1);await s.close();
   }
   // Late text errors must not overwrite a newer route or display an old error.
   {
    const s=await session({records:'delay-503'});
    await s.page.evaluate(()=>location.hash='year=43');
    await s.page.evaluate(()=>location.hash='');await s.page.waitForSelector('#home',{state:'visible'});
    s.gates.records.resolve();await s.page.waitForLoadState('networkidle');
    assert.equal(await s.page.locator('#archive-error').isVisible(),false);
    assert.equal(await s.page.locator('#loading').isVisible(),false);
    s.modes.records=null;await year(s.page,43);await map(s.page,43);await s.close();
   }
   // Advance the browser clock only after healthy requests have completed. This
   // exercises the actual 20-second timeout without racing normal network I/O.
   for(const key of ['atlas','land','records']){
    const s=await session({[key]:'delay'},{timeout:true});
    if(key==='records'){
     await s.page.waitForSelector('.story-card');await s.page.clock.fastForward(20001);
     await s.page.waitForSelector('#retry-data',{state:'visible'});
     assert.match(await s.page.locator('#archive-error').textContent(),/超时/);
     assert.equal(s.counts.atlas+s.counts.land,0);
     s.modes[key]=null;s.gates[key].resolve();await s.page.locator('#retry-data').click();
    }else{
     await readable(s.page);
     await s.page.waitForFunction(label=>document.querySelector('#map-status').textContent.includes(`${label}：已就绪`),key==='atlas'?'底图':'疆域');
     await s.page.clock.fastForward(20001);await s.page.waitForSelector('#retry-map');
     assert.match(await s.page.locator('#map-status').textContent(),/超时/);
     s.modes[key]=null;s.gates[key].resolve();await retry(s.page);
    }
    await readable(s.page);await map(s.page);assert.equal(s.counts[key],2);
    for(const other of ['records','atlas','land'].filter(k=>k!==key))assert.equal(s.counts[other],1);
    await s.close();
   }
   // Visible failure states fit phone/tablet/desktop in both themes; keyboard
   // retries above also exercise the controls outside the map's image role.
   {
    const s=await session({land:'503'});await readable(s.page);await s.page.waitForSelector('#retry-map');
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
     await s.page.setViewportSize({width,height:900});await s.page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
     assert.ok(await s.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${base} ${width} ${theme}`);
     if(process.env.FASTI_SCREENSHOTS&&[390,1440].includes(width)&&theme==='dark'){
      await fs.mkdir(process.env.FASTI_SCREENSHOTS,{recursive:true});
      await s.page.locator('.territory-section').screenshot({path:path.join(process.env.FASTI_SCREENSHOTS,`map-failure-${base==='/'?'root':'pages'}-${width}.png`)});
     }
    }
    await s.close();
   }
   console.log(`Republic loading verified at ${base}: isolated failures, selective retry/cache, timeouts, reading, route races, history, keyboard and responsive states.`);
  }
  assert.deepEqual(errors,[]);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
