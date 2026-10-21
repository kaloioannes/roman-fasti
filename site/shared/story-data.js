'use strict';
window.FastiStories = (() => {
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const link=(text,url)=>{const a=el('a',text);a.href='../'+url;return a;};
  const text=v=>typeof v==='string'&&v.trim().length>0;
  const year=v=>Number.isSafeInteger(v)&&v!==0;
  const key='fasti-reading-v1';
  let cache={},pending={},memory={version:1,stories:{}},volatile=false;
  function progress(){if(volatile)return memory;try{const v=JSON.parse(localStorage.getItem(key)||'{}');memory=v&&v.version===1&&v.stories&&typeof v.stories==='object'&&!Array.isArray(v.stories)?v:{version:1,stories:{}};return memory;}catch{return memory;}}
  function state(id){const p=progress().stories[id];return p&&Array.isArray(p.read)?{read:p.read.filter(text),last:text(p.last)?p.last:null}: {read:[],last:null};}
  function save(id,chapter,mark){const v=progress(),p=state(id);if(chapter)p.last=chapter;if(mark===true&&!p.read.includes(chapter))p.read.push(chapter);if(mark===false)p.read=p.read.filter(c=>c!==chapter);v.stories[id]=p;memory=v;try{localStorage.setItem(key,JSON.stringify(v));volatile=false;return true;}catch{volatile=true;return false;}}
  function reset(id){const v=progress();if(id)delete v.stories[id];else v.stories={};memory=v;try{localStorage.setItem(key,JSON.stringify(v));volatile=false;return true;}catch{volatile=true;return false;}}
  function spoiler(){try{return localStorage.getItem('fasti-spoiler-v2')==='true';}catch{return false;}}
  function valid(v,full=true){try{
    if(v?.schemaVersion!==1||!v.stories||!v.byYear||!v.byPerson)return false;
    const safeURL=u=>typeof u==='string'&&/^(stories\/#story=[a-z0-9-]+(?:&chapter=[a-z0-9-]+)?|(?:kingdom|republic|empire|divided-empire|byzantine|power)\/#(?:person=[a-z0-9-]+|year=-?\d+))$/.test(u);
    const rows=Object.entries(v.stories);
    if(!rows.length||!rows.every(([id,s])=>s.id===id&&text(s.title)&&s.url==='stories/#story='+id&&text(s.period)))return false;
    const chapter=(s,c)=>full?v.stories[s]?.chapters?.some(x=>x.id===c):v.stories[s]?.chapters?.[c];
    if(![v.byYear,v.byPerson].every(map=>Object.values(map).every(rs=>Array.isArray(rs)&&rs.every(r=>chapter(r.story,r.chapter)))))return false;
    if(!full)return rows.every(([,s])=>s.chapters&&Object.values(s.chapters).every(c=>text(c.title)&&safeURL(c.url)));
    return text(v.version)&&text(v.method)&&v.license==='CC BY-SA 4.0'&&Array.isArray(v.periods)&&v.sources
      &&Object.values(v.sources).every(s=>['label','author','edition','scope','limitations','checked'].every(k=>text(s[k]))&&/^https:\/\//.test(s.url)&&['excerpt','inherited','indirect'].includes(s.access))
      &&rows.every(([,s])=>['subtitle','question','setup','theme','caution'].every(k=>text(s[k]))&&Array.isArray(s.cast)&&s.cast.every(p=>text(p.label)&&text(p.role))&&Array.isArray(s.chapters)&&s.chapters.length>1&&new Set(s.chapters.map(c=>c.id)).size===s.chapters.length&&s.chapters.every(c=>text(c.id)&&text(c.title)&&year(c.year)&&text(c.dateLabel)&&['year','range','traditional','reading-anchor'].includes(c.dateKind)&&safeURL(c.url)&&safeURL(c.yearURL)&&Array.isArray(c.paragraphs)&&c.paragraphs.length&&c.paragraphs.every(text)&&Array.isArray(c.people)&&c.people.every(p=>text(p.label)&&text(p.key)&&safeURL(p.url))&&Array.isArray(c.references)&&c.references.length&&c.references.every(r=>v.sources[r.source]&&text(r.locator)&&text(r.supports))));
  }catch{return false;}}
  async function load(full=true){const kind=full?'index':'navigation';if(cache[kind])return cache[kind];if(!pending[kind])pending[kind]=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(full?'../data/stories/index.json':'../data/stories/navigation.json',{signal:controller.signal});if(!r.ok)throw Error('Story request failed');const v=await r.json();if(!valid(v,full))throw Error('Invalid stories');return cache[kind]=v;}finally{clearTimeout(timer);delete pending[kind];}})();return pending[kind];}
  function mount(kind,key,host){if(!host)return;
    const hash=location.hash;
    const slot=el('section',null,'narrative-links'),token=kind+':'+key;slot.dataset.key=token;slot.setAttribute('aria-label','连续故事阅读');host.append(slot);
    async function render(){try{const v=await load(false);if(location.hash!==hash||!slot.isConnected||slot.dataset.key!==token)return;const rows=v[kind==='year'?'byYear':'byPerson'][key]||[];slot.replaceChildren();if(!rows.length){slot.remove();return;}
      slot.append(el('h2','从这里连续读故事'));const list=el('ul');for(const r of rows){const s=v.stories[r.story],c=s.chapters[r.chapter],li=el('li');li.append(link(s.title+' · '+(spoiler()?'打开关联章节':c.title)+' ↗',c.url));list.append(li);}slot.append(list,el('p','章节是编订的阅读关联；年度入口可能是传统纪年或跨年过程的锚点，不据链接自动推断人物行动。'));
    }catch{if(!slot.isConnected)return;slot.replaceChildren(el('p','剧本关联暂时无法载入，原档案仍可阅读。'));const b=el('button','重试剧本关联');b.onclick=render;slot.append(b);}}render();
  }
  function people(profiles,host){if(!host)return;for(const p of profiles)mount('person',p.period+':'+p.person,host);}
  return {el,link,load,valid,state,save,reset,spoiler,mount,people,progress};
})();
