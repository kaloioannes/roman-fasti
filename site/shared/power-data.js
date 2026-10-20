'use strict';
window.FastiPower = (() => {
  const cache={},pending={};
  const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n;};
  const link=(label,url)=>{const a=el('a',label);a.href='../'+url;return a;};
  const text=v=>typeof v==='string'&&v.trim().length>0;
  const year=y=>Number.isSafeInteger(y)&&y!==0&&y>=-753&&y<=1453;
  const date=d=>d&&text(d.label)&&['observed','tenure','occurrence'].includes(d.meaning)&&['year','range','circa','unknown'].includes(d.precision)&&(d.precision==='unknown'?d.start===null&&d.end===null:year(d.start)&&year(d.end)&&d.start<=d.end&&(d.precision!=='year'||d.start===d.end));
  function valid(v,full=true){try{
    if(v?.schemaVersion!==1||!v.people||!Object.keys(v.people).length||!['byPerson','byNode','byYear','byEvent'].every(k=>v[k]&&typeof v[k]==='object'))return false;
    if(!Object.entries(v.people).every(([id,p])=>p.id===id&&text(p.label)&&p.url==='power/#person='+id))return false;
    if(!Object.values(v.byNode).every(id=>v.people[id]))return false;
    if(!Object.values(v.byPerson).every(rows=>Array.isArray(rows)&&rows.every(r=>v.people[r.person]&&['self','associated'].includes(r.relation)&&text(r.note))))return false;
    const action=(pid,id)=>full?v.people[pid]?.actions?.find(a=>a.id===id):v.actions?.[pid+':'+id];
    if(!['byYear','byEvent'].every(k=>Object.values(v[k]).every(rows=>Array.isArray(rows)&&rows.every(r=>action(r.person,r.action)))))return false;
    if(!full)return Object.entries(v.actions||{}).every(([key,a])=>text(a.id)&&text(a.title)&&a.url===v.people[key.split(':')[0]]?.url+'&action='+a.id);
    const refs=rows=>Array.isArray(rows)&&rows.length>0&&rows.every(r=>v.sources[r.source]&&text(r.locator)&&text(r.supports));
    const profile=q=>q&&['kingdom','republic','empire','divided-empire','byzantine'].includes(q.period)&&text(q.person)&&q.url===q.period+'/#person='+q.person;
    return text(v.version)&&text(v.method)&&v.license==='CC BY-SA 4.0'&&v.kinds&&v.statuses&&v.dateMeanings&&Array.isArray(v.periods)&&v.periods.length===5&&v.events&&v.sources
      &&Object.values(v.sources).every(s=>['label','author','edition','scope','limitations','checked'].every(k=>text(s[k]))&&/^https:\/\//.test(s.url)&&['primary','research','reference'].includes(s.kind)&&['text','excerpt','indirect','inherited'].includes(s.access)&&(s.access!=='indirect'||(/^https:\/\//.test(s.via?.url)&&text(s.via?.locator))))
      &&Object.values(v.people).every(p=>text(p.native)&&text(p.summary)&&text(p.caution)&&Array.isArray(p.aliases)&&Array.isArray(p.periods)&&p.periods.every(id=>v.periods.some(q=>q.id===id))&&refs(p.references)
        &&['volume','dynasty','new'].includes(p.identity?.kind)&&Array.isArray(p.profiles)&&p.profiles.every(profile)&&Array.isArray(p.topics)&&p.topics.every(t=>t.url==='dynasties/#topic='+t.id+'&node='+p.identity.node)
        &&Array.isArray(p.connections)&&p.connections.every(q=>profile(q)&&text(q.note)&&refs(q.references))&&Array.isArray(p.related)&&p.related.every(id=>v.people[id])
        &&Array.isArray(p.roles)&&p.roles.length>0&&new Set(p.roles.map(r=>r.id)).size===p.roles.length&&p.roles.every(r=>text(r.id)&&text(r.label)&&v.kinds[r.kind]&&text(r.powers)&&text(r.limits)&&date(r.date)&&r.date.meaning!=='occurrence'&&refs(r.references))
        &&Array.isArray(p.actions)&&p.actions.length>0&&new Set(p.actions.map(a=>a.id)).size===p.actions.length&&p.actions.every(a=>text(a.id)&&text(a.title)&&text(a.text)&&v.statuses[a.status]&&(a.status==='attested'||text(a.caution))&&date(a.date)&&a.date.meaning==='occurrence'&&p.periods.includes(a.period)&&refs(a.references)&&a.url===p.url+'&action='+a.id&&(!a.event||(v.events[a.event.id]&&['context','same-action'].includes(a.event.relation)&&text(a.event.note)))))
      &&Object.entries(v.events).every(([id,e])=>e.id===id&&text(e.title)&&e.url==='events/#event='+encodeURIComponent(id));
  }catch{return false;}}
  async function load(full=true){
    const kind=full?'index':'navigation';if(cache[kind])return cache[kind];
    if(!pending[kind])pending[kind]=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try{const url=full?'../data/power/index.json':'../data/power/navigation.json',r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('Power request failed');const value=await r.json();if(!valid(value,full))throw Error('Invalid power data');return cache[kind]=value;}
      finally{clearTimeout(timer);delete pending[kind];}})();return pending[kind];
  }
  function mount(kind,key,host){
    if(!host)return;
    const id=kind+':'+key;
    let slot=Array.from(host.children).find(n=>n.classList.contains('power-links'));
    if(slot?.dataset.key===id)return;
    if(!slot){slot=el('section',null,'power-links');host.append(slot);}slot.dataset.key=id;slot.setAttribute('aria-label','实际权力与摄政关联');
    slot.replaceChildren();
    async function render(){try{const v=await load(false);if(!slot.isConnected||slot.dataset.key!==id)return;
      let rows=kind==='person'?(v.byPerson[key]||[]):kind==='node'?(v.byNode[key]?[{person:v.byNode[key],relation:'self',note:'本人的角色与行动'}]:[]):(v[kind==='year'?'byYear':'byEvent'][key]||[]);
      slot.replaceChildren();if(!rows.length){slot.hidden=true;return;}slot.hidden=false;
      slot.append(el('h2',kind==='year'?'本年编订的权力行动':'实际权力与摄政'));const ul=el('ul');
      rows.forEach(r=>{const p=v.people[r.person],li=el('li');if(r.action){const a=v.actions[r.person+':'+r.action];li.append(link(p.label+' · '+a.title+' ↗',a.url));}else li.append(link(p.label+' · '+(r.relation==='self'?'本人的角色与行动':'相关权力档案')+' ↗',p.url),el('p',r.note));ul.append(li);});slot.append(ul);
      if(kind==='event')slot.append(el('p','这些卡片关联本年度背景或同一事项；具体行动依据在卡片中单列，不能归入原事件的全部叙述。'));
    }catch{if(!slot.isConnected||slot.dataset.key!==id)return;slot.hidden=false;slot.replaceChildren(el('p','权力关联暂时无法载入，原档案仍可阅读。'));const b=el('button','重试权力关联');b.type='button';b.onclick=render;slot.append(b);}}
    render();
  }
  function people(profiles,host){if(!host)return;
    // Each original profile mounts separately only on its own page. Aggregated
    // identities deduplicate the exact same dossier through the compact index.
    const slot=el('div',null,'power-identity-links');host.append(slot);
    load(false).then(v=>{if(!slot.isConnected)return;const rows=[...new Map(profiles.flatMap(p=>v.byPerson[p.period+':'+p.person]||[]).map(r=>[r.person,r])).values()];if(!rows.length){slot.remove();return;}const h=el('h2','实际权力与摄政');slot.append(h);rows.forEach(r=>slot.append(link(v.people[r.person].label+' · '+(r.relation==='self'?'本人的角色与行动':'相关权力档案')+' ↗',v.people[r.person].url)));}).catch(()=>{if(slot.isConnected){slot.replaceChildren(el('p','权力关联暂时无法载入，原档案仍可阅读。'));const b=el('button','重试权力关联');b.onclick=()=>{slot.remove();people(profiles,host);};slot.append(b);}});
  }
  return {el,link,load,valid,mount,people,when:y=>y<0?'公元前'+(-y)+'年':'公元'+y+'年'};
})();
