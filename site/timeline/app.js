'use strict';
(() => {
  const E=window.FastiTimeline,main=document.querySelector('#content');
  let index,pending,revision=0;
  const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
  const a=(text,url)=>{const n=el('a',text);n.href=url;return n;};
  const href=params=>'#'+new URLSearchParams(params).toString();
  const person=s=>index.people[s.period+':'+s.person];
  const period=id=>index.periods.find(p=>p.id===id);
  const name=s=>s.isVacancy?'宫廷／官职空缺':person(s).zh;
  const routeYear=(pid,y)=>`../${pid}/#year=${pid==='republic'?-y:y}`;
  const defaultState=()=>({period:'empire',from:'69',to:'69',view:matchMedia('(max-width:700px)').matches?'list':'chart'});
  const state=()=>({...defaultState(),...Object.fromEntries(new URLSearchParams(location.hash.slice(1)))});
  function navigate(p,replace=false){
    const next=href(p);
    if(replace){history.replaceState(null,'',next);render();}
    else if(location.hash===next)render();else location.hash=next;
  }
  async function load(){
    if(index)return index;
    if(!pending)pending=(async()=>{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
      try{const response=await fetch('../data/timeline/index.json',{signal:controller.signal});if(!response.ok)throw Error('HTTP');
        const data=await response.json();if(!E.valid(data))throw Error('schema');index=data;return data;
      }finally{clearTimeout(timer);pending=null;}
    })();return pending;
  }
  function button(text,action,cls){const n=el('button',text,cls);n.type='button';n.onclick=action;return n;}
  function change(s,values){const p={...s,...values};delete p.page;delete p.stage;navigate(p);}
  function controls(s){
    const form=el('form',null,'tl-filters');form.id='timeline-form';
    function input(key,label,type='text'){
      const l=el('label',label),n=el('input');n.name=key;n.id='tl-'+key;n.type=type;n.value=s[key]||'';
      if(type==='number'){n.min=-753;n.max=1453;n.required=true;}else n.maxLength=160;
      l.append(n);form.append(l);return n;
    }
    function select(key,label,values){const l=el('label',label),n=el('select');n.name=key;n.id='tl-'+key;
      Object.entries(values).forEach(([v,text])=>{const o=el('option',text);o.value=v;n.append(o);});n.value=s[key]||'';l.append(n);form.append(l);return n;
    }
    const p=select('period','分卷',{'':'五卷对读',...Object.fromEntries(index.periods.map(p=>[p.id,p.title]))});
    input('from','起年 · 负数为公元前','number');input('to','止年 · 无0年','number');
    const q=input('q','检索姓名／别名','search');q.placeholder='奥古斯都、Ζηνων、Basil…';
    select('kind','官职／帝号身份',{'':'全部身份',...index.kinds});select('side','原卷宫廷',{'':'全部宫廷',...index.sides});
    const submit=el('button','展开任期 →');submit.type='submit';form.append(submit);
    form.onsubmit=e=>{e.preventDefault();const p={...s,...Object.fromEntries(new FormData(form))};delete p.person;delete p.preset;delete p.page;delete p.stage;navigate(p);};
    const full=button('查看本卷全部年份',()=>{const selected=period(p.value);change(s,{period:p.value,from:String(selected?.start??-753),to:String(selected?.end??1453),q:q.value,person:'',preset:''});});form.append(full);
    main.append(form);
  }
  function legend(){
    const box=el('aside',null,'tl-legend');box.setAttribute('aria-label','时间轴图例');
    [['solid','可考端点之间'],['hatched','端点只知年／月，或存在异说'],['power','另编订的主政／头衔阶段'],['vacant','有出处的宫廷／官职空缺']].forEach(([cls,label])=>{const item=el('span',label),swatch=el('i',null,cls);swatch.setAttribute('aria-hidden','true');item.prepend(swatch);box.append(item);});
    main.append(box,el('p','斜纹是日期可能落入的范围，不是全年任职。条形交叠本身不能证明共治；原卷主线帝号也不等于独掌实权。','tl-caution'));
  }
  function toolbar(s){
    const box=el('nav',null,'tl-toolbar');box.setAttribute('aria-label','时间轴视图与缩放');
    for(const [value,label] of [['chart','时间轴'],['list','等价列表']]){const b=button(label,()=>change(s,{view:value}));b.setAttribute('aria-pressed',String(s.view===value));box.append(b);}
    const zoom=Math.max(1,Math.min(16,Number(s.zoom)||1));
    box.append(button('− 缩小',()=>change(s,{zoom:String(Math.max(1,zoom/2))})),el('span',`比例 ${zoom}×`),button('＋ 放大',()=>change(s,{zoom:String(Math.min(16,zoom*2))})));
    const from=Number(s.from),to=Number(s.to),span=E.axis(to)-E.axis(from)+1;
    const move=direction=>{const shift=Math.max(1,Math.round(span/2))*direction;
      const low=E.axis(-753),high=E.axis(1453)+1;let x=Math.max(low,Math.min(high-span,E.axis(from)+shift));
      change(s,{from:String(E.year(x)),to:String(E.year(x+span-1)),preset:''});};
    box.append(button('← 前一段',()=>move(-1)),button('后一段 →',()=>move(1)),button('复制当前视图链接',async()=>{
      const box=document.querySelector('#tl-share');box.hidden=false;box.value=location.href;
      try{await navigator.clipboard.writeText(location.href);document.querySelector('#tl-share-status').textContent='链接已复制。';}
      catch{box.focus();box.select();document.querySelector('#tl-share-status').textContent='请复制已选中的链接。';}
    }));
    const share=el('input');share.id='tl-share';share.readOnly=true;share.hidden=true;share.setAttribute('aria-label','当前视图分享链接');
    const status=el('p');status.id='tl-share-status';status.setAttribute('role','status');main.append(box,share,status);
  }
  function selectedRows(s){
    const from=Number(s.from),to=Number(s.to),q=E.normalize(s.q);
    return Object.values(index.stages).map(r=>s.person&&r.period+':'+r.person===s.person?{...r,scopeStart:null,scopeEnd:null}:r).filter(r=>{
      const p=period(r.period);
      if(s.period&&r.period!==s.period||s.kind&&r.kind!==s.kind||s.side&&r.side!==s.side||s.person&&r.period+':'+r.person!==s.person)return false;
      if(q&&!E.normalize(r.isVacancy?r.label:person(r).names.join(' ')).includes(q))return false;
      if(!r.start)return s.person||p.start<=to&&p.end>=from;
      return E.geometry(r,from,to)&&(s.person||p.start<=to&&p.end>=from);
    }).sort((a,b)=>index.periods.indexOf(period(a.period))-index.periods.indexOf(period(b.period))||a.side.localeCompare(b.side)||a.kind.localeCompare(b.kind)||(a.start?.bounds[0]??Infinity)-(b.start?.bounds[0]??Infinity)||a.id.localeCompare(b.id));
  }
  function stageLink(s,row,label){return a(label,href({...s,stage:row.id}));}
  function drawBand(host,row,from,to,isPower=false){
    const g=E.geometry(row,from,to);if(!g)return;
    const band=el('span',null,'tl-band'+(isPower?' tl-power':'')+(g.uncertain?' tl-uncertain':''));
    if(isPower)band.dataset.status=row.status;
    band.style.left=g.left+'%';band.style.width=(g.right-g.left)+'%';
    if(g.clippedStart)band.classList.add('tl-continues-left');if(g.clippedEnd)band.classList.add('tl-continues-right');
    band.setAttribute('aria-hidden','true');
    if(!g.uncertain&&!g.noCore){const core=el('i',null,'tl-core');core.style.left=(g.coreLeft-g.left)/(g.right-g.left)*100+'%';core.style.width=(g.coreRight-g.coreLeft)/(g.right-g.left)*100+'%';band.append(core);}
    host.append(band);
  }
  function chart(rows,s){
    const from=Number(s.from),to=Number(s.to),span=E.axis(to)-E.axis(from)+1;
    const width=Math.min(16000,Math.max(700,Math.min(2000,span*45))*(Number(s.zoom)||1));
    const viewport=el('div',null,'tl-viewport');viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label','可横向滚动的任期时间轴；箭头键滚动，也可切换等价列表');
    const canvas=el('div',null,'tl-canvas');canvas.style.width=(width+210)+'px';viewport.append(canvas);
    const axis=el('div',null,'tl-axis'),label=el('div','人物 · 每条为独立阶段','tl-row-name'),ticks=el('div',null,'tl-ticks');axis.append(label,ticks);canvas.append(axis);
    const guides=[];
    const tick=(x,text,y)=>{const n=el('div',null,'tl-tick');const position=(x-E.axis(from))/span*100;guides.push(position);n.style.left=position+'%';
      const target=period(s.period);if(target&&y>=target.start&&y<=target.end)n.append(a(text,routeYear(target.id,y)));else n.append(el('span',text));ticks.append(n);};
    if(span===1){
      const y=from,leap=(y+(y<0?1:0))%4===0,days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
      const zoom=Number(s.zoom)||1;
      let sum=0;for(let m=1;m<=12;m++){
        for(let day=1;day<=days[m-1];day++)if(day===1||zoom>=16||zoom>=8&&day%2===1||zoom>=4&&zoom<8&&[8,15,22].includes(day))tick(E.axis(y)+(sum+day-1)/(leap?366:365),day===1?`${m}月`:`${day}日`,y);
        sum+=days[m-1];
      }
    }else{
      const step=[1,2,5,10,20,25,50,100,200,500].find(n=>span/n<=18)||500;
      for(let x=E.axis(from);x<=E.axis(to);x+=step)tick(x,E.when(E.year(x)),E.year(x));
    }
    let previous='';
    rows.forEach(row=>{
      const group=period(row.period).title+' · '+index.sides[row.side]+' · '+index.kinds[row.kind];
      if(group!==previous){const heading=el('h3',group,'tl-track-title');canvas.append(heading);previous=group;}
      const line=el('div',null,'tl-row');line.dataset.stage=row.id;line.dataset.kind=row.kind;
      const label=el('div',null,'tl-row-name');label.append(stageLink(s,row,name(row)),el('small',index.kinds[row.kind]));
      const plot=el('div',null,'tl-plot');
      guides.forEach(position=>{const guide=el('i',null,'tl-guide');guide.style.left=position+'%';guide.setAttribute('aria-hidden','true');plot.append(guide);});
      drawBand(plot,row,from,to);
      row.authority.forEach(p=>drawBand(plot,p,from,to,true));
      const hit=stageLink(s,row,'查看阶段详情');hit.className='tl-hit';hit.setAttribute('aria-label',name(row)+' · '+row.label+' · 查看任期与出处');
      const g=E.geometry(row,from,to);hit.style.left=g.left+'%';hit.style.width=Math.max(.1,g.right-g.left)+'%';hit.title=name(row)+' · '+row.label;
      plot.append(hit);line.append(label,plot);canvas.append(line);
    });
    const hint=el('p','横向滚动查看全段；放大只改变排版，不提高资料精度。月刻度不表示每条任期都有月级精度。','tl-note');main.append(hint,viewport);
  }
  function list(rows,s){
    const list=el('ol',null,'tl-list');
    rows.forEach(row=>{const item=el('li');item.dataset.stage=row.id;
      item.append(stageLink(s,row,name(row)),el('span',period(row.period).title+' · '+index.sides[row.side]+' · '+index.kinds[row.kind],'tl-meta'),el('p',row.label));
      item.append(el('p',row.start?`起点：${precision(row.start)}；终点：${precision(row.end)}`:'绝对任期未定；不放入年份坐标。','tl-note'));
      item.append(el('p',powerNote(row),'tl-note'));list.append(item);
    });main.append(list);
  }
  const precision=p=>({'day':'日精度','month':'月精度','year':'年精度','circa':'约年／月','range':'异说／区间'}[p.precision])+(p.flags.includes('traditional')?' · 传统纪年':'')+(p.flags.includes('uncertain')?' · 有不确定性':'');
  function powerNote(row){
    if(row.authorityNote)return row.authorityNote;
    if(row.isVacancy)return '此处是原卷明确记载的空缺；不据此推断全部政治权力真空。';
    if(row.kind==='junior')return '共帝头衔：不能仅凭称号判断实际施政或摄政权力；请对读原档案。';
    if(['central','senior'].includes(row.kind))return '本卷主线／宫廷帝号；实际权力未在本条结构化判定，不能直接视为独掌实权。';
    if(row.kind==='exile')return '流亡帝号；头衔延续与控制原宫廷分别阅读。';
    if(row.kind==='caesar')return '恺撒称号阶段，不能计作已经成为奥古斯都。';
    if(row.period==='republic')return '年度名录中的官职记录；月日未详，无法判断日级先后或全年共任。';
    if(row.period==='kingdom')return '传统王期归属，不是同期逐年任职实录。';
    return '帝号主张与承认、控制范围应分别阅读原卷说明。';
  }
  function detail(row,s){
    const box=el('section',null,'tl-detail');box.id='timeline-detail';box.tabIndex=-1;box.dataset.stage=row.id;
    const close=el('div',null,'tl-detail-top');close.append(el('p','STADIVM · 任期阶段','eyebrow'),button('关闭详情',()=>{const p={...s};delete p.stage;navigate(p);}));
    box.append(close,el('h2',name(row)),el('p',period(row.period).title+' · '+index.kinds[row.kind]+' · '+index.sides[row.side],'tl-meta'),el('h3',row.label));
    if(row.start)box.append(el('p',`起点 ${row.start.label} · ${precision(row.start)}`),el('p',`终点 ${row.end.label} · ${precision(row.end)}`));
    else box.append(el('p','绝对任期未定；此人不会被展开为当前范围每一年在位者。'));
    box.append(el('h3','帝号／官职与实际权力'),el('p',powerNote(row)));
    if(row.authority.length){const list=el('ul');row.authority.forEach(p=>list.append(el('li',p.label+' · '+p.start.label+' — '+p.end.label+'（沿用原文精度）')));box.append(list);}
    for(const [label,text] of [['地域／宫廷',row.territory],['承认关系',row.recognition],['原任期说明',row.note],['原卷确定性',row.certainty],['来源定位',row.reference]])if(text)box.append(el('p',label+'：'+text));
    const links=el('nav',null,'tl-detail-links');links.setAttribute('aria-label','人物与年度档案');
    if(!row.isVacancy){
      const all={...s,period:row.period,person:row.period+':'+row.person,q:'',kind:'',side:''};
      for(const key of ['from','to','page','stage','preset'])delete all[key];
      links.append(a('与另一位人物并排比较 ↗','../compare/#'+new URLSearchParams({a:row.period+':'+row.person})));
      links.append(a('打开人物完整档案 ↗','../'+person(row).url),a('只看此人的全部阶段',href(all)));
    }
    if(row.start){const p=period(row.period),start=Math.max(p.start,row.startYear),end=Math.min(p.end,row.endYear);
      if(start<=end){links.append(a((start===row.startYear?'起年档案':'本卷可读起年')+' · '+E.when(start),routeYear(row.period,start)));if(end!==start)links.append(a((end===row.endYear?'止年档案':'本卷可读止年')+' · '+E.when(end),routeYear(row.period,end)));}
    }box.append(links,el('h3','沿用原卷出处'));
    const refs=el('ul');row.sources.forEach(key=>{const ref=index.sources[key],li=el('li'),link=a(ref.label+' ↗',ref.url);link.target='_blank';link.rel='noopener';li.append(link);if(ref.kind)li.append(el('span',' · '+ref.kind));refs.append(li);});
    box.append(refs,el('p','本次将原卷资料投影为时间轴；沿用既有出处，未重新逐条核读。日期窗口和图形宽度不用于精确任期天数计算。','tl-note'));
    main.append(box);
  }
  function yearLinks(s){
    const from=Number(s.from),to=Number(s.to),span=E.axis(to)-E.axis(from)+1;
    const details=el('details',null,'tl-year-links');details.append(el('summary','跳至年度档案 · 输入任意本段年份'));
    const form=el('form'),l=el('label','年度（负数为公元前）'),n=el('input');n.type='number';n.required=true;n.min=from;n.max=to;n.value=from;n.id='tl-year';l.append(n);form.append(l);
    const submit=el('button','显示年度入口');submit.type='submit';form.append(submit);const result=el('nav');result.setAttribute('aria-label','年度入口');
    const show=y=>{result.replaceChildren();if(!Number.isInteger(y)||y===0||y<from||y>to){result.textContent='请输入范围内的非0历史年份。';return;}
      index.periods.filter(p=>(!s.period||s.period===p.id)&&p.start<=y&&p.end>=y).forEach(p=>result.append(a(p.title+' · '+E.when(y)+' ↗',routeYear(p.id,y))));
      if(!result.childNodes.length)result.textContent='本卷未收录这一年，请选择五卷对读。';};
    form.onsubmit=e=>{e.preventDefault();show(Number(n.value));};show(from);details.append(form,result);
    if(span<=30){const years=el('nav');years.setAttribute('aria-label','本段逐年入口');for(let x=E.axis(from);x<=E.axis(to);x++){const y=E.year(x);index.periods.filter(p=>(!s.period||s.period===p.id)&&p.start<=y&&p.end>=y).forEach(p=>years.append(a(E.when(y)+' · '+p.title,routeYear(p.id,y))));}details.append(years);}
    main.append(details);
  }
  async function render(){
    const token=++revision,s=state(),renderedHash=location.hash;main.setAttribute('aria-busy','true');
    try{await load();if(token!==revision)return;main.replaceChildren();
      const rawParams=new URLSearchParams(location.hash.slice(1));
      if(s.person&&!rawParams.has('from')&&!rawParams.has('to')&&index.people[s.person]){
        const appointments=Object.values(index.stages).filter(r=>r.period+':'+r.person===s.person&&r.start);
        const p=period(s.person.split(':')[0]);s.period=p.id;
        s.from=String(appointments.length?Math.max(-753,Math.min(...appointments.map(r=>r.startYear))):p.start);
        s.to=String(appointments.length?Math.min(1453,Math.max(...appointments.map(r=>r.endYear))):p.end);
      }
      main.append(el('p','TEMPORA IMPERII · 帝号与官职的时间','eyebrow'),el('h1','同一年，可能不止一种权力。'),el('p','沿着任期，看谁先谁后、何时共治与争位；把头衔、宫廷和实际主政分开阅读。','tl-intro'));
      const presets=el('details',null,'tl-presets');presets.open=!location.hash;presets.append(el('summary','从一个历史问题开始 · '+index.presets.length+'个入口'));
      const nav=el('nav');nav.setAttribute('aria-label','时间轴专题');index.presets.forEach(p=>{const link=a(p.title,href({period:p.period,from:p.from,to:p.to,preset:p.id,view:s.view}));nav.append(link);});presets.append(nav);main.append(presets);controls(s);
      const allowed=['period','from','to','q','kind','side','person','view','zoom','stage','page','preset'];
      const invalid=Object.keys(s).some(k=>!allowed.includes(k))||s.period&&!period(s.period)||s.kind&&!index.kinds[s.kind]||s.side&&!index.sides[s.side]||s.person&&!index.people[s.person]||!['chart','list'].includes(s.view)||s.zoom&&!['1','2','4','8','16'].includes(s.zoom)||s.page&&!/^[1-9]\d*$/.test(s.page)||s.preset&&!index.presets.some(p=>p.id===s.preset)||s.q?.length>160||![-1,1].includes(Math.sign(Number(s.from)))||![-1,1].includes(Math.sign(Number(s.to)))||![s.from,s.to].every(v=>/^-?\d+$/.test(v)&&Number.isSafeInteger(Number(v))&&Number(v)>=-753&&Number(v)<=1453)||Number(s.from)>Number(s.to);
      if(invalid){const error=el('p','无法展开：请检查年份范围（负数表示公元前，无0年）、分卷及筛选地址。','tl-error');error.setAttribute('role','alert');main.append(error,a('恢复69年时间轴',href(defaultState())));return;}
      const preset=index.presets.find(p=>p.id===s.preset&&p.period===s.period&&p.from===Number(s.from)&&p.to===Number(s.to));if(preset)main.append(el('p',preset.note,'tl-context'));
      const rows=selectedRows(s),dated=rows.filter(r=>r.start),undated=rows.filter(r=>!r.start);
      if(s.person)main.append(el('p','人物视图保留此卷原档案的完整阶段，包括超出本卷年度范围的原始任期；年度入口仍限于本卷实际收录年份。其他卷同一人的档案可经原人物页继续对读。','tl-context'));
      const count=dated.length,pages=Math.max(1,Math.ceil(count/60)),page=Math.min(pages,Number(s.page)||1),slice=dated.slice((page-1)*60,page*60);
      document.title=`${E.when(Number(s.from))}—${E.when(Number(s.to))} · 任期时间轴 · FASTI`;
      const summary=el('h2',`${E.when(Number(s.from))} — ${E.when(Number(s.to))}`);main.append(summary);
      const status=el('p',`${count}项有年代阶段 · ${new Set(dated.filter(r=>!r.isVacancy).map(r=>r.period+':'+r.person)).size}份本卷人物档案 · ${undated.length}项绝对任期未定`,'tl-status');status.setAttribute('role','status');main.append(status);
      legend();toolbar(s);
      if(s.stage){const row=index.stages[s.stage];if(row)detail(row,s);else{const error=el('p','找不到这一任期阶段；下方仍显示当前范围。','tl-error');error.setAttribute('role','alert');main.append(error);}}
      if(!rows.length)main.append(el('p','没有匹配的任期。可清空姓名、身份或宫廷筛选，或扩大年份范围。','tl-empty'));
      else if(slice.length){if(s.view==='chart')chart(slice,s);else list(slice,s);}
      if(pages>1){const nav=el('nav',null,'tl-pagination');nav.setAttribute('aria-label','任期分页');if(page>1)nav.append(a('← 上一页',href({...s,page:page-1,stage:''})));nav.append(el('span',`第${page}／${pages}页 · 本页${slice.length}项，每页最多60项`));if(page<pages)nav.append(a('下一页 →',href({...s,page:page+1,stage:''})));main.append(nav);}
      if(undated.length){main.append(el('h2','绝对任期未定 · 不放入年度坐标'));list(undated,s);}
      yearLinks(s);
      const method=el('details',null,'tl-method');method.append(el('summary','如何阅读精度、身份与史料边界'),el('p',index.method),el('p','一条对应原卷一项任职或称号阶段。复位、头衔晋升与多次任职分别保留；同一人物在相邻分卷可能各有档案，不自动去重或拼接。图中只显示所选范围，裁切标记不代表在此即位／退位。缺少条形不证明没有统治者；空缺只展示原卷明确记载的条目。'),a('完整维护与研究说明 ↗','https://github.com/kaloioannes/roman-fasti/blob/main/docs/timeline.md'),el('p','资料版本 '+index.version+' · 文字与数据 CC BY-SA 4.0 · FASTI contributors','tl-note'));main.append(method);
    }catch{if(token!==revision)return;main.replaceChildren(el('h1','任期资料暂时无法载入'),el('p','请求失败、超时或资料结构不完整。各卷原档案仍可阅读。'),button('重试时间轴',render),a('返回全部时期','../'));}
    finally{if(token===revision){main.dataset.renderedHash=renderedHash;main.setAttribute('aria-busy','false');if(location.hash){const target=document.querySelector('#timeline-detail')||main;target.focus({preventScroll:true});if(target!==main)target.scrollIntoView({block:'start'});}}}
  }
  document.querySelector('#theme-button').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('fasti-theme',theme);}catch{}};
  addEventListener('hashchange',render);render();
})();
