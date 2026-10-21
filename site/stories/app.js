'use strict';
(() => {
  const S=FastiStories,el=S.el,link=S.link,main=document.querySelector('#content');
  const switcher=document.querySelector('#reader-spoiler'),status=document.querySelector('#storage-status');
  let data,version=0,hidden=S.spoiler();const revealed=new Set();
  switcher.checked=hidden;
  const note=ok=>{status.textContent=ok?'进度已保存在本机。':'浏览器限制存储：本次仍可阅读，进度可能无法保存。';};
  switcher.onchange=()=>{hidden=switcher.checked;revealed.clear();try{localStorage.setItem('fasti-spoiler-v2',String(hidden));}catch{note(false);}route(false);};
  document.querySelector('#theme-button').onclick=()=>{const value=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=value;try{localStorage.setItem('fasti-theme',value);}catch{}};
  const button=(label,action)=>{const b=el('button',label);b.type='button';b.onclick=action;return b;};
  const norm=s=>String(s).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/ς/g,'σ');
  const when=y=>y<0?'前'+(-y)+'年':'公元'+y+'年';
  const period=id=>data.periods.find(p=>p.id===id).title;
  const validRead=s=>S.state(s.id).read.filter(id=>s.chapters.some(c=>c.id===id));
  const progress=s=>{const n=validRead(s).length;return `${n} / ${s.chapters.length} 章已读`;};
  const entry=s=>{const p=S.state(s.id),last=s.chapters.find(c=>c.id===p.last);return last||s.chapters.find(c=>!p.read.includes(c.id))||s.chapters[0];};
  function focus(n){if(!n)return;n.tabIndex=-1;n.focus({preventScroll:true});if(n===main)window.scrollTo({top:0,behavior:'instant'});else n.scrollIntoView({block:'start',behavior:'instant'});}
  function report(text){const n=el('p',text);n.setAttribute('role','status');return n;}
  function catalog(params){
    document.title='连续历史剧本 · FASTI';main.append(el('p','NARRATIONES · 五卷故事','eyebrow'),el('h1','沿着问题，连续读下去。'),el('p','先看人物面临什么选择，再顺着章节追踪后果。读到一处，可以回到当年的档案和人物；进度只在本机保存，进入章节不自动算作读完。','reader-intro'));
    const form=el('form',null,'reader-filter'),q=el('input'),select=el('select');q.id='story-query';q.type='search';q.value=params.get('q')||'';q.placeholder='标题、主题、人物或原名';const ql=el('label','查找');ql.htmlFor=q.id;ql.append(q);select.id='story-period';const sl=el('label','分卷');sl.htmlFor=select.id;sl.append(select);
    [['','全部时期'],...data.periods.map(p=>[p.id,p.title])].forEach(([id,label])=>{const o=el('option',label);o.value=id;select.append(o);});select.value=params.get('period')||'';
    if(params.has('period')&&!data.periods.some(p=>p.id===params.get('period'))){main.append(report('分卷筛选无效，已显示全部时期。'));}
    const submit=el('button','查找');submit.type='submit';form.append(ql,sl,submit);main.append(form);
    const count=report(''),grid=el('div',null,'narrative-catalog');main.append(count,grid);
    function draw(){grid.replaceChildren();const query=norm(q.value.trim());const stories=Object.values(data.stories).filter(s=>(!select.value||s.period===select.value)&&norm([s.title,s.subtitle,s.theme,...s.cast.flatMap(p=>[p.label,p.role]),...(s.aliases||[])].join(' ')).includes(query));count.textContent=`找到 ${stories.length} 部剧本。`;
      for(const s of stories){const card=el('article',null,'narrative-card');card.dataset.story=s.id;card.append(el('p',period(s.period)+' · '+s.chapters.length+'章','eyebrow'));const h=el('h2');h.append(link(s.title,s.url));card.append(h,el('p',s.subtitle,'subtitle'),el('p',s.question));if(!hidden)card.append(el('p',s.setup));card.append(el('p',when(s.start)+' — '+when(s.end)+' · '+progress(s),'reader-fine'));const meter=el('progress');meter.max=s.chapters.length;meter.value=validRead(s).length;meter.setAttribute('aria-label',s.title+'阅读进度');card.append(meter);const actions=el('div',null,'reader-actions');actions.append(link(S.state(s.id).last?'继续上次阅读 →':'开始阅读 →',entry(s).url),link('查看目录',s.url));if(s.legacy)actions.append(link('原共和国阅读页 ↗','republic/#story='+s.id+'&year='+(-s.start)));card.append(actions);grid.append(card);}
      if(!stories.length)grid.append(el('p','没有符合条件的故事。可以缩短查询词或选择全部时期。'));
    }
    q.oninput=draw;select.onchange=draw;form.onsubmit=e=>{e.preventDefault();const p=new URLSearchParams();if(q.value.trim())p.set('q',q.value.trim());if(select.value)p.set('period',select.value);location.hash=p.toString();};draw();
    const methods=el('details');methods.append(el('summary','阅读、资料与本机进度说明'),el('p',data.method),el('p','“已读”由你手动标记；继续上次阅读返回上次打开的章节。防剧透隐藏正文、结局及未读标题，点击后可逐章揭示；原年度与人物页面可能包含后续史实。浏览器数据被清除后本机进度会丢失。'));
    methods.append(button('重置全部剧本进度',()=>{if(confirm('清除本机所有剧本的阅读标记和上次位置？')){note(S.reset());route(false);}}));main.append(methods);
  }
  function references(chapter){const section=el('section');section.append(el('h3','本章史料与阅读范围'));
    chapter.references.forEach(r=>{const s=data.sources[r.source],box=el('article',null,'reader-source'),a=el('a',s.label+' ↗');a.href=s.url;a.target='_blank';a.rel='noopener';box.append(a,el('p','定位：'+r.locator),el('p','支持：'+r.supports));const details=el('details');details.append(el('summary','作者、版本与实际查阅'),el('p',s.author+' · '+s.edition),el('p',({excerpt:'本次直接阅读指定电子文本段落',inherited:'沿用原卷引用，本次未重新直接核读',indirect:'间接引述，未直接阅读所引原著'})[s.access]+' · 核对：'+s.checked),el('p','实际范围：'+s.scope),el('p','局限：'+s.limitations));if(s.via){const via=el('a','间接路径：'+s.via.locator);via.href=s.via.url;details.append(via);}box.append(details);section.append(box);});return section;
  }
  function share(host,s,c){const box=el('section',null,'reader-actions');const result=report('');
    box.append(button('复制本章链接',async()=>{const url=new URL('../'+c.url,location.href).href;try{await navigator.clipboard.writeText(url);result.textContent='链接已复制。';}catch{const area=el('textarea');area.value=url;area.readOnly=true;area.setAttribute('aria-label','可手动复制的章节链接');box.append(area);area.select();result.textContent='自动复制不可用，请手动复制。';}}),button('下载本剧本与出处 JSON',()=>{const ids=new Set(s.chapters.flatMap(c=>c.references.map(r=>r.source)));const blob=new Blob([JSON.stringify({version:data.version,license:data.license,attribution:'FASTI contributors · roman-fasti',method:data.method,story:s,sources:Object.fromEntries([...ids].map(id=>[id,data.sources[id]]))},null,2)],{type:'application/json'});const a=el('a');a.href=URL.createObjectURL(blob);a.download=s.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}),result);host.append(box);
  }
  function reader(s,params){const chapterId=params.get('chapter'),index=chapterId?s.chapters.findIndex(c=>c.id===chapterId):-1;
    if(chapterId&&index<0){main.append(el('h1','找不到这一章'),el('p','章节地址可能有误；原地址保留，便于修正。'),link('打开本剧本目录',s.url));return;}
    const back=el('nav',null,'reader-back');back.setAttribute('aria-label','返回目录');back.append(link('← 五卷剧本目录','stories/'),link(period(s.period)+'全部剧本','stories/#period='+s.period));main.append(back,el('p',s.theme+' · '+period(s.period),'eyebrow'),el('h1',s.title),el('p',s.subtitle,'reader-intro'),el('p',s.question,'reader-question'),el('p',s.caution,'reader-caution'));
    const setup=el('details');setup.append(el('summary','开局局势与关键人物'));if(!hidden){setup.append(el('p',s.setup));const cast=el('ul',null,'reader-cast');s.cast.forEach(p=>{const li=el('li');li.append(el('strong',p.label),el('span',p.role));cast.append(li);});setup.append(cast);}else setup.append(el('p','防剧透已开启。关闭开关可查看开局与人物提示。'));main.append(setup);
    const layout=el('div',null,'reader-layout'),toc=el('nav',null,'reader-toc');toc.setAttribute('aria-label','剧本章节');toc.append(el('h2','章节目录'),el('p',progress(s),'reader-fine'));const list=el('ol');s.chapters.forEach((c,i)=>{const li=el('li'),read=validRead(s).includes(c.id),a=link(`${i+1}. ${hidden&&!read&&!revealed.has(s.id+':'+c.id)?'待读章节':c.title}`,c.url);if(index===i)a.setAttribute('aria-current','step');a.append(el('small',c.dateLabel+(read?' · 已读':'')));li.append(a);list.append(li);});toc.append(list);layout.append(toc);
    const article=el('article',null,'chapter-reading');article.id='chapter-content';layout.append(article);main.append(layout);
    if(index<0){article.append(el('h2','从第一个问题开始'),el('p',`${s.chapters.length}章 · ${when(s.start)} — ${when(s.end)}`),link(S.state(s.id).last?'继续上次阅读 →':'开始第一章 →',entry(s).url));const reset=button('重置本剧本进度',()=>{if(confirm('清除这部剧本的阅读标记和上次位置？')){note(S.reset(s.id));route(false);}});article.append(el('p','阅读标记由你手动控制；仅打开章节不会标记已读。','reader-fine'),reset);if(s.legacy)article.append(link('在原共和国年度页面阅读 ↗','republic/#story='+s.id+'&year='+(-s.start)));document.title=s.title+' · 连续剧本 · FASTI';return;}
    const c=s.chapters[index],read=validRead(s).includes(c.id),concealed=hidden&&!read&&!revealed.has(s.id+':'+c.id);if(!S.save(s.id,c.id))note(false);
    document.title=(concealed?'第'+(index+1)+'章':c.title)+' · '+s.title+' · FASTI';article.dataset.story=s.id;article.dataset.chapter=c.id;article.append(el('p',`第 ${index+1} / ${s.chapters.length} 章 · ${c.dateLabel}`,'eyebrow'));
    if(concealed){article.append(el('h2','这一章，等你揭开。'),button('展开本章故事',async()=>{revealed.add(s.id+':'+c.id);await route(false);focus(main.querySelector('.chapter-reading'));}));}
    else {article.append(el('h2',c.title));c.paragraphs.forEach(p=>article.append(el('p',p)));if(c.question)article.append(el('p','继续想一想：'+c.question,'reader-question'));const people=el('nav',null,'reader-people');people.setAttribute('aria-label','本章人物档案');c.people.forEach(p=>people.append(link(p.label+' · 人物档案 ↗',p.url)));article.append(people,link('打开年度档案 · '+c.dateLabel+' ↗',c.yearURL),el('p','离开剧本查看人物或年度，可能读到后续史实。返回本章可用浏览器返回；章节地址和进度会保留。','reader-fine'));if(s.legacy)article.append(link('原共和国章节与当年官员、地图 ↗','republic/#story='+s.id+'&year='+(-c.year)));article.append(references(c));
      article.append(button(read?'取消本章已读':'标记本章已读',async()=>{note(S.save(s.id,c.id,!read));await route(false);focus(main.querySelector('.chapter-reading'));}));
    }
    const next=el('nav',null,'reader-next');next.setAttribute('aria-label','前后章节');next.append(index>0?link('← 上一章',s.chapters[index-1].url):link('← 剧本目录',s.url));next.append(index+1<s.chapters.length?link('下一章 →',s.chapters[index+1].url):link('剧终 · 选择下一部 →','stories/'));article.append(next);
    if(index===s.chapters.length-1&&!concealed){article.append(el('p',validRead(s).length===s.chapters.length?'全剧已读完。可以回看史料，或选择另一部故事。':'已到剧终。读过的章节可手动标记；目录会显示仍未标记的章节。','reader-question'));}
    share(article,s,c);
  }
  async function route(moveFocus=true){const token=++version;main.setAttribute('aria-busy','true');main.replaceChildren(report('正在翻开历史剧本……'));try{data=await S.load();if(token!==version)return;main.replaceChildren();const p=new URLSearchParams(location.hash.slice(1));if(p.has('story')){const s=data.stories[p.get('story')];if(s)reader(s,p);else main.append(el('h1','找不到这部剧本'),link('返回五卷剧本目录','stories/'));}else if(p.has('chapter'))main.append(el('h1','章节地址缺少剧本'),link('返回五卷剧本目录','stories/'));else catalog(p);
    }catch{if(token!==version)return;main.replaceChildren(el('h1','剧本暂时无法载入'),el('p','网络、超时或资料格式问题；可以在原页重试。原年度档案不受影响。'),button('重试剧本',()=>route()),link('返回全部时期',''));}
    finally{if(token===version){main.setAttribute('aria-busy','false');main.dataset.renderedHash=location.hash;if(moveFocus)focus(main);}}
  }
  window.addEventListener('hashchange',()=>route());window.addEventListener('storage',e=>{if(['fasti-reading-v1','fasti-spoiler-v2'].includes(e.key)){hidden=S.spoiler();switcher.checked=hidden;route(false);}});
  document.querySelector('.reader-skip').onclick=e=>{e.preventDefault();focus(main);};route(false);
})();
