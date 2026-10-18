# 跨卷人物身份与总档案

PR04 在五卷之上增加独立身份层；本卷人物ID、资料schema、任职、年度成员及旧链接不变。全站入口为 `people/`，稳定总档案例如 `people/#person=roman-augustus`。它是已确认跨卷身份的目录，未将全部人物迁移到新schema；共和国全部人物的索引与专页见[PR05说明](republic-people.md)。

## 当前覆盖及编辑审查

2026-10-19 对五卷全部现有人物的显示姓名、拉丁文、希腊文、原名及本卷ID作候选对照，并逐项审查。去重音、大小写等只用于寻找候选，**构建和前端从不据此合并身份**。共确认七组同一人，另外七组相似姓名保留独立身份；这不是对所有共和国待考条目或全部别名的身份考订。

| 全站ID | 现有本卷人物 | 判断及范围 |
|---|---|---|
| `roman-augustus` | `republic:p6faf564142` ⇄ `empire:augustus` | 屋大维／奥古斯都；汇总前43、33、31、30、29、28、27年七次已收录执政官任职及帝国卷称号 |
| `roman-theodosius-i` | `empire:theodosius-i` ⇄ `divided-empire:theodosius-i` | 379—395年同一皇帝；交界不新增人物或任职 |
| `roman-arcadius` | `empire:arcadius` ⇄ `divided-empire:arcadius` | 383年共帝与395年后主持东方宫廷为同一人 |
| `roman-honorius` | `empire:honorius` ⇄ `divided-empire:honorius` | 393年受号与395年后西部宫廷为同一人 |
| `roman-zeno` | `divided-empire:zeno` ⇄ `byzantine:zeno` | 在位、流亡、复位是同一人的不同阶段 |
| `roman-basiliscus` | `divided-empire:basiliscus` ⇄ `byzantine:basiliscus` | 475—476年东方宫廷同一人物 |
| `roman-marcus-basiliscus` | `divided-empire:marcus-east` ⇄ `byzantine:marcus` | 不同ID的同一共帝，巴西利斯库斯之子 |

拒绝合并的候选全部写入 `distinct`，并有校验和页面说明：

| 双帝国人物 | 拜占庭人物 | 保持独立的理由 |
|---|---|---|
| `constantine-iii` | `constantine-iii` | 五世纪西部争位者与七世纪希拉克略之子；中文姓名、本卷ID相同仍不同人 |
| `constans-ii` | `constans-ii` | 五世纪西部共帝与七世纪东方皇帝 |
| `marcus-britain` | `marcus` | 406—407年不列颠争位者与475—476年东方共帝 |
| `theodosius-i` | `theodosios-son-maurice` | 四世纪皇帝与590—602年莫里斯之子；希腊文同名 |
| `theodosius-ii` | `theodosios-son-maurice` | 五世纪皇帝与莫里斯之子；希腊文同名 |
| `constantine-iii` | `constantine-theophilos` | 五世纪争位者与九世纪狄奥菲洛斯之子 |
| `constantine-iii` | `constantine-basil` | 五世纪争位者与九世纪巴西尔一世之子 |

王政卷与共和国官员名录未发现本次可确认的重叠人物；不因为同属塔奎尼乌斯家族就关联成同一个人。共和国193条身份待考记录也未批量归并。

## 依据与实际阅读范围

人工表在 `data-source/people/identities.json`。每个全站身份有稳定 `id`、别名、编辑说明及本卷 `(period, person)` 引用；每个引用保存 `identityCheck` 身份标记、依据代号和单独的编辑说明。标记固定已检查的姓名、原名或专条身份，ID被错误复用、人物被删除或改名时要求显式复审映射。

`evidence` 记录链接、具体定位、支持的身份论断、来源类别、`direct/indirect` 查阅状态及核对日期。网页可阅读全部依据，没有置信度分数。

本次直接查阅：

