'use strict';
(() => {
  const D=window.FastiEventData,E=window.FastiSearch,main=document.querySelector('#content');
  let index,version=0;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const hash=p=>'#'+new URLSearchParams(p);
  const link=(text,url)=>{const n=el('a',text);n.href='../'+url;return n;};
  const period=id=>index.periods.find(p=>p.id===id)?.title||id;
  const roles={setting:'发生／行动地点',subject:'事件对象地点',mentioned:'仅被提及'};
  function references(refs){
    const list=el('ol',null,'event-citations');
    refs.forEach(r=>{const li=el('li'),a=el('a',r.label+' ↗');a.href=r.url;a.target='_blank';a.rel='noopener';li.append(a,el('p','定位：'+r.locator),el('p','支持：'+r.claim),el('p',r.consultation==='inherited'?'沿用既有引用 · 本PR未重新核读':`既有资料记录：${r.consultation==='direct'?'直接查阅':'间接引述'} · ${r.checked}`,'event-note'));list.append(li);});return list;
  }
  function directory(params){
    document.title='地点档案 · FASTI 罗马历史纪年';
    main.append(el('p','LOCA · 从地点读历史','eyebrow'),el('h1','一处地点，不止一个年份。'),el('p','查找已编订的地点身份、异名、明确关联记事与相关年度。此目录不推断疆域控制；地点角色与原文依据随每条关系保留。','event-intro'));
    const form=el('form',null,'event-tools event-query'),label=el('label','查找地点或异名'),input=el('input'),button=el('button','查找');input.id='place-query';input.type='search';input.name='q';input.maxLength=160;input.value=params.get('q')||'';input.placeholder='罗马、Constantinople、Nicaea…';label.htmlFor=input.id;button.type='submit';form.append(label,input,button);main.append(form);
    const status=el('p',null,'event-status'),grid=el('div',null,'event-results');status.setAttribute('role','status');main.append(status,grid);
    const filter=()=>{const terms=input.value.trim().split(/\s+/).map(E.normalize).filter(Boolean),rows=Object.values(index.places).filter(p=>terms.every(t=>E.normalize([p.label,...p.aliases].join(' ')).includes(t)));
      status.textContent=`找到 ${rows.length} / ${Object.keys(index.places).length} 处已编订地点。`;grid.replaceChildren();
      rows.forEach(p=>{const card=el('article',null,'event-card'),h=el('h2');card.dataset.placeId=p.id;h.append(link(p.label+' ↗','places/'+hash({place:p.id})));card.append(h,el('p',p.aliases.join(' · ')),el('p',`${index.byPlace[p.id].length} 条明确关联记事`),el('p',p.note));grid.append(card);});
      if(!rows.length)grid.append(el('p','没有匹配的已编订地点。可尝试其他拼法；目录尚未覆盖所有历史地点。'));
    };
    input.oninput=filter;form.onsubmit=e=>{e.preventDefault();location.hash=input.value.trim()?hash({q:input.value.trim()}):'';};filter();
  }
  function detail(id){
    main.append(link('← 地点目录','places/'));
    const p=index.places[id];if(!p){document.title='地点地址有误 · FASTI';main.append(el('h1','找不到这份地点档案'),el('p','此地点ID尚未收录。请返回目录查找。'));return;}
    document.title=p.label+' · 地点档案 · FASTI';main.dataset.placeId=id;
    main.append(el('p','LOCA · 地点档案','eyebrow'),el('h1',p.label),el('p',p.aliases.join(' · '),'identity-names'),el('p',p.note,'event-intro'),el('p','这里只汇集已编订关联，不表示此地完整历史；时间范围与角色属于各条记事。未提供经核验坐标的地点仍可阅读。','event-note'));
    const related=index.byPlace[id].map(k=>index.entries[k]).sort((a,b)=>(a.spans[0]?.[0]??Infinity)-(b.spans[0]?.[0]??Infinity)||a.id.localeCompare(b.id));
    main.append(el('h2',`明确关联的事件与记事 · ${related.length}条`),link('在事件目录组合筛选 ↗','events/'+hash({place:id})));
    const list=el('ol',null,'place-events');
    related.forEach(e=>{const edge=e.placeRelations.find(r=>r.place===id),li=el('li');li.dataset.eventId=e.id;
      li.append(link(e.title+' ↗',e.url),el('p',index.kinds[e.recordKind]+' · '+period(e.period)+' · '+D.dates(e.date)),el('p',roles[edge.role]+' · '+edge.basis));
      if(edge.evidence.quote)li.append(el('blockquote',edge.evidence.quote));
      const details=el('details');details.append(el('summary','关系依据与沿用出处'),el('p',edge.evidence.note),el('p','编订资料：'+edge.evidence.source+' · '+edge.evidence.entry),references(edge.references));li.append(details);
      const people=el('p','本条关联人物：');if(e.people.length){e.people.forEach(r=>people.append(link(r.label+' ↗',r.url),el('span',' · ')));li.append(people);}list.append(li);
    });main.append(list);if(!related.length)main.append(el('p','尚未编订事件关系。'));
    const years=new Map();related.forEach(e=>e.years.forEach(y=>years.set(y.period+':'+y.year,y)));
    main.append(el('h2','相关年度'),el('p','按记事日期范围关联；日期窗口不表示连续活动，年度摘要也不等于发生在该地的一整年。跨卷交界入口分别保留。','event-note'));
    const yearList=el('ul',null,'event-year-links');[...years.values()].sort((a,b)=>a.year-b.year||a.period.localeCompare(b.period)).forEach(y=>{const li=el('li');li.append(link(E.when(y.year)+' · '+period(y.period)+' ↗',y.url));yearList.append(li);});main.append(yearList);
    if(!years.size)main.append(el('p','现有关联未确定绝对年代，不补造年度；可经记事返回原卷传统叙事。'));
    main.append(el('h2','地点身份与沿用出处'),references(p.references));
    const canonical=new URL('../places/'+hash({place:id}),location.href).href,actions=el('div',null,'event-actions'),area=el('textarea',null,'event-citation-text'),notice=el('p');area.readOnly=true;area.value=canonical;area.setAttribute('aria-label','地点稳定链接');notice.setAttribute('role','status');
    const copy=el('button','复制地点链接');copy.onclick=async()=>{try{await navigator.clipboard.writeText(canonical);notice.textContent='已复制。';}catch{area.focus();area.select();notice.textContent='已选中链接，可手动复制。';}};
    const download=el('button','下载地点与关联 JSON');download.onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:index.version,license:index.license,place:p,events:related},null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='place-'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};actions.append(copy,download);main.append(area,actions,notice);
  }
  async function route(){const current=++version;main.removeAttribute('data-place-id');main.setAttribute('aria-busy','true');main.replaceChildren(el('p','正在查阅地点档案……'));
    try{index=await D.load();if(current!==version)return;main.replaceChildren();const p=new URLSearchParams(location.hash.slice(1));if(p.has('place'))detail(p.get('place'));else directory(p);main.focus({preventScroll:true});window.scrollTo(0,0);}
    catch{if(current!==version)return;main.replaceChildren(el('h1','地点档案暂时无法载入'),el('p','网络、超时或资料格式异常。各卷原档案仍可独立阅读。'));const b=el('button','重新载入地点档案');b.id='retry-places';b.onclick=route;main.append(b);}
    finally{if(current===version){main.dataset.renderedHash=location.hash;main.setAttribute('aria-busy','false');}}
  }
  document.querySelector('#theme-button').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('fasti-theme',t);}catch{}};
  addEventListener('hashchange',route);route();
})();
