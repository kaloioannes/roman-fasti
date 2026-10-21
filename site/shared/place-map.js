'use strict';
window.FastiPlaceMap=(()=>{
 const Engine=window.FastiPlaceEngine;
 let cached,pending,land,landPending;
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(label,url)=>{const a=el('a',label);a.href='../'+url;return a;};
 const when=y=>y<0?'前'+(-y)+'年':'公元'+y+'年';
 const roles={setting:'发生／行动地点',subject:'事件对象地点',mentioned:'仅被提及'};
 const peopleRoles={participant:'直接参与',subject:'事件主体',mentioned:'仅被提及'};
 const statusNames={approximate:'地理参照点',disputed:'位置／现场存疑',unlocated:'未核实可靠坐标'};
 async function request(url,validate){const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);try{const r=await fetch(url,{signal:c.signal});if(!r.ok)throw Error('HTTP');const v=await r.json();if(!validate(v))throw Error('schema');return v;}finally{clearTimeout(t);}}
 async function load(){if(cached)return cached;if(!pending)pending=request('../data/places/index.json',Engine.valid).then(v=>(cached=v)).finally(()=>{pending=null;});return pending;}
 async function basemap(){if(land)return land;if(!landPending)landPending=request('../shared/assets/land-50m.json',v=>v?.type==='Topology'&&v.objects?.land&&Array.isArray(v.arcs)).then(v=>{const g=topojson.feature(v,v.objects.land);if(!g||!['Feature','FeatureCollection'].includes(g.type))throw Error();land=g;return land;}).finally(()=>{landPending=null;});return landPending;}
 function date(e){const d=e.date;if(d.extent==='undated')return '绝对年代未定 · 传统叙事';const point=p=>when(p.year)+(p.month?p.month+'月':'')+(p.day?p.day+'日':''),a=point(d.start),b=point(d.end);return (a===b?a:a+' — '+b)+' · '+({point:'所载日期',span:'持续过程',window:'日期窗口',context:'年度归置'}[d.extent]||'')+' · '+({certain:'按所载纪年',approximate:'约年',disputed:'纪年异说',traditional:'传统纪年'}[d.certainty]||'')+' · '+d.note;}
 function download(data,result,filters){const b=new Blob([JSON.stringify({version:data.version,license:data.license,attribution:data.attribution||'FASTI contributors; per-place Pleiades credits and CC BY 3.0 retained.',filters,places:Object.fromEntries([...new Set(result.events.flatMap(e=>e.placeRelations.map(r=>r.place)))].map(id=>[id,data.places[id]])),events:result.events},null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=el('a');a.href=url;a.download=['fasti-event-map','json'].join('.');a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function mount(host,options={}){
  if(!host||!Engine)return;
  const box=el('section',null,'place-map-panel');box.setAttribute('aria-label','地点与事件地图');host.append(box);
  let data,result,filters,svg,projection,zoom,pinNodes=new Map(),drawing=0;
  const annual=options.year!==undefined;
  async function init(){
   box.replaceChildren(el('p','正在查阅地点与事件资料……'));box.setAttribute('aria-busy','true');
   try{data=options.source||await load();if(!box.isConnected)return;render();}
   catch{if(!box.isConnected)return;box.replaceChildren(el('p','事件地图资料暂未载入。年度正文和原疆域图仍可阅读。'));const b=el('button','重试事件地图');b.type='button';b.onclick=init;box.append(b);}
   finally{box.setAttribute('aria-busy','false');}
  }
  function render(){
   box.replaceChildren(el('h2',annual?when(options.year)+' · 事件地点':'地点与事件地图'),el('p','按明确关联定位，空心点表示仅提及。点位是城市／遗址参照，不等于事件现场；下列列表保留所有匹配记事，包括无坐标、位置存疑与尚未编订地点的条目。','atlas-legend'));
   const params=options.params||new URLSearchParams(),form=el('form',null,'place-map-tools'),controls={};form.noValidate=true;
   const field=(key,label,type,value)=>{const wrap=el('label',label),n=el('input');n.type=type;n.name=key;n.value=value??'';if(type==='number'){n.min=-753;n.max=1453;n.step=1;}if(type==='search')n.maxLength=160;wrap.append(n);form.append(wrap);controls[key]=n;return n;};
   if(!annual){const start=params.get('year')||params.get('from'),end=params.get('year')||params.get('to');field('from','起年（负数为公元前）','number',start&&Engine.year(start)===null?'0':start);field('to','止年（无公元0年）','number',end&&Engine.year(end)===null?'0':end);}
   const select=(key,label,rows,value)=>{const wrap=el('label',label),n=el('select');n.name=key;for(const [id,title] of rows){const o=el('option',title);o.value=id;n.append(o);}n.value=value||'';wrap.append(n);form.append(wrap);controls[key]=n;};
   if(!annual)select('period','分卷',[['','全部时期'],...data.periods.map(p=>[p.id,p.title])],params.get('period'));
   select('topic','主题',[['','全部主题'],...Object.entries(data.topics)],params.get('topic'));
   field('mapq','事件／人物／地点','search',params.get('mapq'));
   const check=(key,label,checked)=>{const wrap=el('label',null,'place-check'),n=el('input');n.type='checkbox';n.checked=checked;wrap.append(n,el('span',label));controls[key]=n;form.append(wrap);};
   check('settings','仅发生／对象地点落点',params.get('settings')==='1');
   if(!annual)check('undated','包含未定年传统',!params.has('from')&&!params.has('to')&&!params.has('year')||params.get('undated')==='1');
   const apply=el('button','应用筛选');apply.type='submit';form.append(apply);
   const error=el('p');error.setAttribute('role','alert');const status=el('p');status.setAttribute('role','status');
   const mapHost=el('div'),selection=el('div',null,'atlas-selection');selection.tabIndex=-1;selection.setAttribute('aria-label','选中地点的事件与人物');
   const actions=el('div',null,'place-map-tools atlas-controls'),copy=el('button','复制事件地图链接'),exportButton=el('button','下载筛选结果 JSON'),canonical=el('textarea',null,'event-citation-text'),notice=el('p');canonical.readOnly=true;canonical.setAttribute('aria-label','事件地图稳定链接');notice.setAttribute('role','status');
   copy.onclick=async()=>{try{await navigator.clipboard.writeText(canonical.value);notice.textContent='已复制地图筛选链接。';}catch{canonical.focus();canonical.select();notice.textContent='已选中链接，可手动复制。';}};
   copy.disabled=true;exportButton.disabled=true;
   exportButton.onclick=()=>download(data,result,filters);actions.append(copy,exportButton);
   const list=el('ol',null,'place-map-events'),more=el('button','继续显示事件'),listTitle=el('h3','事件与人物 · 等价列表');more.hidden=true;
   box.append(form,error,status,mapHost,selection,actions,canonical,notice,listTitle,list,more);
   function applyFilters(save=false){
    const rawA=controls.from?.value.trim()||'',rawB=controls.to?.value.trim()||'';
    const a=annual?options.year:rawA?Engine.year(rawA):-753,b=annual?options.year:rawB?Engine.year(rawB):1453;
    if(a===null||b===null||a>b){error.textContent='请输入前753年至公元1453年的有效起止年，负数表示公元前；无公元0年，起年须不晚于止年。';copy.disabled=true;exportButton.disabled=true;return;}
    copy.disabled=false;exportButton.disabled=false;
    error.textContent='';filters={from:a,to:b,period:annual?options.period:controls.period.value,topic:controls.topic.value,q:controls.mapq.value.trim(),place:options.place||'',undated:!annual&&controls.undated.checked,settingsOnly:controls.settings.checked};
    result=Engine.select(data,filters);selection.replaceChildren();
    status.textContent=`${result.events.length} 条记事 · ${result.pins.length} 个地点参照点 · ${result.unmapped.length} 条未落点（坐标／关系未核实、仅提及筛选或地点年代不符）。摘要、过程与子事件保留独立类型，不以点数表示独立史实数量。`;
    const share=new URLSearchParams({map:'1'});if(options.place)share.set('place',options.place);
    if(annual){share.set('year',options.year);share.set('period',options.period);}else{if(rawA)share.set('from',a);if(rawB)share.set('to',b);if(filters.period)share.set('period',filters.period);if(filters.undated)share.set('undated','1');}
    if(filters.topic)share.set('topic',filters.topic);if(filters.q)share.set('mapq',filters.q);if(filters.settingsOnly)share.set('settings','1');
    canonical.value=new URL('../places/#'+share,location.href).href;
    if(save&&!annual){history.replaceState(null,'','#'+share);const m=document.querySelector('#content');if(m)m.dataset.renderedHash=location.hash;}
    let shown=0;list.replaceChildren();
    function next(){const rows=result.events.slice(shown,shown+60);for(const e of rows){const li=el('li');li.dataset.eventId=e.id;li.append(link(e.title+' ↗',e.url),el('p',data.kinds[e.recordKind]+' · '+(data.periods.find(p=>p.id===e.period)?.title||e.period)),el('p',date(e)));
      for(const r of e.placeRelations){const p=data.places[r.place],line=el('p');line.append(link(p.label+' ↗',r.url),el('span',' · '+roles[r.role]+' · '+statusNames[p.status]+' · '+r.basis));
       const pins=result.pins.filter(pin=>pin.place.id===p.id&&pin.events.some(row=>row.id===e.id));if(pins.length){const b=el('button','在图中查看 '+p.label);b.type='button';b.onclick=()=>showPin(pins[0],true);line.append(b);}li.append(line);}
      if(!e.placeRelations.length)li.append(el('p','尚未编订明确地点；不从正文猜测坐标。'));
      if(e.people.length){const people=el('p','明确关联人物：');for(const p of e.people)people.append(link(p.label+'（'+peopleRoles[p.role]+'） ↗',p.url),el('span','；'));li.append(people);}list.append(li);}
     shown+=rows.length;more.hidden=shown>=result.events.length;more.textContent=`继续显示事件（已显示 ${shown} / ${result.events.length}）`;
    }more.onclick=next;next();if(!result.events.length)list.append(el('li','没有匹配记事。可放宽年代或主题；现有地点关联并不覆盖全部史实。'));
    draw(mapHost);
   }
   form.onsubmit=e=>{e.preventDefault();applyFilters(true);};form.onchange=()=>applyFilters(true);applyFilters();
  }
  function showPin(pin,focus=false){
   const area=box.querySelector('.atlas-selection');area.replaceChildren(link(pin.place.label+' · 地点档案 ↗','places/#place='+pin.place.id),el('p',pin.location.note));
   const ul=el('ul');for(const e of pin.events){const li=el('li');li.append(link(e.title+' ↗',e.url),el('p',date(e)));for(const p of e.people)li.append(link(p.label+'（'+peopleRoles[p.role]+'） ↗',p.url),el('span','；'));ul.append(li);}area.append(ul);
   if(focus){area.focus({preventScroll:true});area.scrollIntoView({block:'nearest'});}
   if(svg&&zoom&&projection){const xy=projection(pin.location.coordinates);svg.call(zoom.transform,d3.zoomIdentity.translate(450-xy[0]*2,230-xy[1]*2).scale(2));}
  }
  async function draw(host){
   const token=++drawing;host.replaceChildren();pinNodes=new Map();svg=null;
   const mapStatus=el('p','正在载入底图……');mapStatus.setAttribute('role','status');const canvas=el('div',null,'atlas-canvas'),toolbar=el('div',null,'place-map-tools atlas-controls');host.append(mapStatus,canvas,toolbar);
   if(!window.d3||!window.topojson){mapStatus.textContent='地图绘图库未载入；下方事件列表仍可阅读。';return;}
   try{const geo=await basemap();if(token!==drawing||!host.isConnected)return;
    const coords=result.pins.map(p=>p.location.coordinates);projection=d3.geoMercator();
    if(coords.length===1){projection.center(coords[0]).scale(800).translate([450,230]);}
    else if(coords.length>1){const lons=coords.map(c=>c[0]),lats=coords.map(c=>c[1]),lo=[Math.min(...lons)-2,Math.min(...lats)-2],hi=[Math.max(...lons)+2,Math.max(...lats)+2];projection.fitExtent([[45,45],[855,415]],{type:'MultiPoint',coordinates:[lo,hi]});}
    else projection.center([22,39]).scale(650).translate([450,230]);
    svg=d3.select(canvas).append('svg').attr('class','event-atlas').attr('viewBox','0 0 900 460').attr('role','group').attr('aria-label','事件地点示意图；可用下方列表完成全部阅读操作');const group=svg.append('g');
    const path=d3.geoPath(projection);group.append('path').datum(d3.geoGraticule().step([10,10])()).attr('class','atlas-grid').attr('d',path);group.append('path').datum(geo).attr('class','atlas-land').attr('d',path);
    zoom=d3.zoom().scaleExtent([.75,12]).filter(e=>e.type!=='wheel'&&(!e.button||e.type==='touchstart')).on('zoom',e=>group.attr('transform',e.transform));svg.call(zoom).on('dblclick.zoom',null);
    const labels=[],typeScale=Math.min(3,900/Math.max(280,canvas.clientWidth));
    result.pins.forEach(pin=>{const [x,y]=projection(pin.location.coordinates),g=group.append('g').attr('transform',`translate(${x},${y})`).attr('class','atlas-pin'+(pin.roles.every(r=>r==='mentioned')?' mention':''))
     .attr('data-place',pin.place.id).attr('role','button').attr('tabindex',0).attr('aria-label',`${pin.place.label} · ${pin.events.length}条记事 · ${pin.roles.map(r=>roles[r]).join('、')}`).on('click',()=>showPin(pin,true)).on('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();showPin(pin,true);}});
     g.append('circle').attr('r',7*typeScale);g.append('title').text(pin.place.label+' · '+pin.location.note);pinNodes.set(pin.id,g);
     const left=x>600,width=pin.place.label.length*14*typeScale,dx=(left?-12:12)*typeScale,rect=[left?x+dx-width:x+dx,y-9*typeScale,left?x+dx:x+dx+width,y+9*typeScale];
     if(rect[0]>10&&rect[2]<890&&!labels.some(r=>r[0]<rect[2]&&r[2]>rect[0]&&r[1]<rect[3]&&r[3]>rect[1])){labels.push(rect);group.append('text').attr('class','atlas-label').style('font-size',14*typeScale+'px').attr('text-anchor',left?'end':'start').attr('x',x+dx).attr('y',y+5*typeScale).text(pin.place.label);}
    });
    for(const [label,factor] of [['放大事件地图',1.5],['缩小事件地图',1/1.5]]){const b=el('button',label);b.type='button';b.onclick=()=>svg.call(zoom.scaleBy,factor);toolbar.append(b);}
    const reset=el('button','重置事件地图视野');reset.type='button';reset.onclick=()=>svg.call(zoom.transform,d3.zoomIdentity);toolbar.append(reset);
    mapStatus.textContent=result.pins.length?'底图：Natural Earth（公有领域）· 现代海岸，仅作方位参考。坐标：Pleiades，逐项CC BY 3.0署名见地点档案。':'当前筛选无可落点地点；下方仍列出所有匹配记事。';
   }catch{if(token!==drawing||!host.isConnected)return;mapStatus.replaceChildren(el('span','底图暂未载入；事件列表和筛选可继续使用。'));const b=el('button','重试事件底图');b.type='button';b.onclick=()=>draw(host);mapStatus.append(b);}
  }
  init();return box;
 }
 function annual(period,year,host){
  if(!host||host.querySelector('.annual-event-map'))return;
  const details=el('details',null,'annual-event-map place-map-panel'),summary=el('summary','查看本年事件地图与地点列表');details.append(summary);host.append(details);
  const target=el('div');details.append(target);let mounted=false;
  details.ontoggle=()=>{if(details.open&&!mounted){mounted=true;mount(target,{period,year});}};
  // Original spoiler preferences apply before any event text or map is requested.
  details.resetEventMap=()=>{details.open=false;target.replaceChildren();mounted=false;};
 }
 document.addEventListener('change',e=>{if(e.target.id==='spoiler-switch'&&e.target.checked)document.querySelectorAll('.annual-event-map').forEach(n=>n.resetEventMap?.());});
 return {mount,annual,load,statusNames};
})();
