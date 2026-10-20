'use strict';
window.FastiDynasties = (() => {
  const cache={},pending={};
  const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value!=null)n.textContent=value;if(cls)n.className=cls;return n;};
  const link=(label,url)=>{const a=el('a',label);a.href='../'+url;return a;};
  const text=v=>typeof v==='string'&&v.length>0;
  const year=v=>Number.isSafeInteger(v)&&v!==0&&v>=-753&&v<=1453;
  const types=['parent','marriage','adoption','designation','succession'];
  function valid(v,full=true){
    if(v?.schemaVersion!==1||!v.topics||!Object.keys(v.topics).length||!v.byPerson)return false;
    if(!Object.entries(v.topics).every(([id,t])=>t?.id===id&&text(t.label)&&t.url==='dynasties/#topic='+id&&typeof t.curated==='boolean'))return false;
    if(!Object.values(v.byPerson).every(ids=>Array.isArray(ids)&&ids.every(id=>v.topics[id])))return false;
    if(!full)return true;
    const refs=rs=>Array.isArray(rs)&&rs.length>0&&rs.every(r=>v.sources[r.source]&&text(r.locator)&&text(r.supports)&&(!r.url||/^https:\/\//.test(r.url)));
    return text(v.version)&&text(v.method)&&v.license==='CC BY-SA 4.0'&&v.nodes&&v.sources&&v.stages&&v.stageSources&&v.events&&v.stageKinds
      &&Array.isArray(v.periods)&&v.periods.length===5&&types.every(t=>text(v.types?.[t]))
      &&Object.values(v.sources).every(s=>text(s.label)&&/^https:\/\//.test(s.url)&&['text','excerpt','indirect','inherited'].includes(s.access))
      &&Object.entries(v.nodes).every(([id,n])=>n.id===id&&text(n.label)&&text(n.role)&&Array.isArray(n.profiles)&&n.profiles.every(p=>text(p.period)&&text(p.person)&&p.url===p.period+'/#person='+p.person)&&(!n.url||/^(people|kingdom|republic|empire|divided-empire|byzantine)\/#person=/.test(n.url))&&(!n.references.length||refs(n.references)))
      &&Object.values(v.topics).every(t=>text(t.note)&&v.periods.some(p=>p.id===t.period)&&Array.isArray(t.nodes)&&t.nodes.every(id=>v.nodes[id])
        &&Array.isArray(t.members)&&t.members.every(id=>t.nodes.includes(id))&&Array.isArray(t.classificationSources)&&t.classificationSources.every(id=>v.sources[id])
        &&Array.isArray(t.edges)&&t.edges.every(e=>text(e.id)&&types.includes(e.type)&&v.statuses[e.status]&&t.nodes.includes(e.from)&&t.nodes.includes(e.to)&&e.from!==e.to&&text(e.note)&&text(e.date?.label)&&['year','range','circa','unknown'].includes(e.date.precision)
          &&(e.date.precision==='unknown'?e.date.start===null&&e.date.end===null:year(e.date.start)&&year(e.date.end)&&e.date.start<=e.date.end)&&refs(e.references)&&(e.status==='attested'||text(e.dispute)))
        &&Array.isArray(t.sections)&&t.sections.every(s=>text(s.title)&&text(s.text)&&refs(s.references))
        &&Array.isArray(t.stages)&&t.stages.every(id=>v.stages[id]&&text(v.stages[id].label)&&v.stageKinds[v.stages[id].kind])
        &&['events','contextEvents','highlights'].every(k=>Array.isArray(t[k])&&t[k].every(id=>v.events[id]&&text(v.events[id].title)&&text(v.events[id].text)&&v.events[id].url==='events/#event='+encodeURIComponent(id)))
        &&Array.isArray(t.related)&&t.related.every(id=>v.topics[id])&&Array.isArray(t.spans)&&t.spans.every(s=>s.length===2&&s.every(year)));
  }
  async function load(full=true){
    const kind=full?'index':'navigation';if(cache[kind])return cache[kind];
    if(!pending[kind])pending[kind]=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try{const url=full?'../data/dynasties/index.json':'../data/dynasties/navigation.json';const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('Dynasty request failed');const v=await r.json();if(!valid(v,full))throw Error('Invalid dynasty data');cache[kind]=v;return v;}
      finally{clearTimeout(timer);delete pending[kind];}})();return pending[kind];
  }
  function mount(profiles,host){
    if(!host||host.querySelector('.dynasty-profile-links'))return;
    const slot=el('section',null,'dynasty-profile-links');slot.setAttribute('aria-label','王朝专题与有源关系');host.append(slot);
    async function render(){try{const v=await load(false);if(!slot.isConnected)return;const ids=[...new Set(profiles.flatMap(p=>v.byPerson[p.period+':'+p.person]||[]))];
      if(!ids.length){slot.remove();return;}slot.replaceChildren(el('h2','王朝专题与有源关系'));const nav=el('nav');nav.setAttribute('aria-label','人物相关王朝专题');
      ids.forEach(id=>nav.append(link(v.topics[id].label+' · '+(v.topics[id].curated?'关系图与档案':'成员与任期')+' ↗',v.topics[id].url)));slot.append(nav);
    }catch{if(!slot.isConnected)return;slot.replaceChildren(el('p','王朝关联暂时无法载入，原人物档案仍可阅读。'));const retry=el('button','重试王朝关联');retry.onclick=render;slot.append(retry);}}
    render();
  }
  return {el,link,load,valid,mount,when:y=>y<0?'公元前'+(-y)+'年':'公元'+y+'年'};
})();
