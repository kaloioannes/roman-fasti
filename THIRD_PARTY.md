# Third-party assets

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

## Institutional vocabulary references

The glossary adds no third-party runtime, font or image asset. Its individually credited texts, editions, historical dictionaries and institutional catalogue records are listed in `data-source/glossary/entries.json` and [DATA_LICENSE.md](DATA_LICENSE.md). New Chinese paraphrases and edited institutional explanations use CC BY-SA 4.0; external translations, museum descriptions and photographs retain their respective rights. The Berlin Münzkabinett IKMK 18204181 text is credited under CC BY-SA 4.0. No museum images or complete external books are bundled.
