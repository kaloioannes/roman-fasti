# 双帝国时期：范围、证据与编辑口径

本卷覆盖395—476年，含首尾82年。收录33位人物、41段称号阶段、120条独立年度记事；人物数包括共帝、争位者、帝号有争议者与选录恺撒，不能当作正式主帝人数。中文叙述为本项目重新撰写，资料核对日期2026-10-18。

## 可编辑资料与重建

| 文件 | 职责 |
|---|---|
| `people.json` | 中拉文姓名、希腊文检索形式、传记、家族、承认关系与任期 |
| `events.json` | 每条独立事件的稳定ID、年份、东西归属、叙述、纪年确定性、来源与定位 |
| `vacancies.json` | 西部宫廷空缺、东方短暂继承间隔和476年意大利宫廷终结 |
| `sources.json` | 实际对读的公开材料入口与各自局限 |
| `dynasties.json` | 王朝、家族联系与非世袭推举的分类 |
| `method.json` | 网站中直接展示的收录方法、排除对象和争议取舍 |
| `places.json` | 相关城市现代坐标约值，不能用作本年主权证据 |
| `territories.geojson` | 固定版本Cliopatria东西部原始图层子集，原属性和几何保留 |

`python scripts/build_divided_empire.py` 仅依赖Python标准库，不访问网络，输出`data/divided-empire/{records,places}.json`。修改源JSON后应重建并一同提交。`node scripts/validate-divided-empire.mjs` 检查年度连续、人物引用、角色、来源、日期精度、独立事件及若干外部历史事实断言；`npm run test:divided-empire` 测试实际发布包中的全部年度与人物页面。

## 为什么不是每年只列两个名字

395年两位皇子都已是奥古斯都，父亲1月17日以前仍是共同资深皇帝。402年狄奥多西二世已有共帝号，408年后才独掌东方宫廷。421年霍诺里乌斯与君士坦提乌斯三世共治；474年东部则包含先帝、幼帝及其父亲的共治和继承。年度成员采用任期与年度相交，交接日两段可以重合，同一人的角色变化不算两个人。

任期字段：`side`为`west/east/both`；`kind`为`central/junior/rival/exile/caesar/disputed/senior`。`central`表示实际控制主要宫廷，不隐含对方承认。`recognition`单独描述承认情况，`territory`描述政治据点与控制范围；这些都是有来源的文字判断，不是自动从地图计算。

因此约翰尼斯、塞维鲁斯、格利凯里乌斯、罗慕路斯仍可进入意大利实际宫廷主栏；409年曾获霍诺里乌斯暂时承认的君士坦丁三世则保留在高卢争位栏并注明承认。塞巴斯提安、君士坦斯二世的共帝身份属于其父兄的对立阵营，不是意大利宫廷的伙伴。

尼波斯475年失去意大利，仍在达尔马提亚保有东部承认的西帝号直到480年。芝诺475—476年失去首都，也未放弃帝号，两次实际在位与中间流亡主张分开。流亡任期的真实终点可超出本卷476年边界，但年度只展开到476年。

### 空位不是资料缺口

466年意大利没有另设奥古斯都，里西默也没有因此成为皇帝。用已证实的宫廷空缺解释当年政治，优于硬填一位统治者。其他短暂继承间隔也单列；此处的“空缺”通常指该宫廷未另立奥古斯都，不等于整个罗马世界没有皇帝。475年8—10月间只是意大利尚未立新帝，尼波斯的帝号仍在。

## 证据层级与已读范围

1. **古代材料**：马尔凯利努斯《编年史》的Mommsen拉丁文转录、海达提乌斯《编年史》的公开拉丁文本、苏格拉底《教会史》VI—VII的十九世纪英译，以及《狄奥多西法典》I的拉丁文。编年条目以执政官年、文内关键词或章号定位。没有声称校勘全部手稿。
2. **叙事交叉核对**：Bury《晚期罗马帝国史》1923年版卷I的V—XII章中有关段落。网站把V章分为5A、5B、5C三个网页，不能把只含金口约翰的5B误当成斯提利科最后数年的出处。引用目录明确区分这三页。
3. **现代署名研究**：DIR的Hugh Elton、Geoffrey Nathan、Ralph Mathisen等署名人物研究。用于核对基本任期和争议，尤其是塞维鲁斯、格利凯里乌斯、尼波斯与罗慕路斯的日期和承认关系。不转载现代条目全文。

