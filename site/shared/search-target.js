'use strict';
// Stable event identity links plus compatibility for old positional hints.
window.FastiSearchTarget = (() => {
  let navigation, pending;
  const periods=['kingdom','republic','empire','divided-empire','byzantine'];
  const roles={participant:'直接参与',subject:'事件主体',mentioned:'仅被提及',setting:'发生／行动地点'};
  const el=(tag,text)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;return n;};
  const link=(text,url)=>{const a=el('a',text);a.href='../'+url;return a;};
  function guardedContent(box){
    let hidden=document.querySelector('#spoiler-switch')?.checked;
    if(hidden===undefined)try{hidden=localStorage.getItem('fasti-spoiler-v2')==='true';}catch{}
    if(!hidden)return box;
    const details=el('details');details.append(el('summary','展开明确关联的事件与记事'));box.append(details);return details;
  }
  async function loadNavigation(){
    if(navigation)return navigation;
    if(!pending)pending=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try{
        const r=await fetch('../data/events/navigation.json',{signal:controller.signal});if(!r.ok)throw Error();const v=await r.json();
        const edge=p=>p&&typeof p.label==='string'&&roles[p.role]&&typeof p.basis==='string';
        if(v.schemaVersion!==1||!v.entries||!v.byYear||!v.byPerson||!v.byGlobalPerson||Object.values(v.entries).some(e=>typeof e.title!=='string'||!/^events\/#event=/.test(e.url)
          ||(e.hasEvidence&&(!/^events\/#event=/.test(e.evidenceUrl)||!e.evidenceUrl.includes('&evidence=claim%3A')))
          ||!Array.isArray(e.people)||e.people.some(p=>!edge(p)||!periods.includes(p.period)||!new RegExp('^'+p.period+'/#[p]erson=').test(p.url))
          ||!Array.isArray(e.placeRelations)||e.placeRelations.some(p=>!edge(p)||!/^places\/#place=[a-z0-9-]+$/.test(p.url)))
          ||[v.byYear,v.byPerson,v.byGlobalPerson].some(map=>Object.values(map).some(ids=>!Array.isArray(ids)||ids.some(id=>!v.entries[id]))))throw Error();
        navigation=v;return v;
      }finally{clearTimeout(timer);pending=null;}
    })();return pending;
  }
  function inlineLinks(period,parent){
    parent.querySelectorAll('.event-row[data-event-id],.event[data-event]').forEach(row=>{
      if(row.querySelector('.event-inline-links')||row.querySelector('.event-reveal'))return;
      const e=navigation.entries[period+':'+(row.dataset.eventId||row.dataset.event)];if(!e||(!e.hasEvidence&&!e.people.length&&!e.placeRelations.length))return;
      const box=el('div');box.className='event-inline-links';box.setAttribute('aria-label','此条记事的关联与证据');
      for(const [label,edges] of [['人物',e.people],['地点',e.placeRelations]]){
        if(!edges.length)continue;const line=el('p',label+'：');
        edges.forEach(p=>{line.append(link(p.label,p.url),el('small',' · '+(label==='地点'&&p.role==='subject'?'事件对象地点':roles[p.role])+'；'));});box.append(line);
      }
      if(e.people.length||e.placeRelations.length)box.append(link('查看逐项关系依据 ↗',e.url));row.append(box);
      if(e.hasEvidence)box.append(link('论断证据与查阅范围 ↗',e.evidenceUrl));
    });
  }
  function localLinks(period) {
    document.querySelectorAll('.event-row[data-event-id],.event[data-event]').forEach(row=>{
      if(row.querySelector('.event-archive-link'))return;
      const id=row.dataset.eventId||row.dataset.event;
      const a=document.createElement('a');a.className='event-archive-link';a.textContent='独立档案与引用 ↗';
      a.href='../events/#event='+encodeURIComponent(period+':'+id);row.append(a);
    });
    if(navigation)inlineLinks(period,document);
  }
  async function related(period,hash) {
    document.querySelectorAll('.event-related-links').forEach(n=>n.remove());
    const params=new URLSearchParams(hash.slice(1)),raw=params.get('year'),person=params.get('person');
    if(!raw&&!person)return;
    const parent=document.querySelector('main:not([hidden])');if(!parent)return;
    const box=document.createElement('aside');box.className='event-related-links';box.setAttribute('aria-label','关联的独立事件');parent.append(box);
    const render=async()=>{
      box.replaceChildren();
      try {
        await loadNavigation();
        if(location.hash!==hash||!box.isConnected)return;
        inlineLinks(period,parent);
        const year=period==='republic'?-Number(raw):Number(raw);
        const ids=person?navigation.byPerson[period+':'+person]:navigation.byYear[period+':'+year];
        if(!ids?.length){if(person){box.append(el('h2','明确关联的事件与记事'),el('p','尚未编订此人的明确事件关系。在位期间发生的记事不能自动视为本人参与。'));}else box.remove();return;}
        const h=document.createElement('h2');h.textContent=person?'明确关联的事件与记事':'关联的独立事件与已编订记事';box.append(h);
        const content=guardedContent(box);
        if(person)content.append(el('p','直接参与、事件主体与仅被提及分别标示。未列出表示尚未编订，不代表没有相关行动；在位期间发生不能作为参与证据。'));
        for(const id of ids){const e=navigation.entries[id];if(!e)throw Error();const item=el('div');item.append(link(e.title+' ↗',e.url));
          if(person)e.people.filter(p=>p.period===period&&p.person===person).forEach(p=>item.append(el('p',roles[p.role]+' · '+p.basis)));content.append(item);}
      } catch {
        if(location.hash!==hash||!box.isConnected)return;
        box.textContent='独立事件链接暂未载入。';const b=document.createElement('button');b.textContent='重试事件链接';b.onclick=render;box.append(b);
      }
    };render();
  }
  function globalPerson(id,host){
    const slot=el('aside');slot.className='event-related-links';slot.setAttribute('aria-label','跨卷明确关联事件');host.append(slot);
    async function render(){
      slot.replaceChildren();
      try{const v=await loadNavigation();if(!slot.isConnected)return;
        const ids=v.byGlobalPerson[id]||[];slot.append(el('h2','跨卷明确关联的事件与记事'),el('p','仅汇总人工确认属于本人的卷内关系；同一事件只列一次。在位背景不算直接参与。'));
        if(!ids.length)slot.append(el('p','尚未编订明确关联。'));
        const content=guardedContent(slot);
        for(const key of ids){const e=v.entries[key],item=el('div');item.append(link(e.title+' ↗',e.url));
          e.people.filter(p=>p.globalId===id).forEach(p=>item.append(el('p',p.label+' · '+roles[p.role]+' · '+p.basis)));content.append(item);}
      }catch{if(!slot.isConnected)return;slot.append(el('p','事件关联暂未载入。'));const b=el('button','重试事件链接');b.onclick=render;slot.append(b);}
    }render();
  }
  function mount() {
    const hash=location.hash, focus=new URLSearchParams(hash.slice(1)).get('focus');
    const period=location.pathname.split('/').find(p=>periods.includes(p));
    if(period){localLinks(period);related(period,hash);
      const p=new URLSearchParams(hash.slice(1)),y=Number(p.get('year'));
      if(p.has('year')&&y){const host=period==='republic'?document.querySelector('#detail'):document.querySelector('#content');
        if(host){host.querySelectorAll('.narrative-links').forEach(n=>n.remove());window.FastiStories?.mount('year',period+':'+(period==='republic'?-y:y),host);}}
    }
    if(!focus)return;
    requestAnimationFrame(()=>{
      if(location.hash!==hash)return;
      let target;
      if(focus==='chapter')target=document.querySelector('.chapter-reading');
      else if(focus.startsWith('person:'))target=[...document.querySelectorAll('.official-card[data-person]')].find(n=>n.dataset.person===focus.slice(7));
      else if(focus.startsWith('event:')){
        const key=focus.slice(6);
        target=[...document.querySelectorAll('.event[data-event],.event-row[data-event-id]')].find(n=>(n.dataset.eventId||n.dataset.event)===key);
        if(!target && /^\d+$/.test(key))target=document.querySelectorAll('.event-row')[Number(key)];
      }
      if(!target)return;
      if(focus.startsWith('person:'))target.querySelectorAll('.bio-details').forEach(d=>d.open=true);
      target.tabIndex=-1;target.classList.add('search-target');
      target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true});
    });
  }
  return {mount, events:localLinks, globalPerson};
})();
