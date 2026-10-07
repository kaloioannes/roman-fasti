import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const d=read('data/republic.json'),a=read('data/territories.json');
const require=createRequire(import.meta.url),d3=require('../assets/d3.min.js');
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
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const match of html.matchAll(/(?:src|href)="((?:assets\/|data\/|style\.css|app\.js)[^"]+)"/g))assert.ok(fs.existsSync(path.join(root,match[1])));
console.log(`Validated ${483} years, ${appointments} appointments, ${events} events, ${d.stats.biographies} biographies and ${a.features.length} map stages.`);
