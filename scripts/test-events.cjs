// Published resources over real HTTP, including Pages subpaths and fault recovery.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
(async()=>{
 const index=JSON.parse(await fs.readFile(path.join(root,'data/events/index.json'),'utf8'));
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>{const m=document.querySelector('#content');return m?.getAttribute('aria-busy')==='false'&&m.dataset.renderedHash===location.hash;});
  for(const prefix of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${prefix}`,base=origin+'events/';
   const goto=async hash=>{await page.goto(base+'#'+hash);await ready();};
   await goto('');assert.match(await page.locator('#event-status').textContent(),new RegExp(`${Object.keys(index.entries).length} / ${Object.keys(index.entries).length}`));
   assert.equal(await page.locator('.event-card').count(),36);await page.getByRole('link',{name:'下一页 →',exact:true}).click();await ready();assert.match(await page.locator('#event-status').textContent(),/第 2 /);await page.reload();await ready();assert.match(await page.locator('#event-status').textContent(),/第 2 /);
   await goto('q=1071&kind=event');assert.equal(await page.locator('.event-card').count(),2);
   await page.locator('[data-event-id="byzantine:manzikert-1071"] h2 a').click();await ready();assert.match(await page.locator('.event-detail h1').textContent(),/曼齐刻尔特/);assert.match(await page.locator('.event-date').textContent(),/1071年8月26日/);assert.match(await page.locator('#event-sources .event-citations').textContent(),/本次直接查阅/);
   const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'下载此对象 JSON',exact:true}).click();const download=await downloadPromise;const saved=await download.path();const exported=JSON.parse(await fs.readFile(saved,'utf8'));assert.equal(exported.event.id,'byzantine:manzikert-1071');assert.equal(exported.license,'CC BY-SA 4.0');
   await page.getByRole('button',{name:'复制引用',exact:true}).click();assert.match(await page.locator('#event-citation').inputValue(),/稳定ID byzantine:manzikert-1071/);
   await page.getByRole('link',{name:/原年度摘要/}).click();await ready();assert.match(await page.locator('.event-detail .event-tags').textContent(),/年度摘要/);
   await page.getByRole('link',{name:/原卷原条/}).click();await page.locator('.event-row.search-target').waitFor();assert.equal(await page.locator('.event-row.search-target').getAttribute('data-event-id'),'byz-1071-1');await page.locator('.event-related-links a[href*="manzikert"]').waitFor();assert.ok(await page.locator('.event-archive-link').count());
   await page.locator('.event-related-links a[href*="bari"]').click();await ready();assert.match(await page.locator('.event-detail h1').textContent(),/巴里失守/);assert.equal(await page.locator('.event-relations a[href*="person="]').count(),0);
   await goto('q=1204&kind=event');assert.equal(await page.locator('[data-event-id="byzantine:fourth-crusade-1202-1204"]').count(),1);assert.equal(await page.locator('.event-card').count(),4);
   await page.locator('[data-event-id="byzantine:fourth-crusade-1202-1204"] h2 a').click();await ready();assert.equal(await page.locator('.event-year-links li').count(),3);assert.ok(await page.getByRole('link',{name:/子事件：/}).count()>=2);
   for(const year of [1202,1203,1204]){await goto('q='+year+'&kind=event');assert.equal(await page.locator('[data-event-id="byzantine:fourth-crusade-1202-1204"]').count(),1);}
   for(const year of [1012,1013]){await goto('q='+year+'&kind=event&topic=culture');assert.equal(await page.locator('[data-event-id="byzantine:byz-1013-1"]').count(),1);}
   await goto('place=manzikert');assert.match(await page.locator('#event-status').textContent(),/找到 2 /);await page.locator('[data-event-id="byzantine:manzikert-1071"] h2 a').click();await ready();await page.getByRole('link',{name:'罗曼努斯四世 ↗',exact:true}).click();await page.locator('.person-page h1').waitFor();await page.locator('.event-related-links a[href*="manzikert"]').waitFor();
   // Every volume's source object resolves by stable ID, preserving old URLs.
   for(const pid of index.periods.map(p=>p.id)){
    const e=Object.values(index.entries).find(e=>e.period===pid&&e.origins.length&&e.origins[0].year!==null);
    await goto('event='+encodeURIComponent(e.id));assert.equal(await page.locator('.event-detail').getAttribute('data-event-id'),e.id);
    await page.getByRole('link',{name:/原卷原条/}).click();await page.locator('.search-target').waitFor();assert.equal(await page.locator('.search-target').getAttribute(pid==='kingdom'?'data-event':'data-event-id'),e.origins[0].localId);
    if(pid!=='kingdom'){await page.goto(origin+e.origins[0].url.replace(/focus=[^&]+/,'focus=event:0'));await page.locator('.event-row.search-target').waitFor();}
   }
   await page.goto(origin+'byzantine/#year=1013');await page.locator('#dated-only').waitFor();await page.locator('#dated-only').check();assert.equal(await page.locator('.event-row:not([hidden])').count(),0);await page.locator('#dated-only').uncheck();assert.equal(await page.locator('.event-row:not([hidden])').count(),1);
   await goto('from=-1&to=1&period=empire');assert.ok(await page.locator('.event-card').count()>=2);
   for(const hash of ['from=0','from=1204&to=1071','kind=missing','place=missing','page=bad&topic=missing']){await goto(hash);assert.match(await page.locator('#event-status').textContent(),/无效|无法识别/);assert.equal(await page.locator('.event-card').count(),0);}
   await goto('q=不存在的词987');assert.match(await page.locator('#event-status').textContent(),/找到 0 /);
   await goto('event=not-an-event');assert.match(await page.locator('h1').textContent(),/找不到/);
   await goto('period=republic&certainty=disputed');assert.ok(await page.locator('.event-card').count()>0);
   await goto('q=曼齐刻尔特');await page.locator('#event-query').fill('巴里');await page.keyboard.press('Enter');await ready();assert.match(await page.locator('.event-results').textContent(),/巴里失守/);await page.goBack();await ready();assert.equal(await page.locator('#event-query').inputValue(),'曼齐刻尔特');
   await page.locator('#event-hide').check();assert.equal(await page.locator('.event-card>p').count(),0);await page.reload();await ready();assert.equal(await page.locator('#event-hide').isChecked(),true);await page.locator('.event-card h2 a').first().click();await ready();assert.ok(await page.locator('.event-hidden').count());await page.getByRole('button',{name:'展开事件正文',exact:true}).click();assert.match(await page.locator('.event-text').textContent(),/罗曼努斯/);await page.evaluate(()=>localStorage.removeItem('fasti-search-hide-snippets'));
   await goto('');await page.locator('#event-hide').uncheck();
   for(const hash of ['', 'event=byzantine%3Aconstantinople-capture-1204']){
    await goto(hash);
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
     await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Events overflow ${prefix}/${hash}/${width}/${theme}`);
     if(process.env.FASTI_OUTPUTS&&prefix==='/'&&[390,1440].includes(width)){await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`events-${hash?'detail':'directory'}-${width}-${theme}.png`),fullPage:true,animations:'disabled'});}
    }
   }
   for(const failure of ['http','network','json','schema','members','timeout']){
    const p=await context.newPage();let broken=true,count=0;
    if(failure==='timeout')await p.clock.install();
    await p.route('**/data/events/index.*.json',async route=>{count++;if(!broken)return route.continue();if(failure==='network')return route.abort();if(failure==='timeout')return;
     let body=failure==='schema'?{schemaVersion:99}:failure==='members'?{...index,entries:{...index.entries,'broken':{}}}:null;
     await route.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:body?JSON.stringify(body):'{'});
    });
    await p.goto(base+'#event=byzantine%3Amanzikert-1071');if(failure==='timeout')await p.clock.fastForward(21000);await p.locator('#retry-events').waitFor();broken=false;await p.locator('#retry-events').click();await p.locator('.event-detail h1').waitFor();assert.equal(count,2,failure);await p.close();
   }
   const delayed=await context.newPage();let release,count=0;const gate=new Promise(r=>release=r),requests=[];
   delayed.on('request',r=>{if(r.url().includes('.json'))requests.push(r.url());});
   await delayed.route('**/data/events/index.*.json',async route=>{count++;await gate;await route.continue();});
   await delayed.goto(base+'#event=byzantine%3Amanzikert-1071');await delayed.evaluate(()=>location.hash='event=byzantine%3Abari-1071');release();await delayed.locator('.event-detail h1').waitFor();assert.match(await delayed.locator('h1').textContent(),/巴里/);assert.equal(count,1);assert.ok(requests.every(r=>r.includes('/data/events/index.')));await delayed.close();
   // Text and order edits still resolve a source anchor by identity, not position.
   const rep=JSON.parse(await fs.readFile(path.join(root,'data/republic/records.json'),'utf8'));
   const record=Object.values(rep.years).find(r=>r.events.length>1),first=record.events[0].id;
   const reordered=await context.newPage();
   await reordered.route('**/data/republic/records.*.json',async r=>{const changed=structuredClone(rep);changed.years[record.year].events.reverse();changed.years[record.year].events.find(e=>e.id===first).title='Edited source words';await r.fulfill({contentType:'application/json',body:JSON.stringify(changed)});});
   await reordered.goto(origin+`republic/#year=${record.year}&focus=event:${first}`);await reordered.locator('.event-row.search-target').waitFor();assert.equal(await reordered.locator('.search-target').getAttribute('data-event-id'),first);assert.match(await reordered.locator('.search-target').textContent(),/Edited source words/);await reordered.close();
   // A test-only old-ID migration preserves the canonical share/citation URL.
   const aliasPage=await context.newPage();await aliasPage.route('**/data/events/index.*.json',async r=>{await r.fulfill({contentType:'application/json',body:JSON.stringify({...index,aliases:{'byzantine:retired-test':{target:'byzantine:manzikert-1071',reason:'Test-only migration'}}})});});
   await aliasPage.goto(base+'#event=byzantine%3Aretired-test');await aliasPage.locator('.event-detail h1').waitFor();assert.match(aliasPage.url(),/manzikert-1071/);assert.match(await aliasPage.locator('#event-citation').inputValue(),/manzikert-1071/);await aliasPage.close();
   // Optional navigation failure cannot stop annual text or maps; retry only it.
   const nav=await context.newPage();let fail=true,navCount=0,records=0;
   nav.on('request',r=>{if(/\/data\/byzantine\/records\./.test(r.url()))records++;});
   await nav.route('**/data/events/navigation.*.json',async r=>{navCount++;if(fail)await r.fulfill({status:503,body:''});else await r.continue();});
   await nav.goto(origin+'byzantine/#year=1071');await nav.getByRole('button',{name:'重试事件链接',exact:true}).waitFor();assert.match(await nav.locator('#annual-events').textContent(),/曼齐刻尔特/);fail=false;await nav.getByRole('button',{name:'重试事件链接',exact:true}).click();await nav.locator('.event-related-links a[href*="bari"]').waitFor();assert.equal(navCount,2);assert.equal(records,1);await nav.close();
   const corrupt=await context.newPage();let bad=true;await corrupt.route('**/data/events/navigation.*.json',async r=>{if(!bad)return r.continue();await r.fulfill({contentType:'application/json',body:JSON.stringify({schemaVersion:1,entries:{},byYear:{'byzantine:1071':['missing']},byPerson:{}})});});
   await corrupt.goto(origin+'byzantine/#year=1071');await corrupt.getByRole('button',{name:'重试事件链接',exact:true}).waitFor();bad=false;await corrupt.getByRole('button',{name:'重试事件链接',exact:true}).click();await corrupt.locator('.event-related-links a[href*="bari"]').waitFor();await corrupt.close();
  }
  assert.deepEqual(errors,[]);await context.close();console.log('Events UI verified: five source volumes, stable and legacy anchors, references, deduplicated ranges, filters, navigation, export, privacy, failures, races, layouts and both deployment paths.');
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
