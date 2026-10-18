import json,re,sys,hashlib
from republic_biographies import load_biographies, attach_biographies
from pathlib import Path
from opencc import OpenCC
cc=OpenCC('t2s')
R=Path(__file__).resolve().parent.parent
roster=json.loads((R/'data-source/republic/roster.json').read_text(encoding='utf-8'))
profiles=json.loads((R/'data-source/republic/profiles.json').read_text(encoding='utf-8'))
glossary=json.loads((R/'data-source/republic/name-glossary.json').read_text(encoding='utf-8'))
glossary.update({'Marius':'马略','Publicius':'普布利基乌斯','Aulius':'奥利乌斯','Opimius':'奥皮米乌斯','Lupus':'卢普斯','Mento':'门托','Coxo':'科克索','Pulcher':'普尔凯尔','Lentulus':'伦图卢斯','Decius':'德基乌斯','Pansa':'潘萨','Imp.':'统帅','Imperator':'统帅','Aventinensis':'阿文提嫩西斯','Tullus':'图卢斯','Mucianus':'穆基亚努斯','Dolabella':'多拉贝拉','Sextilius':'塞克斯提利乌斯','Antonius':'安东尼乌斯','Sophus':'索富斯','Saenius':'赛尼乌斯','E)squilinus':'埃斯奎利努斯'})
INITIAL={'L.':'Lucius','T.':'Titus','P.':'Publius','C.':'Gaius','Q.':'Quintus','Sp.':'Spurius','M.':'Marcus',"M'.":'Manius','Ser.':'Servius','Ap.':'Appius','A.':'Aulus','Cn.':'Gnaeus','Ti.':'Tiberius','K.':'Caeso','Mam.':'Mamercus','Sex.':'Sextus','D.':'Decimus','N.':'Numerius','Imp.':'Imperator'}
glossary.update({'Ahala':'阿哈拉','Ahenobarbus':'阿赫诺巴尔布斯','Bibulus':'比布鲁斯','Caepio':'凯皮奥','Carvilius':'卡尔维利乌斯','Celer':'凯勒尔','Cerco':'凯尔科','Curio':'库里奥','Fufius':'富菲乌斯','Hispallus':'希斯帕卢斯','Iuventius':'尤文提乌斯','Laelius':'莱利乌斯','Licinus':'李基努斯','Megellus':'梅盖卢斯','Merula':'梅鲁拉','Nerva':'涅尔瓦','Niger':'尼格尔','Papus':'帕普斯','Spurinus':'斯普里努斯','Tuscus':'图斯库斯','Varus':'瓦鲁斯','Verrucosus':'韦鲁科苏斯'})
def num(s):
 nums={'I':1,'V':5,'X':10};total=0;prev=0
 for c in s[::-1]:v=nums.get(c,0);total+=-v if v<prev else v;prev=max(prev,v)
 return total or 1
