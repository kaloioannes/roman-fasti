// Real HTTP, fingerprinted assets, both deployment prefixes and actual browser history.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'), http=require('node:http'), path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
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
  const context=await browser.newContext(),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>document.querySelector('#search-results')?.getAttribute('aria-busy')==='false');
  const query=async q=>{await page.locator('#search-input').fill(q);await page.locator('#search-form button[type=submit]').click();await ready();};
  for(const base of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${base}`;
   await page.goto(origin);await page.locator('#catalog-query').fill('奥古斯都');await page.locator('.catalog-search button').click();await ready();
   assert.ok(page.url().includes('search/?q='));
   assert.equal(await page.locator('#period-filter').inputValue(),'');
   const person=page.locator('[data-id="empire:person:augustus"] h3 a');await person.click();await page.waitForSelector('.person-page h1');
   assert.match(await page.locator('.person-page h1').textContent(),/奥古斯都/);
   await page.goBack();await ready();assert.equal(await page.locator('#search-input').inputValue(),'奥古斯都');
   await query('芝诺');assert.equal(await page.locator('[data-id="byzantine:person:zeno"],[data-id="divided-empire:person:zeno"]').count(),2);
   await page.locator('#period-filter').selectOption('byzantine');await ready();
   assert.equal(await page.locator('[data-id="byzantine:person:zeno"]').count(),1);assert.equal(await page.locator('[data-id="divided-empire:person:zeno"]').count(),0);
   await page.reload();await ready();assert.equal(await page.locator('#period-filter').inputValue(),'byzantine');
   await page.goBack();await ready();assert.equal(await page.locator('#period-filter').inputValue(),'');
   await query('Ζηνων');assert.ok(await page.locator('[data-id="byzantine:person:zeno"] mark').count());
   await query('Julius Caesar');assert.ok(await page.locator('[data-id="republic:person:pe9d1a9956a"]').count());
   await page.locator('[data-id="republic:person:pe9d1a9956a"] h3 a').click();
   await page.waitForSelector('.official-card.search-target');
   assert.equal(await page.locator('.search-target').getAttribute('data-person'),'pe9d1a9956a');
   assert.equal(await page.locator('.search-target .office-summary-details').getAttribute('open'),'');
   await page.reload();await page.waitForSelector('.official-card.search-target');
   await page.goBack();await ready();
   await query('1204');assert.match(await page.locator('#year-results').textContent(),/不预设纪元/);
   assert.match(await page.locator('#year-results').textContent(),/公元前1204年/);
   const y1204=page.locator('#year-results a[href="../byzantine/#year=1204"]');assert.equal(await y1204.count(),1);
   await y1204.click();await page.waitForSelector('#year-slider');assert.match(await page.locator('h1').textContent(),/1204/);await page.goBack();await ready();
   for(const [q,links] of [['前509年',['kingdom/#year=-509','republic/#year=509']],['前27年',['republic/#year=27','empire/#year=-27']],['公元395年',['empire/#year=395','divided-empire/#year=395']],['公元476年',['divided-empire/#year=476','byzantine/#year=476']]]){
    await query(q);for(const link of links)assert.equal(await page.locator(`#year-results a[href="../${link}"]`).count(),1);
   }
   await query('前1年');await page.getByRole('link',{name:'下一年 · 公元1年',exact:true}).click();await ready();assert.match(await page.locator('#year-results').textContent(),/公元1年/);
   await page.getByRole('link',{name:'上一年 · 公元前1年',exact:true}).click();await ready();
   await query('前44年');await page.locator('[data-id="republic:event:44:0"] h3 a').click();await page.waitForSelector('.event-row.search-target');assert.match(await page.locator('.search-target').textContent(),/恺撒遇刺/);await page.goBack();await ready();
   for(const [q,selector] of [['罗马建城的传统起点','.event.search-target'],['奥古斯都与新的权力安排','.event-row.search-target'],['两座宫廷承接狄奥多西的遗产','.event-row.search-target'],['西部宫廷的终结','.event-row.search-target']]){
    await query(q);await page.locator('.result-group[data-kind=event] h3 a').first().click();await page.waitForSelector(selector);assert.match(await page.locator(selector).first().textContent(),new RegExp(q));await page.goBack();await ready();
   }
   await query('给执政官划一道线');await page.locator('.result-group[data-kind=chapter] h3 a').click();await page.waitForSelector('.chapter-reading.search-target');assert.match(await page.locator('.search-target').textContent(),/给执政官划一道线/);await page.goBack();await ready();
   await query('把权力刻在铜上');await page.locator('.result-group[data-kind=story] h3 a').click();await page.waitForSelector('.story-reader');await page.goBack();await ready();
   await query('不存在的词zyx987');assert.match(await page.locator('#search-status').textContent(),/没有找到匹配资料/);
   await query('0');assert.match(await page.locator('#year-results').textContent(),/没有公元0年/);
   await query('<img src=x onerror=alert(1)>');assert.equal(await page.locator('#search-results img').count(),0);
   await query('奥古斯都');await page.locator('#hide-snippets').check();assert.equal(await page.locator('.result-snippet').first().isVisible(),false);await page.reload();await ready();assert.equal(await page.locator('#hide-snippets').isChecked(),true);await page.locator('#hide-snippets').uncheck();
   await page.evaluate(()=>{localStorage.removeItem('fasti-search-hide-snippets');localStorage.setItem('fasti-spoiler-v2','true');});await page.reload();await ready();assert.equal(await page.locator('#hide-snippets').isChecked(),true);
   await page.locator('#hide-snippets').uncheck();await page.reload();await ready();assert.equal(await page.locator('#hide-snippets').isChecked(),false);await page.evaluate(()=>localStorage.setItem('fasti-spoiler-v2','false'));
   await query('罗马');assert.ok(await page.locator('.more-results').count());const more=page.locator('.more-results').first(),group=more.locator('..'),before=await group.locator('.search-result').count();await more.click();await ready();assert.ok(await page.locator('.result-group').first().locator('.search-result').count()>before);
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Search overflow ${base}/${width}/${theme}`);
    if(process.env.FASTI_OUTPUTS&&base==='/'&&[390,1440].includes(width)){
      await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`search-${width}-${theme}.png`),animations:'disabled'});
    }
   }
   // Keyboard form submission and filters, without relying on pointer controls.
   await page.locator('#clear-search').click();await ready();await page.locator('#search-input').fill('泽诺');await page.keyboard.press('Enter');await ready();assert.ok(await page.locator('[data-id="byzantine:person:zeno"]').count());
   await page.goto(origin+'search/?q=芝诺&period=missing');await ready();assert.match(await page.locator('#search-status').textContent(),/筛选条件无法识别/);
   await page.locator('#clear-search').click();await ready();assert.equal(await page.locator('.search-result').count(),0);
   // One in-flight index request, late completion uses latest URL state, and
   // search never requests any volume's records, maps, land, or stories JSON.
   const delayed=await context.newPage();let count=0,release;
   const gate=new Promise(r=>release=r),requests=[];
   delayed.on('request',r=>{if(r.url().includes('.json'))requests.push(r.url());});
   await delayed.route('**/data/search/*.json',async route=>{count++;await gate;await route.continue();});
   await delayed.goto(origin+'search/?q=奥古斯都');await delayed.locator('#search-input').fill('芝诺');await delayed.locator('#search-form button[type=submit]').click();release();
   await delayed.waitForFunction(()=>document.querySelector('#search-results').getAttribute('aria-busy')==='false');
   assert.equal(count,1);assert.ok(await delayed.locator('[data-id="byzantine:person:zeno"]').count());assert.ok(requests.every(r=>r.includes('/data/search/')));await delayed.close();
   for(const failure of ['http','network','json','schema','rows','timeout']){
    const broken=await context.newPage();let calls=0;
    if(failure==='timeout')await broken.clock.install();
    await broken.route('**/data/search/*.json',route=>{
     if(++calls>1)return route.continue();
     if(failure==='network')return route.abort();
     if(failure==='timeout')return; // fetch AbortController must end the request.
     return route.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='json'?'{':failure==='rows'?JSON.stringify({schemaVersion:1,periods:[null],entries:[{}]}):'{}'});
    });
    await broken.goto(origin+'search/?q=芝诺');
    if(failure==='timeout'){await broken.waitForFunction(()=>document.querySelector('#search-status').textContent.includes('正在载入'));await broken.clock.fastForward(21000);}
    await broken.locator('#retry-search').waitFor({state:'visible'});await broken.locator('#retry-search').click();
    await broken.locator('[data-id="byzantine:person:zeno"]').waitFor();assert.equal(calls,2);await broken.close();
   }
   await page.setViewportSize({width:1440,height:1000});
  }
  assert.deepEqual(errors,[]);
  const restricted=await context.newPage();restricted.on('pageerror',e=>errors.push(e.message));
  await restricted.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('storage blocked');}}));
  await restricted.goto(`http://127.0.0.1:${server.address().port}/search/?q=芝诺`);await restricted.locator('[data-id="byzantine:person:zeno"]').waitFor();
  await restricted.locator('#hide-snippets').check();assert.equal(await restricted.locator('.result-snippet').first().isVisible(),false);await restricted.locator('#theme-button').click();assert.deepEqual(errors,[]);await restricted.close();
  const noJS=await browser.newContext({javaScriptEnabled:false}),fallback=await noJS.newPage();await fallback.goto(`http://127.0.0.1:${server.address().port}/search/`);assert.equal(await fallback.locator('noscript a').count(),1);
  console.log('Global search verified: both deployment paths, names/aliases/Greek, all result types and volume targets, four boundaries, no year zero, URL history, pagination, snippets, keyboard, 4 widths/2 themes, index-only loading, stale completion and five failure/retry modes.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
