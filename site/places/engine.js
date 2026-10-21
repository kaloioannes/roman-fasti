'use strict';
// Pure selection: explicit relations and stated date intervals only.
((root,factory)=>{const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FastiPlaceEngine=api;})(typeof window==='object'?window:globalThis,()=>{
 const normalize=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const year=s=>/^-?\d+$/.test(String(s))&&Number.isSafeInteger(Number(s))&&Number(s)!==0&&Number(s)>=-753&&Number(s)<=1453?Number(s):null;
 const overlaps=(a,b,c,d)=>(b??Infinity)>=(c??-Infinity)&&(a??-Infinity)<=(d??Infinity);
 function select(data,filters={}){
  const a=filters.from??-753,b=filters.to??1453,terms=normalize(filters.q||'').trim().split(/\s+/).filter(Boolean);
  const events=Object.values(data.entries).filter(e=>(!filters.period||e.years.some(y=>y.period===filters.period)||e.period===filters.period)
   &&(!filters.topic||e.topics.includes(filters.topic))&&(!filters.place||e.placeRelations.some(r=>r.place===filters.place))
   &&(e.date.extent==='undated'?filters.undated!==false:e.spans.some(s=>overlaps(s[0],s[1],a,b)))
   &&terms.every(t=>normalize([e.title,...e.people.map(p=>p.label),...e.placeRelations.flatMap(r=>[r.label,...data.places[r.place].aliases])].join(' ')).includes(t)))
   .sort((x,y)=>(x.spans[0]?.[0]??Infinity)-(y.spans[0]?.[0]??Infinity)||x.id.localeCompare(y.id));
  const pins=new Map(),unmapped=[];
  for(const e of events){let mapped=false;
   // Undated traditions never get silently placed in a selected annual map.
   for(const r of e.placeRelations){
    if(filters.settingsOnly&&r.role==='mentioned')continue;
    const p=data.places[r.place];
    for(const loc of p.locations){
     if(e.date.extent==='undated'&&filters.undated===false)continue;
     const lo=Math.max(a,e.spans[0]?.[0]??a),hi=Math.min(b,e.spans[0]?.[1]??b);
     if(!overlaps(loc.fromYear,loc.toYear,lo,hi))continue;
     const key=p.id+':'+loc.id;
     if(!pins.has(key))pins.set(key,{id:key,place:p,location:loc,events:[],roles:[]});
     const pin=pins.get(key);if(!pin.events.some(x=>x.id===e.id))pin.events.push(e);if(!pin.roles.includes(r.role))pin.roles.push(r.role);mapped=true;
    }
   }
   if(!mapped)unmapped.push(e);
  }
  return {events,pins:[...pins.values()],unmapped};
 }
 function valid(v){
  const text=s=>typeof s==='string'&&s.length>0,arr=Array.isArray;
  if(v?.schemaVersion!==1||!text(v.version)||!text(v.eventVersion)||!text(v.license)||!text(v.attribution)||!arr(v.periods)||v.periods.length!==5||!v.topics||!v.kinds||!v.places||!v.entries)return false;
  const refs=r=>r&&text(r.label)&&/^https:\/\//.test(r.url)&&text(r.locator)&&text(r.claim)&&['direct','inherited','indirect'].includes(r.consultation);
  const range=r=>r&&[r.fromYear,r.toYear].every(y=>y===null||Number.isSafeInteger(y)&&y!==0)&&(r.fromYear===null||r.toYear===null||r.fromYear<=r.toYear);
  const evidence=(r,p)=>text(r.note)&&arr(r.references)&&r.references.length>0&&r.references.every(i=>Number.isInteger(i)&&i>=0&&i<p.references.length);
  if(!Object.entries(v.places).every(([id,p])=>p?.id===id&&/^[a-z][a-z0-9-]*$/.test(id)&&text(p.label)&&text(p.note)&&arr(p.aliases)&&p.aliases.every(text)&&arr(p.references)&&p.references.length&&p.references.every(refs)
   &&['approximate','disputed','unlocated'].includes(p.status)&&range(p.coverage)&&arr(p.names)&&p.names.every(n=>text(n.label)&&range(n)&&evidence(n,p))
   &&arr(p.locations)&&p.locations.every(l=>text(l.id)&&arr(l.coordinates)&&l.coordinates.length===2&&l.coordinates.every(Number.isFinite)&&Math.abs(l.coordinates[0])<=180&&Math.abs(l.coordinates[1])<=90&&range(l)&&['site','city','region'].includes(l.precision)&&['certain','approximate','disputed'].includes(l.certainty)&&evidence(l,p))
   &&arr(p.external)&&p.external.every(x=>/^https:\/\/pleiades.stoa.org\/places\/\d+$/.test(x.url))&&arr(p.connections)&&p.connections.every(c=>v.places[c.place]&&text(c.type)&&evidence(c,p))))return false;
  return Object.keys(v.entries).length>0&&Object.entries(v.entries).every(([id,e])=>e?.id===id&&text(e.title)&&/^events\/#event=/.test(e.url)&&v.periods.some(p=>p.id===e.period)&&v.kinds[e.recordKind]&&arr(e.topics)&&e.topics.every(t=>v.topics[t])
   &&arr(e.people)&&e.people.every(p=>text(p.label)&&['participant','subject','mentioned'].includes(p.role)&&/^(kingdom|republic|empire|divided-empire|byzantine)\/#person=[a-z0-9-]+$/.test(p.url))
   &&arr(e.placeRelations)&&e.placeRelations.every(r=>v.places[r.place]&&text(r.label)&&['setting','subject','mentioned'].includes(r.role)&&text(r.basis)&&r.url==='places/#place='+r.place)
   &&arr(e.spans)&&e.spans.every(s=>arr(s)&&s.length===2&&s.every(y=>year(y)!==null)&&s[0]<=s[1])
   &&arr(e.years)&&e.years.every(y=>year(y.year)!==null&&v.periods.some(p=>p.id===y.period)&&new RegExp('^'+y.period+'/#year=-?\\d+$').test(y.url))
   &&e.date&&['point','span','window','context','undated'].includes(e.date.extent)&&text(e.date.note)&&(e.date.extent==='undated'?e.spans.length===0:e.spans.length>0));
 }
 return {select,year,normalize,valid,overlaps};
});
