'use strict';
// Shared, independently cached event text for the event and place archives.
window.FastiEventData=(()=>{
  let index,pending;const E=window.FastiSearch;
  const point=p=>p?E.when(p.year)+(p.month?`${p.month}月`:'')+(p.day?`${p.day}日`:''):'未定年';
  function dates(d){
    if(d.extent==='undated')return '绝对年代未定';
    const range=JSON.stringify(d.start)===JSON.stringify(d.end)?point(d.start):point(d.start)+' — '+point(d.end);
    return range+({'point':'','span':' · 持续过程','window':' · 日期窗口','context':' · 年度归置（非确定发生日）'}[d.extent]||'');
  }
  function valid(v){
    const text=s=>typeof s==='string'&&s.length>0,year=y=>Number.isSafeInteger(y)&&y!==0;
    const ref=r=>r&&text(r.label)&&/^https:\/\//.test(r.url)&&text(r.locator)&&text(r.claim)&&['direct','indirect','inherited'].includes(r.consultation);
    const evidence=(p,id)=>p.evidence?.entry===id&&text(p.evidence.note)
      &&/^data-source\/events\/(?:links|metadata|events)\.json$/.test(p.evidence.source)
      &&(p.evidence.kind==='event-text'?text(p.evidence.quote):p.evidence.kind==='inherited-editorial'&&p.evidence.quote===null)
      &&Array.isArray(p.references)&&p.references.length>0&&p.references.every(ref);
    const kinds=['event','annual-summary','background','tradition'];
    const range=r=>r&&[r.fromYear,r.toYear].every(y=>y===null||year(y))&&(r.fromYear===null||r.toYear===null||r.fromYear<=r.toYear);
    const place=p=>['approximate','disputed','unlocated'].includes(p.status)&&range(p.coverage)&&Array.isArray(p.names)&&p.names.every(n=>text(n.label)&&range(n))
      &&Array.isArray(p.locations)&&p.locations.every(l=>text(l.id)&&Array.isArray(l.coordinates)&&l.coordinates.length===2&&l.coordinates.every(Number.isFinite)&&Math.abs(l.coordinates[0])<=180&&Math.abs(l.coordinates[1])<=90&&range(l)&&['city','site','region'].includes(l.precision)&&text(l.note))
      &&Array.isArray(p.external)&&p.external.every(x=>/^https:\/\/pleiades.stoa.org\/places\/\d+$/.test(x.url))&&Array.isArray(p.connections)&&p.connections.every(c=>v.places[c.place]&&text(c.note));
    const dossier=e=>{
      if(!Array.isArray(e.references)||!e.references.length||!e.references.every(r=>r&&text(r.id)&&text(r.scope)&&v.sourceKinds?.[r.sourceKind]&&v.access?.[r.access])||new Set(e.references.map(r=>r.id)).size!==e.references.length)return false;
      if(!e.references.filter(r=>r.access!=='legacy').every(r=>ref(r)&&text(r.checked)&&/^\d{4}-\d{2}-\d{2}$/.test(r.checked)&&text(r.author)&&text(r.edition)&&text(r.limitations)
          &&(r.consultation==='direct'?['text','excerpt','abstract','bibliography'].includes(r.access):r.consultation==='indirect'&&r.access==='indirect'&&text(r.via?.label)&&/^https:\/\//.test(r.via?.url)&&text(r.via?.locator))))return false;
      if(e.evidence===null)return e.references.every(r=>r.access==='legacy');
      const d=e.evidence,ids=new Set(e.references.map(r=>r.id)),uses=r=>Array.isArray(r)&&r.length>0&&r.every(id=>ids.has(id));
      if(!d||!text(d.scope)||!Array.isArray(d.claims)||!d.claims.length||!Array.isArray(d.disputes))return false;
      return d.claims.every(c=>text(c.id)&&text(c.text)&&text(c.note)&&uses(c.references))&&new Set(d.claims.map(c=>c.id)).size===d.claims.length
        &&d.disputes.every(d=>text(d.id)&&text(d.question)&&text(d.rationale)&&text(d.limits)&&Array.isArray(d.positions)&&d.positions.length>=2&&d.positions.some(p=>p.id===d.adopted)
          &&new Set(d.positions.map(p=>p.id)).size===d.positions.length&&d.positions.every(p=>text(p.id)&&text(p.label)&&text(p.statement)&&uses(p.references)))
        &&new Set(d.disputes.map(d=>d.id)).size===d.disputes.length;
    };
    return v?.schemaVersion===1&&text(v.version)&&Array.isArray(v.periods)&&v.periods.length===5&&v.kinds&&v.topics&&v.certainties&&v.entries&&v.places&&v.aliases&&v.byYear&&v.byPerson&&v.byPlace
      &&Object.entries(v.entries).length>0&&Object.entries(v.entries).every(([id,e])=>e?.id===id&&text(e.title)&&text(e.text)&&kinds.includes(e.recordKind)&&v.periods.some(p=>p.id===e.period)&&/^events\/#event=/.test(e.url)
      &&e.date&&text(e.date.note)&&['point','span','window','context','undated'].includes(e.date.extent)&&v.certainties[e.date.certainty]&&Array.isArray(e.date.qualifiers)
      &&(e.date.extent==='undated'?e.date.start===null&&e.date.end===null:year(e.date.start?.year)&&year(e.date.end?.year))
      &&Array.isArray(e.topics)&&e.topics.every(t=>v.topics[t])&&Array.isArray(e.people)&&e.people.every(p=>text(p.label)&&text(p.role)&&text(p.basis)&&/^(kingdom|republic|empire|divided-empire|byzantine)\/#person=/.test(p.url))
      &&Array.isArray(e.places)&&e.places.every(p=>v.places[p])&&Array.isArray(e.relations)&&e.relations.every(r=>v.entries[r.event]&&['part-of','expands'].includes(r.type))
      &&Array.isArray(e.years)&&e.years.every(r=>year(r.year)&&/^(kingdom|republic|empire|divided-empire|byzantine)\/#year=/.test(r.url))
      &&Array.isArray(e.origins)&&e.origins.every(o=>/^(kingdom|republic|empire|divided-empire|byzantine)\/#(?:year|person)=/.test(o.url))
      &&Array.isArray(e.spans)&&e.spans.every(s=>Array.isArray(s)&&s.length===2&&s.every(year)&&s[0]<=s[1])
      &&Array.isArray(e.references)&&e.references.length&&e.references.every(ref))
      &&v.byGlobalPerson&&Object.entries(v.places).every(([id,p])=>p.id===id&&/^[a-z][a-z0-9-]*$/.test(id)&&text(p.label)&&Array.isArray(p.aliases)&&p.aliases.every(text)&&text(p.note)&&Array.isArray(p.references)&&p.references.length&&p.references.every(ref)&&place(p))
      &&Object.values(v.entries).every(e=>Array.isArray(e.placeRelations)&&e.placeRelations.length===e.places.length&&e.placeRelations.every(p=>e.places.includes(p.place)&&v.places[p.place]&&['setting','subject','mentioned'].includes(p.role)&&text(p.basis)&&p.url==='places/#place='+p.place&&evidence(p,e.id))&&e.people.every(p=>['participant','subject','mentioned'].includes(p.role)&&evidence(p,e.id)&&(!p.globalUrl||/^people\/#person=[a-z0-9-]+$/.test(p.globalUrl))))
      &&[v.byYear,v.byPerson,v.byPlace,v.byGlobalPerson].every(map=>Object.values(map).every(ids=>Array.isArray(ids)&&ids.every(id=>v.entries[id])))
      &&v.sourceKinds&&v.access&&Object.values(v.entries).every(dossier)
      &&Object.values(v.aliases).every(a=>v.entries[a.target]);
  }
  async function load(){
    if(index)return index;
    if(!pending)pending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try {const r=await fetch('../data/events/index.json',{signal:controller.signal});if(!r.ok)throw Error();const v=await r.json();if(!valid(v))throw Error();index=v;return v;}finally{clearTimeout(timer);pending=null;}
    })();return pending;
  }
  return {load,dates,valid};
})();