本卷没有将未实际取得的现代专著列成“已读”书单。Bury距今已久，其民族性格、宗教与文明衰亡论判断不直接继承；现代研究入口也不自动压倒原始证据。中文资料是可继续修订的研究性整理，并非最终的帝位合法性裁定。

马尔凯利努斯偏向首都和迦克墩立场，某些事有错年：金口约翰的第二次流放、阿提拉的死亡等不能机械套用其年度桶。海达提乌斯对伊比利亚更密集，末世观与灾亡数字也需区分。苏格拉底记录的希帕提娅遇害与主教下令的推断不是同一证据强度。事件中保留了这些限定。

## 年度记事与确定性

82年每年均有独立写作的事件和来源，没有用同一段“皇帝仍在位”背景自动填充。年度不要求东西各凭空凑一件“大事”：史料较少的年份，收录供水、浴场、法律、城市访问、外交或灾害等可定位记录。事件用`side`区分西部、东部与跨两部，用户可以筛选。

“纪年明确”指通常纪年；“编年史定位”只表示该作者明确将其放入这个执政官年，尚未承诺独立考古证实。约年、跨年行动与具体日期的异说直接展示。一次跨年事件只有描述某个可区分阶段时才可用于不同年度，不能重复一段背景。

### 日期保守取舍

- `start/end`用于年度展开，`startDate/endDate`各含`value/precision/label`。精度为年、月或日；展示标签还能表达“约409/410年”与确日异说。年度端点只是成员范围，不表示1月1日或12月31日在位。
- 马约里安457年4月拥立与12月确认帝号分开；461年8月2日被废与8月7日被杀分开。
- 塞维鲁斯卒年465，8月15日与11月14日说均有疑问；DIR指出9月25日尚有署其名法律，但也可能是死后颁行。因此终点只取年。
- 格利凯里乌斯473年3月3日/5日并见年表，取月精度；尼波斯入主罗马有6月19日/24日说，本卷以通常采用的24日为工作纪年并附异说来源。
- 尼波斯480年死讯有4月25日、5月9日、6月22日三种纪年，流亡任期只取480年。
- 利奥一世卒日取现代DIR的474年1月18日；Bury旧文的2月3日不采用。芝诺共帝号取2月9日。利奥二世11月卒日有疑，不强设17日。
- 罗慕路斯退位采用常用工作纪年476年9月4日；古代叙事只能支持当日前后。遣使东方与徽号交还存在476/477年安排差异，不能假设与退位同日完成。
- 莱茵渡河采用406年传统纪年并保留405年说；阿提拉死亡采用453年，不照搬马尔凯利努斯的454年。

## 人物与姓名

人物卡片直接在中文名下显示拉丁文名号，保留HTML语言属性；档案另列有确证的希腊文检索形式。拉丁文名号不表示人物的日常母语。少见人物未确证的希腊文形式不自动音译造字。

“利奥皇室及其姻亲”是一类联系，不意味着安提米乌斯是利奥直系后裔；他通过马尔基安的女儿进入东方皇室网络。斯提利科、埃提乌斯、里西默、贡多巴德、奥雷斯特斯、奥多亚克都不是本卷皇帝；普尔刻里娅、普拉西狄娅的重要政治作用保留在叙述中，不将Augusta机械等同Augustus。赫拉克利安的叛乱有据，但帝号证据不充分，故单列有争议身份。

## 验证范围

发布包测试遍历根路径和`/roman-republic-fasti/`子路径的82个年度、33个人物，检查承认说明与来源、东西分栏、466年空缺、475—476年流亡、筛选状态、CSV/JSON、错误地址、数据/地图独立恢复、320/390/768/1440宽度及明暗主题。特定历史断言独立写在校验器中，不仅比较构建器与自身输出。

地图方法和逐年出处矩阵见下文；许可证沿用仓库的文字CC BY-SA 4.0、代码MIT及相应地理数据许可。


## 地图来源与变换

原始 `territories.geojson` 选自Cliopatria / Seshat **v0.2.0**，固定提交`ad28a691b7c07c1fca89d0e0636d324667d2a258`，仅取名称为Eastern Roman Empire或Western Roman Empire、类型为POLITY且与395—476年相交的31个要素，原始属性和几何不改写。获取入口是该提交的`cliopatria.geojson.zip`；不以最新主分支取代固定版本。

