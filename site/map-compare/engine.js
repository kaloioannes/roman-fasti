'use strict';
(function(root){
 const year=v=>{if(!/^-?\d+$/.test(String(v)))return null;const n=Number(v);return Number.isSafeInteger(n)&&n!==0&&n>=-753&&n<=1453?n:null;};
 const when=y=>y<0?'前'+(-y)+'年':'公元'+y+'年';
 const range=(a,b)=>a===b?when(a):when(a)+' — '+when(b);
 const stage=(data,period,y)=>data.periods.find(p=>p.id===period)?.stages.map(id=>data.stages[id]).find(s=>s.from<=y&&y<=s.to)||null;
 const annual=(period,y)=>period+'/#year='+(period==='republic'?-y:y);
 function parse(data,hash){
  const q=new URLSearchParams(hash.replace(/^#/,'')),preset=data.presets.find(p=>p.id===q.get('preset'));
  if(q.has('preset')&&!preset)throw Error('没有找到这个对照专题。');
  const defaults=preset||data.presets.find(p=>p.id==='trajan-hadrian');
  const point=side=>{const p=q.get(side+'p')??defaults[side].period,y=year(q.get(side+'y')??defaults[side].year);if(y===null||!stage(data,p,y))throw Error('请选择分卷范围内的整数年份，负数为公元前；无公元0年。');return {period:p,year:y};};
  const mode=q.get('mode')||'split',frame=q.get('frame')||'auto';
  if(!['split','swipe'].includes(mode)||!['auto','mediterranean','latium','east'].includes(frame))throw Error('对照模式或视野无效。');
  const number=(k,d,min,max)=>{if(!q.has(k))return d;const raw=q.get(k),n=Number(raw);if(!raw.trim()||!Number.isFinite(n)||n<min||n>max)throw Error('地图视野参数无效。');return n;};
  return {a:point('a'),b:point('b'),mode,frame,swipe:number('swipe',50,0,100),view:{k:number('k',1,.75,16),x:number('x',0,-30000,30000),y:number('y',0,-30000,30000)},preset:preset?.id||''};
 }
 function query(s){const q=new URLSearchParams();if(s.preset)q.set('preset',s.preset);for(const side of ['a','b']){q.set(side+'p',s[side].period);q.set(side+'y',s[side].year);}if(s.mode!=='split')q.set('mode',s.mode);if(s.frame!=='auto')q.set('frame',s.frame);if(s.swipe!==50)q.set('swipe',Math.round(s.swipe));for(const k of ['k','x','y'])if(s.view[k]!==({k:1,x:0,y:0})[k])q.set(k,Number(s.view[k].toFixed(3)));return q.toString();}
 function valid(d){
  const text=v=>typeof v==='string'&&v.length>0,y=v=>year(v)!==null,ref=r=>r&&text(r.label)&&/^https:\/\//.test(r.url);
  if(d?.schemaVersion!==1||!text(d.version)||!text(d.method)||!text(d.license)||!Array.isArray(d.periods)||d.periods.length!==5||!d.stages||!Array.isArray(d.presets)||!d.presets.length)return false;
  if(!d.periods.every(p=>['kingdom','republic','empire','divided-empire','byzantine'].includes(p.id)&&text(p.title)&&y(p.start)&&y(p.end)&&p.start<=p.end&&Array.isArray(p.stages)&&p.stages.length&&p.stages.every(id=>d.stages[id]?.period===p.id)))return false;
  if(new Set(d.periods.map(p=>p.id)).size!==5)return false;
  for(const [id,s] of Object.entries(d.stages)){
   if(s.id!==id||!d.periods.some(p=>p.id===s.period&&p.stages.includes(id))||!y(s.from)||!y(s.to)||s.from>s.to||!text(s.note)||!text(s.label)||!['places','territory'].includes(s.kind)||!Array.isArray(s.layers)||!Array.isArray(s.points))return false;
   if(s.kind==='territory'?!s.layers.length||s.points.length: s.layers.length||s.period!=='kingdom')return false;
   if(!s.layers.every(l=>Number.isSafeInteger(l.featureIndex)&&l.featureIndex>=0&&y(l.from)&&y(l.to)&&l.from<=s.from&&l.to>=s.to&&text(l.label)&&text(l.key)&&text(l.caption)&&text(l.license)&&text(l.provenance)&&['schematic','borrowed','reconstruction'].includes(l.precision)&&Array.isArray(l.sourceStages)&&l.sourceStages.every(r=>text(r.polity)&&Number.isSafeInteger(r.from)&&Number.isSafeInteger(r.to)&&r.from<=r.to)&&Array.isArray(l.references)&&l.references.length&&l.references.every(ref)))return false;
   if(!s.points.every(p=>text(p.id)&&text(p.label)&&text(p.note)&&Array.isArray(p.coordinates)&&p.coordinates.length===2&&p.coordinates.every(Number.isFinite)&&Math.abs(p.coordinates[0])<=180&&Math.abs(p.coordinates[1])<=90&&Array.isArray(p.references)&&p.references.every(ref)))return false;
  }
  for(const p of d.periods){let expected=p.start;for(const id of p.stages){const s=d.stages[id];if(s.from!==expected)return false;expected=s.to===-1?1:s.to+1;}if(expected!==p.end+1)return false;}
  return new Set(d.presets.map(p=>p.id)).size===d.presets.length&&d.presets.every(p=>text(p.id)&&text(p.title)&&text(p.note)&&['a','b'].every(k=>p[k]&&y(p[k].year)&&stage(d,p[k].period,p[k].year))&&Array.isArray(p.readings)&&p.readings.length&&p.readings.every(r=>text(r.id)&&text(r.title)&&/^events\/#event=/.test(r.url)));
 }
 function geometry(data,s){
  if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('地图资料结构无效');
  const pos=p=>Array.isArray(p)&&p.length>=2&&p.every(Number.isFinite)&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90;
  const ring=r=>Array.isArray(r)&&r.length>=4&&r.every(pos)&&r[0][0]===r.at(-1)[0]&&r[0][1]===r.at(-1)[1];
  const polygon=p=>Array.isArray(p)&&p.length>0&&p.every(ring);
  return s.layers.map(l=>{const f=data.features[l.featureIndex],g=f?.geometry,p=f?.properties;if(f?.type!=='Feature'||!p||p.from!==l.from||p.to!==l.to||p.label!==l.label||!g||!(g.type==='Polygon'?polygon(g.coordinates):g.type==='MultiPolygon'&&Array.isArray(g.coordinates)&&g.coordinates.length&&g.coordinates.every(polygon)))throw Error('地图阶段与目录不一致或几何损坏');return f;});
 }
 function events(data,state,topic=''){
  const a=Math.min(state.a.year,state.b.year),b=Math.max(state.a.year,state.b.year),periods=new Set([state.a.period,state.b.period]);
  return Object.values(data.entries).filter(e=>periods.has(e.period)&&(!topic||e.topics.includes(topic))&&e.spans.some(s=>s[0]<=b&&a<=s[1])).sort((a,b)=>(a.date.start?.year??0)-(b.date.start?.year??0)||a.id.localeCompare(b.id));
 }
 const api={year,when,range,stage,annual,parse,query,valid,geometry,events};if(typeof module==='object'&&module.exports)module.exports=api;else root.FastiMapCompare=api;
})(typeof window==='object'?window:globalThis);