def latin(o):
 s=o['name'];note=''
 if s=='(Opiter Verginius? E)squilinus':
  s='Opiter Verginius Tricostus Esquilinus';note='补任者的名字在传世材料中残缺或有异读，此处采用常见复原。'
 if 'Carve(ntanus?)' in s:
  s='Carventanus';note='前名与氏族名残缺；铭文常复原为 Carventanus，亦有 Carvetus 的读法。文学来源多只记补任者米努基乌斯。'
 if 'sine collega' in s:note='初期为单独执政官，年内再增同僚。';s=s.replace('sine collega','')
 s=re.sub(r'Carve\s*\(ntanus\)','Carventanus',s)
 s=re.sub(r'\(E\)\s*squilinus','Esquilinus',s)
 alt=re.search(r'\(\s*or\s+([^)]*)\)',s)
 if alt:note+=' 名录保留 '+alt.group(1).strip()+' 的异读，正文采用主记录。'
 if '(?)' in s:note+=' 原名录对前名标有疑问，前名尚存异读。'
 if 'Carve(ntanus)' in s:note='铭文名字残缺，常复原为 Carventanus；亦有 Carvetus 的读法。';s=s.replace('Carve(ntanus)','Carventanus')
 s=s.replace('(E)squilinus','Esquilinus')
 extras=re.findall(r'\(([^)]*)\)',s)
 for ex in extras:
  if 'invalidated' in ex:note+=' 当选因选举或占卜程序问题被宣布无效，未正常就任。'
  elif 'before taking office' in ex:note+=' 当选后、正式就任前阵亡。'
  elif 'died' in ex or 'killed' in ex:note+=' 任内死亡。'
  elif 'sine collega' in ex:note+=' 初期为单独执政官，随后增补同僚。'
  elif 'Pontifex' in ex:note+=' 为便于区别同名人物，亦称“大祭司”斯凯沃拉。'
  elif any(w in ex for w in ['January','February','March','April','May','June','July','August','September','October','November','December']):
   months={'January':'1月','February':'2月','March':'3月','April':'4月','May':'5月','June':'6月','July':'7月','August':'8月','September':'9月','October':'10月','November':'11月','December':'12月'}
   n=ex
   for a,b in months.items():n=n.replace(a,b)
   n=n.replace('�C','至').replace('–','至').replace('from','自').replace('before','之前').replace('after','之后').replace('until','截至').replace('taking office','就任').replace('died','去世').replace('killed','阵亡').replace(' in the east','在东方')
   n=re.sub(r'(\d+) (\d+月)',r'\2\1日',n)
   note+=' 名录任期标注：'+n+'。'
 s=re.sub(r'\([^)]*\)','',s)
 term=re.search(r'\b([IVX]+)\b',s);count=num(term.group(1)) if term else 1
 s=re.sub(r'\b[IVX]+\b','',s);s=re.sub(r'\s+',' ',s).strip()
 words=s.split();words=[INITIAL.get(w,w) for w in words]
 if words:words=[w.replace('Junius','Iunius').replace('Julius','Iulius').replace('Juventius','Iuventius') for w in words]
 return ' '.join(words),count,note.strip()
missing=set();people={};years={};careers={}
for y in range(509,26,-1):
 r=roster[str(y)];yr={'year':y,'regime':r['regime'],'notes':r.get('notes',[])[:],'officers':[],'events':[],'sources':[]};years[str(y)]=yr
 for o in r['officers']:
  if o['name'].strip()=='sine collega':
   yr['notes'].append('恺撒在年初以无同僚执政官（sine collega）身份任职，年内再出现补任安排。');continue
  la,term,note=latin(o);title=o['title'];seen=set()
  while title in profiles['aliases'] and title not in seen:seen.add(title);title=profiles['aliases'][title]
  p=profiles['pages'].get(title,{})
  identity='page:'+title if o['url'] else 'entry:'+str(y)+':'+str(len(yr['officers']))+':'+la
  pid='p'+hashlib.sha1(identity.encode()).hexdigest()[:10]
  if pid not in people:
   zh='·'.join(glossary.get(w, w) for w in la.split())
   missing.update(w for w in la.split() if w not in glossary)
   # Use attested Chinese article titles when one exists; transliteration otherwise.
   zhsource=(p.get('langlinks') or [{}])[0].get('*')
   if zhsource:zh=cc.convert(zhsource);method='中文专条译名'
   else:method='按拉丁姓名词素规范音译'
   if title=='Augustus':la='Gaius Iulius Caesar Octavianus (Augustus)'
   if title=='Marcus Vipsanius Agrippa':la='Marcus Vipsanius Agrippa'
   zh=re.sub(r'\s*[（(](?:公元|西元)?前.*[）)]$','',zh)
   people[pid]={'latin':la,'zh':zh,'nameMethod':method,'url':o['url'] or 'https://en.wikipedia.org/wiki/List_of_Roman_consuls','wikiTitle':title,'bio':'','identified':bool(o['url']) and ' gens' not in title}
  yr['officers'].append({'person':pid,'role':o['role'],'term':term,'note':note})
  careers.setdefault(pid,[]).append({'year':y,'role':o['role'],'term':term})
 for key in ['sourceNotes']:
  for n in r.get(key,[]):
   if 'invalidat' in n.lower() and not any('无效' in v for v in yr['notes']):yr['notes'].append('该年部分当选者的选举被宣告无效，已保留其名录记录并与正常任职区分。')
   if 'omitted by Livy' in n and not any('遗漏' in v for v in yr['notes']):yr['notes'].append('李维的叙事遗漏该年的部分官员，名单依据其他名录与现代汇编补足。')
   if 'only lists five' in n:yr['notes'].append('古代作者对军事保民官人数存在分歧，名录列出有传世记载的成员。')
   if 'eight consular tribunes' in n:yr['notes'].append('李维记八名军事保民官，而其他传统人数不同；名录保留可辨识的任职记录。')
