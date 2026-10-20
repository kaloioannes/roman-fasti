'use strict';
// Optional vocabulary requests are cached separately from the five archives.
window.FastiGlossary = (() => {
  const cache = {}, pending = {};
  const text = s => typeof s === 'string' && s.length > 0;
  const key = s => text(s) && /^[a-z][a-z0-9-]*$/.test(s);
  const periods = ['kingdom','republic','empire','divided-empire','byzantine'];
  const year = y => Number.isSafeInteger(y) && y !== 0 && y >= -753 && y <= 1453;
  function valid(v, full = true) {
    if(v?.schemaVersion !== 1 || !text(v.version) || !v.entries || !Object.keys(v.entries).length) return false;
    const refs = rs => Array.isArray(rs) && rs.length > 0 && rs.every(r => v.sources?.[r.source] && text(r.locator) && text(r.supports));
    if(!Object.entries(v.entries).every(([id,e]) => key(id) && e?.id === id && text(e.label) && text(e.native) && text(e.summary) && text(e.caution)
      && e.url === 'glossary/#term=' + id && Array.isArray(e.inline) && e.inline.every(text)
      && Array.isArray(e.senses) && e.senses.length > 0 && new Set(e.senses.map(s=>s.id)).size === e.senses.length
      && e.senses.every(s => key(s.id) && text(s.era) && text(s.meaning) && text(s.limits) && Array.isArray(s.periods) && s.periods.length > 0 && s.periods.every(p=>periods.includes(p))
        && Array.isArray(s.range) && s.range.length === 2 && s.range.every(year) && s.range[0] <= s.range[1]
        && (!full || text(s.powers) && refs(s.references))))) return false;
    if(!full) return [v.byPerson,v.byYear].every(map=>map&&Object.values(map).every(ids=>Array.isArray(ids)&&ids.every(id=>v.entries[id])));
    return v.license === 'CC BY-SA 4.0' && text(v.method) && v.categories && v.sources && Array.isArray(v.periods)
      && v.periods.length === 5 && v.periods.every(p=>periods.includes(p.id)&&text(p.title))
      && Object.values(v.sources).every(r=>text(r.label)&&text(r.author)&&text(r.edition)&&/^https:\/\//.test(r.url)&&text(r.scope)&&text(r.limitations)
        && ['primary','research','catalogue','reference'].includes(r.kind)&&['text','excerpt','abstract','indirect'].includes(r.access)&&/^\d{4}-\d{2}-\d{2}$/.test(r.checked)
        && (!r.via || text(r.via.label)&&/^https:\/\//.test(r.via.url)&&text(r.via.locator)))
      && Object.values(v.entries).every(e=>v.categories[e.category]&&Array.isArray(e.aliases)&&e.aliases.every(text)
        && Array.isArray(e.related)&&e.related.every(id=>v.entries[id]&&id!==e.id)&&Array.isArray(e.examples)&&e.examples.length>0
        && e.examples.every(x=>periods.includes(x.period)&&year(x.year)&&text(x.note)&&e.senses.some(s=>s.id===x.sense)
          && x.yearURL===x.period+'/#year='+(x.period==='republic'?-x.year:x.year)&&refs(x.references)
          && (!x.person || key(x.person)&&text(x.personLabel)&&x.personURL===x.period+'/#person='+x.person)))
      && [v.byPerson,v.byYear].every(map=>map&&Object.values(map).every(ids=>Array.isArray(ids)&&ids.every(id=>v.entries[id])));
  }
  async function load(full = true) {
    const kind = full ? 'index' : 'inline';
    if(cache[kind]) return cache[kind];
    if(!pending[kind]) pending[kind] = (async () => {
      const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),20000);
      try {
        // Literal paths allow the offline release builder to fingerprint both.
        const url = full ? '../data/glossary/index.json' : '../data/glossary/inline.json';
        const response = await fetch(url,{signal:controller.signal});
        if(!response.ok) throw Error('Glossary request failed');
        const value = await response.json();
        if(!valid(value,full)) throw Error('Invalid glossary');
        cache[kind] = value; return value;
      } finally {clearTimeout(timer); delete pending[kind];}
    })();
    return pending[kind];
  }
  const el = (tag,textValue,className) => {const n=document.createElement(tag);if(textValue!=null)n.textContent=textValue;if(className)n.className=className;return n;};
  const link = (label,url) => {const a=el('a',label);a.href='../'+url;return a;};
  const when = y => y < 0 ? '公元前'+(-y)+'年' : '公元'+y+'年';
  return {load,valid,el,link,when};
})();
