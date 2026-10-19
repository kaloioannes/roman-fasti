// Real fingerprinted release, historical assertions and browser failure paths.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const E=require('../site/timeline/engine.js'),data=require('../data/timeline/index.json');
const site=path.resolve(__dirname,'../_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1100}}),page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  const ready=async(p=page)=>{await p.waitForFunction(()=>document.querySelector('#content')?.getAttribute('aria-busy')==='false');};
  const go=async(url,p=page)=>{await p.goto(url);await ready(p);};
  const hash=async(params,p=page)=>{const value=new URLSearchParams(params).toString();await p.evaluate(h=>location.hash=h,value);await p.waitForFunction(h=>location.hash.slice(1)===h&&document.querySelector('#content')?.getAttribute('aria-busy')==='false',value);};
  for(const prefix of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${prefix}`,base=origin+'timeline/';
   await page.goto(origin);await page.getByRole('link',{name:'任期时间轴 →',exact:true}).click();await ready();
   assert.equal(await page.locator('.tl-row[data-kind="central"]').count(),4);
   assert.equal(await page.locator('.tl-row').count(),6); // Also preserve two recorded Caesars.
   assert.match(await page.locator('.tl-status').textContent(),/6项有年代阶段/);
   await page.locator('[data-stage="empire:otho:0"] .tl-row-name a').click();await ready();
   await page.locator('#timeline-detail[data-stage="empire:otho:0"]').waitFor();assert.match(await page.locator('#timeline-detail').textContent(),/69年1月15日.*69年4月16日/s);
   assert.match(await page.locator('#timeline-detail').textContent(),/日精度/);
   const personLink=page.getByRole('link',{name:'打开人物完整档案 ↗',exact:true});await personLink.click();
   await page.getByRole('link',{name:'查看此人的任期时间轴 ↗',exact:true}).click();await ready();
   assert.equal(await page.locator('.tl-row').count(),1);assert.equal(await page.locator('#tl-from').inputValue(),'69');
   await go(base+'#period=empire&from=69&to=69&view=chart');
   const originalWidth=await page.locator('.tl-canvas').evaluate(n=>n.clientWidth);
   await page.getByRole('button',{name:'＋ 放大',exact:true}).click();await ready();await page.waitForFunction(()=>location.hash.includes('zoom=2')&&document.querySelector('.tl-canvas')?.clientWidth>1000);
   assert.ok(await page.locator('.tl-canvas').evaluate(n=>n.clientWidth)>originalWidth);
   await page.reload();await ready();assert.match(page.url(),/zoom=2/);await page.goBack();await ready();assert.ok(!page.url().includes('zoom=2'));
   await hash({period:'empire',from:69,to:69,view:'chart',zoom:16});assert.equal(await page.locator('.tl-tick').count(),365);assert.match(await page.locator('.tl-axis').textContent(),/15日/);
   for(const preset of data.presets){
    await go(base+'#'+new URLSearchParams({period:preset.period,from:preset.from,to:preset.to,preset:preset.id,view:'chart'}));
    const expected=Object.values(data.stages).filter(s=>s.period===preset.period&&s.start&&E.geometry(s,preset.from,preset.to)).length;
    assert.match(await page.locator('.tl-status').textContent(),new RegExp('^'+expected+'项有年代阶段'));
    assert.equal(await page.locator('.tl-row').count(),Math.min(expected,60));assert.equal(await page.locator('.tl-context').textContent(),preset.note);
   }
   await hash({period:'empire',from:238,to:238,view:'chart'});
   for(const id of ['gordian-i','gordian-ii','pupienus','balbinus']){const row=page.locator(`[data-stage="empire:${id}:0"]`);assert.equal(await row.locator('.tl-core').count(),0);assert.equal(await row.locator('.tl-uncertain').count(),1);}
   await hash({period:'byzantine',from:1042,to:1042,view:'chart'});
   const bounds=[];for(const id of ['zoe','theodora'])bounds.push(await page.locator(`[data-stage="byzantine:${id}:0"] .tl-band`).getAttribute('style'));assert.equal(bounds[0],bounds[1]);
   await page.locator('[data-stage="byzantine:zoe:0"] .tl-row-name a').click();await ready();assert.match(await page.locator('#timeline-detail').textContent(),/共同主政/);
   await hash({period:'byzantine',person:'byzantine:justinian-ii',view:'chart'});assert.equal(await page.locator('.tl-row').count(),2);assert.equal(await page.locator('#tl-from').inputValue(),'685');
   await hash({period:'byzantine',person:'byzantine:zeno',view:'chart'});assert.equal(await page.locator('.tl-row').count(),2);assert.equal(await page.locator('#tl-from').inputValue(),'474');
   await hash({period:'empire',from:293,to:324,q:'Maximianus',view:'list'});assert.ok(await page.locator('.tl-list li').count()>=3);
   await hash({period:'byzantine',from:476,to:491,q:'Ζηνων',view:'list'});assert.equal(await page.locator('.tl-list li').count(),1); // First reign is outside this volume's scope.
   await page.locator('.tl-list li>a').first().click();await ready();await page.getByRole('link',{name:'只看此人的全部阶段',exact:true}).click();await ready();await page.waitForFunction(()=>document.querySelector('#tl-from')?.value==='474');assert.equal(await page.locator('.tl-list li').count(),2);
   await hash({period:'kingdom',from:-753,to:-509,view:'chart'});assert.equal(await page.locator('.tl-row').count(),8);assert.equal(await page.locator('.tl-list li[data-stage="kingdom:titus-tatius:0"]').count(),1);
   await hash({period:'divided-empire',from:465,to:476,side:'west',kind:'exile',view:'list'});assert.ok(await page.locator('.tl-list li').count()>0);assert.match(await page.locator('.tl-list').textContent(),/尼波斯/);
   await hash({period:'empire',from:-1,to:1,view:'chart'});assert.match(await page.locator('.tl-axis').textContent(),/公元前1年.*1年/);assert.ok(!await page.locator('.tl-axis').getByText('0年',{exact:true}).count());
   await page.locator('.tl-year-links summary').click();await page.locator('#tl-year').fill('-1');await page.getByRole('button',{name:'显示年度入口',exact:true}).click();assert.match(await page.locator('[aria-label="年度入口"] a').getAttribute('href'),/#year=-1$/);
   // Composition, pagination and exact annual Republican URL conversion.
   await hash({period:'republic',from:-509,to:-27,view:'list'});assert.equal(await page.locator('.tl-list li').count(),60);assert.match(await page.locator('.tl-status').textContent(),/^1206项/);
   await page.getByRole('link',{name:'下一页 →',exact:true}).click();await ready();await page.waitForFunction(()=>document.querySelector('.tl-pagination')?.textContent.includes('第2／'));assert.equal(await page.locator('.tl-list li').count(),60);
   await hash({period:'republic',from:-509,to:-509,view:'list'});await page.locator('.tl-list li').first().locator('a').click();await ready();assert.match(await page.locator('#timeline-detail a[href*="year="]').first().getAttribute('href'),/#year=509$/);
   await page.getByRole('button',{name:'复制当前视图链接',exact:true}).click();assert.equal(await page.locator('#tl-share').inputValue(),page.url());
   // Invalid addresses fail visibly without throwing or fabricating a year.
   for(const params of [{from:0,to:1},{from:69,to:68},{period:'missing',from:1,to:2},{zoom:100},{person:'empire:missing'},{unknown:'x'}]){
    await hash({...params,view:'list'});assert.match(await page.locator('[role="alert"]').textContent(),/无法展开/);
   }
   await hash({period:'empire',from:69,to:69,q:'<img src=x onerror=alert(1)>',view:'list'});assert.equal(await page.locator('.tl-list img').count(),0);assert.match(await page.locator('.tl-empty').textContent(),/没有匹配/);
   await page.setViewportSize({width:390,height:1000});await go(base);assert.equal(await page.locator('.tl-viewport').count(),0);assert.equal(await page.locator('.tl-list li').count(),6);
   for(const view of ['list','chart'])for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1100});await hash({period:'byzantine',from:1042,to:1042,view});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow ${prefix}/${view}/${width}/${theme}`);
    if(process.env.FASTI_OUTPUTS&&prefix==='/'&&[390,1440].includes(width)&&((view==='list'&&width===390)||(view==='chart'&&width===1440))){await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`timeline-${view}-${width}-${theme}.png`),fullPage:true,animations:'disabled'});}
   }
   // Every original volume offers a usable annual context link.
   for(const [pid,y] of [['kingdom',-578],['republic',44],['empire',69],['divided-empire',466],['byzantine',1042]]){
    await page.goto(origin+`${pid}/#year=${y}`);await page.locator('.timeline-year-link').waitFor();await page.locator('.timeline-year-link').click();await ready();assert.equal(await page.locator('#tl-from').inputValue(),String(pid==='republic'?-y:y));
   }
   // Shared request, stale route guard, and independent failures.
   const delayed=await context.newPage();let release,calls=0;const gate=new Promise(r=>release=r);
   await delayed.route('**/data/timeline/*.json',async r=>{calls++;await gate;await r.continue();});await delayed.goto(base+'#period=empire&from=69&to=69');
   await delayed.evaluate(()=>location.hash='period=byzantine&from=1042&to=1042&view=list');release();await ready(delayed);await delayed.waitForFunction(()=>document.querySelector('#tl-from')?.value==='1042');assert.equal(calls,1);assert.match(await delayed.locator('.tl-list').textContent(),/佐伊/);await delayed.close();
   for(const failure of ['http','network','json','schema','rows','timeout']){
    const broken=await context.newPage();let count=0;if(failure==='timeout')await broken.clock.install();
    await broken.route('**/data/timeline/*.json',r=>{
     if(++count>1)return r.continue();if(failure==='network')return r.abort();if(failure==='timeout')return;
     const damaged=structuredClone(data);damaged.stages['empire:otho:0'].sources=['missing'];
     return r.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='json'?'{':failure==='rows'?JSON.stringify(damaged):'{}'});
    });await broken.goto(base);if(failure==='timeout'){await broken.waitForFunction(()=>document.querySelector('#content')?.getAttribute('aria-busy')==='true');await broken.clock.fastForward(21000);}
    await broken.getByRole('button',{name:'重试时间轴',exact:true}).click();await ready(broken);await broken.locator('.tl-status').waitFor();assert.equal(count,2);await broken.close();
   }
   const privatePage=await context.newPage();await privatePage.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('denied');}});});await go(base,privatePage);await privatePage.locator('#theme-button').click();assert.equal(await privatePage.locator('.tl-status').count(),1);await privatePage.close();
   const light=await context.newPage(),requests=[];light.on('request',r=>{if(r.url().includes('.json'))requests.push(r.url());});await go(base,light);assert.equal(requests.length,1);assert.ok(requests[0].includes('/data/timeline/'));await light.close();
  }
  assert.deepEqual(errors,[]);await context.close();console.log('Timeline UI verified: all 14 cases, five volumes, precision, courts, title/power, restorations, filters, paging, links, history, failures, races and both deployment prefixes.');
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
