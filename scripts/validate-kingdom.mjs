import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/kingdom/records.json'),'utf8'));
const {people,events,years,sources,places}=data;
const expected=Array.from({length:245},(_,i)=>i-753);
assert.deepEqual(Object.keys(years).map(Number),expected);
assert.equal(data.stats.years,245);
assert.equal(data.stats.kings,7);
assert.equal(Object.keys(people).length,8);
assert.equal(Object.keys(places).length,12);
const kings=Object.values(people).filter(p=>p.start!==null);
assert.equal(kings.length,7);
assert.deepEqual(kings.map(p=>[p.start,p.end,p.traditionalYears]),[
 [-753,-716,37],[-715,-672,43],[-672,-640,32],[-640,-616,24],[-616,-578,38],[-578,-534,44],[-534,-509,25]
]);
assert.equal(kings.reduce((sum,p)=>sum+p.traditionalYears,1),244);
assert.equal(people['titus-tatius'].start,null);
assert.equal(people['titus-tatius'].end,null);
let datedCount=0;
for(const [year,r] of Object.entries(years)){
 assert.equal(r.year,Number(year));
 assert.equal(r.auc,754+r.year);
 assert.equal(r.interregnum,[-716,-715].includes(r.year));
 assert.ok(r.note&&r.sources.length);
 const rulers=kings.filter(p=>p.start<=r.year&&r.year<=p.end).map(p=>p.id);
 assert.deepEqual(r.rulers,rulers,`Rulers ${year}`);
 assert.ok(!r.rulers.includes('titus-tatius'));
 const dated=Object.values(events).filter(e=>e.year===r.year).map(e=>e.id);
 assert.deepEqual(r.events,dated,`Annual events ${year}`);
 datedCount+=r.events.length;
 assert.equal(r.status,r.events.length?'traditional-event':'no-datable-record');
 if(!r.events.length) assert.match(r.note,/无可定年记载/);
 const undated=Object.values(events).filter(e=>e.year===null&&e.people.some(id=>r.rulers.includes(id))).map(e=>e.id);
 assert.deepEqual(r.traditions,undated,`Background ${year}`);
 assert.ok(r.events.every(id=>!r.traditions.includes(id)));
}
assert.equal(datedCount,10);
assert.equal(data.stats.datedEvents,datedCount);
assert.equal(data.stats.undatedTraditions,36);
assert.equal(Object.values(years).filter(y=>y.status==='no-datable-record').length,236);
for(const [year,ids] of [[-672,['numa-pompilius','tullus-hostilius']],[-640,['tullus-hostilius','ancus-marcius']],[-616,['ancus-marcius','tarquinius-priscus']],[-578,['tarquinius-priscus','servius-tullius']],[-534,['servius-tullius','tarquinius-superbus']]]){
 assert.deepEqual(years[year].rulers,ids);
}
assert.deepEqual(years[-753].rulers,['romulus']);
assert.deepEqual(years[-509].rulers,['tarquinius-superbus']);
assert.deepEqual(years[-509].events,['lucretia','republic']);
assert.equal(events['tatius-death'].year,null);
assert.equal(events['ostia-foundation'].year,null);
assert.equal(events['census'].year,null);
for(const [id,item] of Object.entries({...people,...events,...places})){
 assert.equal(item.id,id);
 assert.ok(item.sources.length&&item.sources.every(s=>sources[s]),id);
 if('bio' in item){
  assert.ok(item.zh&&item.latin&&item.bio.length>=3&&item.bio.every(p=>p.length>60),id);
  assert.ok(item.places.every(place=>places[place]),id);
 }
 if('passage' in item){
  assert.ok(item.passage&&item.text.length>40&&item.people.every(p=>people[p]),id);
  assert.equal(item.kind,'tradition');
  assert.ok(item.year===null||years[item.year],id);
  assert.match(item.dating,item.year===null?/未定年/:/传统纪年/,id);
 }
 if('lon' in item)assert.ok(item.lat>41&&item.lat<43&&item.lon>11&&item.lon<14&&item.note,id);
}
for(const s of Object.values(sources)){
 assert.ok(s.label&&s.author&&s.note);
 assert.equal(new URL(s.url).protocol,'https:');
 assert.ok(['ancient','archaeology','scholarship'].includes(s.kind));
}
assert.ok(data.method.length>=6);
// Annual/year headings must not disguise undated traditions as attested annual facts.
const app=fs.readFileSync(path.join(root,'site/kingdom/app.js'),'utf8');
assert.match(app,/任期内事迹 · 未定年/);
assert.match(app,/\.\.\/republic\/#year=509/);
console.log('Kingdom verified: 245 years, 7 traditional kings + undated co-king, interregnum, 10 dated nodes, 36 separate traditions, references and place caveats.');
