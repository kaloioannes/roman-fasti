/* Display arithmetic only: no fictitious accession dates or duration scores. */
'use strict';
(function(root){
  const axis=y=>y<0?y+1:y;
  const year=x=>{const n=Math.floor(x+1e-9);return n<=0?n-1:n;};
  const when=y=>y<0?`公元前${-y}年`:`${y}年`;
  const normalize=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[·.,ʹ’'\s]/g,'');
  function geometry(stage,from,to){
    if(!stage.start||!stage.end)return null;
    const low=axis(from),high=axis(to)+1,span=high-low;
    const [rawA,b]=stage.start.bounds,[c,rawD]=stage.end.bounds;
    const a=Math.max(rawA,stage.scopeStart?axis(stage.scopeStart):-Infinity),d=Math.min(rawD,stage.scopeEnd?axis(stage.scopeEnd)+1:Infinity);
    if(a>=d||a>=high||d<=low)return null;
    const position=x=>100*(Math.max(low,Math.min(high,x))-low)/span;
    return {left:position(a),right:position(d),coreLeft:position(b),coreRight:position(c),
      clippedStart:rawA<low||rawA<a,clippedEnd:rawD>high||rawD>d,
      uncertain:[stage.start,stage.end].some(p=>p.flags.length>0),
      noCore:b>=c};
  }
  function valid(data){
    const text=s=>typeof s==='string'&&s.length>0;
    const y=n=>Number.isSafeInteger(n)&&n!==0;
    const point=p=>p&&text(p.label)&&['day','month','year','circa','range'].includes(p.precision)&&Array.isArray(p.flags)&&p.flags.every(f=>['traditional','uncertain'].includes(f))&&Array.isArray(p.bounds)&&p.bounds.length===2&&p.bounds.every(Number.isFinite)&&p.bounds[0]<p.bounds[1];
    const period=id=>data.periods.some(p=>p.id===id);
    return data?.schemaVersion===1&&text(data.version)&&Array.isArray(data.periods)&&data.periods.length===5&&data.periods.every(p=>text(p.id)&&text(p.title)&&y(p.start)&&y(p.end))&&data.kinds&&data.sides&&data.people&&data.sources&&data.stages&&Array.isArray(data.presets)&&text(data.method)
      &&Object.values(data.people).every(p=>text(p.zh)&&Array.isArray(p.names)&&/^[-a-z]+\/#person=[\w-]+$/.test(p.url))
      &&Object.values(data.sources).every(s=>text(s.label)&&/^https:\/\//.test(s.url))
      &&Object.keys(data.stages).length>0&&Object.entries(data.stages).every(([id,s])=>s?.id===id&&period(s.period)&&y(s.scopeStart)&&y(s.scopeEnd)&&data.kinds[s.kind]&&data.sides[s.side]&&text(s.label)&&(s.isVacancy||data.people[s.period+':'+s.person])&&((s.start===null&&s.end===null&&s.startYear===null&&s.endYear===null)||(point(s.start)&&point(s.end)&&y(s.startYear)&&y(s.endYear)&&s.start.bounds[0]<s.end.bounds[1]))&&Array.isArray(s.sources)&&s.sources.length&&s.sources.every(k=>data.sources[k])&&Array.isArray(s.authority)&&s.authority.every(p=>point(p.start)&&point(p.end)&&text(p.label)&&['governing','shared','title','contested'].includes(p.status)))
      &&data.presets.every(p=>text(p.id)&&text(p.title)&&period(p.period)&&y(p.from)&&y(p.to)&&p.from<=p.to&&text(p.note));
  }
  const api={axis,year,when,normalize,geometry,valid};
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.FastiTimeline=api;
})(typeof window==='object'?window:globalThis);
