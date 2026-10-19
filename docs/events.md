# 事件对象：查询、日期、关联与引用

`events/` 提供五卷统一事件目录与 `#event=<稳定ID>` 档案。全站搜索的事件结果进入此页；原卷每条记事附“独立档案与引用”，原来的年度与数字序号定位继续工作。搜索可按主题、资料类型、纪年、分卷、年份范围、已编订人物及地点组合筛选、分页、分享和返回。文本检索支持原有的中／拉／希文规范化；数字年份并列解释公元与公元前。

## 本次迁移与内容范围

全部2,082条既有记事保留标题、正文、原始引用和年度成员关系，不改人物、任职、地图或剧本。共和国512条和古典帝国426条的ID显式写入源行；其余三卷沿用原ID。源ID只在卷内唯一；全站键为 `period:localId`。ID中可能包含最初归置年份，但它只是一个不透明名称，校订日期后不能据新日期重命名。修改正文或排列绝不重新生成ID。

新增六个独立对象：1071年的曼齐刻尔特战役、巴里失守，1202—1204年远征行动过程，以及1204年的攻城、洗劫、拉丁皇帝加冕。两条原年度摘要仍保留原ID，通过 `expands` 关联。子事件可通过 `part-of` 连接过程；查询结果按不同对象列出，不能将父过程、子事件和原摘要相加作为战争／历史事件总数。目录与各卷原有统计口径分别说明。

原卷条目大多是年度摘要，尚未逐条拆分为原子事件；本次明确标为 `annual-summary`，不把一段同时写多件事的文字自动宣称为独立事件。古典帝国原来注明的跨年背景为 `background`；王政的传统节点与未定年事迹为 `tradition`。951—952年《治理帝国》文内纪年、1012年9月至1013年8月的抄本题记各保持一个事件对象，以日期窗口关联两个公元年。原年度的归置位置也保留。

全部旧条目具有显式元数据，初始分类依据原卷的类别、纪年标签和研究说明。年度摘要的日期 `extent=context`、`basis=annual-placement` 只表示编辑归置，不能据此推定段内各行动的发生年份。33条古典帝国记事原已明确写出的跨年范围另结构化为 `source-window`；没有明确端点的背景或互相竞争的端点说法不补猜测范围。非共和国且尚未进一步编订的主题为 `general`（综合记事）；关联人物／地点为空表示尚未编订，不表示没有参与者或地点。不会用在位任期或正文提名补造关系。

## 编辑源与生成物

| 文件 | 职责 |
|---|---|
| `data-source/republic/events.tsv` | `id|year|title|description|category|ref`，年份仍为正数BC |
| `data-source/empire/events.tsv` | 新增显式 `id` 列，其余列不变 |
| `data-source/events/metadata.json` | 所有既有条目的类型、日期、主题、明确人物／地点关联；一对象一行方便审阅 |
| `data-source/events/events.json` | 新编独立对象；完整正文、引用、日期与事件关系 |
| `data-source/events/places.json` | 有依据的地点身份和异名；本项不提供坐标、控制权或完整地点史 |
| `data-source/events/aliases.json` | 有依据的旧ID到现存ID的一跳迁移，当前为空；禁止覆盖现存ID、链式跳转与坏目标 |
| `data/events/index.json` | 完整静态查询投影，含 `byYear/byPerson/byPlace` 反向索引 |
| `data/events/navigation.json` | 原年度／人物页使用的小型可选链接投影 |

新条目必须显式给ID、元数据与出处。删除、合并或拆分必须由编辑决定：优先保留原摘要并关联新条目，真正退休的ID写迁移表。此表不支持自动猜测同一事件。构建拒绝缺失／孤立元数据、重复身份、无效日期、坏人物／地点／事件引用、循环关系、缺失来源及无效枚举；提交源资料和生成物。

## 人物—事件—地点互链（PR08）

五卷原条、人物专页、跨卷总档案和地点档案现已连通。编辑表`data-source/events/links.json`保存逐项角色、原文短引与沿用出处；完整投影增加`placeRelations`与`byGlobalPerson`，保留原`places`及事件URL兼容。地点入口为`places/#place=<ID>`，旧`events/#place=<ID>`筛选继续可用。新编订覆盖85条重点记事，地点增至26处；此前的“五处地点”与人物覆盖描述属于PR06当时范围。关系引用不冒充本次重新直接核读。使用、证据边界和校验详见[互链说明](event-links.md)。

## 日期模型

