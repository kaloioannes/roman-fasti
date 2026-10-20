"""Claim-level evidence overlay; never upgrades or replaces inherited citations."""
import copy
import datetime
import re
from urllib.parse import urlsplit

SOURCE_KINDS = {'ancient': '古代与中世纪文献', 'modern': '现代研究',
                'navigation': '百科与研究导航', 'unclassified': '沿用资料 · 类别待编订'}
ACCESS = {'text': '正文／译文指定段落', 'excerpt': '节选', 'abstract': '仅摘要',
          'bibliography': '仅书目', 'indirect': '间接引述', 'legacy': '沿用前次记录，阅读范围未细分'}
# Exact editorial source types already declared by the volumes. This is not a
# keyword classifier, and assigning a category never changes reading status.
SOURCE_TYPES = {**dict.fromkeys(['ancient', '古代文献', '古代编年史 · 拉丁文', '古代叙事 · 1890年英译',
    '中世纪史料 · Dawes译本1928', '古代史料 · Dewing译本1914', '中世纪史料 · Sewter译本',
    '中世纪史料 · Munro译节1912', '目击史料 · 出版社教学节选', '同时代诗文 · 建筑描述', '古代法律 · 拉丁文'], 'ancient'),
    **dict.fromkeys(['scholarship', 'archaeology', '学术综述', '学者署名研究', '现代署名研究', '现代学术研究',
    '近代研究 · 1923年公版全文', '公开旧通史 · 1892/1902', '开放学术综述 · 2022', '钱币研究', '外交文书研究',
    '现代历史研究', '学术研究', '钱币学研究', '历史地震与古地震学研究', '研究论文', '近代研究 · 1923',
    '现代学术研究 · Cambridge History of the Byzantine Empire, ch.17', '现代学术研究 · 2012',
    '现代学术专著 · 公开卷首、人物表与统治者表'], 'modern'),
    **dict.fromkeys(['研究导航', '史料目录与研究导航', '公有领域教会史百科', '协作百科 · 文书专题',
    '协作百科 · 主题专条', '协作百科 · 研究导航', '研究书目', '大学托管教学年表', '现代年表', '博物馆年表',
    '历史学者年表', '手稿数据库', '学者手稿目录', '学术数据库', '学术人物志 · Prosopography of the Byzantine Empire',
    '人物志', '钱币目录', '博物馆钱币目录', '大学钱币目录', '实物目录'], 'navigation')}


def apply_evidence(entries, read, require, volumes):
    sources = read('data-source/evidence/sources.json')
    dossiers = read('data-source/evidence/dossiers.json')
    def text(v): return isinstance(v, str) and bool(v.strip())
    def url(v):
        return isinstance(v, str) and urlsplit(v).scheme == 'https' and bool(urlsplit(v).netloc)
    def ident(v): return isinstance(v, str) and bool(re.fullmatch(r'[a-z][a-z0-9-]*', v))
    for id, s in sources.items():
        require(ident(id) and s['kind'] in SOURCE_KINDS and s['kind'] != 'unclassified'
                and all(text(s.get(k)) for k in ('label', 'author', 'edition', 'limitations'))
                and url(s.get('url')), f'Invalid evidence source: {id}')
    used_sources = set()
    by_url = {s['url']: s for s in sources.values()}
    inherited_kinds = {}
    for volume in volumes.values():
        catalog = volume.get('sources', {})
        if isinstance(catalog, dict):
            for source in catalog.values():
                if isinstance(source, dict) and 'url' in source and source.get('kind') in SOURCE_TYPES:
                    inherited_kinds[source['url']] = SOURCE_TYPES[source['kind']]
    for e in entries.values():
        # Reading an event does not re-read every book in its inherited bibliography.
        for i, ref in enumerate(e['references'], 1):
            known = by_url.get(ref['url'])
            ref.update(id=f'legacy-{i}', sourceKind=known['kind'] if known else 'navigation' if urlsplit(ref['url']).hostname in
                       {'en.wikipedia.org', 'zh.wikipedia.org'} else inherited_kinds.get(ref['url'], 'unclassified'), access='legacy',
                       scope='沿用已有查阅记录；本次未逐项重新核读，原定位和核对日期保留。')
        e['evidence'] = None
    for id, dossier in dossiers.items():
        require(id in entries, f'Orphan evidence dossier: {id}')
        require(text(dossier.get('scope')) and dossier.get('claims') and dossier.get('citations')
                and isinstance(dossier.get('disputes'), list), f'Incomplete evidence dossier: {id}')
        citations, cited = {}, set()
        for ref in dossier['citations']:
            key, source = ref.get('id'), ref.get('source')
            require(ident(key) and not key.startswith('legacy-') and key not in citations
                    and source in sources, f'Invalid evidence citation identity: {id}')
            require(all(text(ref.get(k)) for k in ('locator', 'claim', 'scope'))
                    and ref.get('consultation') in {'direct', 'indirect'}
                    and ref.get('access') in ACCESS and ref['access'] != 'legacy', f'Incomplete evidence citation: {id}')
            try: datetime.date.fromisoformat(ref.get('checked', ''))
            except (TypeError, ValueError): raise ValueError(f'Invalid evidence check date: {id}') from None
            if ref['consultation'] == 'indirect':
                via = ref.get('via', {})
                require(ref['access'] == 'indirect' and text(via.get('label')) and url(via.get('url'))
                        and text(via.get('locator')), f'Missing indirect evidence path: {id}')
            else:
                require(ref['access'] in {'text', 'excerpt', 'abstract', 'bibliography'}
                        and 'via' not in ref, f'Invalid direct evidence scope: {id}')
            s = sources[source];used_sources.add(source)
            citations[key] = dict(copy.deepcopy(ref), label=s['label'], url=ref.get('url', s['url']),
                                  sourceKind=s['kind'], author=s['author'], edition=s['edition'], limitations=s['limitations'])
            require(url(citations[key]['url']), f'Unsafe evidence locator URL: {id}')
        def references(row):
            refs = row.get('references')
            require(isinstance(refs, list) and refs and len(set(refs)) == len(refs)
                    and all(r in citations for r in refs), f'Broken claim citation: {id}')
            cited.update(refs)
            require(any(citations[r]['access'] != 'bibliography' for r in refs), f'Bibliography cannot support a factual claim: {id}')
        claim_ids = set()
        for claim in dossier['claims']:
            require(ident(claim.get('id')) and claim['id'] not in claim_ids and text(claim.get('text'))
                    and text(claim.get('note')), f'Invalid evidence claim: {id}')
            claim_ids.add(claim['id']);references(claim)
        dispute_ids = set()
        for d in dossier['disputes']:
            require(ident(d.get('id')) and d['id'] not in dispute_ids and text(d.get('question'))
                    and text(d.get('rationale')) and text(d.get('limits')) and len(d.get('positions', [])) >= 2,
                    f'Incomplete evidence dispute: {id}')
            dispute_ids.add(d['id']);position_ids = set()
            for p in d['positions']:
                require(ident(p.get('id')) and p['id'] not in position_ids and text(p.get('label'))
                        and text(p.get('statement')), f'Invalid dispute position: {id}')
                position_ids.add(p['id']);references(p)
            require(d.get('adopted') in position_ids, f'Missing adopted position: {id}')
        require(cited == set(citations), f'Unused evidence citation: {id}')
        entries[id]['references'].extend(citations.values())
        entries[id]['evidence'] = {k: copy.deepcopy(dossier[k]) for k in ('scope', 'claims', 'disputes')}
    require(used_sources == set(sources), 'Orphan evidence source')
    return SOURCE_KINDS, ACCESS
