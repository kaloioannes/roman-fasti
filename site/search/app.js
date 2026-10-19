'use strict';
(() => {
  const $ = s => document.querySelector(s), E = window.FastiSearch;
  const labels = {person:'人物',event:'事件',story:'剧本',chapter:'章节',place:'地点'};
  let index, entries, pending, version=0;
  const limits = new Map();
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  // Map normalized characters to original code point boundaries: Greek accents,
  // ligatures and full-width input can all highlight without injecting HTML.
  function marked(text, query, clip=0) {
    const chars = Array.from(text), normalized=[], positions=[];
    chars.forEach((c,i) => {for (const n of E.normalize(c)) {normalized.push(n);positions.push(i);}});
    const flat = normalized.join(''), hits = new Set();
    for (const term of query.trim().split(/\s+/).map(E.normalize).filter(Boolean)) {
      let from=0, at;
      while ((at=flat.indexOf(term,from)) >= 0) {
        for (let i=positions[at];i<=positions[at+term.length-1];i++) hits.add(i);
        from=at+Math.max(1,term.length);
      }
    }
    const start = clip && chars.length>clip && hits.size ? Math.max(0,Math.min(...hits)-35) : 0;
    const end = clip ? Math.min(chars.length,start+clip) : chars.length;
    const fragment = document.createDocumentFragment();
    if (start) fragment.append('…');
    let buffer='', active=false;
    const flush = () => {if (buffer) fragment.append(active ? el('mark',buffer) : document.createTextNode(buffer));buffer='';};
    for(let i=start;i<end;i++) {const next=hits.has(i);if(next!==active){flush();active=next;}buffer+=chars[i];}
    flush();if(end<chars.length)fragment.append('…');return fragment;
  }
  async function load() {
    if (index) return;
    if (!pending) pending=(async()=>{
      const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
      try {
        const response=await fetch('../data/search/index.json',{signal:controller.signal});
        if(!response.ok)throw new Error('search request failed');
        const value=await response.json();
        if(value.schemaVersion!==1 || !Array.isArray(value.entries) || !Array.isArray(value.periods)
          || !value.periods.length || !value.entries.length
          || !value.periods.every(p=>p&&typeof p.id==='string'&&typeof p.title==='string'&&Number.isInteger(p.start)&&Number.isInteger(p.end))
          || !value.entries.every(e=>e&&typeof e.id==='string'&&typeof e.title==='string'&&typeof e.text==='string'
            && typeof e.note==='string'&&Object.hasOwn(labels,e.kind)&&value.periods.some(p=>p.id===e.period)
            && typeof e.url==='string'&&(e.kind==='event'?e.url.startsWith('events/#event='):e.kind==='place'?e.url.startsWith('places/#place='):e.url.startsWith(e.period+'/#'))&&Array.isArray(e.names)&&e.names.every(n=>typeof n==='string')
            && Array.isArray(e.spans)&&e.spans.every(s=>Array.isArray(s)&&s.length===2&&s.every(Number.isInteger))))throw new Error('invalid search index');
        const prepared=E.prepare(value);
        index=value;entries=prepared;
        const all=el('option','全部五卷');all.value='';$('#period-filter').replaceChildren(all);
        index.periods.forEach(p=>{const option=el('option',p.title);option.value=p.id;$('#period-filter').append(option);});
      } finally {clearTimeout(timer);pending=null;}
    })();
    await pending;
  }
  function state() {
    const p=new URLSearchParams(location.search);
    return {q:(p.get('q')||'').slice(0,160), period:p.get('period')||'', kind:p.get('kind')||''};
  }
  function submit() {
    const p=new URLSearchParams();
    for(const [key,value] of [['q',$('#search-input').value.trim()],['period',$('#period-filter').value],['kind',$('#kind-filter').value]])if(value)p.set(key,value);
    const url=location.pathname+(p.size?'?'+p:'');
    if(url!==location.pathname+location.search)history.pushState(null,'',url);
    limits.clear();render(true);
  }
  function dateLabel(entry) {
    if(!entry.spans.length)return '未定年';
    const a=Math.min(...entry.spans.map(s=>s[0])),b=Math.max(...entry.spans.map(s=>s[1]));
    return a===b?E.when(a):`${E.when(a)}—${E.when(b)}`;
  }
  function yearResults(parsed, period, kind) {
    const target=$('#year-results');target.replaceChildren();target.hidden=!parsed;
    if(!parsed)return;
    target.append(el('h2',parsed.error?'年份需要修正':parsed.ambiguous?'这个数字指哪一个纪元？':'年份入口'));
    if(parsed.error){target.append(el('p',parsed.error));return;}
    if(parsed.ambiguous)target.append(el('p','裸数字不预设纪元；以下分别列出公元与公元前的解释。','year-context'));
    parsed.years.forEach(year=>{
      const row=el('div',null,'year-choice');row.append(el('h3',E.when(year)));
      const all=index.periods.filter(p=>p.start<=year&&year<=p.end);
      const volumes=all.filter(p=>!period||p.id===period);
      if(all.length>1)row.append(el('p','这是分卷交界年；两卷保留各自的资料与叙述。'));
      if(!all.length)row.append(el('p','此纪元解释超出本站收录范围（公元前753年—公元1453年）。'));
      else if(!volumes.length)row.append(el('p','此年份在其他分卷。清除分卷筛选可查看入口。'));
      else if(kind && kind!=='year')row.append(el('p','年度入口已由类型筛选隐藏；下方显示此年的相关资料。'));
      else {
        const nav=el('nav');nav.setAttribute('aria-label',`${E.when(year)}的分卷入口`);
        volumes.forEach(p=>{const link=el('a',`${p.title} · ${E.when(year)} →`);link.href='../'+E.yearURL(p.id,year);nav.append(link);});row.append(nav);
        const adjacent=el('nav');adjacent.setAttribute('aria-label',`${E.when(year)}的相邻年份`);
        for(const [y,label] of [[year===1?-1:year-1,'上一年'],[year===-1?1:year+1,'下一年']]) {
          if(!index.periods.some(p=>p.start<=y&&y<=p.end))continue;
          const link=el('a',`${label} · ${E.when(y)}`);link.href='?'+new URLSearchParams({q:E.when(y)});adjacent.append(link);
        }
        row.append(adjacent);
      }
      target.append(row);
    });
  }
  async function render(focus=false) {
    const current=++version,s=state();
    $('#search-input').value=s.q;$('#retry-search').hidden=true;
    document.title=s.q?`${s.q} · 搜索五卷 · FASTI`:'搜索五卷 · FASTI 罗马历史纪年';
    $('#search-status').textContent='正在载入检索资料…';$('#search-results').replaceChildren();$('#year-results').hidden=true;
    $('#search-results').setAttribute('aria-busy','true');
    try {
      await load();if(current!==version)return;
      $('#period-filter').value=s.period;$('#kind-filter').value=s.kind;
      const badFilter=(s.period&&!index.periods.some(p=>p.id===s.period)) || (s.kind&&!['year',...Object.keys(labels)].includes(s.kind));
      if(badFilter){$('#search-status').textContent='链接中的筛选条件无法识别。请选择已有分卷或类型，或清空条件。';return;}
      if(!s.q.trim()){$('#search-status').textContent='输入名字或年份，搜索五卷已收录的资料。';return;}
      const parsed=E.parseYear(s.q);yearResults(parsed,s.period,s.kind);
      const found=parsed?.error?[]:s.kind==='year'?[]:E.search(entries,s.q,{period:s.period,kind:s.kind,years:parsed?.years});
      const validYears=parsed?.years?.filter(y=>index.periods.some(p=>(!s.period||p.id===s.period)&&p.start<=y&&y<=p.end))||[];
      $('#search-status').textContent=parsed?.error?'请修正年份后继续。':found.length||validYears.length?`找到 ${found.length} 条${parsed?'相关资料':''}结果${validYears.length?`，${validYears.length} 个已收录年份解释`:''}。按类型排列，人物与事件仍按原卷保留。`:'没有找到匹配资料。试试较短的姓名、其他译名，或清除筛选；本次未命中不表示历史上不存在该人物或事件。';
      const effectiveQuery=parsed?'':s.q;
      for(const [kind,label] of Object.entries(labels)) {
        const rows=found.filter(e=>e.kind===kind);if(!rows.length)continue;
        const section=el('section',null,'result-group');section.dataset.kind=kind;
        const heading=el('h2',label);heading.append(el('span',`${rows.length}条`));section.append(heading);
        const count=limits.get(kind)||12;
        rows.slice(0,count).forEach(entry=>{
          const article=el('article',null,'search-result');article.dataset.id=entry.id;
          const meta=el('p',null,'result-meta');meta.append(el('span',index.periods.find(p=>p.id===entry.period).title),el('span',dateLabel(entry)));article.append(meta);
          const h=el('h3'),a=el('a');a.href='../'+entry.url;a.append(marked(entry.title,effectiveQuery));h.append(a);article.append(h);
          if(entry.names.length){const names=el('p',null,'result-names');names.append(marked(entry.names.join(' · '),effectiveQuery,150));article.append(names);}
          const snippet=el('p',null,'result-snippet');snippet.append(marked(entry.text,effectiveQuery,170));article.append(snippet,el('p',entry.note,'result-note'));
          if(entry.kind==='person' && /^people\/#person=[a-z0-9-]+$/.test(entry.globalURL||'')){
            const identity=el('a','本人的跨卷总档案 ↗','identity-search-link');identity.href='../'+entry.globalURL;article.append(identity);
          }
          section.append(article);
        });
        if(rows.length>count){const more=el('button',`再显示${Math.min(24,rows.length-count)}条${label}（余${rows.length-count}条）`,'more-results');more.onclick=()=>{limits.set(kind,count+24);render().then(()=>{const group=$(`[data-kind="${kind}"]`);const next=group?.querySelectorAll('.search-result h3 a')[count];next?.focus();});};section.append(more);}
        $('#search-results').append(section);
      }
    } catch {
      if(current!==version)return;
      $('#search-status').textContent='检索资料载入失败或超时。请检查网络后重试；也可返回五卷目录继续阅读。';$('#retry-search').hidden=false;
    } finally {
      if(current===version){$('#search-results').setAttribute('aria-busy','false');if(focus){$('#search-status').tabIndex=-1;$('#search-status').focus({preventScroll:true});}}
    }
  }
  $('#search-form').onsubmit=e=>{e.preventDefault();submit();};
  for(const id of ['period-filter','kind-filter'])$('#'+id).onchange=submit;
  $('#clear-search').onclick=()=>{$('#search-input').value='';$('#period-filter').value='';$('#kind-filter').value='';submit();$('#search-input').focus();};
  $('#retry-search').onclick=()=>render(true);
  let hide=false;try{const saved=localStorage.getItem('fasti-search-hide-snippets');hide=saved===null?localStorage.getItem('fasti-spoiler-v2')==='true':saved==='true';}catch{}
  $('#hide-snippets').checked=hide;document.body.classList.toggle('conceal-snippets',hide);
  $('#hide-snippets').onchange=e=>{document.body.classList.toggle('conceal-snippets',e.target.checked);try{localStorage.setItem('fasti-search-hide-snippets',String(e.target.checked));}catch{}};
  $('#theme-button').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;document.querySelector('meta[name="theme-color"]').content=t==='dark'?'#181d1c':'#f8f6f1';try{localStorage.setItem('fasti-theme',t);}catch{}};
  addEventListener('popstate',()=>{limits.clear();render();});render();
})();
