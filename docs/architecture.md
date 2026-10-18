# 架构与新增时期指南

## 项目身份

项目展示名为 **FASTI · 罗马历史纪年**，软件包名为 `roman-fasti`。GitHub 仓库地址暂保留 `kaloioannes/roman-republic-fasti`，站点部署仍使用该 Pages 子路径。仓库改名会改变部署地址，需要单独安排 URL 迁移；本次 PR 不依赖仓库设置变更。

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
- 人物 ID 只在本篇内唯一；跨时期引用使用 `(periodId, personId)`。对跨前27年或395年的同一人物，未来可增加有来源的身份映射，不能仅按姓名自动合并。
- 王政篇使用负数年份；`years[-753]`、`#year=-753` 表示前753年。王期两端为传统交接点，年度桶包含端点，不表示全年在位。`events` 是传统纪年节点；`traditions` 仅为未定年的王期背景，两者不可合并统计。塔提乌斯空值任期不展开，空位另以 `interregnum` 标记。地点示意不提供疆界；完整约定见 `data-source/kingdom/RESEARCH.md`。
- 双帝国篇 `divided-empire` 已开放：`side=west/east/both`，`kind`区分实际宫廷、共帝、争位、流亡、恺撒和有争议帝号；对方承认另记于 `recognition`。`vacancies`为有出处的宫廷间隔，466年不伪造西帝。`startDate/endDate`分年/月/日精度，可用标签标异说。尼波斯终点480年、芝诺终点491年保留，但年度展开止于476年。395与476年交叠是分卷安排。

## 构建与 URL

`build_site.py` 自动发现 `site/` 下的 HTML、CSS、JavaScript 和 `data/` 下的 JSON，并为 JSON、第一方 CSS/JS 生成 SHA-256 内容指纹。`asset-manifest.json` 的键始终相对于发布根目录。重写时将每条引用解析到资源，再转回相对于当前页面／样式表的路径。新增文件通常无需修改构建文件列表。

HTML 入口保持稳定，数据、CSS、JS 使用指纹文件。第三方库及字体按共享资源原名复制。全部站内路径采用相对 URL，兼容域名根目录和 `/roman-republic-fasti/`。静态目录 URL 使用结尾的 `/`。

构建前只清理上一次清单拥有的指纹文件；重复构建不会不断累积旧指纹。自定义输出目录必须与源目录分离。构建输出还包含代码与数据许可证和第三方署名。

| 旧路径 | 当前路径 |
|---|---|
| `/`（无 hash） | 总入口 |
| `/#year=44`、`/#stories`、`/#story=…&year=…` | `/republic/`，保留完整 hash 与查询参数 |
| `/emperors.html#…` | `/empire/#…`，保留完整 hash 与查询参数 |
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

`build_kingdom.py` 重建王政篇；`validate-kingdom.mjs` 校验传统王期、年度连续性、空位与未定年事件分离；`test-kingdom.cjs` 检查年度、人物、下载、失败恢复及相关地点示意。


## 拜占庭分卷

`byzantine` 已开放，476—1453年，独立 `greek` 显示字段；`junior` 为共帝，`central` 为本卷继承主线，不能将人物总数解释成主帝人数。`purple` 为附 `note/sources` 的正面证据对象或 `null`（尚未确认）。`years[y].events` 可为空，`eventStatus` 明确资料缺口；禁止以重复跨年背景填充。原始事件保留稳定ID。

`build_byzantine.py` 和 `validate-byzantine.mjs` 负责资料编译和语义检查；`test-byzantine.cjs` 负责根目录/Pages子路径、所有人物、任期边界、希腊文检索、紫室筛选、下载、地图、失败恢复和响应式回归。`build_byzantine_map.py` 沿用海岸裁切工具，独立政权分层，原属性与显式近似均保留。收录及年代冲突以 `data-source/byzantine/RESEARCH.md` 为准。

## 双帝国分卷

`build_divided_empire.py`离线编译文字与据点；`build_divided_empire_map.py`用Shapely处理固定版本Cliopatria东西部图层。年度页用双栏对读，手机纵向排列；历史承认不由GIS推断。`validate-divided-empire.mjs`与`test-divided-empire.cjs`覆盖数据语义、全部82年、33份档案、源定位、下载、独立失败恢复、两种部署路径与手机明暗主题。研究说明和逐年出处矩阵在`data-source/divided-empire/RESEARCH.md`。

## 统一分卷导航与兼容层

`project.json` 是分卷顺序、名称和边界的唯一配置。`build_site.py` 用 `catalog-card.html.template` 生成首页五卷入口，并替换各篇的 `period-footer` 标记，生成前一卷／全部时期／后一卷。首页无需运行时请求即可使用。卷面建筑线稿存于 `shared/assets/periods.svg`。

`shared/periods.js` 读取同一份带指纹的清单，为年度页的 `data-period-boundary` 插槽填入边界链接；共和国传入负数历史年份，输出其路由时转回正数 BC 键。内部年度不显示跨卷链接，最早和最晚边界不循环；异步返回时检查年份令牌与插槽连接状态，避免快速换年后出现旧链接。

`site/catalog.css`、`site/catalog.js` 仅负责总入口。`shared/legacy-routes.js` 和极小的 `emperors.html` 是公开旧书签的兼容层；后者只跳转并保留查询参数与 hash，不再承载任何帝国界面或重复逻辑。三个帝国篇的通用年度阅读说明放入“史料与方法”的折叠项，年度滑杆直接接正文或边界链接。