统一历史年份：公元前为负数，无0年；输出共和国年度URL时显式取反。月／日使用数值字段，`precision=year/month/day` 必须与实际字段一致，缺少月日不能补1月1日。沿用原史料日期，不自动换算到现代公历。

- `extent=point`：发生点，按端点原精度显示。
- `span`：持续过程，端点之间的年度属于所编订过程。
- `window`：可能发生／纪年的窗口，不表示行动持续整个窗口。
- `context`：原卷年度归置，不能理解为独立事件发生日。
- `undated`：无端点，不展开伪精确年度。

`certainty=certain/approximate/disputed/traditional/unknown` 与说明正文分离。`qualifiers` 允许同时保留约年、异说、传统、跨年、历法换算与最迟年代。`basis/note` 解释采用范围及局限。旧帝国页筛选现在直接使用 `recordKind`、`date.certainty/qualifiers`，不再对中文说明做正则判断。原标签仍显示，校订文案不会改变筛选分类。

一个对象的年度关联按端点范围建立，跨年与跨分卷交界都不会复制对象；反向索引每个年度只存一次ID。搜索的年份匹配也使用同一日期范围。统计应区分唯一对象、独立事件、摘要、传统和年度关联数；2,088是当前唯一对象数，不能解释为2,088件独立史实。

## 证据、实际查阅与保留不确定性

2026-10-19直接阅读以下可定位材料；没有复制译文全文或将其参考书目计作已读：

- [普塞洛斯卷VII，Sewter英译](https://sourcebooks.web.fordham.edu/basis/psellus-chrono07.asp)，Romanus IV §§18—26及译者注265／268：战败与被俘；8月26日来自译者注，而非正文自载确日。作者参与宫廷政治，非战场目击者。
- [阿普利亚的威廉，G. A. Loud英译](https://ahc.leeds.ac.uk/download/downloads/id/965/the-deeds-of-robert-guiscard-by-william-of-apulia.pdf)，卷III，PDF印页32—33：巴里交付；诺曼立场鲜明，未采用颂扬性的统治评价。1071年度归置沿用原卷；本项不补交城确日。
- [维尔阿杜安，Marzials英译](https://sourcebooks.web.fordham.edu/basis/villehardouin.asp)，页面保留原书13、64、67—69页，分别查阅集结、入城／逃离和鲍德温加冕段：跨年行动及4月12日、5月16日。亲历者为远征参与者，叙述有辩护倾向。范围只指1202—1204行动阶段，不声称覆盖此前倡议和之后所有战争。
- [霍尼亚提斯洗劫节选，Munro英译](https://sourcebooks.web.fordham.edu/source/choniates1.asp)，原译15—16页：宗教财物劫掠与居民受难。采用正文，不沿用网页导言中对教会关系的过度概括；洗劫的全部起讫日未确定。

新引用保存 `label/url/locator/claim/consultation/checked`。`direct` 指本次阅读页面或译文，不能理解为核读原手稿。`indirect` 必须说明间接依据。旧引用统一为 `inherited`、核对日期为空，明确本次未逐条重新核读；继承下来的宽泛定位不伪装为精确的论断证据卡。951／1013题记范围沿用原卷，未重新查阅馆藏原图。后续证据深化与全面内容拆分仍需逐项研究，不以覆盖配额替代研究。

## 加载、引用与验证

事件目录只请求独立文字索引，不请求五卷完整档案和地图；20秒中止、缓存成功值、共享在途请求、原页重试、过期路由保护。可选关联链接失败不会阻塞原年度文字，具有独立重试。复制引用包含标题、类型、稳定ID、资料内容指纹版本、当前部署路径URL、上海时区访问日期和许可；内容变化会更新版本而不改变ID。剪贴板受限时选中文字供手动复制。单条JSON保留出处、许可及所关联地点资料。隐藏摘要沿用搜索／防剧透偏好，受限存储仍可阅读。

```sh
python scripts/build_data.py
python scripts/build_empire.py
python scripts/build_byzantine.py
python scripts/build_divided_empire.py
python scripts/build_events.py
python scripts/build_search.py
npm run test:events
npm run validate
npm run build
npm run validate:release
npm run test:events-ui
```

发布构建自动重建事件与搜索投影。CI检查源数据重建一致性、结构引用、日期边界、文本／顺序修改后ID不变、跨年与题记去重、迁移表，以及真实HTTP的五卷原条与旧数字定位、根路径／Pages子路径、组合筛选、分享返回、复制与导出、失败恢复、快速换页、可选关联独立失败、手机与明暗主题。各卷既有浏览器回归继续运行。
