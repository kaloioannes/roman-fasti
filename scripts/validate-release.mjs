import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../_site');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'asset-manifest.json'),'utf8'));
assert.deepEqual(Object.keys(manifest).sort(),['app.js','data/republic.json','data/stories.json','data/territories.json','style.css']);
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
console.log('Release verified: CSS, JavaScript and all three datasets have matching content fingerprints.');
