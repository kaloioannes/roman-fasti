const assert=require('node:assert/strict'),fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
(async()=>{
 const data=JSON.parse(await fs.readFile(path.join(root,'data/power/index.json'),'utf8')),nav=JSON.parse(await fs.readFile(path.join(root,'data/power/navigation.json'),'utf8'));
 const server=http.createServer(async(req,res)=>{let url=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-fasti\//,'/');if(url.endsWith('/'))url+='index.html';const file=path.resolve(site,'.'+url);if(!file.startsWith(site+path.sep))return res.writeHead(404).end();try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({acceptDownloads:true}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const ready=p=>p.waitForFunction(()=>{const m=document.querySelector('#content');return m?.getAttribute('aria-busy')==='false'&&m.dataset.renderedHash===location.hash;});
  for(const prefix of ['/','/roman-fasti/']){
   const base=`http://127.0.0.1:${server.address().port}${prefix}`;
   await page.goto(base+'power/');await ready(page);assert.equal(await page.locator('.power-card').count(),Object.keys(data.people).length);
   await page.locator('#power-query').fill('Βελισαριος');assert.equal(await page.locator('.power-card').count(),1);await page.getByRole('button',{name:'查找',exact:true}).click();await ready(page);await page.locator('.power-card h2 a').click();await ready(page);assert.equal(await page.locator('h1').textContent(),data.people.belisarius.label);await page.reload();await ready(page);await page.getByRole('link',{name:'← 权力人物目录',exact:true}).click();await ready(page);assert.equal(await page.locator('#power-query').inputValue(),'Βελισαριος');await page.goBack();await ready(page);assert.equal(await page.locator('#content').getAttribute('data-person'),'belisarius');
   for(const p of Object.values(data.people)){
    await page.goto(base+p.url);await ready(page);assert.equal(await page.locator('h1').textContent(),p.label);assert.equal(await page.locator('[data-role]').count(),p.roles.length);assert.equal(await page.locator('[data-action]').count(),p.actions.length);
    assert.equal(await page.locator('h1').count(),1);assert.equal(await page.locator('#roles .power-role>details').count(),p.roles.length);assert.equal(await page.locator('#actions .power-action>details').count(),p.actions.length);
   }
   await page.goto(base+'power/#role=regent');await ready(page);assert.equal(await page.locator('.power-card').count(),Object.values(data.people).filter(p=>p.roles.some(r=>r.kind==='regent')).length);
   await page.goto(base+'power/#period=kingdom');await ready(page);assert.equal(await page.locator('.power-card').count(),0);
   for(const route of ['role=missing','period=missing','from=0','from=1081&to=400','status=unknown']){await page.goto(base+'power/#'+route);await ready(page);assert.match(await page.locator('#content').textContent(),/筛选条件需要修正/);}
   await page.goto(base+'power/#from=780&to=790');await ready(page);assert.equal(await page.locator('.power-card[data-person="irene"]').count(),1);
   await page.goto(base+'power/#from=419&to=419');await ready(page);assert.equal(await page.locator('.power-card[data-person="galla-placidia"]').count(),1);
   await page.goto(base+'power/#from=419&to=419&role=regent');await ready(page);assert.equal(await page.locator('.power-card[data-person="galla-placidia"]').count(),0);
   await page.goto(base+'power/#q=VIII.32');await ready(page);assert.equal(await page.locator('.power-card[data-person="narses"]').count(),1);
   await page.goto(base+'power/#q=unfindable987');await ready(page);assert.equal(await page.locator('.power-card').count(),0);
   await page.goto(base+'power/#q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E');await ready(page);assert.equal(await page.locator('.power-main img').count(),0);
   await page.goto(base+'power/#person=missing');await ready(page);assert.match(await page.locator('h1').textContent(),/找不到/);
   await page.goto(base+'power/#person=pulcheria&action=accession');await ready(page);assert.equal(await page.evaluate(()=>document.activeElement.id),'action-accession');await page.locator('#action-accession>details>summary').click();assert.match(await page.locator('#action-accession').textContent(),/注16/);assert.match(await page.locator('#action-accession').textContent(),/争论/);await page.reload();await ready(page);assert.equal(await page.locator('.power-action.is-selected').count(),1);
   for(const status of ['disputed','reported']){await page.locator('#action-status').selectOption(status);assert.equal(await page.locator('[data-action]').count(),data.people.pulcheria.actions.filter(a=>a.status===status).length);}
   await page.goto(base+'power/#person=julia-domna');await ready(page);assert.equal(await page.locator('#action-patronage a[href*="#year="]').count(),0);assert.match(await page.locator('#action-patronage').textContent(),/未核定/);
   await page.goto(base+'power/#person=theodora-justinian');await ready(page);assert.ok(await page.locator('a[href="../byzantine/#person=theodora"]').count());assert.match(await page.locator('#action-nika').textContent(),/转述/);
   const dl=page.waitForEvent('download');await page.getByRole('button',{name:'下载人物与出处 JSON',exact:true}).click();const exported=JSON.parse(await fs.readFile(await(await dl).path(),'utf8'));assert.equal(exported.person.id,'theodora-justinian');assert.equal(exported.license,'CC BY-SA 4.0');assert.ok(exported.sources['dir-theodora'].scope);assert.ok(exported.person.roles[0].references.length);assert.ok(exported.method);
   await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText(){return Promise.reject(Error('blocked'));}},configurable:true}));await page.getByRole('button',{name:'复制当前视图链接',exact:true}).click();assert.match(await page.locator('.power-export').inputValue(),/power\/#person=theodora-justinian/);assert.match(await page.locator('#export [role=status]').textContent(),/手动复制/);
   for(const [route,selector] of [
    ['empire/#person=tiberius','.power-links a[href="../power/#person=livia"]'],
    ['republic/#person=pe72e7aae32','.power-links a[href="../power/#person=cicero"]'],
    ['byzantine/#person=irene','.power-links a[href="../power/#person=irene"]'],
    ['dynasties/#topic=empire--julio-claudian&node=livia','.power-links a[href="../power/#person=livia"]'],
    ['divided-empire/#year=450','.power-links a[href*="person=pulcheria"]'],
    ['republic/#year=49','.power-links a[href*="person=cicero"]'],
    ['events/#event=byzantine%3Abyz-532-1','.power-links a[href*="person=theodora-justinian"]']]){
    await page.goto(base+route);await page.locator(selector).first().waitFor();await page.locator(selector).first().click();await ready(page);assert.ok(await page.locator('#content').getAttribute('data-person'));
   }
   await page.goto(base+'search/?q=Belisarius&kind=power');await page.locator('[data-kind="power"] h3 a').first().waitFor();await page.locator('[data-kind="power"] h3 a').first().click();await ready(page);assert.equal(await page.locator('#content').getAttribute('data-person'),'belisarius');
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:950});for(const route of ['power/','power/#person=pulcheria']){await page.goto(base+route);await ready(page);await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width} ${theme} ${route}`);}
    if((width===1440&&theme==='light')||(width===390&&theme==='dark')){await page.screenshot({path:path.join(root,'../',`power-${width}-${theme}.png`),fullPage:true});}
   }
   await page.setViewportSize({width:1280,height:900});await page.goto(base+'power/#person=anna-dalassene');await ready(page);const focus=page.locator('#roles .power-role summary').first();await focus.focus();await page.keyboard.press('Enter');assert.equal(await focus.evaluate(n=>n.parentNode.open),true);
   // Every failure is independently recoverable, including deep schema damage.
   for(const compact of [false,true])for(const mode of ['http','json','schema','network','timeout']){
    const p=await context.newPage();let broken=true,count=0,records=0;if(mode==='timeout')await p.clock.install();p.on('request',r=>{if(/data\/empire\/records\./.test(r.url()))records++;});
    await p.route(compact?'**/data/power/navigation.*.json':'**/data/power/index.*.json',async r=>{count++;if(!broken)return r.continue();if(mode==='timeout')return;if(mode==='network')return r.abort();const invalid=structuredClone(compact?nav:data);if(compact)invalid.byPerson['empire:tiberius']=[{person:'missing',relation:'self',note:'bad'}];else invalid.people.pulcheria.roles[0].references[0].source='missing';return r.fulfill({status:mode==='http'?503:200,contentType:'application/json',body:mode==='json'?'{':JSON.stringify(invalid)});});
    await p.goto(base+(compact?'empire/#person=tiberius':'power/#person=pulcheria'));if(compact)await p.locator('.person-page h1').waitFor();if(mode==='timeout')await p.clock.fastForward(21000);const retry=compact?p.getByRole('button',{name:'重试权力关联',exact:true}):p.locator('#retry-power');await retry.waitFor();const before=records;broken=false;await retry.click();await p.locator(compact?'.power-links a':'.power-role').first().waitFor();assert.equal(count,2);assert.equal(records,before);await p.close();
   }
   const race=await context.newPage();let release,count=0;const gate=new Promise(r=>release=r);await race.route('**/data/power/index.*.json',async r=>{count++;await gate;await r.continue();});await race.goto(base+'power/#person=pulcheria');await race.evaluate(()=>location.hash='person=belisarius');release();await race.waitForFunction(()=>document.querySelector('#content').dataset.person==='belisarius');assert.equal(count,1);await race.close();
   const old=await context.newPage();let releaseNav;const hold=new Promise(r=>releaseNav=r);await old.route('**/data/power/navigation.*.json',async r=>{await hold;await r.continue();});await old.goto(base+'divided-empire/#year=450');await old.locator('#year-slider').waitFor();await old.evaluate(()=>location.hash='year=451');releaseNav();await old.locator('.power-links a[href*="action=council"]').waitFor();assert.equal(await old.locator('.power-links a[href*="action=accession"]').count(),0);await old.close();
   const blocked=await browser.newContext();await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'getItem',{value(){throw Error('blocked');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw Error('blocked');}});});const b=await blocked.newPage();await b.goto(base+'power/#person=irene');await ready(b);assert.equal(await b.locator('[data-role]').count(),2);await b.getByRole('button',{name:'切换明暗主题'}).click();await blocked.close();
  }
  assert.deepEqual(errors,[]);console.log('Power verified: all dossiers, evidence, identities, search, dates, backlinks, exports, keyboard, mobile/themes, root/Pages, failures, timeouts, cache and stale requests.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
