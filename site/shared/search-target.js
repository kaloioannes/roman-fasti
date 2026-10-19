'use strict';
// Stable event identity links plus compatibility for old positional hints.
window.FastiSearchTarget = (() => {
  let navigation, pending;
  const periods=['kingdom','republic','empire','divided-empire','byzantine'];
  function localLinks(period) {
    document.querySelectorAll('.event-row[data-event-id],.event[data-event]').forEach(row=>{
      if(row.querySelector('.event-archive-link'))return;
      const id=row.dataset.eventId||row.dataset.event;
      const a=document.createElement('a');a.className='event-archive-link';a.textContent='独立档案与引用 ↗';
      a.href='../events/#event='+encodeURIComponent(period+':'+id);row.append(a);
    });
  }
  async function related(period,hash) {
    const params=new URLSearchParams(hash.slice(1)),raw=params.get('year'),person=params.get('person');
    if(!raw&&!person)return;
    const parent=document.querySelector('main:not([hidden])');if(!parent)return;
    parent.querySelectorAll('.event-related-links').forEach(n=>n.remove());
    const box=document.createElement('aside');box.className='event-related-links';box.setAttribute('aria-label','关联的独立事件');parent.append(box);
    const render=async()=>{
      box.replaceChildren();
      try {
        if(!navigation){
          if(!pending)pending=(async()=>{
            const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
            try {const r=await fetch('../data/events/navigation.json',{signal:controller.signal});if(!r.ok)throw Error();const v=await r.json();
              if(v.schemaVersion!==1||!v.entries||!v.byYear||!v.byPerson||Object.values(v.entries).some(e=>typeof e.title!=='string'||!/^events\/#event=/.test(e.url))
                ||[v.byYear,v.byPerson].some(map=>Object.values(map).some(ids=>!Array.isArray(ids)||ids.some(id=>!v.entries[id]))))throw Error();
              navigation=v;
            } finally {clearTimeout(timer);pending=null;}
          })();await pending;
        }
        if(location.hash!==hash||!box.isConnected)return;
        const year=period==='republic'?-Number(raw):Number(raw);
        const ids=person?navigation.byPerson[period+':'+person]:navigation.byYear[period+':'+year];
        if(!ids?.length){box.remove();return;}
        const h=document.createElement('h2');h.textContent='关联的独立事件';box.append(h);
        for(const id of ids){const e=navigation.entries[id];if(!e)throw Error();const a=document.createElement('a');a.href='../'+e.url;a.textContent=e.title+' ↗';box.append(a);}
      } catch {
        if(location.hash!==hash||!box.isConnected)return;
        box.textContent='独立事件链接暂未载入。';const b=document.createElement('button');b.textContent='重试事件链接';b.onclick=render;box.append(b);
      }
    };render();
  }
  function mount() {
    const hash=location.hash, focus=new URLSearchParams(hash.slice(1)).get('focus');
    const period=location.pathname.split('/').find(p=>periods.includes(p));
    if(period){localLinks(period);related(period,hash);}
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
  return {mount, events:localLinks};
})();
