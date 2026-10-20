'use strict';
(() => {
  const P=window.FastiPower,E=window.FastiSearch,{el,link,when}=P,main=document.querySelector('#content');
  let index,serial=0;
  const params=()=>Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  const hash=p=>'#'+new URLSearchParams(Object.entries(p).filter(([,v])=>v!==''&&v!=null));
  const period=id=>index.periods.find(p=>p.id===id)?.title||id;
  function refs(rows){const ul=el('ul',null,'power-references');rows.forEach(r=>{const s=index.sources[r.source],li=el('li'),a=el('a',s.label+' ↗');a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a,el('p',r.locator),el('p','支持：'+r.supports));
    const more=el('details'),access=({text:'直接阅读电子正文',excerpt:'直接阅读所列电子节选',indirect:'间接引述',inherited:'沿用引用；未重新核读'})[s.access];more.append(el('summary',(s.kind==='primary'?'古代／中世纪文献':s.kind==='research'?'署名研究':'参考资料')+' · '+access),el('p',s.author+' · '+s.edition),el('p','实际查阅：'+s.scope),el('p','核对日期：'+s.checked),el('p','材料局限：'+s.limitations));if(s.via){const a=el('a',s.via.label);a.href=s.via.url;more.append(a,el('p',s.via.locator));}li.append(more);ul.append(li);});return ul;}
  function evidence(rows,label='依据、定位与查阅范围'){const d=el('details');d.append(el('summary',label),refs(rows));return d;}
  const dates=d=>el('p',d.label+' · '+({year:'年精度',range:'所述范围',circa:'约年／边界未确',unknown:'未定年'})[d.precision]+' · '+index.dateMeanings[d.meaning],'power-date');
  function select(label,id,options,value){const l=el('label',label),s=el('select');s.id=id;options.forEach(([v,t])=>s.append(new Option(t,v)));s.value=value||'';l.append(s);return [l,s];}
  function parse(value){if(!value)return null;const p=E.parseYear(value);return !p||p.error?NaN:p.ambiguous?Math.abs(p.years[0]):p.years[0];}
  const span=(d,from,to)=>d.start!==null&&(from===null||d.end>=from)&&(to===null||d.start<=to);
  function directory(p){
    document.title='实际权力与摄政 · FASTI';main.append(el('p','POTESTAS · 身份、行动与权力','eyebrow'),el('h1','皇帝之外，谁在推动历史？'),el('p','沿着角色阶段与具体行动，阅读皇后、摄政者、宫廷官员、元老和将领。每一项判断都能回到所据材料。','power-intro'));
    const method=el('details');method.append(el('summary','如何理解实际权力、阶段与收录范围'),el('p',index.method));main.append(method);
    const paths=el('nav',null,'power-callouts');paths.setAttribute('aria-label','专题阅读入口');[['regent','摄政如何转为亲政'],['empress','女性的具体政治行动'],['court','接近皇帝的渠道'],['strongman','军权与帝位的张力']].forEach(([role,label])=>{const a=el('a',label);a.href=hash({role});paths.append(a);});main.append(paths);
    const form=el('form',null,'power-filters');form.setAttribute('role','search');const label=el('label','人物、行动或来源'),q=el('input');q.id='power-query';q.type='search';q.maxLength=160;q.value=(p.q||'').slice(0,160);q.placeholder='普尔喀丽娅、Belisarius、金玺诏书…';label.append(q);
    const [pl,ps]=select('分卷','power-period',[['','全部分卷'],...index.periods.map(v=>[v.id,v.title])],p.period);
    const [rl,rs]=select('角色','power-role',[['','全部角色'],...Object.entries(index.kinds)],p.role);
    const [sl,ss]=select('行动记载','power-status',[['','全部状态'],...Object.entries(index.statuses)],p.status);
    const fromLabel=el('label','起年（裸数字为公元年）'),from=el('input');from.id='power-from';from.value=p.from||'';from.placeholder='前50';from.maxLength=20;fromLabel.append(from);
    const toLabel=el('label','止年（无0年）'),to=el('input');to.id='power-to';to.value=p.to||'';to.placeholder='1081';to.maxLength=20;toLabel.append(to);
    const submit=el('button','查找'),clear=el('button','清空');submit.type='submit';clear.type='button';form.append(label,pl,rl,sl,fromLabel,toLabel,submit,clear);main.append(form);
    const status=el('p');status.setAttribute('role','status');const grid=el('div',null,'power-grid');main.append(status,grid);
    const run=()=>{const a=parse(from.value.trim()),b=parse(to.value.trim()),terms=q.value.trim().split(/\s+/u).map(E.normalize).filter(Boolean);grid.replaceChildren();
      const bad=(p.period&&!index.periods.some(v=>v.id===p.period))||(p.role&&!index.kinds[p.role])||(p.status&&!index.statuses[p.status])||Number.isNaN(a)||Number.isNaN(b)||(a!==null&&b!==null&&a>b);
      if(bad){status.textContent='筛选条件需要修正。年份使用前50、-50、50等非零历史年份，起年不可晚于止年；可清空重试。';return;}
      const rows=Object.values(index.people).filter(v=>{
        const roles=v.roles.filter(r=>!rs.value||r.kind===rs.value),actions=v.actions.filter(r=>(!ss.value||r.status===ss.value)&&(!ps.value||r.period===ps.value)),bounded=a!==null||b!==null;
        const references=[...v.references,...v.roles.flatMap(r=>r.references),...v.actions.flatMap(r=>r.references)];
        const hay=E.normalize([v.label,v.native,...v.aliases,v.summary,...v.roles.flatMap(r=>[r.label,r.powers,r.limits]),...v.actions.flatMap(a=>[a.title,a.text]),...references.flatMap(r=>[r.locator,index.sources[r.source].label,index.sources[r.source].author,index.sources[r.source].edition])].join(' '));
        return (!ps.value||v.periods.includes(ps.value))&&roles.length&&(!ss.value||actions.some(r=>!bounded||span(r.date,a,b)))
          &&(!bounded||(rs.value?roles:[...roles,...actions]).some(r=>span(r.date,a,b)))&&terms.every(t=>hay.includes(t));
      })
        .sort((x,y)=>Math.min(...x.roles.map(r=>r.date.start??Infinity))-Math.min(...y.roles.map(r=>r.date.start??Infinity)));
      status.textContent=`找到 ${rows.length} / ${Object.keys(index.people).length} 份人物权力档案。`+((a!==null||b!==null)?'年代按角色或行动相交筛选；选定角色时以该角色阶段为准。文献观察窗口不等于完整任期，未定年不推入范围。':'专题为研究选录；人物数不等于皇帝人数。');
      const view={q:q.value.trim(),period:ps.value,role:rs.value,status:ss.value,from:from.value.trim(),to:to.value.trim()};
      rows.forEach(v=>{const card=el('article',null,'power-card');card.dataset.person=v.id;const h=el('h2');h.append(link(v.label,v.url+'&'+new URLSearchParams(view)));card.append(el('p',v.periods.map(period).join(' · '),'eyebrow'),h,el('p',v.native,'power-native'),el('p',v.summary),el('p',[...new Set(v.roles.map(r=>index.kinds[r.kind]))].join(' · '),'power-note'),el('p',v.roles.length+'段编订角色 · '+v.actions.length+'项行动 · '+(v.identity.kind==='new'?'独立补充人物':'复用已有人物身份'),'power-note'));grid.append(card);});
      if(!rows.length)grid.append(el('p','没有符合条件的已收录人物。可尝试其他译名、角色或年代。','power-empty'));
    };
    const navigate=()=>{location.hash=hash({q:q.value.trim(),period:ps.value,role:rs.value,status:ss.value,from:from.value.trim(),to:to.value.trim()});};
    form.onsubmit=e=>{e.preventDefault();navigate();};ps.onchange=rs.onchange=ss.onchange=navigate;q.oninput=run;clear.onclick=()=>{location.hash='';if(!location.hash){p={};q.value=from.value=to.value='';ps.value=rs.value=ss.value='';run();q.focus();}};run();
  }
  function detail(id,p){
    const v=index.people[id],back={...p};delete back.person;delete back.action;delete back.section;const a=el('a','← 权力人物目录');a.href=hash(back);main.append(a);
    if(!v){document.title='人物地址有误 · FASTI';main.append(el('h1','找不到这份权力档案'),el('p','此稳定ID尚未收录。请返回目录或使用全站搜索。'));return;}
    main.dataset.person=id;document.title=v.label+' · 实际权力与摄政 · FASTI';main.append(el('p',v.periods.map(period).join(' · '),'eyebrow'),el('h1',v.label),el('p',v.native,'power-native'),el('p',v.aliases.join(' · '),'power-note'));
    window.FastiStories?.mount('person','power:'+id,main);
    const intro=el('div',null,'power-reading');intro.append(el('p',v.summary,'power-intro'),el('p',v.caution),evidence(v.references,'身份、概述与研究范围'));main.append(intro);
    if(v.identity.kind==='new')main.append(el('p','独立补充人物；本专题收录不授予帝号，不进入皇帝名录。','power-note'));
    else main.append(el('p','沿用已确认的人物身份；下面的角色与行动补充原档案，原帝号／官职任期保持原卷口径。','power-note'));
    const nav=el('nav',null,'power-nav');nav.setAttribute('aria-label','本人的原档案与专题');v.profiles.forEach(q=>nav.append(link(period(q.period)+' · 本人原档案 ↗',q.url)));v.topics.forEach(t=>nav.append(link(t.label+' · 本人关系节点 ↗',t.url)));main.append(nav);
    for(const q of v.identity.distinctFrom||[])main.append(link('同名辨识：另一位'+q.label+' · '+q.note+' ↗',q.url));
    const toc=el('nav',null,'power-nav');toc.setAttribute('aria-label','人物档案章节');[['roles','角色阶段'],['actions','行动与证据'],['connections','人物互链'],['export','分享与资料']].forEach(([section,label])=>{const a=el('a',label);a.href=hash({...p,section,action:''});toc.append(a);});main.append(toc);
    const roles=el('section',null,'power-section');roles.id='roles';roles.append(el('h2','角色、实际作用与限制'),el('p','阶段按原材料精度排列。观察窗口只说明所读材料覆盖的年份，不代表完整任期；同年不意味着全年共治。','power-note'));
    const ol=el('ol',null,'power-chronology');[...v.roles].sort((a,b)=>(a.date.start??Infinity)-(b.date.start??Infinity)).forEach(r=>{const li=el('li',null,'power-role');li.dataset.role=r.id;li.append(dates(r.date),el('h3',r.label+' · '+index.kinds[r.kind]),el('p','作用：'+r.powers),el('p','限制与口径：'+r.limits),evidence(r.references));ol.append(li);});roles.append(ol);main.append(roles);
    const actions=el('section',null,'power-section');actions.id='actions';actions.append(el('h2','具体行动与逐项证据'),el('p','行动由编辑逐项列入；没有把任期内的全部事件自动归于本人。未定年行动保留未知。','power-note'));
    const actFilter=el('label','筛选本人的行动记载'),as=el('select');as.id='action-status';as.append(new Option('全部行动',''));Object.entries(index.statuses).forEach(([k,v])=>as.append(new Option(v,k)));actFilter.append(as);actions.append(actFilter);const list=el('div');actions.append(list);
    const renderActions=()=>{list.replaceChildren();v.actions.filter(a=>!as.value||a.status===as.value).sort((a,b)=>(a.date.start??Infinity)-(b.date.start??Infinity)).forEach(a=>{const box=el('article',null,'power-action'+(p.action===a.id?' is-selected':''));box.id='action-'+a.id;box.dataset.action=a.id;box.append(dates(a.date),el('h3',a.title),el('p',index.statuses[a.status],'power-note'),el('p',a.text));if(a.caution)box.append(el('p',a.caution));
      const nav=el('nav',null,'power-nav');if(a.date.start!==null){[...new Set([a.date.start,a.date.end])].forEach(y=>nav.append(link(when(y)+' · 原卷年度 ↗',E.yearURL(a.period,y))));}else box.append(el('p','确年未核定，没有据人物生涯补造年度入口。','power-note'));
      if(a.event){const e=index.events[a.event.id];nav.append(link((a.event.relation==='context'?'相关年度背景：':'同一事项：')+e.title+' ↗',e.url));box.append(el('p',a.event.note,'power-note'));}const stable=el('a','此行动的稳定链接');stable.href=hash({...p,person:id,action:a.id,section:''});nav.append(stable);box.append(nav,evidence(a.references));list.append(box);});if(!list.children.length)list.append(el('p','此人尚无该记载状态的行动。','power-empty'));};as.onchange=renderActions;renderActions();main.append(actions);
    const connections=el('section',null,'power-section');connections.id='connections';connections.append(el('h2','相关人物与原档案'));
    v.connections.forEach(q=>{const box=el('article');box.append(link(q.label+' · 原卷人物 ↗',q.url),el('p',q.note),evidence(q.references,'此人物关联的依据'));connections.append(box);});
    if(v.related.length){const nav=el('nav',null,'power-nav');v.related.forEach(id=>nav.append(link(index.people[id].label+' · 权力档案 ↗',index.people[id].url)));connections.append(el('p','继续对读本专题选录人物；此导航不额外推导亲属或政治联盟。','power-note'),nav);}if(!v.connections.length&&!v.related.length)connections.append(el('p','本次没有在所读材料之外增编人物关系。'));main.append(connections);
    const exportBox=el('section',null,'power-section');exportBox.id='export';exportBox.append(el('h2','分享、引用与带出处资料'));const canonical=new URL('../'+v.url,location.href).href;
    const citation=v.label+'，FASTI · 罗马历史纪年，实际权力与摄政，稳定ID '+v.id+'，资料版本 '+index.version+'，'+canonical+'，访问日期 '+new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date())+'。CC BY-SA 4.0；原文、译本与研究各自保留版权。';
    const area=el('textarea',null,'power-export');area.readOnly=true;area.value=citation;area.setAttribute('aria-label','可复制的档案引用与链接');const status=el('p');status.setAttribute('role','status');const buttons=el('div',null,'power-actions');
    for(const [label,value] of [['复制档案引用',()=>citation],['复制当前视图链接',()=>location.href]]){const b=el('button',label);b.onclick=async()=>{const text=value();try{await navigator.clipboard.writeText(text);status.textContent='已复制。';}catch{area.value=text;area.focus();area.select();status.textContent='已选中文字，可手动复制。';}};buttons.append(b);}
    const download=el('button','下载人物与出处 JSON');download.onclick=()=>{const used=[...new Set([...v.references,...v.roles.flatMap(r=>r.references),...v.actions.flatMap(a=>a.references),...v.connections.flatMap(q=>q.references)].map(r=>r.source))],eventIds=[...new Set(v.actions.filter(a=>a.event).map(a=>a.event.id))];const value={schemaVersion:1,version:index.version,license:index.license,attribution:'FASTI · 罗马历史纪年；文字与结构化数据 CC BY-SA 4.0；原文与研究版权见各来源。',url:canonical,method:index.method,person:v,kinds:index.kinds,statuses:index.statuses,dateMeanings:index.dateMeanings,sources:Object.fromEntries(used.map(id=>[id,index.sources[id]])),events:Object.fromEntries(eventIds.map(id=>[id,index.events[id]]))};const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='power-'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};buttons.append(download);exportBox.append(area,buttons,status,el('p','资料版本：'+index.version+' · '+Object.keys(index.people).length+'位人物为本次研究范围，不宣称穷尽罗马政治参与者。','power-note'));main.append(exportBox);
  }
  async function route(){const current=++serial;main.removeAttribute('data-person');main.setAttribute('aria-busy','true');main.replaceChildren(el('p','正在查阅权力档案……'));
    try{index=await P.load();if(current!==serial)return;const p=params();main.replaceChildren();if(p.person)detail(p.person,p);else directory(p);main.focus({preventScroll:true});window.scrollTo(0,0);const target=p.action?document.getElementById('action-'+p.action):p.section?document.getElementById(p.section):null;if(target&&main.contains(target)){target.tabIndex=-1;target.scrollIntoView({block:'start'});target.focus({preventScroll:true});}else if(p.action)main.prepend(el('p','这项行动定位尚未收录；已显示人物档案，可继续查阅。','power-note'));
    }catch{if(current!==serial)return;main.replaceChildren(el('h1','权力档案暂时无法载入'),el('p','网络、超时或资料格式异常。可在此重试，或从页头继续阅读原卷。'));const b=el('button','重新载入权力档案');b.id='retry-power';b.onclick=route;main.append(b);}
    finally{if(current===serial){main.dataset.renderedHash=location.hash;main.setAttribute('aria-busy','false');}}}
  document.querySelector('#theme-button').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('fasti-theme',t);}catch{}};
  addEventListener('hashchange',route);route();
})();
