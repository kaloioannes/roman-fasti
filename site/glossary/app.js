'use strict';
(() => {
  const G=window.FastiGlossary,E=window.FastiSearch,{el,link,when}=G,main=document.querySelector('#content');
  let index,version=0;
  const hash = values => '#'+new URLSearchParams(Object.entries(values).filter(([,v])=>v));
  const period = id => index.periods.find(p=>p.id===id).title;
  const kindNames = {primary:'古代／中世纪文献',research:'研究',catalogue:'机构对象目录',reference:'工具书'};
  const accessNames = {text:'直接阅读正文',excerpt:'直接阅读所列段落／说明',abstract:'仅摘要',indirect:'间接引述'};
  function references(rows) {
    const list=el('ul',null,'glossary-references');
    rows.forEach(r=>{
      const source=index.sources[r.source],li=el('li'),a=el('a',source.label+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener';
      li.append(a,el('p',r.locator,'glossary-locator'),el('p','支持：'+r.supports));
      const more=el('details');more.append(el('summary',kindNames[source.kind]+' · '+accessNames[source.access]),
        el('p',source.author+' · '+source.edition),el('p','核对日期：'+source.checked),el('p','实际查阅：'+source.scope),el('p','材料局限：'+source.limitations));
      if(source.via){const via=el('a',source.via.label);via.href=source.via.url;more.append(via,el('p',source.via.locator));}
      li.append(more);list.append(li);
    });return list;
  }
  function directory(params) {
    document.title='职官、称号与制度词典 · FASTI';
    main.append(el('p','VOCABVLA · 制度与权力','eyebrow'),el('h1','一个称号，未必始终是同一种权力。'),
      el('p','从官职和术语读懂五卷：先辨时代，再看权力、限制与人物。','glossary-lead'));
    const method=el('details',null,'glossary-method');method.append(el('summary','收录范围、年代与来源的读法'),el('p',index.method));main.append(method);
    const form=el('form',null,'glossary-filters');form.setAttribute('role','search');
    const input=el('input');input.type='search';input.id='term-query';input.name='q';input.maxLength=160;input.value=(params.get('q')||'').slice(0,160);input.placeholder='执政官、Caesar、βασιλεύς、紫室…';
    const qLabel=el('label','查找术语');qLabel.htmlFor=input.id;qLabel.append(input);
    const select=(id,label,rows,value)=>{const field=el('label',label),s=el('select');s.id=id;s.name=id;s.append(new Option('全部',''));rows.forEach(([v,t])=>s.append(new Option(t,v)));s.value=value;field.append(s);return [field,s];};
    const [pf,p]=select('period','分卷',index.periods.map(p=>[p.id,p.title]),params.get('period')||'');
    const [cf,c]=select('category','类型',Object.entries(index.categories),params.get('category')||'');
    const y=el('input');y.id='term-year';y.name='year';y.type='text';y.inputMode='numeric';y.value=params.get('year')||'';y.placeholder='前44 / 293 / -27';
    const yf=el('label','适用年代（带符号历史年份）');yf.htmlFor=y.id;yf.append(y);
    const submit=el('button','查找'),clear=el('button','清空');submit.type='submit';clear.type='button';form.append(qLabel,pf,cf,yf,submit,clear);main.append(form);
    const status=el('p',null,'glossary-status'),grid=el('div',null,'glossary-grid');status.setAttribute('role','status');main.append(status,grid);
    const run=()=>{
      const query=input.value.trim().split(/\s+/u).map(E.normalize).filter(Boolean),parsed=y.value.trim()?E.parseYear(y.value):null;
      const yearValue=parsed&&!parsed.error?(parsed.ambiguous?Math.abs(parsed.years[0]):parsed.years[0]):null;
      const bad=(y.value.trim()&&(!parsed||parsed.error))||(params.get('period')&&!index.periods.some(p=>p.id===params.get('period')))||(params.get('category')&&!index.categories[params.get('category')]);
      grid.replaceChildren();
      if(bad){status.textContent='筛选条件需要修正。年份请用非零整数，例如“前44”或“293”；也可清空全部条件。';return;}
      const matchesSense=s=>(!p.value||s.periods.includes(p.value))&&(yearValue===null||s.range[0]<=yearValue&&yearValue<=s.range[1]);
      const found=Object.values(index.entries).filter(e=>(!c.value||c.value===e.category)&&e.senses.some(matchesSense)
        &&query.every(t=>E.normalize([e.label,e.native,...e.aliases,e.summary,e.caution,...e.senses.flatMap(s=>[s.era,s.meaning,s.powers,s.limits])].join(' ')).includes(t)));
      status.textContent=`找到 ${found.length} / ${Object.keys(index.entries).length} 条术语。`+(yearValue!==null?`年代按${when(yearValue)}筛选；裸数字在此年代栏表示公元年。`:'')+'分期范围用于阅读，不是精确创设／废止年。';
      found.forEach(e=>{const a=el('article',null,'glossary-card');a.dataset.termId=e.id;const h=el('h2');h.append(link(e.label+' ↗','glossary/'+hash({term:e.id,q:input.value.trim(),period:p.value,category:c.value,year:y.value.trim()})));
        a.append(el('p',index.categories[e.category],'eyebrow'),h,el('p',e.native,'glossary-native'),el('p',e.summary));
        const senses=e.senses.filter(matchesSense);a.append(el('p',senses.map(s=>s.era).join(' · '),'glossary-era'));grid.append(a);});
      if(!found.length)grid.append(el('p','没有匹配的已编订术语。可尝试其他译名、去掉重音或清除年代／分卷条件。'));
    };
    const navigate=()=>{location.hash=hash({q:input.value.trim(),period:p.value,category:c.value,year:y.value.trim()});};
    form.onsubmit=e=>{e.preventDefault();navigate();};p.onchange=navigate;c.onchange=navigate;
    clear.onclick=()=>{location.hash='';if(!location.hash){params=new URLSearchParams();input.value='';p.value='';c.value='';y.value='';run();input.focus();}};
    // Text input previews without changing history on every keystroke.
    input.oninput=run;y.oninput=run;run();
    const actions=el('div',null,'glossary-actions'),raw=el('a','查看全部词条的 JSON ↗');
    raw.href = '../data/glossary/index.json';
    actions.append(raw);main.append(actions);
  }
  function detail(id,params) {
    const back={q:params.get('q'),period:params.get('period'),category:params.get('category'),year:params.get('year')};
    main.append(link('← 词典目录','glossary/'+hash(back)));
    const e=index.entries[id];
    if(!e){document.title='词条地址有误 · FASTI';main.append(el('h1','找不到这个词条'),el('p','该稳定ID尚未收录。请从目录查找译名或原文。'));return;}
    main.dataset.termId=id;document.title=e.label+' · 制度词典 · FASTI';
    main.append(el('p','VOCABVLA · '+index.categories[e.category],'eyebrow'),el('h1',e.label),el('p',e.native,'glossary-native'),el('p',e.aliases.join(' · '),'glossary-aliases'),el('p',e.summary,'glossary-lead'),el('p',e.caution,'glossary-caution'));
    const nav=el('nav',null,'glossary-sense-nav');nav.setAttribute('aria-label','按年代阅读释义');
    e.senses.forEach(s=>{const a=el('a',s.era);a.href=hash({term:id,sense:s.id});nav.append(a);});main.append(nav);
    main.append(el('p','以下是释义适用范围；端点不等于制度精确创设或废止时间。','glossary-era'));
    e.senses.forEach(s=>{const section=el('section',null,'glossary-sense');section.id='sense-'+s.id;section.tabIndex=-1;section.dataset.sense=s.id;
      section.append(el('h2',s.era),el('p',s.periods.map(period).join(' · '),'glossary-era'),el('h3','在这个时期意味着什么'),el('p',s.meaning),el('h3','权力与作用'),el('p',s.powers),el('h3','限制与区别'),el('p',s.limits),references(s.references));main.append(section);});
    main.append(el('h2','人物与年度例子'),el('p','例子连接已收录资料；制度背景和生涯入口不自动证明该年任职，具体范围见每条例注。','glossary-era'));
    const examples=el('ul',null,'glossary-examples');e.examples.forEach(x=>{const li=el('li');li.dataset.sense=x.sense;li.append(link(when(x.year)+' · '+period(x.period)+' ↗',x.yearURL));
      if(x.person)li.append(' · ',link(x.personLabel+' ↗',x.personURL));li.append(el('p',x.note),references(x.references));examples.append(li);});main.append(examples);
    if(e.related.length){main.append(el('h2','辨清相关概念'));const related=el('nav',null,'glossary-related');related.setAttribute('aria-label','相关词条');e.related.forEach(id=>related.append(link(index.entries[id].label+' →',index.entries[id].url)));main.append(related);}
    const canonical=new URL('../'+e.url,location.href).href,area=el('textarea',null,'glossary-link-text');area.value=canonical;area.readOnly=true;area.setAttribute('aria-label','词条稳定链接');
    const status=el('p');status.setAttribute('role','status');const actions=el('div',null,'glossary-actions'),copy=el('button','复制词条链接'),download=el('button','下载词条与出处 JSON');
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(canonical);status.textContent='已复制。';}catch{area.focus();area.select();status.textContent='已选中链接，可手动复制。';}};
    download.onclick=()=>{const sourceIds=new Set([...e.senses.flatMap(s=>s.references),...e.examples.flatMap(x=>x.references)].map(r=>r.source));
      const value={version:index.version,license:index.license,method:index.method,entry:e,sources:Object.fromEntries([...sourceIds].map(id=>[id,index.sources[id]]))};
      const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=el('a');a.href=url;a.download='glossary-'+id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    actions.append(copy,download);main.append(area,actions,status);
  }
  async function route() {
    const current=++version;main.removeAttribute('data-term-id');main.setAttribute('aria-busy','true');main.replaceChildren(el('p','正在翻开制度词典……'));
    try {index=await G.load();if(current!==version)return;const p=new URLSearchParams(location.hash.slice(1));main.replaceChildren();
      if(p.has('term'))detail(p.get('term'),p);else directory(p);
      main.focus({preventScroll:true});window.scrollTo(0,0);
      if(p.has('sense')){const section=Array.from(main.querySelectorAll('[data-sense]')).find(n=>n.classList.contains('glossary-sense')&&n.dataset.sense===p.get('sense'));if(section){section.scrollIntoView({block:'start'});section.focus({preventScroll:true});}else main.prepend(el('p','链接中的分期不存在，已显示完整词条。','glossary-caution'));}
    } catch {if(current!==version)return;main.replaceChildren(el('h1','词典暂时无法载入'),el('p','网络、超时或资料格式异常。可重试，或从页头返回原卷继续阅读。'));const b=el('button','重新载入词典');b.id='retry-glossary';b.onclick=route;main.append(b);}
    finally {if(current===version){main.setAttribute('aria-busy','false');main.dataset.renderedHash=location.hash;}}
  }
  document.querySelector('#theme-button').onclick=()=>{const t=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('fasti-theme',t);}catch{}};
  addEventListener('hashchange',route);route();
})();
