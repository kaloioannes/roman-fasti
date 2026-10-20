const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
(async()=>{
 const data=JSON.parse(await fs.readFile(path.join(root,'data/dynasties/index.json'),'utf8'));
 const nav=JSON.parse(await fs.readFile(path.join(root,'data/dynasties/navigation.json'),'utf8'));
 const server=http.createServer(async(req,res)=>{let url=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(url.endsWith('/'))url+='index.html';const file=path.resolve(site,'.'+url);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=p=>p.waitForFunction(()=>{const m=document.querySelector('#content');return m?.getAttribute('aria-busy')==='false'&&m.dataset.renderedHash===location.hash;});
  for(const prefix of ['/','/roman-fasti/']){
   const base=`http://127.0.0.1:${server.address().port}${prefix}`;
   await page.goto(base+'dynasties/');await ready(page);assert.equal(await page.locator('.dynasty-card').count(),Object.keys(data.topics).length);
   await page.locator('#dynasty-query').fill('Κομνηνος');assert.ok(await page.locator('.dynasty-card[data-topic="byzantine--komnenos"]').count());await page.getByRole('button',{name:'查找',exact:true}).click();await ready(page);await page.locator('.dynasty-card[data-topic="byzantine--komnenos"] h2 a').click();await ready(page);assert.equal(await page.locator('#content').getAttribute('data-topic'),'byzantine--komnenos');
   await page.reload();await ready(page);await page.getByRole('link',{name:'← 王朝与家族目录',exact:true}).click();await ready(page);assert.equal(await page.locator('#dynasty-query').inputValue(),'Κομνηνος');
   await page.goto(base+'dynasties/#coverage=curated');await ready(page);assert.equal(await page.locator('.dynasty-card').count(),3);
   await page.goto(base+'dynasties/#q=unfindable987');await ready(page);assert.equal(await page.locator('.dynasty-card').count(),0);
   await page.goto(base+'dynasties/#period=missing');await ready(page);assert.match(await page.locator('#content').textContent(),/筛选条件需要修正/);
   await page.goto(base+'dynasties/#topic=missing');await ready(page);assert.match(await page.locator('h1').textContent(),/找不到/);
   // The entire classification catalogue, including all individual title stages.
   for(const t of Object.values(data.topics)){
    await page.goto(base+t.url);await ready(page);assert.equal(await page.locator('h1').textContent(),t.label,t.id);assert.equal(await page.locator('[data-member]').count(),t.members.length,t.id);assert.equal(await page.locator('[data-stage]').count(),t.stages.length,t.id);
    if(!t.curated)assert.equal(await page.locator('.dynasty-graph svg').count(),0,t.id);
   }
   for(const t of Object.values(data.topics).filter(t=>t.curated)){
    await page.goto(base+t.url+'&type=all');await ready(page);assert.equal(await page.locator('.dynasty-relation').count(),t.edges.length);
     assert.equal(await page.locator('.dynasty-relation>details').count(),t.edges.length);
    for(const type of Object.keys(data.types)){
     await page.locator('#relation-type').selectOption(type);await ready(page);const expected=t.edges.filter(e=>e.type===type);
     assert.equal(await page.locator('.dynasty-relation').count(),expected.length,t.id+':'+type);
     assert.equal(await page.locator('.dynasty-graph .edge').count(),expected.length,t.id+':'+type);
     if(expected.length){const line=page.locator('.dynasty-graph svg a').first();await line.focus();await page.keyboard.press('Enter');await ready(page);assert.match(await page.evaluate(()=>document.activeElement.id),/^relation-/);await page.reload();await ready(page);assert.equal(await page.locator('.dynasty-relation.is-selected').count(),1);}
    }
   }
   const jc=data.topics['empire--julio-claudian'];await page.goto(base+jc.url+'&type=all&status=uncertain');await ready(page);assert.equal(await page.locator('.dynasty-relation').count(),1);assert.match(await page.locator('.dynasty-relation').textContent(),/传闻/);
   await page.goto(base+jc.url+'&type=adoption&focus=empire%3Aclaudius&at=50');await ready(page);assert.equal(await page.locator('.dynasty-relation').count(),1);assert.match(await page.locator('.dynasty-relation').textContent(),/50年/);
   await page.goto(base+jc.url+'&at=0');await ready(page);assert.match(await page.locator('#relationships').textContent(),/筛选条件需要修正/);
   await page.goto(base+jc.url+'&node=livia');await ready(page);assert.equal(await page.locator('#node-detail').getAttribute('data-node'),'livia');assert.equal(await page.evaluate(()=>document.activeElement.id),'node-detail');await page.getByRole('button',{name:'只看此人的直接关系',exact:true}).click();await ready(page);assert.equal(await page.locator('#relation-person').inputValue(),'livia');
   await page.goto(base+jc.url+'&node=agrippa');await ready(page);assert.ok(await page.locator('#node-detail a[href="../republic/#person=p622a2ed1a3"]').count());
   await page.goto(base+jc.url);await ready(page);await page.locator('#dynasty-event-scope').selectOption('context');assert.match(await page.locator('#events').textContent(),/非行动归因/);await page.locator('#dynasty-event-query').fill('unfindable987');assert.equal(await page.locator('.dynasty-events article').count(),0);await page.locator('#dynasty-event-query').fill('');await page.locator('#dynasty-event-scope').selectOption('highlights');assert.equal(await page.locator('.dynasty-events article').count(),jc.highlights.length);
   const eventHref=await page.locator('.dynasty-events h3 a').first().getAttribute('href');await page.locator('.dynasty-events h3 a').first().click();await page.locator('h1').waitFor();assert.ok(page.url().includes(eventHref.slice(3)));
   await page.goto(base+jc.url);await ready(page);const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载专题与出处 JSON',exact:true}).click();const exported=JSON.parse(await fs.readFile(await(await download).path(),'utf8'));assert.equal(exported.topic.id,jc.id);assert.equal(exported.topic.edges.length,jc.edges.length);assert.equal(exported.license,'CC BY-SA 4.0');assert.ok(exported.sources['suet-augustus'].scope);assert.ok(exported.nodes.livia.references.length);assert.ok(Object.keys(exported.stages).length);
   await page.getByRole('button',{name:'复制当前视图链接',exact:true}).click();assert.match(await page.locator('[aria-label="专题稳定链接"]').inputValue(),/dynasties\/#topic=empire--julio-claudian/);
   await page.goto(base+'search/?q=Flavian&kind=dynasty');await page.locator('[data-kind="dynasty"] h3 a').first().waitFor();assert.equal(await page.locator('.result-group:not([data-kind="dynasty"])').count(),0);await page.locator('[data-kind="dynasty"] h3 a').first().click();await ready(page);assert.equal(await page.locator('#content').getAttribute('data-topic'),'empire--flavian');
   for(const route of ['empire/#person=augustus','republic/#person=p6faf564142','republic/#person=p622a2ed1a3','people/#person=roman-augustus','byzantine/#person=alexios-i','divided-empire/#person=theodosius-i']){
    await page.goto(base+route);await page.locator('.dynasty-profile-links a').first().waitFor();assert.ok(await page.locator('.header-actions a[href="../dynasties/"]').count(),route);
   }
   // Root and Pages layouts, light/dark, equivalent list and horizontal scroll.
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:950});await page.goto(base+jc.url);await ready(page);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${prefix} ${width} ${theme}`);
    assert.ok(await page.locator('.dynasty-relation').count());
    const originalWidth=await page.locator('.dynasty-graph svg').getAttribute('width');await page.getByRole('button',{name:'放大关系图',exact:true}).click();assert.ok(Number(await page.locator('.dynasty-graph svg').getAttribute('width'))>Number(originalWidth));await page.getByRole('button',{name:'重置图幅',exact:true}).click();assert.equal(await page.locator('.dynasty-graph svg').getAttribute('width'),originalWidth);
    const graph=page.locator('.dynasty-graph');await graph.focus();await page.keyboard.press('ArrowRight');
    if(width===1440&&theme==='light'||width===390&&theme==='dark'){await page.locator('#relationships').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'../',`dynasties-${width}-${theme}.png`),fullPage:false});}
   }
   await page.setViewportSize({width:1280,height:900});
   // HTTP, malformed JSON, deeply invalid schema, timeout and independent retry.
   for(const compact of [false,true])for(const failure of ['http','json','schema','timeout']){
    const p=await context.newPage();let broken=true,count=0,records=0;if(failure==='timeout')await p.clock.install();p.on('request',r=>{if(/data\/empire\/records\./.test(r.url()))records++;});
    await p.route(compact?'**/data/dynasties/navigation.*.json':'**/data/dynasties/index.*.json',async r=>{count++;if(!broken)return r.continue();if(failure==='timeout')return;const invalid=structuredClone(compact?nav:data);if(compact)invalid.byPerson['empire:augustus']=['missing'];else invalid.topics[jc.id].edges[0].to='missing';return r.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='json'?'{':JSON.stringify(invalid)});});
    await p.goto(base+(compact?'empire/#person=augustus':'dynasties/'+jc.url.split('dynasties/')[1]));if(compact)await p.locator('.person-page h1').waitFor();if(failure==='timeout')await p.clock.fastForward(21000);
    const retry=compact?p.getByRole('button',{name:'重试王朝关联',exact:true}):p.locator('#retry-dynasties');await retry.waitFor();const before=records;broken=false;await retry.click();await p.locator(compact?'.dynasty-profile-links a':'.dynasty-relation').first().waitFor();assert.equal(count,2);assert.equal(records,before);await p.close();
   }
   const race=await context.newPage();let release,count=0;const gate=new Promise(r=>release=r);await race.route('**/data/dynasties/index.*.json',async r=>{count++;await gate;await r.continue();});await race.goto(base+jc.url);await race.evaluate(()=>location.hash='topic=empire--flavian');release();await race.waitForFunction(()=>document.querySelector('#content')?.dataset.topic==='empire--flavian');assert.equal(count,1);await race.close();
   const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('blocked');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('blocked');}});});const restricted=await blocked.newPage();await restricted.goto(base+jc.url);await ready(restricted);assert.equal(await restricted.locator('h1').textContent(),jc.label);await restricted.getByRole('button',{name:'切换明暗主题'}).click();await blocked.close();
  }
  assert.deepEqual(errors,[]);console.log('Dynasties verified: all topics, all relationship layers, provenance, identity backlinks, events, download, search, keyboard, root/Pages, mobile/themes, recovery and races.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
