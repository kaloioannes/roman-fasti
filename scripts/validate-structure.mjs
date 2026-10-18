import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const project=JSON.parse(fs.readFileSync(path.join(root,'project.json'),'utf8'));
assert.equal(new Set(project.periods.map(p=>p.id)).size,project.periods.length);
for(const period of project.periods){
  assert.match(period.id,/^[a-z]+(?:-[a-z]+)*$/);
  assert.ok(period.title&&period.description&&period.range);
  assert.ok(Number.isInteger(period.start)&&Number.isInteger(period.end)&&period.start<period.end);
  assert.ok(period.start!==0&&period.end!==0);
  assert.ok(['available','planned'].includes(period.status));
  if(period.status==='available')for(const name of [`site/${period.id}/index.html`,`site/${period.id}/app.js`,`data/${period.id}/records.json`,`data-source/${period.id}`]){
    assert.ok(fs.existsSync(path.join(root,name)),`Incomplete period: ${name}`);
  }
  if(period.status==='available')assert.ok(period.latin&&period.caption&&period.milestone,`Missing catalogue copy: ${period.id}`);
}
const published=project.periods.filter(p=>p.status==='available');
for(let i=1;i<published.length;i++)assert.equal(published[i-1].end,published[i].start,'Adjacent published volumes must share a chronological boundary');
for(const name of ['app.js','style.css','imperial-app.js','imperial.css','index.html','emperors.html']){
  assert.ok(!fs.existsSync(path.join(root,name)),`Web source escaped site/: ${name}`);
}
for(const name of fs.readdirSync(path.join(root,'data-source'))){
  assert.ok(fs.statSync(path.join(root,'data-source',name)).isDirectory(),'Keep editable sources in period directories');
}
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
assert.equal(pkg.name,'roman-fasti');
console.log(`Structure verified: ${project.periods.filter(p=>p.status==='available').length} published periods, ${project.periods.filter(p=>p.status==='planned').length} planned periods.`);