`python scripts/build_divided_empire_map.py` 使用Shapely，复用现有帝国篇的Natural Earth 1:50m陆地重建函数，裁切至海岸、以.008度保拓扑简化并调整D3外环方向；东西部分色。显示时间裁切到本卷，`sourceProperties`保留完整源年份。文字重建不依赖Shapely，普通站点构建直接使用已提交的派生JSON。

源西部图层止于475年，东部末段为469—489年。**476年西部没有独立源要素**：额外的第32层只借用469—475年西部轮廓作退位前参考，显式设置`approximate=true`、`referenceYear=475`，图注保留这些信息，不把它说成476年调查或9月后的意大利帝国。它也不等同尼波斯流亡宫廷的有效统治范围。

图层不区分同一部内的主帝、争位者与地方将领，不表示每座城当年的主权。城市色点只是叙事归属。政治控制或承认关系以任期与事件为准，不能从底图自动推断。

| 归属 | 源起年 | 源止年 |
|---|---|---|
| 东部 | 395 | 395 |
| 西部 | 395 | 395 |
| 西部 | 396 | 401 |
| 东部 | 396 | 396 |
| 东部 | 397 | 401 |
| 东部 | 402 | 406 |
| 西部 | 402 | 406 |
| 西部 | 407 | 409 |
| 东部 | 407 | 438 |
| 西部 | 410 | 413 |
| 西部 | 414 | 416 |
| 西部 | 417 | 425 |
| 西部 | 426 | 438 |
| 西部 | 439 | 440 |
| 东部 | 439 | 440 |
| 西部 | 441 | 442 |
| 东部 | 441 | 442 |
| 西部 | 443 | 450 |
| 东部 | 443 | 450 |
| 西部 | 451 | 451 |
| 东部 | 451 | 451 |
| 东部 | 452 | 454 |
| 西部 | 452 | 454 |
| 西部 | 455 | 457 |
| 东部 | 455 | 458 |
| 西部 | 458 | 458 |
| 东部 | 459 | 468 |
| 西部 | 459 | 461 |
| 西部 | 462 | 468 |
| 西部 | 469 | 475 |
| 东部 | 469 | 489 |

## 逐年出处矩阵

下表对应`events.json`的全部120条记录。完整叙述和纪年确定性保留在JSON及网页；下表用于核查年度覆盖及查找原文。

