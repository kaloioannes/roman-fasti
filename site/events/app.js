'use strict';
(() => {
  const main=document.querySelector('#content'), E=window.FastiSearch;
  let index,version=0;
  let hide=false;try{hide=localStorage.getItem('fasti-search-hide-snippets')==='true'||localStorage.getItem('fasti-spoiler-v2')==='true';}catch{}
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const link=(text,url)=>{const a=el('a',text);a.href='../'+url;return a;};
  const hash=p=>'#'+new URLSearchParams(p).toString();
  const period=id=>index.periods.find(p=>p.id===id)?.title||id;
  const point=p=>p?E.when(p.year)+(p.month?`${p.month}月`:'')+(p.day?`${p.day}日`:''):'未定年';
  function dates(d){
    if(d.extent==='undated')return '绝对年代未定';
    const range=JSON.stringify(d.start)===JSON.stringify(d.end)?point(d.start):point(d.start)+' — '+point(d.end);
    return range+({'point':'','span':' · 持续过程','window':' · 日期窗口','context':' · 年度归置（非确定发生日）'}[d.extent]||'');
  }
  function tags(e){const box=el('div',null,'event-tags');[index.kinds[e.recordKind],period(e.period),index.certainties[e.date.certainty],...e.topics.map(t=>index.topics[t])].forEach(t=>box.append(el('span',t,'event-tag')));return box;}
  function citations(refs){
    const list=el('ol',null,'event-citations');
    refs.forEach(r=>{const item=el('li'),a=el('a',r.label+' ↗');a.href=r.url;a.target='_blank';a.rel='noopener';
      item.append(a,el('p','定位：'+r.locator),el('p','支持：'+r.claim),el('p',r.consultation==='inherited'?'沿用原卷引用 · 本次未重新核读':`${r.consultation==='direct'?'本次直接查阅':'间接引述'} · ${r.checked}`,'event-note'));list.append(item);
    });return list;
  }
  function card(e){const article=el('article',null,'event-card');article.dataset.eventId=e.id;const h=el('h2');h.append(link(e.title+' ↗',e.url));article.append(tags(e),el('div',dates(e.date),'event-date'),h);if(!hide)article.append(el('p',e.text.slice(0,150)));return article;}
  function directory(params){
    document.title='事件档案 · FASTI 罗马历史纪年';
    main.append(el('p','RES GESTAE · 有身份的记事','eyebrow'),el('h1','事件可以跨年，引用始终如一。'),el('p','统一检索五卷的独立事件、年度摘要、跨年背景与传统叙事。一个跨年对象只计一次；年度归置不能证明其中每项行动都发生在那一年。','event-intro'));
    const examples=el('nav',null,'event-examples');examples.setAttribute('aria-label','事件阅读示例');
    [['1071年的两处事件',{q:'1071',kind:'event'}],['1204年与跨年远征',{q:'1204',kind:'event'}],['跨年抄本题记',{q:'1013',topic:'culture'}]].forEach(([label,p])=>{const a=el('a',label);a.href=hash(p);examples.append(a);});main.append(examples);
    const form=el('form',null,'event-tools');form.id='event-form';const query=el('div',null,'event-query'),ql=el('label','检索事件、地点或人物'),input=el('input');input.type='search';input.name='q';input.id='event-query';input.maxLength=160;input.value=params.get('q')||'';input.placeholder='曼齐刻尔特、巴里、1204、前44年…';ql.append(input);query.append(ql);const submit=el('button','查阅事件');submit.type='submit';query.append(submit);form.append(query);
    const filters=el('div',null,'event-filters');
    const controls={};
    function select(key,label,options){const l=el('label',label),s=el('select');s.name=key;s.id='event-'+key;Object.entries({'':'全部',...options}).forEach(([value,text])=>{const o=el('option',text);o.value=value;s.append(o);});s.value=params.get(key)||'';controls[key]=s;l.append(s);filters.append(l);}
    select('period','分卷',Object.fromEntries(index.periods.map(p=>[p.id,p.title])));select('kind','资料类型',index.kinds);select('certainty','纪年',index.certainties);select('topic','主题',index.topics);
    for(const [key,label] of [['from','起年（负数为公元前）'],['to','止年（无0年）']]){const l=el('label',label),n=el('input');n.name=key;n.id='event-'+key;n.type='number';n.min=-753;n.max=1453;n.value=params.get(key)||'';controls[key]=n;l.append(n);filters.append(l);}
    select('place','关联地点',Object.fromEntries(Object.values(index.places).map(p=>[p.id,p.label])));
    select('person','已编订的人物关联',Object.fromEntries([...new Map(Object.values(index.entries).flatMap(e=>e.people.map(p=>[p.period+':'+p.person,period(p.period)+' · '+p.label])))]));
    form.append(filters,el('p','年份筛选取日期范围的交集；窗口表示可能年代，不表示持续行动。相同对象关联多个年度仍只显示一次。','event-note'));
    const reset=el('a','清空全部条件');reset.href='#';form.append(reset);main.append(form);
    const unknown=[...params.keys()].filter(k=>!['q','period','kind','certainty','topic','from','to','place','person','page'].includes(k));
    const invalid=Object.entries(controls).some(([k,n])=>params.has(k)&&params.get(k)!==''&&n.value!==params.get(k))||(params.has('page')&&!/^[1-9]\d*$/.test(params.get('page')));
    const from=params.get('from')?Number(params.get('from')):null,to=params.get('to')?Number(params.get('to')):null;
    const badYears=[from,to].some(y=>y!==null&&(!Number.isInteger(y)||!y||y<-753||y>1453))||(from!==null&&to!==null&&from>to);
    const parsed=E.parseYear(input.value),terms=input.value.trim().split(/\s+/).map(E.normalize).filter(Boolean);
    let rows=Object.values(index.entries).filter(e=>{
      if(params.get('period')&&e.period!==params.get('period')||params.get('kind')&&e.recordKind!==params.get('kind')||params.get('certainty')&&e.date.certainty!==params.get('certainty')&&!e.date.qualifiers.includes(params.get('certainty'))||params.get('topic')&&!e.topics.includes(params.get('topic'))||params.get('place')&&!e.places.includes(params.get('place'))||params.get('person')&&!e.people.some(p=>p.period+':'+p.person===params.get('person')))return false;
      if((from!==null||to!==null)&&!e.spans.some(([a,b])=>a<=(to??1453)&&b>=(from??-753)))return false;
      if(parsed)return parsed.years.some(y=>e.spans.some(([a,b])=>a<=y&&y<=b));
      const text=E.normalize([e.id,e.title,e.text,...e.people.map(p=>p.label),...e.places.flatMap(p=>[index.places[p].label,...index.places[p].aliases])].join(' '));return terms.every(t=>text.includes(t));
    }).sort((a,b)=>(a.spans[0]?.[0]??Infinity)-(b.spans[0]?.[0]??Infinity)||a.id.localeCompare(b.id));
    if(unknown.length||invalid||badYears||parsed?.error)rows=[];
    const pageCount=Math.max(1,Math.ceil(rows.length/36)),page=Math.min(pageCount,Math.max(1,Number(params.get('page'))||1));
    const status=el('p',unknown.length||invalid?'筛选条件无法识别，请清空后重选。':badYears?'年份范围无效：请使用前753年至1453年之间的非零整数，起年不得晚于止年。':parsed?.error||`找到 ${rows.length} / ${Object.keys(index.entries).length} 个独立对象 · 第 ${page} / ${pageCount} 页${rows.length?'':'。可尝试其他名称或放宽筛选。'}`,'event-status');status.id='event-status';status.setAttribute('role','status');main.append(status);
    if(parsed?.ambiguous)main.append(el('p','裸数字同时查找公元与公元前；结果日期分别标明纪元。','event-note'));
    if(params.get('place')&&index.places[params.get('place')]){const p=index.places[params.get('place')];main.append(el('h2',p.label),link('地点档案与相关年度 ↗','places/'+hash({place:p.id})),el('p',p.note,'event-note'),citations(p.references));}
    const privacy=el('label'),check=el('input');check.type='checkbox';check.id='event-hide';check.checked=hide;privacy.append(check,' 隐藏内容摘要');main.append(privacy);
    const grid=el('div',null,'event-results');rows.slice((page-1)*36,page*36).forEach(e=>grid.append(card(e)));main.append(grid);
    check.onchange=()=>{hide=check.checked;try{localStorage.setItem('fasti-search-hide-snippets',String(hide));}catch{}grid.replaceChildren(...rows.slice((page-1)*36,page*36).map(card));};
    if(pageCount>1){const nav=el('nav',null,'event-pagination');nav.setAttribute('aria-label','事件结果分页');for(const [n,label] of [[page-1,'← 上一页'],[page+1,'下一页 →']])if(n>=1&&n<=pageCount){const p=new URLSearchParams(params);p.set('page',n);const a=el('a',label);a.href=hash(p);nav.append(a);}main.append(nav);}
    form.onsubmit=e=>{e.preventDefault();const p=new URLSearchParams();if(input.value.trim())p.set('q',input.value.trim());for(const [k,n] of Object.entries(controls))if(n.value)p.set(k,n.value);location.hash=hash(p);};
    for(const [k,n] of Object.entries(controls))if(n.tagName==='SELECT')n.onchange=()=>form.requestSubmit();
  }
  function detail(id){
    const e=index.entries[id],back=el('nav',null,'event-toolbar');back.append(link('← 全部事件','events/'));main.append(back);
    if(!e){document.title='事件地址有误 · FASTI';main.append(el('h1','找不到这份事件档案'),el('p','此稳定ID尚未收录。可返回事件目录查找。'));return;}
    document.title=e.title+' · 事件档案 · FASTI';const article=el('article',null,'event-detail');article.dataset.eventId=e.id;main.append(article);
    article.append(tags(e),el('h1',e.title),el('p',dates(e.date),'event-date'),el('p',e.date.note,'event-disclosure'),el('p','稳定ID：'+e.id,'event-object-id'));
    if(e.recordKind==='annual-summary'||e.recordKind==='background')article.append(el('p','此对象保留原卷的年度叙述，可能包含多项行动；对象数不能解释为独立历史事件总数。','event-note'));
    const text=el('p',hide?'已隐藏正文。可展开后阅读。':e.text,hide?'event-hidden':'event-text');article.append(text);
    if(hide){const b=el('button','展开事件正文');b.onclick=()=>{text.textContent=e.text;text.className='event-text';b.remove();};article.append(b);}
    const objectSection=(title)=>{const s=el('section');s.append(el('h2',title));article.append(s);return s;};
    const relates=objectSection('关联对象');const ul=el('ul',null,'event-relations');
    const edgeEvidence=(li,p)=>{const d=el('details');d.append(el('summary','关系依据与沿用出处'));if(p.evidence.quote)d.append(el('blockquote',p.evidence.quote));const source=el('a','编订资料：'+p.evidence.entry+' ↗');source.href='https://github.com/kaloioannes/roman-fasti/blob/main/'+p.evidence.source;source.target='_blank';source.rel='noopener';d.append(el('p',p.evidence.note,'event-note'),source,citations(p.references));li.append(d);};
    e.people.forEach(p=>{const li=el('li');li.dataset.person=p.period+':'+p.person;li.append(link(p.label+' ↗',p.url),el('p',({'participant':'直接参与','subject':'事件主体','mentioned':'仅被提及，未判定直接参与'}[p.role])+' · 依据：'+p.basis,'event-note'));if(p.globalUrl)li.append(link('本人的跨卷总档案 ↗',p.globalUrl));edgeEvidence(li,p);ul.append(li);});
    e.placeRelations.forEach(p=>{const li=el('li');li.dataset.place=p.place;li.append(link(p.label+' · 地点档案与相关年度 ↗',p.url),el('p',({'setting':'发生／行动地点','subject':'事件对象地点','mentioned':'仅被提及'}[p.role])+' · '+p.basis,'event-note'));edgeEvidence(li,p);ul.append(li);});
    const relationships=[...e.relations.map(r=>({id:r.event,label:r.type==='part-of'?'所属过程':'原年度摘要'})),...Object.values(index.entries).flatMap(other=>other.relations.filter(r=>r.event===id).map(r=>({id:other.id,label:r.type==='part-of'?'子事件':'由此细分'})))];
    [...new Map(relationships.map(r=>[r.id,r])).values()].forEach(r=>{const li=el('li');li.append(link(r.label+'：'+index.entries[r.id].title+' ↗',index.entries[r.id].url));ul.append(li);});
    relates.append(ul);if(!ul.children.length)relates.append(el('p','尚未编订明确的人物、地点或事件关联；不会从在位期间或正文提名自动推断。','event-note'));
    const origins=objectSection('年度入口与原卷记录'),years=el('ul',null,'event-year-links');e.origins.forEach(o=>{const li=el('li');li.append(link('原卷原条：'+period(o.period)+' ↗',o.url));years.append(li);});
    e.years.forEach(y=>{const li=el('li');li.append(link(E.when(y.year)+' · '+period(y.period)+' ↗',y.url));years.append(li);});origins.append(years);if(!years.children.length)origins.append(el('p','绝对年代未定；仅保留原卷人物／传统叙事入口。'));
    const sources=objectSection('出处与查阅状态');sources.id='event-sources';sources.append(citations(e.references));
    const cite=objectSection('引用此对象'),canonical=new URL('../'+e.url,location.href).href,now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const citation=`${e.title}（${index.kinds[e.recordKind]}），FASTI · 罗马历史纪年，稳定ID ${e.id}，资料版本 ${index.version}，${canonical}，访问日期 ${now}。数据许可：${index.license}；原始文献及译本版权归各权利人。`;
    const area=el('textarea',null,'event-citation-text');area.id='event-citation';area.readOnly=true;area.value=citation;area.setAttribute('aria-label','可复制的规范引用');cite.append(area);
    const actions=el('div',null,'event-actions'),notice=el('p',null,'event-note');notice.setAttribute('role','status');
    for(const [label,value] of [['复制引用',citation],['复制稳定链接',canonical]]){const b=el('button',label);b.onclick=async()=>{try{await navigator.clipboard.writeText(value);notice.textContent='已复制。';}catch{area.value=value;area.focus();area.select();notice.textContent='自动复制不可用，已选中文字，可手动复制。';}};actions.append(b);}
    const download=el('button','下载此对象 JSON');download.onclick=()=>{const blob=new Blob([JSON.stringify({version:index.version,license:index.license,event:e,places:Object.fromEntries(e.places.map(p=>[p,index.places[p]]))},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=el('a');a.href=url;a.download=e.id.replace(':','-')+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};actions.append(download);cite.append(actions,notice);
  }
  async function route(){const current=++version;main.setAttribute('aria-busy','true');main.replaceChildren(el('p','正在查阅事件档案……','event-status'));
    try{index=await window.FastiEventData.load();if(current!==version)return;main.replaceChildren();const p=new URLSearchParams(location.hash.slice(1));if(p.has('event')){const old=p.get('event'),alias=index.aliases[old];if(alias){history.replaceState(null,'',hash({event:alias.target}));detail(alias.target);main.prepend(el('p','此旧ID已迁移：'+alias.reason,'event-note'));}else detail(old);}else directory(p);main.focus({preventScroll:true});window.scrollTo(0,0);}
    catch{if(current===version){main.replaceChildren(el('h1','事件档案暂时无法载入'),el('p','网络、超时或资料格式异常。请重试；各卷原档案仍可独立阅读。'));const b=el('button','重新载入事件档案');b.id='retry-events';b.onclick=route;main.append(b);}}
    finally{if(current===version){main.dataset.renderedHash=location.hash;main.setAttribute('aria-busy','false');}}
  }
  document.querySelector('#theme-button').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('fasti-theme',theme);}catch{}};
  addEventListener('hashchange',route);route();
})();
