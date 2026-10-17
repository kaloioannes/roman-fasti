import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const data = read('data/empire.json');
const maps = read('data/imperial-territories.json');
const years = [...Array.from({length:27},(_,i)=>i-27),...Array.from({length:395},(_,i)=>i+1)];
const kinds = new Set(['central','rival','regional','disputed','caesar']);
assert.equal(data.meta.yearZero,false);
assert.equal(data.stats.years,422);
assert.deepEqual(Object.keys(data.years).map(Number).sort((a,b)=>a-b),years);
assert.ok(!data.years[0]);
let events = 0, reigns = 0;
for (const [id,person] of Object.entries(data.people)) {
  assert.equal(person.id,id);
  assert.match(id,/^[a-z0-9-]+$/);
  assert.ok(person.zh && person.latin && person.dynasty && person.aliases && person.reference,id);
  assert.ok(person.bio.length >= 3 && person.bio.join('').length >= 180,`Incomplete biography: ${id}`);
  assert.ok(person.sources.length && person.sources.every(s=>data.sources[s]),`Unsourced person: ${id}`);
  assert.ok(person.reigns.length,id);
  const seen = new Set();
  for (const r of person.reigns) {
    assert.ok(kinds.has(r.kind),`${id}: ${r.kind}`);
    assert.ok(Number.isInteger(r.start) && Number.isInteger(r.end) && r.start && r.end && r.start<=r.end,id);
    assert.ok(r.tenure && r.territory && r.note && r.certainty,id);
    const key = `${r.start}:${r.end}:${r.kind}`;
    assert.ok(!seen.has(key),`Duplicate reign: ${id}/${key}`); seen.add(key); reigns++;
  }
}
for (const y of years) {
  const record = data.years[y]; assert.equal(record.year,y);
  assert.ok(record.events.length,`Missing annual text: ${y}`);
  const expected = [];
  for (const p of Object.values(data.people)) p.reigns.forEach((r,index)=>{if(r.start<=y && y<=r.end) expected.push(`${p.id}:${index}`);});
  const actual = record.rulers.map(r=>`${r.person}:${r.reign}`);
  assert.equal(new Set(actual).size,actual.length,`Duplicate annual membership: ${y}`);
  assert.deepEqual(actual.sort(),expected.sort(),`Wrong annual membership: ${y}`);
  assert.ok(record.rulers.some(r=>data.people[r.person].reigns[r.reign].kind==='central'),`No central emperor: ${y}`);
  const titles = new Set();
  for (const e of record.events) {
    assert.ok(e.title && e.description.length>=50 && e.reference && e.certainty,`Thin annual text: ${y}`);
    assert.ok(e.sources.length && e.sources.every(s=>data.sources[s]),`Missing citation: ${y}`);
    assert.ok(!titles.has(e.title),`Duplicate event: ${y}`); titles.add(e.title); events++;
  }
  assert.ok(maps.features.some(f=>f.properties.from<=y && y<=f.properties.to),`Missing map coverage: ${y}`);
}
assert.equal(data.stats.events,events);
assert.equal(data.stats.people,Object.keys(data.people).length);
assert.equal(data.stats.reigns,reigns);
for (const s of Object.values(data.sources)) {
  assert.equal(new URL(s.url).protocol,'https:');
  assert.ok(s.label && s.kind && s.note);
  assert.doesNotMatch(s.url,/annals\.\d+\.\d+|histories\.\d+\.\d+/,'Tacitus uses roman-number URL suffixes');
}
const rulers = (y,kind) => new Set(data.years[y].rulers.filter(r=>!kind || data.people[r.person].reigns[r.reign].kind===kind).map(r=>r.person));
assert.deepEqual([...rulers(-27,'central')],['augustus']);
assert.deepEqual([...rulers(69,'central')],['galba','otho','vitellius','vespasian']);
for (const id of ['maximinus-thrax','gordian-i','gordian-ii','pupienus','balbinus','gordian-iii']) assert.ok(rulers(238,'central').has(id));
for (const id of ['postumus','saloninus','macrianus-minor','quietus','regalianus']) assert.ok(rulers(260).has(id));
assert.ok(rulers(293,'caesar').has('constantius-i') && !rulers(293,'central').has('constantius-i'));
assert.ok(rulers(293,'caesar').has('galerius') && !rulers(293,'central').has('galerius'));
assert.ok(rulers(305,'central').has('constantius-i'));
assert.ok(rulers(306,'central').has('constantine-i') && rulers(306,'caesar').has('constantine-i'));
assert.ok(!rulers(309).has('maximian') && rulers(310).has('maximian'));
assert.ok(!rulers(267,'regional').has('zenobia') && rulers(272,'regional').has('zenobia'));
assert.ok(rulers(273,'disputed').has('antiochus-273'));
for (const id of ['aureolus','achilleus','firmus-372']) assert.ok(data.people[id].reigns.every(r=>r.kind==='disputed'));
assert.ok(rulers(274,'caesar').has('tetricus-ii'));
assert.deepEqual([...rulers(395,'central')],['theodosius-i','arcadius','honorius']);
assert.equal(data.people['arcadius'].reigns[0].end,408);
assert.equal(data.people['honorius'].reigns[0].end,423);
const d3 = createRequire(import.meta.url)('../assets/d3.min.js');
for (const f of maps.features) {
  assert.ok(f.properties.caption && f.properties.label && f.geometry);
  assert.ok(f.properties.from<=f.properties.to);
  const area=d3.geoArea(f);
  assert.ok(area>0 && area<2,`Wrong map ring orientation: ${f.properties.label}/${area}`);
}
assert.ok(data.method.decisions.length>=7 && data.method.excluded.length>=3);
console.log(`Imperial volume validated: ${years.length} years, ${data.stats.people} biographies, ${events} sourced entries, ${reigns} title stages, ${maps.features.length} map stages.`);
