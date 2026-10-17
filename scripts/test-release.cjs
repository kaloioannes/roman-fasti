// Run build_site.py first. This test uses real HTTP and preserves browser caches.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..'),site=path.join(root,'_site');
const base='/roman-republic-fasti/';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const manifest=JSON.parse(await fs.readFile(path.join(site,'asset-manifest.json'),'utf8'));
 const legacyCSS=(await fs.readFile(path.join(root,'site/shared/ui.css'),'utf8')).split('/* Historical starts')[0];
 const counts=new Map(),errors=[];
 const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  counts.set(url.pathname,(counts.get(url.pathname)||0)+1);
  if(!url.pathname.startsWith(base)){res.writeHead(404).end();return}
  let name=url.pathname.slice(base.length)||'index.html';
  if(name.endsWith('/'))name+='index.html';
  res.setHeader('Cache-Control',name.endsWith('.html')?'no-cache':'public, max-age=3600');
  res.setHeader('Content-Type',mime[path.extname(name)]||'application/octet-stream');
  if(name==='legacy.html'){
   res.end('<!doctype html><link rel="stylesheet" href="style.css"><script src="app.js"></script><div class="story-cards"><a class="story-card"><h2>旧缓存</h2></a></div>');return;
  }
  if(name==='style.css'){res.end(legacyCSS);return}
  if(name==='app.js'){res.end("fetch('data/republic/stories.json').then(r=>r.json()).then(()=>window.legacyReady=true)");return}
  if(name==='data/republic/stories.json'){res.end('[]');return}
  const file=path.resolve(site,name);
  if(!file.startsWith(site+path.sep)){res.writeHead(404).end();return}
  try{res.end(await fs.readFile(file))}catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  await context.addInitScript(()=>{try{localStorage.setItem('fasti-theme','dark')}catch{}});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  const origin=`http://127.0.0.1:${server.address().port}${base}`;
  // Reproduce the unstyled story list using the previously cached stylesheet.
  await page.goto(origin+'legacy.html');await page.waitForFunction(()=>window.legacyReady);
  assert.equal(await page.locator('.story-cards').evaluate(e=>getComputedStyle(e).display),'block');
  await page.goto(origin+'legacy.html');await page.waitForFunction(()=>window.legacyReady);
  for(const name of ['style.css','app.js','data/republic/stories.json'])assert.equal(counts.get(base+name),1,`Browser did not keep ${name} in cache`);
  await page.goto(origin+'#stories');await page.waitForSelector('.story-card');
  assert.equal(await page.locator('.story-card').count(),10);
  const cardStyle=await page.locator('.story-cards').evaluate(e=>({display:getComputedStyle(e).display,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));
  assert.deepEqual(cardStyle,{display:'grid',columns:2});
  assert.ok(await page.locator('.story-card').first().evaluate(e=>parseFloat(getComputedStyle(e).paddingLeft)>=20));
  for(const name of ['style.css','app.js','data/republic/stories.json'])assert.equal(counts.get(base+name),1,`New release reused unversioned ${name}`);
  for(const name of ['style.css','app.js','data/republic/stories.json'])assert.ok(counts.has(base+manifest[({'style.css':'shared/ui.css','app.js':'republic/app.js'}[name]||name)]),`Missing release asset: ${name}`);
  const output=process.env.FASTI_OUTPUTS;
  if(output){await fs.mkdir(output,{recursive:true});await page.locator('#stories').screenshot({path:path.join(output,'fasti-stories-desktop-dark.png')})}
  await page.goto(origin+'#story=written-law&year=451');
  await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='451');
  await page.evaluate(()=>document.querySelector('.story-setup').open=true);
  for(const name of ['data/republic/records.json','data/republic/territories.json'])assert.ok(counts.has(base+manifest[({'style.css':'shared/ui.css','app.js':'republic/app.js'}[name]||name)]));
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000});
   for(const theme of ['light','dark']){
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    const reader=await page.locator('.story-reader').evaluate(e=>({display:getComputedStyle(e).display,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));
    assert.deepEqual(reader,{display:'grid',columns:width<=700?1:2});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Overflow at ${width}/${theme}`);
    assert.equal(await page.locator('.chapter-nav [aria-current]').count(),1);
    const current=await page.locator('.chapter-nav [aria-current]').evaluate(e=>({background:getComputedStyle(e).backgroundColor,shadow:getComputedStyle(e).boxShadow}));
    assert.notEqual(current.background,'rgba(0, 0, 0, 0)');assert.notEqual(current.shadow,'none');
    const reading=await page.locator('.chapter-reading>p').evaluate(e=>({font:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));
    assert.ok(reading.font>=13&&reading.line>=27,`Missing reading styles at ${width}/${theme}`);
    if(output&&theme==='dark'&&[390,1440].includes(width))await page.locator('#story-context').screenshot({path:path.join(output,`fasti-story-${width===390?'mobile':'desktop'}-dark.png`),style:'.site-header{visibility:hidden!important}'});
   }
  }
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('Release browser checks passed over real HTTP: cached old CSS/JS/data, versioned upgrade, Pages subpath, styled cards and chapters, four viewport widths and both themes.');
 }finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(resolve));
 }
})().catch(error=>{console.error(error);process.exitCode=1});
