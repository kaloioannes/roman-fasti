'use strict';
(()=>{
 const E=window.FastiMapCompare,main=document.querySelector('#content');
 const paths={republic:'../data/republic/territories.json',empire:'../data/empire/territories.json','divided-empire':'../data/divided-empire/territories.json',byzantine:'../data/byzantine/territories.json'};
 const cache=new Map(),pending=new Map();let data,generation=0,first=true,disposeMap=()=>{};
 const names={roman:'罗马世界外缘',east:'东部',west:'西部',byzantine:'拜占庭',nicaea:'尼西亚',latin:'拉丁帝国',trebizond:'特拉比松'};
 const precision={schematic:'编辑近似示意 · 边线未定',borrowed:'借用邻近源阶段 · 年度近似',reconstruction:'GIS阶段重建 · 非逐年疆界'};
 const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;};
 const link=(label,url)=>{const n=el('a',label);n.href=url;return n;};
 const button=(label,action)=>{const n=el('button',label);n.type='button';n.onclick=action;return n;};
 const title=id=>data.periods.find(p=>p.id===id).title;
 const sourceRange=r=>{const when=y=>y===0?'源0年（原GIS端点）':E.when(y);return when(r.from)+(r.from===r.to?'':' — '+when(r.to));};
 async function request(key,url,validate){
  if(cache.has(key))return cache.get(key);
  if(!pending.has(key))pending.set(key,(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{const r=await fetch(url,{signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);const v=await r.json();validate(v);cache.set(key,v);return v;}finally{clearTimeout(timer);pending.delete(key);}})());
  return pending.get(key);
 }
 const fetchIndex=()=>request('index','../data/map-compare/index.json',v=>{if(!E.valid(v))throw Error('目录结构无效');});
 const fetchMaps=pid=>request(pid,paths[pid],v=>{for(const s of Object.values(data.stages))if(s.period===pid)E.geometry(v,s);});
 const fetchLand=()=>request('land','../shared/assets/land-50m.json',v=>{if(v?.type!=='Topology'||!v.objects?.land||!Array.isArray(v.arcs)||!window.topojson)throw Error('底图结构无效');const f=topojson.feature(v,v.objects.land);if(!f||!['Feature','FeatureCollection'].includes(f.type))throw Error('底图转换失败');});
 const commit=state=>{const hash='#'+E.query(state);if(location.hash===hash)route();else location.hash=hash;};
 function snapshot(s,p,side){
  const box=el('article',null,'snapshot');box.dataset.side=side;box.dataset.stage=s.id;
  box.append(el('p',side.toUpperCase()+' · '+title(p.period),'eyebrow'),el('h2',E.when(p.year)),el('p','实际显示阶段：'+E.range(s.from,s.to)),el('p',s.note));
  if(s.kind==='places')box.append(el('p','地点示意 · '+s.label,'precision'),el('p','王政卷无疆域多边形；点位编号对应下方地点列表，不能与领土色面计算增减。'));
  const list=el('ul');for(const l of s.layers){const li=el('li');li.append(el('strong',names[l.key]||l.key),el('p',precision[l.precision],'precision'),el('p','本层显示适用期：'+E.range(l.from,l.to)),el('p','原始源阶段：'+(l.sourceStages.map(r=>r.polity+' · '+sourceRange(r)).join('；')||'独立编辑示意，无上游GIS阶段')),el('p',l.caption));list.append(li);}box.append(list);
  if(s.layers.some(l=>l.from!==p.year||l.to!==p.year))box.append(el('p','所选年度沿用上述阶段几何，没有为本年新绘疆界。','muted'));
  box.append(link('打开'+E.when(p.year)+'原卷档案 ↗','../'+E.annual(p.period,p.year)));
  return box;
 }
 function sources(s,side){
  const box=el('section',null,'source-card');box.append(el('h3',side.toUpperCase()+' · 图层与来源等价列表'));
  if(s.kind==='places'){
   box.append(el('p','传统王期：'+s.label),el('p',s.note));const ul=el('ul');
   for(const [i,p] of s.points.entries()){const li=el('li');li.append(el('strong',(i+1)+' · '+p.label),el('p',p.note),el('p','原卷近似坐标：'+p.coordinates.join(', ')));for(const r of p.references)li.append(link(r.label+' ↗',r.url),el('span',' '));ul.append(li);}box.append(ul);if(!s.points.length)box.append(el('p','原年度没有关联王期地点；保留空缺。'));
  }else for(const l of s.layers){const section=el('div');section.append(el('h3',l.label),el('p',precision[l.precision]),el('p',l.caption),el('p','源阶段：'+(l.sourceStages.map(r=>r.polity+' · '+sourceRange(r)).join('；')||'独立编辑示意')),el('p','许可：'+l.license),el('p','处理与来源：'+l.provenance));for(const r of l.references)section.append(link(r.label+' ↗',r.url),el('span',' '));box.append(section);}
  box.append(el('p','本次对照沿用仓库既有GIS、地点及引用；未重新核读外部历史文献。','muted'));return box;
 }
 function render(state,token){
  main.replaceChildren();main.setAttribute('aria-busy','false');main.dataset.renderedHash=location.hash;
  const a=E.stage(data,state.a.period,state.a.year),b=E.stage(data,state.b.period,state.b.year);
  document.title=E.when(state.a.year)+'／'+E.when(state.b.year)+' · 地图阶段对照 · FASTI';
  main.append(el('p','TERRITORIVM · 在同一视野里读变化','eyebrow'),el('h1','地图阶段对照'),el('p','选两个年份，比较它们实际采用的历史阶段。拖动或缩放任一图，两侧同步；阶段说明与文字事件一起阅读。','intro'));
  const presets=el('nav',null,'presets');presets.setAttribute('aria-label','地图对照专题');for(const p of data.presets){const n=link(p.title,'#preset='+p.id);if(state.a.period===p.a.period&&state.a.year===p.a.year&&state.b.period===p.b.period&&state.b.year===p.b.year)n.setAttribute('aria-current','true');presets.append(n);}main.append(presets);
  const form=el('form');form.noValidate=true;const pair=el('div',null,'pair-controls');form.append(pair);
  for(const side of ['a','b']){
   const point=state[side],stage=side==='a'?a:b,period=data.periods.find(p=>p.id===point.period),field=el('fieldset',null,'choice');field.append(el('legend',side.toUpperCase()+' · 选择分卷与年份'));
   const label=el('label'),select=el('select');select.name=side+'p';select.setAttribute('aria-label',side.toUpperCase()+'分卷');label.append(el('span','分卷'),select);for(const p of data.periods){const o=el('option',p.title);o.value=p.id;select.append(o);}select.value=point.period;field.append(label);
   const yearLabel=el('label'),input=el('input');input.name=side+'y';input.type='number';input.min=period.start;input.max=period.end;input.step=1;input.value=point.year;input.setAttribute('aria-label',side.toUpperCase()+'年份（负数为公元前）');yearLabel.append(el('span','年度'),input);field.append(yearLabel,el('p',E.range(period.start,period.end)+' · 负数为公元前，无0年','muted'));
   const stages=el('select');stages.setAttribute('aria-label',side.toUpperCase()+'已有地图阶段');for(const id of period.stages){const s=data.stages[id],o=el('option',E.range(s.from,s.to)+' · '+s.label);o.value=id;stages.append(o);}stages.value=stage.id;const stageLabel=el('label');stageLabel.append(el('span','已有阶段'),stages);field.append(stageLabel);
   const move=direction=>{const i=period.stages.indexOf(stage.id),target=data.stages[period.stages[i+direction]];if(target){const next=structuredClone(state);next[side].year=target.from;next.preset='';commit(next);}};
   const steps=el('div',null,'stage-steps'),previous=button(side.toUpperCase()+' 上一阶段',()=>move(-1)),next=button(side.toUpperCase()+' 下一阶段',()=>move(1));previous.disabled=stage.id===period.stages[0];next.disabled=stage.id===period.stages.at(-1);steps.append(previous,next);field.append(steps);pair.append(field);
   select.onchange=()=>{const next=structuredClone(state),p=data.periods.find(p=>p.id===select.value);next[side]={period:p.id,year:Math.min(p.end,Math.max(p.start,point.year))};if(next[side].year===0)next[side].year=p.start;next.preset='';commit(next);};
   stages.onchange=()=>{const next=structuredClone(state);next[side].year=data.stages[stages.value].from;next.preset='';commit(next);};
  }
  const actions=el('div',null,'actions'),apply=el('button','对照所选年份');apply.type='submit';actions.append(apply,button('交换 A / B',()=>{const next=structuredClone(state);[next.a,next.b]=[next.b,next.a];next.preset='';commit(next);}));
  const mode=el('select');mode.setAttribute('aria-label','地图对照方式');for(const [id,text] of [['split','并排对照'],['swipe','滑动揭示']]){const o=el('option',text);o.value=id;mode.append(o);}mode.value=state.mode;
  const frame=el('select');frame.setAttribute('aria-label','统一地图视野');for(const [id,text] of [['auto','适合两侧全部图层'],['mediterranean','地中海全景'],['latium','拉丁姆近景'],['east','东地中海']]){const o=el('option',text);o.value=id;frame.append(o);}frame.value=state.frame;
  const modeLabel=el('label','方式'),frameLabel=el('label','统一视野');modeLabel.append(mode);frameLabel.append(frame);actions.append(modeLabel,frameLabel);form.append(actions);
  const error=el('p',null,'error');error.setAttribute('role','alert');form.append(error);main.append(form);
  form.onsubmit=e=>{e.preventDefault();const next=structuredClone(state);for(const side of ['a','b']){const y=E.year(form.elements[side+'y'].value),p=form.elements[side+'p'].value;if(y===null||!E.stage(data,p,y)){error.textContent='请选择本卷范围内的整数年份，负数为公元前；无公元0年。';return;}next[side]={period:p,year:y};}next.preset='';commit(next);};
  mode.onchange=()=>{const next=structuredClone(state);next.mode=mode.value;commit(next);};frame.onchange=()=>{const next=structuredClone(state);next.frame=frame.value;next.view={k:1,x:0,y:0};commit(next);};
  const snapshots=el('div',null,'snapshots');snapshots.append(snapshot(a,state.a,'a'),snapshot(b,state.b,'b'));main.append(snapshots);
  main.append(el('p','实线为GIS阶段重建，虚线为编辑示意或借用邻近阶段。两侧采用相同投影、比例和视野；现代海岸仅作方位参照。图形没有逐年插值，也不计算精确面积增减。','caution'));
  if(a.id===b.id)main.append(el('p','两侧属于同一个地图阶段，沿用相同图层；年度文字仍可能不同。','caution'));
  if(a.period!==b.period)main.append(el('p','跨卷对照：各卷收录范围与制图口径不同。色块出现或消失可能来自图层选择，请结合上方源阶段及原卷档案。','caution'));
  const mapStatus=el('div',null,'map-status');mapStatus.setAttribute('role','status');main.append(mapStatus);
  const maps=el('div',null,'compare-canvases'+(state.mode==='swipe'?' swipe':''));maps.style.setProperty('--swipe',state.swipe+'%');maps.setAttribute('aria-label','A与B统一视野对照图');main.append(maps);
  for(const side of ['a','b']){const pane=el('div',null,'map-pane');pane.dataset.side=side;pane.append(el('p',side.toUpperCase()+' · '+E.when(state[side].year),'map-label'),el('div',null,'drawing'));maps.append(pane);}maps.append(el('div',null,'swipe-line'));
  const swipeLabel=el('label','滑动分界：左侧 A，右侧 B（键盘方向键可调）','swipe-control'),swipe=el('input');swipe.type='range';swipe.min=0;swipe.max=100;swipe.value=state.swipe;swipe.setAttribute('aria-label','左右阶段分界百分比');swipeLabel.append(swipe);swipeLabel.hidden=state.mode!=='swipe';main.append(swipeLabel);
  const tools=el('div',null,'map-tools');main.append(tools,el('p','图层颜色：罗马／西部为赭红，东部／拜占庭／尼西亚为紫色，拉丁帝国为金色，特拉比松为蓝色。完整层名、近似与出处见两侧等价列表。','legend'));
  const sourcePair=el('div',null,'source-pair');sourcePair.append(sources(a,'a'),sources(b,'b'));main.append(sourcePair);
  const preset=data.presets.find(p=>state.a.period===p.a.period&&state.a.year===p.a.year&&state.b.period===p.b.period&&state.b.year===p.b.year);
  const readings=el('section',null,'readings');readings.append(el('h2','从变化走向事件'));
  if(preset){readings.append(el('p',preset.note));for(const r of preset.readings)readings.append(link(r.title+' ↗','../'+r.url));}else readings.append(el('p','可先读两侧年度档案，再展开下方区间事件。区间相关性不等于已证明某事件造成图示边界变化。'));
  for(const side of ['a','b']){const p=state[side];readings.append(link(side.toUpperCase()+' · '+E.when(p.year)+'事件地图 ↗','../places/#map=1&period='+p.period+'&year='+p.year));}main.append(readings);
  interval(state,token);
  const share=el('section',null,'share'),canonical=el('textarea');canonical.readOnly=true;canonical.setAttribute('aria-label','地图对照稳定链接');const notice=el('p');notice.setAttribute('role','status');
  const updateURL=(save=true)=>{const q=E.query(state);canonical.value=new URL('#'+q,location.href).href;if(save){history.replaceState(null,'','#'+q);main.dataset.renderedHash=location.hash;}};
  canonical.value=new URL('#'+E.query(state),location.href).href;share.append(el('h2','保留这次对照'),button('复制对照链接',async()=>{try{await navigator.clipboard.writeText(canonical.value);notice.textContent='已复制，包含两侧年份、方式和统一视野。';}catch{canonical.focus();canonical.select();notice.textContent='已选中链接，可手动复制。';}}),button('下载对照资料 JSON',()=>{const payload={version:data.version,license:data.license,url:canonical.value,selection:state,method:data.method,stages:[a,b],reading:preset||null,attribution:'FASTI contributors; geometry licenses retained per layer; Natural Earth public domain. Geometry remains in original period files.'};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'})),n=link('下载',url);n.download=['fasti-map-comparison','json'].join('.');n.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),canonical,notice,el('p','下载保留阶段、源年代、说明与许可；原始几何可从各卷源资料复建。'));main.append(share);
  swipe.oninput=()=>{state.swipe=Number(swipe.value);maps.style.setProperty('--swipe',state.swipe+'%');updateURL(false);};swipe.onchange=()=>updateURL();
  drawMaps({state,a,b,maps,tools,status:mapStatus,updateURL,token});
 }
 function interval(state,token){
  const details=el('details',null,'interval'),summary=el('summary','查阅两侧年份之间的相关记事');details.append(summary);main.append(details);let loading=false,loaded=false;
  async function load(){if(loading||loaded)return;loading=true;const box=el('div');details.append(box);box.append(el('p','正在载入事件文字……'));try{
   const events=await FastiEventData.load();if(token!==generation||!box.isConnected)return;loaded=true;box.replaceChildren(el('p','仅列两侧所选分卷、两年之间有明确年度范围的现有记事。跨年对象只列一次，未定年传统不强配年份；这份列表不是地图变化原因的自动判定。'));
   const topic=el('select');topic.setAttribute('aria-label','区间事件主题');for(const [id,label] of [['','全部主题'],...Object.entries(events.topics)]){const o=el('option',label);o.value=id;topic.append(o);}const label=el('label','主题 ');label.append(topic);const count=el('p'),list=el('ol',null,'event-list'),more=button('继续显示记事',()=>next());box.append(label,count,list,more);let rows=[],shown=0;
   function next(){for(const e of rows.slice(shown,shown+40)){const li=el('li');li.dataset.eventId=e.id;li.append(link(e.title+' ↗','../'+e.url),el('p',events.kinds[e.recordKind]+' · '+FastiEventData.dates(e.date)+' · '+events.certainties[e.date.certainty],'event-meta'),el('p',e.text),el('p',e.date.note,'muted'));for(const p of e.people)li.append(link(p.label+'（'+({participant:'直接参与',subject:'事件主体',mentioned:'仅被提及'}[p.role]||p.role)+'） ↗','../'+p.url),el('span',' '));list.append(li);}shown=Math.min(shown+40,rows.length);more.hidden=shown>=rows.length;more.textContent='继续显示记事（'+shown+' / '+rows.length+'）';}
   const filter=()=>{rows=E.events(events,state,topic.value);count.textContent=rows.length+' 条匹配对象 · '+E.range(Math.min(state.a.year,state.b.year),Math.max(state.a.year,state.b.year));shown=0;list.replaceChildren();next();if(!rows.length)list.append(el('li','没有匹配记事，可放宽主题或查阅原卷未定年背景。'));};topic.onchange=filter;filter();
  }catch{if(token!==generation||!box.isConnected)return;box.replaceChildren(el('p','事件文字暂未载入；地图与源阶段仍可阅读。'),button('重试区间事件',()=>{box.remove();load();}));}finally{loading=false;}}
  details.ontoggle=()=>{if(details.open)load();};
 }
 function drawMaps({state,a,b,maps,tools,status,updateURL,token}){
  if(!window.d3||!window.topojson){status.textContent='地图绘图库未载入。两侧阶段、来源及地点等价列表可继续阅读。';return;}
  const required=[...new Set([a,b].filter(s=>s.kind==='territory').map(s=>s.period))],resources=new Map();let views=[],zoom,landFeature;
  const current=()=>token===generation&&maps.isConnected;
  const statusDraw=()=>{status.replaceChildren();for(const key of ['land',...required]){const r=resources.get(key),name=key==='land'?'地理底图':title(key)+'疆域';if(!r||r.state==='loading')status.append(el('p',name+'载入中……'));else if(r.state==='error')status.append(el('p',name+'暂未载入；其他图层和阶段说明仍可阅读。'),button('重试'+name,()=>load(key)));}};
  async function load(key){resources.set(key,{state:'loading'});statusDraw();try{const value=await(key==='land'?fetchLand():fetchMaps(key));if(!current())return;resources.set(key,{state:'ready',value});if(key==='land')landFeature=topojson.feature(value,value.objects.land);paint();}catch{if(!current())return;resources.set(key,{state:'error'});paint();}finally{if(current())statusDraw();}}
  function paint(){
   if(!current())return;
   const selected={a:a.kind==='territory'&&resources.get(a.period)?.state==='ready'?E.geometry(resources.get(a.period).value,a):[],b:b.kind==='territory'&&resources.get(b.period)?.state==='ready'?E.geometry(resources.get(b.period).value,b):[]};
   const coords=[];const collect=c=>{if(typeof c[0]==='number')coords.push(c);else c.forEach(collect);};for(const s of ['a','b'])for(const f of selected[s])collect(f.geometry.coordinates);for(const s of [a,b])for(const p of s.points)coords.push(p.coordinates);
   const frames={mediterranean:[-13,24,49,55],latium:[11.7,41.2,13.3,42.6],east:[18,28,46,47]};let bounds=frames[state.frame];
   if(!bounds){if(coords.length){const xs=coords.map(c=>c[0]),ys=coords.map(c=>c[1]);bounds=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];const dx=Math.max(.3,(bounds[2]-bounds[0])*.05),dy=Math.max(.3,(bounds[3]-bounds[1])*.05);bounds=[bounds[0]-dx,bounds[1]-dy,bounds[2]+dx,bounds[3]+dy];}else bounds=frames.mediterranean;}
   const projection=d3.geoMercator().fitExtent([[24,24],[876,436]],{type:'MultiPoint',coordinates:[[bounds[0],bounds[1]],[bounds[2],bounds[3]]]}),path=d3.geoPath(projection);
   views=[];
   zoom=d3.zoom().scaleExtent([.75,16]).translateExtent([[-600,-500],[1500,960]]).extent([[0,0],[900,460]]).filter(e=>e.type!=='wheel'&&(!e.button||e.type==='touchstart')).on('zoom',event=>{for(const v of views){v.group.attr('transform',event.transform);v.svg.property('__zoom',event.transform);}state.view={k:event.transform.k,x:event.transform.x,y:event.transform.y};updateURL(false);}).on('end',()=>updateURL());
   for(const side of ['a','b']){
    const stage=side==='a'?a:b,host=maps.querySelector('[data-side="'+side+'"] .drawing');host.replaceChildren();
    const svg=d3.select(host).append('svg').attr('viewBox','0 0 900 460').attr('role','img').attr('aria-label',side.toUpperCase()+' '+E.when(state[side].year)+' '+stage.label+'；图层及来源文字见等价列表');svg.append('title').text(E.range(stage.from,stage.to)+' · '+stage.note);const group=svg.append('g');
    group.append('path').datum(d3.geoGraticule().step([10,10])()).attr('class','map-grid').attr('d',path);if(landFeature)group.append('path').datum(landFeature).attr('class','map-land').attr('d',path);
    selected[side].forEach((f,i)=>{const l=stage.layers[i];group.append('path').datum(f).attr('class','map-layer').attr('data-key',l.key).attr('data-precision',l.precision).attr('d',path).append('title').text(l.label+' · '+precision[l.precision]+' · '+l.caption);});
    const fontScale=Math.min(3,900/Math.max(280,host.clientWidth)),labels=[];
    for(const [i,p] of stage.points.entries()){
     const [x,y]=projection(p.coordinates),g=group.append('g'),label=String(i+1),width=label.length*10*fontScale,height=18*fontScale;
     const candidates=[-12,22,-42,52,-72,82].flatMap(dy=>[12,-12-width/fontScale].map(dx=>({x:x+dx*fontScale,y:y+dy*fontScale})));
     const position=candidates.find(c=>c.x>12&&c.x+width<888&&c.y-height>12&&c.y<448&&!labels.some(r=>c.x<r.x+r.w+8&&c.x+width+8>r.x&&c.y-height<r.y+8&&c.y+8>r.y-r.h))||candidates[0];labels.push({...position,w:width,h:height});
     g.append('line').attr('x1',x).attr('y1',y).attr('x2',position.x+width/2).attr('y2',position.y-height/2).attr('class','royal-guide');
     g.append('circle').attr('cx',x).attr('cy',y).attr('r',3*fontScale).attr('class','royal-point').append('title').text(label+' · '+p.label+' · '+p.note);
     g.append('text').attr('x',position.x).attr('y',position.y).style('font-size',16*fontScale+'px').attr('class','royal-label').text(label).append('title').text(p.label+' · 见本侧地点等价列表');
    }
    if(stage.kind==='territory'&&!selected[side].length)host.append(el('p','本侧疆域尚未载入，暂只显示已就绪底图；阶段与来源见上方。','map-label'));
    svg.call(zoom).on('dblclick.zoom',null);views.push({svg,group});
   }
   const t=d3.zoomIdentity.translate(state.view.x,state.view.y).scale(state.view.k);for(const v of views){v.group.attr('transform',t);v.svg.property('__zoom',t);}
   tools.replaceChildren(button('放大两侧地图',()=>views[0].svg.call(zoom.scaleBy,1.5)),button('缩小两侧地图',()=>views[0].svg.call(zoom.scaleBy,1/1.5)),button('重置统一视野',()=>views[0].svg.call(zoom.transform,d3.zoomIdentity)));
   for(const [label,dx,dy] of [['向西平移',90,0],['向东平移',-90,0],['向北平移',0,60],['向南平移',0,-60]])tools.append(button(label,()=>views[0].svg.call(zoom.translateBy,dx/state.view.k,dy/state.view.k)));
  }
  const resized=()=>{if(current())paint();};window.addEventListener('resize',resized);disposeMap=()=>window.removeEventListener('resize',resized);
  paint();for(const key of ['land',...required])load(key);
 }
 async function route(){
  const token=++generation;disposeMap();disposeMap=()=>{};main.setAttribute('aria-busy','true');
  try{data=await fetchIndex();if(token!==generation)return;let state;try{state=E.parse(data,location.hash);}catch(error){main.replaceChildren(el('h1','无法打开这次对照'),el('p',error.message,'error'),link('打开116／117年专题','#preset=trajan-hadrian'));main.setAttribute('aria-busy','false');return;}render(state,token);if(!first)main.focus({preventScroll:true});first=false;}
  catch{if(token!==generation)return;main.replaceChildren(el('h1','地图阶段暂未载入'),el('p','可以重试，或先返回各卷阅读原地图与文字。'),button('重试地图阶段目录',route),link('返回五卷纪年','../'));main.setAttribute('aria-busy','false');}
 }
 document.querySelector('#theme-button').onclick=()=>{const theme=document.documentElement.dataset.theme==='dark'?'light':'dark';document.documentElement.dataset.theme=theme;try{localStorage.setItem('fasti-theme',theme);}catch{}};
 document.querySelector('.skip-link').onclick=e=>{e.preventDefault();main.focus();main.scrollIntoView({block:'start'});};
 window.addEventListener('hashchange',route);route();
})();