def source(label,url):return {'label':label,'url':url}
def attach_events(path):
 if not path.exists():return
 for row in path.read_text(encoding='utf-8').splitlines():
  if not row or row.startswith('#'):continue
  y,title,description,category,ref=row.split('|',4);y=int(y)
  if ref.isdigit():sources=[source('李维《建城以来史》第'+ref+'卷','https://en.wikisource.org/wiki/From_the_Founding_of_the_City/Book_'+ref)]
  else:
   sources=[source('Attalus 年度史料索引',f'https://www.attalus.org/bc{(y-1)//100+1}/year{y}.html')]
   if y<30:sources=[source('卡西乌斯·狄奥《罗马史》',f'https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cassius_Dio/{51 if y==29 else 53}*.html')]
  certainty='编年记载' if y<300 else '传统编年'
  if any(w in category for w in ['争议','存疑']):certainty='年代或记载有争议'
  elif '编年线索' in category:certainty='编年线索'
  elif '传统叙事' in category:certainty='古代叙事 · 含传说成分'
  years[str(y)]['events'].append({'title':title,'description':description,'category':category,'certainty':certainty,'sources':sources})
attach_events(R/'data-source/republic/events.tsv')
special={509:'传统记载第一年共有五位执政官；辞职、战死、短期任职与补任依来源分别记录。首任顺序在波利比乌斯、李维与其他传统之间存在分歧。',451:'原有两位执政官记录与随后第一届十人委员会并列。古代来源对二人是否先实际就任执政官或仅当选便转任有分歧。同一人先后担任不同官职，名录按职务分别列出。',450:'第二届十人委员会掌握最高权力，本年没有通常的双执政官任职。',444:'三名军事保民官的任职因程序问题终止，随后选出补任执政官。',403:'李维列八位军事保民官，狄奥多罗斯等来源人数不同；部分人可能实为当年监察官，任职识别存在争议。',52:'庞培先以“无同僚执政官”身份上任，年内梅特鲁斯·西庇阿成为同僚。',43:'两位年初执政官希尔提乌斯与潘萨在穆提纳战役及其后死亡，屋大维与佩迪乌斯随后补任，年末再有补任。',27:'屋大维在本年获得“奥古斯都”称号，通常以此作为共和国与元首制的分界；执政官官职继续存在。'}
for y,n in special.items():years[str(y)]['notes'].insert(0,n)
for y,r in years.items():
 r['sources']=[source('执政官与特殊官职名录','https://en.wikipedia.org/wiki/List_of_Roman_consuls')]
 for e in r['events']:
  for s in e['sources']:
   if s not in r['sources']:r['sources'].append(s)
 if 31<=int(y)<=99:r['sources'].append(source('Broughton《罗马共和国官员》卷二（数字化稿）','https://www.attalus.org/info/mrr2.pdf'))
