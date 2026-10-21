# 架构与新增时期指南

## 项目身份

项目展示名为 **FASTI · 罗马历史纪年**，软件包名为 `roman-fasti`。GitHub 仓库与 Pages 子路径统一为 `roman-fasti`。旧仓库链接由 GitHub 重定向；Pages 网站地址使用 `https://kaloioannes.github.io/roman-fasti/`。

GitHub About 可采用：`FASTI · 罗马历史纪年 — Chinese/Latin annual databases of Roman magistrates and emperors, with biographies, sources and historical maps.`

## 目录与依赖方向

```text
data-source/<period>/ ── 数据构建脚本 ──> data/<period>/
                                              │
site/<period>/ + site/shared/ + project.json ───┴──> build_site.py ──> _site/
```

`data-source/` 是史料编辑入口；`data/` 是已提交的网页数据产物；`site/` 是静态网页源码；`_site/` 是可独立部署的产物。构建不抓取网络资料。`scripts/` 统一放置命令行工具，保留已有脚本名，外部调用无需再迁移一层。

`site/shared/ui.css` 是各篇共同使用的既有视觉组件集，包括主题、导航、地图、卡片与阅读组件。第三方库、字体及公共底图集中于 `site/shared/assets/`。古典帝国与拜占庭共用的布局放在 `site/shared/imperial.css`；拜占庭仅在自己的 `style.css` 维护紫色主题、紫室证据和地图分色。其他时期的专用样式放在自己的目录中。每篇的 `app.js` 与 `index.html` 同目录，经典脚本中的 fetch 地址按页面 URL 解析。

共和国与帝国有不同的官职、任期与人物模型。目录一致不意味着强制使用同一 schema。数据构建和校验仍分别负责各自的史学语义。

## 时期、年份和身份

- `project.json` 定义稳定的时期 ID、标题、展示范围、历史年份端点和发布状态。`available` 要求完整页面与数据；`planned` 不进入已发布卷卡和阶段导航。
- 清单中的历史年份使用负数表示公元前、正数表示公元后，无公元0年。分卷端点包含在内，因此前509、前27、395和476等交界年份允许重叠；跨时期查询不得简单相加作为唯一年度数。
- 共和国篇保留原来的正数 BC 键与路由，如 `years[44]`、`#year=44` 表示前44年；帝国篇的 `years[-27]`、`#year=-27` 表示前27年。任何跨时期工具必须显式转换共和国年份，不能直接合并两个 `years` 对象。
- 人物 ID 只在本篇内唯一；跨时期引用使用 `(periodId, personId)`。独立的 `data-source/people/identities.json` 显式维护有来源的全站身份，投影为 `data/people/index.json`，不改写各卷原档案。`people/` 提供总档案，本卷人物页和搜索提供互链；姓名或本卷ID相同不会自动合并。数据与研究约定见 [跨卷人物](people.md)。
- 王政篇使用负数年份；`years[-753]`、`#year=-753` 表示前753年。王期两端为传统交接点，年度桶包含端点，不表示全年在位。`events` 是传统纪年节点；`traditions` 仅为未定年的王期背景，两者不可合并统计。塔提乌斯空值任期不展开，空位另以 `interregnum` 标记。地点示意不提供疆界；完整约定见 `data-source/kingdom/RESEARCH.md`。
- 双帝国篇 `divided-empire` 已开放：`side=west/east/both`，`kind`区分实际宫廷、共帝、争位、流亡、恺撒和有争议帝号；对方承认另记于 `recognition`。`vacancies`为有出处的宫廷间隔，466年不伪造西帝。`startDate/endDate`分年/月/日精度，可用标签标异说。尼波斯终点480年、芝诺终点491年保留，但年度展开止于476年。395与476年交叠是分卷安排。

## 构建与 URL

`build_site.py` 自动发现 `site/` 下的 HTML、CSS、JavaScript 和 `data/` 下的 JSON，并为 JSON、第一方 CSS/JS 生成 SHA-256 内容指纹。`asset-manifest.json` 的键始终相对于发布根目录。重写时将每条引用解析到资源，再转回相对于当前页面／样式表的路径。新增文件通常无需修改构建文件列表。

HTML 入口保持稳定，数据、CSS、JS 使用指纹文件。第三方库及字体按共享资源原名复制。全部站内路径采用相对 URL，兼容域名根目录和 `/roman-fasti/`。静态目录 URL 使用结尾的 `/`。

构建前清理上一次清单拥有的指纹文件，以及专用发布目录中已不在源码里的 HTML 页面；重复构建不会累积旧资源或退役入口。自定义输出目录必须与源目录分离。构建输出还包含代码与数据许可证和第三方署名。

