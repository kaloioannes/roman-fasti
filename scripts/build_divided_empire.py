"""Compile the divided Empire offline. Authored sources are the only input."""
import json
from event_ids import attach_event_metadata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source/divided-empire'


def read(name):
    return json.loads((SOURCE / name).read_text(encoding='utf-8'))


def compile_data():
    sources, dynasties = read('sources.json'), read('dynasties.json')
    people = {}
    years = {str(y): {'year': y, 'rulers': [], 'events': [], 'vacancies': []}
             for y in range(395, 477)}
    for p in read('people.json'):
        assert p['id'] not in people, p['id']
        people[p['id']] = p
        for i, reign in enumerate(p['reigns']):
            for year in range(max(395, reign['start']), min(476, reign['end']) + 1):
                years[str(year)]['rulers'].append({'person': p['id'], 'reign': i})
    events = read('events.json')
    assert len({e['id'] for e in events}) == len(events), 'Duplicate event IDs'
    for event in events:
        years[str(event['year'])]['events'].append(event)
    attach_event_metadata(years, 'divided-empire')
    vacancies = read('vacancies.json')
    for vacancy in vacancies:
        for year in range(int(vacancy['startDate']['value'][:4]),
                          int(vacancy['endDate']['value'][:4]) + 1):
            years[str(year)]['vacancies'].append(vacancy)
    for year, record in years.items():
        assert record['events'], f'Missing authored annual event: {year}'
        assert any(people[o['person']]['reigns'][o['reign']]['side'] == 'east'
                   and people[o['person']]['reigns'][o['reign']]['kind'] == 'central'
                   for o in record['rulers']), f'Missing eastern court: {year}'
        assert (any(people[o['person']]['reigns'][o['reign']]['side'] == 'west'
                    and people[o['person']]['reigns'][o['reign']]['kind'] == 'central'
                    for o in record['rulers']) or record['vacancies']), year
    return {
        'meta': {'title': '双帝国时期皇帝数据库', 'start': 395, 'end': 476,
                 'yearZero': False, 'schemaVersion': 1,
                 'researchDate': '2026-10-18', 'license': 'CC BY-SA 4.0'},
        'stats': {'years': len(years), 'people': len(people), 'events': len(events),
                  'reigns': sum(len(p['reigns']) for p in people.values()),
                  'sources': len(sources)},
        'sources': sources, 'dynasties': dynasties, 'people': people,
        'years': years, 'vacancies': vacancies, 'method': read('method.json')}


if __name__ == '__main__':
    data = compile_data()
    output = ROOT / 'data/divided-empire'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'records.json').write_text(
        json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    (output / 'places.json').write_text(
        json.dumps(read('places.json'), ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps(data['stats'], ensure_ascii=False))
