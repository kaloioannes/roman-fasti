// Reading paths and editorial boundaries in the deployed, fingerprinted bundle.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
(async()=>{
 const index=JSON.parse(await fs.readFile(path.join(root,'data/events/index.json'),'utf8'));
 const server=http.createServer(async(req,res)=>{
  let url=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(url.endsWith('/'))url+='index.html';
  const file=path.resolve(site,'.'+url);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>{const m=document.querySelector('#content');return m?.getAttribute('aria-busy')==='false'&&m.dataset.renderedHash===location.hash;});
  for(const prefix of ['/','/roman-fasti/']){
   const base=`http://127.0.0.1:${server.address().port}${prefix}`;
   // Five volumes expose the same explicit edges beside their own source rows.
   for(const [period,id] of [['kingdom','foundation'],['republic','rep-bc312-1'],['empire','emp-ad312-1'],['divided-empire','divided-395-01'],['byzantine','byz-1071-1']]){
    const e=index.entries[period+':'+id];await page.goto(base+e.origins[0].url);
    const row=page.locator(`[data-event-id="${id}"],[data-event="${id}"]`).filter({has:page.locator('.event-inline-links')}).first();await row.waitFor();
    assert.equal(await row.locator('.event-inline-links a[href*="person="]').count(),e.people.length);
    assert.equal(await row.locator('.event-inline-links a[href*="place="]').count(),e.places.length);
    await row.getByRole('link',{name:'查看逐项关系依据 ↗',exact:true}).click();await ready();assert.equal(await page.locator('.event-detail').getAttribute('data-event-id'),e.id);
    if(e.people.length){await page.locator('.event-relations>li[data-person] details summary').first().click();assert.ok(await page.locator('.event-relations details[open] .event-citations').count());}
   }
   // A full loop: annual row -> person -> event -> place -> annual entry.
   await page.goto(base+'republic/#year=49');await page.locator('[data-event-id="rep-bc49-1"] .event-inline-links a[href*="pe9d1a9956a"]').waitFor();
   await page.locator('[data-event-id="rep-bc49-1"] .event-inline-links a[href*="pe9d1a9956a"]').click();await page.locator('.event-related-links a[href*="rep-bc49-1"]').waitFor();
   await page.locator('.event-related-links a[href*="rep-bc49-1"]').click();await ready();await page.locator('.event-relations a[href*="place=rubicon"]').click();await ready();
   assert.equal(await page.locator('#content').getAttribute('data-place-id'),'rubicon');assert.match(await page.locator('.place-events').textContent(),/卢比孔/);
   await page.locator('.event-year-links a').first().click();assert.match(page.url(),/republic\/#year=49/);await page.locator('[data-event-id="rep-bc49-1"] .event-inline-links').waitFor();
   // Explicit absence is never promoted to participation, nor reign to action.
   await page.goto(base+'events/#event=empire%3Aemp-ad378-1');await ready();assert.match(await page.locator('[data-person="empire:gratian"]').textContent(),/仅被提及/);
   await page.goto(base+'byzantine/#person=justinian-i');await page.locator('.event-related-links h2').waitFor();assert.match(await page.locator('.event-related-links').textContent(),/尚未编订/);
   await page.goto(base+'byzantine/#person=romanos-iv');await page.locator('.event-related-links a[href*="manzikert"]').waitFor();assert.equal(await page.locator('.event-related-links a[href*="bari"]').count(),0);
   await page.goto(base+'people/#person=roman-augustus');await page.locator('.event-related-links a[href*="emp-bc27-1"]').waitFor();assert.ok(await page.locator('.event-related-links a[href*="rep-bc27-1"]').count());
   // Place identities, aliases, multiple years and undated traditions.
   await page.goto(base+'places/#q=Nicaea');await ready();assert.equal(await page.locator('.event-card').count(),2);await page.locator('[data-place-id="nicaea"] h2 a').click();await ready();assert.match(await page.locator('h1').textContent(),/尼西亚/);
   await page.reload();await ready();assert.match(page.url(),/place=nicaea/);await page.goBack();await ready();assert.equal(await page.locator('#place-query').inputValue(),'Nicaea');
   await page.goto(base+'places/#place=ostia');await ready();assert.match(await page.locator('#content').textContent(),/未确定绝对年代/);assert.equal(await page.locator('.event-year-links li').count(),0);
   await page.goto(base+'places/#place=constantinople');await ready();assert.equal(await page.locator('.place-events>[data-event-id="byzantine:fourth-crusade-1202-1204"]').count(),1);
   for(const y of [1202,1203,1204])assert.ok(await page.locator(`.event-year-links a[href$="year=${y}"]`).count());
   const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'下载地点与关联 JSON',exact:true}).click();const exported=JSON.parse(await fs.readFile(await (await downloaded).path(),'utf8'));assert.equal(exported.place.id,'constantinople');assert.equal(exported.license,'CC BY-SA 4.0');assert.ok(exported.events.every(e=>e.placeRelations.some(r=>r.place==='constantinople')));
   await page.getByRole('button',{name:'复制地点链接',exact:true}).click();assert.match(await page.getByRole('textbox',{name:'地点稳定链接'}).inputValue(),new RegExp(prefix+'places/#place=constantinople'));
   await page.goto(base+'places/#place=missing');await ready();assert.match(await page.locator('h1').textContent(),/找不到/);
   await page.goto(base+'places/#q=不存在的地方987');await ready();assert.equal(await page.locator('.event-card').count(),0);
   await page.goto(base+'search/?q=Nicaea&kind=place');await page.locator('[data-kind="place"] h3 a').first().waitFor();await page.locator('[data-kind="place"] h3 a').first().click();await ready();assert.equal(await page.locator('#content').getAttribute('data-place-id'),'nicaea');
   // Every place is reachable and all its reverse edges agree with the source.
   for(const p of Object.values(index.places)){
    await page.goto(base+'places/#place='+p.id);await ready();assert.equal(await page.locator('.place-events>li').count(),index.byPlace[p.id].length,p.id);
   }
   for(const hash of ['', '#place=constantinople']){
    await page.goto(base+'places/'+hash);await ready();
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
     await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Place overflow ${prefix}/${hash}/${width}/${theme}`);
     if(process.env.FASTI_OUTPUTS&&prefix==='/'&&[390,1440].includes(width)){await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`places-${hash?'detail':'directory'}-${width}-${theme}.png`),fullPage:false,animations:'disabled'});}
    }
   }
   // Optional links recover independently and never replace original reading.
   for(const type of ['http','json','schema','members','timeout']){
    const p=await context.newPage();let broken=true,count=0;if(type==='timeout')await p.clock.install();
    await p.route('**/data/events/index.*.json',async r=>{count++;if(!broken)return r.continue();if(type==='timeout')return;
     const data=type==='schema'?{schemaVersion:999}:type==='members'?{...index,entries:{...index.entries,'bad':{}}}:null;
     return r.fulfill({status:type==='http'?503:200,contentType:'application/json',body:data?JSON.stringify(data):'{'});
    });await p.goto(base+'places/#place=rome');if(type==='timeout')await p.clock.fastForward(21000);await p.locator('#retry-places').waitFor();broken=false;await p.locator('#retry-places').click();await p.locator('.place-events').waitFor();assert.equal(count,2);await p.close();
   }
   const race=await context.newPage();let release,count=0;const gate=new Promise(r=>release=r);
   await race.route('**/data/events/index.*.json',async r=>{count++;await gate;await r.continue();});await race.goto(base+'places/#place=rome');await race.evaluate(()=>location.hash='place=bari');release();await race.waitForFunction(()=>document.querySelector('#content')?.dataset.placeId==='bari');assert.equal(count,1);assert.match(await race.locator('h1').textContent(),/巴里/);await race.close();
   // In restricted storage the graph still works, and the original spoiler toggle remains effective.
   const restricted=await browser.newContext();await restricted.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('blocked');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('blocked');}});});const rp=await restricted.newPage();await rp.goto(base+'places/#place=rome');await rp.locator('.place-events').waitFor();await restricted.close();
   await page.goto(base+'republic/#year=44');await page.locator('#spoiler-switch').check();await page.getByRole('button',{name:'展开第 1 条事件',exact:true}).waitFor();assert.equal(await page.locator('[data-event-id="rep-bc44-1"] .event-inline-links').count(),0);
   await page.getByRole('button',{name:'展开第 1 条事件',exact:true}).click();await page.locator('[data-event-id="rep-bc44-1"] .event-inline-links').waitFor();await page.locator('#spoiler-switch').uncheck();
  }
  assert.deepEqual(errors,[]);await context.close();console.log('Event links verified: all five volumes, full reading loops, all place profiles, aliases, cross-volume identity, evidence roles, failures, races, privacy, downloads, layouts and both deployment paths.');
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
