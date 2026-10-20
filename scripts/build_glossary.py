"""Offline, sourced institutional vocabulary; never infer offices from names."""
import copy
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def compile_glossary(source=None):
    source = copy.deepcopy(source if source is not None else read('data-source/glossary/entries.json'))
    periods = [p for p in read('project.json')['periods'] if p['status'] == 'available']
    records = {p['id']: read(f'data/{p["id"]}/records.json') for p in periods}
    entries, by_person, by_year = {}, {}, {}
    text = lambda s: isinstance(s, str) and bool(s.strip())
    key = lambda s: text(s) and re.fullmatch(r'[a-z][a-z0-9-]*', s)
    year = lambda y: type(y) is int and y != 0 and -753 <= y <= 1453
    assert source['schemaVersion'] == 1 and text(source['method'])
    assert date.fromisoformat(source['version'])
    assert source['categories'] and all(key(k) and text(v) for k, v in source['categories'].items())
    for sid, ref in source['sources'].items():
        assert key(sid) and all(text(ref.get(k)) for k in ['label', 'author', 'edition', 'url', 'scope', 'limitations'])
        assert ref['kind'] in ['primary', 'research', 'catalogue', 'reference']
        assert ref['access'] in ['text', 'excerpt', 'abstract', 'indirect']
        assert ref['url'].startswith('https://') and date.fromisoformat(ref['checked'])
        if ref['access'] == 'indirect':
            assert all(text(ref.get('via', {}).get(k)) for k in ['label', 'url', 'locator'])
            assert ref['via']['url'].startswith('https://')

    def references(refs):
        assert isinstance(refs, list) and refs, 'Missing references'
        assert len({(r['source'], r['locator']) for r in refs}) == len(refs), 'Duplicate reference'
        for r in refs:
            assert r['source'] in source['sources'], 'Unknown glossary source'
            assert text(r['locator']) and text(r['supports']), 'Missing citation locator or supported claim'
            assert source['sources'][r['source']]['access'] != 'abstract', 'Abstract cannot support a definition'

    for entry in source['entries']:
        eid = entry['id']
        assert key(eid) and eid not in entries, 'Invalid or duplicate term ID'
        assert entry['category'] in source['categories']
        assert all(text(entry.get(k)) for k in ['label', 'native', 'summary', 'caution'])
        assert isinstance(entry['aliases'], list) and all(text(a) for a in entry['aliases'])
        assert isinstance(entry['inline'], list) and all(text(a) for a in entry['inline'])
        assert len(set(entry['inline'])) == len(entry['inline'])
        assert entry['senses'] and len({s['id'] for s in entry['senses']}) == len(entry['senses'])
        assert isinstance(entry['related'], list) and len(set(entry['related'])) == len(entry['related'])
        assert entry['examples'] and len({(e['period'], e['year'], e.get('person')) for e in entry['examples']}) == len(entry['examples'])
        for sense in entry['senses']:
            assert key(sense['id']) and sense['periods'] and len(set(sense['periods'])) == len(sense['periods'])
            assert all(p in records for p in sense['periods']), 'Unknown sense period'
            assert all(text(sense.get(k)) for k in ['era', 'meaning', 'powers', 'limits'])
            assert len(sense['range']) == 2 and all(year(y) for y in sense['range']) and sense['range'][0] <= sense['range'][1]
            for pid in sense['periods']:
                p = next(p for p in periods if p['id'] == pid)
                assert sense['range'][0] <= p['end'] and sense['range'][1] >= p['start'], 'Sense outside period'
            references(sense['references'])
        for example in entry['examples']:
            pid, y = example['period'], example['year']
            assert pid in records and year(y) and text(example['note']), 'Invalid example'
            assert example['sense'] in {s['id'] for s in entry['senses']}, 'Unknown example sense'
            sense = next(s for s in entry['senses'] if s['id'] == example['sense'])
            assert pid in sense['periods'] and sense['range'][0] <= y <= sense['range'][1], 'Example outside sense'
            record_key = str(-y if pid == 'republic' else y)
            assert record_key in records[pid]['years'], 'Unknown example year'
            references(example['references'])
            example['yearURL'] = f'{pid}/#year={record_key}'
            by_year.setdefault(f'{pid}:{y}', []).append(eid)
            if example.get('person'):
                person = records[pid]['people'].get(example['person'])
                assert person, 'Unknown example person'
                example['personLabel'] = person['zh']
                example['personURL'] = f'{pid}/#person={example["person"]}'
                by_person.setdefault(f'{pid}:{example["person"]}', []).append(eid)
        entry['url'] = 'glossary/#term=' + eid
        entries[eid] = entry
    assert entries
    for e in entries.values():
        assert all(r in entries and r != e['id'] for r in e['related']), 'Unknown related term'
    # An inline phrase must have one meaning in a given volume. Ambiguous personal
    # names (Caesar/Augustus) are deliberately excluded by the editorial table.
    inline = {}
    for e in entries.values():
        for pid in {p for s in e['senses'] for p in s['periods']}:
            for phrase in e['inline']:
                pair = (pid, phrase.casefold())
                assert pair not in inline, 'Ambiguous inline phrase'
                inline[pair] = e['id']
    return dict(schemaVersion=1, version=source['version'], license='CC BY-SA 4.0', method=source['method'],
                categories=source['categories'], sources=source['sources'],
                periods=[{k: p[k] for k in ['id', 'title', 'start', 'end']} for p in periods], entries=entries,
                byPerson={k: list(dict.fromkeys(v)) for k, v in by_person.items()},
                byYear={k: list(dict.fromkeys(v)) for k, v in by_year.items()})


def inline_projection(index):
    return dict(schemaVersion=1, version=index['version'], byPerson=index['byPerson'], byYear=index['byYear'], entries={eid: {
        k: e[k] for k in ['id', 'label', 'native', 'summary', 'caution', 'inline', 'url']
    } | {'senses': [{k: s[k] for k in ['id', 'era', 'periods', 'range', 'meaning', 'limits']} for s in e['senses']]}
        for eid, e in index['entries'].items()})


def write_glossary():
    index = compile_glossary()
    for name, value in [('index', index), ('inline', inline_projection(index))]:
        path = ROOT / f'data/glossary/{name}.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_glossary()
