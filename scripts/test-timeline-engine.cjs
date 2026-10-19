'use strict';
const assert=require('node:assert/strict'),E=require('../site/timeline/engine.js'),data=require('../data/timeline/index.json');
assert.equal(E.valid(data),true);
assert.equal(E.axis(-1)+1,E.axis(1));
assert.equal(E.year(E.axis(-1)),-1);assert.equal(E.year(E.axis(1)),1);
assert.equal(E.normalize('Ζήνων'),E.normalize('Ζηνων'));assert.equal(E.normalize('Βασίλειος'),E.normalize('Βασιλειοσ'));
const get=id=>data.stages[id];
const otho=E.geometry(get('empire:otho:0'),69,69);assert.ok(otho.left>0&&otho.right<30&&otho.coreRight>otho.coreLeft);
const gordian=E.geometry(get('empire:gordian-i:0'),238,238);assert.equal(gordian.left,0);assert.equal(gordian.right,100);assert.equal(gordian.noCore,true);assert.equal(gordian.uncertain,true);
const sisters=['zoe','theodora'].map(p=>E.geometry(get('byzantine:'+p+':0'),1042,1042));assert.deepEqual(...sisters);assert.ok(sisters[0].left>20&&sisters[0].right<50);
assert.equal(E.geometry(get('byzantine:justinian-ii:0'),700,700),null);assert.equal(E.geometry(get('byzantine:justinian-ii:1'),700,700),null);
assert.equal(E.geometry(get('kingdom:titus-tatius:0'),-753,-509),null);
const nep=Object.values(data.stages).find(s=>s.person==='julius-nepos'&&s.kind==='exile'),clip=E.geometry(nep,470,490);assert.equal(clip.clippedEnd,true);assert.ok(clip.right<50);
const all=Object.values(data.stages);for(const stage of all){
 if(!stage.start)continue;const p=data.periods.find(p=>p.id===stage.period),g=E.geometry(stage,p.start,p.end);if(!g)continue;
 for(const key of ['left','right','coreLeft','coreRight'])assert.ok(g[key]>=0&&g[key]<=100,`${stage.id} ${key}`);
}
assert.equal(E.geometry(get('byzantine:zeno:0'),-753,1453),null);
for(const change of [d=>d.stages['empire:otho:0'].start.bounds=[2,1],d=>delete d.sources[Object.keys(d.sources)[0]],d=>d.stages['empire:otho:0'].person='missing',d=>d.stages['empire:otho:0'].authority=[{}],d=>d.presets[0].period='missing']){
 const damaged=structuredClone(data);change(damaged);assert.equal(E.valid(damaged),false);
}
console.log('Timeline engine verified: no zero year, source precision, uncertain windows, restoration gaps, scope clipping, Greek normalization and malformed data rejection.');
