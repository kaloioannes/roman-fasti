'use strict';
// Pure search functions also run in Node regression tests. No identity merging.
(function(root) {
  const normalize = text => String(text).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase()
    .replace(/ς/g,'σ').replace(/j/g,'i').replace(/v/g,'u').replace(/[^\p{L}\p{N}]/gu,'');
  const when = year => year < 0 ? `公元前${-year}年` : `公元${year}年`;
  const yearURL = (period, year) => `${period}/#year=${period === 'republic' ? -year : year}`;
  function parseYear(query) {
    const s = query.normalize('NFKC').trim().replace(/\s+/g,'').toLowerCase();
    const patterns = [
      [/^(?:公元前|前|bce?)(\d+)年?$/, -1], [/^(\d+)(?:年)?bce?$/, -1],
      [/^(?:公元|ad|ce)(\d+)年?$/, 1], [/^(\d+)(?:年)?(?:ad|ce)$/, 1],
      [/^-(\d+)年?$/, -1], [/^\+(\d+)年?$/, 1], [/^(\d+)年?$/, 0]
    ];
    for (const [pattern, sign] of patterns) {
      const match = s.match(pattern);
      if (!match) continue;
      const n = Number(match[1]);
      if (!Number.isSafeInteger(n)) return {error:'年份数字过大。本站收录公元前753年至公元1453年。', years:[]};
      if (!n) return {error:'历史纪年没有公元0年。请输入非零整数，例如“前1年”或“公元1年”。', years:[]};
      return {ambiguous:sign === 0, years:sign ? [sign*n] : [n,-n]};
    }
    return null;
  }
  function prepare(index) {
    return index.entries.map(entry => ({...entry, fields:[entry.title, ...entry.names, entry.text].map(normalize)}));
  }
  function search(entries, query, {period='', kind='', years=null}={}) {
    const terms = query.trim().split(/\s+/u).map(normalize).filter(Boolean);
    if (!years && !terms.length) return [];
    return entries.flatMap(entry => {
      if ((period && entry.period !== period) || (kind && entry.kind !== kind)) return [];
      if (years) return entry.spans.some(([a,b]) => years.some(y => a <= y && y <= b)) ? [{entry,score:0}] : [];
      if (!terms.every(term => entry.fields.some(field => field.includes(term)))) return [];
      const score = terms.reduce((sum,term) => sum + (entry.fields[0] === term ? 100 : entry.fields[0].startsWith(term) ? 70 : entry.fields[0].includes(term) ? 55 : entry.fields.slice(1,-1).some(f=>f.includes(term)) ? 40 : 10), 0);
      return [{entry,score}];
    }).sort((a,b) => b.score-a.score || (a.entry.spans[0]?.[0] ?? Infinity)-(b.entry.spans[0]?.[0] ?? Infinity) || a.entry.id.localeCompare(b.entry.id)).map(r=>r.entry);
  }
  const api = {normalize,when,yearURL,parseYear,prepare,search};
  if (typeof module !== 'undefined') module.exports = api;
  else root.FastiSearch = api;
})(globalThis);
