'use strict';
(() => {
  const P=window.FastiPeople,main=document.querySelector('#content'),el=P.el;
  let version=0;
  function profiles(index,person){
    const nav=el('nav',null,'identity-profiles');nav.setAttribute('aria-label','各卷原档案');
    person.profiles.forEach(p=>{const a=P.link(P.profileLabel(index,p)+' · '+p.zh+' ↗',p.url);a.dataset.period=p.period;nav.append(a);});return nav;
  }
  function directory(index,params){
    document.title='跨卷人物 · FASTI 罗马历史纪年';
    main.append(el('p','PROSOPOGRAPHIA · 人物相续','eyebrow'),el('h1','分卷有界，生涯相连。'),
      el('p',index.method,'identity-intro'),el('p',`已确认${Object.keys(index.people).length}位跨卷人物。此处是身份关联目录；五卷全部人物仍可通过全站搜索与各卷索引查找。`));
    const form=el('form'),label=el('label','查找跨卷人物'),input=el('input'),button=el('button','查找');
    input.type='search';input.name='q';input.id='identity-query';input.maxLength=160;input.value=params.get('q')||'';input.placeholder='奥古斯都、屋大维、Zeno、Ζηνων…';label.htmlFor=input.id;button.type='submit';form.append(label,input,button);main.append(form);
    const status=el('p',null,'identity-status');status.setAttribute('role','status');const grid=el('div',null,'identity-grid');main.append(status,grid);
    function filter(){
      const terms=input.value.trim().split(/\s+/).map(P.normalize).filter(Boolean);
      const rows=Object.values(index.people).filter(p=>terms.every(t=>P.normalize([p.zh,...p.aliases,...p.profiles.flatMap(p=>[p.zh,...p.names])].join(' ')).includes(t)));
      status.textContent=`找到${rows.length}位已确认的跨卷人物${rows.length?'':'。可尝试其他译名，或到全站搜索查找尚未关联的人物'}。`;grid.replaceChildren();
      rows.forEach(p=>{const card=el('article');card.dataset.globalPerson=p.id;const h=el('h2');h.append(P.link(p.zh+' ↗',p.url));card.append(h,el('p',p.aliases.join(' · '),'identity-names'),profiles(index,p),el('p',`${p.profiles.length}卷 · ${p.years.length}个已收录相关年度`));grid.append(card);});
    }
    input.oninput=filter;form.onsubmit=e=>{e.preventDefault();const q=input.value.trim();const hash=q?'q='+encodeURIComponent(q):'';if(location.hash.slice(1)!==hash)location.hash=hash;};filter();
    const h=el('h2','同名，不同人');main.append(h,el('p','以下条目即使本卷ID相同，也保持独立档案。'));
    index.distinct.forEach(d=>{const box=el('section',null,'identity-distinct');box.append(el('h3',d.label),el('p',d.editorNote));d.profiles.forEach(p=>box.append(P.link(P.profileLabel(index,p)+' · '+p.zh+' ↗',p.url)));box.append(P.evidence(index,d.evidence));main.append(box);});
  }
  function person(index,id){
    const p=index.people[id];
    const back=P.link('← 跨卷人物目录','people/');main.append(back);
    if(!p){document.title='人物地址有误 · FASTI';main.append(el('h1','找不到这份跨卷人物档案'),el('p','此全站人物ID尚未收录。请返回目录或使用全站搜索。'));return;}
    document.title=p.zh+' · 跨卷人物档案 · FASTI';main.dataset.globalPerson=id;
    main.append(el('p','一人 · 多卷 · 同一生涯','eyebrow'),el('h1',p.zh),el('p',p.aliases.join(' · '),'identity-names'),profiles(index,p),el('p',p.editorNote,'identity-intro'),
      el('h2','全部已收录任职与称号'),el('p','按原卷逐条保留；同一任期可能在两卷重复收录，不能相加计算时长。仅有年度精度时不补月日，起讫窗口和异说沿用原卷。'),P.appointments(index,p),P.years(index,p),el('h2','跨卷身份依据'));
    p.profiles.forEach(profile=>{const box=el('section',null,'identity-basis');box.append(el('h3',P.profileLabel(index,profile)),el('p',profile.editorNote));main.append(box);});
    main.append(P.evidence(index,p.profiles.flatMap(p=>p.evidence)),el('p',index.method,'identity-fineprint'));
    window.FastiSearchTarget?.globalPerson(id,main);
    window.FastiDynasties?.mount(p.profiles,main);
    window.FastiPower?.people(p.profiles,main);
    const distinct=index.distinct.filter(d=>d.profiles.some(r=>p.profiles.some(profile=>profile.period===r.period&&profile.person===r.person)));
    if(distinct.length)main.append(el('h2','同名人物辨识'));
    distinct.forEach(d=>{const box=el('section',null,'identity-distinct');box.append(el('p',d.editorNote));d.profiles.forEach(r=>box.append(P.link(P.profileLabel(index,r)+' · '+r.zh+' ↗',r.url)));box.append(P.evidence(index,d.evidence));main.append(box);});
  }
  async function route(){
    const current=++version;main.removeAttribute('data-global-person');main.replaceChildren(el('p','正在查阅跨卷档案…','identity-status'));main.setAttribute('aria-busy','true');
    try {
      const index=await P.load();if(current!==version)return;
      main.replaceChildren();const params=new URLSearchParams(location.hash.slice(1));
      if(params.has('person'))person(index,params.get('person'));else directory(index,params);
      main.focus({preventScroll:true});window.scrollTo(0,0);
    } catch {if(current===version)P.failure(main,route);}
    finally {if(current===version)main.setAttribute('aria-busy','false');}
  }
  document.querySelector('#theme-button').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('fasti-theme',t);}catch{}};
  addEventListener('hashchange',route);route();
})();
