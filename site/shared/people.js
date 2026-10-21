'use strict';
// One small projection for identities, never the five full volume datasets.
window.FastiPeople = (() => {
  let data, pending;
  const el = (tag, text, className) => {
    const n = document.createElement(tag);
    if (text != null) n.textContent = text;
    if (className) n.className = className;
    return n;
  };
  const when = y => y < 0 ? `公元前${-y}年` : `公元${y}年`;
  const normalize = s => String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
  const link = (text, url) => {const a=el('a',text);a.href='../'+url;return a;};
  function valid(value) {
    const text = s => typeof s==='string' && !!s;
    const url = s => text(s) && /^(?:kingdom|republic|empire|divided-empire|byzantine|people)\/#/.test(s);
    const year = n => Number.isSafeInteger(n) && n!==0;
    const refs = keys => Array.isArray(keys)&&keys.length>0&&keys.every(k=>value.evidence?.[k]);
    const profile = p => p && text(p.period)&&text(p.person)&&text(p.zh)&&url(p.url)
      && value.periods.some(v=>v.id===p.period)&&Array.isArray(p.names)&&p.names.every(text)
      && Array.isArray(p.years)&&p.years.every(y=>year(y.year)&&url(y.url))
      && Array.isArray(p.appointments)&&p.appointments.every(a=>text(a.id)&&text(a.label)&&text(a.dateLabel)
        && a.record&&typeof a.record==='object'&&text(a.note||' ')&&Array.isArray(a.sources)
        && a.sources.every(s=>text(s.label)&&/^https:\/\//.test(s.url)));
    return value?.schemaVersion===1 && text(value.method) && Array.isArray(value.periods)
      && value.periods.every(p=>text(p.id)&&text(p.title)) && value.people && value.lookup && value.evidence
      && Array.isArray(value.distinct) && Object.values(value.evidence).every(e=>text(e.label)&&/^https:\/\//.test(e.url)&&text(e.locator)&&text(e.claim)&&['direct','indirect'].includes(e.consultation)&&text(e.checked))
      && Object.entries(value.people).every(([id,p])=>p.id===id&&text(p.zh)&&url(p.url)&&text(p.editorNote)
        && Array.isArray(p.aliases)&&p.aliases.every(text)&&Array.isArray(p.years)&&p.years.every(y=>year(y.year)
          && Array.isArray(y.profiles)&&y.profiles.every(r=>text(r.period)&&text(r.person)&&url(r.url)))
        && Array.isArray(p.profiles)&&p.profiles.length>=2&&p.profiles.every(r=>profile(r)
          && value.lookup[r.period+':'+r.person]===id&&refs(r.evidence)&&text(r.editorNote)))
      && Object.values(value.lookup).every(id=>value.people[id])
      && value.distinct.every(d=>text(d.label)&&text(d.editorNote)&&refs(d.evidence)&&Array.isArray(d.profiles)&&d.profiles.length===2&&d.profiles.every(profile));
  }
  async function load() {
    if(data)return data;
    if(!pending)pending=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try {
        const response=await fetch('../data/people/index.json',{signal:controller.signal});
        if(!response.ok)throw Error('Identity request failed');
        const value=await response.json();if(!valid(value))throw Error('Invalid identity projection');
        data=value;return value;
      } finally {clearTimeout(timer);pending=null;}
    })();
    return pending;
  }
  function profileLabel(index,p) {return index.periods.find(v=>v.id===p.period).title;}
  function sources(list) {
    const box=el('div',null,'identity-sources');
    for(const s of list){const a=el('a',s.label+' ↗');a.href=s.url;a.target='_blank';a.rel='noopener';box.append(a);}
    return box;
  }
  function appointments(index,person) {
    const box=el('div',null,'identity-appointments');
    person.profiles.forEach(p=>{
      const group=el('section',null,'identity-volume');group.dataset.period=p.period;
      group.append(el('h3',profileLabel(index,p)),link('打开本卷原档案 ↗',p.url));
      if(p.reference)group.append(el('p','原卷定位：'+p.reference,'identity-fineprint'));
      const list=el('ol');
      p.appointments.forEach(a=>{
        const item=el('li');item.dataset.appointment=a.id;
        item.append(el('strong',a.label+' · '+a.dateLabel));
        const r=a.record;
        for(const t of [r.territory,r.recognition,r.certainty,a.note])if(t)item.append(el('p',t));
        if(r.term)item.append(el('p',`名录标注第${r.term}次任职`));
        item.append(sources(a.sources));list.append(item);
      });
      group.append(list);box.append(group);
    });
    return box;
  }
  function years(index,person) {
    const details=el('details',null,'identity-years');
    details.append(el('summary',`全部已收录相关年度 · ${person.years.length}年`));
    const list=el('ul');
    person.years.forEach(y=>{
      const row=el('li');row.append(el('strong',when(y.year)));
      y.profiles.forEach(p=>row.append(link(profileLabel(index,p)+' ↗',p.url)));list.append(row);
    });details.append(list);return details;
  }
  function evidence(index,keys) {
    const list=el('ol',null,'identity-evidence');
    [...new Set(keys)].forEach(key=>{
      const e=index.evidence[key],row=el('li');row.append(sources([e]),el('p','定位：'+e.locator),el('p',e.claim),
        el('p',`${e.kind} · ${e.consultation==='direct'?'本次直接查阅':'间接引述，未直接核读'} · 核对：${e.checked}`,'identity-fineprint'));
      list.append(row);
    });return list;
  }
  function failure(host,retry) {
    host.replaceChildren(el('p','跨卷关联资料暂时无法载入或超时。各卷原档案仍可阅读。','identity-status'));
    const button=el('button','重试跨卷关联');button.type='button';button.onclick=retry;host.append(button);
  }
  async function mount(period,personId,host) {
    if(!host)return;
    window.FastiStories?.mount('person',period+':'+personId,host);
    window.FastiDynasties?.mount([{period,person:personId}],host);
    window.FastiPower?.mount('person',period+':'+personId,host);
    const timeline=el('p',null,'timeline-profile-link');
    timeline.append(link('查看此人的任期时间轴 ↗','timeline/#'+new URLSearchParams({period,person:period+':'+personId})));
    host.append(timeline);
    host.append(link('与另一位人物并排比较 ↗','compare/#'+new URLSearchParams({a:period+':'+personId})));
    const slot=el('section',null,'identity-links');slot.setAttribute('aria-label','跨卷人物关联');
    slot.append(el('p','正在查阅跨卷身份…','identity-status'));host.append(slot);
    async function render(){
      try {
        const index=await load();if(!slot.isConnected)return;
        const person=index.people[index.lookup[period+':'+personId]];
        const distinct=index.distinct.filter(d=>d.profiles.some(p=>p.period===period&&p.person===personId));
        if(!person&&!distinct.length){slot.remove();return;}
        slot.replaceChildren();
        if(person){
          slot.dataset.globalPerson=person.id;
          slot.append(el('h2','本人的其他时期档案'));
          const nav=el('nav');nav.setAttribute('aria-label','本人的其他时期档案');
          person.profiles.filter(p=>p.period!==period||p.person!==personId).forEach(p=>nav.append(link(profileLabel(index,p)+' · '+p.zh+' ↗',p.url)));
          slot.append(nav,link('跨卷总档案 · 全部任职、年度与身份依据 ↗',person.url));
          const details=el('details');details.append(el('summary','跨卷任职与相关年份'),el('p',person.editorNote),appointments(index,person),years(index,person));slot.append(details);
        }
        if(distinct.length)slot.append(el('h2','同名人物辨识'));
        distinct.forEach(d=>{
          slot.append(el('p',d.editorNote));
          d.profiles.filter(p=>p.period!==period||p.person!==personId).forEach(p=>slot.append(link('另一位'+p.zh+' · '+profileLabel(index,p)+' ↗',p.url)));
        });
      } catch {if(slot.isConnected)failure(slot,render);}
    }
    await render();
  }
  return {el,when,normalize,link,load,profileLabel,sources,appointments,years,evidence,failure,mount};
})();