office_notes={
 509:{'Lucius Iunius Brutus':'传统记载任内战死。','Lucius Tarquinius Collatinus':'在反王室政治压力下辞职并离开罗马。','Spurius Lucretius Tricipitinus':'传统记载补任后仅短期任职便去世。'},
 478:{'Gaius Servilius Structus Ahala':'传统记载任内死亡，由补任者接替。'},
 444:{'Aulus Sempronius Atratinus':'因占卜程序问题与同僚一同辞职。','Lucius Atilius Luscus':'因占卜程序问题与同僚一同辞职。','Titus Cloelius Siculus':'因占卜程序问题与同僚一同辞职。'},
 362:{'Lucius Genucius Aventinensis':'在对赫尔尼基人的战争中阵亡。'},
 349:{'Appius Claudius Crassus Inregillensis':'任职后不久死亡，未举行通常的补任选举。'},
 340:{'Publius Decius Mus':'传统称其在拉丁战争中举行献身仪式并战死。'},
 295:{'Publius Decius Mus':'传统称其在森提努姆战役中献身并战死。'},
 284:{'Lucius Caecilius Metellus Denter':'在阿雷提乌姆附近战败身亡；其死亡究竟在执政官任期内还是续任时，古代编年与现代研究有分歧。'},
 225:{'Gaius Atilius Regulus':'在特拉蒙战役中阵亡。'},
 217:{'Gaius Flaminius':'在特拉西梅诺湖战役中阵亡。'},
 216:{'Lucius Aemilius Paullus':'在坎尼战役中阵亡。'},
 208:{'Marcus Claudius Marcellus':'任内遭汉尼拔军伏击战死。','Titus Quinctius Crispinus':'与同僚遭伏击，随后因伤死亡。'},
 180:{'Gaius Calpurnius Piso':'任内因疫病去世，随后产生补任者。'},
 176:{'Gnaeus Cornelius Scipio Hispallus':'任内去世，由莱维努斯补任。','Quintus Petillius Spurinus':'在利古里亚战事中阵亡。'},
 162:{'Publius Cornelius Scipio Nasica Corculum':'因选举占卜程序不合法，与同僚辞职。','Gaius Marcius Figulus':'因选举占卜程序不合法，与同僚辞职。'},
 154:{'Lucius Postumius Albinus':'任内死亡，随后产生补任者。李维的梗概另记其妻因毒杀丈夫的指控受到审判。'},
 152:{'Lucius Valerius Flaccus':'任内死亡，随后产生补任者。'},
 111:{'Publius Cornelius Scipio Nasica':'任内去世。'},
 107:{'Lucius Cassius Longinus':'在高卢与提古里尼人的战斗中阵亡。'},
 90:{'Publius Rutilius Lupus':'在同盟者战争的托莱努斯河战斗中阵亡。'},
 87:{'Gnaeus Octavius':'秦纳与马略占领罗马后被杀。'},
 86:{'Gaius Marius':'年初开始第七任执政官后不久去世。'},
 84:{'Lucius Cornelius Cinna':'在安科纳兵变中被杀，卡尔博随后单独任职。'},
 68:{'Lucius Caecilius Metellus':'就任后不久死亡；其补任者也在就任后死亡。'},
 52:{'Gnaeus Pompeius Magnus':'先以无同僚执政官身份任职，年内增加西庇阿为同僚。'},
 44:{'Gaius Iulius Caesar':'三月十五日在元老院遇刺身亡。'},
 43:{'Gaius Vibius Pansa Caetronianus':'穆提纳战事中受伤，随后于任内死亡。','Aulus Hirtius':'在穆提纳战斗中阵亡。','Quintus Pedius':'年末去世，再由新的补任执政官接替。'},
 32:{'Gnaeus Domitius Ahenobarbus':'离开罗马加入安东尼阵营。','Gaius Sosius':'离开罗马加入安东尼阵营。'},
 31:{'Marcus Antonius':'原定执政官资格被撤销，年初由麦萨拉补任。'}
}
for y,notes in office_notes.items():
 for o in years[str(y)]['officers']:
  la=people[o['person']]['latin']
  if la in notes:o['note']=(o['note']+' '+notes[la]).strip()
authored=load_biographies(R/'data-source/republic',people)
attach_biographies(people,careers,authored)
missingevents=[y for y,r in years.items() if not r['events']]
if '--preview' in sys.argv:
 for y in missingevents:years[y]['events']=[{'title':'档案正在整理','description':'此条仅用于本地构建预览。','category':'整理中','certainty':'未发布','sources':[]}]
else:
 if missingevents:raise ValueError('Missing annual events: '+str(missingevents))
 if missing:raise ValueError('Missing translations: '+str(sorted(missing)))
