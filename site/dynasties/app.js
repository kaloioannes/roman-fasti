'use strict';
(() => {
  const D=window.FastiDynasties,E=window.FastiSearch,{el,link,when}=D,main=document.querySelector('#content');
  let index,serial=0;
  const hash=v=>'#'+new URLSearchParams(Object.entries(v).filter(([,v])=>v!==''&&v!=null));
  const getParams=()=>Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  const go=values=>{location.hash=hash({...getParams(),...values});};
  const kindNames={dynasty:'王朝',family:'家族',none:'无固定归组'};
  const period=id=>index.periods.find(p=>p.id===id)?.title||id;
  const heading=(n,id,text)=>{const h=el('h'+n,text);h.id=id;return h;};
  function sources(rows){
    const ul=el('ul',null,'dynasty-references');rows.forEach(r=>{
      const s=index.sources[r.source],li=el('li'),a=el('a',s.label+' ↗');a.href=r.url||s.url;a.target='_blank';a.rel='noopener';
      li.append(a,el('p',r.locator),el('p','支持：'+r.supports));
      const access=s.access==='inherited'?'沿用原卷引用；本次未重新核读':s.access==='indirect'?'间接引述':'直接阅读所列段落';
      const more=el('details');more.append(el('summary',(s.kind==='primary'?'古代／中世纪文献 · ':s.kind==='research'?'署名研究 · ':'')+access),el('p',[s.author,s.edition].filter(Boolean).join(' · ')),el('p','实际查阅：'+s.scope));
      if(s.checked)more.append(el('p','核对日期：'+s.checked));if(s.limitations)more.append(el('p','材料局限：'+s.limitations));
      if(s.via){const a=el('a',s.via.label);a.href=s.via.url;more.append(a,el('p',s.via.locator));}li.append(more);ul.append(li);
    });return ul;
  }
  function disclosure(label,refs){const box=el('details');box.append(el('summary',label),sources(refs));return box;}
  function select(label,id,rows,value){const l=el('label',label),s=el('select');s.id=id;rows.forEach(([v,t])=>s.append(new Option(t,v)));s.value=value;l.append(s);return [l,s];}
  function directory(p){
    document.title='王朝与家族专题 · FASTI';
    main.append(el('p','DOMVS · 家族与权力','eyebrow'),el('h1','一个王朝，许多种相连的方式。'),el('p','从成员与任期进入一个皇室，再分辨血缘、婚姻、收养与帝位承接。','dynasty-intro'));
    const method=el('details');method.append(el('summary','分类、关系与资料范围'),el('p',index.method));main.append(method);
    const form=el('form',null,'dynasty-filters');form.setAttribute('role','search');
    const label=el('label','王朝、家族或人物'),q=el('input');q.id='dynasty-query';q.type='search';q.maxLength=160;q.value=(p.q||'').slice(0,160);q.placeholder='科穆宁、Flavian、莉薇娅…';label.append(q);
    const [pl,ps]=select('分卷','dynasty-period',[['','全部分卷'],...index.periods.filter(p=>Object.values(index.topics).some(t=>t.period===p.id)).map(p=>[p.id,p.title])],p.period||'');
    const [kl,ks]=select('归组类型','dynasty-kind',[['','全部类型'],...Object.entries(kindNames)],p.kind||'');
    const [rl,rs]=select('资料范围','dynasty-coverage',[['','全部专题'],['curated','已编订关系图'],['catalogue','分类档案']],p.coverage||'');
    const submit=el('button','查找'),clear=el('button','清空');submit.type='submit';clear.type='button';form.append(label,pl,kl,rl,submit,clear);main.append(form);
    const status=el('p');status.setAttribute('role','status');const grid=el('div',null,'dynasty-grid');main.append(status,grid);
    const run=()=>{
      const bad=(p.period&&!index.periods.some(v=>v.id===p.period))||(p.kind&&!kindNames[p.kind])||(p.coverage&&!['curated','catalogue'].includes(p.coverage));
      const terms=q.value.trim().split(/\s+/u).map(E.normalize).filter(Boolean);grid.replaceChildren();
      if(bad){status.textContent='筛选条件需要修正，可清空后重新查找。';return;}
      const rows=Object.values(index.topics).filter(t=>(!ps.value||t.period===ps.value)&&(!ks.value||t.kind===ks.value)&&(!rs.value||t.curated===(rs.value==='curated'))&&terms.every(term=>E.normalize([t.label,t.note,...t.aliases||[],...t.nodes.flatMap(id=>[index.nodes[id].label,index.nodes[id].native])].join(' ')).includes(term))).sort((a,b)=>Number(b.curated)-Number(a.curated)||index.periods.findIndex(p=>p.id===a.period)-index.periods.findIndex(p=>p.id===b.period));
      status.textContent=`找到 ${rows.length} / ${Object.keys(index.topics).length} 份专题；三组有逐边核读的关系网络。其余保留原卷分类档案，未编订亲属边。`;
      rows.forEach(t=>{const box=el('article',null,'dynasty-card');box.dataset.topic=t.id;const h=el('h2');h.append(link(t.label,t.url+('&'+new URLSearchParams({q:q.value,period:ps.value,kind:ks.value,coverage:rs.value}))));box.append(el('p',period(t.period)+' · '+kindNames[t.kind],'eyebrow'),h,el('p',t.note),el('p',`${t.members.length}位原卷成员 · ${t.stages.length}段称号任期 · ${t.edges.length}条编订关系`,'dynasty-meta'),el('p',t.curated?'已编订 · 关系图与逐边证据':'分类档案 · 亲属关系尚未编订','dynasty-meta'));grid.append(box);});
      if(!rows.length)grid.append(el('p','没有匹配的已收录专题。可尝试原文姓名、其他译名，或清空筛选。','dynasty-empty'));
    };
    const navigate=()=>{location.hash=hash({q:q.value.trim(),period:ps.value,kind:ks.value,coverage:rs.value});};
    form.onsubmit=e=>{e.preventDefault();navigate();};ps.onchange=ks.onchange=rs.onchange=navigate;q.oninput=run;
    clear.onclick=()=>{location.hash='';if(!location.hash){p={};q.value='';ps.value=ks.value=rs.value='';run();q.focus();}};run();
  }
  function svgElement(name,attrs={}){const n=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>n.setAttribute(k,v));return n;}
  function graph(topic,edges,type,selected){
    const wrap=el('div',null,'dynasty-graph');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','可横向滚动的'+index.types[type]+'关系图');
    const ids=[...new Set(edges.flatMap(e=>[e.from,e.to]))];
    if(!ids.length){wrap.append(el('p','当前条件下没有此类已编订关系。','dynasty-empty'));return wrap;}
    // Topological columns organize edges only. They are neither dates nor an
    // inferred generation count (especially for marriage and political ties).
    const rank=Object.fromEntries(ids.map(id=>[id,0]));
    for(let i=0;i<ids.length;i++){let change=false;for(const e of edges){if(rank[e.to]<rank[e.from]+1){rank[e.to]=rank[e.from]+1;change=true;}}if(!change)break;}
    if(Math.max(...Object.values(rank))>=ids.length)ids.forEach((id,i)=>rank[id]=i%3);
    const columns=[];ids.forEach(id=>(columns[rank[id]]??=[]).push(id));
    const width=Math.max(820,columns.length*240+70),height=Math.max(310,...columns.filter(Boolean).map(c=>c.length*95+75)),positions={};
    columns.forEach((rows,col)=>rows?.forEach((id,i)=>positions[id]={x:35+col*240,y:35+(i+.5)*(height-70)/rows.length}));
    const svg=svgElement('svg',{viewBox:`0 0 ${width} ${height}`,width,height,role:'group','aria-labelledby':'graph-title graph-desc'});
    const title=svgElement('title',{id:'graph-title'});title.textContent=topic.label+' · '+index.types[type];const desc=svgElement('desc',{id:'graph-desc'});desc.textContent='每条线均可打开出处。列与位置仅为排版，不代表年代或辈分。下方关系列表提供相同信息，含时间、争议和引用。';svg.append(title,desc);
    const defs=svgElement('defs'),marker=svgElement('marker',{id:'dynasty-arrow',viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:6,markerHeight:6,orient:'auto-start-reverse'}),arrow=svgElement('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:'context-stroke'});marker.append(arrow);defs.append(marker);svg.append(defs);
    edges.forEach(e=>{const a=positions[e.from],b=positions[e.to],x1=a.x+165,x2=b.x,mid=(x1+x2)/2;
      const path=`M${x1},${a.y} C${mid},${a.y} ${mid},${b.y} ${x2},${b.y}`,anchor=svgElement('a',{href:hash({...getParams(),relation:e.id,node:'',type:e.type}), 'aria-label':index.nodes[e.from].label+' → '+index.nodes[e.to].label+'：'+index.types[e.type]+'，查看出处'});
      const line=svgElement('path',{d:path,class:'edge edge-'+e.type+(e.status==='attested'?'':' edge-uncertain')});if(e.type!=='marriage')line.setAttribute('marker-end','url(#dynasty-arrow)');anchor.append(line,svgElement('path',{d:path,class:'edge-hit'}));const title=svgElement('title');title.textContent=e.note+' · '+e.date.label;anchor.append(title);svg.append(anchor);
    });
    ids.forEach(id=>{const p=positions[id],n=index.nodes[id],a=svgElement('a',{href:hash({...getParams(),node:id,relation:''}),class:selected===id?'selected':'','aria-label':n.label+'：人物与关联'});a.append(svgElement('rect',{x:p.x,y:p.y-29,width:165,height:58,rx:6}));const name=Array.from(n.label),lines=name.length>10?[name.slice(0,10).join(''),name.slice(10,20).join('')+(name.length>20?'…':'')]:[n.label];lines.forEach((s,i)=>{const text=svgElement('text',{x:p.x+82.5,y:p.y+(lines.length===1?5:-3+i*19),'text-anchor':'middle'});text.textContent=s;a.append(text);});const title=svgElement('title');title.textContent=n.label+' · '+n.role;a.append(title);svg.append(a);});
    wrap.append(svg);return wrap;
  }
  function nodeDetail(topic,id){
    const n=index.nodes[id],box=el('section',null,'dynasty-node');box.id='node-detail';box.tabIndex=-1;
    if(!n||!topic.nodes.includes(id)){box.append(el('p','此人物节点不在本专题内。'));return box;}
    box.dataset.node=id;box.append(el('h3',n.label),el('p',n.native),el('p',n.role));
    const nav=el('nav');if(n.url)nav.append(link('打开人物档案 ↗',n.url));n.profiles.forEach(p=>nav.append(link(period(p.period)+'原档案 ↗',p.url)));
    const focus=el('button','只看此人的直接关系');focus.onclick=()=>go({focus:id,node:'',relation:''});nav.append(focus);box.append(nav);
    if(!n.profiles.length)box.append(el('p','专题辅助人物；没有因关系图收录而列入皇帝名录。','dynasty-meta'));
    if(n.references.length)box.append(disclosure('人物身份依据',n.references));return box;
  }
  function relationships(topic,p){
    const section=el('section',null,'dynasty-section');section.id='relationships';section.append(el('h2','关系图与逐边出处'));
    if(!topic.curated){section.append(el('p','本专题已汇集原卷成员、任期与事件。亲属和继承边尚未逐条编订，因此没有从王朝标签自动生成家谱。','dynasty-empty'));return section;}
    const chosen=topic.edges.find(e=>e.id===p.relation),type=p.type||chosen?.type||'parent';
    const filters=el('div',null,'dynasty-graph-tools');
    const [tl,ts]=select('关系层','relation-type',[['all','全部类型（列表）'],...Object.entries(index.types)],type);
    const [pl,ps]=select('人物范围','relation-person',[['','全部人物'],...topic.nodes.map(id=>[id,index.nodes[id].label])],p.focus||'');
    const [sl,ss]=select('记载状态','relation-status',[['','全部状态'],['attested','文献明确记载'],['uncertain','异说与传闻']],p.status||'');
    const yl=el('label','关系所述年代（未定年关系仍保留）'),yi=el('input');yi.id='relation-year';yi.value=p.at||'';yi.placeholder='前27 / 50 / 1081';yl.append(yi);
    const apply=el('button','应用关系筛选'),clear=el('button','清空关系筛选');filters.append(tl,pl,sl,yl,apply,clear);section.append(filters);
    const navigate=()=>go({type:ts.value,focus:ps.value,status:ss.value,at:yi.value.trim(),relation:'',node:''});apply.onclick=navigate;ts.onchange=ps.onchange=ss.onchange=navigate;yi.onkeydown=e=>{if(e.key==='Enter')navigate();};clear.onclick=()=>go({type:'',focus:'',status:'',at:'',relation:'',node:''});
    const bad=(p.type&&p.type!=='all'&&!index.types[p.type])||(p.focus&&!topic.nodes.includes(p.focus))||(p.status&&!['attested','uncertain'].includes(p.status));
    const parsed=p.at?E.parseYear(p.at):null,at=parsed&&!parsed.error?(parsed.ambiguous?Math.abs(parsed.years[0]):parsed.years[0]):null;
    if(bad||(p.at&&at===null)){section.append(el('p','关系筛选条件需要修正。年份请用非零整数；可清空关系筛选。','dynasty-note'));return section;}
    const edges=topic.edges.filter(e=>(type==='all'||e.type===type)&&(!p.focus||e.from===p.focus||e.to===p.focus)&&(!p.status||(p.status==='attested'?e.status==='attested':e.status!=='attested'))&&(at===null||e.date.precision==='unknown'||e.date.start<=at&&e.date.end>=at));
    const status=el('p',`当前显示 ${edges.length} / ${topic.edges.length} 条关系。`+(at!==null?`年代按${when(at)}解释；未定年关系保留并标明。`:''));status.setAttribute('role','status');section.append(status);
    if(type!=='all'){
      section.append(el('p',index.types[type]+' · '+({parent:'实线单箭头',marriage:'长虚线，无方向',adoption:'短虚线单箭头',designation:'点划线单箭头',succession:'粗实线单箭头'}[type])+'。列与位置只为排版，不表示年代或辈分。虚淡线另标异说或传闻。','dynasty-legend'));
      const wrap=graph(topic,edges,type,p.node),zoom=el('div',null,'dynasty-actions'),zoomValue=el('span','图幅 100%');zoomValue.setAttribute('role','status');let scale=1;
      [['缩小关系图',-.2],['放大关系图',.2],['重置图幅',0]].forEach(([label,delta])=>{const b=el('button',label);b.onclick=()=>{scale=delta?Math.min(1.8,Math.max(.6,scale+delta)):1;const svg=wrap.querySelector('svg');if(svg){const parts=svg.getAttribute('viewBox').split(' ').map(Number);svg.setAttribute('width',parts[2]*scale);svg.setAttribute('height',parts[3]*scale);}zoomValue.textContent='图幅 '+Math.round(scale*100)+'%';};zoom.append(b);});zoom.append(zoomValue);section.append(zoom,wrap);
    }else section.append(el('p','全部类型按下方列表对读；选择一种关系层即可查看独立连线图。','dynasty-meta'));
    if(p.node)section.append(nodeDetail(topic,p.node));
    const list=el('div',null,'dynasty-relations');list.setAttribute('aria-label','关系图的等价关系列表');
    edges.forEach(e=>{const row=el('article',null,'dynasty-relation'+(p.relation===e.id?' is-selected':''));row.id='relation-'+e.id;row.tabIndex=-1;row.dataset.relation=e.id;row.dataset.type=e.type;row.dataset.status=e.status;
      const h=el('h3');h.append(link(index.nodes[e.from].label,'dynasties/'+hash({...p,node:e.from,relation:''})),e.type==='marriage'?' ↔ ':' → ',link(index.nodes[e.to].label,'dynasties/'+hash({...p,node:e.to,relation:''})));
      row.append(h,el('p',index.types[e.type]+' · '+index.statuses[e.status],'dynasty-meta'),el('p',e.date.label+' · '+({unknown:'未定年',year:'年精度',range:'范围',circa:'约年'}[e.date.precision])),el('p',e.note));
      if(e.dispute)row.append(el('p',e.dispute,'dynasty-note'));
      row.append(disclosure('出处与支持的论断',e.references),link('此关系的稳定链接','dynasties/'+hash({topic:topic.id,relation:e.id,type:e.type})));list.append(row);
    });if(!edges.length)list.append(el('p','这些筛选条件下没有已编订的关系；可清空筛选。','dynasty-empty'));section.append(list);
    if(p.relation&&!topic.edges.some(e=>e.id===p.relation))section.prepend(el('p','链接中的关系ID不存在，已保留专题供查阅。','dynasty-note'));
    return section;
  }
  function members(topic){
    const s=el('section',null,'dynasty-section');s.id='members';s.append(el('h2','原卷成员与称号任期'),el('p','所有原卷成员与各段称号均保留。亲属边缺失不表示没有亲属；关系图辅助人物不自动进入本表。','dynasty-meta'));
    const grid=el('div',null,'dynasty-members');topic.members.forEach(id=>{const n=index.nodes[id],box=el('article',null,'dynasty-member');box.dataset.member=id;const h=el('h3');h.append(link(n.label,n.url));box.append(h,el('p',n.native,'dynasty-meta'));const count=topic.stages.filter(s=>{const r=index.stages[s];return n.profiles.some(p=>p.period===r.period&&p.person===r.person);}).length;box.append(el('p',count+'段已收录称号任期','dynasty-meta'));grid.append(box);});s.append(grid);
    const ol=el('ol',null,'dynasty-stages');topic.stages.map(id=>index.stages[id]).sort((a,b)=>a.startYear-b.startYear||a.id.localeCompare(b.id)).forEach(stage=>{
      const n=index.nodes[topic.members.find(id=>index.nodes[id].profiles.some(p=>p.period===stage.period&&p.person===stage.person))],li=el('li');li.dataset.stage=stage.id;
      li.append(link(n.label,n.url),el('strong',' · '+index.stageKinds[stage.kind]),el('p',stage.label),el('p',[stage.note,stage.certainty,stage.recognition].filter(Boolean).join(' · '),'dynasty-meta'));
      if(stage.start&&stage.end)li.append(el('p','起点：'+stage.start.label+'（'+stage.start.precision+'）；终点：'+stage.end.label+'（'+stage.end.precision+'）','dynasty-meta'));
      const p=index.periods.find(p=>p.id===stage.period),a=Math.max(stage.startYear,p.start),b=Math.min(stage.endYear,p.end);li.append(link(when(a)+'原年度 ↗',stage.period+'/#year='+a),' · ',link(when(b)+'原年度 ↗',stage.period+'/#year='+b),' · ',link('此人的任期时间轴 ↗','timeline/#'+new URLSearchParams({period:stage.period,person:stage.period+':'+stage.person})));
      const refs=el('details');refs.append(el('summary','沿用原任期来源'));stage.sources.forEach(id=>{const ref=index.stageSources[id],a=el('a',ref.label+' ↗');a.href=ref.url;a.target='_blank';a.rel='noopener';refs.append(el('p'),a);});li.append(refs);ol.append(li);
    });s.append(ol);return s;
  }
  function events(topic){
    const s=el('section',null,'dynasty-section');s.id='events';s.append(el('h2','主要事件与时代背景'),el('p','明确人物关联来自已编订事件关系；同一时期背景只按本卷已收录任期范围汇集，不推定此人直接参与或策划。每条进入事件档案后可查原卷、日期与证据。','dynasty-meta'));
    const [label,mode]=select('事件范围','dynasty-event-scope',[['highlights','编订的关键节点'],['linked','明确人物关联'],['context','同时期背景（非行动归因）']],'highlights');const ql=el('label','在本专题事件中查找'),q=el('input');q.type='search';q.maxLength=160;q.id='dynasty-event-query';ql.append(q);const tools=el('div',null,'dynasty-filters');tools.append(label,ql);const status=el('p');status.setAttribute('role','status');const list=el('div',null,'dynasty-events'),more=el('button','再显示20条');s.append(tools,status,list,more);let limit=20;
    function run(){const ids=mode.value==='highlights'?topic.highlights:mode.value==='linked'?topic.events:topic.contextEvents;const terms=q.value.trim().split(/\s+/u).map(E.normalize).filter(Boolean);const rows=[...new Set(ids)].map(id=>index.events[id]).filter(e=>terms.every(t=>E.normalize(e.title+' '+e.text).includes(t))).sort((a,b)=>a.spans[0][0]-b.spans[0][0]||a.id.localeCompare(b.id));list.replaceChildren();status.textContent=`${mode.options[mode.selectedIndex].textContent}：${rows.length}条，显示前${Math.min(rows.length,limit)}条。`;
      rows.slice(0,limit).forEach(e=>{const box=el('article');box.dataset.event=e.id;const h=el('h3');h.append(link(e.title,e.url));box.append(h,el('p',e.spans.map(([a,b])=>when(a)+(a===b?'':'—'+when(b))).join('；')+' · '+(mode.value==='context'?'时代背景，不代表人物参与':'进入档案查看日期与人物角色'),'dynasty-meta'),el('p',e.text));list.append(box);});if(!rows.length)list.append(el('p',mode.value==='highlights'?'本专题尚未编订关键节点。可切换至明确人物关联或同时期背景。':'没有匹配事件；可尝试其他关键词或范围。','dynasty-empty'));more.hidden=limit>=rows.length;}
    mode.onchange=q.oninput=()=>{limit=20;run();};more.onclick=()=>{limit+=20;run();};run();return s;
  }
  function detail(id,p){
    const t=index.topics[id];main.append(link('← 王朝与家族目录','dynasties/'+hash({q:p.q,period:p.period,kind:p.kind,coverage:p.coverage})));
    if(!t){main.append(el('h1','找不到这个王朝专题'),el('p','此稳定ID尚未收录，可返回目录查找。'));document.title='专题地址有误 · FASTI';return;}
    main.dataset.topic=id;document.title=t.label+' · 王朝专题 · FASTI';main.append(el('p','DOMVS · '+period(t.period)+' · '+kindNames[t.kind],'eyebrow'),el('h1',t.label),el('p',t.note,'dynasty-intro'),el('p',`${t.members.length}位原卷成员 · ${t.stages.length}段称号任期 · ${t.edges.length}条编订关系`,'dynasty-meta'));
    main.append(disclosure('原有分类依据（不等于逐条亲属证据）',t.classificationSources.map(id=>({source:id,locator:'本卷 dynasties.json：'+t.dynasty,supports:t.note}))));
    const nav=el('nav',null,'dynasty-toc');nav.setAttribute('aria-label','专题章节');[['relationships','关系与出处'],['members','成员与任期'],['events','事件与背景'],['export','分享与资料']].forEach(([id,label])=>{const a=el('a',label);a.href=hash({topic:t.id,section:id});nav.append(a);});main.append(nav);
    if(t.sections.length){const reading=el('div',null,'dynasty-reading');t.sections.forEach(s=>{const box=el('section');box.append(el('h2',s.title),el('p',s.text),disclosure('叙述依据',s.references));reading.append(box);});main.append(reading);}
    main.append(relationships(t,p),members(t),events(t));
    if(t.related.length){main.append(el('h2','跨卷或姻亲专题'));const nav=el('nav',null,'dynasty-toc');t.related.forEach(id=>nav.append(link(index.topics[id].label+' · '+period(index.topics[id].period),index.topics[id].url)));main.append(nav);}
    const exportBox=el('section',null,'dynasty-section');exportBox.id='export';exportBox.append(el('h2','分享与带出处资料'));
    const canonical=new URL('../'+t.url,location.href).href,area=el('textarea',null,'dynasty-link-text');area.readOnly=true;area.setAttribute('aria-label','专题稳定链接');area.value=canonical;const status=el('p');status.setAttribute('role','status');const actions=el('div',null,'dynasty-actions');
    const copy=el('button','复制当前视图链接'),download=el('button','下载专题与出处 JSON');copy.onclick=async()=>{const url=new URL(location.href);try{await navigator.clipboard.writeText(url.href);status.textContent='已复制当前视图链接。';}catch{area.value=url.href;area.focus();area.select();status.textContent='已选中链接，可手动复制。';}};
    download.onclick=()=>{const relatedEvents=new Set([...t.events,...t.contextEvents,...t.highlights]);const value={schemaVersion:index.schemaVersion,version:index.version,license:index.license,attribution:'FASTI · 罗马历史纪年，王朝专题；原始来源版权见各项来源及THIRD_PARTY.md',method:index.method,url:canonical,topic:t,nodes:Object.fromEntries(t.nodes.map(id=>[id,index.nodes[id]])),sources:Object.fromEntries([...new Set([...t.classificationSources,...t.edges.flatMap(e=>e.references.map(r=>r.source)),...t.sections.flatMap(s=>s.references.map(r=>r.source)),...t.nodes.flatMap(id=>index.nodes[id].references.map(r=>r.source))])].map(id=>[id,index.sources[id]])),stages:Object.fromEntries(t.stages.map(id=>[id,index.stages[id]])),stageSources:index.stageSources,events:Object.fromEntries([...relatedEvents].map(id=>[id,index.events[id]]))};
      const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download=t.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};actions.append(copy,download);exportBox.append(area,actions,status,el('p','资料版本：'+index.version+' · CC BY-SA 4.0；原文、译本与研究分别保留其版权。','dynasty-meta'));main.append(exportBox);
  }
  async function route(){
    const current=++serial;main.removeAttribute('data-topic');main.setAttribute('aria-busy','true');main.replaceChildren(el('p','正在翻开王朝档案……'));
    try{index=await D.load();if(current!==serial)return;const p=getParams();main.replaceChildren();if(p.topic)detail(p.topic,p);else directory(p);main.focus({preventScroll:true});window.scrollTo(0,0);
      const target=p.relation?document.getElementById('relation-'+p.relation):p.node?document.getElementById('node-detail'):p.section?Array.from(main.querySelectorAll('.dynasty-section')).find(n=>n.id===p.section):null;
      if(target){target.tabIndex=-1;target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}
    }catch{if(current!==serial)return;main.replaceChildren(el('h1','王朝专题暂时无法载入'),el('p','网络、超时或资料格式异常。可重试，或从页头继续阅读原卷。'));const b=el('button','重新载入王朝专题');b.id='retry-dynasties';b.onclick=route;main.append(b);}
    finally{if(current===serial){main.setAttribute('aria-busy','false');main.dataset.renderedHash=location.hash;}}
  }
  document.querySelector('#theme-button').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('fasti-theme',theme);}catch{}};
  addEventListener('hashchange',route);route();
})();
