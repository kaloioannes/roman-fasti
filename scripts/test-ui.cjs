// Optional browser checks: install Playwright, then run npm run test:ui.
// Assets are served from the checkout through Playwright routing, with no server.
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'..');
const origin='http://fasti.test';
const republic=origin+'/republic/';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.ttf':'font/ttf','.svg':'image/svg+xml'};
const read=p=>fs.readFile(path.join(root,p),'utf8').then(JSON.parse);
const errors=[];
async function context(browser,options={}){
 const c=await browser.newContext({viewport:{width:1440,height:1000},...options});
 await c.route(`${origin}/**`,async route=>{
  const url=new URL(route.request().url());
  const name=decodeURIComponent(url.pathname);
  const file=path.resolve(root,(name.startsWith('/data/')||name==='/project.json')?'.'+name:'site'+(name.endsWith('/')?name+'index.html':name));
  assert.ok(file.startsWith(root+path.sep));
  try{await route.fulfill({body:await fs.readFile(file),contentType:mime[path.extname(file)]||'application/octet-stream'})}
  catch{await route.fulfill({status:404,body:'File not found'})}
 });
 c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 return c;
}
async function year(page,y,story){
 await page.evaluate(hash=>location.hash=hash,story?`story=${story}&year=${y}`:`year=${y}`);
 await page.waitForFunction(({y,story})=>{
  const shown=document.querySelector('#detail').hidden===false&&document.querySelector('#year-number').textContent===String(y);
  const panel=document.querySelector('#story-context');
  return shown&&(story?!panel.hidden&&panel.querySelector('[aria-current]')?.hash===`#story=${story}&year=${y}`:panel.hidden);
 },{y,story});
}
async function toggle(page,on){
 if(await page.locator('#spoiler-switch').isChecked()!==on)await page.locator('.global-spoiler').click();
 assert.equal(await page.locator('#spoiler-switch').isChecked(),on);
}
async function noOverflow(page,label){
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Horizontal overflow: ${label}`);
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHANNEL?{channel:process.env.PLAYWRIGHT_CHANNEL}:{})});
 try{
 const stories=await read('data/republic/stories.json'),data=await read('data/republic/records.json');
 const c=await context(browser);
 // Old preferences must not re-enable the previous experience on upgrade.
 await c.addInitScript(()=>{try{localStorage.setItem('fasti-spoiler','true')}catch{}});
 const page=await c.newPage();
 await page.goto(republic);
 await page.waitForSelector('.story-card');
 assert.equal(await page.locator('.story-card').count(),10);
 assert.equal(await page.locator('#spoiler-switch').isChecked(),false);
 await page.locator('#home-year').fill('510');await page.locator('#home-form').evaluate(e=>e.requestSubmit());
 assert.match(await page.locator('#home-error').textContent(),/27.*509/);
 for(const input of ['44 BCE','44 BC','公元前44年']){
  await page.goto(republic);await page.locator('#home-year').fill(input);await page.locator('#home-form').evaluate(e=>e.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='44');
  assert.equal(new URL(page.url()).hash,'#year=44');
 }
 assert.ok(await page.locator('.event-body').count()>0);
 await toggle(page,true);
 assert.equal(await page.locator('.event-body').count(),0);
 assert.equal(await page.locator('.official-note').count(),0);
 assert.equal(await page.locator('.bio-text').count(),0);
 assert.equal(await page.locator('#events').textContent().then(t=>t.includes(data.years[44].events[0].title)),false);
 const bio=page.locator('.bio-details').first();
 await bio.locator('summary').click();await bio.locator('[data-reveal]').click();
 assert.equal(await bio.getAttribute('open'),'');assert.ok(await bio.locator('.bio-text').isVisible());
 await page.locator('.official-card [data-reveal]').first().click();assert.ok(await page.locator('.official-note').count()>0);
 await toggle(page,false);await toggle(page,true);
 assert.equal(await page.locator('.official-note').count(),0);
 await page.reload();assert.equal(await page.locator('#spoiler-switch').isChecked(),true);
 await year(page,216);
 const eventCount=data.years[216].events.length;assert.ok(eventCount>1);
 await page.locator('[data-event]').first().click();
 assert.equal(await page.locator('.event-body').count(),1);
 assert.equal(await page.locator('[data-event]').count(),eventCount-1);
 await page.locator('#reveal-year').click();assert.equal(await page.locator('.event-body').count(),eventCount);
 await page.locator('#next-year').click();await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='215');
 assert.equal(await page.locator('.event-body').count(),0);
 await year(page,80,'sertorian-rome');
 assert.equal(await page.locator('.chapter-reading h3').count(),0);
 assert.equal(await page.locator('.chapter-nav').textContent().then(t=>t.includes('宴席结束')),false);
 await page.locator('#reveal-chapter').click();assert.equal(await page.locator('.chapter-reading h3').count(),1);
 await page.locator('.chapter-next').click();await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='79');
 assert.equal(await page.locator('.chapter-reading h3').count(),0);
 await toggle(page,false);
 // Every authored chapter must render its own year and continue to the next one.
 let chapters=0;
 for(const story of stories){
  for(let i=0;i<story.chapters.length;i++){
   const chapter=story.chapters[i];await year(page,chapter.year,story.id);
   assert.equal(await page.locator('.chapter-reading h3').textContent(),chapter.title);
   assert.equal(await page.locator('.chapter-reading>p').textContent(),chapter.text);
   const next=story.chapters[i+1];
   assert.equal(await page.locator('.chapter-next').getAttribute('href'),next?`#story=${story.id}&year=${next.year}`:'#stories');
   chapters++;
  }
 }
 await year(page,77,'sertorian-rome');await page.locator('#next-year').click();
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='76');
 assert.equal(new URL(page.url()).hash,'#story=sertorian-rome&year=76');
 await year(page,80,'sertorian-rome');await page.locator('#previous-year').click();
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='81');
 assert.equal(new URL(page.url()).hash,'#year=81');
 await page.goto(`${republic}#story=sertorian-rome&year=44`);
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='44');
 assert.equal(new URL(page.url()).hash,'#year=44');
 await page.goto(`${republic}#story=unknown&year=44`);assert.equal(await page.locator('#home').isVisible(),true);
 await page.goto(`${republic}#year=509`);await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='509');
 assert.equal(await page.locator('#previous-year').isDisabled(),true);
 await year(page,27);assert.equal(await page.locator('#next-year').isDisabled(),true);
 // The republican slider advances in historical order, previews without navigation,
 // commits through the existing story-aware router, and synchronises on reload.
 await year(page,509);assert.equal(await page.locator('#year-slider').inputValue(),'0');
 await page.locator('#year-slider').evaluate(el=>{el.value='5';el.dispatchEvent(new Event('input',{bubbles:true}))});
 assert.equal(await page.locator('#slider-label').textContent(),'前504年');
 assert.equal(new URL(page.url()).hash,'#year=509');
 await page.locator('#year-slider').dispatchEvent('change');
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='504');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='504');
 assert.equal(await page.locator('#year-slider').inputValue(),'5');
 await page.locator('#year-slider').focus();await page.keyboard.press('ArrowRight');
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='503');
 await page.keyboard.press('End');await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='27');
 assert.equal(await page.locator('#year-slider').inputValue(),'482');
 await year(page,80,'sertorian-rome');
 await page.locator('#year-slider').evaluate(el=>{el.value='430';el.dispatchEvent(new Event('input'));el.dispatchEvent(new Event('change'))});
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='79');
 assert.equal(new URL(page.url()).hash,'#story=sertorian-rome&year=79');
 await page.locator('#year-slider').evaluate(el=>{el.value='465';el.dispatchEvent(new Event('change'))});
 await page.waitForFunction(()=>document.querySelector('#year-number').textContent==='44');
 assert.equal(new URL(page.url()).hash,'#year=44');
 for(const y of [509,504,480,427,426,397,396,382,381,339,338,337]){
  await year(page,y);
  assert.equal(await page.locator('.map-territory.approximate').count(),y>=338?1:0);
  assert.ok((await page.locator('.map-territory').getAttribute('d')).length>80);
  if(y>=338)assert.ok(await page.locator('#map-caption a').count());
 }
 await page.locator('#map-zoom-in').click();await page.waitForTimeout(250);
 assert.notEqual(await page.locator('#map-content').getAttribute('transform'),'translate(0,0) scale(1)');
 await page.locator('#map-reset').click();await page.waitForTimeout(250);
 assert.equal(await page.locator('#map-content').getAttribute('transform'),'translate(0,0) scale(1)');
 await page.locator('#sources-button').click();assert.equal(await page.locator('#sources-dialog').isVisible(),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#sources-dialog').isVisible(),false);
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  for(const dark of [false,true]){
   await page.goto(`${republic}#stories`);await page.waitForSelector('.story-card');
   await page.evaluate(d=>document.documentElement.dataset.theme=d?'dark':'light',dark);
   await noOverflow(page,`home ${width} ${dark}`);
   await year(page,43,'sicilian-sea');await noOverflow(page,`story ${width} ${dark}`);
   const header=await page.locator('.site-header').boundingBox();
   assert.ok(header.height<180,`Header too tall at ${width}`);
   if(process.env.FASTI_SCREENSHOTS&&[390,1440].includes(width)&&dark){
    await fs.mkdir(process.env.FASTI_SCREENSHOTS,{recursive:true});
    await page.screenshot({path:path.join(process.env.FASTI_SCREENSHOTS,`story-${width}-dark.png`),fullPage:true});
   }
  }
 }
 // Storage restrictions must leave the fresh experience usable.
 const blocked=await context(browser);await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('Storage blocked')}}));
 const bp=await blocked.newPage();await bp.goto(republic);await bp.waitForSelector('.story-card');
 await year(bp,44);await toggle(bp,true);await toggle(bp,false);await blocked.close();
 // Failed story fetches can recover through the visible retry button.
 const retry=await context(browser);let failStories=true;
 await retry.route('**/data/republic/stories.json',async route=>failStories?route.fulfill({status:503,body:'Try again'}):route.fallback());
 const rp=await retry.newPage();await rp.goto(`${republic}#story=sertorian-rome&year=80`);await rp.waitForSelector('#retry-stories');
 failStories=false;await rp.locator('#retry-stories').click();
 await rp.waitForFunction(()=>document.querySelector('#year-number').textContent==='80');
 await retry.close();
 // Two navigations during the initial annual fetch must finish on the last year.
 const race=await context(browser);
 await race.route('**/data/republic/records.json',async route=>{await new Promise(resolve=>setTimeout(resolve,150));await route.fallback()});
 const racePage=await race.newPage();await racePage.goto(republic);
 await racePage.evaluate(()=>{location.hash='year=44';setTimeout(()=>location.hash='year=43',10)});
 await racePage.waitForFunction(()=>document.querySelector('#year-number').textContent==='43');
 assert.match(await racePage.title(),/43/);await race.close();
 assert.deepEqual(errors,[]);
 console.log(`Browser checks passed: ${stories.length} stories, ${chapters} chapters, spoiler controls, persistence, navigation, recovery, storage restrictions, and light/dark layouts at 320/390/768/1440px.`);
 await c.close();
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exitCode=1});