| 年份 | 范围 | 事件 | 定位 | 来源ID（见sources.json） |
|---|---|---|---|---|
| 395 | 跨两部 | 两座宫廷承接狄奥多西的遗产 | Bury I.V；Marcellinus s.a.395.1–3 | bury-5A, marcellinus |
| 395 | 东部 | 鲁菲努斯在首都城外被杀 | Bury I.V §1；Marcellinus s.a.395.4–5 | bury-5A, marcellinus |
| 396 | 东部 | 阿拉里克军队进入希腊 | Bury I.V §2，Alaric in Greece段 | bury-5A |
| 397 | 西部 | 吉尔多与意大利宫廷决裂 | Bury I.V，revolt of Gildo段 | bury-5A |
| 398 | 西部 | 吉尔多的非洲政权败亡 | Bury I.V；Marcellinus s.a.398.4 | bury-5A, marcellinus |
| 398 | 东部 | 金口约翰成为君士坦丁堡主教 | Marcellinus s.a.398.3；Socrates VI.2–3 | marcellinus, socrates-6, bury-5B |
| 399 | 东部 | 欧特罗皮乌斯由执政官跌落权力中心 | Bury I.V §4，Eutropius与Tribigild段 | bury-5A |
| 400 | 东部 | 盖纳斯势力被逐出君士坦丁堡 | Bury I.V；Marcellinus s.a.399–401（部分事件提前错置） | bury-5A, marcellinus |
| 401 | 西部 | 阿拉里克首次入侵意大利 | Bury I.V，first invasion of Italy段 | bury-5C |
| 401 | 东部 | 狄奥多西二世出生 | Marcellinus s.a.401.3；DIR Theodosius II，Early Life | marcellinus, dir-theodosius |
| 402 | 西部 | 波伦提亚交战与宫廷迁往拉文纳 | Bury I.V，Pollentia及Ravenna段 | bury-5C |
| 402 | 东部 | 婴儿皇子成为奥古斯都 | DIR Theodosius II，Early Life；Marcellinus s.a.402.2 | dir-theodosius, marcellinus |
| 403 | 东部 | 橡树会议罢黜金口约翰 | Socrates VI.15–16；Bury I.V | socrates-6, bury-5A, bury-5B |
| 404 | 东部 | 约翰再度流放，首都教堂遭火灾 | Socrates VI.18–19；Marcellinus s.a.404 | socrates-6, marcellinus, bury-5B |
| 405 | 东部 | 伊苏里亚武装扰动托罗斯山区 | Marcellinus s.a.405 | marcellinus |
| 406 | 西部 | 拉达盖苏斯军队在意大利败亡 | Bury I.V；Marcellinus s.a.406.2–3 | bury-5C, marcellinus |
| 406 | 西部 | 莱茵防线遭突破 | Bury I.VI及注36 | bury-6 |
| 407 | 西部 | 君士坦丁三世从不列颠渡海 | DIR Constantine III；Bury I.VI | dir-westemp, bury-6 |
| 407 | 东部 | 首都广场下修建大型蓄水设施 | Marcellinus s.a.407 | marcellinus |
| 408 | 西部 | 斯提利科被处死，阿拉里克围困罗马 | Bury I.V、VI §1 | bury-5C, bury-6 |
| 408 | 东部 | 阿卡狄乌斯去世，幼帝独掌东部宫廷 | Socrates VII.1；Marcellinus s.a.408.3 | socrates-7, marcellinus |
| 409 | 西部 | 罗马另立阿塔卢斯，西班牙出现多方争位 | Bury I.VI；Hydatius Hispanias ingressi条 | bury-6, hydatius |
| 409 | 东部 | 君士坦丁堡因粮食不足发生骚动 | Marcellinus s.a.409 | marcellinus |
| 410 | 西部 | 阿拉里克军队劫掠罗马 | Bury I.VI；Hydatius Alaricus Romam ingressus条 | bury-6, hydatius |
| 411 | 西部 | 阿尔勒陷落，君士坦丁三世政权终结 | Bury I.VI；Hydatius Constantinus、Jovinus条 | bury-6, hydatius |
| 412 | 西部 | 阿陶尔夫率哥特人进入高卢 | Bury I.VI；DIR Jovinus、Sebastianus | bury-6, dir-westemp |
| 413 | 西部 | 约维努斯与赫拉克利安相继失败 | Bury I.VI；Hydatius Jovinus、Heraclianus条 | bury-6, hydatius |
| 413 | 东部 | 狄奥多西城墙完成重要防御阶段 | DIR Theodosius II；Bury I.VII，walls段 | dir-theodosius, bury-7 |
| 414 | 西部 | 阿陶尔夫与普拉西狄娅在纳尔榜成婚 | Bury I.VI；Hydatius Ataulfus Placidiam条 | bury-6, hydatius |
| 414 | 东部 | 普尔刻里娅获奥古斯塔称号 | Marcellinus s.a.414.1；Socrates VII.22 | marcellinus, socrates-7 |
| 415 | 西部 | 阿陶尔夫在巴塞罗那被杀 | Bury I.VI；Hydatius Ataulfus、Vallia条 | bury-6, hydatius |
| 415 | 东部 | 希帕提娅在亚历山大里亚遭杀害 | Socrates VII.13–15 | socrates-7 |
| 416 | 西部 | 瓦利亚与罗马达成协议，归还普拉西狄娅 | Bury I.VI；Hydatius Valia pacem、Placidia redditur条 | bury-6, hydatius |
| 417 | 西部 | 君士坦提乌斯与普拉西狄娅结婚 | Bury I.VI；DIR Constantius III | bury-6, dir-westemp |
| 418 | 西部 | 哥特人在阿基坦获得安置 | Bury I.VI，settlement in Aquitaine段 | bury-6 |
| 419 | 西部 | 瓦伦提尼安三世出生 | DIR Constantius III；Bury I.VIII | dir-westemp, bury-8 |
| 420 | 西部 | 阿斯特里乌斯迫使汪达尔人撤离加利西亚 | Hydatius Asterius、Vandali Baeticam条；Bury I.VI | hydatius, bury-6 |
| 421 | 西部 | 君士坦提乌斯三世短暂共治 | DIR Constantius III；Bury I.VI | dir-westemp, bury-6 |
| 421 | 东部 | 皇帝迎娶欧多琪娅，并与波斯开战 | Socrates VII.21、28–29；Marcellinus s.a.421 | socrates-7, marcellinus |
| 422 | 西部 | 卡斯提努斯在西班牙对汪达尔作战失败 | Hydatius Castinus、Maximus条；Bury I.VI | hydatius, bury-6 |
| 422 | 东部 | 与萨珊波斯议和 | Socrates VII.20、29；Marcellinus s.a.422.4 | socrates-7, marcellinus |
| 423 | 西部 | 霍诺里乌斯死后，约翰尼斯获得推举 | Bury I.VII §3；DIR Johannes | bury-7, dir-westemp |
| 424 | 跨两部 | 东部立瓦伦提尼安为恺撒，准备介入意大利 | Bury I.VII §3；Marcellinus s.a.424 | bury-7, marcellinus |
| 425 | 跨两部 | 东部军队推翻约翰尼斯 | Bury I.VII §3；Socrates VII.23–24 | bury-7, socrates-7 |
| 425 | 东部 | 君士坦丁堡设立官办讲席 | Bury I.VII §5，university及CTh XIV.9.3段 | bury-7 |
| 426 | 西部 | 《引证法》整理法学权威的引用规则 | Codex Theodosianus 1.4.3，426年11月6日，拉文纳 | cth-1 |
| 427 | 西部 | 博尼法提乌斯与拉文纳公开对抗 | Bury I.VIII及Boniface邀请说的注释 | bury-8 |
| 427 | 东部 | 狄奥多西浴场落成 | Marcellinus s.a.427.2 | marcellinus |
| 428 | 东部 | 涅斯托里乌斯出任首都主教 | Socrates VII.29–32；Marcellinus s.a.428.1 | socrates-7, marcellinus |
| 429 | 西部 | 汪达尔集团渡入北非 | Hydatius Gaisericus Africam条；Bury I.VIII | hydatius, bury-8 |
| 429 | 东部 | 开始编纂帝国法令集 | Bury I.VII §5，commission of429段 | bury-7 |
| 430 | 西部 | 希波受围，奥古斯丁去世 | Bury I.VIII；Hydatius Augustinus条 | bury-8, hydatius |
| 431 | 东部 | 以弗所会议与涅斯托里乌斯失位 | Socrates VII.34；Bury I.XI §1 | socrates-7, bury-11 |
| 432 | 西部 | 博尼法提乌斯与埃提乌斯交战 | Bury I.VIII；Marcellinus s.a.432.2–3 | bury-8, marcellinus |
| 433 | 西部 | 埃提乌斯重返意大利并取得优势 | Bury I.VIII，Aetius return段 | bury-8 |
| 433 | 东部 | 基里尔与安条克的约翰达成和解 | Bury I.XI §1，reconciliation of433段 | bury-11 |
| 434 | 跨两部 | 匈人统治权转入阿提拉与布莱达 | Bury I.IX，Rugila及Attila accession段 | bury-9 |
| 435 | 西部 | 罗马与汪达尔人订立协议 | Bury I.VIII；Hydatius pax cum Vandalis条 | bury-8, hydatius |
| 435 | 东部 | 东部重组法典编纂委员会 | Bury I.VII §5，commission of435段 | bury-7 |
| 436 | 西部 | 莱茵勃艮第势力遭重创 | Bury I.VIII，Burgundians及Gundahar段 | bury-8 |
| 436 | 东部 | 狄奥多西二世海访基齐库斯 | Marcellinus s.a.436 | marcellinus |
| 437 | 跨两部 | 瓦伦提尼安三世在君士坦丁堡成婚 | Marcellinus s.a.437；Bury I.VIII | marcellinus, bury-8 |
| 438 | 跨两部 | 《狄奥多西法典》公布并传入西部 | Bury I.VII §5，publication及Roman Senate段 | bury-7 |
| 438 | 东部 | 金口约翰遗骨迎回首都 | Socrates VII.45；Marcellinus s.a.438.2 | socrates-7, marcellinus |
| 439 | 西部 | 迦太基落入盖萨里克之手 | Hydatius Carthagine fraude decepta条；Marcellinus s.a.439.3；Bury I.VIII §4 | hydatius, marcellinus, bury-8 |
| 439 | 西部 | 利托里乌斯在图卢兹战败 | Hydatius Litorius条；Bury I.VIII | hydatius, bury-8 |
| 440 | 西部 | 汪达尔舰队袭扰西西里 | Hydatius Siciliam、Panormum条；Bury I.VIII §4 | hydatius, bury-8 |
| 441 | 跨两部 | 东方援非洲舰队因多线危机撤回 | Bury I.VIII §4、IX §2，东方舰队自西西里撤回段 | bury-8, bury-9 |
| 441 | 东部 | 匈人攻入巴尔干 | Bury I.IX；Marcellinus s.a.441.3 | bury-9, marcellinus |
| 442 | 西部 | 非洲新条约承认汪达尔的核心领地 | Bury I.VIII §4，treaty of442段 | bury-8 |
| 443 | 东部 | 阿提拉迫使东部接受更沉重条件 | Bury I.IX，peace terms of443段 | bury-9 |
| 443 | 西部 | 勃艮第人安置于萨保迪亚 | Bury I.VIII，Sapaudia段 | bury-8 |
| 444 | 东部 | 比提尼亚洪灾进入首都编年记录 | Marcellinus s.a.444.3 | marcellinus |
| 445 | 东部 | 布莱达死亡，阿提拉独掌匈人集团 | Marcellinus s.a.445.1；Bury I.IX | marcellinus, bury-9 |
| 446 | 东部 | 首都发生饥荒与疫病 | Marcellinus s.a.446 | marcellinus |
| 447 | 东部 | 地震、修墙与匈人进攻叠加 | Bury I.IX；Marcellinus s.a.447 | bury-9, marcellinus |
| 448 | 东部 | 阿提拉使者索取约定款项 | Marcellinus s.a.448.3 | marcellinus |
| 449 | 东部 | 普里斯库斯随使团前往阿提拉宫廷 | Bury I.IX，embassy of Maximin与Priscus段 | bury-9 |
| 449 | 东部 | 第二次以弗所会议引发新冲突 | Bury I.XI §1；Marcellinus s.a.449.2 | bury-11, marcellinus |
| 450 | 东部 | 狄奥多西二世死，马尔基安继位 | Bury I.VII；Marcellinus s.a.450 | bury-7, marcellinus |
| 451 | 西部 | 沙隆一带的联军阻挡阿提拉 | Bury I.IX，battle of the Catalaunian Plains段 | bury-9 |
| 451 | 东部 | 迦克墩会议确立新的教义表述 | Bury I.VII；Marcellinus s.a.451 | bury-7, marcellinus |
| 452 | 西部 | 阿提拉进入意大利，阿奎莱亚陷落 | Bury I.IX；Marcellinus s.a.452.3 | bury-9, marcellinus |
| 452 | 东部 | 执政官庆典资金转用于供水修复 | Marcellinus s.a.452.1 | marcellinus |
| 453 | 跨两部 | 阿提拉与普尔刻里娅先后去世 | Bury I.IX、VII §6；Marcellinus s.a.453.5（其阿提拉死讯误在454） | bury-9, bury-7, marcellinus |
| 454 | 西部 | 瓦伦提尼安三世杀死埃提乌斯 | Bury I.IX；Marcellinus s.a.454.2 | bury-9, marcellinus |
| 454 | 东部 | 内达奥之战后的匈人体系瓦解 | Bury I.IX，Nedao段 | bury-9 |
| 455 | 西部 | 皇帝遇刺，汪达尔人劫掠罗马 | Bury I.X；Marcellinus s.a.455 | bury-10, marcellinus |
| 456 | 西部 | 阿维图斯被废，西部另立皇帝暂告中断 | Bury I.X，deposition of Avitus段 | bury-10 |
| 457 | 跨两部 | 东西两部各立新帝 | Bury I.X及注70；DIR Leo I | bury-10, dir-leo |
| 458 | 西部 | 马约里安通过法律与军事重建权力 | Bury I.X，Majorian legislation及Gaul段 | bury-10 |
| 458 | 东部 | 利奥向主教征询迦克墩会议意见 | Marcellinus s.a.458；Bury I.X | marcellinus, bury-10 |
| 459 | 东部 | 哥特压力促成东方宫廷议和 | DIR Leo I，Foreign Events；Bury I.XII §5回述461年安排 | dir-leo, bury-10, bury-12 |
| 460 | 西部 | 西班牙海岸舰队遭毁，非洲远征受挫 | Hydatius Maiorianus、Carthaginiensi littore条；Bury I.X | hydatius, bury-10 |
| 460 | 东部 | 基齐库斯遭地震破坏 | Marcellinus s.a.460 | marcellinus |
| 461 | 西部 | 马约里安被杀，塞维鲁斯获立 | Bury I.X；Marcellinus s.a.461.2 | bury-10, marcellinus |
| 462 | 跨两部 | 被俘皇室成员获准返回东方 | Bury I.X，release of Eudoxia and Placidia段 | bury-10 |
| 463 | 西部 | 埃吉狄乌斯在奥尔良一带击败哥特人 | Bury I.X，Aegidius及Orleans段 | bury-10 |
| 464 | 西部 | 里西默击败阿兰王贝奥尔戈尔 | Marcellinus s.a.464；Bury I.X | marcellinus, bury-10 |
| 465 | 西部 | 塞维鲁斯死后，西部长期不另立奥古斯都 | Bury I.X；Marcellinus s.a.465.2 | bury-10, marcellinus |
| 465 | 东部 | 大火毁坏君士坦丁堡城区 | Marcellinus s.a.465.1；Bury I.X；DIR Leo I作464 | marcellinus, bury-10, dir-leo |
| 466 | 西部 | 欧里克杀兄继位，西哥特政策转向扩张 | Bury I.X，Euric accession段 | bury-10 |
| 466 | 东部 | 阿尔达布里乌斯失势，芝诺势力上升 | DIR Leo I、Zeno；Bury I.X | dir-leo, dir-zeno, bury-10 |
| 467 | 跨两部 | 利奥派安提米乌斯建立西部宫廷 | Bury I.X §3；Marcellinus s.a.467.1 | bury-10, marcellinus |
| 468 | 跨两部 | 联合远征汪达尔非洲失败 | Bury I.X §3；Marcellinus s.a.468 | bury-10, marcellinus |
| 469 | 东部 | 匈人领袖登吉齐克败亡 | Marcellinus s.a.469；Bury I.X | marcellinus, bury-10 |
| 470 | 东部 | 帕特里基乌斯的恺撒身份引发争议 | DIR Leo I；Bury I.X，Patricius段 | dir-leo, bury-10 |
| 470 | 西部 | 罗马官员罗马努斯被处死 | Bury I.X §4，Romanus段 | bury-10 |
| 471 | 东部 | 利奥清除阿斯帕尔家族 | Bury I.X；Marcellinus s.a.471 | bury-10, marcellinus |
| 471 | 西部 | 安提米乌斯在高卢的军事行动失败 | Bury I.X §4，Anthemiolus段 | bury-10 |
| 472 | 西部 | 围城与内战终结安提米乌斯政权 | Bury I.X §4；Marcellinus s.a.472.2 | bury-10, marcellinus |
| 472 | 东部 | 维苏威火山灰进入首都记忆 | Marcellinus s.a.472.1 | marcellinus |
| 473 | 西部 | 贡多巴德拥立格利凯里乌斯 | Bury I.XII §4；Marcellinus s.a.473.1 | bury-12, marcellinus |
| 473 | 东部 | 利奥二世被纳入皇位共治 | Bury I.X末；DIR Zeno开篇 | bury-10, dir-zeno |
| 474 | 东部 | 利奥一世死后，利奥二世与芝诺共治 | DIR Leo I、Zeno；Bury I.XII | dir-leo, dir-zeno, bury-12 |
| 474 | 西部 | 尼波斯废黜格利凯里乌斯 | Bury I.XII §4；Marcellinus s.a.474.2 | bury-12, marcellinus |
| 475 | 东部 | 巴西利斯库斯夺取首都，芝诺流亡 | Bury I.XII；DIR Zeno；Marcellinus s.a.475.1 | bury-12, dir-zeno, marcellinus |
| 475 | 西部 | 奥雷斯特斯逐走尼波斯，立子为帝 | Bury I.XII §4；DIR Romulus Augustulus | bury-12, dir-romulus |
| 476 | 东部 | 芝诺复位，巴西利斯库斯家族失位 | DIR Zeno；Bury I.XII；Marcellinus s.a.476.1 | dir-zeno, bury-12, marcellinus |
| 476 | 西部 | 罗慕路斯被废，意大利西部宫廷终结 | DIR Romulus Augustulus；Bury I.XII §4；Marcellinus s.a.476.2 | dir-romulus, bury-12, marcellinus |
