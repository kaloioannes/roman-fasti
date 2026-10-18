'use strict';
const $ = s => document.querySelector(s);
const safe = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readPreference = (k, fallback) => {try{return localStorage.getItem(k) ?? fallback}catch{return fallback}};
const writePreference = (k,v) => {try{localStorage.setItem(k,v)}catch{}};
let data, atlas, land, currentYear, projection, zoom, mapGroup;
let stories, activeStory=null, routeVersion=0;
let spoiler = readPreference('fasti-spoiler-v2','false') === 'true';
const revealed = new Set();
const guardedTexts = new Map();
const roles={consul:'正任执政官',suffect:'补任执政官',decemvir:'十人委员会成员',tribune:'具执政官权力的军事保民官',dictator:'独裁官'};
const era = y => y>=367?['早期共和国','城邦与意大利的角逐']:y>=264?['意大利的共和国','走向半岛霸权']:y>=133?['地中海的共和国','海外扩张与行省统治']:['晚期共和国','改革、内战与共和国的终章'];
function themeIcon(){const dark=document.documentElement.dataset.theme==='dark';$('#theme-button').innerHTML=dark?'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/></svg>':'<svg viewBox="0 0 24 24"><path d="M20 14.7A8.6 8.6 0 0 1 9.3 4 8.6 8.6 0 1 0 20 14.7Z"/></svg>';$('#theme-button').setAttribute('aria-label',dark?'切换到亮色界面':'切换到暗色界面');document.querySelector('meta[name="theme-color"]').content=dark?'#181d1c':'#f8f6f1'}
$('#theme-button').addEventListener('click',()=>{document.documentElement.dataset.theme=document.documentElement.dataset.theme==='dark'?'light':'dark';writePreference('fasti-theme',document.documentElement.dataset.theme);themeIcon()});themeIcon();
function parseYear(text){const s=text.trim().replace(/\s*(BCE|BC|公元前|年)\s*/gi,'');return /^\d+$/.test(s)&&Number(s)>=27&&Number(s)<=509?Number(s):null}
function yearHash(y, story=activeStory){return story?`#story=${story.id}&year=${y}`:`#year=${y}`}
function navigate(y){if(activeStory&&(y>activeStory.start||y<activeStory.chapters.at(-1).year))activeStory=null;const hash=yearHash(y);if(location.hash===hash)route();else location.hash=hash}
for(const key of ['home','detail'])$(`#${key}-form`).addEventListener('submit',e=>{e.preventDefault();const y=parseYear($(`#${key}-year`).value);$(`#${key}-error`).textContent=y?'':'请输入 27 至 509 之间的整数，例如 44。';$(`#${key}-year`).setAttribute('aria-invalid',y?'false':'true');if(y)navigate(y)});
const randomYear=()=>{activeStory=null;navigate(27+Math.floor(Math.random()*483))};$('#random-home').onclick=randomYear;$('#random-detail').onclick=randomYear;
document.querySelectorAll('[data-year]').forEach(b=>b.onclick=()=>navigate(Number(b.dataset.year)));
$('#previous-year').onclick=()=>currentYear<509&&navigate(currentYear+1);$('#next-year').onclick=()=>currentYear>27&&navigate(currentYear-1);
$('#year-slider').oninput=e=>{const label=`前${509-Number(e.target.value)}年`;$('#slider-label').textContent=label;e.target.setAttribute('aria-valuetext',label)};
$('#year-slider').onchange=e=>navigate(509-Number(e.target.value));
function syncSpoiler(){
 $('#spoiler-switch').checked=spoiler;
 $('#spoiler-label').textContent=`防剧透：${spoiler?'开':'关'}`;
 $('#spoiler-switch').setAttribute('aria-label',`全站防剧透，${spoiler?'已开启':'已关闭'}`);
}
syncSpoiler();
$('#spoiler-switch').addEventListener('change',e=>{
 spoiler=e.target.checked;writePreference('fasti-spoiler-v2',String(spoiler));revealed.clear();syncSpoiler();
 if(data&&currentYear){const r=data.years[currentYear];renderOfficers(r);renderEvents(r);renderYearNote(r);renderStory();}
 else if(!$('#people-view').hidden)route();
});
$('#reveal-year').onclick=()=>{data.years[currentYear].events.forEach((_,i)=>revealed.add(`${currentYear}-${i}`));renderEvents(data.years[currentYear])};
function guarded(text, label, key, className=''){
 if(!text)return '';
 if(!spoiler)return `<p class="${className}">${safe(text)}</p>`;
 if(revealed.has(key))return `<p class="${className}">${safe(text)}</p>`;
 guardedTexts.set(key,{text,className});
 return `<button class="guard-button" data-reveal="${safe(key)}">${safe(label)} ↗</button>`;
}
function bindGuards(){document.querySelectorAll('[data-reveal]').forEach(b=>b.onclick=()=>{
 const key=b.dataset.reveal,content=guardedTexts.get(key);revealed.add(key);const p=document.createElement('p');p.className=content.className;p.textContent=content.text;p.tabIndex=-1;b.replaceWith(p);p.focus({preventScroll:true});
})}
function renderYearNote(r){const note=$('#year-note');note.hidden=!r.notes?.length;note.innerHTML=guarded((r.notes||[]).join(' '),'展开本年任职说明',`note-${r.year}`);bindGuards()}
async function loadStories(){
 stories=await storiesResource.load();return stories;
}
async function renderStoryCards(){try{
 await loadStories();
 $('#story-cards').innerHTML=stories.map((s,i)=>`<a class="story-card" href="#story=${s.id}&year=${s.start}"><div class="story-card-top"><span>${String(i+1).padStart(2,'0')} / ${safe(s.theme)}</span><span class="story-date">${s.start} <small>BC</small></span></div><span class="story-motif" aria-hidden="true">${safe(s.motif)}</span><div class="story-card-copy"><h3>${safe(s.title)}</h3><p>${safe(s.subtitle)}</p><div class="story-card-bottom"><span>${s.chapters.length} 章 · 前${s.start}—${s.chapters.at(-1).year}年</span><span aria-hidden="true">↗</span></div></div></a>`).join('');
 $('#stories-error').textContent='';
 }catch{$('#story-cards').innerHTML='<button class="text-button" id="retry-stories">重新载入剧本 ↗</button>';$('#retry-stories').onclick=async()=>{await renderStoryCards();route()};$('#stories-error').textContent='剧本载入失败，点击重试。'}
}
function renderStory(){
 const panel=$('#story-context');panel.hidden=!activeStory;if(!activeStory)return;
 const s=activeStory, chapters=s.chapters;
 let index=chapters.findLastIndex(c=>currentYear<=c.year);index=Math.max(0,index);
 const chapter=chapters[index],exact=chapter.year===currentYear;
 const next=chapters.find(c=>c.year<currentYear);
 const source=s.sources[chapter.source];
 const chapterKey=`chapter-${s.id}-${chapter.year}`,concealed=spoiler&&!revealed.has(chapterKey);
 panel.innerHTML=`<div class="story-context-heading"><span class="eyebrow">历史剧本 · ${index+1} / ${chapters.length}</span><a class="text-button" href="#year=${currentYear}">离开剧本 ↗</a></div><h2>${safe(s.title)}</h2><p class="story-subtitle">${safe(s.subtitle)}</p><details class="story-setup" ${currentYear===s.start?'open':''}><summary>开局局势与人物</summary><p>${safe(s.setup)}</p><ul class="story-cast">${s.cast.map(p=>`<li><strong>${safe(p.name)}</strong><span>${safe(p.role)}</span></li>`).join('')}</ul><p class="story-question">${safe(s.question)}</p></details><div class="story-reader"><nav class="chapter-nav" aria-label="剧本章节">${chapters.map((c,i)=>{const future=spoiler&&!revealed.has(`chapter-${s.id}-${c.year}`);return `<a href="#story=${s.id}&year=${c.year}" ${i===index?'aria-current="step"':''}><span>${c.year} <small>BC</small></span><span>${future?`第 ${i+1} 章 · 待读`:safe(c.title)}</span></a>`}).join('')}</nav><div class="chapter-pane"><div class="chapter-reading"><span class="eyebrow">${exact?'本章':'上一节点'} · 前${chapter.year}年</span>${concealed?`<button class="event-reveal" id="reveal-chapter">展开本章故事 <span aria-hidden="true">↗</span></button>`:`<h3>${safe(chapter.title)}</h3><p>${safe(chapter.text)}</p><div class="event-citation"><a href="${safe(source.url)}" target="_blank" rel="noopener">${safe(source.label)} ↗</a><span>${safe(chapter.reference)}</span></div>`}</div><div class="story-continue"><span>${exact?'顺着剧本读，也可以逐年翻阅。':`正在阅读两章之间的前${currentYear}年。`}</span>${next?`<a class="chapter-next" href="#story=${s.id}&year=${next.year}">继续到 ${next.year} BC <span aria-hidden="true">→</span></a>`:'<a class="chapter-next" href="#stories">剧终 · 选择另一个开局 →</a>'}</div></div></div>`;
 if(concealed)$('#reveal-chapter').onclick=()=>{revealed.add(chapterKey);renderStory();const heading=$('.chapter-reading h3');heading.tabIndex=-1;heading.focus({preventScroll:true})};
}
// Cache each successful resource independently. A failed or timed-out request is
// released for explicit retry; navigation shares requests already in flight.
function resource(url,label,decode=value=>value){
 const state={label,status:'idle',value:null,error:null,promise:null};
 state.load=()=>{
  if(state.status==='ready')return Promise.resolve(state.value);
  if(state.promise)return state.promise;
  state.status='loading';state.error=null;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  state.promise=(async()=>{
   try{
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw new Error(`请求失败（${response.status}）`);
    const value=decode(await response.json());
    state.value=value;state.status='ready';return value;
   }catch(error){
    state.status='error';state.error=controller.signal.aborted?'请求超时':error instanceof SyntaxError?'返回的数据无法解析':error instanceof TypeError?'网络请求失败或数据格式不完整':error.message;
    throw error;
   }finally{clearTimeout(timeout);state.promise=null}
  })();
  return state.promise;
 };
 return state;
}
const recordsResource=resource('../data/republic/records.json','文字档案',value=>{
 if(!value?.years||!value.people||!value.stats||!Array.isArray(value.method))throw new Error('文字档案数据不完整');
 return value;
});
const peopleResource=resource('../data/republic/people.json','人物索引',value=>{
 if(!data||!FastiRepublicPeople.valid(value,data))throw new Error('人物索引与文字档案不一致');
 return value;
});
const storiesResource=resource('../data/republic/stories.json','剧本',value=>{
 if(!Array.isArray(value))throw new Error('剧本数据不完整');
 return value;
});
const atlasResource=resource('../data/republic/territories.json','疆域',value=>{
 if(!Array.isArray(value?.features)||!value.features.length)throw new Error('疆域数据不完整');
 return value;
});
const landResource=resource('../shared/assets/land-50m.json','底图',value=>{
 if(!window.topojson)throw new Error('底图组件未载入，请刷新页面');
 return topojson.feature(value,value.objects.land);
});
async function load(){data=await recordsResource.load()}
function archiveFailure(message,version,personRoute=false){
 if(version!==routeVersion)return;
 currentYear=null;$('#home').hidden=personRoute;$('#detail').hidden=true;
 const view=$('#people-view');view.hidden=!personRoute;
 if(personRoute){
  view.replaceChildren();delete view.dataset.person;
  const heading=document.createElement('h1');heading.textContent='人物档案暂时无法载入';
  const note=document.createElement('p');note.textContent='请使用上方按钮重试，或从页头返回人物索引、纪年首页。';
  view.append(heading,note);document.title='人物档案载入失败 · FASTI';
 }
 $('#archive-error').hidden=false;$('#archive-error-message').textContent=message;
 $('#loading').hidden=true;
}
$('#retry-data').onclick=()=>route();