stats={'years':len(years),'people':len(people),'appointments':sum(len(y['officers']) for y in years.values()),'biographies':sum(p['bioStatus']=='authored' for p in people.values()),'officeSummaries':len(people),'insufficientBiographies':sum(p['bioStatus']=='insufficient' for p in people.values()),'events':sum(len(y['events']) for y in years.values())}
method=[
 {'title':'完整纪年，特殊年份单独处理','html':'覆盖前509年至前27年，共483个传统年度。以依据 T. R. S. Broughton《The Magistrates of the Roman Republic》整理的<a href="https://en.wikipedia.org/wiki/List_of_Roman_consuls" target="_blank" rel="noopener">传世官员汇总名录</a>为入口，晚期另对照<a href="https://www.attalus.org/info/mrr2.pdf" target="_blank" rel="noopener">卷二数字化稿</a>。正任、补任、十人委员会、军事保民官、最高官职空缺与四个“独裁官年”分别记录。各年度保留相应的来源与任职说明。'},
 {'title':'中文译名与拉丁姓名','html':'有中文专条或通行译名的人物优先采用其已有名称，其他名字按拉丁人名词素统一音译；每张卡片标明方式。拉丁文展开标准前名缩写，并把 Junius / Julius 等现代写法规范为 Iunius / Iulius。谱系、同名者和残缺铭文仍以来源的身份区分。未链接人物专条的同名记录按年度保留独立身份，方便继续校订。音译表随数据开源，便于逐词校订。'},
 {'title':'年度记事与人物简介','html':'选取战争、立法、公民权、土地与债务、殖民、重大公共危机、宗教及文化建设。早期对照<a href="https://en.wikisource.org/wiki/From_the_Founding_of_the_City" target="_blank" rel="noopener">李维《建城以来史》</a>；前324年至前30年主要使用<a href="https://www.attalus.org/" target="_blank" rel="noopener">Attalus 的古代来源与现代研究索引</a>。每条为中文重述并附出处。记载简略的年份按编年线索介绍前后局势。人物简介按明确身份与来源逐条收录，所有已编写且匹配的简介均保留。任职记录摘要由本数据库的任职生成，单独展示；身份尚待考订的条目标明资料不足。原稿人物专条链接沿用既有资料入口，本次迁移未重新逐条核读正文。'},
 {'title':'十个历史剧本','html':'每个剧本从一场具体局势出发，以人物、政治选择和连续年份串起叙事。共十个开局、59章，涵盖成文法、同盟动员、行省经济、流亡者政治与海上粮道。各章附李维、普鲁塔克、阿庇安、狄奥多罗斯等古代作者或铭文出处，年代异说列在相应节点。剧本正文与年度档案相互连接，可跳章阅读，也可逐年查看中间的变化。'},
 {'title':'精细轮廓的历史地图','html':'疆域使用<a href="https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.0" target="_blank" rel="noopener">Cliopatria v0.2.0 / Seshat</a>的历史 GIS 重建，参见<a href="https://www.nature.com/articles/s41597-025-04516-9" target="_blank" rel="noopener">数据论文</a>。沿<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth 1:50m 海岸线</a>裁切，生成可缩放的连续涂色图。前509—338年的五个阶段使用本项目依史事节点绘制的近似示意，虚线标出边界的不确定性；前337年起使用上述GIS重建。共56个阶段，各图列出时段和来源。地方条约、盟邦和军事进展见年度记事。'},
 {'title':'传统年代与史料距离','html':'采用瓦罗纪年，建城纪年按 AUC = 754 − BC 年份换算。高卢洗劫罗马等事件在现代对照纪年中可能有数年差异，早期英雄故事含后世道德塑造。理解早期罗马可进一步参阅 Gary Forsythe《A Critical History of Early Rome》、T. J. Cornell《The Beginnings of Rome》以及《剑桥古代史》第七卷第二部分。'},
 {'title':'开源与署名','html':'网站代码采用 MIT；由维基百科名录整理、译写的数据按 CC BY-SA 4.0 提供，历史 GIS 数据为 CC BY 4.0，Natural Earth 底图为公有领域。各条目保留来源链接，依赖和字体许可证详见仓库 THIRD_PARTY.md。<a href="https://github.com/kaloioannes/roman-fasti" target="_blank" rel="noopener">查看公共仓库</a>。'}
]
out={'schemaVersion':2,'version':'1.1.0','stats':stats,'method':method,'years':years,'people':people}
(R/'data/republic/records.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8',newline='\n')
print(json.dumps(stats));print('untranslated',sorted(missing));print('missing events',len(missingevents))

# Curated narrative routes are authored separately from the annual records.
stories=json.loads((R/'data-source/republic/stories.json').read_text(encoding='utf-8'))
(R/'data/republic/stories.json').write_text(json.dumps(stories,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
