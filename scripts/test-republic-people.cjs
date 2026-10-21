// Exercise the published fingerprinted files, actual routes and failure boundaries.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
const read=name=>fs.readFile(path.join(root,name),'utf8').then(JSON.parse);
(async()=>{
 const data=await read('data/republic/records.json'),index=await read('data/republic/people.json');
 const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
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
  const ready=()=>page.locator('#people-view:not([hidden]) h1').waitFor();
  for(const prefix of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${prefix}`,base=origin+'republic/';
   await page.goto(base+'#people');await ready();assert.match(await page.locator('#rp-result-count').textContent(),/905/);
   assert.equal(await page.locator('.republic-person-card').count(),36);
   await page.getByRole('link',{name:'下一页 →',exact:true}).click();await page.waitForURL(/page=2/);await page.waitForFunction(()=>document.querySelector('#rp-result-count').textContent.includes('第 2 /'));
   await page.reload();await ready();assert.match(await page.locator('#rp-result-count').textContent(),/第 2 /);
   const query=async text=>{await page.locator('#rp-query').fill(text);};
   await query('JÚLIUS Caesar');assert.ok(await page.locator('.republic-person-card[data-person="pe9d1a9956a"]').count());
   await page.locator('.republic-person-card[data-person="pe9d1a9956a"] h2 a').click();await page.locator('#people-view[data-person="pe9d1a9956a"]').waitFor();
   assert.equal(await page.locator('.rp-career-list>li').count(),5);assert.match(await page.locator('.rp-biography').textContent(),/未重新逐条核读/);
   await page.getByRole('link',{name:'← 返回人物索引',exact:true}).click();await ready();assert.equal(await page.locator('#rp-query').inputValue(),'JÚLIUS Caesar');
   await query('屋大维');await page.locator('.republic-person-card[data-person="p6faf564142"] h2 a').click();await page.locator('#people-view[data-person="p6faf564142"]').waitFor();assert.equal(await page.locator('.rp-career-list>li').count(),7);
   await page.locator('.identity-links nav a').click();await page.locator('.person-page h1').waitFor();assert.ok(page.url().includes('empire/#person=augustus'));
   await page.locator('.identity-links nav a').click();await page.locator('#people-view[data-person="p6faf564142"]').waitFor();
   await page.locator('.rp-career-list h3 a').first().click();await page.locator('.official-card.search-target[data-person="p6faf564142"]').waitFor();
   await page.locator('.official-card[data-person="p6faf564142"] .republic-dossier-link').click();await page.locator('#people-view[data-person="p6faf564142"]').waitFor();
   await page.goBack();await page.locator('.official-card.search-target').waitFor();await page.goForward();await page.locator('#people-view[data-person="p6faf564142"]').waitFor();
   await page.goto(base+'#people&status=insufficient');await ready();assert.match(await page.locator('#rp-result-count').textContent(),/193 \/ 905/);
   await page.locator('#rp-role').selectOption('tribune');const expected=Object.keys(index.people).filter(id=>data.people[id].bioStatus==='insufficient'&&index.people[id].roles.includes('tribune')).length;assert.match(await page.locator('#rp-result-count').textContent(),new RegExp('找到 '+expected+' /'));
   await page.goto(base+'#people&from=50&to=100');await ready();assert.match(await page.locator('#rp-result-count').textContent(),/范围倒置/);
   await page.goto(base+'#people&from=44&to=44&role=consul');await ready();const ids44=data.years[44].officers.filter(o=>o.role==='consul').map(o=>o.person).sort();assert.deepEqual((await page.locator('.republic-person-card').evaluateAll(rows=>rows.map(r=>r.dataset.person))).sort(),ids44);
   await page.goto(base+'#people&same=1&repeat=1&sort=count');await ready();assert.equal(await page.locator('.republic-person-card').first().getAttribute('data-person'),Object.keys(index.people).filter(id=>index.people[id].sameNames.length&&index.people[id].appointments.length>1).sort((a,b)=>index.people[b].appointments.length-index.people[a].appointments.length||a.localeCompare(b))[0]);
   await query('<img src=x onerror=alert(1)>');assert.equal(await page.locator('.republic-person-card,.rp-view img').count(),0);assert.match(await page.locator('.rp-empty').textContent(),/没有匹配/);
   await page.getByRole('button',{name:'清除筛选',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#rp-query')?.value==='');
   await query('Julius Caesar');await page.locator('#rp-query').press('Enter');assert.equal(await page.locator(':focus').getAttribute('href'),await page.locator('.republic-person-card h2 a').first().getAttribute('href'));
   for(const invalid of ['missing','constructor','__proto__']){
    await page.goto(base+'#person='+invalid);await ready();assert.match(await page.locator('#people-view h1').textContent(),/找不到/);assert.equal(await page.locator('#archive-error').isVisible(),false);
   }
   // All 905 dossiers through the real router, including 451 BC dual roles.
   if(prefix==='/'){
    const failures=await page.evaluate(async rows=>{
     const failures=[];
     for(const [pid,meta] of Object.entries(rows)){
      location.hash='person='+pid;
      const deadline=performance.now()+5000;
      while(document.querySelector('#people-view').dataset.person!==pid){if(performance.now()>deadline)throw Error('route timeout '+pid);await new Promise(requestAnimationFrame);}
      const actual=[...document.querySelectorAll('.rp-career-list>li')].map(li=>li.dataset.appointment);
      const expected=meta.appointments.map(r=>r.year+':'+r.index);
      if(JSON.stringify(actual)!==JSON.stringify(expected))failures.push(pid);
      if(meta.sameNames.length!==document.querySelectorAll('.rp-homonyms .republic-person-card').length)failures.push('homonyms:'+pid);
     }
     return failures;
    },index.people);assert.deepEqual(failures,[]);
   }
   const unknown=index.unidentified.find(id=>!index.people[id].sameNames.length);
   await page.goto(base+'#person='+unknown);await ready();assert.match(await page.locator('.rp-biography').textContent(),/资料不足/);assert.equal(await page.locator('.rp-biography>.rp-prose').count(),0);
   await page.goto(base+'#person=pe9d1a9956a');await ready();
   await page.locator('.global-spoiler').click();await page.locator('.rp-biography [data-reveal]').first().waitFor();assert.equal(await page.locator('.rp-biography .rp-prose').count(),0);
   await page.locator('.rp-biography [data-reveal]').first().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('.rp-biography .rp-prose').count(),1);
   await page.locator('.global-spoiler').click();await ready();
   const same=index.candidates.find(g=>g.people.length>3).people[0];
   for(const route of ['#people','#person='+same]){
    await page.goto(base+route);await ready();
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
     await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${prefix}/${route}/${width}/${theme}`);
     if(process.env.FASTI_OUTPUTS&&prefix==='/'&&[390,1440].includes(width)){await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`republic-${route==='#people'?'index':'dossier'}-${width}-${theme}.png`),fullPage:true});}
    }
   }
   await page.setViewportSize({width:1440,height:1000});
   for(const failure of ['http','network','json','schema','members','timeout']){
    const broken=await context.newPage();let calls=0;if(failure==='timeout')await broken.clock.install();
    await broken.route('**/data/republic/people.*.json',r=>{
     if(++calls>1)return r.continue();if(failure==='network')return r.abort();if(failure==='timeout')return;
     const damaged=JSON.parse(JSON.stringify(index));damaged.people['pe9d1a9956a'].appointments[0].index=999;
     return r.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='json'?'{':failure==='members'?JSON.stringify(damaged):'{}'});
    });
    const requested=broken.waitForRequest('**/data/republic/people.*.json');await broken.goto(base+'#person=pe9d1a9956a');await requested;
    if(failure==='timeout')await broken.clock.fastForward(21000);
    await broken.getByRole('button',{name:'重试当前档案 ↗',exact:true}).click();await broken.locator('#people-view[data-person="pe9d1a9956a"]').waitFor();assert.equal(calls,2);await broken.close();
   }
   // Projection failure cannot break annual text; slow completion cannot replace a later route.
   const delayed=await context.newPage();let release,calls=0;const gate=new Promise(r=>release=r);
   await delayed.route('**/data/republic/people.*.json',async r=>{calls++;await gate;await r.continue();});const requested=delayed.waitForRequest('**/data/republic/people.*.json');await delayed.goto(base+'#people');
   await requested;await delayed.evaluate(()=>location.hash='year=44');await delayed.locator('.official-card').first().waitFor();release();
   await delayed.waitForFunction(()=>document.querySelector('#loading').hidden);assert.equal(await delayed.locator('#people-view').isVisible(),false);assert.equal(await delayed.locator('#year-number').textContent(),'44');assert.equal(calls,1);await delayed.close();
   const light=await context.newPage(),requests=[];light.on('request',r=>{if(r.url().includes('.json'))requests.push(r.url());});
   await light.goto(base+'#person=pe9d1a9956a');await light.locator('.rp-career-list').waitFor();await light.evaluate(()=>location.hash='person=p6faf564142');await light.locator('#people-view[data-person="p6faf564142"]').waitFor();
   assert.equal(requests.filter(u=>/\/data\/republic\/records\./.test(u)).length,1);assert.equal(requests.filter(u=>/\/data\/republic\/people\./.test(u)).length,1);assert.ok(requests.every(u=>!u.includes('territories')&&!u.includes('land-50m')&&(!u.includes('stories')||/\/data\/stories\/navigation\./.test(u))));await light.close();
   const textFailure=await context.newPage();let textCalls=0,projectionCalls=0;
   await textFailure.route('**/data/republic/records.*.json',r=>++textCalls===1?r.fulfill({status:503,body:'unavailable'}):r.continue());
   await textFailure.route('**/data/republic/people.*.json',r=>{projectionCalls++;return r.continue();});
   await textFailure.goto(base+'#person=pe9d1a9956a');await textFailure.locator('#retry-data').waitFor();assert.equal(projectionCalls,0);
   await textFailure.locator('#retry-data').click();await textFailure.locator('#people-view[data-person="pe9d1a9956a"]').waitFor();assert.equal(textCalls,2);assert.equal(projectionCalls,1);await textFailure.close();
  }
  const restricted=await context.newPage();await restricted.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}}));await restricted.goto(`http://127.0.0.1:${server.address().port}/republic/#people`);await restricted.locator('#rp-query').waitFor();await restricted.locator('#theme-button').click();await restricted.close();
  // A test-only, explicitly documented old-ID fixture verifies future migrations.
  const alias=await context.newPage(),projection=JSON.parse(JSON.stringify(index));projection.redirects.p0000000000={person:'pe9d1a9956a',note:'Test fixture',sources:[{label:'Fixture',url:'https://example.org',locator:'test'}]};
  await alias.route('**/data/republic/people.*.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(projection)}));await alias.goto(`http://127.0.0.1:${server.address().port}/republic/#person=p0000000000`);await alias.locator('#people-view[data-person="pe9d1a9956a"]').waitFor();assert.match(await alias.locator('aside.rp-notice').textContent(),/旧ID/);await alias.close();
  assert.deepEqual(errors,[]);console.log('Republican people: all 905 dossiers / 1201 offices; search, aliases, filters, pagination, homonyms, biographies, history, old URLs, cross-volume round trips, root/Pages, mobile/themes, failures/retry/timeout, stale routes, caching and storage restrictions passed.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
