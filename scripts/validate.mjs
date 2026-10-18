import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const d=read('data/republic/records.json'),a=read('data/republic/territories.json');
const require=createRequire(import.meta.url),d3=require('../site/shared/assets/d3.min.js');
const roles=new Set(['consul','suffect','tribune','decemvir','dictator']);
assert.equal(Object.keys(d.years).length,483);
let appointments=0,events=0;
for(let y=509;y>=27;y--){
 const r=d.years[y];assert.ok(r,`Missing year ${y}`);assert.equal(r.year,y);
 assert.ok(r.events.length,`No annual event: ${y}`);
 assert.equal(new Set(r.events.map(e=>e.title)).size,r.events.length,`Duplicate event: ${y}`);
 for(const e of r.events){
  assert.ok(e.title&&e.description.length>=55,`Thin event: ${y}`);
  assert.ok(e.sources.length,`Unsourced event: ${y}`);
  for(const s of e.sources)assert.equal(new URL(s.url).protocol,'https:');
 }
 for(const o of r.officers){assert.ok(d.people[o.person],`Dangling identity ${y}`);assert.ok(roles.has(o.role));assert.ok(Number.isInteger(o.term)&&o.term>=1);}
 assert.equal(a.features.filter(f=>-y>=f.properties.from&&-y<=f.properties.to).length,1,`Map coverage: ${y}`);
 appointments+=r.officers.length;events+=r.events.length;
}
for(const p of Object.values(d.people)){
 assert.match(p.zh,/[\u3400-\u9fff]/);assert.match(p.latin,/[A-Za-z]/);
 assert.ok(p.nameMethod);assert.equal(new URL(p.url).protocol,'https:');
 if(p.bio){assert.ok(p.identified,`Unidentified biography ${p.latin}`);assert.ok(p.bio.length>=75);}
}
for(const f of a.features){
 assert.ok(['Polygon','MultiPolygon'].includes(f.geometry.type));
 const area=d3.geoArea(f);assert.ok(area>0&&area<Math.PI,`Inverted polygon ${f.properties.label}`);
 const points=f.geometry.coordinates.flat(f.geometry.type==='Polygon'?1:2);
 for(const [x,y] of points){assert.ok(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<=90);}
}
// All early stages must contain Rome, and retain the known conquest boundaries.
const territory=y=>a.features.find(f=>-y>=f.properties.from&&-y<=f.properties.to);
for(let y=509;y>=338;y--){
 const f=territory(y);assert.equal(f.properties.precision,'schematic');
 assert.ok(f.properties.sources.length&&f.properties.caption.includes('近似示意'));
 assert.ok(d3.geoContains(f,[12.4964,41.9028]),`Rome outside its territory: ${y}`);
}
assert.ok(!d3.geoContains(territory(397),[12.40,42.02]),'Veii before conquest');
assert.ok(d3.geoContains(territory(396),[12.40,42.02]),'Veii after conquest');
assert.ok(!d3.geoContains(territory(382),[12.71,41.80]),'Tusculum before citizenship');
assert.ok(d3.geoContains(territory(381),[12.71,41.80]),'Tusculum after citizenship');
for(const p of [[12.80,41.96],[12.90,41.84]])assert.ok(!d3.geoContains(territory(338),p),'Tibur and Praeneste remain allies');
assert.equal(territory(337).properties.precision,undefined,'Retain later upstream stages');
assert.equal(d.years[509].officers.length,5);
assert.equal(d.years[451].officers.filter(o=>o.role==='decemvir').length,10);
assert.equal(d.years[450].officers.filter(o=>o.role==='consul').length,0);
for(const y of [375,374,373,372,371])assert.equal(d.years[y].officers.length,0);
for(const y of [333,324,309,301]){assert.equal(d.years[y].regime,'dictator-year');assert.ok(d.years[y].officers.every(o=>o.role==='dictator'));}
assert.ok(d.years[215].officers.some(o=>o.note.includes('就任前')));
assert.ok(d.years[162].officers.some(o=>o.note.includes('辞职')));
assert.equal(d.years[43].officers.length,6);
assert.equal(d.years[27].officers.length,2);
assert.equal(d.stats.appointments,appointments);assert.equal(d.stats.events,events);
assert.equal(d.stats.people,Object.keys(d.people).length);
assert.equal(d.stats.biographies,Object.values(d.people).filter(p=>p.bio).length);
assert.equal(d.stats.biographies,Math.ceil(d.stats.people/3));
assert.doesNotMatch(JSON.stringify(d),/档案正在整理|此条仅用于本地|未发布|TODO|undefined|NaN/);
console.log(`Validated ${483} years, ${appointments} appointments, ${events} events, ${d.stats.biographies} biographies and ${a.features.length} map stages.`);

const stories=read('data/republic/stories.json');
assert.deepEqual(stories,read('data-source/republic/stories.json'),'Run build_data.py after editing stories');
assert.equal(stories.length,10);
assert.equal(new Set(stories.map(s=>s.id)).size,10);
let chapters=0;
for(const s of stories){
 assert.match(s.id,/^[a-z]+(?:-[a-z]+)*$/);
 for(const key of ['title','subtitle','motif','theme','setup','question'])assert.ok(typeof s[key]==='string'&&s[key].trim(),`${s.id}: missing ${key}`);
 assert.ok(s.setup.length>=80,`${s.id}: incomplete opening`);
 assert.ok(s.cast.length>=3&&s.cast.every(p=>p.name&&p.role),`${s.id}: missing cast`);
 assert.ok(s.chapters.length>=5,`${s.id}: incomplete narrative`);
 assert.equal(s.chapters[0].year,s.start);
 let previous=510;
 for(const c of s.chapters){
  assert.ok(Number.isInteger(c.year)&&d.years[c.year],`${s.id}: missing year ${c.year}`);
  assert.ok(c.year<previous,`${s.id}: chapters must advance in BCE order`);previous=c.year;
  assert.ok(c.title&&c.text.length>=55&&c.reference,`${s.id}: incomplete chapter ${c.year}`);
  assert.ok(Number.isInteger(c.source)&&s.sources[c.source],`${s.id}: missing citation ${c.year}`);
  chapters++;
 }
 for(const source of s.sources){assert.ok(source.label);assert.equal(new URL(source.url).protocol,'https:');}
}
const authoredText=[...Object.values(d.years).flatMap(r=>r.events.map(e=>e.description)),...Object.values(d.people).map(p=>p.bio),...d.method.map(m=>m.html)].join('\n');
assert.doesNotMatch(authoredText,/不能(?:据此|证明|说明|等同)|不应被|不宜把|不等于其中|不假装|不虚构|不声称|不是.*?可.*?核证/,'Use direct prose and describe specific source differences');
console.log(`Validated ${stories.length} stories, ${chapters} linked chapters and editorial copy.`);
