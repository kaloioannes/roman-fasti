// Real release assets, all curated identities, both deployment prefixes.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const site=path.resolve(__dirname,'../_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const index=JSON.parse(await fs.readFile(path.resolve(__dirname,'../data/people/index.json'),'utf8'));
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('#content')?.getAttribute('aria-busy')==='false');
  for(const base of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${base}`;
   await page.goto(origin);await page.getByRole('link',{name:'跨卷人物',exact:true}).click();await ready();
   assert.equal(await page.locator('.identity-grid article').count(),Object.keys(index.people).length);
   await page.locator('#identity-query').fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('.identity-grid article,.identity-grid img').count(),0);
   await page.locator('#identity-query').fill('Ζηνων');assert.equal(await page.locator('.identity-grid article').count(),1);
   await page.locator('#identity-query').press('Enter');await ready();assert.match(page.url(),/#q=/);await page.reload();await ready();assert.equal(await page.locator('#identity-query').inputValue(),'Ζηνων');
   await page.locator('#identity-query').fill('屋大维');await page.locator('.identity-grid h2 a').click();await ready();
   await page.locator('#content[data-global-person="roman-augustus"]').waitFor();
   assert.equal(await page.locator('#content').getAttribute('data-global-person'),'roman-augustus');
   await page.goBack();await ready();assert.equal(await page.locator('#identity-query').inputValue(),'Ζηνων');
   for(const person of Object.values(index.people)){
    await page.goto(origin+person.url);await ready();assert.equal(await page.locator('h1').textContent(),person.zh);
    assert.equal(await page.locator('[data-appointment]').count(),person.profiles.reduce((n,p)=>n+p.appointments.length,0));
    await page.locator('.identity-years summary').click();assert.equal(await page.locator('.identity-years li').count(),person.years.length);
    for(const p of person.profiles){
     const a=page.locator(`.identity-profiles a[data-period="${p.period}"]`);await a.click();
     const widget=page.locator(`.identity-links[data-global-person="${person.id}"]`);await widget.waitFor();
     assert.equal(await widget.getByRole('heading',{name:'本人的其他时期档案'}).count(),1);
     // Each direction follows the original dossier, including Republican cards.
     const other=person.profiles.find(o=>o.period!==p.period);await widget.locator('nav a').first().click();
     await page.locator(`.identity-links[data-global-person="${person.id}"]`).waitFor();assert.ok(page.url().includes('/'+other.period+'/'));
     await page.getByRole('link',{name:'跨卷总档案 · 全部任职、年度与身份依据 ↗',exact:true}).click();await ready();assert.equal(await page.locator('#content').getAttribute('data-global-person'),person.id);
    }
   }
   await page.goto(origin+'republic/#year=43');await page.locator('.identity-links[data-global-person="roman-augustus"]').waitFor();
   const appointed=page.locator('.official-card[data-person="p6faf564142"] .identity-links');await appointed.locator(':scope>details>summary').click();assert.equal(await appointed.locator('[data-appointment]').count(),8);
   for(const y of [33,31,30,29,28,27]){
    await page.goto(origin+'republic/#year='+y);await page.locator('.identity-links[data-global-person="roman-augustus"]').waitFor();
   }
   for(const d of index.distinct)for(const p of d.profiles){
    await page.goto(origin+p.url);await page.getByRole('heading',{name:'同名人物辨识'}).first().waitFor();
    const other=d.profiles.find(o=>o.period!==p.period),target=page.locator(`.identity-links a[href="../${other.url}"]`).last();
    await target.click();await page.getByRole('heading',{name:'同名人物辨识'}).first().waitFor();
    const gid=index.lookup[other.period+':'+other.person];assert.equal(await page.locator('.identity-links[data-global-person]').count(),gid?1:0);
   }
   await page.goto(origin+'search/?q=屋大维');await page.locator('.identity-search-link').first().waitFor();
   assert.equal(await page.locator('[data-id="republic:person:p6faf564142"] .identity-search-link').count(),1);
   await page.locator('[data-id="empire:person:augustus"] .identity-search-link').click();await ready();
   await page.goto(origin+'people/#person=roman-zeno');await ready();assert.match(await page.locator('.identity-intro').textContent(),/2月9日和1月29日/);
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Global identity overflow ${base}/${width}/${theme}`);
    if(process.env.FASTI_OUTPUTS&&base==='/'&&[390,1440].includes(width)){
     await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`people-${width}-${theme}.png`),fullPage:true,animations:'disabled'});
    }
   }
   await page.goto(origin+'republic/#year=27');await page.locator('.identity-links[data-global-person="roman-augustus"]').waitFor();
   await page.locator('.identity-links>details>summary').click();
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Local identity overflow ${base}/${width}/${theme}`);
   }
   await page.setViewportSize({width:1440,height:1000});
   await page.goto(origin+'people/#person=missing');await ready();assert.match(await page.locator('h1').textContent(),/找不到/);
   for(const failure of ['http','network','json','schema','rows','timeout']){
    const broken=await context.newPage();let calls=0;
    if(failure==='timeout')await broken.clock.install();
    await broken.route('**/data/people/*.json',route=>{
     if(++calls>1)return route.continue();
     if(failure==='network')return route.abort();
     if(failure==='timeout')return;
     const damaged=JSON.parse(JSON.stringify(index));damaged.people['roman-zeno'].years=[{}];
     return route.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='json'?'{':failure==='rows'?JSON.stringify(damaged):'{}'});
    });
    await broken.goto(origin+'people/#person=roman-zeno');
    if(failure==='timeout'){await broken.waitForFunction(()=>document.querySelector('#content').getAttribute('aria-busy')==='true');await broken.clock.fastForward(21000);}
    await broken.getByRole('button',{name:'重试跨卷关联'}).click();await broken.getByRole('heading',{name:'芝诺',exact:true}).waitFor();assert.equal(calls,2);await broken.close();
   }
   const local=await context.newPage();let localCalls=0;
   await local.route('**/data/people/*.json',r=>++localCalls===1?r.fulfill({status:503,body:'unavailable'}):r.continue());
   await local.goto(origin+'empire/#person=augustus');await local.getByRole('button',{name:'重试跨卷关联'}).waitFor();
   assert.match(await local.locator('.person-body').textContent(),/盖乌斯/);await local.getByRole('button',{name:'重试跨卷关联'}).click();await local.locator('[data-global-person="roman-augustus"]').waitFor();await local.close();
   // Slow identity completion must never attach to another person's route.
   const delayed=await context.newPage();let release,calls=0;const gate=new Promise(r=>release=r);
   await delayed.route('**/data/people/*.json',async r=>{calls++;await gate;await r.continue();});
   await delayed.goto(origin+'empire/#person=augustus');await delayed.waitForFunction(()=>document.querySelector('.identity-status'));
   await delayed.evaluate(()=>location.hash='person=arcadius');await delayed.waitForFunction(()=>document.querySelector('.person-page h1')?.textContent.includes('阿卡狄乌斯'));release();
   await delayed.locator('[data-global-person="roman-arcadius"]').waitFor();assert.equal(calls,1);assert.equal(await delayed.locator('[data-global-person="roman-augustus"]').count(),0);await delayed.close();
   const light=await context.newPage(),requests=[];light.on('request',r=>{if(r.url().includes('.json'))requests.push(r.url());});
   await light.goto(origin+'people/#person=roman-augustus');await light.locator('.identity-profiles').waitFor();await light.locator('.event-related-links a[href*="emp-bc27-1"]').waitFor();
   assert.equal(requests.length,2);assert.ok(requests.every(u=>u.includes('/data/people/')||/\/data\/events\/navigation\./.test(u)));await light.close();
  }
  const restricted=await context.newPage();await restricted.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));await restricted.goto(`http://127.0.0.1:${server.address().port}/people/`);await restricted.locator('.identity-grid article').first().waitFor();await restricted.locator('#theme-button').click();await restricted.close();
  assert.deepEqual(errors,[]);
  console.log('Cross-volume people verified: every identity/profile and Republican consulship, round trips, homonyms, evidence, signed years, dates/exile, search, root/Pages, history/reload, 4 widths/2 themes, six retry modes, original dossier recovery, stale requests, shared caching and projection-only loading.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
