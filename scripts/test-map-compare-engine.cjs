const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../site/map-compare/engine.js');
const root=path.resolve(__dirname,'..'),read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8')),d=read('data/map-compare/index.json');
assert.equal(E.valid(d),true);
for(const p of d.periods){const maps=p.id==='kingdom'?null:read('data/'+p.id+'/territories.json');for(const id of p.stages){const s=d.stages[id];assert.equal(E.stage(d,p.id,s.from),s);assert.equal(E.stage(d,p.id,s.to),s);if(maps)assert.deepEqual(E.geometry(maps,s),s.layers.map(l=>maps.features[l.featureIndex]));}}
assert.equal(E.stage(d,'empire',117),E.stage(d,'empire',126));
assert.equal(E.stage(d,'empire',0),null);assert.equal(E.annual('republic',-44),'republic/#year=44');
for(const n of [0,'0','1.1','1e2','0x20','Infinity','',null,1454,-754])assert.equal(E.year(n),null,String(n));
for(const preset of d.presets){const state=E.parse(d,'#preset='+preset.id),roundtrip=E.parse(d,'#'+E.query(state));assert.deepEqual(state,roundtrip);}
for(const hash of ['#ay=0','#ay=396','#ap=unknown','#preset=missing','#mode=overlay','#frame=unknown','#k=NaN','#k=99','#swipe=-1','#x='])assert.throws(()=>E.parse(d,hash),hash);
const s=E.parse(d,'#ap=empire&ay=-1&bp=empire&by=1&mode=swipe&swipe=70&k=2&x=-40&y=10');assert.deepEqual(E.parse(d,E.query(s)),s);
for(const mutate of [v=>v.stages['empire:116:116'].layers[0].sourceStages[0].from='117',v=>v.stages['empire:116:116'].layers[0].precision='exact',v=>v.periods[0].stages.pop(),v=>v.stages['empire:116:116'].layers[0].references[0].url='javascript:alert(1)',v=>v.stages['empire:116:116'].from=0]){const bad=structuredClone(d);mutate(bad);assert.equal(E.valid(bad),false);}
const original=read('data/empire/territories.json'),stage=E.stage(d,'empire',116);for(const mutate of [v=>v.features[stage.layers[0].featureIndex].properties.from=115,v=>v.features[stage.layers[0].featureIndex].geometry={type:'Polygon',coordinates:[[[12,40],[13,40],[999,41],[12,40]]]},v=>v.features[stage.layers[0].featureIndex].geometry={type:'Polygon',coordinates:[]},v=>v.features=[]]){const bad=structuredClone(original);mutate(bad);assert.throws(()=>E.geometry(bad,stage));}
const events=read('data/events/index.json'),selection=E.parse(d,'#ap=byzantine&ay=1202&bp=byzantine&by=1204');const rows=E.events(events,selection);assert.equal(rows.filter(e=>e.id==='byzantine:fourth-crusade-1202-1204').length,1);assert.equal(rows.some(e=>e.date.extent==='undated'),false);assert.equal(E.events(events,selection,'war').every(e=>e.topics.includes('war')),true);const reverse={...selection,a:selection.b,b:selection.a};assert.deepEqual(E.events(events,reverse),rows);
console.log('Map comparison engine: all original layers, source dates, invalid inputs, no year zero, stable links, malformed geometry, cross-year deduplication and reverse comparisons.');
