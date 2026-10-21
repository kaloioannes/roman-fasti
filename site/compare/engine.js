'use strict';
(function(root){
  const axis=y=>y<0?y+1:y;
  const when=y=>y<0?`公元前${-y}年`:`公元${y}年`;
  const normalize=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ').replace(/[·.,ʹ’'\s]/g,'');
  const imperial=['central','senior','junior','rival','regional','disputed','exile'];
  function include(s,mode){return mode==='all'||(mode==='imperial'?imperial.includes(s.kind):mode==='main'?['central','senior'].includes(s.kind):mode==='junior'?s.kind==='junior':mode==='office'?['consul','suffect','tribune','decemvir','dictator'].includes(s.kind):false);}
  const leap=y=>axis(y)%4===0;
  const months=y=>[31,leap(y)?29:28,31,30,31,30,31,31,30,31,30,31];
  function ordinal(y,m=1,d=1){const a=axis(y);return 365*a+Math.floor((a-1)/4)+1+months(y).slice(0,m-1).reduce((a,b)=>a+b,0)+d-1;}
  function window(p,y){
    if(!p||p.flags.length||!['year','month','day'].includes(p.precision))return null;
    const match=p.value?.match(/^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
    const yy=match?Number(match[1]):y,mm=match?.[2]?Number(match[2]):null,dd=match?.[3]?Number(match[3]):null;
    if(!yy||!Number.isInteger(yy)||mm!==null&&(mm<1||mm>12)||dd!==null&&(!mm||dd<1||dd>months(yy)[mm-1]))return null;
    if(p.precision==='day'&&!dd||p.precision==='month'&&!mm)return null;
    const low=ordinal(yy,mm||1,dd||1),high=dd?low:mm?ordinal(yy,mm,months(yy)[mm-1]):ordinal(yy,12,31);
    return [low,high];
  }
  function interval(s){const a=window(s.start,s.startYear),b=window(s.end,s.endYear);return a&&b?{outer:[a[0],b[1]],core:[a[1],b[0]],exact:a[0]===a[1]&&b[0]===b[1]}:null;}
  function union(intervals){let total=0,end=-Infinity;for(const [a,b] of intervals.filter(([a,b])=>b>a).sort((a,b)=>a[0]-b[0])){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return total;}
  function duration(stages){const dated=stages.map(interval),known=dated.filter(Boolean);return {lower:union(known.map(d=>d.core)),upper:union(known.map(d=>d.outer)),included:known.length,excluded:stages.length-known.length,exact:known.length>0&&known.every(d=>d.exact)};}
  function overlaps(a,b){const rows=[];for(const left of a)for(const right of b){if(!left.start||!right.start)continue;
    const low=Math.max(left.start.bounds[0],right.start.bounds[0]),high=Math.min(left.end.bounds[1],right.end.bounds[1]);if(low>=high)continue;
    const l=interval(left),r=interval(right);const core=l&&r?Math.min(l.core[1],r.core[1])-Math.max(l.core[0],r.core[0]):-1;
    rows.push({a:left.id,b:right.id,low,high,status:core>0?'supported':'possible',days:Math.max(0,core)});
  }return rows;}
  function atYear(s,y){return s.start&&s.start.bounds[0]<axis(y)+1&&s.end.bounds[1]>axis(y);}
  function resolve(v,key){return v.people[key]?key:v.lookup[key]||null;}
  function find(v,q,period=''){const terms=q.trim().split(/\s+/u).map(normalize).filter(Boolean);return Object.values(v.people).filter(p=>(!period||p.profiles.some(x=>x.period===period)||p.power.some(x=>x.periods.includes(period)))&&terms.every(t=>normalize([p.label,...p.names,p.id,...p.profiles.flatMap(x=>[x.key,x.era,x.dynasty?.label||''])].join(' ')).includes(t)));}
  function valid(v){try{
    const text=s=>typeof s==='string'&&s.length>0;
    const point=p=>p&&text(p.label)&&['day','month','year','circa','range'].includes(p.precision)&&Array.isArray(p.flags)&&p.flags.every(f=>['traditional','uncertain'].includes(f))&&Array.isArray(p.bounds)&&p.bounds.length===2&&p.bounds.every(Number.isFinite)&&p.bounds[0]<p.bounds[1];
    const local=u=>/^(kingdom|republic|empire|divided-empire|byzantine|people|power|events|dynasties)\/#/.test(u);
    const year=y=>Number.isInteger(y)&&y!==0;
    if(v?.schemaVersion!==1||!text(v.version)||v.license!=='CC BY-SA 4.0'||!text(v.method)||!Array.isArray(v.periods)||v.periods.length!==5||!v.people||!v.lookup||!v.stages||!v.sources||!v.events||!v.returns||!v.powerSources||!Array.isArray(v.presets))return false;
    const refs=a=>Array.isArray(a)&&a.every(k=>v.sources[k]);
    const powerRefs=rows=>Array.isArray(rows)&&rows.length>0&&rows.every(r=>v.powerSources[r.source]&&text(r.locator)&&text(r.supports));
    const powerDate=d=>d&&text(d.label)&&['year','range','circa','unknown'].includes(d.precision)&&['observed','tenure','occurrence'].includes(d.meaning)&&(d.precision==='unknown'?d.start===null&&d.end===null:year(d.start)&&year(d.end)&&d.start<=d.end);
    if(!Object.values(v.powerSources).every(s=>text(s.label)&&/^https:\/\//.test(s.url)&&text(s.scope)&&text(s.checked)))return false;
    if(!Object.values(v.people).every(p=>Array.isArray(p.power)&&p.power.every(q=>text(q.label)&&local(q.url)&&Array.isArray(q.roles)&&q.roles.every(r=>text(r.label)&&text(r.powers)&&text(r.limits)&&powerDate(r.date)&&powerRefs(r.references))&&Array.isArray(q.actions)&&q.actions.every(a=>text(a.title)&&local(a.url)&&powerDate(a.date)&&powerRefs(a.references)))))return false;
    return Object.keys(v.people).length>0&&Object.entries(v.people).every(([id,p])=>p.id===id&&text(p.label)&&(!p.identity||local(p.identity.url)&&text(p.identity.editorNote))&&Array.isArray(p.names)&&p.names.every(text)&&Array.isArray(p.profiles)&&p.profiles.every(q=>text(q.key)&&v.lookup[q.key]===id&&local(q.url)&&v.periods.some(x=>x.id===q.period)&&Array.isArray(q.bio)&&q.bio.every(text)&&refs(q.sources)&&refs(q.purpleSources)&&(!q.dynasty||text(q.dynasty.label)&&refs(q.dynastySources)))&&Array.isArray(p.stages)&&p.stages.every(k=>v.stages[k]&&v.lookup[v.stages[k].period+':'+v.stages[k].person]===id)&&Array.isArray(p.events)&&p.events.every(k=>v.events[k])&&Array.isArray(p.power)&&p.power.every(q=>text(q.label)&&local(q.url)&&Array.isArray(q.roles)&&Array.isArray(q.actions)&&q.roles.every(r=>text(r.label)&&text(r.date.label)&&['year','range','circa','unknown'].includes(r.date.precision)) ))
      &&Object.values(v.lookup).every(k=>v.people[k])&&Object.values(v.sources).every(s=>text(s.label)&&/^https:\/\//.test(s.url))
      &&Object.entries(v.stages).every(([id,s])=>id===s.id&&v.lookup[s.period+':'+s.person]&&v.kinds[s.kind]&&v.sides[s.side]&&refs(s.sources)&&Array.isArray(s.authority)&&((s.start===null&&s.end===null&&s.startYear===null&&s.endYear===null)||(year(s.startYear)&&year(s.endYear)&&point(s.start)&&point(s.end)&&s.start.bounds[0]<s.end.bounds[1])))
      &&Object.values(v.events).every(e=>text(e.title)&&local(e.url)&&Array.isArray(e.people)&&Array.isArray(e.references)&&e.references.every(r=>text(r.label)&&/^https:\/\//.test(r.url)))
      &&Object.values(v.returns).every(rows=>Array.isArray(rows)&&rows.every(r=>v.stages[r.stage]&&text(r.quote)&&text(r.label)))
      &&v.presets.every(p=>text(p.id)&&text(p.title)&&resolve(v,p.a)&&resolve(v,p.b));
  }catch{return false;}}
  const api={axis,when,normalize,include,ordinal,window,interval,union,duration,overlaps,atYear,resolve,find,valid};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.FastiCompare=api;
})(typeof window==='object'?window:globalThis);
