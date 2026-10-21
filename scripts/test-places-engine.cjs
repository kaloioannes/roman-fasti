const assert=require('node:assert/strict'),E=require('../site/places/engine.js'),data=require('../data/places/index.json');
assert.equal(E.valid(data),true);
for(const n of [0,'0','1.5','1071x',-754,1454])assert.equal(E.year(n),null);
assert.equal(E.year(-1),-1);assert.equal(E.year(1),1);
const all=E.select(data);assert.equal(all.events.length,Object.keys(data.entries).length);
assert.equal(new Set(all.events.map(e=>e.id)).size,all.events.length);
for(const pin of all.pins){assert.ok(data.places[pin.place.id]);assert.ok(pin.events.every(e=>e.placeRelations.some(r=>r.place===pin.place.id)));}
const at=year=>E.select(data,{from:year,to:year,undated:false});
for(const year of [1202,1203,1204])assert.equal(at(year).events.filter(e=>e.id==='byzantine:fourth-crusade-1202-1204').length,1);
assert.equal(at(-753).events.some(e=>e.id==='kingdom:ostia-foundation'),false);
assert.equal(E.select(data,{place:'ostia'}).events.some(e=>e.id==='kingdom:ostia-foundation'),true);
const rubicon=E.select(data,{place:'rubicon'});assert.ok(rubicon.events.length);assert.equal(rubicon.pins.length,0);assert.equal(rubicon.events.length,rubicon.unmapped.length);
const context=E.select(data,{settingsOnly:true});assert.ok(context.pins.every(p=>!p.roles.includes('mentioned')));
for(const p of data.periods)assert.ok(E.select(data,{period:p.id}).events.every(e=>e.period===p.id||e.years.some(y=>y.period===p.id)));
const synthetic=structuredClone(data);synthetic.places.manzikert.locations[0].fromYear=1100;
assert.ok(!E.select(synthetic,{from:1071,to:1071,undated:false}).pins.some(p=>p.place.id==='manzikert'));
for(const edit of [v=>v.places.rome.locations[0].coordinates=[200,45],v=>v.places.rome.names[0].fromYear=0,v=>v.entries[Object.keys(v.entries)[0]].placeRelations=[{place:'absent'}]]){const v=structuredClone(data);edit(v);assert.equal(E.valid(v),false);}
console.log('Place engine: no zero year, date-window deduplication, unknown dates, explicit locations and roles, unlocated list, temporal coordinates, deep validation.');