| 旧路径 | 当前路径 |
|---|---|
| `/`（无 hash） | 总入口 |
| `/#year=44`、`/#stories`、`/#story=…&year=…` | `/republic/`，保留完整 hash 与查询参数 |
| 根目录 `app.js`、`style.css` | `site/republic/app.js`、`site/shared/ui.css` |
| 根目录帝国页面与脚本 | `site/empire/` |
| `data-source/` 下的共和国散文件 | `data-source/republic/` |
| `data/republic.json`、`data/stories.json`、`data/territories.json` | `data/republic/{records,stories,territories}.json` |
| `data/empire.json`、`data/imperial-territories.json` | `data/empire/{records,territories}.json` |
| `assets/` | `site/shared/assets/` |

公开页面链接提供兼容跳转。仓库内 JSON 和源码路径按此表迁移；直接读取仓库文件的下游脚本需更新路径。发布数据实际地址应从清单获得。

## 新增一个时期

1. 在 `project.json` 中确认时期 ID 与分卷范围，初期保持 `planned`。
2. 在 `data-source/<id>/` 建立带来源的编辑资料与研究说明；明确年份、人物身份、官职／帝号、任期精度及争议处理。
3. 编写离线且可重复的数据构建脚本，输出 `data/<id>/records.json`，地图与其他资料也放在该目录。提交源文件及生成文件。
4. 建立 `site/<id>/index.html`、`app.js` 及按需的 `style.css`。共用 `../shared/`，读取 `../data/<id>/`，保留返回总入口的 `href="../"`。
5. 添加对应数据校验，并接入 `npm run validate`、PR 重建一致性检查和浏览器回归。至少测试边界年份、人物直链、失败重试、地图及手机布局。
6. 完成研究与验证后，将清单状态改为 `available`，补齐 `latin`、`caption` 等卷面文字并同步 README 的范围与统计；首页卷卡及页脚会从清单自动生成。构建器会发现新模块并处理指纹资源。

## 验证责任

`validate.mjs` 与 `validate-empire.mjs` 校验各篇数据、来源、人物引用、地图覆盖与资料约定。`validate-structure.mjs` 检查时期清单和目录职责。`validate-release.mjs` 检查完整资源清单、指纹、HTML/JS/CSS 本地引用及子目录兼容。

`test-ui.cjs` 覆盖共和国交互；`test-release.cjs` 覆盖旧缓存升级；`test-imperial.cjs` 覆盖帝国人物、任期、检索与地图；`test-routes.cjs` 在域名根目录和 Pages 子路径下验证总入口、旧链接、主题共享、无脚本回退和手机布局。

共和国 `app.js` 将文字档案、剧本、疆域和底图分别缓存；首页与史料对话框不请求地图，年度文字渲染完成后才启动地图请求。每项资源共享在途请求，成功值在当前页面会话内保留；请求在20秒后中止并显示可重试状态。地图失败不会触发文字档案错误，地图按钮只重试失败项，已就绪及仍在请求的部分不重新下载。底图的 TopoJSON 转换也在本资源的失败边界内。切换路由立即移除旧地图并停止缩放动画，异步成功和失败均核对路由版本及当前年份；回到首页后不能写入过期地图。文字与剧本也有独立的原页恢复入口。

`test-republic-loading.cjs` 通过真实 HTTP 读取 `_site/` 的指纹资源，在 `/` 与 `/roman-fasti/` 验证各资源的网络、HTTP、解析、超时故障和逐项恢复，并断言请求次数、当前地图阶段与年份、阅读功能、路由过期保护及移动失败状态；由 `test:ui` 纳入 PR 检查。超时测试等正常资源就绪后才推进浏览器虚拟时钟，实际执行20秒计时、fetch 中止与恢复路径。

`build_kingdom.py` 重建王政篇；`validate-kingdom.mjs` 校验传统王期、年度连续性、空位与未定年事件分离；`test-kingdom.cjs` 检查年度、人物、下载、失败恢复及相关地点示意。


## 拜占庭分卷

`byzantine` 已开放，476—1453年，独立 `greek` 显示字段；`junior` 为共帝，`central` 为本卷继承主线，不能将人物总数解释成主帝人数。`purple` 为附 `note/sources` 的正面证据对象或 `null`（尚未确认）。`years[y].events` 可为空，`eventStatus` 明确资料缺口；禁止以重复跨年背景填充。原始事件保留稳定ID。

`build_byzantine.py` 和 `validate-byzantine.mjs` 负责资料编译和语义检查；`test-byzantine.cjs` 负责根目录/Pages子路径、所有人物、任期边界、希腊文检索、紫室筛选、下载、地图、失败恢复和响应式回归。`build_byzantine_map.py` 沿用海岸裁切工具，独立政权分层，原属性与显式近似均保留。收录及年代冲突以 `data-source/byzantine/RESEARCH.md` 为准。

