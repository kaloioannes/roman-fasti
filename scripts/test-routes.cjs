// Test old public URLs and new period entries at both domain root and Pages subpath.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const site=path.resolve(__dirname,'../_site');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
(async()=>{
 const server=http.createServer(async(req,res)=>{
  let name=new URL(req.url,'http://localhost').pathname.replace(/^\/roman-republic-fasti\//,'/');
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(site,'.'+name);
  if(!file.startsWith(site+path.sep))return res.writeHead(404).end();
  try{res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file))}
  catch{res.writeHead(404).end()}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 let browser;
 try{
  browser=await chromium.launch({headless:true,args:['--no-proxy-server'],...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
  const context=await browser.newContext();
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()}: ${r.url()}`)});
  for(const base of ['/','/roman-republic-fasti/']){
   const origin=`http://127.0.0.1:${server.address().port}${base}`;
   await page.goto(origin);
   await page.waitForFunction(()=>document.querySelector('#available-periods')?.textContent.includes('483'));
   assert.equal(await page.locator('.period-card').count(),5);
   assert.equal(await page.locator('#planned-periods a').count(),0);
   for(const width of [320,390,768,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Catalogue overflow: ${width}/${theme}`);
    if(process.env.FASTI_OUTPUTS&&base==='/'&&theme==='light'&&[390,1440].includes(width)){
      await fs.mkdir(process.env.FASTI_OUTPUTS,{recursive:true});
      await page.screenshot({path:path.join(process.env.FASTI_OUTPUTS,`catalog-${width}.png`),fullPage:true});
    }
   }
   await page.locator('#theme-button').click();
   const theme=await page.evaluate(()=>document.documentElement.dataset.theme);
   await page.locator('a.period-card[href="empire/"]').click();await page.waitForSelector('.story-card');
   assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);
   await page.locator('a[href="../"]').click();await page.waitForSelector('.period-card');
   for(const [old,target] of [
    ['?from=bookmark#year=44','republic/?from=bookmark#year=44'],
    ['index.html#stories','republic/#stories'],
    ['#story=sertorian-rome&year=77','republic/#story=sertorian-rome&year=77'],
    ['emperors.html?from=bookmark#year=-27','empire/?from=bookmark#year=-27'],
    ['emperors.html#person=augustus','empire/#person=augustus'],
    ['emperors.html#people&dynasty=severan','empire/#people&dynasty=severan']
   ]){
    await page.goto(origin+old);await page.waitForURL(origin+target);
    await page.waitForFunction(()=>!document.querySelector('.initial-status'));
    if(target.includes('year=44'))await page.waitForFunction(()=>document.querySelector('#year-number')?.textContent==='44');
    if(target.includes('person=augustus'))await page.waitForSelector('.person-body');
   }
   // Hash changes on the already loaded catalogue are also old-style navigation.
   await page.goto(origin);await page.waitForSelector('.period-card');
   await page.evaluate(()=>location.hash='year=509');await page.waitForURL(origin+'republic/#year=509');
   await page.waitForFunction(()=>document.querySelector('#year-number')?.textContent==='509');
  }
  assert.deepEqual(errors,[]);
  // Static fallback remains usable if JavaScript is disabled or catalogue data fails.
  const noJS=await browser.newContext({javaScriptEnabled:false});
  const fallback=await noJS.newPage();await fallback.goto(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(await fallback.locator('.period-card').count(),5);
  const failed=await context.newPage();await failed.route('**/project.*.json',route=>route.fulfill({status:503,body:'retry'}));
  await failed.goto(`http://127.0.0.1:${server.address().port}/`);await failed.waitForFunction(()=>document.querySelector('#catalog-status').textContent.length>0);
  assert.equal(await failed.locator('.period-card').count(),5);
  console.log('Routes verified: root + Pages subpath, catalogue, shared theme, all legacy hash/query redirects, static fallback and mobile layouts.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve))}
})().catch(error=>{console.error(error);process.exitCode=1});
