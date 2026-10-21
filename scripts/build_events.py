"""Uniform, offline event projection. Source schemas and annual URLs are retained."""
import calendar
import copy
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from event_links import apply_links
from event_evidence import apply_evidence
from event_places import apply_places

ROOT = Path(__file__).resolve().parents[1]
KINDS = {'event': '独立事件', 'annual-summary': '年度摘要', 'background': '跨年背景', 'tradition': '传统叙事'}
TOPICS = {'general': '综合记事', 'war': '战争', 'politics': '政治与制度', 'law': '法律与公民权',
          'diplomacy': '外交', 'society': '社会与经济', 'religion': '宗教', 'culture': '文化与文献',
          'city': '城市与建设', 'crisis': '公共危机'}
CERTAINTIES = {'certain': '按所载纪年', 'approximate': '约年', 'disputed': '纪年异说', 'traditional': '传统纪年', 'unknown': '未定年'}
QUALIFIERS = {'approximate', 'disputed', 'traditional', 'multi-year', 'calendar-conversion', 'terminus', 'undated'}


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def check_date(date):
    require(date['extent'] in {'point', 'span', 'window', 'context', 'undated'}, 'Invalid date extent')
    require(date['certainty'] in CERTAINTIES, 'Invalid date certainty')
    require(isinstance(date['qualifiers'], list) and len(set(date['qualifiers'])) == len(date['qualifiers'])
            and set(date['qualifiers']) <= QUALIFIERS, 'Invalid date qualifiers')
    require(date['basis'] in {'annual-placement', 'source-window', 'attested', 'undated-tradition'} and bool(date['note']), 'Missing date basis')
    def endpoint(value):
        require(isinstance(value, dict), 'Missing endpoint')
        y, precision = value['year'], value['precision']
        require(type(y) is int and y != 0 and -753 <= y <= 1453, 'Invalid historical year')
        fields = {'year': {'year', 'precision'}, 'month': {'year', 'month', 'precision'}, 'day': {'year', 'month', 'day', 'precision'}}
        require(precision in fields and set(value) == fields[precision], 'Date precision does not match fields')
        m, day = value.get('month', 1), value.get('day', 1)
        require(type(m) is int and 1 <= m <= 12, 'Invalid month')
        # Julian leap years; no conversion to modern Gregorian dates is asserted.
        max_day = 29 if m == 2 and y % 4 == 0 else calendar.monthrange(2001, m)[1]
        require(type(day) is int and 1 <= day <= max_day, 'Invalid day')
        return y, m, day
    if date['extent'] == 'undated':
        require(date['start'] is None and date['end'] is None and date['certainty'] == 'unknown', 'Undated objects cannot have endpoints')
    else:
        require(endpoint(date['start']) <= endpoint(date['end']), 'Reversed event dates')
        if date['extent'] in {'point', 'context'}:
            require(date['start'] == date['end'], 'Point/context dates must have matching endpoints')


def check_reference(ref):
    require(all(isinstance(ref.get(k), str) and ref[k].strip() for k in ('label', 'url', 'locator', 'claim')), 'Incomplete event citation')
    require(urlsplit(ref['url']).scheme == 'https' and bool(urlsplit(ref['url']).netloc), 'Unsafe citation URL')
    require(ref['consultation'] in {'direct', 'indirect', 'inherited'}, 'Invalid consultation status')
    require(ref['consultation'] == 'inherited' or bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}', ref.get('checked', ''))), 'Missing consultation date')


def year_url(period, year):
    return f'{period}/#year={-year if period == "republic" else year}'


