import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(repo,'_site');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const manifest=JSON.parse(read('asset-manifest.json'));
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const expected=['project.json',...walk(path.join(repo,'data')).filter(p=>p.endsWith('.json')).map(p=>path.relative(repo,p).split(path.sep).join('/')),
 ...walk(path.join(repo,'site')).filter(p=>/\.(css|js)$/.test(p)&&!p.includes(`${path.sep}assets${path.sep}`)).map(p=>path.relative(path.join(repo,'site'),p).split(path.sep).join('/'))];
assert.deepEqual(Object.keys(manifest).sort(),expected.sort());
const versioned=new Set(Object.values(manifest));
for(const [original,name] of Object.entries(manifest)){
 const bytes=fs.readFileSync(path.join(root,name));
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 assert.ok(name.includes(`.${hash}.`),`Wrong fingerprint: ${original}`);
}
function verifyURL(file,url){
 if(/^(?:[a-z]+:|\/\/|#)/i.test(url))return;
 const pathname=url.split(/[?#]/)[0];
 if(!pathname)return;
 assert.ok(!pathname.startsWith('/'),`Root-absolute URL breaks Pages subpaths: ${file}: ${url}`);
 const name=path.posix.normalize(path.posix.join(path.posix.dirname(file),pathname));
 const target=path.join(root,name,pathname.endsWith('/')?'index.html':'');
 assert.ok(fs.existsSync(target),`Broken local reference: ${file}: ${url}`);
 assert.ok(!(name in manifest),`Unversioned asset reference: ${file}: ${url}`);
}
for(const file of walk(root)){
 const name=path.relative(root,file).split(path.sep).join('/');
 if(name.startsWith('shared/assets/'))continue;
 if(file.endsWith('.html')){
   const html=read(name);
   for(const m of html.matchAll(/(?:src|href)="([^"]+)"/g))verifyURL(name,m[1]);
 }else if(/\.(js|css)$/.test(file)){
   for(const m of read(name).matchAll(/["']([^"'\s]+\.(?:json|js|css|ttf|svg))["']/g))verifyURL(name,m[1]);
 }
}
for(const period of JSON.parse(read(manifest['project.json'])).periods.filter(p=>p.status==='available')){
 const html=read(`${period.id}/index.html`);
 assert.ok(html.includes('href="../"'),`Missing catalogue link: ${period.id}`);
 assert.ok(html.includes(path.posix.basename(manifest[`${period.id}/app.js`])));
}
assert.ok(versioned.has(manifest['shared/legacy-routes.js']));
console.log(`Release verified: ${expected.length} fingerprinted assets, all local HTML/JS/CSS references, period navigation and Pages-relative paths.`);
