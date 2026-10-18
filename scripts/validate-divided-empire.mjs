import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const d=read('data/divided-empire/records.json'),people=Object.values(d.people);
assert.deepEqual(Object.keys(d.years),Array.from({length:82},(_,i)=>String(i+395)));
const refs=keys=>{assert.ok(keys.length);for(const k of keys)assert.ok(d.sources[k],`Missing source ${k}`);};
const date=x=>{
 assert.ok(x.label);assert.match(x.value,/^0\d{3}(?:-\d{2})?(?:-\d{2})?$/);
 assert.equal(x.precision,['year','month','day'][x.value.split('-').length-1]);
 const parts=x.value.split('-').map(Number);if(parts.length>1)assert.ok(parts[1]>=1&&parts[1]<=12);
 if(parts.length>2){const dt=new Date(x.value+'T00:00:00Z');assert.equal(dt.getUTCDate(),parts[2]);assert.equal(dt.getUTCMonth()+1,parts[1]);}
};
assert.equal(people.length,d.stats.people);
assert.equal(new Set(people.map(p=>p.id)).size,people.length);
for(const p of people){
 assert.ok(p.zh&&p.nativeName.text&&p.aliases&&p.reference);assert.equal(p.nativeName.lang,'la');
 assert.ok(d.dynasties[p.dynasty]);assert.ok(p.bio.length>=2&&p.bio.every(t=>t.length>=30));refs(p.sources);
 for(const r of p.reigns){
  assert.ok(['west','east','both'].includes(r.side));assert.ok(['central','junior','rival','exile','caesar','disputed','senior'].includes(r.kind));
  assert.ok(r.start<=r.end&&r.territory&&r.note&&r.recognition!==undefined);date(r.startDate);date(r.endDate);refs(r.dateSources);
  assert.equal(r.start,Number(r.startDate.value.slice(0,4)));assert.equal(r.end,Number(r.endDate.value.slice(0,4)));
  for(let y=395;y<=476;y++)assert.equal(d.years[y].rulers.some(o=>o.person===p.id&&p.reigns[o.reign]===r),r.start<=y&&y<=r.end,`${p.id} membership ${y}`);
 }
}
const events=Object.values(d.years).flatMap(y=>y.events);
assert.equal(events.length,d.stats.events);assert.equal(new Set(events.map(e=>e.id)).size,events.length);
assert.equal(new Set(events.map(e=>e.title)).size,events.length,'Annual titles must be independently authored');
assert.equal(new Set(events.map(e=>e.description)).size,events.length,'No repeated reign-background filler');
for(const [year,rec]of Object.entries(d.years)){
 assert.equal(rec.year,Number(year));assert.ok(rec.events.length);
 for(const e of rec.events){assert.equal(e.year,rec.year);assert.ok(e.title&&e.description.length>40&&e.reference&&e.certainty);refs(e.sources);assert.ok(['west','east','both'].includes(e.side));}
 const annual=rec.rulers.map(o=>{assert.ok(d.people[o.person]?.reigns[o.reign]);return d.people[o.person].reigns[o.reign];});
 assert.ok(annual.some(r=>r.side==='east'&&r.kind==='central'));
 assert.ok(annual.some(r=>r.side==='west'&&r.kind==='central')||rec.vacancies.some(v=>v.side==='west'));
}
for(const v of d.vacancies){date(v.startDate);date(v.endDate);refs(v.sources);assert.ok(v.label&&v.note);}
const roster=(year,side,kind)=>d.years[year].rulers.filter(o=>{const r=d.people[o.person].reigns[o.reign];return r.side===side&&(!kind||r.kind===kind);}).map(o=>o.person).sort();
// Historical fixtures independent of the compilation logic.
assert.deepEqual(roster(395,'west','central'),['honorius']);
assert.deepEqual(roster(395,'east','central'),['arcadius']);
assert.ok(roster(402,'east','junior').includes('theodosius-ii'));
assert.ok(roster(421,'west','junior').includes('constantius-iii'));
assert.deepEqual(roster(424,'west','central'),['johannes']);
assert.ok(roster(424,'west','caesar').includes('valentinian-iii'));
assert.deepEqual(roster(455,'west','central'),['avitus','petronius-maximus','valentinian-iii']);
assert.deepEqual(roster(466,'west','central'),[]);assert.ok(d.years[466].vacancies.length);
assert.deepEqual(roster(472,'west','central'),['anthemius','olybrius']);
assert.deepEqual(roster(474,'east','central'),['leo-i','leo-ii','zeno']);
assert.deepEqual(roster(475,'east','central'),['basiliscus','zeno']);
assert.ok(roster(475,'east','exile').includes('zeno'));assert.ok(roster(475,'east','junior').includes('marcus-east'));
assert.deepEqual(roster(476,'west','central'),['romulus-augustus']);assert.deepEqual(roster(476,'west','exile'),['julius-nepos']);
assert.equal(d.people.zeno.reigns[0].startDate.value,'0474-02-09');
assert.equal(d.people['julius-nepos'].reigns[1].endDate.precision,'year');
assert.equal(d.people['libius-severus'].reigns[0].endDate.precision,'year');
assert.ok(!people.some(p=>['ricimer','odoacer','aetius','stilicho'].includes(p.id)));
for(const p of read('data/divided-empire/places.json')){assert.ok(p.coord.length===2&&p.coord.every(Number.isFinite)&&p.note);refs(p.sources);}
const maps=read('data/divided-empire/territories.json');
assert.equal(maps.license,'CC BY 4.0');assert.equal(maps.sourceCommit,'ad28a691b7c07c1fca89d0e0636d324667d2a258');
for(let y=395;y<=476;y++)for(const side of ['west','east'])assert.ok(maps.features.some(f=>f.properties.side===side&&f.properties.from<=y&&y<=f.properties.to),`Missing ${side} GIS ${y}`);
for(const f of maps.features){const p=f.properties;assert.ok(p.sourceProperties.Name&&p.sourceProperties.FromYear<=p.from);assert.ok(p.sourceProperties.ToYear>=p.to||(p.approximate&&p.referenceYear===475&&p.from===476&&p.to===476&&p.side==='west'));assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));}
assert.equal(maps.features.filter(f=>f.properties.approximate).length,1);
assert.notDeepEqual(maps.features.filter(f=>f.properties.from<=395&&f.properties.to>=395).map(f=>f.geometry),maps.features.filter(f=>f.properties.from<=476&&f.properties.to>=476).map(f=>f.geometry),'Do not reuse the partition frontier for the whole period');
for(const s of Object.values(d.sources)){assert.ok(s.label&&s.kind&&s.note);assert.match(s.url,/^https:\/\//);}
const byz=fs.readFileSync(path.join(root,'site/byzantine/app.js'),'utf8');assert.ok(byz.includes('ῬΩΜΗ'));assert.ok(!byz.includes('name-language'));
console.log(`Divided Empire verified: ${d.stats.years} years, ${people.length} people, ${events.length} distinct events, ${d.stats.reigns} title stages; both courts, sources, date precision and historical boundary fixtures.`);
