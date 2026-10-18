'use strict';
(() => {
  const main = document.querySelector('#content');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when = year => `前${-year}年`;
  const years = Array.from({length:245}, (_, i) => i - 753);
  let data, landPromise;
  const tenure = p => p.start === null ? '罗慕路斯时期 · 共治起讫未定' : `${when(p.start)}—${when(p.end)} · 传统${p.traditionalYears}年`;
  const links = keys => `<div class="sources">${[...new Set(keys)].map(key => `<a href="${esc(data.sources[key].url)}" target="_blank" rel="noopener">${esc(data.sources[key].label)} ↗</a>`).join('')}</div>`;
  const notice = '<p class="notice">此篇采用传统王表。绝对年与早期王传多不确定；交接年列出先后在位者，不表示全年共治。未定年事迹另列，不当作当年事件。</p>';
  const searchForm = y => `<form class="year-form" id="year-form" novalidate><label for="year-input">公元前 BC</label><input id="year-input" name="year" inputmode="numeric" autocomplete="off" placeholder="753 至 509" value="${y ? -y : ''}" aria-describedby="year-error"><button class="primary" type="submit">查看这一年 ↗</button></form><p id="year-error" class="form-error" role="alert"></p>`;
  function bindSearch() {
    document.querySelector('#year-form').onsubmit = event => {
      event.preventDefault();
      const input = event.currentTarget.elements.year;
      const value = input.value.trim();
      const year = /^-?\d+$/.test(value) ? -Math.abs(Number(value)) : NaN;
      if (!Number.isSafeInteger(year) || !data.years[year]) {
        input.setAttribute('aria-invalid','true');
        document.querySelector('#year-error').textContent = '请输入前753年至前509年的整数年份。';
        return;
      }
      input.removeAttribute('aria-invalid');
      document.querySelector('#year-error').textContent = '';
      location.hash = `year=${year}`;
    };
  }
  function card(p) {
    return `<article class="king-card" data-person="${p.id}"><span class="tag">${esc(p.title)}</span><h3><a href="#person=${p.id}">${esc(p.zh)} ↗</a></h3><div class="latin">${esc(p.latin)}</div><div class="years">${esc(tenure(p))}</div><p>${esc(p.summary)}</p><div class="sources"><a href="#person=${p.id}">完整传记与出处 ↗</a>${p.start === null ? '' : `<a href="#year=${p.start}">进入王期 ↗</a>`}</div></article>`;
  }
  function eventCard(id) {
    const e = data.events[id];
    return `<article class="event" data-event="${id}" data-dating="${e.year === null ? 'undated' : 'traditional'}"><span class="tag">${esc(e.dating)}</span><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p><div class="citation">出处：${esc(e.passage)}</div>${links(e.sources)}</article>`;
  }
  function home() {
    document.title = 'FASTI · 罗马王政时代国王数据库';
    main.innerHTML = `<section><div class="eyebrow">REGES ROMANI · 753—509 BC</div><h1>从建城的传说，<br>读到王政的终章。</h1><p class="intro">沿着每一年，寻找罗马的 Rex。<br>七位传统国王、一位共治者，以及史料能告诉我们的事。</p>${searchForm()}<div class="stats"><div><strong>245</strong><span>年度索引</span></div><div><strong>7 + 1</strong><span>传统七王与共治者</span></div><div><strong>${data.stats.undatedTraditions}</strong><span>任期内未定年记事</span></div></div>${notice}<div class="toolbar"><a href="#year=-753">建城：前753 ↗</a><a href="#year=-716">王位空缺：前716 ↗</a><a href="#year=-509">王政终结：前509 ↗</a><a href="#sources">史料与方法 ↗</a></div><h2>谁在统治罗马？</h2><div class="king-grid">${Object.values(data.people).map(card).join('')}</div><div class="export-actions"><button id="export-years">下载245年年度 CSV</button><button id="export-data">下载完整 JSON</button></div></section>`;
    bindSearch();
    document.querySelector('#export-years').onclick = exportYears;
    document.querySelector('#export-data').onclick = () => download('roman-kingdom','json',JSON.stringify(data,null,2),'application/json');
  }
  // Keep the same regional view and projection for the coast and every place.
  const mapProjection = () => d3.geoMercator().fitExtent([[25,45],[575,380]], {
    type:'MultiPoint', coordinates:[[11.5,41.5],[12.95,42.4]]
  }).clipExtent([[1,35],[599,395]]);
  async function drawBasemap() {
    const svg = document.querySelector('.place-map');
    const status = document.querySelector('.map-status');
    status.textContent = '正在载入地理底图……';
    try {
      landPromise ||= fetch('../shared/assets/land-50m.json').then(response => {
        if (!response.ok) throw new Error('HTTP '+response.status);
        return response.json();
      }).then(topology => topojson.feature(topology,topology.objects.land)).catch(error => {
        landPromise = null;
        throw error;
      });
      const land = await landPromise;
      // A year change may have replaced the SVG while the request was pending.
      if (!svg.isConnected) return;
      const path = d3.geoPath(mapProjection());
      svg.querySelector('.map-geography').innerHTML = `<path class="map-land" d="${path(land)}"/><text class="sea-label" x="75" y="335">第勒尼安海</text>`;
      svg.dataset.basemap = 'ready';
      status.textContent = '';
    } catch {
      if (!svg.isConnected) return;
      svg.dataset.basemap = 'error';
      status.innerHTML = '地理底图暂时无法载入，地点仍可查阅。<button type="button" class="inline-link">重新载入底图 ↗</button>';
      status.querySelector('button').onclick = drawBasemap;
    }
  }
  function map(rulers) {
    const ids = [...new Set(rulers.flatMap(id => data.people[id].places))];
    const places = ids.map(id => data.places[id]);
    // Modern physical geography is context, not a reconstruction of royal borders.
    const projection = mapProjection();
    const width = 600, height = 445;
    const boxes = [];
    const marks = places.map(p => {
      const [px,py] = projection([p.lon,p.lat]);
      // Reserve 24 SVG units per character, including on narrow screens.
      const labelWidth = [...p.zh].reduce((sum,c)=>sum+(/[\u2e80-\uffff]/.test(c)?24:14),0);
      const candidates = [-12,30,-46,64,-80,98].flatMap(dy => [true,false].map(left => {
        const tx=px+(left?-9:9), ty=py+dy;
        return {tx,ty,left,l:left?tx-labelWidth:tx,r:left?tx:tx+labelWidth,t:ty-24,b:ty+4};
      }));
      const label=candidates.find(b=>b.l>=15&&b.r<=585&&b.t>=35&&b.b<=395&&boxes.every(a=>b.l>a.r+6||b.r<a.l-6||b.t>a.b+6||b.b<a.t-6)) || candidates[0];
      boxes.push(label);
      return `<g class="map-place" data-place="${p.id}"><title>${esc(p.zh)}：${esc(p.note)}</title><circle cx="${px}" cy="${py}" r="4"/><text x="${label.tx}" y="${label.ty}" text-anchor="${label.left ? 'end' : 'start'}">${esc(p.zh)}</text></g>`;
    }).join('');
    return `<svg class="place-map" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="map-title map-description"><title id="map-title">本王期叙事关联地点示意</title><desc id="map-description">在现代海陆轮廓上按近似经纬度标出地点；不绘制领土边界。底图不是王政时代海岸线复原，文字说明见下方列表。</desc><rect class="map-ocean" x="1" y="35" width="598" height="360"/><g class="map-geography" aria-hidden="true"></g><text class="compass" x="25" y="28">北 ↑</text><text class="map-latin" x="25" y="420">LOCA · 地点关联，不表示疆域</text>${marks}</svg><p class="map-status citation" role="status"></p><p class="citation">底图：Natural Earth · 现代海岸线，仅作地理参照。<a class="inline-link" href="../THIRD_PARTY.md">数据署名 ↗</a></p><details><summary>地点与位置说明 · ${places.length}处</summary><ul class="place-list">${places.map(p => `<li>${esc(p.zh)} · ${esc(p.latin)}：${esc(p.note)}${links(p.sources)}</li>`).join('')}</ul></details>`;
  }
  function yearPage(y) {
    const record = data.years[y], index = years.indexOf(y);
    document.title = `${when(y)} · 王政纪年 · FASTI`;
    main.innerHTML = `<div class="toolbar"><a href="#">← 王政纪年</a><a href="#people">人物索引 ↗</a><a href="#sources">纪年依据 ↗</a></div>${searchForm(y)}<section class="year-top"><div><div class="eyebrow">REGES · AUC ${record.auc}（依本库建城纪元换算）</div><h1>${-y}<small>BC · 公元前</small></h1></div><div class="year-nav"><button id="previous-year"${index === 0 ? ' disabled' : ''}>← ${index ? when(years[index-1]) : '建城起点'}</button><button id="next-year"${index === 244 ? ' disabled' : ''}>${index < 244 ? when(years[index+1]) : '分卷终点'} →</button></div></section><label for="year-slider" class="sr-only">拖动浏览王政年份</label><input type="range" class="year-range" id="year-slider" min="-753" max="-509" value="${y}" aria-valuetext="${when(y)}"><div class="range-labels"><span>前753年</span><output id="slider-label" for="year-slider">${when(y)}</output><span>前509年</span></div><nav class="period-boundary" data-period-boundary aria-label="相邻时期的年度" hidden></nav>${notice}<div class="year-columns"><section aria-labelledby="rulers-heading"><h2 id="rulers-heading">当年的 Rex · 传统归属</h2>${record.rulers.map(id => card(data.people[id])).join('')}${record.interregnum ? `<article class="king-card" data-interregnum><span class="tag">INTERREGNUM · 王位空缺</span><h3>元老轮流代理王权</h3><p>前716—前715年标示传统一年空位期的两端；并非连续两个完整无王年。各代理人姓名与完整轮次不可恢复。</p>${links(['livy','dion-numa'])}</article>` : ''}${record.rulers.includes('romulus') ? `<p class="notice">本王期另有<a class="inline-link" href="#person=titus-tatius">塔提乌斯共治</a>传统，起讫年未定，不能据此断言本年正在共治。</p>` : ''}</section><section aria-labelledby="places-heading"><h2 id="places-heading">王期相关地点</h2>${map(record.rulers)}</section></div><section id="annual-events"><h2>本年记事</h2><p class="${record.events.length ? 'citation' : 'empty-state'}" data-record-status="${record.status}">${esc(record.note)}</p>${record.events.map(eventCard).join('')}</section><section class="traditions"><h2>任期内事迹 · 未定年</h2><p class="intro">以下仅说明相关国王统治期的叙事背景，不能用作本年发生事件的证据。</p>${record.traditions.map(eventCard).join('') || '<p class="empty-state">没有另列的任期背景。</p>'}</section>`;
    bindSearch();
    drawBasemap();
    FastiPeriods.mount('kingdom',y);
    document.querySelector('#previous-year').onclick = () => {location.hash=`year=${y-1}`;};
    document.querySelector('#next-year').onclick = () => {location.hash=`year=${y+1}`;};
    const slider = document.querySelector('#year-slider');
    slider.oninput = () => {
      const label = when(Number(slider.value));
      document.querySelector('#slider-label').textContent = label;
      slider.setAttribute('aria-valuetext',label);
    };
    slider.onchange = () => {location.hash=`year=${slider.value}`;};
  }
  function peoplePage(params) {
    document.title = '国王与共治者索引 · FASTI';
    const q = params.get('q') || '';
    main.innerHTML = `<div class="toolbar"><a href="#">← 王政纪年</a></div><div class="eyebrow">PROSOPOGRAPHIA</div><h1>国王与共治者</h1><p class="intro">按中文名、拉丁文名、别名或人物简介检索。共治者单列，七王主序列不变。</p><form id="people-form" class="filter-bar"><label class="sr-only" for="person-query">人物检索</label><input id="person-query" name="q" value="${esc(q)}" placeholder="例如：老塔克文 / Numa / 共治"><button class="primary" type="submit">检索</button></form><p id="person-count" role="status"></p><div id="person-results" class="king-grid"></div>`;
    const draw = query => {
      const found = Object.values(data.people).filter(p => [p.zh,p.latin,...p.aliases,p.summary,p.title].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
      document.querySelector('#person-count').textContent = `${found.length} 位人物`;
      document.querySelector('#person-results').innerHTML = found.map(card).join('') || '<p class="empty-state">未找到符合条件的人物。</p>';
    };
    draw(q);
    document.querySelector('#person-query').oninput = e => draw(e.target.value);
    document.querySelector('#people-form').onsubmit = e => {e.preventDefault();location.hash=`people&q=${encodeURIComponent(e.currentTarget.elements.q.value)}`;};
  }
  function personPage(id) {
    const p = data.people[id];
    if (!p) return invalid('没有找到这位人物。');
    document.title = `${p.zh} · 王政人物档案 · FASTI`;
    const events = Object.values(data.events).filter(e => e.people.includes(id));
    main.innerHTML = `<div class="toolbar"><a href="#people">← 人物索引</a><a href="#">王政纪年 ↗</a></div><article class="bio"><span class="tag">${esc(p.title)}</span><h1>${esc(p.zh)}</h1><div class="latin">${esc(p.latin)}</div><p class="years">${esc(tenure(p))}</p>${p.bio.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}<div class="citation">主要篇章：${id === 'titus-tatius' ? '李维1.13—14；普鲁塔克《罗慕路斯传》19、23' : '见下列相关记事的具体卷章及研究说明。'}</div>${links(p.sources)}${p.start === null ? '<p class="notice">本人物的绝对任期未定；没有为其分配伪精确的逐年在位记录。</p>' : `<p class="notice"><a href="#year=${p.start}">${when(p.start)}继位／建城年 ↗</a> · <a href="#year=${p.end}">${when(p.end)}王期终点 ↗</a></p>`}<h2>相关记事与出处</h2>${events.map(e=>eventCard(e.id)).join('')}</article>`;
  }
  function sourcesPage() {
    document.title = '王政时代史料与方法 · FASTI';
    main.innerHTML = `<div class="toolbar"><a href="#">← 王政纪年</a></div><div class="eyebrow">AD FONTES</div><h1>史料与方法</h1>${data.method.map(m=>`<section class="method-item"><h2>${esc(m.title)}</h2><p>${esc(m.text)}</p></section>`).join('')}<h2>来源目录</h2>${Object.values(data.sources).map(s=>`<article class="method-item"><span class="tag">${esc({ancient:'古代叙事',archaeology:'考古资料',scholarship:'现代研究'}[s.kind])}</span><h3><a class="inline-link" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a></h3><p>${esc(s.author)} · ${esc(s.note)}</p></article>`).join('')}<p class="citation">研究整理：2026-10-18 · 中文叙述：FASTI contributors · CC BY-SA 4.0。链接的现代研究及译本保留原作者与出版者权利。</p><div class="sources"><a href="https://github.com/kaloioannes/roman-fasti/blob/main/data-source/kingdom/RESEARCH.md">完整研究说明与取舍 ↗</a></div>`;
  }
  function invalid(message) {
    document.title = '链接需要修正 · FASTI';
    main.innerHTML = `<h1>链接需要修正</h1><p class="notice" role="alert">${esc(message)}</p><a class="inline-link" href="#">返回王政纪年 ↗</a>`;
  }
  function route() {
    if (!data) return;
    const params = new URLSearchParams(location.hash.slice(1));
    if (params.has('year')) {
      const value = params.get('year'), y = /^-\d+$/.test(value) ? Number(value) : NaN;
      if (!Number.isSafeInteger(y) || !data.years[y]) invalid('年份链接应在 -753 至 -509 之间，例如 #year=-753。');
      else yearPage(y);
    } else if (params.has('person')) personPage(params.get('person'));
    else if (params.has('people')) peoplePage(params);
    else if (params.has('sources')) sourcesPage();
    else if (!location.hash || location.hash === '#' || location.hash === '#content') home();
    else invalid('无法识别的王政篇链接。');
    window.scrollTo(0,0);FastiSearchTarget.mount();
  }
  function download(name, extension, text, type) {
    const url = URL.createObjectURL(new Blob([text],{type}));
    const a = document.createElement('a'); a.href=url; a.download=`${name}.${extension}`; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function exportYears() {
    const quote = s => `"${String(s).replace(/"/g,'""')}"`;
    const rows = [['year_bc','auc','rex_traditional','status','annual_events','note']];
    for (const y of years) {
      const r=data.years[y];
      rows.push([-y,r.auc,r.rulers.map(id=>data.people[id].latin).concat(r.interregnum?['Interregnum (transition)']:[]).join(' / '),r.status,r.events.map(id=>data.events[id].title).join('；'),r.note]);
    }
    download('roman-kingdom-years','csv','\uFEFF'+rows.map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  }
  document.querySelector('#theme-button').onclick = () => {
    const theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme=theme;
    try {localStorage.setItem('fasti-theme',theme);} catch {}
  };
  document.querySelector('.skip-link').onclick = event => {
    event.preventDefault();
    main.focus();
    main.scrollIntoView();
  };
  async function load() {
    main.innerHTML='<p class="initial-status" role="status">正在翻开王政时代的档案……</p>';
    try {
      const response=await fetch('../data/kingdom/records.json');
      if (!response.ok) throw new Error('HTTP '+response.status);
      data=await response.json(); route();
    } catch {
      main.innerHTML='<h1>档案暂时无法载入</h1><p class="notice" role="alert">网络或数据加载失败，请重试。</p><button class="primary" id="retry">重新载入</button>';
      document.querySelector('#retry').onclick=load;
    }
  }
  window.addEventListener('hashchange',route);
  load();
})();
