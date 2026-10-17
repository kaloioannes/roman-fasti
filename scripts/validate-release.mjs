import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../_site');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
assert.deepEqual(Object.keys(manifest).sort(),['app.js','data/empire.json','data/imperial-territories.json','data/republic.json','data/stories.json','data/territories.json','imperial-app.js','imperial.css','style.css']);
for(const [original,versioned] of Object.entries(manifest)){
 const bytes=fs.readFileSync(path.join(root,versioned));
 const hash=createHash('sha256').update(bytes).digest('hex').slice(0,16);
 assert.ok(versioned.includes(`.${hash}.`),`Wrong fingerprint: ${original}`);
}
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const js=fs.readFileSync(path.join(root,manifest['app.js']),'utf8');
for(const name of ['app.js','style.css'])assert.ok(html.includes(`"${manifest[name]}"`),`Unversioned entry: ${name}`);
for(const name of ['data/republic.json','data/territories.json','data/stories.json']){
 assert.ok(js.includes(`'${manifest[name]}'`));
 assert.ok(!js.includes(`'${name}'`),`Unversioned data fetch: ${name}`);
}
const imperialHTML=fs.readFileSync(path.join(root,'emperors.html'),'utf8');
const imperialJS=fs.readFileSync(path.join(root,manifest['imperial-app.js']),'utf8');
for(const name of ['style.css','imperial.css','imperial-app.js'])assert.ok(imperialHTML.includes(`"${manifest[name]}"`),`Unversioned imperial entry: ${name}`);
for(const name of ['data/empire.json','data/imperial-territories.json']){
 assert.ok(imperialJS.includes(`'${manifest[name]}'`),`Missing imperial dataset: ${name}`);
 assert.ok(!imperialJS.includes(`'${name}'`),`Unversioned imperial data: ${name}`);
}
assert.ok(html.includes('href="emperors.html"'));
assert.ok(imperialHTML.includes('href="index.html"'));
console.log('Release verified: both volumes use matching CSS, JavaScript and dataset fingerprints.');
