'use strict';
// Optional navigation hints from global search; not a new content-ID schema.
window.FastiSearchTarget = (() => {
  function mount() {
    const hash=location.hash, focus=new URLSearchParams(hash.slice(1)).get('focus');
    if(!focus)return;
    requestAnimationFrame(()=>{
      if(location.hash!==hash)return;
      let target;
      if(focus==='chapter')target=document.querySelector('.chapter-reading');
      else if(focus.startsWith('person:'))target=[...document.querySelectorAll('.official-card[data-person]')].find(n=>n.dataset.person===focus.slice(7));
      else if(focus.startsWith('event:')){
        const key=focus.slice(6);
        target=[...document.querySelectorAll('.event[data-event]')].find(n=>n.dataset.event===key);
        if(!target && /^\d+$/.test(key))target=document.querySelectorAll('.event-row')[Number(key)];
      }
      if(!target)return;
      if(focus.startsWith('person:'))target.querySelectorAll('.bio-details').forEach(d=>d.open=true);
      target.tabIndex=-1;target.classList.add('search-target');
      target.scrollIntoView({block:'center',behavior:'instant'});target.focus({preventScroll:true});
    });
  }
  return {mount};
})();
