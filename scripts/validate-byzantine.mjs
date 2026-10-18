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
assert.equal(d.meta.nameLanguage,'el');assert.equal(d.meta.yearZero,false);
assert.deepEqual(d.meta.start,476);assert.deepEqual(d.meta.end,1453);
let events=0,stages=0,purple=0,eventYears=0;
const eventIds=new Set();
for(const [id,p] of Object.entries(d.people)){
 assert.equal(p.id,id);assert.match(id,/^[a-z0-9-]+$/);
 assert.match(p.greek,/[\u0370-\u03ff\u1f00-\u1fff]/u,id);
 assert.ok(!('latin' in p),'Greek display field, not a relabelled Latin field');
 assert.ok(p.zh&&p.aliases&&p.reference&&p.era&&d.dynasties[p.dynasty],id);
 assert.ok(p.bio.length>=2&&p.bio.join('').length>=55,`Thin biography: ${id}`);
 assert.ok(p.sources.length&&p.sources.every(s=>d.sources[s]),id);
 assert.ok(p.reigns.length,id);const seen=new Set();
 for(const r of p.reigns){
  assert.ok(Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start<=r.end,id);
  assert.ok(['central','junior','rival','regional','disputed'].includes(r.kind),id);
  assert.ok(r.tenure&&r.territory&&r.note&&r.certainty,id);
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
 assert.equal(r.eventStatus,r.events.length?'documented':'no-authored-dated-entry',y);
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
assert.ok(d.years[477].events.length===0,'Do not generate filler events');
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
console.log(`Byzantine volume verified: ${years.length} years, ${d.stats.people} people, ${stages} title stages, ${events} dated entries, ${purple} positive purple attestations, ${maps.features.length} GIS layers. ${978-eventYears} annual gaps are explicitly preserved.`);
