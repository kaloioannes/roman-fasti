"""Offline, deterministic compilation of the Byzantine volume (historical CE years).

Reigns use inclusive annual membership, with separately sourced precise dates.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source/byzantine'


def read(name):
    return json.loads((SOURCE / name).read_text(encoding='utf-8'))


def compile_data():
    sources, dynasties = read('sources.json'), read('dynasties.json')
    people = {}
    years = {str(y): {'year': y, 'rulers': [], 'events': []} for y in range(476, 1454)}
    for p in read('people.json'):
        assert p['id'] not in people, f"Duplicate person: {p['id']}"
        assert p['nativeName']['text'] and p['nativeName']['lang'] in {'la', 'el'}, p['id']
        assert p['greek'] and p['dynasty'] in dynasties and len(p['bio']) >= 2, p['id']
        assert p['sources'] and all(s in sources for s in p['sources']), p['id']
        if p['purple']:
            assert p['purple']['note'] and p['purple']['sources'], p['id']
            assert all(s in sources for s in p['purple']['sources']), p['id']
        people[p['id']] = p
        for i, r in enumerate(p['reigns']):
            assert isinstance(r['start'], int) and r['start'] <= r['end'], p['id']
            assert r['kind'] in {'central', 'junior', 'rival', 'regional', 'disputed'}, p['id']
            assert r['startDate']['label'] and r['endDate']['label'] and r['dateSources'], p['id']
            for y in range(max(476, r['start']), min(1453, r['end']) + 1):
                years[str(y)]['rulers'].append({'person': p['id'], 'reign': i})
    ids = set()
    for e in read('events.json'):
        assert e['id'] not in ids and e['sources'] and all(s in sources for s in e['sources']), e
        ids.add(e['id'])
        years[str(e['year'])]['events'].append(e)
    for y, record in years.items():
        assert any(people[o['person']]['reigns'][o['reign']]['kind'] == 'central'
                   for o in record['rulers']), f'No main-line emperor in {y}'
        assert record['events'], f'No authored annual event in {y}'
        record['eventStatus'] = 'documented'
    return {
        'meta': {'title': '拜占庭皇帝数据库', 'start': 476, 'end': 1453,
                 'yearZero': False, 'nameLanguage': 'per-person', 'schemaVersion': 2,
                 'researchDate': '2026-10-18', 'license': 'CC BY-SA 4.0'},
        'stats': {'years': len(years), 'people': len(people), 'events': len(ids),
                  'yearsWithEvents': sum(bool(y['events']) for y in years.values()),
                  'reigns': sum(len(p['reigns']) for p in people.values()),
                  'purple': sum(bool(p['purple']) for p in people.values())},
        'sources': sources, 'dynasties': dynasties, 'people': people,
        'years': years, 'method': read('method.json')}


if __name__ == '__main__':
    data = compile_data()
    output = ROOT / 'data/byzantine'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'records.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps(data['stats'], ensure_ascii=False))
