"""Explicit editorial edges. Text matches verify evidence; they never create edges."""
import copy

PERSON_ROLES = {'participant': '直接参与', 'subject': '事件主体', 'mentioned': '仅被提及'}
PLACE_ROLES = {'setting': '发生／行动地点', 'subject': '事件对象地点', 'mentioned': '仅被提及'}


def apply_links(entries, places, volumes, read, require, check_reference):
    links = read('data-source/events/links.json')
    require(isinstance(links, dict), 'Invalid editorial link table')
    for id, row in links.items():
        require(id in entries, f'Orphan editorial links: {id}')
        require(set(row) == {'note', 'people', 'places'} and row['note'].strip(), f'Missing link editorial note: {id}')
        event = entries[id]
        for kind, roles in [('people', PERSON_ROLES), ('places', PLACE_ROLES)]:
            require(isinstance(row[kind], list), f'Invalid link list: {id}')
            for edge in row[kind]:
                fields = {'role', 'basis', 'quote', 'references'} | ({'period', 'person'} if kind == 'people' else {'place'})
                require(isinstance(edge, dict) and set(edge) == fields, f'Invalid editorial edge fields: {id}')
                require(edge.get('role') in roles and isinstance(edge.get('basis'), str) and edge['basis'].strip(), f'Unexplained link: {id}')
                quote = edge.get('quote')
                require(isinstance(quote, str) and quote.strip() and quote in event['title']+'\n'+event['text'], f'Link evidence no longer matches event text: {id}')
                refs = edge.get('references')
                require(isinstance(refs, list) and refs and len(set(refs)) == len(refs) and all(type(i) is int and 0 <= i < len(event['references']) for i in refs), f'Invalid link evidence references: {id}')
                if kind == 'people':
                    require(edge.get('period') in volumes and edge.get('person') in volumes[edge['period']]['people'], f'Broken editorial person: {id}')
                else:
                    require(edge.get('place') in places, f'Broken editorial place: {id}')
            keys = [(e['period'], e['person']) if kind == 'people' else e['place'] for e in row[kind]]
            require(len(keys) == len(set(keys)), f'Duplicate editorial link: {id}')
        # Each row explicitly replaces its event's old projection links. Original
        # volume data stays intact; dropping an existing curated edge is rejected.
        require({(e['period'],e['person']) for e in event['people']} <= {(e['period'],e['person']) for e in row['people']}, f'Lost existing person link: {id}')
        require(set(event['places']) <= {e['place'] for e in row['places']}, f'Lost existing place link: {id}')
        event['people'] = copy.deepcopy(row['people'])
        event['places'] = [e['place'] for e in row['places']]
        event['placeRelations'] = copy.deepcopy(row['places'])
        event['linkNote'] = row['note']

    def enrich(edge, event, kind):
        if isinstance(edge.get('references'), list):
            refs = [copy.deepcopy(event['references'][i]) for i in edge['references']]
            edge['evidence'] = dict(kind='event-text', quote=edge.pop('quote'), note=event['linkNote'],
                                    source='data-source/events/links.json', entry=event['id'])
        else:
            refs = copy.deepcopy(event['references'])
            edge['evidence'] = dict(kind='inherited-editorial', quote=None, note='沿用PR06显式编订关系；不从姓名提名或在位任期推断。',
                                    source='data-source/events/events.json' if not event['origins'] else 'data-source/events/metadata.json', entry=event['id'])
        for ref in refs:
            ref.update(consultation='inherited', checked=None)
            check_reference(ref)
        edge['references'] = refs
        if kind == 'place':
            p = places[edge['place']]
            edge.update(label=p['label'], url='places/#place='+p['id'])
    for event in entries.values():
        for edge in event['people']:
            enrich(edge, event, 'person')
        if 'placeRelations' not in event:
            event['placeRelations'] = [dict(place=p, role='mentioned', basis='沿用PR06明确编订的地点关联；未进一步判定地点角色。') for p in event['places']]
        for edge in event['placeRelations']:
            enrich(edge, event, 'place')
