"""Compile the imperial edition. Offline, deterministic, standard library only.

Years use historical numbering: -1 is 1 BCE, 1 is 1 CE; zero is invalid.
Ranges are inclusive calendar years, NOT a claim of simultaneous rule all year.
"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source' / 'empire'


def rows(name):
    with (SOURCE / name).open(encoding='utf-8', newline='') as stream:
        return list(csv.DictReader(stream, delimiter='\t'))


def compile_data():
    sources = json.loads((SOURCE / 'sources.json').read_text(encoding='utf-8'))
    people = {}
    for p in rows('people.tsv'):
        assert p['id'] not in people, f"Duplicate person ID: {p['id']}"
        people[p['id']] = {**p, 'bio': p['bio'].split('~'), 'sources': p['sources'].split(','), 'reigns': []}
    for r in rows('reigns.tsv'):
        r = {**r, 'start': int(r['start']), 'end': int(r['end'])}
        assert r['start'] != 0 and r['end'] != 0 and r['start'] <= r['end'], r
        assert r['kind'] in {'central', 'rival', 'regional', 'disputed', 'caesar'}, r
        people[r.pop('person')]['reigns'].append(r)
    years = {str(y): {'year': y, 'rulers': [], 'events': []} for y in [*range(-27, 0), *range(1, 396)]}
    for pid, p in people.items():
        for index, r in enumerate(p['reigns']):
            for y, record in years.items():
                if r['start'] <= int(y) <= r['end']:
                    record['rulers'].append({'person': pid, 'reign': index})
    for e in rows('events.tsv'):
        y = e.pop('year')
        e['sources'] = e['sources'].split(',')
        years[y]['events'].append(e)
    for r in years.values():
        assert r['events'], f"Missing authored annual event: {r['year']}"
        assert any(people[o['person']]['reigns'][o['reign']]['kind'] == 'central' for o in r['rulers']), r['year']
    for p in people.values():
        assert p['reigns'] and len(p['bio']) >= 3, p['id']
        assert all(s in sources for s in p['sources']), p['id']
    for r in years.values():
        for e in r['events']:
            assert all(s in sources for s in e['sources']), e
    return {'meta': {'title': '古典罗马皇帝数据库', 'start': -27, 'end': 395, 'yearZero': False,
                     'researchDate': '2026-10-17', 'license': 'CC BY-SA 4.0', 'schemaVersion': 1},
            'stats': {'years': len(years), 'people': len(people),
                      'events': sum(len(r['events']) for r in years.values()),
                      'reigns': sum(len(p['reigns']) for p in people.values())},
            'sources': sources, 'people': people, 'years': years,
            'method': json.loads((SOURCE / 'method.json').read_text(encoding='utf-8'))}


if __name__ == '__main__':
    data = compile_data()
    (ROOT / 'data' / 'empire.json').write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps(data['stats'], ensure_ascii=False))
