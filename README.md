# FASTI · 罗马历史纪年

沿着年份，阅读罗马的官员、统治者、人物、事件与疆域。中文叙述与拉丁文／希腊文姓名并列，人物、年度与史料相互连接。

仓库与网站现统一使用 `roman-fasti`，覆盖前753年至1453年的2,206个独立历史年度。

**[打开网站](https://kaloioannes.github.io/roman-fasti/)** · [王政篇](https://kaloioannes.github.io/roman-fasti/kingdom/) · [共和国篇](https://kaloioannes.github.io/roman-fasti/republic/) · [古典帝国篇](https://kaloioannes.github.io/roman-fasti/empire/) · [双帝国篇](https://kaloioannes.github.io/roman-fasti/divided-empire/) · [拜占庭篇](https://kaloioannes.github.io/roman-fasti/byzantine/)

## 时期与范围

| 时期 | 项目分卷范围 | 状态与内容 |
|---|---|---|
| 王政时代 | 前753—前509年 | 已开放；245个年度、传统七王与塔提乌斯共治者、10条传统纪年记事、36条未定年事迹、12处相关地点 |
| 罗马共和国 | 前509—前27年 | 已开放；483个年度、1,201项任职、512条记事、133段编写简介、905份任职摘要（其中193条身份待考）、56个疆域阶段；10个剧本、59个章节 |
| 古典罗马帝国 | 前27—公元395年 | 已开放；422个年度、134位人物、426条记事、162段称号任期、57个疆域阶段 |
| 双帝国时期 | 公元395—476年 | 已开放；82个年度、33位人物、41段称号任期、120条独立记事；东西宫廷、承认关系、争位与流亡分栏 |
| 拜占庭时期 | 公元476—1453年 | 已开放；978个年度、110位人物、978条独立记事、154段称号任期；13项已确认紫室称号 |

时期清单维护在 [project.json](project.json)。首页以五卷纪年长廊展示所有已开放时期；卷卡与页脚相邻分卷均从这份清单构建。分卷采用包含端点的范围，交界年份可以出现在相邻两篇；这些边界是编辑安排。皇帝篇人物包含共治者、争位者、区域政权、帝号有争议者及选录的恺撒，134不能视为正式皇帝人数。

## 浏览与分享

**[跨卷人物](https://kaloioannes.github.io/roman-fasti/people/)** 连接人工确认的七位跨卷人物：奥古斯都、狄奥多西一世、阿卡狄乌斯、霍诺里乌斯、芝诺、巴西利斯库斯及其子马尔库斯。各卷原档案可双向往返，总档案汇总全部已收录任职、相关年度与身份依据；不同同名者明确分开，日期与身份分歧按原卷保留。共和国年度人物卡与全站搜索也可直接进入。研究范围、维护及验收见 [跨卷身份说明](docs/people.md)。

**[全站搜索](https://kaloioannes.github.io/roman-fasti/search/)** 可在一个入口检索五卷的年份、人物姓名及别名、事件、剧本和章节，支持拉丁文／希腊文无重音输入、分卷及类型筛选、命中摘要与直达定位。裸数字并列说明公元前／公元两种解释，四个交界年提供两卷入口，前1年直接接公元1年。查询地址可分享、刷新和返回；可隐藏内容摘要。共和国人物结果定位到实际任职年度的人物卡。范围、编辑方法及验证见 [检索说明](docs/search.md)。

王政篇支持逐年翻阅、年份滑杆、中拉文人物检索、完整传记、出处与方法，以及年度 CSV／完整 JSON 下载。早期罗马没有连续可信的逐年事件档案：每年标明传统王期归属；无可定年记载的年份明确说明，任期内未定年事迹另栏展示。塔提乌斯共治的绝对年未定；地图为关联地点示意，不画伪精确的逐年疆界。

共和国篇支持年份检索、逐年前后翻阅、官员简介、地图缩放与十个连续叙事剧本。文字先行显示，地图的疆域与底图独立载入；地图失败不影响官员、事件、史料和剧本阅读，可在原页只重试失败资源。防剧透默认关闭，可按条或按年揭示，设置会保存在浏览器中。

古典帝国篇支持年度、完整人物传记、王朝／家族筛选和史料目录。可按中文、拉丁文、别名、王朝、时代和身份检索；同年先后在位与共治按任期区分。跨年背景可单独筛选，前1年直接接公元1年。

拜占庭篇沿用古典帝国篇的年度、人物与家族索引，采用紫色明暗主题，按人物展示拉丁文或希腊文原名，支持双语姓名及忽略重音检索、按可考精度显示任期月日、生于紫室标签及依据、正面标签筛选、978行年度CSV与完整JSON下载。主线包括君士坦丁堡、尼西亚及恢复后的帝国，共帝、争位者、区域皇帝分栏。978年每年均有独立记事和来源；约年、纪年异说、跨年行动及手稿题记分别说明，不把人物背景重复当作年度大事。地图分色展示尼西亚、拉丁帝国及特拉比松，近似图层保留说明。

双帝国篇支持395—476年东西宫廷同年对照、原名检索、王朝／家族及身份筛选、完整人物档案、逐条史料、82行年度CSV与完整JSON下载。共帝、争位、流亡及恺撒单独标识；466年的西部宫廷空缺、475—476年的尼波斯和芝诺流亡称号均明确说明。地图分色展示有来源的阶段疆域，保留源年代与近似说明。

| 内容 | 链接示例 |
|---|---|
| 王政建城传统起点 | `kingdom/#year=-753` |
| 塔提乌斯共治者档案 | `kingdom/#person=titus-tatius` |
| 王政史料与纪年取舍 | `kingdom/#sources` |
| 共和国前44年 | `republic/#year=44` |
| 塞尔托里乌斯剧本章节 | `republic/#story=sertorian-rome&year=77` |
| 古典帝国前27年 | `empire/#year=-27` |
| 双帝国分治起点 | `divided-empire/#year=395` |
| 西部宫廷空缺 | `divided-empire/#year=466` |
| 476年与尼波斯流亡帝号 | `divided-empire/#year=476` |
| 尼波斯档案 | `divided-empire/#person=julius-nepos` |
| 双帝国史料与取舍 | `divided-empire/#sources` |
| 拜占庭1204年 | `byzantine/#year=1204` |
| 君士坦丁七世与紫室依据 | `byzantine/#person=constantine-vii` |
| 已确认紫室人物 | `byzantine/#people&purple=1` |
| 奥古斯都传记 | `empire/#person=augustus` |
| 塞维鲁王朝人物 | `empire/#people&dynasty=severan` |

原有根目录链接 `#year=44`、`#stories`、`#story=…&year=…` 自动进入共和国篇，保留查询参数与完整 hash。古典帝国的统一入口为 `empire/`，旧的独立 HTML 入口已移除。

每一卷的第一年／最后一年提供相邻卷对应边界年度的链接：王政 ⇄ 共和国 ⇄ 古典帝国 ⇄ 双帝国 ⇄ 拜占庭。全站页脚遵循同一顺序，第一卷和最后一卷不循环跳转。三个帝国篇的年度阅读说明收在“史料与方法”的折叠项中。

## 仓库结构

```text
project.json                 项目名称与时期清单
site/                        网页源文件
  index.html                 全时期入口模板
  catalog.css / catalog.js   纪年长廊样式与主题切换
  catalog-card.html.template 构建时由时期清单填充的卷卡
  kingdom/                   王政年度、国王、史料与地点示意
  republic/                  共和国页面与交互
  empire/                    古典帝国页面与交互
  divided-empire/            东西宫廷同年对照、人物与史料
  byzantine/                 拜占庭年度、希腊文人物与紫室证据
  shared/                    公共 UI、帝国共用布局、阶段衔接、旧路由兼容与资源
data-source/
  kingdom/                   王表、记事、史料、方法与近似地点
  republic/                  共和国名录、事件、简介、剧本与原始 GIS
  empire/                    帝国人物、王朝、任期、事件、史料与原始 GIS
  divided-empire/            395—476年人物、任期、事件、空缺与GIS
  byzantine/                 拜占庭人物、记事、取舍与原始GIS
data/
  kingdom/                   records.json
  republic/                  records.json、stories.json、territories.json
  empire/                    records.json、territories.json
  divided-empire/            records.json、places.json、territories.json
  byzantine/                 records.json、territories.json
scripts/                     数据生成、发布构建、校验与浏览器回归
docs/                        架构、扩展约定与研究说明
_site/                       构建生成的完整发布包，不提交
```

[架构与新增时期指南](docs/architecture.md) 解释目录职责、年份和人物 ID 约定、旧路径迁移及扩展步骤。运行数据与可编辑史料按时期对应；前端按各篇现有 schema 读取，避免为了统一目录改写历史资料。

## 本地构建与预览

需要 Python 3.10+、Node.js 22+。发布构建仅使用 Python 标准库，无需网络。

```sh
npm run validate
npm run build
npm run validate:release
python -m http.server 8000 --directory _site
# 打开 http://localhost:8000
```

首页卷卡和各卷页脚在构建时从 `project.json` 生成，预览使用 `_site/`。页面通过 HTTP 读取 JSON，直接打开本地 HTML 文件无法正常加载资料。前端采用原生 HTML、CSS 和 JavaScript。

### 编辑与重建数据

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_data.py          # 共和国文字与剧本
python scripts/build_empire.py        # 古典帝国人物、任期、记事
python scripts/build_kingdom.py       # 王政传统纪年、人物与未定年事迹
python scripts/build_divided_empire.py # 双帝国人物、东西任期与年度记事
python scripts/build_divided_empire_map.py # 双帝国分阶段GIS（Shapely）
python scripts/build_byzantine.py     # 拜占庭人物、分级精度任期与完整年度记事
python scripts/build_search.py        # 五卷静态检索索引；发布构建也会自动重建
python scripts/build_byzantine_map.py # 拜占庭与并立政权GIS（Shapely）
python scripts/build_map.py           # 共和国地图
python scripts/build_imperial_map.py  # 古典帝国地图
npm run validate
npm run build
npm run validate:release
```

`npm run test:divided-empire` 可单独运行双帝国浏览器回归，检查根路径与Pages子路径、全部82年和33位人物、承认与流亡、筛选、下载、地图恢复、手机和明暗主题。

修改 `data-source/<时期>/` 后，将对应的 `data/<时期>/` 生成文件一起提交。帝国、王政和拜占庭文字构建只需 Python 标准库；共和国文字构建使用 OpenCC；地图构建使用 Shapely。源资料与底图已随仓库提供，重建无需联网。

### 浏览器回归

```sh
npm install --no-save --package-lock=false playwright@1.62.1
npx playwright install chromium
npm run build
npm run test:biographies
npm run test:ui
npm run test:release
```

已安装 Chrome 或 Edge 时，可设置 `PLAYWRIGHT_CHANNEL=chrome` 或 `msedge`。测试涵盖共和国全部剧本章节、防剧透与失败重试、帝国任期边界和人物传记、王朝筛选、地图、明暗主题与手机布局、缓存升级、旧链接跳转，以及 GitHub Pages 子目录部署。`npm run test:routes` 可单独检查入口与兼容链接、八个双向阶段衔接、五卷页脚、双帝国标题与宫廷对齐，以及阅读说明的折叠位置。

`npm run test:republic-loading` 单独检查共和国文字、疆域与底图的独立失败恢复，含 HTTP／网络／解析错误、超时、选择性重试、快速换年与离开年度、浏览器前进后退、键盘和手机明暗主题。它使用构建后的指纹资源，在根路径及 Pages 子路径运行；已包含在 `test:ui` 和 PR 工作流中。

PR 工作流重建文字数据并校验一致性，运行数据、目录、发布包和浏览器检查。合入 `main` 后，Pages 工作流构建并校验 `_site/`，再发布网站。构建自动发现各篇的 HTML、CSS、JavaScript 和 JSON，对运行资源生成内容指纹并改写相对引用。

`npm run test:kingdom` 可单独检查王政篇，覆盖边界、交接、未定年、人物直链、失败重试、下载、地图与手机明暗主题，并在根路径及 Pages 子目录运行。

`npm run test:byzantine` 可单独运行拜占庭浏览器回归；数据校验和PR文字重建一致性检查已纳入现有流程。

## 史料、编辑与许可证

王政篇主要对读李维、狄奥尼修斯与普鲁塔克，并以考古机构和发掘项目资料检验奥斯蒂亚、城墙及城市宗教传统。完整纪年计算、逐年空白处理及出处矩阵见 [王政研究说明](data-source/kingdom/RESEARCH.md)，来源目录见 [sources.json](data-source/kingdom/sources.json)。

共和国名录以依据 Broughton《The Magistrates of the Roman Republic》整理的汇总名录为入口，事件、简介与剧本附来源；地图来自 Cliopatria，并以 Natural Earth 海岸线裁切。详细的名录身份处理、十个剧本与阅读方法见 [共和国研究说明](docs/republic.md)。

双帝国篇的双宫廷模型、争位与流亡、精度取舍、来源立场及逐年出处矩阵见 [双帝国研究说明](data-source/divided-empire/RESEARCH.md)，来源目录见 [sources.json](data-source/divided-empire/sources.json)。全82年各有独立事件；古代编年记录、Bury公版叙事与DIR署名研究对读，确日有争论时降低精度。

古典帝国篇的收录取舍、年代异说、任期与疆域重建见 [帝国研究说明](data-source/empire/RESEARCH.md)，来源目录见 [sources.json](data-source/empire/sources.json)。

拜占庭篇的继承线、共帝口径、逐人姓名语言、分级日期精度、13项紫室依据、978个年度记事及GIS近似见 [拜占庭研究说明](data-source/byzantine/RESEARCH.md)，完整来源见 [sources.json](data-source/byzantine/sources.json)。主要对读博物馆年表、DIR署名研究、普罗柯比、普塞洛斯、安娜、霍尼亚提斯及1453年目击材料；不宣称完成全部原始文献校勘。

代码使用 [MIT](LICENSE)；文字、剧本与名录数据使用 CC BY-SA 4.0；Cliopatria 地图使用 CC BY 4.0；Natural Earth 为公有领域。完整署名与变更说明见 [DATA_LICENSE.md](DATA_LICENSE.md) 和 [THIRD_PARTY.md](THIRD_PARTY.md)。

**English:** FASTI is a Chinese, Latin and Greek collection of annual databases for Roman history. Published volumes cover the traditional Roman kings (753–509 BCE), Republican magistrates (509–27 BCE) and classical Roman emperors (27 BCE–395 CE). The Kingdom volume separates traditional dated nodes from undated reign narratives and explicitly identifies years without datable records. It includes biographies, sources and an approximate place diagram. The Byzantine volume (476–1453 CE) adds 978 annual records, 110 biographies, per-person Latin or Greek display names, sourced regnal dates at their attested precision, positively sourced purple-born tags and 978 independent annual entries, with explicit approximate and disputed chronology. It follows the Nicaean succession in exile and distinguishes junior, rival and selected regional emperors. The divided Empire volume (395–476 CE) adds 82 annual comparisons, 33 people, 41 title stages and 120 independently authored events. It separates the two courts, rival recognition, Caesars, vacancies and exiled imperial claims, including Nepos beyond 476. Its independently coloured GIS stages retain source intervals and explicit caveats. The repository and Pages site use the period-neutral name `roman-fasti`.
