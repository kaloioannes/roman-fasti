# Data licensing and attribution

## 实际权力与摄政专题（PR12）

`data-source/power/people.json`、`data/power/`及`docs/power.md`的原创中文重述、角色与行动编订、链接说明使用CC BY-SA 4.0，署名FASTI · 罗马历史纪年。复用原卷身份与PR11王朝节点，不改变原资料许可。古代文献、电子译本与DIR署名研究保留各自版权；本专题提供定位与短篇重述，没有重新许可整篇研究或把链接书目当作已读资料。实际查阅范围、材料局限与作者版本逐条保留，见[研究说明](docs/power.md)与[编辑资料](data-source/power/people.json)。

This repository separates software licensing from historical source licensing.

Dynasty dossiers and edited relationship data in `data-source/dynasties/` and `data/dynasties/` are new Chinese paraphrases and structured editorial work by **FASTI contributors (2026-10-20)**, released under CC BY-SA 4.0. They retain the original volume classifications, titles and cited sources. Each authored relationship credits its source and locator; consultation scopes and source limitations are preserved in JSON exports. Rolfe, Church/Brodribb and Dawes translations retain their hosting edition notices; Andrew Stone's DIR studies retain the author's copyright. No complete external text, photographs or genealogical artwork is redistributed. See [the dynasty research and maintenance notes](docs/dynasties.md).

## Historical text, magistrate and ruler data — CC BY-SA 4.0

