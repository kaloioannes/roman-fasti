// Exercise the fingerprinted static release under both supported URL layouts.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
(async()=>{
 const index=JSON.parse(await fs.readFile(path.join(root,'data/glossary/index.json'),'utf8'));
 const small=JSON.parse(await fs.readFile(path.join(root,'data/glossary/inline.json'),'utf8'));
 const server=http.createServer(async(req,res)=>{
  let url=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(url.endsWith('/'))url+='index.html';
  const file=path.resolve(site,'.'+url);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>{const m=document.querySelector('#content');return m?.getAttribute('aria-busy')==='false'&&m.dataset.renderedHash===location.hash;});
  for(const prefix of ['/','/roman-fasti/']){
   const base=`http://127.0.0.1:${server.address().port}${prefix}`;
   await page.goto(base+'glossary/');await ready();assert.equal(await page.locator('.glossary-card').count(),Object.keys(index.entries).length);
   await page.locator('#term-query').fill('καισαρ');assert.equal(await page.locator('.glossary-card').count(),1);
   await page.getByRole('button',{name:'查找',exact:true}).click();await ready();await page.locator('.glossary-card h2 a').click();await ready();assert.equal(await page.locator('#content').getAttribute('data-term-id'),'caesar');assert.equal(await page.locator('.glossary-sense').count(),3);
   await page.reload();await ready();await page.getByRole('link',{name:'← 词典目录',exact:true}).click();await ready();assert.equal(await page.locator('#term-query').inputValue(),'καισαρ');
   await page.getByRole('button',{name:'清空',exact:true}).click();await ready();await page.locator('#period').selectOption('byzantine');await ready();await page.locator('#category').selectOption('title');await ready();await page.locator('#term-year').fill('1081');await page.getByRole('button',{name:'查找',exact:true}).click();await ready();
   const expected=Object.values(index.entries).filter(e=>e.category==='title'&&e.senses.some(s=>s.periods.includes('byzantine')&&s.range[0]<=1081&&s.range[1]>=1081));assert.equal(await page.locator('.glossary-card').count(),expected.length);
   await page.goto(base+'glossary/#year=0');await ready();assert.match(await page.locator('.glossary-status').textContent(),/需要修正/);
   await page.goto(base+'glossary/#q=unfindable987');await ready();assert.match(await page.locator('.glossary-grid').textContent(),/没有匹配/);
   await page.goto(base+'glossary/#term=unknown');await ready();assert.match(await page.locator('h1').textContent(),/找不到/);
   await page.goto(base+'glossary/#term=caesar&sense=court');await ready();assert.equal(await page.evaluate(()=>document.activeElement.id),'sense-court');
   await page.locator('.glossary-related a[href*="co-emperor"]').click();await ready();await page.goBack();await ready();assert.equal(await page.evaluate(()=>document.activeElement.id),'sense-court');
   // Every term, every sense, and every source URL is actually rendered.
   for(const e of Object.values(index.entries)){
    await page.goto(base+e.url);await ready();assert.equal(await page.locator('h1').textContent(),e.label,e.id);
    assert.equal(await page.locator('.glossary-sense').count(),e.senses.length,e.id);assert.equal(await page.locator('.glossary-examples>li').count(),e.examples.length,e.id);
    const hrefs=await page.locator('.glossary-references a[target="_blank"]').evaluateAll(nodes=>nodes.map(n=>n.href));assert.ok(hrefs.length>=e.senses.length+e.examples.length);
   }
   await page.goto(base+'glossary/#term=dictator');await ready();const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载词条与出处 JSON',exact:true}).click();
   const exported=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));assert.equal(exported.entry.id,'dictator');assert.equal(exported.license,'CC BY-SA 4.0');assert.ok(exported.sources.livy.scope);assert.ok(exported.sources.suetonius.limitations);
   await page.getByRole('button',{name:'复制词条链接',exact:true}).click();assert.match(await page.getByRole('textbox',{name:'词条稳定链接'}).inputValue(),new RegExp(prefix+'glossary/#term=dictator'));
   // Independent compact projection and keyboard-accessible definitions in all five volumes.
   for(const route of ['kingdom/#person=numa-pompilius','republic/#year=444','empire/#year=293','divided-empire/#year=395','byzantine/#person=constantine-vii']){
    await page.goto(base+route);await page.locator('.glossary-term').first().waitFor();
    assert.ok(await page.locator('.header-actions a[href="../glossary/"]').count(),route);
    assert.equal(await page.locator('a .glossary-term,summary .glossary-term,.sources .glossary-term').count(),0);
    const trigger=page.locator('.glossary-term').first();await trigger.focus();await page.keyboard.press('Enter');await page.locator('#glossary-dialog[open]').waitFor();
    assert.equal(await page.evaluate(()=>document.activeElement.textContent),'关闭释义');await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement.closest('#glossary-dialog')!==null));
    await page.keyboard.press('Escape');assert.equal(await page.locator('#glossary-dialog[open]').count(),0);assert.equal(await trigger.evaluate(n=>n===document.activeElement),true);
   }
   await page.goto(base+'republic/#year=43');await page.locator('.glossary-example-terms a[href*="consul-suffectus"]').waitFor();await page.locator('.glossary-example-terms a[href*="consul-suffectus"]').click();await ready();
   await page.locator('.glossary-examples a[href*="person=p6faf564142"]').click();await page.locator('.glossary-example-terms a[href*="consul-suffectus"]').waitFor();
   // Declining inline help leaves original text intact and persists across routes.
   const text=await page.locator('main:visible').textContent();await page.getByRole('button',{name:'正文术语释义：开',exact:true}).click();assert.equal(await page.locator('.glossary-term').count(),0);assert.equal(await page.locator('main:visible').textContent(),text);
   await page.reload();await page.getByRole('button',{name:'正文术语释义：关',exact:true}).waitFor();await page.getByRole('button',{name:'正文术语释义：关',exact:true}).click();await page.locator('.glossary-term').first().waitFor();
   await page.goto(base+'republic/#year=44');await page.locator('#spoiler-switch').check();assert.equal(await page.locator('.event-reveal .glossary-term,.event-row.is-hidden .glossary-term').count(),0);await page.locator('#spoiler-switch').uncheck();
   // Full and optional data failures can recover without reloading original records.
   for(const compact of [false,true])for(const failure of ['http','json','schema','timeout']){
    const p=await context.newPage();let broken=true,count=0,records=0;if(failure==='timeout')await p.clock.install();
    p.on('request',r=>{if(/data\/republic\/records\./.test(r.url()))records++;});
    await p.route(compact?'**/data/glossary/inline.*.json':'**/data/glossary/index.*.json',async r=>{count++;if(!broken)return r.continue();if(failure==='timeout')return;
      return r.fulfill({status:failure==='http'?503:200,contentType:'application/json',body:failure==='schema'?'{"schemaVersion":999}':'{'});});
    await p.goto(base+(compact?'republic/#year=43':'glossary/#term=caesar'));if(compact)await p.locator('.official-card').first().waitFor();
    if(failure==='timeout')await p.clock.fastForward(21000);
    const retry=compact?p.getByRole('button',{name:'重试术语释义',exact:true}):p.locator('#retry-glossary');await retry.waitFor();const before=records;broken=false;await retry.click();
    await p.locator(compact?'.glossary-term':'.glossary-sense').first().waitFor();assert.equal(count,2);assert.equal(records,before);await p.close();
   }
   const race=await context.newPage();let release,count=0;const gate=new Promise(r=>release=r);await race.route('**/data/glossary/index.*.json',async r=>{count++;await gate;await r.continue();});
   await race.goto(base+'glossary/#term=caesar');await race.evaluate(()=>location.hash='term=purple-born');release();await race.waitForFunction(()=>document.querySelector('#content')?.dataset.termId==='purple-born');assert.equal(count,1);await race.close();
   const restricted=await browser.newContext();await restricted.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('blocked');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('blocked');}});});
   const rp=await restricted.newPage();await rp.goto(base+'byzantine/#person=constantine-vii');await rp.locator('.glossary-term').first().waitFor();await restricted.close();
   // All user and source text is literal; no HTML from data becomes executable.
   const literal=await context.newPage(),malicious=structuredClone(index);malicious.entries.caesar.label='<img src=x onerror=alert(1)>';
   await literal.route('**/data/glossary/index.*.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(malicious)}));await literal.goto(base+'glossary/#term=caesar');await literal.locator('.glossary-sense').first().waitFor();assert.equal(await literal.locator('main img').count(),0);assert.match(await literal.locator('h1').textContent(),/onerror/);await literal.close();
   for(const route of ['glossary/','glossary/#term=caesar','republic/#year=43','byzantine/#person=constantine-vii']){
    await page.goto(base+route);if(route.startsWith('glossary'))await ready();else await page.locator('.glossary-term').first().waitFor();
    for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
     await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow ${route}/${width}/${theme}`);
     if(process.env.FASTI_OUTPUTS&&prefix==='/'&&[390,1440].includes(width)&&theme==='light'){await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`glossary-${route.split('/')[0]}-${route.includes('term=')?'term':'page'}-${width}.png`),fullPage:false,animations:'disabled'});}
    }
   }
  }
  assert.deepEqual(errors,[]);console.log(`Glossary verified: ${Object.keys(index.entries).length} terms, period meanings, all sources, reverse reading paths, keyboard, failures, races, literal text, storage, spoilers and both URL layouts.`);
  await context.close();
 }finally{if(browser)await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
