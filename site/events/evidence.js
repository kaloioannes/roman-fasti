'use strict';
// DOM-only rendering. Research text never becomes markup or a trust score.
window.FastiEvidence=(()=>{
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const href=(e,target)=>'#'+new URLSearchParams({event:e.id,evidence:target});
  const labels={direct:'本次直接查阅',indirect:'间接引述',inherited:'沿用原卷引用 · 本次未重新核读'};
  function targetLink(e,target,label){const a=el('a',label);a.href=href(e,target);return a;}
  function refLinks(e,refs){const p=el('p',null,'evidence-ref-links');refs.forEach(id=>p.append(targetLink(e,'ref:'+id,'证据 '+id+' ↗')));return p;}
  function share(e,target){
    const b=el('button','复制本卡链接'),status=el('span',null,'event-note'),box=el('div',null,'evidence-share');status.setAttribute('role','status');
    b.type='button';b.onclick=async()=>{const url=new URL(href(e,target),location.href).href;
      try{await navigator.clipboard.writeText(url);status.textContent='已复制本卡链接。';}
      catch{let input=box.querySelector('textarea');if(!input){input=el('textarea');input.readOnly=true;input.setAttribute('aria-label','本卡稳定链接，可手动复制');box.append(input);}input.value=url;input.focus();input.select();status.textContent='已选中链接，可手动复制。';}
    };box.append(b,status);return box;
  }
  function citations(refs,index,event){
    const box=el('div',null,'evidence-source-groups');
    const kinds=index.sourceKinds||{unclassified:'沿用资料 · 类别待编订'};
    for(const [kind,label] of Object.entries(kinds)){
      const rows=refs.filter(r=>(r.sourceKind||'unclassified')===kind);if(!rows.length)continue;
      const group=el('section',null,'evidence-source-group');group.dataset.sourceKind=kind;group.append(el('h3',label));
      const list=el('ol',null,'event-citations');
      rows.forEach(r=>{
        const item=el('li',null,'evidence-citation');if(event){item.id='evidence-ref-'+r.id;item.dataset.evidenceTarget='ref:'+r.id;item.tabIndex=-1;}
        const a=el('a',r.label+' ↗');a.href=r.url;a.target='_blank';a.rel='noopener';
        item.append(a);if(r.author)item.append(el('p',r.author+' · '+r.edition,'event-note'));
        item.append(el('p','定位：'+r.locator),el('p','支持的论断：'+r.claim));
        const reading=r.access==='legacy'&&r.consultation!=='inherited'?'沿用前次'+(r.consultation==='direct'?'直接查阅':'间接引述')+'记录 · 本次未重新核读':labels[r.consultation];
        const status=el('p',reading+(r.checked?' · 核对日期 '+r.checked:' · 核对日期未记录'),'evidence-reading');
        if(r.access)status.append(el('span',' · '+index.access[r.access]));item.append(status);
        if(r.scope)item.append(el('p','实际查阅范围：'+r.scope,'event-note'));
        if(r.via){const p=el('p','间接路径：'),a=el('a',r.via.label+' ↗');a.href=r.via.url;a.target='_blank';a.rel='noopener';p.append(a,'；'+r.via.locator);item.append(p);}
        if(r.limitations)item.append(el('p','材料局限：'+r.limitations,'event-note'));
        if(event){
          const claims=event.evidence?.claims.filter(c=>c.references.includes(r.id))||[];
          if(claims.length){const p=el('p','用于：');claims.forEach(c=>p.append(targetLink(event,'claim:'+c.id,c.text)));item.append(p);}
          item.append(share(event,'ref:'+r.id));
        }
        list.append(item);
      });group.append(list);box.append(group);
    }return box;
  }
  function render(e,hide){
    const box=el('section',null,'evidence-dossier');box.id='event-evidence';box.append(el('h2','论断与证据'));
    if(!e.evidence){box.append(el('p','尚未编订论断级证据卡。下方保留原有引用及查阅记录；这不表示条目无据，也不表示已完成直接核读。','event-note'));return box;}
    let body=box;if(hide){body=el('details');body.append(el('summary','展开论断、证据与异说'));box.append(body);}
    body.append(el('p',e.evidence.scope,'event-disclosure'));
    e.evidence.claims.forEach(c=>{
      const card=el('article',null,'evidence-claim');card.id='evidence-claim-'+c.id;card.dataset.evidenceTarget='claim:'+c.id;card.tabIndex=-1;
      card.append(el('h3',c.text),el('p',c.note,'event-note'),refLinks(e,c.references),share(e,'claim:'+c.id));body.append(card);
    });
    if(e.evidence.disputes.length){const section=el('section',null,'evidence-disputes');section.append(el('h2','异说并读'));
      e.evidence.disputes.forEach(d=>{
        const item=el('article',null,'evidence-dispute');item.id='evidence-dispute-'+d.id;item.dataset.evidenceTarget='dispute:'+d.id;item.tabIndex=-1;
        item.append(el('h3',d.question));const grid=el('div',null,'evidence-positions');
        d.positions.forEach(p=>{const position=el('div',null,'evidence-position');position.dataset.adopted=String(p.id===d.adopted);
          if(p.id===d.adopted)position.append(el('p','本条采用','evidence-adopted'));position.append(el('h4',p.label),el('p',p.statement),refLinks(e,p.references));grid.append(position);
        });item.append(grid,el('p','采用理由：'+d.rationale),el('p','仍有局限：'+d.limits,'event-note'),share(e,'dispute:'+d.id));section.append(item);
      });body.append(section);
    }return box;
  }
  function focus(target){
    const item=[...document.querySelectorAll('[data-evidence-target]')].find(n=>n.dataset.evidenceTarget===target);
    if(!item)return false;for(let p=item.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
    item.classList.add('evidence-target');item.style.scrollMarginTop=((document.querySelector('.site-header')?.getBoundingClientRect().height||0)+20)+'px';
    item.focus({preventScroll:true});item.scrollIntoView({block:'start',behavior:'instant'});return true;
  }
  return {render,citations,focus};
})();
