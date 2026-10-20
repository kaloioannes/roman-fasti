"""Explicit identities and sourced power roles, outside the imperial catalogue."""
import copy
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from build_people import compile_people, require
from build_dynasties import compile_dynasties
from build_events import compile_events

ROOT = Path(__file__).resolve().parents[1]
KINDS = {'empress': 'Augusta／皇后', 'regent': '摄政', 'delegate': '行政与政治授权',
         'court': '宫廷官员', 'general': '军事统帅', 'senator': '元老与政治顾问', 'strongman': '军事强人'}
STATUS = {'attested': '所引材料明确记载', 'disputed': '具体作用存在争论', 'reported': '经所读研究转述'}
MEANINGS = {'observed': '文献观察窗口，非完整任期', 'tenure': '所述任期／授权阶段', 'occurrence': '行动所述年代'}


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def compile_power(editorial=None):
    src = copy.deepcopy(editorial if editorial is not None else read('data-source/power/people.json'))
    require(src.get('schemaVersion') == 1 and src.get('method'), 'Invalid power schema/method')
    version = date.fromisoformat(src['version'])
    periods = [p for p in read('project.json')['periods'] if p['status'] == 'available']
    scopes = {p['id']: p for p in periods}
    volumes = {pid: read(f'data/{pid}/records.json') for pid in scopes}
    identities, dynasties, events = compile_people(), compile_dynasties(), compile_events()
    text = lambda s: isinstance(s, str) and bool(s.strip())
    key = lambda s: text(s) and re.fullmatch(r'[a-z][a-z0-9-]*', s)
    year = lambda y: type(y) is int and y != 0 and -753 <= y <= 1453
    sources = src['sources']
    require(isinstance(sources, dict) and sources, 'Missing power sources')
    for sid, s in sources.items():
        require(key(sid) and all(text(s.get(k)) for k in ['label', 'author', 'edition', 'url', 'scope', 'limitations']), 'Invalid power source')
        require(s['url'].startswith('https://') and s.get('kind') in ['primary', 'research', 'reference'], 'Invalid power source category')
        require(s.get('access') in ['text', 'excerpt', 'indirect', 'inherited'], 'Invalid power reading status')
        require(date.fromisoformat(s['checked']) <= version, 'Future power source check')
        if s['access'] == 'indirect':
            require(all(text(s.get('via', {}).get(k)) for k in ['label', 'url', 'locator']), 'Missing indirect path')

    def refs(rows):
        require(isinstance(rows, list) and rows, 'Missing power evidence')
        for r in rows:
            require(r.get('source') in sources and text(r.get('locator')) and text(r.get('supports')), 'Invalid power reference')

    def dated(d):
        require(isinstance(d, dict) and text(d.get('label')) and d.get('meaning') in MEANINGS, 'Missing power date explanation')
        require(d.get('precision') in ['year', 'range', 'circa', 'unknown'], 'Invalid power precision')
        if d['precision'] == 'unknown':
            require(d.get('start') is None and d.get('end') is None, 'Unknown power date has bounds')
        else:
            require(year(d.get('start')) and year(d.get('end')) and d['start'] <= d['end'], 'Invalid power date bounds')
            require(d['precision'] != 'year' or d['start'] == d['end'], 'Power year spans several years')

    def profile(pid, person, check):
        require(pid in volumes and person in volumes[pid]['people'], 'Unknown power identity')
        p = volumes[pid]['people'][person]
        require(isinstance(check, dict) and check and all(p.get(k) == v for k, v in check.items()), 'Power identity check changed')
        gid = identities['lookup'].get(pid + ':' + person)
        profiles = identities['people'][gid]['profiles'] if gid else [dict(period=pid, person=person, url=f'{pid}/#person={person}')]
        return [{k: p[k] for k in ['period', 'person', 'url']} for p in profiles]

    people, used, by_person, by_node, by_year, by_event = {}, set(), {}, {}, {}, {}
    selected_events = set()
    for p in src['people']:
        pid = p['id']
        require(key(pid) and pid not in people, 'Duplicate power person ID')
        require(all(text(p.get(k)) for k in ['label', 'native', 'summary', 'caution']), 'Missing power person explanation')
        require(isinstance(p.get('aliases'), list) and all(text(a) for a in p['aliases']), 'Invalid power aliases')
        require(p.get('periods') and len(p['periods']) == len(set(p['periods'])) and all(k in scopes for k in p['periods']), 'Invalid power periods')
        refs(p['references'])
        ident = p['identity']
        profiles, topics = [], []
        if ident['kind'] == 'volume':
            profiles = profile(ident['period'], ident['person'], ident.get('identityCheck'))
            canonical = identities['lookup'].get(ident['period'] + ':' + ident['person']) or ident['period'] + ':' + ident['person']
        elif ident['kind'] == 'dynasty':
            nid = ident['node']
            require(nid in dynasties['nodes'] and nid in {n['id'] for n in read('data-source/dynasties/relations.json')['nodes']}, 'Unknown supporting identity')
            n = dynasties['nodes'][nid]
            require(n['label'] == p['label'] and n['references'], 'Supporting identity changed')
            profiles = n['profiles']
            topics = [dict(id=t['id'], label=t['label'], url=t['url'] + '&node=' + nid) for t in dynasties['topics'].values() if nid in t['nodes']]
            require(topics, 'Orphan supporting identity')
            canonical = n['id'] if profiles else 'dynasty:' + nid
            if profiles:
                q = profiles[0]
                canonical = identities['lookup'].get(q['period'] + ':' + q['person']) or q['period'] + ':' + q['person']
            by_node[nid] = pid
        else:
            require(ident['kind'] == 'new', 'Invalid power identity kind')
            require(not any(pid in v['people'] for v in volumes.values()) and pid not in dynasties['nodes'], 'Existing person needs explicit reuse')
            canonical = 'power:' + pid
            for q in ident.get('distinctFrom', []):
                require(q['period'] in volumes and q['person'] in volumes[q['period']]['people'] and text(q.get('note')), 'Invalid power disambiguation')
                q['label'] = volumes[q['period']]['people'][q['person']]['zh']
                q['url'] = f'{q["period"]}/#person={q["person"]}'
        require(canonical not in used, 'Duplicate canonical power identity')
        used.add(canonical)
        p.update(canonical=canonical, profiles=profiles, topics=topics, url='power/#person=' + pid)
        for q in profiles:
            by_person.setdefault(q['period'] + ':' + q['person'], []).append(dict(person=pid, relation='self', note='本人的角色与行动'))
        for q in p.get('connections', []):
            refs(q['references'])
            require(text(q.get('note')), 'Missing power connection basis')
            profile(q['period'], q['person'], q.get('identityCheck'))
            q['label'] = volumes[q['period']]['people'][q['person']]['zh']
            q['url'] = f'{q["period"]}/#person={q["person"]}'
            by_person.setdefault(q['period'] + ':' + q['person'], []).append(dict(person=pid, relation='associated', note=q['note']))
        for kind in ['roles', 'actions']:
            require(isinstance(p.get(kind), list) and p[kind], 'Empty power dossier')
            seen = set()
            for row in p[kind]:
                require(key(row['id']) and row['id'] not in seen, 'Duplicate power role/action ID')
                seen.add(row['id']); dated(row['date']); refs(row['references'])
                if kind == 'roles':
                    require(row.get('kind') in KINDS and all(text(row.get(k)) for k in ['label', 'powers', 'limits']), 'Invalid power role')
                    require(row['date']['meaning'] in ['observed', 'tenure'], 'Role is not an action occurrence')
                else:
                    require(text(row.get('title')) and text(row.get('text')) and row.get('status') in STATUS, 'Invalid power action')
                    require(row['status'] == 'attested' or text(row.get('caution')), 'Missing power dispute/indirect explanation')
                    require(row['period'] in p['periods'], 'Action outside person periods')
                    require(row['date']['meaning'] == 'occurrence', 'Action needs occurrence date semantics')
                    d, scope = row['date'], scopes[row['period']]
                    if d['start'] is not None:
                        require(scope['start'] <= d['start'] <= d['end'] <= scope['end'], 'Action outside volume years')
                        for y in range(d['start'], d['end'] + 1):
                            if y:
                                by_year.setdefault(row['period'] + ':' + str(y), []).append(dict(person=pid, action=row['id']))
                    row['url'] = p['url'] + '&action=' + row['id']
                    if row.get('event'):
                        e = row['event']; eid = e['id']
                        require(eid in events['entries'] and e.get('relation') in ['context', 'same-action'] and text(e.get('note')), 'Invalid power event link')
                        original = events['entries'][eid]
                        require(original['period'] == row['period'], 'Power event belongs to another volume')
                        require(d['start'] is None or any(a <= d['end'] and b >= d['start'] for a, b in original['spans']), 'Power event dates do not overlap')
                        selected_events.add(eid)
                        by_event.setdefault(eid, []).append(dict(person=pid, action=row['id']))
        people[pid] = p
    for p in people.values():
        require(len(p['related']) == len(set(p['related'])) and all(i in people and i != p['id'] for i in p['related']), 'Invalid related power person')
    return dict(schemaVersion=1, version=src['version'], license='CC BY-SA 4.0', method=src['method'],
                periods=[{k: p[k] for k in ['id', 'title', 'start', 'end']} for p in periods],
                kinds=KINDS, statuses=STATUS, dateMeanings=MEANINGS, people=people, sources=sources,
                events={eid: {k: events['entries'][eid][k] for k in ['id', 'title', 'url', 'recordKind']} for eid in sorted(selected_events)},
                byPerson=by_person, byNode=by_node, byYear=by_year, byEvent=by_event)


def navigation(index):
    return {**{k: index[k] for k in ['schemaVersion', 'byPerson', 'byNode', 'byYear', 'byEvent']},
            'people': {pid: {k: p[k] for k in ['id', 'label', 'url']} for pid, p in index['people'].items()},
            'actions': {p['id'] + ':' + a['id']: {k: a[k] for k in ['id', 'title', 'url']} for p in index['people'].values() for a in p['actions']}}


def write_power():
    index = compile_power()
    for name, value in [('index', index), ('navigation', navigation(index))]:
        f = ROOT / f'data/power/{name}.json'; f.parent.mkdir(parents=True, exist_ok=True)
        f.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    return index


if __name__ == '__main__':
    result = write_power()
    print(f'Power: {len(result["people"])} dossiers')
