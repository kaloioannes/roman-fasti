# FASTI · 罗马共和国执政官纪年

从一座城，到地中海。输入公元前年份，逐年探索共和国的人物、事件与疆域。

**[打开互动网站](https://kaloioannes.github.io/roman-republic-fasti/)**

覆盖 **前509—前27年全部483个年度**，包含 **1,201项任职记录、512条年度记事、302段人物简介及53个疆域重建阶段**。

## 使用

首页只显示年份搜索。输入 `44`、`44 BC` 或 `公元前44年`，也可以掷骰子随机探索。年度页支持前后翻年、人物简介展开、地图拖动与缩放、事件防剧透高斯模糊及逐条揭示。亮色与暗色主题、剧透设置会保存在当前浏览器；布局适配手机。网址中的 `#year=44` 可以直接分享某一年。

这是无服务器、无账号、无分析追踪的静态网站。运行时资产随仓库提供，无需第三方地图服务或 API 密钥。

## 本地运行与校验

```sh
python -m http.server 8000
# 打开 http://localhost:8000
npm run validate
```

不要直接双击 HTML：年度 JSON 通过 `fetch` 载入，需要 HTTP 服务。前端没有安装依赖或打包步骤。

重建文字数据和地图：

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_data.py
python scripts/build_map.py
npm run validate
```

`data-source/` 保存可以审查和编辑的源数据；`data/` 是网页实际使用的紧凑 JSON。提交到 `main` 后，GitHub Actions 会校验全部年度与地图覆盖，再部署 GitHub Pages。

## 数据与编辑原则

- 官员名录以依据 T. R. S. Broughton《The Magistrates of the Roman Republic》整理的[维基百科汇总](https://en.wikipedia.org/wiki/List_of_Roman_consuls)为入口，晚期另对照[卷二数字化稿](https://www.attalus.org/info/mrr2.pdf)。保留正任、补任、军事保民官、十人委员会、官职空缺和传统“独裁官年”。当选无效、未就任、辞职与任内死亡明确备注。
- 中文专条译名优先；其他名字按公开的拉丁人名词素表一致音译。拉丁前名缩写展开，`Junius / Julius` 规范为 `Iunius / Iulius`。残缺或有异读的名字不补造不存在的完整身份。
- 有专条的身份依据来源区分；没有人物链接的同名记录按年度分别保留。因此 **905个人物条目不等于905名可独立确认的人**。人物简介约覆盖条目的前三分之一，按史料信息量、重复任职和重大事件相关性选择，不声称存在客观名气排行榜。
- 早期事件主要对照[李维《建城以来史》](https://en.wikisource.org/wiki/From_the_Founding_of_the_City)，前324—前30年主要使用 [Attalus 年度古代史料及现代研究索引](https://www.attalus.org/)。最后三年另引[卡西乌斯·狄奥](https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cassius_Dio/home.html)。所有事件均为中文重述，逐条保留出处。
- 每年都有记事，但少数早期年份只留下零星编年或跨年进程，明确标为“编年线索”。含传奇的叙事和有争议的年代也会标注，不把研究空白填成虚构大事。
- 采用传统瓦罗纪年，`AUC = 754 − BC`。早期历法、官职顺序与某些事件的绝对年代存在研究分歧。

进一步研究可参阅 T. J. Cornell, *The Beginnings of Rome*；Gary Forsythe, *A Critical History of Early Rome*；*The Cambridge Ancient History* VII.2、VIII、IX；Broughton 的三卷官员研究。网页是适合爱好者阅读的索引，不替代这些研究。

## 地图

历史疆域使用 **[Cliopatria v0.2.0 / Seshat](https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.0)** 的详细 GIS 轮廓，沿 Natural Earth 1:50m 海岸线裁切、轻度简化，再以 D3 绘制连续色块、陆地、经纬网和城市标签。

数据说明：Bennett, J. S., Mutch, E., Tollefson, A. et al. (2025), [*Cliopatria — A geospatial database of world-wide political entities from 3400BCE to 2024CE*](https://doi.org/10.1038/s41597-025-04516-9), *Scientific Data* 12, 247.

每张图展示所用的历史阶段，**不是逐年精确测绘**。最早轮廓由前500—481年延用到前509年；阶段数据对罗马核心控制、行省、盟邦和短期占领的表达并不完全等同于每年的军事实际。年表中的吞并日期与源地图变化时点也可能有差距。这里保留数据出处和阶段标注，以便日后校订，同时提供清晰、可缩放的历史地图。

## 文件

| 文件 | 内容 |
|---|---|
| `index.html` / `style.css` / `app.js` | 响应式网页、主题与交互 |
| `data/republic.json` | 全部年度、任职、人物、事件和出处 |
| `data/territories.json` | 可绘制的历史疆域 GeoJSON |
| `data-source/events.tsv` | `年份\|标题\|正文\|类别\|来源代号` |
| `data-source/biographies.tsv` | 重点人物的人工中文简传 |
| `data-source/name-glossary.json` | 拉丁姓名词素译名表 |
| `data-source/roster.json` / `profiles.json` | 来源快照整理与人物专条信息 |
| `scripts/` | 重建和完整性校验 |

事件来源代号为李维卷数，或 `A`（Attalus；前29—27年由编译器转为狄奥）。数据源采集于 **2026-10-07**。欢迎通过 issue 或 PR 提出译名、官职、年代和地图校订，并附出处。

## 许可证

网站代码为 [MIT](LICENSE)；文字与名录数据为 CC BY-SA 4.0；Cliopatria 地图数据为 CC BY 4.0；Natural Earth 为公有领域。字体、D3、TopoJSON 与 World Atlas 的完整署名见 [THIRD_PARTY.md](THIRD_PARTY.md) 和 [DATA_LICENSE.md](DATA_LICENSE.md)。

---

**English:** FASTI is a responsive Chinese/Latin annual atlas of the Roman Republic (509–27 BCE). Search a year, discover magistrates and sourced historical narratives, explore reconstructed territorial maps, and optionally conceal events with a spoiler blur. All 483 years are present. The site explicitly marks sparse evidence, traditional chronology and exceptional magistracies. Code is MIT; historical text data CC BY-SA 4.0; Cliopatria geometry CC BY 4.0.
