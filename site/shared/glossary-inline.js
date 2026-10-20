'use strict';
(() => {
  const G=window.FastiGlossary,{el,link}=G,period=document.body.dataset.glossaryPeriod;
  if(!period)return;
  const roots=Array.from(document.querySelectorAll('main'));
  let data,enabled=true,queued=false,dialog,opener,lastKey='',serial=0;
  try{enabled=localStorage.getItem('fasti-glossary-inline')!=='false';}catch{}
  const tools=el('div',null,'glossary-inline-tools'),toggle=el('button'),status=el('span'),retry=el('button','重试术语释义');
  toggle.type=retry.type='button';retry.hidden=true;status.setAttribute('role','status');
  tools.append(toggle,status,retry);document.querySelector('.site-header')?.after(tools);
  const hidden=n=>!!n.closest('[hidden],[aria-hidden="true"],.is-hidden') || !n.getClientRects().length;
  const excluded='a,button,summary,script,style,textarea,input,select,svg,dialog,code,pre,.sources,.source-links,.event-citation,.event-reference,.citation,.reference,.bio-sources,.glossary-example-terms,.event-related-links,.identity-links,.power-links,.power-identity-links';
  function context(){
    const p=new URLSearchParams(location.hash.slice(1));let year=Number(p.get('year'));
    if(!p.has('year')||!Number.isInteger(year)||!year)year=null;else if(period==='republic')year=-year;
    return {params:p,year,key:period+':'+(p.has('person')?p.get('person'):year)};
  }
  function close(){if(dialog?.open)dialog.close();}
  function show(button){
    const e=data?.entries[button.dataset.glossaryTerm];if(!e)return;
    close();opener=button;
    if(!dialog){dialog=el('dialog',null,'glossary-dialog');dialog.id='glossary-dialog';dialog.setAttribute('aria-labelledby','glossary-dialog-title');document.body.append(dialog);
      dialog.addEventListener('close',()=>{if(opener?.isConnected&&!hidden(opener))opener.focus({preventScroll:true});});
      dialog.addEventListener('click',ev=>{if(ev.target===dialog){const r=dialog.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)close();}});
    }
    const dismiss=el('button','关闭释义');dismiss.type='button';dismiss.onclick=close;
    const h=el('h2',e.label);h.id='glossary-dialog-title';const ctx=context();
    dialog.replaceChildren(dismiss,h,el('p',e.native,'glossary-native'),el('p',e.summary));
    const relevant=e.senses.filter(s=>s.periods.includes(period));
    const exact=relevant.filter(s=>ctx.year===null||s.range[0]<=ctx.year&&ctx.year<=s.range[1]);
    const senses=exact.length?exact:relevant;
    if(!exact.length)dialog.append(el('p','当前年度超出已编订的分期范围；以下是本卷相关用法，不能直接据此断定本年制度。','glossary-caution'));
    senses.forEach(s=>dialog.append(el('h3',s.era),el('p',s.meaning),el('p','限制：'+s.limits)));
    dialog.append(el('p',e.caution,'glossary-caution'),link('完整词条、出处与人物／年度例子 ↗',e.url));
    dialog.showModal();dismiss.focus();
  }
  function unwrap(){for(const root of roots)root.querySelectorAll('[data-glossary-term]').forEach(b=>b.replaceWith(document.createTextNode(b.textContent)));}
  function terms(){
    return Object.values(data.entries).filter(e=>e.senses.some(s=>s.periods.includes(period))).flatMap(e=>e.inline.map(word=>({word,id:e.id}))).sort((a,b)=>b.word.length-a.word.length);
  }
  function annotate(){
    if(!enabled||!data)return;
    const phrases=terms();
    for(const root of roots){
      if(hidden(root))continue;
      // Restrict to reading paragraphs and non-interactive office badges, never
      // names, headings, sources, links, controls or concealed spoiler stores.
      const blocks=root.querySelectorAll('p,.official-role,.official-office,.role-badge,.kind-badge,.purple-badge,.tag');
      for(const block of blocks){
        if(hidden(block)||block.closest(excluded)||block.querySelector('[data-glossary-term]'))continue;
        const walker=document.createTreeWalker(block,NodeFilter.SHOW_TEXT),nodes=[];let n;
        while((n=walker.nextNode()))if(!n.parentElement.closest(excluded)&&n.textContent.trim())nodes.push(n);
        const used=new Set();let count=0;
        for(const node of nodes){
          if(count>=2)break;
          const text=node.textContent,fragment=document.createDocumentFragment();let cursor=0,changed=false;
          while(cursor<text.length&&count<2){
            let found=null;
            for(const term of phrases){if(used.has(term.id))continue;const pos=text.indexOf(term.word,cursor);
              if(pos<0)continue;if(!found||pos<found.pos||pos===found.pos&&term.word.length>found.word.length)found={...term,pos};}
            if(!found)break;
            fragment.append(document.createTextNode(text.slice(cursor,found.pos)));
            const b=el('button',found.word,'glossary-term');b.type='button';b.dataset.glossaryTerm=found.id;b.setAttribute('aria-haspopup','dialog');b.setAttribute('aria-label',found.word+'：查看制度释义');b.onclick=()=>show(b);
            fragment.append(b);cursor=found.pos+found.word.length;used.add(found.id);count++;changed=true;
          }
          if(changed){fragment.append(document.createTextNode(text.slice(cursor)));node.replaceWith(fragment);}
        }
      }
    }
  }
  function examples(){
    const ctx=context();
    if(ctx.key!==lastKey){roots.forEach(root=>root.querySelectorAll('.glossary-example-terms').forEach(n=>n.remove()));lastKey=ctx.key;}
    const ids=ctx.params.has('person')?data.byPerson?.[ctx.key]:ctx.year!==null?data.byYear?.[ctx.key]:null;
    const root=roots.find(r=>!hidden(r));
    // The Republic initially shows its home main while an annual archive is
    // loading. Optional navigation can arrive in either order. Move examples
    // to the current visible main instead of retaining a duplicate in home.
    roots.filter(r=>r!==root).forEach(r=>r.querySelectorAll('.glossary-example-terms').forEach(n=>n.remove()));
    if(!ids?.length||!root||root.querySelector('.glossary-example-terms')||!root.querySelector('h1'))return;
    // Never show example notes or future narratives in an original volume.
    const section=el('section',null,'glossary-example-terms');section.append(el('h2','这份档案可对读的制度词条'),el('p','这是词典编订的阅读例子，不等于此人在上述年度拥有这些全部官职。'));
    const nav=el('nav');nav.setAttribute('aria-label','档案关联词条');ids.forEach(id=>{if(data.entries[id])nav.append(link(data.entries[id].label+' ↗',data.entries[id].url));});section.append(nav);root.append(section);
  }
  const observer=new MutationObserver(schedule);
  function watch(){roots.forEach(r=>observer.observe(r,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','open']}));}
  function scan(){queued=false;observer.disconnect();try{if(data){examples();annotate();}}finally{watch();}}
  function schedule(){if(queued)return;queued=true;requestAnimationFrame(scan);}
  function toggleLabel(){toggle.textContent='正文术语释义：'+(enabled?'开':'关');toggle.setAttribute('aria-pressed',String(enabled));}
  async function load(){const current=++serial;retry.hidden=true;status.textContent='正在载入术语释义…';
    try{data=await G.load(false);if(current!==serial)return;status.textContent=enabled?'点按虚线术语或按 Tab、Enter 查阅。':'正文术语释义已关闭。';schedule();}
    catch{if(current!==serial||!enabled)return;status.textContent='术语释义暂时不可用，原卷正文可继续阅读。';retry.hidden=false;}
  }
  toggle.onclick=()=>{enabled=!enabled;toggleLabel();try{localStorage.setItem('fasti-glossary-inline',String(enabled));}catch{}
    if(!enabled){close();retry.hidden=true;observer.disconnect();unwrap();watch();status.textContent='正文术语释义已关闭。';}else if(!data)load();else{status.textContent='点按虚线术语或按 Tab、Enter 查阅。';schedule();}};
  retry.onclick=load;
  addEventListener('hashchange',()=>{close();lastKey='';schedule();});
  addEventListener('toggle',schedule,true);toggleLabel();watch();if(enabled)load();else status.textContent='可开启正文术语释义。';
})();
