'use strict';
(() => {
  const $ = s => document.querySelector(s), main = $('#content');
  const years = Array.from({length:82},(_,i)=>395+i);
  const sides = {west:'西部',east:'东部',both:'跨两部'};
  const kinds = {central:'宫廷皇帝',junior:'共帝',rival:'争位者',exile:'流亡帝号',caesar:'恺撒',disputed:'帝号有争议',senior:'共同资深皇帝'};
  const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm = s => s.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase();
  let data, places, land, mapData, mapPromise, generation = 0;
  const milestones = [
    [395,'两座宫廷','兄弟继承父辈的帝国，分治从此延续。'],
    [410,'罗马之劫','城遭劫掠，意大利宫廷仍在拉文纳。'],
    [425,'来自东方的继承','东部军队扶持西部的新皇帝。'],
    [439,'失去迦太基','粮仓、港口与税赋改变了归属。'],
    [468,'共同的远征','东西联合舰队驶向汪达尔非洲。'],
    [476,'一个宫廷的终章','西部帝号与意大利宫廷走向不同结局。']
  ];
  const sourceLinks = keys => `<div class="source-links">${[...new Set(keys)].map(k=>`<a href="${esc(data.sources[k].url)}" target="_blank" rel="noopener">${esc(data.sources[k].label)} ↗</a>`).join('')}</div>`;
  const native = p => `<span class="native-name" lang="${p.nativeName.lang}">${esc(p.nativeName.text)}</span>`;
  const dates = r => `${esc(r.startDate.label)} — ${esc(r.endDate.label)}`;
  const badge = r => `<span class="role-badge" data-kind="${r.kind}">${kinds[r.kind]}</span>`;
  const family = p => `${({dynasty:'王朝',family:'家族',none:'归属'}[data.dynasties[p.dynasty].kind])}：${esc(data.dynasties[p.dynasty].label)}`;
  const yearLink = y => `<a class="year-chip" href="#year=${y}">${y}年 ↗</a>`;
  const form = (y='') => `<form id="year-form" class="year-form" novalidate><label for="year-input">公元 <span lang="la">AD</span></label><input id="year-input" name="year" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="395—476" value="${y}" aria-describedby="year-error"><button type="submit" aria-label="查看这一年">翻开这一年 ↗</button></form><p id="year-error" class="form-error" role="alert"></p>`;
  function bindForm() {
    $('#year-form').onsubmit = e => {
      e.preventDefault(); const input = $('#year-input'), value = input.value.trim();
      if (!/^\d+$/.test(value)||!data.years[Number(value)]) {input.setAttribute('aria-invalid','true');$('#year-error').textContent='请输入395—476之间的整数年份。';return;}
      input.removeAttribute('aria-invalid');$('#year-error').textContent='';location.hash=`year=${Number(value)}`;
    };
  }
  function renderHome() {
    document.title='FASTI · 双帝国时期皇帝数据库';
    main.innerHTML=`<div class="volume-home"><section class="dual-hero"><div class="hero-caption"><span>第四卷 · 晚期古代</span><span>AD 395 — 476</span></div><div class="hero-halves" aria-hidden="true"><span lang="la">OCCIDENS</span><i>·</i><span lang="la">ORIENS</span></div><div class="hero-center"><p class="eyebrow">一个罗马世界 · 两座皇帝宫廷</p><h1><span class="hero-line">同一条时间<span class="hanging-punctuation">，</span></span><em class="hero-line">帝国的两端<span class="hanging-punctuation">。</span></em></h1><p class="hero-intro">西望拉文纳，东向君士坦丁堡。<br>把两部的皇帝、继承与动荡，放回同一个年份。</p>${form()}<div class="hero-suggestions">${[395,410,451,476].map(yearLink).join('')}<button id="random-year">⚄ 偶遇一年</button></div></div><div class="court-diptych"><a href="#year=395" data-side="west"><span class="eyebrow">PARS OCCIDENTALIS</span><h2>西部宫廷</h2><p>米兰 · 拉文纳 · 罗马</p><span>从霍诺里乌斯，到罗慕路斯 →</span></a><a href="#year=395" data-side="east"><span class="eyebrow">PARS ORIENTALIS</span><h2>东部宫廷</h2><p>君士坦丁堡 · 新罗马</p><span>从阿卡狄乌斯，到芝诺 →</span></a></div></section><section class="home-stats" aria-label="数据库规模"><div><strong>${data.stats.years}</strong><span>连续年度</span></div><div><strong>${data.stats.people}</strong><span>人物档案 · 含共帝与争位者</span></div><div><strong>${data.stats.events}</strong><span>附出处的独立记事</span></div><div><strong>Ⅱ</strong><span>宫廷 · 同年对照</span></div></section><section class="milestones"><div class="section-title"><div><p class="eyebrow">TEMPORA · 六个阅读入口</p><h2>一场漫长的分途</h2></div><a href="#people">查找人物 ↗</a></div><div class="milestone-grid">${milestones.map(([y,title,text])=>`<a class="milestone" href="#year=${y}"><span class="milestone-year">${y}<small>AD</small></span><h3>${title}</h3><p>${text}</p><span class="arrow">↗</span></a>`).join('')}</div></section><section class="reading-note"><span class="eyebrow">如何阅读这一卷</span><p>同年出现，不等于全年共治。实际控制、帝号与对方宫廷的承认分开记录。395年的分治延续罗马共治传统；476年之后，尼波斯仍保有获东方承认的西部帝号。</p><a href="#sources">阅读史料与取舍 ↗</a></section>${downloads()}</div>`;
    bindForm();$('#random-year').onclick=randomYear;bindDownloads();
  }
  function downloads(){return '<div class="download-actions"><button id="download-years">年度 CSV ↓</button><button id="download-json">完整 JSON ↓</button></div>';}
  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function bindDownloads(){
    $('#download-json').onclick=()=>download('divided-empire-records'+'.json',JSON.stringify(data,null,2),'application/json');
    $('#download-years').onclick=()=>{
      const roster=(record,side)=>record.rulers.filter(o=>['both',side].includes(data.people[o.person].reigns[o.reign].side)).map(o=>{const p=data.people[o.person],r=p.reigns[o.reign];return `${p.zh}［${kinds[r.kind]}；${r.startDate.label}—${r.endDate.label}；${r.recognition}］`;}).join('；');
      const rows=[['公元年','西部帝位人物与任期','东部帝位人物与任期','西部宫廷空缺或终结','记事与史料定位'],...years.map(y=>{const rec=data.years[y];return [y,roster(rec,'west'),roster(rec,'east'),rec.vacancies.map(v=>`${v.label}（${v.startDate.label}—${v.endDate.label}）`).join('；'),rec.events.map(e=>`${sides[e.side]}：${e.title}｜${e.description}［${e.certainty}；${e.reference}］`).join('；')];})];
      const quote=s=>'"'+String(s).replaceAll('"','""')+'"';
      download('divided-empire-years.csv','\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
    };
  }
  function rulerCard(p,r){return `<article class="ruler-card" data-person="${p.id}" data-kind="${r.kind}" data-side="${r.side}"><div class="ruler-card-top">${badge(r)}<span class="recognition">${esc(r.recognition)}</span></div><h3><a href="#person=${p.id}">${esc(p.zh)} ↗</a></h3>${native(p)}<p class="reign-dates">${dates(r)}</p><a class="family-tag" href="#people&dynasty=${p.dynasty}">${family(p)}</a><p class="territory">${esc(r.territory)}</p><p class="ruler-note">${esc(r.note)}</p><details><summary>人物简介与任期依据</summary>${p.bio.map(t=>`<p>${esc(t)}</p>`).join('')}<p class="reference">${esc(p.reference)}</p>${sourceLinks([...r.dateSources,...p.sources])}<a class="bio-link" href="#person=${p.id}">完整人物档案 ↗</a></details></article>`;}
  function renderYear(y){
    const record=data.years[y];document.title=`${y}年 · 双帝国纪年 · FASTI`;
    const entries=record.rulers.map(o=>({p:data.people[o.person],r:data.people[o.person].reigns[o.reign]})).sort((a,b)=>a.r.startDate.value.localeCompare(b.r.startDate.value));
    const court=side=>{
      const list=entries.filter(x=>x.r.side===side),central=list.filter(x=>x.r.kind==='central'),other=list.filter(x=>x.r.kind!=='central');
      return `<section class="court-column" data-court="${side}" aria-labelledby="${side}-title"><header class="court-heading"><div><span class="eyebrow">${side==='west'?'OCCIDENS':'ORIENS'}</span><h2 id="${side}-title">${sides[side]}宫廷</h2></div><span>${side==='west'?(y<402?'米兰及意大利':y>=475?'拉文纳 · 达尔马提亚':'拉文纳 · 罗马'):'君士坦丁堡'}</span></header>${central.length?central.map(x=>rulerCard(x.p,x.r)).join(''):'<p class="no-emperor">本年无另设西部奥古斯都<br><small>见下方宫廷空缺说明；东方利奥一世仍在位。</small></p>'}${record.vacancies.filter(v=>v.side===side).map(v=>`<article class="vacancy-card"><span class="eyebrow">${v.id==='court-ended-476'?'宫廷终结':'宫廷空缺'}</span><h3>${esc(v.label)}</h3><p>${dates(v)}</p><p>${esc(v.note)}</p>${sourceLinks(v.sources)}</article>`).join('')}${other.length?`<div class="secondary-rulers"><h3>共帝、争位与其他称号</h3>${other.map(x=>rulerCard(x.p,x.r)).join('')}</div>`:''}</section>`;
    };
    main.innerHTML=`<div class="annual-page"><div class="annual-toolbar"><a href="#">← 双帝国纪年</a><a href="#people">人物索引 ↗</a>${form(y)}</div><section class="annual-heading"><div><p class="eyebrow">ANNO DOMINI · 两部对读</p><h1>${y}<small>AD</small></h1><p>${esc(record.events[0].title)}</p></div><div class="year-nav"><button id="previous-year" aria-label="上一年"${y===395?' disabled':''}>← <span>${y===395?'起点':y-1}</span></button><button id="next-year" aria-label="下一年"${y===476?' disabled':''}><span>${y===476?'终点':y+1}</span> →</button></div></section><label class="sr-only" for="year-slider">浏览395—476年</label><input class="year-range" id="year-slider" type="range" min="395" max="476" value="${y}" aria-valuetext="${y}年"><div class="range-labels"><span>395 · 分治</span><output id="slider-label" for="year-slider">${y}年</output><span>476 · 西部宫廷终结</span></div><nav class="period-boundary" data-period-boundary aria-label="相邻时期的年度" hidden></nav>${entries.filter(x=>x.r.side==='both').map(x=>`<section class="shared-emperor"><h2>1月17日前 · 共同的资深皇帝</h2>${rulerCard(x.p,x.r)}</section>`).join('')}<div class="courts-grid">${court('west')}${court('east')}</div><section class="annual-events"><div class="section-title"><div><span class="eyebrow">RES GESTAE · 本年记事</span><h2>同一年，地中海的两端</h2></div><label class="event-select">范围<select id="event-side" aria-label="筛选记事范围"><option value="">全部记事</option><option value="west">西部及跨两部</option><option value="east">东部及跨两部</option></select></label></div><div id="event-list">${record.events.map((e,i)=>`<article class="event-row" data-side="${e.side}"><span class="event-number">${String(i+1).padStart(2,'0')}</span><div class="event-body"><p class="event-meta"><span class="side-tag" data-side="${e.side}">${sides[e.side]}</span>${esc(e.certainty)}</p><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p><p class="reference">定位：${esc(e.reference)}</p>${sourceLinks(e.sources)}</div></article>`).join('')}</div><p class="empty-state" id="no-events" hidden>本年收录的记事属于另一部。选择“全部记事”可继续阅读。</p></section><section class="places-section"><div class="section-title"><div><span class="eyebrow">LOCA · 空间参照</span><h2>疆域阶段与政治据点</h2></div><span>东西分层 · 来源阶段参考</span></div><div class="map-card" id="places-map"><p class="initial-status" role="status">正在载入地理参照……</p></div><p class="map-caveat" id="map-stages"></p><p class="map-caveat">疆域：Cliopatria / Seshat（CC BY 4.0），固定v0.2.0；陆地底图：Natural Earth（公有领域）。图层是历史阶段重建，不是逐年调查，也不划分争位者辖境。476年西部图层仅供9月退位前参考。色点为城市叙事归属，<strong>不代表${y}年的城市控制权</strong>；迦太基、图卢兹等城市的实际政治归属须结合本年记事阅读。</p></section>${downloads()}</div>`;
    FastiPeriods.mount('divided-empire',y);bindForm();bindDownloads();$('#previous-year').onclick=()=>{if(y>395)location.hash=`year=${y-1}`;};$('#next-year').onclick=()=>{if(y<476)location.hash=`year=${y+1}`;};
    $('#year-slider').oninput=e=>{$('#slider-label').textContent=e.target.value+'年';e.target.setAttribute('aria-valuetext',e.target.value+'年');};
    $('#year-slider').onchange=e=>{location.hash=`year=${e.target.value}`;};
    $('#event-side').onchange=e=>{let count=0;main.querySelectorAll('.event-row').forEach(row=>{row.hidden=!!e.target.value&&!['both',e.target.value].includes(row.dataset.side);if(!row.hidden)count++;});$('#no-events').hidden=count>0;};
    drawMap(y);
  }
  function renderDirectory(){
    document.title='人物索引 · 双帝国纪年 · FASTI';const params=new URLSearchParams(location.hash.slice(1));
    main.innerHTML=`<section class="directory"><a class="back-link" href="#">← 双帝国纪年</a><p class="eyebrow">PROSOPOGRAPHIA · 皇位与人</p><h1>两部之间的许多人</h1><p class="page-intro">中文、拉丁文、希腊文、家族与身份检索。33位人物包括主帝、共帝、争位者及选录恺撒；帝号、实际控制与承认关系分别说明。</p><div class="directory-tools"><label>查找人物<input id="person-search" type="search" placeholder="姓名、家族或关键词"></label><label>两部<select id="side-filter"><option value="">全部</option><option value="west">西部</option><option value="east">东部</option></select></label><label>身份<select id="kind-filter"><option value="">全部身份</option>${Object.entries(kinds).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>王朝／家族<select id="dynasty-filter"><option value="">全部归属</option>${Object.entries(data.dynasties).map(([k,v])=>`<option value="${k}">${esc(v.label)}</option>`).join('')}</select></label></div><p id="directory-count" role="status"></p><div id="directory-grid" class="directory-grid"></div></section>`;
    for(const [id,key] of [['person-search','q'],['side-filter','side'],['kind-filter','kind'],['dynasty-filter','dynasty']])if(params.has(key))$("#"+id).value=params.get(key);
    const update=()=>{
      const q=norm($('#person-search').value.trim()),side=$('#side-filter').value,kind=$('#kind-filter').value,dynasty=$('#dynasty-filter').value;
      const shown=Object.values(data.people).filter(p=>(!q||norm([p.zh,p.aliases,p.bio.join(' '),data.dynasties[p.dynasty].label,...p.reigns.map(r=>kinds[r.kind])].join(' ')).includes(q))&&(!dynasty||p.dynasty===dynasty)&&p.reigns.some(r=>(!side||[side,'both'].includes(r.side))&&(!kind||r.kind===kind)));
      $('#directory-count').textContent=`找到${shown.length}位人物`;
      $('#directory-grid').innerHTML=shown.length?shown.map(p=>`<a class="person-card" data-person="${p.id}" href="#person=${p.id}"><span class="person-side">${[...new Set(p.reigns.map(r=>sides[r.side]))].join(' · ')}</span><h2>${esc(p.zh)}</h2>${native(p)}<span class="person-period">${Math.min(...p.reigns.map(r=>r.start))} — ${Math.max(...p.reigns.map(r=>r.end))}</span><span>${family(p)}</span><p>${[...new Set(p.reigns.map(r=>kinds[r.kind]))].join(' · ')}</p><span class="card-arrow">完整档案 ↗</span></a>`).join(''):'<p class="empty-state">没有匹配人物，请调整检索条件。</p>';
      const p=new URLSearchParams('people');for(const [k,v]of [['q',$('#person-search').value],['side',side],['kind',kind],['dynasty',dynasty]])if(v)p.set(k,v);history.replaceState(null,'','#'+p.toString());
    };
    for(const id of ['person-search','side-filter','kind-filter','dynasty-filter'])$('#'+id).addEventListener(id==='person-search'?'input':'change',update);update();
  }
  function renderPerson(id){
    const p=data.people[id];if(!p){invalid('找不到此人物。');return;}document.title=`${p.zh} · 双帝国人物档案 · FASTI`;
    main.innerHTML=`<article class="person-page"><a class="back-link" href="#people">← 人物索引</a><header class="person-heading"><p class="eyebrow">IMPERIVM · 人物档案</p><h1>${esc(p.zh)}</h1>${native(p)}${p.greek?`<p class="greek-name" lang="el">${esc(p.greek)}</p>`:''}<a class="family-tag" href="#people&dynasty=${p.dynasty}">${family(p)}</a><p class="ruler-note">${esc(data.dynasties[p.dynasty].note)} ${esc(p.dynastyNote || '')}</p>${sourceLinks(data.dynasties[p.dynasty].sources)}</header><div class="person-body">${p.bio.map(t=>`<p>${esc(t)}</p>`).join('')}</div><h2>称号与任期</h2><div class="reign-list">${p.reigns.map(r=>`<section class="reign-entry" data-side="${r.side}"><div>${badge(r)}<span class="recognition">${sides[r.side]} · ${esc(r.recognition)}</span></div><h3>${dates(r)}</h3><p>${esc(r.territory)}</p><p>${esc(r.note)}</p>${sourceLinks(r.dateSources)}<div class="reign-years">${years.filter(y=>r.start<=y&&y<=r.end).map(yearLink).join('')}</div></section>`).join('')}</div><section class="person-sources"><h2>出处与阅读</h2><p class="reference">${esc(p.reference)}</p>${sourceLinks(p.sources)}</section></article>`;
  }
  function renderSources(){
    document.title='史料与方法 · 双帝国纪年 · FASTI';const m=data.method;
    main.innerHTML=`<article class="sources-page"><a class="back-link" href="#">← 双帝国纪年</a><p class="eyebrow">AD FONTES · 史料与方法</p><h1>让每一条纪年，<br>都有来处。</h1><p class="page-intro">${data.stats.years}个年度 · ${data.stats.events}条记事 · ${data.stats.sources}个来源入口<br>资料核对日期：${m.updated}</p>${[['范围',m.scope],['收录与身份',m.inclusion],['年份、共治与精度',m.chronology],['年度事件',m.annualEvents],['姓名',m.names],['王朝与家族',m.dynasties],['证据范围',m.evidence],['作者立场',m.bias]].map(([h,t])=>`<section><h2>${h}</h2><p>${esc(t)}</p></section>`).join('')}<details class="reading-method"><summary>年度与人物的阅读说明</summary><p>以下为本年内曾持有的帝号。交接年可同时列先帝、继帝与共帝；先后与承认关系见任期。人物总数含辅栏，不等于正式皇帝人数。</p></details><section><h2>关键取舍</h2><ul>${m.decisions.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section><section><h2>没有自动写成皇帝的名字</h2><ul>${m.excluded.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section><section><h2>地图与许可</h2><p>${esc(m.maps)}</p><p>${esc(m.license)}</p></section><section><h2>完整来源目录</h2><ol class="source-catalog">${Object.entries(data.sources).map(([id,s])=>`<li id="source-${id}"><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a><p>${esc(s.kind)} · ${esc(s.note)}</p></li>`).join('')}</ol></section>${downloads()}</article>`;bindDownloads();
  }
  async function json(url){const response=await fetch(url);if(!response.ok)throw Error('资料请求失败');return response.json();}
  async function drawMap(y){
    const token=generation;
    try{
      mapPromise ||= Promise.all([json('../shared/assets/land-50m.json'),json('../data/divided-empire/places.json'),json('../data/divided-empire/territories.json')]).then(([topo,p,maps])=>{if(!window.d3||!window.topojson)throw Error('地图组件未载入');land=topojson.feature(topo,topo.objects.land);places=p;mapData=maps;});await mapPromise;if(token!==generation)return;
      $('#places-map').innerHTML='<svg id="places-svg" viewBox="0 0 1000 480" role="img" aria-label="地中海东西罗马疆域阶段及相关城市位置参考"><rect class="map-ocean" width="1000" height="480"/><g id="map-content"></g></svg><div class="map-bottomline"><span><i class="west-dot"></i>西部参照　<i class="east-dot"></i>东部参照</span><div><button id="map-in" aria-label="放大地图">＋</button><button id="map-out" aria-label="缩小地图">−</button><button id="map-reset" aria-label="重置地图">⌖</button></div></div>';
      const svg=d3.select('#places-svg'),content=svg.select('#map-content'),projection=d3.geoMercator().center([19,38]).scale(920).translate([500,270]),path=d3.geoPath(projection);
      content.append('path').datum(land).attr('d',path).attr('class','map-land');
      const features=mapData.features.filter(f=>f.properties.from<=y&&y<=f.properties.to);
      for(const f of features)content.append('path').datum(f).attr('d',path).attr('class','map-territory map-territory-'+f.properties.side).append('title').text(f.properties.label);
      $('#map-stages').textContent=features.map(f=>f.properties.label).join('；')+'。476年的西部是退位前的阶段参考，不表示尼波斯流亡宫廷的全部有效控制范围。';
      for(const p of places){const [x,y]=projection(p.coord),g=content.append('g').attr('class','map-place '+p.side);g.append('circle').attr('cx',x).attr('cy',y).attr('r',p.id==='constantinople'||p.id==='ravenna'?5:3);g.append('text').attr('x',x+7).attr('y',y+(p.id==='ravenna'?14:-7)).text(p.zh);g.append('title').text(p.zh+' · '+p.latin+'；位置示意，不代表本年控制权');}
      const zoom=d3.zoom().scaleExtent([1,5]).extent([[0,0],[1000,480]]).translateExtent([[-500,-240],[1500,720]]).on('zoom',e=>content.attr('transform',e.transform));svg.call(zoom);
      $('#map-in').onclick=()=>svg.call(zoom.scaleBy,1.4);$('#map-out').onclick=()=>svg.call(zoom.scaleBy,1/1.4);$('#map-reset').onclick=()=>svg.call(zoom.transform,d3.zoomIdentity);
    }catch{if(token!==generation)return;mapPromise=null;$('#places-map').innerHTML='<p class="initial-status" role="status">地图暂时无法载入。<button id="retry-map">重试地图 ↗</button></p>';$('#retry-map').onclick=()=>drawMap(y);}
  }
  function randomYear(){location.hash=`year=${395+Math.floor(Math.random()*82)}`;}
  function invalid(text){document.title='地址提示 · FASTI';main.innerHTML=`<section class="invalid-page"><p class="empty-state" role="alert">${esc(text)}</p><a href="#">返回双帝国纪年 ↗</a></section>`;}
  function route(){
    generation++;if(!data)return;const raw=location.hash.slice(1),p=new URLSearchParams(raw);
    if(!raw)renderHome();else if(p.has('year')){const s=p.get('year');if(/^\d+$/.test(s)&&data.years[Number(s)])renderYear(Number(s));else invalid('请输入395—476之间的整数年份。');}
    else if(p.has('person'))renderPerson(p.get('person'));else if(p.has('people'))renderDirectory();else if(p.has('sources'))renderSources();else invalid('此地址不在数据库中。');
    window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true});
  }
  async function load(){try{data=await json('../data/divided-empire/records.json');route();}catch{main.innerHTML='<p class="initial-status" role="alert">档案载入失败。<button id="retry-data">重新载入 ↗</button></p>';$('#retry-data').onclick=load;}}
  $('#theme-button').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('fasti-theme',t);}catch{}};
  window.addEventListener('hashchange',route);load();
})();