## 双帝国分卷

`build_divided_empire.py`离线编译文字与据点；`build_divided_empire_map.py`用Shapely处理固定版本Cliopatria东西部图层。年度页用双栏对读，手机纵向排列；历史承认不由GIS推断。`validate-divided-empire.mjs`与`test-divided-empire.cjs`覆盖数据语义、全部82年、33份档案、源定位、下载、独立失败恢复、两种部署路径与手机明暗主题。研究说明和逐年出处矩阵在`data-source/divided-empire/RESEARCH.md`。

## 统一分卷导航与兼容层

`site/search/` 提供统一检索及带符号纪年入口，`scripts/build_search.py` 以适配层投影五卷文字和剧本到 `data/search/index.json`，不迁移源 schema。发布构建自动重建并生成指纹；检索只载入这一份文字索引。各卷路由完成后调用 `shared/search-target.js` 处理可选的条目定位提示，共和国仍使用正数BC路由。别名表与覆盖／浏览器回归纳入CI；完整范围和 locator 的稳定性约束见 [全站检索](search.md)。

`project.json` 是分卷顺序、名称和边界的唯一配置。`build_site.py` 用 `catalog-card.html.template` 生成首页五卷入口，并替换各篇的 `period-footer` 标记，生成前一卷／全部时期／后一卷。首页无需运行时请求即可使用。卷面建筑线稿存于 `shared/assets/periods.svg`。

`shared/periods.js` 读取同一份带指纹的清单，为年度页的 `data-period-boundary` 插槽填入边界链接；共和国传入负数历史年份，输出其路由时转回正数 BC 键。内部年度不显示跨卷链接，最早和最晚边界不循环；异步返回时检查年份令牌与插槽连接状态，避免快速换年后出现旧链接。

`site/catalog.css`、`site/catalog.js` 仅负责总入口。`shared/legacy-routes.js` 兼容原共和国根目录 hash；帝国仅保留 `empire/` 目录入口，废弃的独立 HTML 页面已移除。三个帝国篇的通用年度阅读说明放入“史料与方法”的折叠项，年度滑杆直接接正文或边界链接。


## 共和国简介数据（schemaVersion 2）

共和国运行数据保留现有人物ID、年度和任职结构，新增 `schemaVersion: 2`。`people[id].bio` 只存编写的简介，`bioSources` 为其来源；`bioStatus` 为 `authored`、`office-summary` 或 `insufficient`。每个条目都有从已收录任职生成的 `officeSummary` 和 `officeSummarySources`，包括身份待考条目。`identified=false` 表示当前资料尚未把此条目识别到独立人物专条，并不表示此人不存在，也不授权合并同名条目。

`stats.biographies` 仅计编写简介；`officeSummaries` 计有任职摘要的条目，`insufficientBiographies` 计身份待考条目。三者有交叠，不能相加作为总人数。旧版把生成摘要也放在 `bio`，因此下游若需要任职概况，应读取 `officeSummary`。页面旧年度和剧本链接保持不变。

`scripts/republic_biographies.py` 负责显式正文／身份／来源校验及摘要生成，`build_data.py` 调用它；不读取简介排名、专条长度或总人数比例。源正文和 `biography-identities.json` 的增删改必须同步。`validate.mjs` 独立核对源正文与运行数据、人物身份、来源、摘要与全部任职的对应；`test_republic_biographies.py` 检查增长与错误编辑，已纳入PR工作流。

## 共和国人物导航

`republic/#people` 与 `#person=<本卷ID>` 使用现有文字档案加 `data/republic/people.json` 导航投影，后者由 `build_republic_people.py` 从实际年度成员生成，并同步完整候选清单。姓名规范化只用于查找与审阅；不自动合并。`person-aliases.json` 为有来源的人工旧ID迁移预留兼容机制，目前无退休ID。发布构建先重建此投影，再重建跨卷身份和搜索；两者的共和国档案入口改为专页，年度定位URL仍保留。说明与验证见 [共和国人物](republic-people.md)。

## 结构化事件投影

`build_events.py` 保留五卷源schema，将显式源ID与 `data-source/events/` 的编辑元数据／独立对象投影为 `data/events/index.json`。全站键为 `period:localId`，年度成员、人物、地点与父子事件只引用同一键；跨年对象只保存一次。源年度摘要不自动当作独立事件，日期窗口、持续范围与年度归置不同；年份统一带符号且跳过0年。引用区分本次直接查阅与沿用来源。详见 [事件说明](events.md)。

