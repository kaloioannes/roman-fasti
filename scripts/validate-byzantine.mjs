import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const d=read('data/byzantine/records.json'), maps=read('data/byzantine/territories.json');
const source=read('data-source/byzantine/territories.geojson');
const years=Array.from({length:978},(_,i)=>i+476);
assert.deepEqual(Object.keys(d.years).map(Number),years);
assert.equal(d.meta.nameLanguage,'per-person');assert.equal(d.meta.schemaVersion,2);assert.equal(d.meta.yearZero,false);
assert.deepEqual(d.meta.start,476);assert.deepEqual(d.meta.end,1453);
let events=0,stages=0,purple=0,eventYears=0;
const eventIds=new Set();
for(const [id,p] of Object.entries(d.people)){
 assert.equal(p.id,id);assert.match(id,/^[a-z0-9-]+$/);
 assert.match(p.greek,/[\u0370-\u03ff\u1f00-\u1fff]/u,id);
 assert.ok(['la','el'].includes(p.nativeName.lang),id);
 assert.equal(p.nativeName.text,p.nativeName.lang==='la'?p.latin:p.greek,id);
 assert.ok(p.nativeName.note&&p.nativeName.sources.every(s=>d.sources[s]),id);
 assert.ok(p.zh&&p.aliases&&p.reference&&p.era&&d.dynasties[p.dynasty],id);
 assert.ok(p.bio.length>=2&&p.bio.join('').length>=55,`Thin biography: ${id}`);
 assert.ok(p.sources.length&&p.sources.every(s=>d.sources[s]),id);
 assert.ok(p.reigns.length,id);const seen=new Set();
 for(const r of p.reigns){
  assert.ok(Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start<=r.end,id);
  assert.ok(['central','junior','rival','regional','disputed'].includes(r.kind),id);
  assert.ok(r.tenure&&r.territory&&r.note&&r.certainty,id);
  assert.ok(r.dateSources.length&&r.dateSources.every(s=>d.sources[s]),id);
  for(const [side,annual] of [['start',r.start],['end',r.end]]){
   const date=r[side+'Date'];assert.ok(['day','month','year','circa','range'].includes(date.precision),id);
   assert.ok(date.label&&r.tenure.includes(date.label),id);
   if(date.precision==='range'){assert.equal(date.value,null);assert.match(date.label,/[／—]/);continue}
   assert.match(date.value,/^\d{4}(-\d{2}){0,2}$/);assert.equal(Number(date.value.slice(0,4)),annual,id);
   const [y,m,day]=date.value.split('-').map(Number);
   if(m)assert.ok(1<=m&&m<=12,id);
   if(day){const max=[31,y%4===0?29:28,31,30,31,30,31,31,30,31,30,31][m-1];assert.ok(1<=day&&day<=max,id)}
   if(date.precision==='day')assert.equal(date.value.length,10,id);
   if(date.precision==='month')assert.equal(date.value.length,7,id);
   if(date.precision==='year')assert.equal(date.value.length,4,id);
  }
  const key=`${r.start}:${r.end}:${r.kind}`;assert.ok(!seen.has(key),id);seen.add(key);stages++;
 }
 if(p.purple){
  purple++;assert.ok(p.purple.note.length>20&&p.purple.sources.length,id);
  assert.ok(p.purple.sources.every(s=>d.sources[s]),`Missing positive purple evidence: ${id}`);
 } else assert.equal(p.purple,null,`Unknown must not be encoded as a negative assertion: ${id}`);
}
for(const [id,dyn] of Object.entries(d.dynasties)){
 assert.ok(dyn.label&&dyn.note&&dyn.sources.length,id);
 assert.ok(dyn.sources.every(s=>d.sources[s]),id);
 assert.ok(Object.values(d.people).some(p=>p.dynasty===id),id);
}
for(const y of years){
 const r=d.years[y];assert.equal(r.year,y);
 const expected=[];
 for(const p of Object.values(d.people))p.reigns.forEach((t,i)=>{if(t.start<=y&&y<=t.end)expected.push(`${p.id}:${i}`)});
 const actual=r.rulers.map(o=>`${o.person}:${o.reign}`);
 assert.equal(new Set(actual).size,actual.length,`Duplicate membership ${y}`);
 assert.deepEqual(actual.sort(),expected.sort(),`Wrong title membership ${y}`);
 assert.ok(r.rulers.some(o=>d.people[o.person].reigns[o.reign].kind==='central'),`Missing main line ${y}`);
 assert.ok(r.events.length,`Missing independently authored event ${y}`);
 assert.equal(r.eventStatus,'documented',y);
 if(r.events.length)eventYears++;
 for(const e of r.events){
  assert.equal(e.year,y);assert.ok(!eventIds.has(e.id),`Duplicate event ${e.id}`);eventIds.add(e.id);
  assert.ok(e.title&&e.description.length>=25&&e.reference&&e.certainty,`Thin event ${y}`);
  assert.ok(e.sources.length&&e.sources.every(s=>d.sources[s]),y);events++;
 }
 assert.ok(maps.features.some(f=>['byzantine','nicaea'].includes(f.properties.polity)&&f.properties.from<=y&&y<=f.properties.to),`Missing main map ${y}`);
}
assert.deepEqual(d.stats,{years:978,people:Object.keys(d.people).length,events,yearsWithEvents:eventYears,reigns:stages,purple});
const of=(y,kind)=>d.years[y].rulers.filter(o=>!kind||d.people[o.person].reigns[o.reign].kind===kind).map(o=>o.person);
// Independent historical acceptance cases: these are not derived from the rendering code.
assert.deepEqual(of(476,'central'),['basiliscus','zeno']);
assert.ok(of(476,'junior').includes('marcus'));
for(const id of ['heraclius','constantine-iii','heraklonas','constans-ii'])assert.ok(of(641,'central').includes(id));
assert.ok(!of(700).includes('justinian-ii')&&of(705,'central').includes('justinian-ii'));
assert.ok(!of(919,'central').includes('romanos-i')&&of(920,'central').includes('romanos-i'));
assert.ok(of(960,'junior').includes('basil-ii')&&!of(960,'central').includes('basil-ii'));
for(const id of ['michael-v','zoe','theodora','constantine-ix'])assert.ok(of(1042,'central').includes(id));
assert.ok(!of(1118).includes('alexios-john-ii')&&of(1119,'junior').includes('alexios-john-ii'));
assert.ok(of(1180,'central').includes('alexios-ii'));
assert.ok(!of(1204).includes('theodore-i')&&of(1205,'central').includes('theodore-i'));
assert.ok(of(1221,'central').includes('john-iii'));
assert.ok(of(1242,'regional').includes('john-thessalonica')&&!of(1243).includes('john-thessalonica'));
assert.ok(of(1259,'central').includes('john-iv')&&of(1259,'central').includes('michael-viii'));
assert.ok(!of(1378,'central').includes('john-v')&&of(1379,'central').includes('john-v'));
assert.ok(of(1399,'junior').includes('john-vii')&&of(1399,'central').includes('manuel-ii'));
assert.deepEqual(of(1453,'central'),['constantine-xi']);
assert.ok(d.people['basil-ii'].purple&&d.people['constantine-xi'].purple);
assert.equal(d.people['alexios-john-ii'].purple,null,'Born before his father became emperor, not inferred from Komnenos family');
assert.equal(d.people['john-i'].dynasty,'kourkouas');
assert.match(d.years[477].events[0].title,/阿尔马图斯/);
assert.equal(d.people['justinian-i'].nativeName.lang,'la');
assert.equal(d.people['maurice'].nativeName.lang,'el','Greek-speaking emperor before Heraclius');
assert.equal(d.people['heraclius'].nativeName.lang,'el');
assert.equal(d.people['justinian-i'].reigns[0].startDate.value,'0527-04-01');
assert.equal(d.people['basil-ii'].reigns[0].startDate.value,'0976-01-10');
assert.equal(d.people['constantine-xi'].reigns[0].endDate.value,'1453-05-29');
assert.equal(d.people['heraklonas'].reigns[0].endDate.precision,'range');
assert.equal(d.people['leontios'].reigns[0].startDate.precision,'year');
assert.equal(new Set(Object.values(d.years).flatMap(y=>y.events.map(e=>e.description))).size,events,'No repeated background paragraphs');
const d3=createRequire(import.meta.url)('../site/shared/assets/d3.min.js');
assert.equal(maps.features.length,source.features.length+2);
assert.equal(maps.features.filter(f=>f.properties.approximate).length,2);
for(const f of maps.features){
 assert.ok(['byzantine','nicaea','latin','trebizond'].includes(f.properties.polity));
 assert.ok(476<=f.properties.from&&f.properties.from<=f.properties.to&&f.properties.to<=1453);
 assert.ok(f.properties.sourceProperties&&f.properties.caption&&f.geometry);
 assert.ok(d3.geoArea(f)>0&&d3.geoArea(f)<2,`Wrong polygon orientation ${f.properties.label}`);
}
for(const s of Object.values(d.sources)){assert.equal(new URL(s.url).protocol,'https:');assert.ok(s.label&&s.kind&&s.note)}
for(const name of ['names','purple','annualEvents','maps'])assert.ok(d.method[name]);
console.log(`Byzantine volume verified: ${years.length} years, ${d.stats.people} people, ${stages} sourced date stages, ${events} independent entries, ${purple} positive purple attestations, ${maps.features.length} GIS layers. All ${eventYears} years have events.`);
