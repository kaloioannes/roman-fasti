// Evidence cards in the real fingerprinted release, including keyboard and faults.
const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
(async()=>{
 const index=JSON.parse(await fs.readFile(path.join(root,'data/events/index.json'),'utf8'));
 const curated=Object.values(index.entries).filter(e=>e.evidence),disputed=curated.filter(e=>e.evidence.disputes.length);
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const ready=()=>page.waitForFunction(()=>{const m=document.querySelector('#content');return m?.getAttribute('aria-busy')==='false'&&m.dataset.renderedHash===location.hash;});
  for(const prefix of ['/','/roman-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${prefix}`,base=origin+'events/';
   const goto=async p=>{await page.goto(base+'#'+new URLSearchParams(p));await ready();};
   await goto({evidence:'curated'});assert.equal(await page.locator('.event-card').count(),curated.length);
   await page.selectOption('#event-evidence','disputed');await ready();assert.equal(await page.locator('.event-card').count(),disputed.length);
   await page.reload();await ready();assert.equal(await page.locator('#event-evidence').inputValue(),'disputed');
   await goto({evidence:'curated',reading:'abstract',source:'modern'});assert.equal(await page.locator('.event-card').count(),2);
   for(const e of curated){
    await goto({event:e.id});assert.equal(await page.locator('.evidence-claim').count(),e.evidence.claims.length);
    assert.equal(await page.locator('.evidence-dispute').count(),e.evidence.disputes.length);
    assert.equal(await page.locator('#event-sources .evidence-citation').count(),e.references.length);
    assert.match(await page.locator('#event-evidence').textContent(),new RegExp(e.evidence.scope.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
   }
   await goto({event:'byzantine:byz-674-1',evidence:'dispute:siege-model'});
   assert.equal(await page.locator('.evidence-target').count(),1);assert.equal(await page.locator('.evidence-position[data-adopted=true]').count(),1);
   assert.match(await page.locator('#evidence-ref-reassessment').textContent(),/仅摘要/);
   assert.match(await page.locator('#evidence-ref-howard-indirect').textContent(),/间接路径/);
   const proof=page.locator('.evidence-position').first().getByRole('link',{name:'证据 reassessment ↗',exact:true});
   await proof.focus();await page.keyboard.press('Enter');await ready();assert.equal(await page.locator('.evidence-target').getAttribute('id'),'evidence-ref-reassessment');
   await page.reload();await ready();assert.equal(await page.locator(':focus').getAttribute('id'),'evidence-ref-reassessment');
   assert.ok(await page.evaluate(()=>document.querySelector('.evidence-target').getBoundingClientRect().top>=document.querySelector('.site-header').getBoundingClientRect().bottom),'Card target must clear the sticky header');
   await page.goBack();await ready();assert.equal(await page.locator('.evidence-target').getAttribute('id'),'evidence-dispute-siege-model');
   await page.locator('#evidence-dispute-siege-model').getByRole('button',{name:'复制本卡链接',exact:true}).click();
   await page.waitForFunction(()=>document.querySelector('#evidence-dispute-siege-model [role=status]')?.textContent);
   assert.match(await page.locator('#evidence-dispute-siege-model .evidence-share').textContent(),/已复制|已选中/);
   const download=page.waitForEvent('download');await page.getByRole('button',{name:'下载此对象 JSON',exact:true}).click();
   const data=JSON.parse(await fs.readFile(await (await download).path(),'utf8'));assert.equal(data.event.evidence.disputes[0].adopted,'qualified');assert.ok(data.event.references.some(r=>r.via));assert.equal(data.license,'CC BY-SA 4.0');
   await goto({event:'byzantine:manzikert-1071',evidence:'claim:date'});assert.match(await page.locator('.evidence-target h3').textContent(),/Sewter/);
   await page.locator('.evidence-target').getByRole('link',{name:'证据 date-note ↗',exact:true}).click();await ready();assert.match(await page.locator('.evidence-target').textContent(),/译者注265/);
   await goto({event:'byzantine:manzikert-1071',evidence:'ref:missing'});assert.match(await page.locator('#content').textContent(),/定位尚未收录/);
   await goto({event:Object.values(index.entries).find(e=>!e.evidence).id});assert.match(await page.locator('#event-evidence').textContent(),/尚未编订/);
   // Annual original links work in every volume and request only optional navigation.
   for(const pid of index.periods.map(p=>p.id)){
    const e=curated.find(e=>e.period===pid&&e.origins.length);
    await page.goto(origin+e.origins[0].url);const link=page.getByRole('link',{name:'论断证据与查阅范围 ↗',exact:true}).first();await link.waitFor();await link.click();await ready();assert.ok(await page.locator('.evidence-claim').count());
   }
   await goto({evidence:'curated'});await page.locator('#event-hide').check();
   await goto({event:'byzantine:byz-674-1'});assert.equal(await page.locator('#event-evidence>details').getAttribute('open'),null);
   await goto({event:'byzantine:byz-674-1',evidence:'ref:reassessment'});assert.equal(await page.locator('#event-sources>details').getAttribute('open'),'');
   await page.evaluate(()=>localStorage.removeItem('fasti-search-hide-snippets'));
   await goto({evidence:'curated'});await page.locator('#event-hide').uncheck();
   await goto({event:'byzantine:byz-674-1'});
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Evidence overflow ${prefix} ${width} ${theme}`);
    if(process.env.FASTI_OUTPUTS&&prefix==='/'&&[390,1440].includes(width)){await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`evidence-${width}-${theme}.png`),fullPage:true,animations:'disabled'});}
   }
   // Broken provenance cannot be silently presented as directly verified.
   const fault=await context.newPage();let broken=true;
   await fault.route('**/data/events/index.*.json',async r=>{if(!broken)return r.continue();const d=structuredClone(index);d.entries['byzantine:byz-674-1'].evidence.claims[0].references=['unknown'];await r.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
   await fault.goto(base+'#event=byzantine%3Abyz-674-1');await fault.locator('#retry-events').waitFor();broken=false;await fault.locator('#retry-events').click();await fault.locator('.evidence-claim').waitFor();await fault.close();
   // Text is rendered literally, including imported markup-looking content.
   const literal=await context.newPage();await literal.route('**/data/events/index.*.json',async r=>{const d=structuredClone(index);d.entries['kingdom:foundation'].evidence.claims[0].text='<img src=x onerror=alert(1)>';await r.fulfill({contentType:'application/json',body:JSON.stringify(d)});});
   await literal.goto(base+'#event=kingdom%3Afoundation');await literal.locator('.evidence-claim').waitFor();assert.equal(await literal.locator('.evidence-claim img').count(),0);assert.match(await literal.locator('.evidence-claim h3').textContent(),/<img/);await literal.close();
  }
  const locked=await browser.newContext();await locked.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('blocked');}});});
  const p=await locked.newPage();await p.goto(`http://127.0.0.1:${server.address().port}/events/#event=byzantine%3Abyz-674-1`);await p.locator('.evidence-dispute').waitFor();await locked.close();
  assert.deepEqual(errors,[]);await context.close();console.log(`Evidence UI verified: ${curated.length} dossiers, sources and claims, ${disputed.length} disputed dossiers, filters, stable card links, export, five original volumes, privacy, recovery, literal text, storage limits, responsive themes and both deployment paths.`);
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
