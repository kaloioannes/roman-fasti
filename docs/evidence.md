# 证据卡、核读范围与异说并读（PR09）

入口：[五卷重点证据卡](https://kaloioannes.github.io/roman-fasti/events/#evidence=curated) · [异说并读](https://kaloioannes.github.io/roman-fasti/events/#evidence=disputed)。

事件目录新增证据编订、资料类别和新增证据阅读范围筛选；查询同时检索作者、定位、论断与异说。各卷原条有证据时提供入口，原年度、人物、地点、事件ID与日期均保留。卡片可用键盘互跳、复制链接、刷新和返回。`events/#event=byzantine%3Amanzikert-1071&evidence=claim%3Adate`定位译注纪年的论断；`evidence=ref:date-note`定位证据卡；`evidence=dispute:siege-model`定位围城模型。无效定位提示后保留事件正文。

## 本次实际研究范围

2026-10-19核读15个材料入口，为26条重点记事编订论断证据，其中7份档案提供异说或口径并读。数量是工作记录，不是贡献配额、独立史实数或覆盖质量目标。

| 分卷 | 对象与核读段落 |
|---|---|
| 王政 | 建城、罗慕路斯消失、努马迎立、卢克蕾提娅、共和国建立：李维I.6–7、16–18、57–60 |
| 共和国 | 前509、前494的两条、前451十人委员会、前449恢复官职：李维I.60、II.1、32–33、III.33–34、52–55 |
| 古典帝国 | 前27称号：《功业录》34；14年接班：《编年史》I.5–7；64年火灾：XV.38–44；378年死讯：阿米阿努斯XXXI.13.12–17 |
| 双帝国 | 431会议：苏格拉底VII.34；476退位与帝号连续性：DIR Mathisen与Nathan两篇署名文章有关段落，Malchus引文明确为间接 |
| 拜占庭 | 532尼卡：普罗柯比I.24有关段；674／678：围城百科导航、Jankowiak大学摘要及Howard-Johnston间接引述；1071被俘：普塞洛斯卷VII及Sewter注265；1202—1204过程、入城、鲍德温加冕：维尔阿杜安指定页；1204洗劫：霍尼亚提斯译文节选15–16页；1205／1208：IOS的Rainer Walther署名工具书及百科指定段 |

逐项定位、译本、支持的论断、阅读范围和局限在`data-source/evidence/{sources,dossiers}.json`，网站与单条JSON下载均保留。只使用简短中文概述与外链，没有打包外部译文、付费专著或图片。

“直接”表示读过所标示电子正文、译文或节选，不意味读过原手稿。Jankowiak 2017年书章只读到伯明翰大学记录的Abstract，出版页码201–228只是书目范围；仅支持“作者提出667—669年说”，不宣称独立复核其论证。Howard-Johnston只经百科转述，间接路径与脚注所列页码显示；DIR的Malchus译文亦记间接路径。百科即使直接读过，也始终归导航类别。

674／678继续作为传统纪年节点，并读持续围城模型、重新定年与否定模型的说法及获取限制，不据摘要改写全部年度。1204／1205／1208首先区别政治起点、称帝与加冕；IOS工具书的1204起算与原卷约1205称帝是不同口径。工具书卒年1222没有据此覆盖项目采用的1221。64年火因、瓦伦斯死法与476年分期也说明采用理由和未决部分。

证据只覆盖列出的论断。例如532条没有因核读尼卡而顺带验证永久和平，14年接班也没有顺带验证所有军团哗变。其余条目提示“尚未编订论断级证据卡”，保留旧引用与前次查阅记录。本项没有宣称重读整个语料库，也没有删除百科来提高表面覆盖率。

## 编辑与模型

编辑源独立于五卷原schema；`event_evidence.py`在统一事件投影叠加资料，不改正文、日期、人物、关系或任职。

- `sources.json`以稳定来源ID记录`kind/label/author/edition/url/limitations`。类别为`ancient`（含中世纪）、`modern`、`navigation`（含研究目录）。旧引用按原卷已声明的来源类型、明确匹配的已编订来源URL或Wikipedia域名补类别，不根据姓名猜测；未能分类的仍为`unclassified`。来源分类不会改变原阅读状态。
- `dossiers.json`以既有事件ID为键，保存`scope/claims/citations/disputes`。论断、引用、异说各有稳定ID，不由正文哈希生成；修文不改卡片链接。
- 新引用包含`id/source/locator/claim/consultation/access/checked/scope`。`locator`存卷章、页码或对象号；可选HTTPS `url`定位具体页面。核对日期为有效ISO日期。
- `consultation=direct/indirect`和`access=text/excerpt/abstract/bibliography/indirect`分开。书目不能单独支持事实论断；间接引述必须带`via.label/url/locator`。来源局限不是可信度百分比。
- 异说保存`id/question/positions/adopted/rationale/limits`。每个立场各有依据，唯一采用项可以是“保留疑问”或“区分阶段”。同一来源转述多个说法不算多个独立见证。
- 输出仍是`data/events/index.json`的加法扩展。旧`references`保留，补类别、阅读范围和`legacy-*`引用ID；新引用追加，未编订对象`evidence=null`。`sourceKinds/access`为显示枚举。原卷只读小型导航的`hasEvidence`，无需完整事件投影，不阻塞文字和地图。

构建拒绝不存在的事件／来源、重复卡ID、缺失论断、坏引用、无间接路径、无效日期／URL／枚举、未使用引用、仅凭书目支持事实、无理由或采用项的异说、孤立来源。提交源资料与生成物。程序检查引用结构，不能证明历史论证成立或来源彼此独立。

## 验证

```sh
python scripts/build_events.py
npm run test:events
npm run build
npm run validate:release
npm run test:events-ui
```

共享加载器保留20秒超时、结构校验、缓存、共享请求和重试；证据损坏也触发资料错误。防剧透继续适用；主动打开证据深链接只展开目标所在折叠项。复制失败提供可选中文本，受限存储仍可阅读。下载包含论断、异说、出处、间接路径、材料类别、版本和许可。

数据回归验证旧引用保留、原日期／正文／年度／人物关系不变、卡ID稳定及坏证据拒绝。浏览器回归覆盖26份档案、筛选、五卷原页、论断与引用往返、卡片分享刷新返回、复制下载、错误恢复、字面文本、受限存储、防剧透、根路径与Pages子路径、320／390／768／1440宽度和明暗主题；通过`test:events`及`test:events-ui`进入原PR工作流。