- 奥古斯都《功业录》Loeb英译／LacusCurtius，第1、34章：只用于联系首次执政官与获尊号的同一生涯；不将官方宣传当作对政体性质的中立裁定。
- DIR 署名研究：Woods 的 Theodosius I；Nathan 的 Arcadius；Mathisen 的 Honorius；Elton 的 Zeno、Basiliscus、Marcus，使用表中明确标出的生涯／继承段落。
- DIR Imperial Index 的五世纪西部、七世纪东部与两位Marcus条目：只用于辨别不同人；不将整份简表当作日期权威。
- 固定至PR18合入版本的双帝国和拜占庭 `people.json`：对读其既有身份、年代与家属说明，排除其他希腊文同名者。这是直接阅读项目档案，**不是重新核读其全部古代史料或现代专著**。

引用页面的注释书目不自动算作本次已读。没有新增未经证实的生卒、亲属关系或官职。总档案保留原卷任期依据及卷章定位，完整传记可经各卷原档案链接查阅。

## 任职与年度如何汇总

`scripts/build_people.py` 离线投影至 `data/people/index.json`，保留各段完整源记录 `record`、日期文字、精度、身份、承认、地域、备注与来源。共和国从实际年度任职投影，并显式将正数BC键转成负数历史年份；其他卷从实际年度成员读取相关年份。既不根据传记提名创建关系，也不把任期内所有事件写成参与记录。

总档案及本卷“本人的其他时期档案”均可查看全部已收录任职与年度。任期按卷分组：同一阶段在两卷重叠时保留两种表述，不相加计算时长、不自动选择一种日期精度。相关年度按历史年份去重，但交界年仍保留两卷链接。没有公元0年，也不会将超过分卷范围的任期虚构为该卷年度。

**芝诺的现有日期分歧**：双帝国篇记474年2月9日，拜占庭篇记1月29日。本次确认的是同一身份，不裁定该日期；总档案显式提示，两个日期与各自来源原样保留。双帝国篇另有475—476年流亡帝号，和实际掌握君士坦丁堡严格区分。马尔库斯的恺撒称号虽在传记中提及，也未凭空新增缺少日期的任职阶段。

PR05现已提供共和国完整本卷人物页；跨卷原档案入口改为 `republic/#person=<ID>`，相关年度仍逐项定位原年度人物卡。七次执政官卡和本卷人物页均可进入同一总档案，详见[共和国人物](republic-people.md)。所有帝国本卷人物页保留原地址。搜索保留独立分卷结果，只给人工映射的条目增加 `globalPerson/globalURL` 及“本人的跨卷总档案”链接；跨卷别名也仅从人工表导入。

## 构建、失败恢复与验证

```sh
python scripts/build_people.py
python scripts/build_search.py
npm run test:people
npm run build
npm run validate:release
npm run test:people-ui
```

发布构建会先重建身份层再重建搜索，均参与内容指纹和Pages相对路径改写。PR工作流检查生成物一致性、身份测试和浏览器回归。失效本卷引用、重复全站ID／本卷映射、缺少依据／定位／编辑说明、身份标记变更、错误来源URL或将 `distinct` 两端并入同一身份均使校验失败。

共享加载器只读一份人物投影，同页并发请求复用、成功结果缓存；20秒超时、网络／HTTP／JSON／schema失败都有独立重试。跨卷资源失败时本卷正文继续可用；插槽脱离当前路由后，晚到响应不能写入另一人的档案。总档案不加载五卷完整文字、剧本或地图。

`test_people.py` 检查显式身份、坏映射、同名不合并、所有任职原记录、年度成员、边界双入口与不同日期精度。`test-people.cjs` 在根路径和 `/roman-fasti/` 下遍历全部关联人物和原档案，测试双向导航、七次执政官入口、消歧、检索联动、刷新／返回、四种宽度及明暗主题、六类失败恢复、正文独立可用、过期响应、共享请求、存储受限与只加载身份投影。

后续新增跨卷人物需要明确新增身份依据和映射；没有映射不等于已证明不同人。别名、史实修订、卷内ID迁移与身份合并应分别说明，旧全站ID若要改名必须先增加兼容迁移，不能依赖中文姓名变化自动重建ID。
