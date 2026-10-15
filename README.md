# FASTI · 罗马共和国执政官纪年

从一座城，到地中海。按年份探索罗马共和国的人物、事件和疆域，也可以选择一个历史剧本，沿着政治困局与人物命运读下去。

**[打开网站](https://kaloioannes.github.io/roman-republic-fasti/)**

覆盖前509—前27年全部 **483个年度**，收录 **1,201项任职、512条记事、302段人物简介、53个疆域阶段**，另有 **10个剧本、59个叙事章节**。

## 十个历史剧本

每个剧本从一个具体局势出发，介绍关键人物，再用连续年份展开。章节与年度档案共用同一页面：读完剧情，往下就是当年的官员、地图与事件。可以跳到下一章，也可以逐年查看两章之间发生的事。

| 剧本 | 年份 | 叙事主线 |
|---|---|---|
| 把权力刻在铜上 | 前462—449 | 十人委员会、成文法与临时授权 |
| 道路通向谁的罗马 | 前312—287 | 阿庇乌斯的工程、名册与公民选票 |
| 轭下的誓言 | 前321—293 | 考迪乌姆、国家誓约与萨莫奈联盟 |
| 十二座城拒绝出兵 | 前216—201 | 汉尼拔战争中的殖民地、军役与惩罚 |
| 胜利者回到城内 | 前190—183 | 西庇阿审判、酒神祭仪与监察权 |
| 粮仓里的国王 | 前135—101 | 西西里两次奴隶战争 |
| 为罗马作战的人 | 前125—88 | 弗雷盖莱、同盟者战争与公民权登记 |
| 罗马可以在别处 | 前80—72 | 塞尔托里乌斯的地方联盟与流亡元老院 |
| 赢下战役，失去战争 | 前74—66 | 卢库卢斯、亚洲债务与统帅权转移 |
| 谁让罗马吃饭 | 前43—36 | 塞克斯图斯、粮道与西西里舰队 |

剧本是史实导读。开局局势与“关注的问题”提供阅读角度，各章附古代来源和具体章节。日期有异说的节点在引用旁说明，跨年过程在正文中交代。

## 使用

输入 `44`、`44 BC`、`44 BCE` 或 `公元前44年`，或者随机打开一年。年度页支持前后翻年、人物简介展开、地图拖动与缩放。亮暗主题会保存在浏览器中，手机也可使用。

**防剧透默认关闭。** 页头总开关在首页和年度页均可使用，开启后隐藏年度事件、任内经历、完整生平和未读章节。可以逐条展开事件，或一次展开本年全部事件。开关设置会保存；再次开启时清空已揭示内容。旧版浏览器设置会在升级后重新采用默认关闭。

分享年份：`#year=44`。分享剧本章节：`#story=sertorian-rome&year=77`。回到首页的剧本区：`#stories`。

网站为纯静态页面，无需账号、服务器或地图服务密钥，运行资产随仓库提供。

## 本地运行

```sh
python -m http.server 8000
# 在浏览器打开 http://localhost:8000
npm run validate
```

页面通过 `fetch` 读取 JSON，本地预览请使用 HTTP 服务。前端无需打包。

可选浏览器回归测试：

```sh
npm install --no-save playwright
npx playwright install chromium
npm run test:ui
```

浏览器测试覆盖全部剧本章节、默认防剧透、逐条与整年揭示、设置保存、失败重试，以及四种宽度下的明暗布局。已安装 Chrome 或 Edge 时，可设置 `PLAYWRIGHT_CHANNEL=chrome` 或 `msedge` 使用它们。

重建文字数据与地图：

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_data.py
python scripts/build_map.py
npm run validate
```

`data-source/` 保存可编辑的资料，`data/` 保存网页读取的 JSON。修改文字或剧本后运行 `build_data.py`，将源文件与生成文件一起提交。PR 会运行数据校验；合入 `main` 后部署 GitHub Pages。

## 来源与编辑

官员名录以依据 T. R. S. Broughton《The Magistrates of the Roman Republic》整理的[汇总名录](https://en.wikipedia.org/wiki/List_of_Roman_consuls)为入口，晚期另对照[卷二数字化稿](https://www.attalus.org/info/mrr2.pdf)。正任、补任、军事保民官、十人委员会、官职空缺和传统独裁官年分别记录，选举无效、辞职与任内死亡列入说明。

中文名优先采用已有专条译名，其余按公开的拉丁姓名词素表音译。拉丁前名缩写展开，`Junius / Julius` 规范为 `Iunius / Iulius`。残缺姓名注明常见复原或异读。有专条的人物按来源区分身份，其余同名任职按年度分别保存；905个人物条目中因此包含尚待合并的记录。简介重点覆盖多次任职、资料丰富和参与重要事件的人物。

早期事件对照[李维《建城以来史》](https://en.wikisource.org/wiki/From_the_Founding_of_the_City)，前324—30年主要通过 [Attalus](https://www.attalus.org/) 查找古代来源与现代研究，最后三年另引[卡西乌斯·狄奥](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cassius_Dio/home.html)。剧本另使用普鲁塔克、阿庇安、狄奥多罗斯与铭文。正文为中文重述，出处随条目保留。

文案直接讲述事件、人物行动与具体分歧。记载简略的年份介绍前后局势；年代异说、传奇传统和人物识别问题各在相应条目交代。采用瓦罗纪年，`AUC = 754 − BC`。

深入阅读：T. J. Cornell, *The Beginnings of Rome*；Gary Forsythe, *A Critical History of Early Rome*；*The Cambridge Ancient History* VII.2、VIII、IX；Broughton 的官员研究。

## 地图

历史疆域使用 [Cliopatria v0.2.0 / Seshat](https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.0) 的 GIS 轮廓，沿 Natural Earth 1:50m 海岸线裁切、轻度简化，以 D3 绘制。

地图按53个历史阶段显示，每张图标出所用时段。前509—501年沿用最早的前500—481年轮廓。色块呈现阶段控制区，具体战争、地方条约和盟友关系可结合年度记事阅读。

数据论文：Bennett, J. S., Mutch, E., Tollefson, A. et al. (2025), [*Cliopatria — A geospatial database of world-wide political entities from 3400BCE to 2024CE*](https://doi.org/10.1038/s41597-025-04516-9), *Scientific Data* 12, 247.

## 文件

| 文件 | 内容 |
|---|---|
| `index.html` / `style.css` / `app.js` | 页面、主题与交互 |
| `data/republic.json` | 年度、任职、人物、事件与出处 |
| `data/stories.json` | 网页读取的剧本 |
| `data/territories.json` | 历史疆域 GeoJSON |
| `data-source/stories.json` | 剧本局势、人物、章节与引用 |
| `data-source/events.tsv` | `年份\|标题\|正文\|类别\|来源代号` |
| `data-source/biographies.tsv` | 人物中文简传 |
| `data-source/name-glossary.json` | 拉丁姓名词素译名表 |
| `data-source/roster.json` / `profiles.json` | 名录及人物专条来源快照 |
| `scripts/` | 数据生成与校验 |

事件来源代号为李维卷数，或 `A`（Attalus；前29—27年由生成脚本转为狄奥）。名录来源采集于2026-10-07，剧本整理于2026-10-15。欢迎附出处提交译名、官职、年代和地图校订。

## 许可证

代码为 [MIT](LICENSE)；文字、剧本与名录数据为 CC BY-SA 4.0；Cliopatria 地图为 CC BY 4.0；Natural Earth 为公有领域。完整署名见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 [DATA_LICENSE.md](DATA_LICENSE.md)。

**English:** FASTI is a Chinese/Latin annual atlas of the Roman Republic (509–27 BCE), with ten curated historical starts. Follow linked narrative chapters or browse all 483 years, magistrates, biographies and territorial maps. A global spoiler switch is off by default and remembers your choice. Code: MIT; text and story data: CC BY-SA 4.0; Cliopatria geometry: CC BY 4.0.
