# Data licensing and attribution

This repository separates software licensing from historical source licensing.

## Historical text and magistrate data — CC BY-SA 4.0

`data/republic.json`, `data/stories.json`, the roster/profile snapshots, the name glossary, annual events, biographies and stories in `data-source/` are distributed under the [Creative Commons Attribution-ShareAlike 4.0 International license](https://creativecommons.org/licenses/by-sa/4.0/).

Attribution: **FASTI contributors and Wikipedia contributors**, 2026. The principal roster source is [List of Roman consuls](https://en.wikipedia.org/wiki/List_of_Roman_consuls); [its revision history](https://en.wikipedia.org/w/index.php?title=List_of_Roman_consuls&action=history) identifies contributors. Profile data retains the original article titles and the corresponding article URLs in the compiled person records; those articles' histories identify their contributors. Chinese article names were obtained through Wikipedia language links. Retrieval date: 2026-10-07.

Changes: structured extraction; expansion and normalization of Latin praenomina; Chinese transliteration and name conversion; explicit treatment of unusual offices; new Chinese paraphrases of historical events; career summaries and editorial biography selection. Identities lacking an individual source link remain separate annual records. Please retain source URLs, this attribution and the share-alike license when redistributing adapted data.

The ten stories are original Chinese narratives by FASTI contributors (2026-10-15), with references to Livy, Plutarch, Appian, Diodorus, Cicero, Cassius Dio and inscriptions. Each chapter links to its source and identifies the relevant passages.

The imperial volume (`data/empire.json` and authored TSV/JSON files in `data-source/empire/`) consists of new Chinese historical summaries by FASTI contributors (2026-10-17), released under the same CC BY-SA 4.0 license. Its source catalogue distinguishes ancient texts, modern signed studies and numismatic evidence. Linked DIR essays and other modern scholarship retain their authors' copyright; their full text and images are not redistributed here. Ancient translations retain the notices of their hosting editions. The imperial GIS subset and derived map retain Cliopatria's separate CC BY 4.0 attribution; see the imperial research notes and THIRD_PARTY.md.

Linked editions and translations retain the credits provided by their hosts, including the translations at Attalus. Attalus also provides the annual source index. The Chinese prose is written for FASTI. Scholarly books and scanned pages are linked for further reading.

## Historical geometry — CC BY 4.0

`data/territories.json` and `data-source/roman-territories.geojson` derive from **Cliopatria v0.2.0**, Seshat Global History Databank, James S. Bennett and collaborators. See the [versioned release](https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.0), [Zenodo project record](https://zenodo.org/records/13363121), and [data paper](https://doi.org/10.1038/s41597-025-04516-9).

License: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).

Changes: selected Roman Republic and early Roman Empire features; limited display to 509–27 BCE; clipped polygons to Natural Earth 1:50m land; simplified at 0.008 degrees while preserving topology; reoriented rings for D3 spherical rendering; extended the first 500–481 BCE reconstruction to 509 BCE; added display ranges, view bounds and Chinese captions. Original source year ranges remain in feature properties.

Natural Earth geographic data is in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/). Its present-day coastline provides the detailed land boundaries used to clip the historical polygons.