`events/` 独立加载文字投影，提供筛选、档案、引用与单条导出。原卷的稳定事件链接不需请求全站投影；小型 `navigation.json` 提供已编订事件与原年度／人物的可选互链，失败可独立恢复。原卷的纪年筛选使用枚举元数据而非中文正则。发布构建先重建事件，再重建搜索；新数据、资源指纹、旧序号定位和浏览器回归均进入CI。

## 论断级史料证据

`data-source/evidence/{sources,dossiers}.json`保存来源目录、逐条论断、实际核读范围与异说依据，`event_evidence.py`叠加到统一事件投影。原五卷schema不迁移，旧引用及查阅记录保留；`navigation.json`仅补证据入口标记。网页组件`events/evidence.js`负责分类来源、稳定卡片定位、间接路径和并读；完整约定见[证据说明](evidence.md)。

## 实际权力与摄政

`data-source/power/people.json`维护显式身份复用、角色阶段、作用与限制、具体行动、原卷人物及事件连接的论断与出处。`build_power.py`在人物／事件／王朝之后生成完整资料与小型导航，搜索以独立`power`类型投影。`power/`提供目录与档案，原卷人物、年度、事件及王朝辅助节点均可反查。已有皇帝名录与任期不变，补充人物不进入继承线；观察窗口、所述任期与行动年代分开，不从任期相交生成行动。导航独立超时、缓存、重试与过期保护，不阻断原正文及地图。模型、实际核读与校验见[权力专题](power.md)。

## 官职与帝号时间轴

`build_timeline.py` 将五卷已收录任职、帝号阶段与明确空缺投影为 `data/timeline/index.json`，`data-source/timeline/editorial.json` 只维护专题入口及有源文本依据的实权提示。`timeline/` 支持分轨图形、手机等价列表、范围与筛选、缩放、详情和分享；原卷年度与人物入口均为直接链接，不依赖此投影加载成功。发布日期指纹、全量保留／精度校验和根路径／Pages浏览器回归纳入现有流程。不修改源schema，不自动合并跨卷人物或推断宫廷及实权；详见[时间轴说明](timeline.md)。


## 人物、事件与地点互链

`data-source/events/links.json`维护逐项文本依据、角色和引用，`event_links.py`在统一事件构建中严格校验；原卷数据不迁移。`places/`与`events/`共用`shared/event-data.js`加载完整事件文字，原卷及跨卷人物页通过小型可选导航反查关系。地点搜索、反向年度、跨卷聚合及失败恢复均使用显式ID，不从正文提名或任期建立关系。完整约定见[互链说明](event-links.md)。

## 职官、称号与制度词典

`data-source/glossary/entries.json` 独立维护有来源的词条、分期、权力限制和阅读例子；`build_glossary.py` 生成完整词典与小型内联投影，严格检查卷内人物、历史年份、分期和引用。`glossary/` 提供目录及稳定词条／分期路由；全站搜索按适用卷投影术语。五卷通过可关闭的原生对话框提供正文释义，静态入口、正文、地图及防剧透仍独立；原卷只载入约32KB内联资料。显式例子提供年度／人物回链，不从正文匹配建立任职。发布构建、指纹、子路径、失败恢复和键盘回归进入现有流程；语义、实际核读范围及维护见[制度词典](glossary.md)。

## 王朝专题与关系网络

王朝辅助节点也可反查[实际权力与摄政](power.md)中的本人角色与行动，身份保持同一明确节点。

`build_dynasties.py`保留三卷帝国原有分类及来源，以人工跨卷身份、统一事件和任期阶段作只读投影；`data-source/dynasties/relations.json`维护逐边有出处的血缘、婚姻、收养、政治指定及帝位承接。辅助人物不进入皇帝名录，同姓、同标签、相邻任期均不生成关系。`dynasties/`提供专题、分层SVG与等价列表、来源、筛选及下载；搜索和人物页双向连接，人物仅独立请求小型导航。发布指纹、子路径、失败恢复和CI同步维护。详见[王朝专题](dynasties.md)。

## 五卷连续叙事

`data-source/stories/stories.json`维护新编连续剧本；`build_stories.py`用只读适配保留共和国十部原版，并在权力资料之后、搜索之前生成完整编辑版与小型人物／年度导航。`stories/`以稳定故事／章节ID提供目录、章节、逐项出处、相对原档案链接、统一本机进度和可选防剧透。五卷原年度与人物通过独立可重试导航反查，未定年王政事迹只有阅读锚点，不升级为年度事件；不会从正文、同名或任期自动生成关系。原共和国页共用进度键且旧路由保持。详见[连续剧本](stories.md)。