function clearMap(){
 // Stop a zoom animation before removing the previous year's geometry.
 if(window.d3)d3.select('#map-svg').interrupt().on('.zoom',null);
 $('#map-content').replaceChildren();$('#map-content').removeAttribute('transform');
 $('#map-svg').removeAttribute('data-year');
 $('.territory-section .map-card').dataset.state='idle';
 $('.territory-section .map-card').setAttribute('aria-busy','false');
 $('#map-status').hidden=true;
 $('#map').hidden=true;$('#map-caption').textContent='';$('#map-year-label').textContent='';
 $('#map').setAttribute('aria-label','罗马历史疆域示意地图');
 document.querySelectorAll('.territory-section .map-topline,.territory-section .map-bottomline').forEach(el=>el.hidden=true);
 document.querySelectorAll('.map-controls button').forEach(button=>button.disabled=true);
}
function loadMap(y,version,retry=false){
 clearMap();
 const isCurrent=()=>version===routeVersion&&currentYear===y&&!$('#detail').hidden;
 function refresh(){
  if(!isCurrent())return;
  const resources=[atlasResource,landResource];
  const loading=resources.some(item=>item.status==='loading');
  const ready=resources.every(item=>item.status==='ready');
  const status=$('#map-status');
  $('.territory-section .map-card').setAttribute('aria-busy',String(loading));
  $('.territory-section .map-card').dataset.state=ready?'ready':loading?'loading':'error';
  if(ready){
   try{
    if(!window.d3)throw new Error('地图组件未载入，请刷新页面');
    atlas=atlasResource.value;land=landResource.value;
    $('#map').hidden=false;
    renderMap(y);
    status.hidden=true;
    document.querySelectorAll('.territory-section .map-topline,.territory-section .map-bottomline').forEach(el=>el.hidden=false);
    document.querySelectorAll('.map-controls button').forEach(button=>button.disabled=false);
   }catch{
    clearMap();status.hidden=false;
    $('.territory-section .map-card').dataset.state='error';
    status.innerHTML='<p>地图暂时无法绘制，请刷新页面后重试。官员、事件、史料与剧本仍可阅读。</p><button class="text-button" id="retry-map">重试绘制地图 ↗</button>';
    $('#retry-map').onclick=()=>loadMap(currentYear,routeVersion,true);
   }
   return;
  }
  status.hidden=false;
  status.innerHTML=`<p>${resources.some(item=>item.status==='error')?'地图暂时无法完整载入。':'正在载入地图……'}官员、事件、史料与剧本仍可阅读。</p><ul>${resources.map(item=>`<li>${item.label}：${item.status==='ready'?'已就绪':item.status==='error'?safe(item.error):'正在载入……'}</li>`).join('')}</ul>${resources.some(item=>item.status==='error')?'<button class="text-button" id="retry-map">重试未载入的地图资源 ↗</button>':''}`;
  const button=$('#retry-map');if(button)button.onclick=()=>loadMap(currentYear,routeVersion,true);
 }
 for(const item of [atlasResource,landResource]){
  if(item.status==='idle'||item.status==='loading'||(retry&&item.status==='error'))item.load().then(refresh,refresh);
 }
 refresh();
}
async function route(){
 const version=++routeVersion;
 clearMap();
 $('#people-view').hidden=true;
 $('#archive-error').hidden=true;$('#loading').hidden=false;
 const params=new URLSearchParams(location.hash.slice(1));
 $('#loading').textContent=params.has('person')||params.has('people')?'正在查阅人物档案……':'正在翻开这一年的档案……';
 if(params.has('person')||params.has('people')){
  currentYear=null;activeStory=null;$('#home').hidden=true;$('#detail').hidden=true;$('#people-view').setAttribute('aria-busy','true');
  try{
   await load();if(version!==routeVersion)return;
   const people=await peopleResource.load();if(version!==routeVersion)return;
   FastiRepublicPeople.render(params,data,people,{roles,guarded,bindGuards,biographySources});
  }catch{archiveFailure(`人物档案载入失败（${peopleResource.error||recordsResource.error||'请重试'}），可在原页恢复。`,version,true)}
  finally{if(version===routeVersion){$('#loading').hidden=true;$('#people-view').setAttribute('aria-busy','false')}}
  return;
 }
 if(storiesResource.status==='idle')renderStoryCards();
 const routeHash=location.hash.replace(/&focus=[^&]*/g,'');
 const m=routeHash.match(/^#year=(\d+)$/),sm=routeHash.match(/^#story=([a-z-]+)&year=(\d+)$/);
 let y=m?+m[1]:sm?+sm[2]:null;
 activeStory=null;
 if(sm){try{await loadStories();if(version!==routeVersion)return;activeStory=stories.find(s=>s.id===sm[1])||null;if(!activeStory)y=null;else if(y>activeStory.start||y<activeStory.chapters.at(-1).year){activeStory=null;history.replaceState(null,'',`#year=${y}`)}}catch{archiveFailure('剧本载入失败，请检查网络后重试。',version);return}}
 if(y&&y>=27&&y<=509){await showYear(y,version)}else{
  $('#home').hidden=false;$('#detail').hidden=true;currentYear=null;$('#loading').hidden=true;document.title='FASTI · 罗马共和国执政官纪年';
  if(location.hash==='#stories')$('#stories').scrollIntoView();else{window.scrollTo(0,0);if(location.hash)history.replaceState(null,'',location.pathname+location.search)}
 }
}
window.addEventListener('hashchange',route);
$('#republic-skip').onclick=e=>{e.preventDefault();const main=document.querySelector('main:not([hidden])');if(main){main.tabIndex=-1;main.focus();main.scrollIntoView({block:'start'});}};
async function showYear(y,version){$('#loading').hidden=false;try{await load();if(version!==routeVersion)return;currentYear=y;const record=data.years[y];if(!record)throw new Error('此年份档案未能载入');$('#home').hidden=true;$('#detail').hidden=false;$('#detail-year').value=y;$('#detail-error').textContent='';$('#year-number').textContent=y;$('#year-slider').value=509-y;$('#year-slider').setAttribute('aria-valuetext',`前${y}年`);$('#slider-label').textContent=`前${y}年`;$('#era-label').textContent=`${era(y)[0]} · RES PVBLICA`;$('#year-subtitle').textContent=`建城纪年 ${754-y} AUC · ${era(y)[1]}`;$('#previous-year span').textContent=y<509?`${y+1} BC`:'起点';$('#next-year span').textContent=y>27?`${y-1} BC`:'终章';$('#previous-year').disabled=y===509;$('#next-year').disabled=y===27;document.title=`前${y}年 · FASTI 罗马共和国纪年`;FastiPeriods.mount('republic',-y);renderYearNote(record);renderStory();renderOfficers(record);renderEvents(record);renderSources(record);loadMap(y,version);window.scrollTo(0,0);FastiSearchTarget.mount()}catch{archiveFailure(`文字档案载入失败${recordsResource.error?`（${recordsResource.error}）`:''}，请检查网络后重试。`,version)}finally{if(version===routeVersion)$('#loading').hidden=true}}
function personLink(p,label){return p.url?`<a href="${safe(p.url)}" target="_blank" rel="noopener">${safe(p.identified?label:"名录来源")} ↗</a>`:''}
function biographySources(sources){return sources.map(s=>`<a href="${safe(s.url)}" target="_blank" rel="noopener">${safe(s.label)} ↗</a>`).join('')}
function renderBiography(p,pid){
 const biography=p.bioStatus==='authored'?`<details class="bio-details authored-biography"><summary>人物简介 · 编写</summary>${guarded(p.bio,'展开完整生平',`bio-${pid}`,'bio-text')}<div class="bio-sources">${biographySources(p.bioSources)}</div></details>`:'';
 const status=p.bioStatus==='insufficient'?'<p class="identity-note">资料不足：人物身份尚待考订，任职按本条目保留。</p>':'';
 return `<a class="republic-dossier-link" href="#person=${safe(pid)}">人物档案 · 全部已收录任职 ↗</a>${biography}${status}<details class="bio-details office-summary-details"><summary>任职记录摘要 · 自动整理</summary>${guarded(p.officeSummary,'展开已收录任职',`summary-${pid}`,'bio-text')}<div class="bio-sources">${biographySources(p.officeSummarySources)}</div></details><div class="bio-sources">${personLink(p,'人物资料')}<span>${safe(p.nameMethod)}</span></div>`;
}
function renderOfficers(r){const title=r.regime==='tribune'?'当年军事保民官':r.regime==='decemvir'?'当年最高官员':r.regime==='dictator-year'?'传统编年的独裁官':'当年执政官';$('.officials-section h2').textContent=title;$('#office-count').textContent=r.officers.length?`${r.officers.length} 项任职记录`:'最高官职空缺';$('#officials').innerHTML=r.officers.length?r.officers.map(o=>{const p=data.people[o.person];return `<article class="official-card" data-person="${safe(o.person)}" data-bio-status="${safe(p.bioStatus)}"><div class="official-top"><span class="official-role">${safe(roles[o.role])}</span><span class="official-term">${o.term>1?`第 ${o.term} 次任职`:'首次任此官职'}</span></div><h3 class="official-name">${safe(p.zh)}</h3><p class="official-latin" lang="la">${safe(p.latin)}</p>${guarded(o.note,'展开任内经历',`office-${r.year}-${o.person}-${o.role}`,'official-note')}${renderBiography(p,o.person)}</article>`}).join(''):'<div class="vacancy-card"><strong>这一年，没有执政官。</strong><p>传统编年记为最高官职空缺。保民官仍活动，罗马的政治生活并未停止；李维将这段改革僵局记为连续五年，其他年代研究有不同安排。</p></div>';bindGuards();document.querySelectorAll('#officials .official-card').forEach(card=>FastiPeople.mount('republic',card.dataset.person,card))}
function renderEvents(r){
 const concealed=r.events.some((_,i)=>spoiler&&!revealed.has(`${r.year}-${i}`));
 $('#reveal-year').hidden=!concealed;
 $('#events').innerHTML=r.events.map((e,i)=>{
 const hide=spoiler&&!revealed.has(`${r.year}-${i}`);
 const body=hide?`<button class="event-reveal" data-event="${i}" aria-label="展开第 ${i+1} 条事件">第 ${i+1} 条记事 · 点击展开 <span aria-hidden="true">↗</span></button>`:`<div class="event-meta"><span class="event-kind">${safe(e.category||'历史记事')}</span><span>${safe(e.certainty||'传统编年')}</span></div><div class="event-body"><h3>${safe(e.title)}</h3><p>${safe(e.description)}</p></div><div class="event-citation">${(e.sources||[]).map(s=>`<a href="${safe(s.url)}" target="_blank" rel="noopener">${safe(s.label)} ↗</a>`).join('')}${e.reference?`<span>${safe(e.reference)}</span>`:''}</div>`;
 return `<article class="event-row"><div class="event-number">${String(i+1).padStart(2,'0')}</div><div>${body}</div></article>`;
 }).join('');
 document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.event);revealed.add(`${r.year}-${i}`);renderEvents(r);const row=$('#events').children[i];row.tabIndex=-1;row.focus({preventScroll:true})});
}
function renderSources(r){$('#year-source-links').innerHTML=(r.sources||[]).map(s=>`<a href="${safe(s.url)}" target="_blank" rel="noopener">${safe(s.label)} ↗</a>`).join('');$('#source-caveat').textContent=r.year>=300?'早期共和国采用瓦罗编年。各条目的异说与传统叙事分别注明，更多来源见「史料与方法」。':'名录分别列出正任与补任。地图标明所用的历史阶段，战役进展与地方关系见年度记事。'}
function renderMap(y){const target=-y;let feature=atlas.features.find(f=>target>=f.properties.from&&target<=f.properties.to);if(!feature)feature=atlas.features.reduce((a,b)=>Math.abs(target-a.properties.from)<Math.abs(target-b.properties.from)?a:b);const bounds=feature.properties.view||[-12,25,44,53];const box={type:'MultiPoint',coordinates:[[bounds[0],bounds[1]],[bounds[2],bounds[3]]]};projection=d3.geoMercator().fitExtent([[30,24],[730,475]],box);const path=d3.geoPath(projection);const svg=d3.select('#map-svg');const typeScale=Math.min(2.5,760/Math.max(300,$('#map-svg').clientWidth));svg.style('--map-type-scale',typeScale);mapGroup=d3.select('#map-content');mapGroup.selectAll('*').remove();mapGroup.append('path').datum(d3.geoGraticule().step([5,5])()).attr('d',path).attr('class','map-graticule');mapGroup.append('path').datum(land).attr('d',path).attr('class','map-land');mapGroup.append('path').datum(feature).attr('d',path).attr('class',feature.properties.precision==='schematic'?'map-territory approximate':'map-territory');const localCities=y>=338?[['台伯河口',12.26,41.75],...(y<=426?[['菲德奈',12.52,41.98]]:[]),...(y<=396?[['维伊 Veii',12.40,42.02]]:[]),...(y<=381?[['图斯库卢姆',12.71,41.80]]:[]),...(y===338?[['安提乌姆',12.63,41.45]]:[])]:[];const cities=[['罗马 Roma',12.4964,41.9028],...localCities,['迦太基',10.32,36.85],['雅典',23.72,37.98],['亚历山大里亚',29.92,31.2]];for(const [label,lon,lat] of cities){if(lon<bounds[0]||lon>bounds[2]||lat<bounds[1]||lat>bounds[3])continue;const [x,yy]=projection([lon,lat]);mapGroup.append('circle').attr('cx',x).attr('cy',yy).attr('r',(label.startsWith('罗马')?3.5:2.3)*typeScale).attr('class','map-city');mapGroup.append('text').attr('x',x+(x>610?-8:8)*typeScale).attr('y',yy+3*typeScale).attr('text-anchor',x>610?'end':'start').text(label).attr('class','map-city-label')}
const regions=[...(y>=338?[['LATIVM',12.95,42.15],['MARE TYRRHENVM',12.1,41.5]]:[]),['MARE INTERNVM',17,34],['ITALIA',13.5,43.2],['HISPANIA',-4,40],['GALLIA',3,47],['AFRICA',8,32],['GRAECIA',22,39.7],['ASIA',31,39]];for(const [label,lon,lat] of regions){if(lon<bounds[0]||lon>bounds[2]||lat<bounds[1]||lat>bounds[3])continue;const [x,yy]=projection([lon,lat]);mapGroup.append('text').attr('x',Math.max(30+label.length*4.5*typeScale,Math.min(730-label.length*4.5*typeScale,x))).attr('y',yy).text(label).attr('text-anchor','middle').attr('class','map-region-label')}
zoom=d3.zoom().scaleExtent([1,9]).extent([[0,0],[760,510]]).translateExtent([[-250,-200],[1010,710]]).on('zoom',e=>mapGroup.attr('transform',e.transform));svg.call(zoom).call(zoom.transform,d3.zoomIdentity);$('#map-zoom-in').onclick=()=>svg.transition().duration(200).call(zoom.scaleBy,1.5);$('#map-zoom-out').onclick=()=>svg.transition().duration(200).call(zoom.scaleBy,1/1.5);$('#map-reset').onclick=()=>svg.transition().duration(200).call(zoom.transform,d3.zoomIdentity);$('#map-year-label').textContent=feature.properties.label;$('#territory-legend').textContent=feature.properties.precision==='schematic'?'罗马核心控制区 · 近似示意':'罗马控制范围';$('#map-caption').textContent=feature.properties.caption;if(feature.properties.sources){const links=document.createElement('span');links.className='source-links';links.innerHTML=feature.properties.sources.map(s=>`<a href="${safe(s.url)}" target="_blank" rel="noopener">${safe(s.label)} ↗</a>`).join(' · ');$('#map-caption').append(links)}$('#map-svg').dataset.year=y;$('#map').setAttribute('aria-label',`前${y}年罗马疆域示意。${feature.properties.caption}`)}
function renderMethod(){const stats=data.stats;$('#method-content').innerHTML=`<div class="stats-line"><span><strong>483</strong>年度档案</span><span><strong>${stats.appointments}</strong>任职记录</span><span><strong>${stats.people}</strong>人物条目</span><span><strong>${stats.biographies}</strong>编写简介</span><span><strong>${stats.officeSummaries}</strong>任职摘要</span><span><strong>${stats.insufficientBiographies}</strong>身份待考条目</span></div>${data.method.map(m=>`<h3>${safe(m.title)}</h3><p>${m.html}</p>`).join('')}`}
async function showMethod(){
 const dialog=$('#sources-dialog');if(!dialog.open)dialog.showModal();
 $('#method-content').innerHTML='<p role="status">正在载入来源说明……</p>';
 try{await load();if(dialog.open)renderMethod()}
 catch{
  if(!dialog.open)return;
  $('#method-content').innerHTML='<p role="alert">来源说明未能载入，请检查网络后重试。</p><button class="text-button" id="retry-method">重试来源说明 ↗</button>';
  $('#retry-method').onclick=showMethod;
 }
}
$('#sources-button').onclick=showMethod;$('#close-sources').onclick=()=>$('#sources-dialog').close();$('#sources-dialog').onclick=e=>{if(e.target===$('#sources-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close()}};
let resizeToken;window.addEventListener('resize',()=>{clearTimeout(resizeToken);resizeToken=setTimeout(()=>{if(currentYear&&!$('#detail').hidden&&$('.territory-section .map-card').dataset.state==='ready')renderMap(currentYear)},150)});
route();
