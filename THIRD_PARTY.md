# Third-party assets

## 实际权力与摄政（PR12）

权力专题直接阅读指定的LacusCurtius电子译文节选：Perrin译普鲁塔克、Cary译狄奥、Jackson译塔西佗、Dewing译普罗柯比；Fordham收录的Dawes译安娜；以及DIR中Benario、Mathisen、Greatrex、Nathan、Elton、Evans、Garland的指定署名研究段落。各作者、译本、网址、卷章／小节、实际阅读范围、核对日期和材料局限保存在`data-source/power/people.json`，详见[权力专题研究说明](docs/power.md)。直接阅读现代研究不等于直接阅读其转引的古代正文；原文与研究版权各自保留，本项目仅作中文重述与来源导航。

The imperial volume adds `data-source/empire/imperial-territories.geojson` and `data/empire/territories.json`, derived from the same Cliopatria v0.2.0 dataset cited below (CC BY 4.0). Source selection, frame-year aggregation, the 116/117–126 approximation and coast clipping are documented in [the imperial research notes](data-source/empire/RESEARCH.md) and `scripts/build_imperial_map.py`. The 60 source features retain original attributes; 57 derived stages show the combined Roman-world footprint rather than using source polity labels as an emperor chronology.

Imperial historical references are catalogued in `data-source/empire/sources.json`; modern essays, translations and coin photographs retain their original rights. The website links to them and does not bundle their full text or images.

## D3 7.9.0 — ISC

`site/shared/assets/d3.min.js`, Copyright 2010–2023 Mike Bostock. [Project](https://github.com/d3/d3) · [license](https://github.com/d3/d3/blob/v7.9.0/LICENSE).

## TopoJSON Client 3.1.0 — ISC

`site/shared/assets/topojson.min.js`, Copyright 2012–2019 Mike Bostock. [Project](https://github.com/topojson/topojson-client) · [license](https://github.com/topojson/topojson-client/blob/v3.1.0/LICENSE).

## World Atlas / Natural Earth

`site/shared/assets/land-50m.json` is the 1:50m land topology from [World Atlas 2.0.2](https://github.com/topojson/world-atlas), Copyright Mike Bostock, distributed under [ISC](https://github.com/topojson/world-atlas/blob/v2.0.2/LICENSE). Its underlying [Natural Earth](https://www.naturalearthdata.com/) cartographic data is public domain.

## Cormorant Garamond — SIL Open Font License 1.1

`site/shared/assets/roman.ttf` provides the Latin display typography. Copyright 2015 The Cormorant Project Authors. [Project source](https://github.com/google/fonts/tree/main/ofl/cormorantgaramond) · the full font license is included as [`site/shared/assets/FONT-LICENSE.txt`](site/shared/assets/FONT-LICENSE.txt).

Chinese typography uses the device's installed fonts. No proprietary Chinese font is bundled.

## ISC license text

For the ISC-licensed libraries above, permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the applicable copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

## Historical data

See [DATA_LICENSE.md](DATA_LICENSE.md) for Wikipedia contributors, ancient texts, the Attalus index and Cliopatria/Seshat attribution. Website source code has the separate [MIT license](LICENSE).


## Byzantine references and maps

The Byzantine volume's 139-feature source subset and 141-layer derivative use the same Cliopatria v0.2.0 CC BY 4.0 source, Natural Earth coastline and D3/TopoJSON libraries described above. Five original polity labels map to four display colours; alliance and Holy Roman Empire features are excluded. Original attributes, two marked 1402–1406 approximations and final-period limitations are documented in [the Byzantine research notes](data-source/byzantine/RESEARCH.md). No new third-party fonts, images or runtime libraries are bundled.

Historical reference URLs, author/edition descriptions and evidence limits are in `data-source/byzantine/sources.json`. The repository redistributes original Chinese summaries, not complete scholarly articles, translated books or museum photographs.

## Divided Empire additions

The new volume reuses the bundled D3, TopoJSON, Roman font and Natural Earth assets under their existing terms. Cliopatria / Seshat v0.2.0 (CC BY 4.0) supplies separately coloured Eastern and Western Roman Empire stages; source commit, original properties and transformations remain in the source/derived GeoJSON and [DATA_LICENSE.md](DATA_LICENSE.md). No new third-party runtime or image asset is added. Chinese text and historical date decisions are documented in [the research notes](data-source/divided-empire/RESEARCH.md).

## Dynasty relationship references

The dynasty feature adds no third-party library, image or font. Graphs are rendered from individually edited facts using native SVG. Source metadata credits Suetonius (Rolfe translation), Tacitus (Church/Brodribb translation), Anna Komnene (Dawes translation), and Andrew Stone's four DIR studies. Reading scopes, locators and limitations are retained in `data-source/dynasties/relations.json`; all external editions and studies keep their respective notices and rights. Original Chinese paraphrases and edited relationships use CC BY-SA 4.0. No external family-tree artwork or full scholarly text is bundled.

## Institutional vocabulary references

The glossary adds no third-party runtime, font or image asset. Its individually credited texts, editions, historical dictionaries and institutional catalogue records are listed in `data-source/glossary/entries.json` and [DATA_LICENSE.md](DATA_LICENSE.md). New Chinese paraphrases and edited institutional explanations use CC BY-SA 4.0; external translations, museum descriptions and photographs retain their respective rights. The Berlin Münzkabinett IKMK 18204181 text is credited under CC BY-SA 4.0. No museum images or complete external books are bundled.

## Pleiades地点数据

事件地图与地点档案选择性改编Pleiades官方JSON版本[`a7ae25da9f3e872c214725d2a7f2c65f48cfa2c4`](https://github.com/isawnyu/pleiades.datasets/tree/a7ae25da9f3e872c214725d2a7f2c65f48cfa2c4/data/json)，CC BY 3.0。每项creator、规范条目、固定版本、字段定位、修改及查阅范围保存在`data-source/places/gazetteer.json`和生成／导出资料；Pleiades contributors原署名可在规范条目及版本文件查看。详见[研究与许可](docs/places.md)。