`data/republic/records.json`, `data/republic/stories.json`, the roster/profile snapshots, the name glossary, annual events, biographies and stories in `data-source/republic/` are distributed under the [Creative Commons Attribution-ShareAlike 4.0 International license](https://creativecommons.org/licenses/by-sa/4.0/).

Attribution: **FASTI contributors and Wikipedia contributors**, 2026. The principal roster source is [List of Roman consuls](https://en.wikipedia.org/wiki/List_of_Roman_consuls); [its revision history](https://en.wikipedia.org/w/index.php?title=List_of_Roman_consuls&action=history) identifies contributors. Profile data retains the original article titles and the corresponding article URLs in the compiled person records; those articles' histories identify their contributors. Chinese article names were obtained through Wikipedia language links. Retrieval date: 2026-10-07.

Changes: structured extraction; expansion and normalization of Latin praenomina; Chinese transliteration and name conversion; explicit treatment of unusual offices; new Chinese paraphrases of historical events; appointment-derived summaries and explicitly matched editorial biographies with retained source links. The biography identity manifest is included under the same license; existing source links were migrated without a new claim of direct verification. Identities lacking an individual source link remain separate annual records. Please retain source URLs, this attribution and the share-alike license when redistributing adapted data.

The ten stories are original Chinese narratives by FASTI contributors (2026-10-15), with references to Livy, Plutarch, Appian, Diodorus, Cicero, Cassius Dio and inscriptions. Each chapter links to its source and identifies the relevant passages.

The imperial volume (`data/empire/records.json` and authored TSV/JSON files in `data-source/empire/`) consists of new Chinese historical summaries by FASTI contributors (2026-10-17), released under the same CC BY-SA 4.0 license. Its source catalogue distinguishes ancient texts, modern signed studies and numismatic evidence. Linked DIR essays and other modern scholarship retain their authors' copyright; their full text and images are not redistributed here. Ancient translations retain the notices of their hosting editions. The imperial GIS subset and derived map retain Cliopatria's separate CC BY 4.0 attribution; see the imperial research notes and THIRD_PARTY.md.

Linked editions and translations retain the credits provided by their hosts, including the translations at Attalus. Attalus also provides the annual source index. The Chinese prose is written for FASTI. Scholarly books and scanned pages are linked for further reading.

The Kingdom volume (`data/kingdom/records.json` and authored files in `data-source/kingdom/`) contains original Chinese summaries, a traditional chronology and approximate place markers by **FASTI contributors (2026-10-18)**, released under CC BY-SA 4.0. Ancient texts and modern archaeological evidence are linked with passage references and limits described in the [Kingdom research notes](data-source/kingdom/RESEARCH.md). No modern source text, imagery or GIS boundaries are redistributed. Place coordinates are editorial approximations for orientation, not surveyed boundaries or independently verified annual territorial claims. The existing software and shared asset licenses remain as described here and in THIRD_PARTY.md.

## Historical geometry — CC BY 4.0

`data/republic/territories.json` and `data-source/republic/roman-territories.geojson` derive from **Cliopatria v0.2.0**, Seshat Global History Databank, James S. Bennett and collaborators. See the [versioned release](https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.0), [Zenodo project record](https://zenodo.org/records/13363121), and [data paper](https://doi.org/10.1038/s41597-025-04516-9).

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Changes: selected Roman Republic and early Roman Empire features; limited display to 509–27 BCE; clipped polygons to Natural Earth 1:50m land; simplified at 0.008 degrees while preserving topology; reoriented rings for D3 spherical rendering; replaced the two faulty 500–338 BCE grid fragments with five independently authored editorial schematic stages covering 509–338 BCE; added display ranges, view bounds and Chinese captions. Original source year ranges remain on the retained Cliopatria features. The new schematic geometry in `data-source/republic/early-territories.geojson` is released under MIT, independently of the original CC BY 4.0 GIS. Historical references support the event anchors, not surveyed border vertices; see [the audit](docs/historical-corrections.md).

Natural Earth geographic data is in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Its present-day coastline provides the detailed land boundaries used to clip the historical polygons.


## Byzantine volume — CC BY-SA 4.0 text; CC BY 4.0 GIS

`data-source/byzantine/{people,events,sources,dynasties,method}.json` and `data/byzantine/records.json` contain new Chinese summaries and editorial selections by **FASTI contributors (2026-10-18)**, under CC BY-SA 4.0. Name, identity and chronology research also uses the individually linked Wikipedia articles; attribution: **Wikipedia contributors**, with revision histories available through each article's History link. The source catalogue preserves these URLs. Changes include Chinese paraphrase, normalized Greek names, separate title stages, positive-evidence-only purple-born tags and explicit annual data gaps.

Ancient and medieval texts, DIR essays, modern scholarship, translations, museum descriptions and images retain their respective rights. This repository links to them; it does not bundle their full text or photographs. Source hierarchy, indirect citations and limits are documented in [the Byzantine research notes](data-source/byzantine/RESEARCH.md).

`data-source/byzantine/territories.geojson` selects 139 features from **Cliopatria v0.2.0**, by Seshat Global History Databank, under CC BY 4.0. `data/byzantine/territories.json` retains source attributes, clips time to 476–1453 and geometry to Natural Earth, simplifies by 0.008 degrees, orients rings for D3 and adds four polity colours. Two explicitly approximate neighboring reference layers cover the original Byzantine 1402–1406 gap. Original 1440–1467 source dating is preserved as provenance, not an assertion that Constantinople survived until 1467. Retain this attribution and the original source URL when redistributing the derivative GIS.

拜占庭年度增补（2026-10-18）：主题百科贡献者及页面历史可由 `data-source/byzantine/sources.json` 各专条链接追溯；中文记事为重新撰写的事实综述，继续以 CC BY-SA 4.0 发布。根特大学 DBBE 元数据原许可 CC BY 4.0；署名研究、手稿影像和现代译本不随仓库复制。

## Divided Empire volume — CC BY-SA 4.0 text; CC BY 4.0 GIS

`data-source/divided-empire/{people,events,vacancies,method,sources,dynasties,places}.json` and the compiled `records.json` / `places.json` contain new Chinese summaries and editorial selections by **FASTI contributors (2026-10-18)**, under CC BY-SA 4.0. Linked ancient texts, public-domain Bury chapters and modern DIR essays are attributed individually in the source catalogue; modern essays are not reproduced in full. See [the research notes and annual source matrix](data-source/divided-empire/RESEARCH.md) for evidence and date variants.

The GIS subset selects Eastern and Western Roman Empire POLITY features intersecting 395–476 from **Cliopatria v0.2.0**, by **Seshat Global History Databank**, under CC BY 4.0, pinned to commit `ad28a691b7c07c1fca89d0e0636d324667d2a258`. Original attributes and source intervals are preserved. Derived display layers clip time to 395–476, intersect Natural Earth 1:50m land, simplify at .008 degrees and orient exterior rings clockwise for D3. The 476 western layer is a pre-deposition reference, not a claim of an Italian imperial court after September. Natural Earth is public domain. Retain these attributions with redistribution.

## Institutional glossary — CC BY-SA 4.0

`data-source/glossary/entries.json` and `data/glossary/` contain Chinese paraphrases, period-specific explanations and explicitly sourced reading examples by **FASTI contributors (2026-10-20)**, under CC BY-SA 4.0. Source records individually credit Livy / D. Spillan, Polybius / W. R. Paton, Augustus / F. W. Shipley, Tacitus / J. Jackson, Suetonius / J. C. Rolfe, Eutropius / J. S. Watson, Anna Komnene / E. A. S. Dawes, William Smith and colleagues / George Long, the **Münzkabinett, Staatliche Museen zu Berlin** (IKMK 18204181, catalogue text CC BY-SA 4.0), and the **British Museum** (1852,0903.35, institutional description on Google Arts & Culture). Changes include original Chinese synthesis, separated chronological senses, power/limitation distinctions and relative links to existing archives. Full books, museum photographs and modern scholarly articles are not redistributed. Authors, editions, exact locators, actual reading scope and limitations are retained in each downloaded entry; see [the glossary research and maintenance notes](docs/glossary.md).

## 五卷连续剧本（2026-10-21）

`data-source/stories/`与`data/stories/`中新编中文导读及资料投影由FASTI contributors撰写，CC BY-SA 4.0；共和国原文及原版引用保留原署名。李维、拉克坦提乌斯、普罗柯比、苏格拉底、安娜、维尔阿杜安的电子译本、马尔凯利努斯拉丁文及吉本公版注本用于指定段落核对；DIR署名研究只作来源链接与独立中文简述，不转载全文或图片。所有外部译本、现代文章及机构网页仍归其权利人。直接查阅、沿用和间接路径逐项保存在来源记录，范围见[剧本研究说明](https://github.com/kaloioannes/roman-fasti/blob/main/docs/stories.md)。

## 地点档案与事件地图（PR14）

`data-source/places/gazetteer.json`中的原创中文地点说明及关系编订由FASTI contributors（2026-10-21）以CC BY-SA 4.0发布。27项外部地点身份、名称标期及24处舍入代表点改编自Pleiades官方数据，保留其[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)及逐条creators／contributors署名。修改包括选择、中文重述、代表点四位小数舍入、精度／不确定性说明及本项目事件连接；没有重新许可Pleiades所引图册。每份地点与地图JSON导出保留来源、固定版本文件、定位、实际查阅范围和许可。完整说明见[地点档案](docs/places.md)。Natural Earth底图保持公有领域，原疆域及原卷资料许可保持各自归属。
