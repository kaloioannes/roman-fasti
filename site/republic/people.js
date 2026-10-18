'use strict';
// View adapter only: all careers point back to existing annual memberships.
window.FastiRepublicPeople = (() => {
  const host = () => document.querySelector('#people-view');
  const normalize = s => String(s).normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\bj(?=[a-z])/g, 'i').replace(/\s+/g, ' ').trim();
  const pageSize = 36;
  let data, index, helpers, lastList = '#people';
  const el = (tag, text, cls) => {const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const a = (text, href) => {const n=el('a',text);n.href=href;return n;};
  const appendHTML = (node, html) => {const template=document.createElement('template');template.innerHTML=html;node.append(template.content);};
  const personURL = (pid, list=lastList) => '#person='+encodeURIComponent(pid)+(list==='#people'?'':'&list='+encodeURIComponent(list.slice(1)));
  const statusLabels = {authored:'有编写简介', 'office-summary':'任职摘要', insufficient:'身份待考'};
  function valid(value, records) {
    if(value?.schemaVersion!==1||!value.people||!value.redirects||!Array.isArray(value.candidates)||!Array.isArray(value.unidentified))return false;
    if(Object.keys(value.people).length!==Object.keys(records.people).length)return false;
    const sourceRefs=new Set();
    for(const [pid,p] of Object.entries(value.people)){
      if(!records.people[pid]||!Array.isArray(p.names)||!p.names.every(n=>typeof n==='string')||!p.dateLabel||!p.distinction||!Array.isArray(p.sameNames)||!p.sameNames.every(id=>records.people[id]&&id!==pid)||!Array.isArray(p.roles)||!p.roles.length||!Array.isArray(p.years)||!p.years.length||!Array.isArray(p.appointments)||!p.appointments.length)return false;
      const years=[],roles=[];
      for(const ref of p.appointments){
        const office=records.years[ref.year]?.officers[ref.index],key=ref.year+':'+ref.index;
        if(!Number.isInteger(ref.year)||!Number.isInteger(ref.index)||office?.person!==pid||sourceRefs.has(key))return false;
        sourceRefs.add(key);years.push(ref.year);roles.push(office.role);
      }
      if(JSON.stringify([...new Set(years)])!==JSON.stringify(p.years)||JSON.stringify([...new Set(roles)])!==JSON.stringify(p.roles))return false;
    }
    if(sourceRefs.size!==Object.values(records.years).reduce((n,y)=>n+y.officers.length,0))return false;
    return Object.entries(value.redirects).every(([old,row])=>/^p[0-9a-f]{10}$/.test(old)&&!records.people[old]&&records.people[row.person]&&row.note&&Array.isArray(row.sources)&&row.sources.length);
  }
  function card(pid, withStatus=true) {
    const p=data.people[pid],meta=index.people[pid],article=el('article',null,'republic-person-card');article.dataset.person=pid;
    const h=el('h2');h.append(a(p.zh,personURL(pid)));article.append(h);
    const latin=el('p',p.latin,'rp-latin');latin.lang='la';article.append(latin,el('p',meta.distinction,'rp-fine'));
    if(withStatus){
      const tags=el('p',null,'rp-tags');tags.append(el('span',statusLabels[p.bioStatus]));
      if(meta.sameNames.length)tags.append(el('span',`另有${meta.sameNames.length}份同名档案`));article.append(tags);
    }
    return article;
  }
  function readFilters(params){
    const value=(name,allowed,fallback='')=>allowed.includes(params.get(name))?params.get(name):fallback;
    const year=name=>/^\d+$/.test(params.get(name)||'')&&+params.get(name)>=27&&+params.get(name)<=509?params.get(name):'';
    return {q:(params.get('q')||'').slice(0,180),role:value('role',Object.keys(helpers.roles)),status:value('status',Object.keys(statusLabels)),from:year('from'),to:year('to'),same:params.get('same')==='1',repeat:params.get('repeat')==='1',sort:value('sort',['date','name','count'],'date'),page:Math.max(1,Math.min(10000,Number.parseInt(params.get('page'),10)||1))};
  }
  function filterHash(f){
    const params=new URLSearchParams();
    for(const key of ['q','role','status','from','to'])if(f[key])params.set(key,f[key]);
    for(const key of ['same','repeat'])if(f[key])params.set(key,'1');
    if(f.sort!=='date')params.set('sort',f.sort);if(f.page>1)params.set('page',f.page);
    return '#people'+(params.size?'&'+params:'');
  }
  function results(f){
    const terms=normalize(f.q).split(' ').filter(Boolean);
    return Object.keys(index.people).filter(pid=>{
      const p=data.people[pid],meta=index.people[pid],text=normalize([p.zh,...meta.names,pid].join(' '));
      return terms.every(t=>text.includes(t))&&(!f.role||meta.roles.includes(f.role))&&(!f.status||p.bioStatus===f.status)&&(!f.same||meta.sameNames.length)&&(!f.repeat||meta.appointments.length>1)
        &&meta.appointments.some(ref=>(!f.from||ref.year<=+f.from)&&(!f.to||ref.year>=+f.to)&&(!f.role||data.years[ref.year].officers[ref.index].role===f.role));
    }).sort((a,b)=>{
      const exact=pid=>f.q&&[data.people[pid].zh,...index.people[pid].names,pid].some(n=>normalize(n)===normalize(f.q))?1:0;
      return exact(b)-exact(a)||(f.sort==='name'?data.people[a].latin.localeCompare(data.people[b].latin,'en')||a.localeCompare(b):f.sort==='count'?index.people[b].appointments.length-index.people[a].appointments.length||a.localeCompare(b):index.people[b].years[0]-index.people[a].years[0]||a.localeCompare(b));
    });
  }
  function directory(params){
    const view=host(),f=readFilters(params);
    view.append(el('p','PERSONAE · 罗马共和国','eyebrow'),el('h1','从一个名字，读一段生涯。'),el('p',`${data.stats.people}份人物档案，${data.stats.appointments}项已收录任职。按姓名、官职与年代寻找；同名者按各自记录分别保留。`,'rp-intro'));
    const form=el('form',null,'rp-form');form.id='republic-people-form';form.setAttribute('role','search');
    const label=el('label','姓名、原名、别名或人物ID');label.htmlFor='rp-query';const input=el('input');input.id='rp-query';input.type='search';input.maxLength=180;input.autocomplete='off';input.value=f.q;input.placeholder='例如：恺撒 / Julius Caesar / 屋大维';label.append(input);form.append(label);
    function select(name,title,options){const label=el('label',title),s=el('select');s.id='rp-'+name;label.htmlFor=s.id;for(const [v,text] of options){const o=el('option',text);o.value=v;s.append(o);}s.value=f[name];label.append(s);form.append(label);return s;}
    const role=select('role','官职',[['','全部官职'],...Object.entries(helpers.roles)]),status=select('status','资料状态',[['','全部资料状态'],...Object.entries(statusLabels)]);
    const advanced=el('details',null,'rp-advanced');advanced.open=!!(f.from||f.to||f.same||f.repeat||f.sort!=='date');advanced.append(el('summary','年代、同名与排序'));
    const fields=el('div',null,'rp-advanced-fields');
    for(const [name,title] of [['from','最早任年（公元前）'],['to','最晚任年（公元前）']]){const label=el('label',title),n=el('input');n.id='rp-'+name;n.type='number';n.min='27';n.max='509';n.inputMode='numeric';n.value=f[name];label.htmlFor=n.id;label.append(n);fields.append(label);}
    const sort=select('sort','排序',[['date','最早已收录任年'],['name','拉丁姓名'],['count','任职记录最多']]);fields.append(sort.parentElement);
    for(const [name,title] of [['same','只看有同名档案'],['repeat','只看多项任职']]){const label=el('label',null,'rp-check'),n=el('input');n.type='checkbox';n.id='rp-'+name;n.checked=f[name];label.append(n,document.createTextNode(title));fields.append(label);}
    advanced.append(fields,el('p','如前100年至前50年，最早填100，最晚填50。范围内须有实际任职记录；不将任年范围当作连续任期。','rp-fine'));form.append(advanced);
    const controls=el('div',null,'rp-controls'),submit=el('button','查找人物');submit.type='submit';const reset=el('button','清除筛选');reset.type='button';controls.append(submit,reset);form.append(controls);view.append(form);
    const count=el('p',null,'rp-result-count');count.id='rp-result-count';count.setAttribute('role','status');count.setAttribute('aria-live','polite');
    const grid=el('div',null,'rp-grid');grid.id='rp-results';const pages=el('nav',null,'rp-pagination');pages.setAttribute('aria-label','人物结果分页');view.append(count,grid,pages);
    function draw(update=false,focus=false){
      grid.replaceChildren();pages.replaceChildren();
      if(f.from&&f.to&&+f.from<+f.to){lastList=filterHash(f);if(update)history.replaceState(null,'',lastList);count.textContent='年代范围倒置：公元前的最早年份应不小于最晚年份。';return;}
      const ids=results(f),total=Math.max(1,Math.ceil(ids.length/pageSize));f.page=Math.min(f.page,total);lastList=filterHash(f);
      if(update)history.replaceState(null,'',lastList);
      count.textContent=`找到 ${ids.length} / ${data.stats.people} 份档案${ids.length?` · 第 ${f.page} / ${total} 页`:''}`;
      if(!ids.length){grid.append(el('p','没有匹配的人物。可试拉丁姓名、较短的中文名字，或清除官职与年代筛选。','rp-empty'));return;}
      ids.slice((f.page-1)*pageSize,f.page*pageSize).forEach(pid=>grid.append(card(pid)));
      for(const [delta,label] of [[-1,'← 上一页'],[1,'下一页 →']])if(f.page+delta>=1&&f.page+delta<=total)pages.append(a(label,filterHash({...f,page:f.page+delta})));
      if(focus){const h=grid.querySelector('h2 a');h?.focus({preventScroll:true});count.scrollIntoView({block:'start'});}
    }
    function collect(){f.q=input.value;f.role=role.value;f.status=status.value;f.sort=sort.value;for(const n of ['from','to'])f[n]=form.querySelector('#rp-'+n).value;for(const n of ['same','repeat'])f[n]=form.querySelector('#rp-'+n).checked;f.page=1;}
    form.onsubmit=e=>{e.preventDefault();if(!form.reportValidity())return;collect();draw(true,true);};
    input.oninput=()=>{collect();draw(true);};
    for(const n of form.querySelectorAll('select,input:not([type=search])'))n.onchange=()=>{if(!form.checkValidity())return;collect();draw(true);};
    reset.onclick=()=>{location.hash='#people';if(location.hash===lastList){input.value='';Object.assign(f,readFilters(new URLSearchParams()));draw(true);input.focus();}};
    draw();
    const method=el('details',null,'rp-method');method.append(el('summary','如何区分人物与继续校订'),el('p',index.method),el('p','“已有专条身份”表示当前名录识别方式，不是完成史实校勘的保证。编写简介沿用既有出处；没有简介的条目只显示可靠的任职资料，不自动扩写传记。'),a(`查看全部同名候选与${index.unidentified.length}条待考清单 ↗`,'https://github.com/kaloioannes/roman-fasti/blob/main/docs/republic-identity-review.md'));view.append(method);
    document.title='共和国人物索引 · FASTI';
  }
  function dossier(params){
    const view=host(),requested=params.get('person'),redirect=index.redirects[requested],pid=redirect?.person||requested,p=data.people[pid];
    const list=params.get('list');lastList=/^people(?:&|$)/.test(list||'')?'#'+list:'#people';
    const nav=el('nav',null,'rp-dossier-nav');nav.setAttribute('aria-label','人物档案导航');nav.append(a('← 返回人物索引',lastList),a('共和国纪年首页','#'));view.append(nav);
    if(!p){view.append(el('h1','找不到这份人物档案'),el('p','人物ID不存在或链接不完整。可返回人物索引按姓名查找。'));document.title='找不到人物 · FASTI';return;}
    const meta=index.people[pid];view.dataset.person=pid;
    view.append(el('p','PERSONA · 共和国人物档案','eyebrow'),el('h1',p.zh));
    const latin=el('p',p.latin,'rp-person-latin');latin.lang='la';view.append(latin,el('p',meta.distinction,'rp-intro'));
    view.append(el('p',`${pid} · ${p.nameMethod} · ${p.identified?'已有专条身份':'身份待考，按本条目保留任职'}`,'rp-fine'));
    if(redirect){
      const message=el('aside',null,'rp-notice');message.append(el('p',`旧ID ${requested} 已由人工校订迁移至 ${pid}。${redirect.note}`));
      for(const s of redirect.sources){const link=a(s.label+' · '+s.locator+' ↗',s.url);link.target='_blank';link.rel='noopener';message.append(link);}view.append(message);
    }
    const names=[...new Set(meta.names.filter(n=>n!==p.latin&&n!==p.zh))];
    if(names.length){const detail=el('details',null,'rp-names');detail.append(el('summary','别名与原资料标题'),el('p',names.join(' · ')),el('p','名称用于检索；资料标题中的任年仅供消歧，不是生卒日期。','rp-fine'));view.append(detail);}
    const intro=el('section',null,'rp-biography');intro.append(el('h2',p.bioStatus==='authored'?'人物简介':'任职档案'));
    if(p.bio){appendHTML(intro,helpers.guarded(p.bio,'展开人物简介',`bio-${pid}`,'rp-prose'));const sources=el('div',null,'bio-sources');appendHTML(sources,helpers.biographySources(p.bioSources));intro.append(sources,el('p','编写简介沿用原稿来源入口；本次索引建设未重新逐条核读传记论断。','rp-fine'));}
    else intro.append(el('p',p.identified?'本条目尚无编写简介。以下汇集本库全部已收录任职；不据年度背景补写人物行动。':'资料不足：人物身份尚待考订，任职按本条目保留。“身份待考”不表示此人不存在，也不表示与同名者必为同一人。','rp-notice'));
    const summary=el('details',null,'rp-summary');summary.append(el('summary','任职摘要 · 由已收录记录自动整理'));appendHTML(summary,helpers.guarded(p.officeSummary,'展开任职摘要',`summary-${pid}`,'rp-prose'));intro.append(summary);view.append(intro);
    const career=el('section',null,'rp-career');career.append(el('h2',`全部已收录任职 · ${meta.appointments.length}项`),el('p','按传统编年由早到晚排列；只到年份精度，不补造任期月日。名录任次沿用原标注，不等于本页记录序号，也不据此补出未收录任职。','rp-fine'));
    const records=el('ol',null,'rp-career-list');
    meta.appointments.forEach(ref=>{
      const record=data.years[ref.year],office=record.officers[ref.index],li=el('li');li.dataset.appointment=`${ref.year}:${ref.index}`;
      const h=el('h3');h.append(a(`前${ref.year}年 · ${helpers.roles[office.role]}`,`#year=${ref.year}&focus=person:${pid}`));
      li.append(h,el('p',`名录标注第 ${office.term} 次任职 · 建城纪年 ${754-ref.year} AUC`,'rp-fine'));
      appendHTML(li,helpers.guarded(office.note,'展开任职说明',`office-${ref.year}-${pid}-${office.role}`,'rp-prose'));
      const sources=el('div',null,'bio-sources');appendHTML(sources,helpers.biographySources(p.officeSummarySources));li.append(sources);
      if(record.notes.length){const notes=el('details');notes.append(el('summary','本年度名录与纪年说明'));appendHTML(notes,helpers.guarded(record.notes.join(' '),'展开年度说明',`note-${ref.year}`,'rp-prose'));li.append(notes);}
      records.append(li);
    });career.append(records);view.append(career);
    view.append(el('p','任年范围不是生卒年，也不表示期间连续任职。本页不把任内所有事件推作本人行动；从各项年度链接可阅读当年背景与具体来源。','rp-notice'));
    if(meta.sameNames.length){const section=el('section',null,'rp-homonyms');section.append(el('h2',`同名档案辨识 · 另有${meta.sameNames.length}份`),el('p','以下条目的规范化拉丁全名相同。各条目按本库已收录年代与官职分开显示；尚未据此确认重复或历史上的不同身份。合并须另有研究依据。','rp-fine'));const grid=el('div',null,'rp-grid');meta.sameNames.forEach(id=>grid.append(card(id,false)));section.append(grid);view.append(section);}
    const source=el('section',null,'rp-method');source.append(el('h2','资料与校订'),a('原有'+(p.identified?'人物资料':'名录来源')+' ↗',p.url),el('p','已收录官职来自本卷名录。任职摘要为自动整理；简介、年度任职说明、身份待考及同名候选分别保留。'),a('人物研究与维护说明 ↗','https://github.com/kaloioannes/roman-fasti/blob/main/docs/republic-people.md'));view.append(source);
    helpers.bindGuards();FastiPeople.mount('republic',pid,view);document.title=p.zh+' · 共和国人物档案 · FASTI';
  }
  function render(params,records,projection,api){
    data=records;index=projection;helpers=api;const view=host();view.replaceChildren();delete view.dataset.person;
    view.hidden=false;if(params.has('person'))dossier(params);else directory(params);
    const heading=view.querySelector('h1');heading.tabIndex=-1;heading.focus({preventScroll:true});window.scrollTo(0,0);
  }
  return {valid,render,normalize};
})();
