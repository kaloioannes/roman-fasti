'use strict';
(() => {
  const $ = selector => document.querySelector(selector);
  const main = $('#content');
  const years = Array.from({length: 978}, (_, i) => i + 476);
  const kinds = {central: '主帝与继承主线', junior: '共帝与皇位伙伴', rival: '争位与对立皇帝', regional: '区域政权', disputed: '帝号有争议'};
  const eras = [
    {from:476,to:610,title:'新罗马与再征服',latin:'ΝΕΑ ΡΩΜΗ',text:'从西部宫廷终结，到查士丁尼的法律、远征与瘟疫。',entry:527},
    {from:611,to:867,title:'战争与圣像',latin:'ΕΙΚΩΝ',text:'波斯战争、阿拉伯征服与圣像争论，皇权在危机中重组。',entry:717},
    {from:868,to:1080,title:'紫室与军人皇帝',latin:'ΠΟΡΦΥΡΑ',text:'马其顿皇室、共治将领和十一世纪的继承，名义与实权各有时间。',entry:945},
    {from:1081,to:1204,title:'科穆宁与十字军',latin:'ΚΟΜΝΗΝΟΙ',text:'家族联盟、海上贸易和十字军，直到首都在1204年陷落。',entry:1081},
    {from:1205,to:1261,title:'流亡中的帝国',latin:'ΝΙΚΑΙΑ',text:'尼西亚与其他继承政权并立；1261年重返君士坦丁堡。',entry:1208},
    {from:1262,to:1453,title:'恢复与最后的城墙',latin:'ΠΑΛΑΙΟΛΟΓΟΙ',text:'巴列奥略皇室的复兴、内战、外交与1453年的最后抵抗。',entry:1453}
  ];
  let data, mapData, land, mapFailure = '', currentYear, directoryState = {q: '', kind: '', dynasty: ''};
  let mapGeneration = 0;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const when = y => y < 0 ? `前${-y}年` : `${y}年`;
  const period = (a, b) => `${when(a)} — ${when(b)}`;
  const era = y => eras.find(e => e.from <= y && y <= e.to);
  const badge = kind => `<span class="role-badge" data-kind="${kind}">${kinds[kind]}</span>`;
  const dynastyLabel = p => data.dynasties[p.dynasty].label;
  const dynastyCaption = p => ({dynasty: '王朝', family: '家族', none: '归属'}[data.dynasties[p.dynasty].kind]);
  const dynastyTag = (p, linked = true) => {
    const text = `${dynastyCaption(p)}：${dynastyLabel(p)}`;
    const attrs = `class="dynasty-tag" data-dynasty="${esc(p.dynasty)}"`;
    return linked ? `<a ${attrs} href="#people&dynasty=${encodeURIComponent(p.dynasty)}">${esc(text)} ↗</a>` : `<span ${attrs}>${esc(text)}</span>`;
  };
  const purpleTag = p => p.purple ? `<span class="purple-tag" title="${esc(p.purple.note)}">生于紫室</span>` : '';
  const nativeName = p => `<span lang="${p.nativeName.lang}" class="ruler-greek">${esc(p.nativeName.text)}</span>`;
  const regnalDates = r => `<dl class="regnal-dates"><div><dt>开始</dt><dd>${esc(r.startDate.label)}</dd></div><div><dt>结束</dt><dd>${esc(r.endDate.label)}</dd></div></dl>`;
  const yearLink = y => `<a class="year-chip" href="#year=${y}">${when(y)} ↗</a>`;
  const sourceLinks = keys => `<div class="source-links">${[...new Set(keys)].map(key => {
    const s = data.sources[key];
    return `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a>`;
  }).join('')}</div>`;
  const defaultError = '请输入公元476年至1453年的整数年份。';
  const searchForm = (id, y = '') => `<form id="${id}" class="${id === 'home-form' ? 'empire-search' : ''}" novalidate>
    <label class="sr-only" for="${id}-era">纪元</label><select id="${id}-era" name="era" aria-label="纪元"><option value="AD"${y >= 1 ? ' selected' : ''}>公元 AD</option></select>
    <label class="sr-only" for="${id}-year">年份</label><input id="${id}-year" name="year" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="输入年份，例如 1204" value="${y ? Math.abs(y) : ''}" aria-describedby="year-error">
    <button class="${id === 'home-form' ? 'search-submit' : ''}" type="submit" aria-label="查看这一年">↗</button></form>`;

  function bindYearForm(id) {
    $(`#${id}`).addEventListener('submit', event => {
      event.preventDefault();
      const form = event.currentTarget;
      const value = form.elements.year.value.trim();
      const signed = /^-?\d+$/.test(value) ? Number(value) * (form.elements.era.value === 'BC' && !value.startsWith('-') ? -1 : 1) : NaN;
      if (!Number.isSafeInteger(signed) || !data.years[signed]) {
        $('#year-error').textContent = defaultError;
        form.elements.year.setAttribute('aria-invalid', 'true');
        return;
      }
      form.elements.year.removeAttribute('aria-invalid');
      if (location.hash === `#year=${signed}`) $('#year-error').textContent = '';
      else location.hash = `year=${signed}`;
    });
  }

  function renderHome() {
    const stats = data.stats;
    main.innerHTML = `<div class="home"><section class="home-content">
      <div class="eyebrow"><span class="tiny-rule"></span>AD 476 — 1453<span class="tiny-rule"></span></div>
      <div class="hero-word" aria-hidden="true">ῬΩΜΗ</div><h1>帝国的<span>每一年</span></h1>
      <p class="home-description">从新罗马的宫廷，到最后的城墙。<br>沿着皇帝、共治者与记事，阅读拜占庭的近千年。</p>
      ${searchForm('home-form')}<p id="year-error" class="form-error" role="alert"></p>
      <button class="random-button" id="random-year">⚄ 掷骰子，偶遇一年</button>
      <div class="year-suggestions"><span>从这里开始</span>${[476,527,717,945,1204,1453].map(y => `<button data-year="${y}">${y < 0 ? '前' : ''}${Math.abs(y)}</button>`).join('')}</div>
      <div class="empire-stats"><div><strong>${stats.years}</strong><span>连续年度 · 公元纪年</span></div><div><strong>${stats.people}</strong><span>人物传记 · 含辅栏</span></div><div><strong>${stats.events}</strong><span>独立记事 · 不以背景填充</span></div></div>
      <div class="download-actions"><button id="download-years" class="bio-link">下载年度 CSV ↓</button><button id="download-json" class="bio-link">下载完整 JSON ↓</button></div><a class="stories-jump" href="#people">查找皇帝与争位者 ↗</a>
    </section><section class="stories-section" aria-labelledby="eras-title"><div class="stories-heading"><div><span class="eyebrow">RES GESTAE · 六个时代入口</span><h2 id="eras-title">谁在统治新罗马？</h2></div><p>同年出现，未必全年共治。<br>先看头衔，再读任期与史料。</p></div><div class="story-cards">${eras.map(e => `<a class="story-card" href="#year=${e.entry}"><div class="story-card-top"><span class="era-years">${period(e.from,e.to)}</span><span>↗</span></div><div class="story-card-copy"><h3>${e.title}</h3><p>${e.text}</p></div><div class="story-card-bottom"><span>${e.latin}</span><span>→</span></div></a>`).join('')}</div></section></div>`;
    $('#download-years').onclick = downloadYears;
    $('#download-json').onclick = () => download('byzantine-records' + '.json', JSON.stringify(data,null,2),'application/json');
    bindYearForm('home-form');
    $('#random-year').onclick = randomYear;
    main.querySelectorAll('[data-year]').forEach(button => button.onclick = () => { location.hash = `year=${button.dataset.year}`; });
    document.title = 'FASTI · 拜占庭皇帝数据库';
  }

  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], {type}));
    const link = document.createElement('a'); link.href=url; link.download=name; link.click();
    setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  function downloadYears() {
    const quote = value => '"'+String(value).replaceAll('"','""')+'"';
    const rows = [['公元年','帝位人物与身份','年度记事','资料状态'],...years.map(y => [y,
      data.years[y].rulers.map(r => data.people[r.person].zh+'（'+kinds[data.people[r.person].reigns[r.reign].kind]+'）').join('；'),
      data.years[y].events.map(e=>e.title).join('；'),data.years[y].eventStatus])];
    download('byzantine-years.csv','\ufeff'+rows.map(row=>row.map(quote).join(',')).join('\r\n'),'text/csv;charset=utf-8');
  }
  function rulerCard(person, reign) {
    return `<article class="ruler-card" data-person="${person.id}" data-kind="${reign.kind}"><div class="ruler-card-top">${badge(reign.kind)}<span class="ruler-dates">${esc(reign.certainty)}</span></div>
      <h4><a href="#person=${person.id}">${esc(person.zh)} ↗</a> ${purpleTag(person)}</h4>${nativeName(person)}
      <div class="dynasty-line">${dynastyTag(person)}</div>
      ${regnalDates(reign)}<p class="ruler-territory">${esc(reign.territory)}</p>${sourceLinks(reign.dateSources)}<p class="ruler-note">${esc(reign.note)}</p>
      <details><summary>展开人物介绍</summary>${person.bio.map(p => `<p>${esc(p)}</p>`).join('')}${sourceLinks(person.sources)}<a class="bio-link" href="#person=${person.id}">完整档案与任期 ↗</a></details></article>`;
  }

  function gapNotice(y) {
    const prior = years.filter(n => n < y && data.years[n].events.length).at(-1);
    const next = years.find(n => n > y && data.years[n].events.length);
    return `<div class="empty-year"><h3>本年记事尚待补充</h3><p>已列出本年帝位人物，尚未收录可可靠定位到本年的独立事件。没有条目，不等于没有历史。</p><div class="reign-years">${prior ? yearLink(prior) : ''}${next ? yearLink(next) : ''}</div><p>上方链接指向邻近的有记事年度；不会把跨年背景当成本年发生的大事。</p></div>`;
  }
  function renderYear(y) {
    currentYear = y;
    const record = data.years[y];
    const index = years.indexOf(y);
    const grouped = Object.fromEntries(Object.keys(kinds).map(k => [k, []]));
    for (const item of record.rulers) {
      const person = data.people[item.person], reign = person.reigns[item.reign];
      grouped[reign.kind].push({person, reign});
    }
    const group = kind => grouped[kind].length ? `<section class="role-section" data-group="${kind}"><h3>${kinds[kind]} <small>· ${new Set(grouped[kind].map(x => x.person.id)).size}</small></h3>${grouped[kind].map(x => rulerCard(x.person,x.reign)).join('')}</section>` : '';
    const unique = new Set(record.rulers.map(r => r.person));
    main.innerHTML = `<div class="detail"><div class="empire-toolbar"><a href="#">← 拜占庭纪年</a><a href="#people">人物索引 ↗</a><button id="random-year" aria-label="随机年份">⚄</button>${searchForm('jump-form',y)}</div><p id="year-error" class="form-error" role="alert"></p>
      <section class="year-heading"><div><div class="eyebrow">${era(y).latin} · ${era(y).title}</div><h1>${Math.abs(y)}<small>${y < 0 ? 'BC · 公元前' : 'AD · 公元'}</small></h1><p>${esc(record.events[0]?.title || '本项目尚未收录可定位于本年的独立记事')} · 本年内出现${unique.size}位皇帝／帝位人物</p></div>
      <div class="year-nav"><button id="previous-year" aria-label="上一年"${index === 0 ? ' disabled' : ''}>←<span>${index ? when(years[index-1]) : '起点'}</span></button><button id="next-year" aria-label="下一年"${index === years.length-1 ? ' disabled' : ''}><span>${index < years.length-1 ? when(years[index+1]) : '终点'}</span>→</button></div></section>
      <label class="sr-only" for="year-slider">拖动浏览年份</label><input class="year-range" id="year-slider" type="range" min="0" max="977" value="${index}" aria-valuetext="${when(y)}"><div class="range-labels"><span>476年</span><output for="year-slider" id="slider-label">${when(y)}</output><span>1453年</span></div>
      <nav class="period-boundary" data-period-boundary aria-label="相邻时期的年度" hidden></nav>
      <div class="year-grid"><section class="officials-section" aria-label="当年统治者"><div class="section-title"><h2>当年皇帝与帝位人物</h2><span class="section-caption">ΒΑΣΙΛΕΙΣ</span></div>${['central','junior','rival','regional','disputed'].map(group).join('')}</section>
      <section class="territory-section"><div class="section-title"><h2>帝国与政治据点</h2><span class="section-caption">ΤΟΠΟΙ</span></div><div class="map-card" id="imperial-map"><p class="map-failure" role="status">正在载入地图……</p></div><p class="map-caveat" id="map-caption"></p></section></div>
      <section class="events-section"><div class="section-title"><div><span class="eyebrow">ANNVS IN MEMORIA</span><h2>这一年的记事</h2></div></div><label class="event-filter"><input id="dated-only" type="checkbox">仅看纪年明确的年度事件（隐藏约年、传统纪年与异说）</label><div id="annual-events">${!record.events.length ? gapNotice(y) : ''}${record.events.map((event, i) => `<article class="event-row" data-background="${/约年|传统纪年|纪年异说|最迟纪年|拜占庭年换算|文内纪年/.test(event.certainty)}"><div class="event-number">${String(i+1).padStart(2,'0')}</div><div class="event-body"><div class="event-meta">${esc(event.certainty)}</div><h3>${esc(event.title)}</h3><p>${esc(event.description)}</p><div class="event-reference">定位：${esc(event.reference)}</div>${sourceLinks(event.sources)}</div></article>`).join('')}</div><p id="no-dated-events" class="empty-state" hidden>本年的记事含约年或纪年差异；取消筛选可查看条目及依据。</p></section>
      <section class="year-sources"><h2>阅读提示</h2><p>具体卷章见每条记事。每年均有独立记事；约年、纪年异说及跨年事件的具体阶段另作标注。争位成功与否不决定是否收录。查看顶部“史料与方法”了解证据标准、日期选择及未收录人物。</p></section></div>`;
    FastiPeriods.mount('byzantine', y);
    bindYearForm('jump-form'); $('#random-year').onclick = randomYear;
    $('#previous-year').onclick = () => { if (index) location.hash = `year=${years[index-1]}`; };
    $('#next-year').onclick = () => { if (index < years.length-1) location.hash = `year=${years[index+1]}`; };
    $('#year-slider').oninput = event => { $('#slider-label').textContent = when(years[Number(event.target.value)]); event.target.setAttribute('aria-valuetext', $('#slider-label').textContent); };
    $('#year-slider').onchange = event => { location.hash = `year=${years[Number(event.target.value)]}`; };
    $('#dated-only').onchange = event => {
      let shown = 0;
      main.querySelectorAll('.event-row').forEach(row => { row.hidden = event.target.checked && row.dataset.background === 'true'; if (!row.hidden) shown++; });
      $('#no-dated-events').hidden = shown !== 0;
    };
    document.title = `${when(y)} · 拜占庭皇帝纪年 · FASTI`;
    drawMap(y);
  }

  function renderDirectory() {
    const params = new URLSearchParams(location.hash.slice(1));
    directoryState = {q: params.get('q') || '', kind: params.get('kind') || '', dynasty: params.get('dynasty') || ''};
    // Preserve shared links from the previous combined era/dynasty filter.
    if (directoryState.dynasty && !data.dynasties[directoryState.dynasty]) {
      const previous = directoryState.dynasty;
      const matching = Object.entries(data.dynasties).find(([,d]) => d.label === previous);
      if (matching) directoryState.dynasty = matching[0];
    }
    const legacyLabels = {'科穆宁家族':'komnenos','杜卡斯家族':'doukas','拉斯卡里斯家族':'laskaris','尼基弗鲁斯家族':'nikephorian','利奥皇室':'leonid','科穆宁·杜卡斯家族':'komnenos-doukas','vatatzes':'laskaris','瓦塔齐斯家族':'laskaris'};
    directoryState.dynasty = legacyLabels[directoryState.dynasty] || directoryState.dynasty;
    const dynasties = Object.entries(data.dynasties);
    const legacyEra = directoryState.dynasty;
    if (legacyEra && !data.dynasties[legacyEra] && Object.values(data.people).some(p => p.era === legacyEra)) {
      dynasties.push([legacyEra, {label: `时代／政权：${legacyEra}`}]);
    }
    main.innerHTML = `<section class="directory"><div class="empire-toolbar"><a href="#">← 拜占庭纪年</a></div><div class="eyebrow">PROSOPOGRAPHIA · 人物索引</div><h1>帝位上的许多人</h1><p class="directory-intro">按中文、拉丁文、希腊文、别名、王朝或时代查找。每位人物都有独立传记。索引包含皇帝、帝号有争议者、共帝及选录的区域皇帝，人物总数不是正式主帝总数。</p><p class="person-notice">王朝与短期政治家族分别标明；尼西亚与拉丁帝国是不同政权。共帝不自动拥有与主帝同等的实权。生于紫室标签采用逐人确认，未标记不代表否定。</p>
      <div class="directory-tools"><label><span class="sr-only">搜索人物</span><input id="person-search" type="search" placeholder="姓名、王朝或时代，例如 君士坦丁" value="${esc(directoryState.q)}"></label><label><span class="sr-only">身份</span><select id="kind-filter"><option value="">全部身份</option>${Object.entries(kinds).map(([k,v]) => `<option value="${k}"${directoryState.kind === k ? ' selected' : ''}>${v}</option>`).join('')}</select></label><label><span class="sr-only">王朝或家族</span><select id="dynasty-filter"><option value="">全部王朝与家族</option>${dynasties.map(([id,d]) => `<option value="${esc(id)}"${directoryState.dynasty === id ? ' selected' : ''}>${esc(d.label)}</option>`).join('')}</select></label></div>
      <label class="event-filter"><input id="purple-only" type="checkbox">仅看已确认的生于紫室人物</label><p class="directory-count" id="directory-count" role="status"></p><div id="directory-results" class="directory-grid"></div></section>`;
    const update = () => {
      directoryState = {q: $('#person-search').value, kind: $('#kind-filter').value, dynasty: $('#dynasty-filter').value};
      const p = new URLSearchParams('people');
      for (const [k,v] of Object.entries(directoryState)) if (v) p.set(k,v);
      if ($('#purple-only').checked) p.set('purple','1');
      history.replaceState(null,'',`#${p.toString().replace('people=','people')}`);
      updateDirectory();
    };
    $('#purple-only').checked = params.get('purple') === '1';
    $('#purple-only').onchange = update;
    $('#person-search').oninput = update; $('#kind-filter').onchange = update; $('#dynasty-filter').onchange = update;
    updateDirectory(); document.title = '人物索引 · 拜占庭皇帝 · FASTI';
  }

  function updateDirectory() {
    const {q,kind,dynasty} = directoryState;
    const normalize = value => value.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const query = normalize(q.trim());
    const results = Object.values(data.people).filter(p => (!$('#purple-only').checked || p.purple) && (!query || `${p.zh} ${p.nativeName.text} ${p.greek} ${p.aliases} ${dynastyLabel(p)} ${p.era}`.toLocaleLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').includes(query)) && (!kind || p.reigns.some(r => r.kind === kind)) && (!dynasty || p.dynasty === dynasty || p.era === dynasty)).sort((a,b) => Math.min(...a.reigns.map(r => r.start))-Math.min(...b.reigns.map(r => r.start)) || a.id.localeCompare(b.id));
    $('#directory-count').textContent = `找到 ${results.length} / ${data.stats.people} 位人物`;
    $('#directory-results').innerHTML = results.length ? results.map(p => {
      const rs = p.reigns;
      return `<a href="#person=${p.id}" class="person-card"><div>${[...new Set(rs.map(r => r.kind))].map(badge).join(' ')}</div><h2>${esc(p.zh)} ${purpleTag(p)}</h2>${nativeName(p)}<div class="dynasty-line">${dynastyTag(p,false)}</div><p class="person-period">${period(Math.min(...rs.map(r => r.start)),Math.max(...rs.map(r => r.end)))}</p><p class="ruler-note">时代／政权：${esc(p.era)}${rs.length > 1 ? ' · 多段任期，详见档案' : ''}</p></a>`;
    }).join('') : '<p class="empty-state">没有匹配人物。可缩短关键词，或将身份、王朝与家族改为全部。</p>';
  }

  function renderPerson(id) {
    const p = data.people[id];
    if (!p) return renderInvalid('没有找到这位人物。可返回人物索引查找。');
    const rs = [...p.reigns].sort((a,b) => a.start-b.start);
    const links = years.filter(y => rs.some(r => r.start <= y && y <= r.end));
    main.innerHTML = `<article class="person-page"><div class="empire-toolbar"><a href="#people">← 人物索引</a><a href="#">拜占庭纪年</a>${currentYear ? `<a href="#year=${currentYear}">返回${when(currentYear)}</a>` : ''}</div>
      <header class="person-heading"><div class="eyebrow">人物档案 · ${esc(p.era)}</div><h1>${esc(p.zh)} ${purpleTag(p)}</h1>${nativeName(p)}<div class="dynasty-line">${dynastyTag(p)}</div><p class="dynasty-note">${esc(data.dynasties[p.dynasty].note)}${p.dynastyNote ? ` ${esc(p.dynastyNote)}` : ''}</p>${sourceLinks(data.dynasties[p.dynasty].sources)}<p class="person-notice">别名／检索词：${esc(p.aliases)}</p></header>
      ${p.purple ? `<section class="purple-evidence"><h2>生于紫室 · 称号依据</h2><p>${esc(p.purple.note)}</p>${sourceLinks(p.purple.sources)}</section>` : '<p class="person-notice">紫室身份：本项目尚未确认。未加标签不表示否定。</p>'}
      <div class="person-body">${p.bio.map(paragraph => `<p>${esc(paragraph)}</p>`).join('')}</div>
      <p class="person-notice">${esc(p.nativeName.note)}</p>${sourceLinks(p.nativeName.sources)}<h2>称号与任期</h2><p class="person-notice">任期不同阶段分列；约年窗口不代表已证实在窗口中持续在位。完整生涯可超出本卷1453年的终点。</p><ul class="reign-list">${rs.map(r => `<li><strong>${esc(r.tenure)}</strong>${badge(r.kind)}${regnalDates(r)}${sourceLinks(r.dateSources)}<p>${esc(r.territory)} · ${esc(r.certainty)}<br>${esc(r.note)}</p><div class="reign-years">${yearLink(Math.max(476,r.start))}${r.end !== r.start ? yearLink(Math.min(1453,r.end)) : ''}</div></li>`).join('')}</ul>
      <h2>史料与研究</h2><p class="event-reference">定位：${esc(p.reference)}</p>${sourceLinks(p.sources)}<p class="person-notice">古代叙事的偏见、钱币证据及现代日期选择，见“史料与方法”。未确知的生年、死因及施政不以传闻补齐。</p>
      <details><summary class="bio-link">浏览本卷中的全部相关年度 · ${links.length}年</summary><div class="reign-years">${links.map(yearLink).join('')}</div></details></article>`;
    document.title = `${p.zh} · 人物档案 · FASTI`;
  }

  function renderInvalid(message) {
    main.innerHTML = `<section class="directory"><h1>找不到这页档案</h1><p class="empty-state" role="alert">${esc(message)}</p><div class="reign-years"><a class="year-chip" href="#">返回首页</a><a class="year-chip" href="#people">人物索引</a>${yearLink(476)}</div></section>`;
    document.title = '档案地址有误 · FASTI';
  }

  function route() {
    mapGeneration++;
    if (!data) return;
    const raw = location.hash.slice(1), params = new URLSearchParams(raw);
    if (!raw) renderHome();
    else if (params.has('year')) {
      const text = params.get('year');
      if (/^-?\d+$/.test(text) && data.years[Number(text)]) renderYear(Number(text));
      else renderInvalid(defaultError);
    } else if (params.has('person')) renderPerson(params.get('person'));
    else if (params.has('people')) renderDirectory();
    else renderInvalid('此地址不在数据库中。年份格式示例：#year=476 或 #year=1453。');
    window.scrollTo({top:0,behavior:'instant'});FastiSearchTarget.mount();
    main.focus({preventScroll:true});
  }

  function randomYear() { location.hash = `year=${years[Math.floor(Math.random()*years.length)]}`; }

  let mapPromise;
  async function drawMap(y) {
    const generation = mapGeneration;
    try {
      mapPromise ||= Promise.all([json('../shared/assets/land-50m.json'), json('../data/byzantine/territories.json')]).then(([topo, maps]) => {
        if (!window.d3 || !window.topojson) throw new Error('地图绘图库未能载入');
        land = topojson.feature(topo, topo.objects.land); mapData = maps;
      });
      await mapPromise;
      if (generation !== mapGeneration) return;
      const features = mapData.features.filter(f => f.properties.from <= y && y <= f.properties.to);
      if (!features.length) throw new Error('本年缺少地图重建阶段');
      $('#imperial-map').innerHTML = `<div class="map-topline"><span><i class="territory-key"></i> 拜占庭与并立政权</span><span>${when(y)}</span></div><svg class="empire-map" id="empire-map-svg" viewBox="0 0 760 510" role="img" aria-label="${when(y)}拜占庭及并立政权参考地图"><defs><clipPath id="imperial-map-clip"><rect width="760" height="510"/></clipPath></defs><rect width="760" height="510" class="map-ocean"/><g clip-path="url(#imperial-map-clip)"><g id="imperial-map-content"></g></g></svg><div class="map-legend"><span><i></i>主要政治据点</span><span class="legend-byzantine">● 拜占庭／东罗马</span><span class="legend-nicaea">● 尼西亚</span><span class="legend-latin">● 拉丁帝国</span><span class="legend-trebizond">● 特拉比松</span></div><div class="map-bottomline"><span>拖动／双指缩放</span><div><button id="map-zoom-in" aria-label="放大地图">＋</button><button id="map-zoom-out" aria-label="缩小地图">−</button><button id="map-reset" aria-label="重置地图">⌖</button></div></div>`;
      const svg = d3.select('#empire-map-svg'), content = svg.select('#imperial-map-content');
      const projection = d3.geoMercator().center([28,38]).scale(650).translate([380,260]);
      const path = d3.geoPath(projection);
      content.append('path').datum(land).attr('d',path).attr('class','map-land');
      for (const feature of features) content.append('path').datum(feature).attr('d',path).attr('class',`empire-territory polity-${feature.properties.polity}`).append('title').text(feature.properties.label);
      const places = [{name:'君士坦丁堡',coord:[28.98,41.01]},{name:'尼西亚',coord:[29.72,40.43]},{name:'塞萨洛尼基',coord:[22.94,40.64]}];
      if (y < 645) places.push({name:'亚历山大里亚',coord:[29.9,31.2]});
      if (y >= 1204) places.push({name:'特拉比松',coord:[39.72,41.0]});
      if (y >= 1261) places.push({name:'米斯特拉',coord:[22.38,37.07]});
      for (const place of places) {
        const [x,z] = projection(place.coord);
        content.append('circle').attr('cx',x).attr('cy',z).attr('r',3.5).attr('class','map-place');
        content.append('text').attr('x',x+7).attr('y',z-7).text(place.name);
      }
      const sea = projection([15,34]); content.append('text').attr('x',sea[0]).attr('y',sea[1]).attr('class','map-water-label').attr('text-anchor','middle').text('ΜΕΣΟΓΕΙΟΣ');
      const zoom = d3.zoom().scaleExtent([1,6]).translateExtent([[-300,-200],[1060,710]]).extent([[0,0],[760,510]]).on('zoom',event => content.attr('transform',event.transform));
      svg.call(zoom);
      $('#map-zoom-in').onclick = () => svg.call(zoom.scaleBy,1.4);
      $('#map-zoom-out').onclick = () => svg.call(zoom.scaleBy,1/1.4);
      $('#map-reset').onclick = () => svg.call(zoom.transform,d3.zoomIdentity);
      $('#map-caption').textContent = `${features.map(f => f.properties.caption).join(' ')} 底色仅示地理。各政权分色，阶段图不是逐年调查或承认关系。1453年显示城陷前参考，源阶段不表示首都存续至1467年。地图：Cliopatria / Seshat（CC BY 4.0）；底图：Natural Earth。`;
    } catch (error) {
      if (generation !== mapGeneration) return;
      mapFailure = error.message;
      $('#imperial-map').innerHTML = `<p class="map-failure" role="status">地图暂时无法载入。年表、人物与来源仍可阅读。<br><button class="bio-link" id="retry-map">重试地图 ↗</button></p>`;
      $('#map-caption').textContent = mapFailure;
      $('#retry-map').onclick = () => { mapPromise = null; drawMap(y); };
    }
  }

  function fillMethod() {
    const m = data.method;
    const paragraphs = [['范围',m.scope],['收录标准',m.inclusion],['王朝、家族与时代',m.dynasties],['如何读年份与任期',m.chronology],['逐年记事的证据密度',m.annualEvents],['原名语言',m.names],['生于紫室的依据',m.purple],['证据与史料立场',m.evidence],['阅读古代作者',m.bias]];
    $('#method-content').innerHTML = `<div class="stats-line"><div><strong>${data.stats.years}</strong><span>年度</span></div><div><strong>${data.stats.people}</strong><span>人物（含辅栏）</span></div><div><strong>${Object.keys(data.sources).length}</strong><span>来源入口</span></div></div>${paragraphs.map(([title,body]) => `<h3>${title}</h3><p>${esc(body)}</p>`).join('')}<details class="reading-method"><summary>年度与人物的阅读说明</summary><p>以下记录的是本年内的在位或称号阶段。换帝年的先后、同时共治及不确定日期，请看各人的任期说明；人物完整传记会涉及其后生涯。</p></details><h3>重要日期与争议处理</h3><ul>${m.decisions.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h3>未自动列入的名字</h3><ul>${m.excluded.map(x => `<li>${esc(x)}</li>`).join('')}</ul><h3>地图与许可</h3><p>${esc(m.maps)}</p><p>${esc(m.license)}</p><p>资料核对日期：${m.updated}。本数据库可持续校订，欢迎携卷章、铭文或钱币证据提交修正。</p><details><summary>展开完整来源目录 · ${Object.keys(data.sources).length}项</summary><ol class="method-source-list">${Object.values(data.sources).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} ↗</a><br>${esc(s.kind)} · ${esc(s.note)}</li>`).join('')}</ol></details>`;
  }

  async function json(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`资料请求失败（${response.status}）`);
    return response.json();
  }
  async function load() {
    try {
      data = await json('../data/byzantine/records.json'); fillMethod(); route();
    } catch {
      main.innerHTML = '<p class="initial-status" role="alert">档案载入失败，请检查网络后重试。<br><button class="bio-link" id="retry-data">重新载入 ↗</button></p>';
      $('#retry-data').onclick = load;
    }
  }
  $('#sources-button').onclick = () => {
    if (!data) $('#method-content').innerHTML = '<p>数据尚未载入，请稍后重试。</p>';
    $('#sources-dialog').showModal();
  };
  $('#close-sources').onclick = () => $('#sources-dialog').close();
  $('#sources-dialog').addEventListener('click',event => { if (event.target === event.currentTarget && (event.clientX < event.currentTarget.getBoundingClientRect().left || event.clientX > event.currentTarget.getBoundingClientRect().right || event.clientY < event.currentTarget.getBoundingClientRect().top || event.clientY > event.currentTarget.getBoundingClientRect().bottom)) event.currentTarget.close(); });
  $('#theme-button').onclick = () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('fasti-theme',next); } catch {}
  };
  window.addEventListener('hashchange',route);
  load();
})();
