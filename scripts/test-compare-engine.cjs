const assert=require('node:assert/strict'),E=require('../site/compare/engine.js'),v=require('../data/compare/index.json');
assert.ok(E.valid(v));
for(const key of Object.keys(v.lookup))assert.ok(E.resolve(v,key));
for(const [id,p] of Object.entries(v.people)){
  assert.equal(E.resolve(v,id),id);
  assert.ok(E.find(v,p.label).some(p=>p.id===id));
}
assert.equal(E.resolve(v,'byzantine:zeno'),E.resolve(v,'divided-empire:zeno'));
assert.notEqual(E.resolve(v,'byzantine:constantine-iii'),E.resolve(v,'divided-empire:constantine-iii'));
assert.ok(E.find(v,'Ζηνων').some(p=>p.id==='global:roman-zeno'));
assert.ok(E.find(v,'Octavian').some(p=>p.id==='global:roman-augustus'));
assert.ok(!E.find(v,'no-such-person-abcdef').length);
assert.equal(E.axis(1)-E.axis(-1),1);
assert.equal(E.ordinal(1,1,1)-E.ordinal(-1,12,31),1);
assert.equal(E.ordinal(5,1,1)-E.ordinal(4,1,1),366);
const point=(value,precision='day',flags=[])=>({value,precision,flags,label:value,bounds:[1,2]});
const stage=(a,b,ap='day',bp='day')=>({start:point(a,ap),end:point(b,bp),startYear:Number(a.split('-')[0]),endYear:Number(b.split('-')[0])});
assert.deepEqual(E.duration([stage('0001-01-01','0001-01-11')]),{lower:10,upper:10,included:1,excluded:0,exact:true});
assert.equal(E.duration([stage('0001-01-01','0001-01-11'),stage('0001-01-05','0001-01-15')]).upper,14);
assert.equal(E.duration([stage('0001','0001','year','year')]).lower,0);
assert.equal(E.duration([stage('0001','0001','year','year')]).upper,364);
assert.equal(E.duration([stage('0001-01','0001-02','month','month')]).lower,1);
assert.equal(E.duration([stage('0001-01','0001-02','month','month')]).upper,58);
assert.equal(E.duration([{...stage('0001','0002','year','year'),start:point('0001','year',['uncertain'])}]).excluded,1);
assert.equal(E.duration([{start:null,end:null}]).excluded,1);
assert.equal(E.duration([v.stages['kingdom:romulus:0']]).included,0);
assert.ok(E.duration([v.stages['empire:augustus:0']]).exact);
assert.ok(E.include({kind:'junior'},'imperial'));assert.ok(!E.include({kind:'caesar'},'imperial'));
assert.ok(!E.include({kind:'junior'},'main'));assert.ok(E.include({kind:'consul'},'office'));
const stages=key=>v.people[E.resolve(v,key)].stages.map(id=>v.stages[id]);
assert.ok(E.overlaps(stages('byzantine:zoe'),stages('byzantine:theodora')).length);
assert.ok(E.overlaps(stages('empire:augustus'),stages('empire:tiberius')).every(r=>r.status==='possible'));
assert.equal(E.overlaps(stages('kingdom:titus-tatius'),stages('kingdom:romulus')).length,0);
assert.equal(E.duration([{...stage('0001-01-01','0001-01-01')}]).upper,0);
const partial=E.duration([stage('0001-01-01','0001-01-11'),{start:null,end:null}]);assert.equal(partial.included,1);assert.equal(partial.excluded,1);assert.equal(partial.upper,10);
assert.ok(E.atYear(v.stages['byzantine:zoe:0'],1042));
for(const p of v.presets){assert.ok(E.resolve(v,p.a));assert.ok(E.resolve(v,p.b));}
for(const mutate of [d=>d.people[Object.keys(d.people)[0]].stages.push('missing'),d=>d.lookup.fake='missing',d=>Object.values(d.stages)[0].start.bounds=[4,3],d=>Object.values(d.sources)[0].url='javascript:alert(1)',d=>Object.values(d.events)[0].url='https://other.test/',d=>Object.values(d.people)[0].profiles[0].sources=['missing']]){const d=structuredClone(v);mutate(d);assert.equal(E.valid(d),false);}
for(const mutate of [d=>Object.values(d.powerSources)[0].url='javascript:alert(1)',d=>d.people['power:pulcheria'].power[0].roles[0].references[0].source='missing',d=>d.people['power:pulcheria'].power[0].roles[0].date.start=0]){const d=structuredClone(v);mutate(d);assert.equal(E.valid(d),false);}
console.log('Comparison engine: all 1,200 identities, aliases, Julian/no-zero dates, union duration, month/year bounds, exclusions, role filters, uncertain intersections and malformed references.');