def compile_events():
    periods = [{k:p[k] for k in ('id', 'title', 'start', 'end')} for p in read('project.json')['periods'] if p['status'] == 'available']
    volumes = {p['id']: read(f'data/{p["id"]}/records.json') for p in periods}
    metadata = read('data-source/events/metadata.json')
    additions = read('data-source/events/events.json')
    places = read('data-source/events/places.json')
    apply_places(places, read, require, check_reference)
    aliases = read('data-source/events/aliases.json')
    entries, seen = {}, set()
    for pid, data in volumes.items():
        if pid == 'kingdom':
            records = [(e['year'], i, e) for i,e in enumerate(data['events'].values())]
        else:
            records = [(-int(y) if pid == 'republic' else int(y), i, e) for y,r in data['years'].items() for i,e in enumerate(r['events'])]
        for y, position, source in records:
            key = pid + ':' + source['id']
            require(key not in seen, f'Duplicate source event: {key}');seen.add(key)
            require(key in metadata, f'Missing metadata: {key}')
            m = copy.deepcopy(metadata[key])
            refs = source['sources'] if pid == 'republic' else [data['sources'][s] for s in source['sources']]
            references = [dict(label=s['label'], url=s['url'], locator=source.get('reference') or source.get('passage') or s['label'],
                               claim='原卷记事及其年度归置；沿用既有引用，本次未重新核读。', consultation='inherited', checked=None) for s in refs]
            anchor = (year_url(pid, y) if y is not None else f'{pid}/#person={source["people"][0]}') + '&' + urlencode({'focus': 'event:' + source['id']})
            entries[key] = dict(id=key, period=pid, title=source['title'], text=source.get('description', source.get('text')), **m,
                                origins=[dict(period=pid, localId=source['id'], year=y, position=position, url=anchor)],
                                references=references, relations=[])
    require(seen == set(metadata), f'Orphan event metadata: {set(metadata)-seen}')
    for event in additions:
        require(event['id'] not in entries, f'Duplicate canonical event: {event["id"]}')
        entries[event['id']] = copy.deepcopy(event)
    require(len(entries) == len(seen) + len(additions), 'Duplicate authored event IDs')
    for id, e in entries.items():
        for r in e['people']:
            require(r['period'] in volumes and r['person'] in volumes[r['period']]['people'], f'Broken event person: {id}')
        require(all(p in places for p in e['places']), f'Broken event place: {id}')
    apply_links(entries, places, volumes, read, require, check_reference)
    for id, event in entries.items():
        require(event['references'], f'Unsourced event: {id}')
        for ref in event['references']: check_reference(ref)
    source_kinds, access = apply_evidence(entries, read, require, volumes)
    for id, e in entries.items():
        require(bool(re.fullmatch(r'[a-z][a-z0-9-]*:[a-z0-9-]+', id)), f'Invalid event ID: {id}')
        require(e['period'] in volumes and e['recordKind'] in KINDS and e['title'] and e['text'], f'Invalid event: {id}')
        check_date(e['date'])
        require(isinstance(e['topics'], list) and e['topics'] and set(e['topics']) <= set(TOPICS), f'Invalid themes: {id}')
        require(e['references'], f'Unsourced event: {id}')
        for ref in e['references']: check_reference(ref)
        require(len({(r['period'], r['person']) for r in e['people']}) == len(e['people']), f'Duplicate person relation: {id}')
        for r in e['people']:
            require(r['period'] in volumes and r['person'] in volumes[r['period']]['people'], f'Broken event person: {id}')
            require(r['role'] in {'participant', 'subject', 'mentioned'} and bool(r['basis']), f'Unexplained person relation: {id}')
            r['label'] = volumes[r['period']]['people'][r['person']]['zh']
            r['url'] = f'{r["period"]}/#person={r["person"]}'
        require(len(set(e['places'])) == len(e['places']) and all(p in places for p in e['places']), f'Broken event place: {id}')
        require(len({(r['type'],r['event']) for r in e['relations']}) == len(e['relations']), f'Duplicate event relation: {id}')
        for relation in e['relations']:
            require(relation['type'] in {'part-of', 'expands'} and relation['event'] in entries and relation['event'] != id, f'Broken event relation: {id}')
        require(isinstance(e['origins'], list), f'Invalid event origins: {id}')
        e['url'] = 'events/#' + urlencode({'event': id})
        date = e['date']
        if date['extent'] == 'undated': years = []
        else: years = [y for y in range(date['start']['year'], date['end']['year'] + 1) if y]
        e['years'] = [dict(year=y, period=p['id'], url=year_url(p['id'], y)) for y in years for p in periods if p['start'] <= y <= p['end']]
        # Annual placement is a source context, never evidence of a dated point.
        e['spans'] = [[date['start']['year'], date['end']['year']]] if years else []
    def visit(id, stack):
        require(id not in stack, f'Cyclic event relations: {id}')
        for r in entries[id]['relations']: visit(r['event'], stack | {id})
    for id in entries: visit(id, set())
    for key, p in places.items():
        require(bool(re.fullmatch(r'[a-z][a-z0-9-]*', key)) and key == p['id'] and p['label'] and isinstance(p['aliases'], list)
                and all(isinstance(a, str) and a.strip() for a in p['aliases']) and p['note'] and p['references'], f'Invalid place: {key}')
        for ref in p['references']: check_reference(ref)
    for old, alias in aliases.items():
        require(bool(re.fullmatch(r'[a-z][a-z0-9-]*:[a-z0-9-]+', old)) and old not in entries and alias['target'] in entries and old != alias['target'] and alias['reason'] and alias['references'], f'Invalid event alias: {old}')
        for ref in alias['references']: check_reference(ref)
    by_year, by_person, by_place = {}, {}, {p:[] for p in places}
    for key,e in entries.items():
        for r in e['years']: by_year.setdefault(f'{r["period"]}:{r["year"]}', []).append(key)
        for r in e['people']: by_person.setdefault(f'{r["period"]}:{r["person"]}', []).append(key)
        for p in e['places']: by_place[p].append(key)
    identities = read('data/people/index.json')
    by_global_person = {}
    for key, person in identities['people'].items():
        ids = {id for p in person['profiles'] for id in by_person.get(p['period']+':'+p['person'], [])}
        by_global_person[key] = [id for id in entries if id in ids]
    for e in entries.values():
        for p in e['people']:
            identity = identities['lookup'].get(p['period']+':'+p['person'])
            if identity:
                p['globalId'] = identity
                p['globalUrl'] = identities['people'][identity]['url']
    digest = hashlib.sha256(json.dumps([entries, places, aliases], ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()).hexdigest()[:12]
    return dict(schemaVersion=1, version='events-v1-'+digest, license='CC BY-SA 4.0', periods=periods, kinds=KINDS, topics=TOPICS,
                certainties=CERTAINTIES, entries=entries, places=places, aliases=aliases,
                byYear=by_year, byPerson=by_person, byPlace=by_place, byGlobalPerson=by_global_person,
                sourceKinds=source_kinds, access=access)


def navigation(index):
    # Small optional link projection for original annual/person pages. Full text
    # remains independently readable when this projection fails.
    selected = {k:e for k,e in index['entries'].items() if e['evidence'] or e['people'] or e['places'] or (e['recordKind'] == 'event' and (not e['origins'] or e['date']['extent'] == 'window'))}
    def edge(row):
        return {k:v for k,v in row.items() if k not in {'references', 'evidence'}}
    return dict(schemaVersion=1, entries={k:dict(title=e['title'],url=e['url'],recordKind=e['recordKind'],hasEvidence=bool(e['evidence']),
                    evidenceUrl=e['url']+'&'+urlencode({'evidence':'claim:'+e['evidence']['claims'][0]['id']}) if e['evidence'] else None,
                    people=[edge(r) for r in e['people']],placeRelations=[edge(r) for r in e['placeRelations']]) for k,e in selected.items()},
                byYear={k:[id for id in v if id in selected] for k,v in index['byYear'].items() if any(id in selected for id in v)},
                byPerson={k:[id for id in v if id in selected] for k,v in index['byPerson'].items() if any(id in selected for id in v)},
                byGlobalPerson=index['byGlobalPerson'])


def write_events():
    index = compile_events()
    target = ROOT / 'data/events';target.mkdir(parents=True, exist_ok=True)
    for name,value in [('index',index), ('navigation', navigation(index))]:
        (target / (name + '.json')).write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')
    return index


if __name__ == '__main__':
    data = write_events()
    print(f'Events: {len(data["entries"])} unique objects; {len(data["places"])} linked places')
