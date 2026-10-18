"""Explicit, evidence-backed cross-volume identities; never match names or IDs."""
import copy
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlencode, urlparse

ROOT = Path(__file__).resolve().parents[1]
ROLES = {'consul': '正任执政官', 'suffect': '补任执政官',
         'tribune': '具执政官权力的军事保民官', 'decemvir': '十人委员会成员', 'dictator': '独裁官'}
KINDS = {'central': '宫廷皇帝', 'junior': '共帝', 'rival': '争位者',
         'regional': '区域皇帝', 'disputed': '帝号有争议', 'caesar': '恺撒',
         'exile': '流亡帝号', 'senior': '共同资深皇帝'}


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def require(value, message):
    if not value:
        raise ValueError(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def year_url(period, year, person=None):
    params = {'year': -year if period == 'republic' else year}
    if person:
        params['focus'] = f'person:{person}'
    return f'{period}/#' + urlencode(params)


def project_profile(period, person_id, data):
    """Project actual memberships, not reign-range guesses; keep source stages."""
    p = data['people'][person_id]
    years, appointments = [], []
    for raw, record in data['years'].items():
        y = -int(raw) if period == 'republic' else int(raw)
        members = record['officers'] if period == 'republic' else record['rulers']
        matches = [m for m in members if (m if isinstance(m, str) else m['person']) == person_id]
        if matches:
            years.append({'year': y, 'url': year_url(period, y, person_id if period == 'republic' else None)})
        if period == 'republic':
            for index, office in enumerate(record['officers']):
                if office['person'] != person_id:
                    continue
                appointments.append({'id': f'{period}:{raw}:{index}', 'start': y, 'end': y,
                                     'label': ROLES[office['role']], 'dateLabel': f'公元前{-y}年',
                                     'note': office.get('note', ''), 'sources': copy.deepcopy(record['sources']),
                                     'record': copy.deepcopy(office)})
    years.sort(key=lambda r: r['year'])
    if period == 'kingdom':
        appointments.append({'id': f'{period}:{person_id}:0', 'start': p['start'], 'end': p['end'],
                             'label': p['title'], 'dateLabel': '绝对任期未定' if p['start'] is None else
                             f'公元前{-p["start"]}年—公元前{-p["end"]}年 · 传统纪年',
                             'note': p['summary'], 'sources': [data['sources'][s] for s in p['sources']],
                             'record': {k: copy.deepcopy(p[k]) for k in ('start', 'end', 'traditionalYears', 'title')}})
    elif period != 'republic':
        for i, reign in enumerate(p['reigns']):
            sources = list(dict.fromkeys(reign.get('dateSources', []) + p['sources']))
            appointments.append({'id': f'{period}:{person_id}:{i}', 'start': reign['start'], 'end': reign['end'],
                                 'label': KINDS[reign['kind']], 'dateLabel': reign.get('tenure') or
                                 f'{reign["startDate"]["label"]}—{reign["endDate"]["label"]}',
                                 'note': reign.get('note', ''), 'sources': [data['sources'][s] for s in sources],
                                 'record': copy.deepcopy(reign)})
    require(years or period == 'kingdom', f'No recorded years: {period}:{person_id}')
    url = years[0]['url'] if period == 'republic' else f'{period}/#' + urlencode({'person': person_id})
    names = [p.get('latin', ''), p.get('greek', ''), p.get('nativeName', {}).get('text', '')]
    aliases = p.get('aliases', [])
    names.extend(aliases if isinstance(aliases, list) else [aliases])
    return {'period': period, 'person': person_id, 'zh': p['zh'], 'url': url,
            'names': list(dict.fromkeys(n for n in names if n)), 'reference': p.get('reference', ''),
            'appointments': appointments, 'years': years}


def compile_people(source=None, volumes=None, periods=None):
    source = copy.deepcopy(source if source is not None else read('data-source/people/identities.json'))
    periods = periods if periods is not None else [p for p in read('project.json')['periods'] if p['status'] == 'available']
    period_map = {p['id']: p for p in periods}
    volumes = volumes if volumes is not None else {pid: read(f'data/{pid}/records.json') for pid in period_map}
    require(source.get('schemaVersion') == 1, 'Unsupported identity schema')
    require(nonempty(source.get('method')), 'Missing identity method')
    evidence = source.get('evidence', {})
    require(isinstance(evidence, dict) and evidence, 'Missing identity evidence')
    for key, entry in evidence.items():
        require(all(nonempty(entry.get(k)) for k in ('label', 'url', 'locator', 'claim', 'kind')), f'Incomplete evidence: {key}')
        require(urlparse(entry['url']).scheme == 'https' and urlparse(entry['url']).netloc, f'Invalid evidence URL: {key}')
        require(entry.get('consultation') in ('direct', 'indirect'), f'Missing consultation status: {key}')
        date.fromisoformat(entry['checked'])

    def refs(row):
        keys = row.get('evidence', [])
        require(isinstance(keys, list) and keys and len(keys) == len(set(keys)) and all(k in evidence for k in keys), 'Invalid evidence references')
        require(nonempty(row.get('editorNote')), 'Missing editorial identity note')

    def target(row):
        pid, person = row.get('period'), row.get('person')
        require(pid in period_map and person in volumes[pid]['people'], f'Invalid identity target: {pid}:{person}')
        return f'{pid}:{person}'

    identities, lookup = {}, {}
    rows = source.get('people', [])
    require(isinstance(rows, list) and rows, 'Missing identities')
    for row in rows:
        gid = row['id']
        require(isinstance(gid, str) and re.fullmatch(r'[a-z][a-z0-9]*(?:-[a-z0-9]+)*', gid) and gid not in identities, f'Invalid or duplicate global ID: {gid}')
        require(nonempty(row.get('zh')) and nonempty(row.get('editorNote')), f'Incomplete identity: {gid}')
        require(isinstance(row.get('aliases'), list) and all(nonempty(n) for n in row['aliases']), f'Invalid aliases: {gid}')
        profiles = row.get('profiles', [])
        require(isinstance(profiles, list) and len({p['period'] for p in profiles}) >= 2, f'Identity must cross volumes: {gid}')
        projected = []
        for profile in profiles:
            key = target(profile)
            require(key not in lookup, f'Profile mapped more than once: {key}')
            refs(profile)
            # Freeze an editorially checked identity marker. An ID reused for a
            # different record cannot silently inherit an old mapping.
            p = volumes[profile['period']]['people'][profile['person']]
            expected = profile.get('identityCheck', {})
            require(expected and all(p.get(k) == v for k, v in expected.items()), f'Identity marker changed: {key}')
            lookup[key] = gid
            projected.append({**project_profile(profile['period'], profile['person'], volumes[profile['period']]),
                              'evidence': profile['evidence'], 'editorNote': profile['editorNote']})
        projected.sort(key=lambda p: list(period_map).index(p['period']))
        year_rows = {}
        for p in projected:
            for y in p['years']:
                year_rows.setdefault(y['year'], []).append({'period': p['period'], 'person': p['person'], 'url': y['url']})
        identities[gid] = {'id': gid, 'zh': row['zh'], 'aliases': row['aliases'], 'editorNote': row['editorNote'],
                           'url': f'people/#person={gid}', 'profiles': projected,
                           'years': [{'year': y, 'profiles': links} for y, links in sorted(year_rows.items())]}
    distinct = []
    for row in source.get('distinct', []):
        refs(row)
        require(len(row.get('profiles', [])) == 2, 'Distinct identity requires two profiles')
        keys = [target(p) for p in row['profiles']]
        require(keys[0] != keys[1] and not (lookup.get(keys[0]) and lookup.get(keys[0]) == lookup.get(keys[1])), 'Distinct people were merged')
        distinct.append({**row, 'profiles': [project_profile(p['period'], p['person'], volumes[p['period']]) for p in row['profiles']]})
    return {'schemaVersion': 1, 'method': source['method'], 'evidence': evidence,
            'periods': [{k: p[k] for k in ('id', 'title', 'start', 'end')} for p in periods],
            'people': identities, 'lookup': lookup, 'distinct': distinct}


def write_people():
    target = ROOT / 'data/people/index.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(compile_people(), ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')


if __name__ == '__main__':
    write_people()
