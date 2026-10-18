"""Offline search projection; source volume schemas and identities stay separate."""
import json
from pathlib import Path
from urllib.parse import urlencode
from build_people import compile_people

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def year_key(period, year):
    return -year if period == 'republic' else year


def compile_index():
    periods = [p for p in read('project.json')['periods'] if p['status'] == 'available']
    aliases = read('data-source/search/aliases.json')
    identities = compile_people()
    entries, used_aliases = [], set()
    for period in periods:
        pid = period['id']
        data = read(f'data/{pid}/records.json')
        def add(kind, local_id, title, names, text, spans, params, note=''):
            assert title and isinstance(title, str)
            entries.append(dict(id=f'{pid}:{kind}:{local_id}', period=pid, kind=kind,
                                title=title, names=list(dict.fromkeys(n for n in names if n)),
                                text=text, spans=spans, note=note,
                                url=f'{pid}/#' + urlencode(params)))
        for person_id, person in data['people'].items():
            if pid == 'republic':
                spans = [[-int(y), -int(y)] for y, r in data['years'].items()
                         if any(o['person'] == person_id for o in r['officers'])]
                spans.sort()
                assert spans, f'Unlinked Republican person: {person_id}'
                params = dict(person=person_id)
                note = '共和国人物档案；全部已收录任职，非完整生涯或生卒年'
                text = person['bio'] or person['officeSummary']
            elif pid == 'kingdom':
                spans = [[person['start'], person['end']]] if person['start'] is not None else []
                params = dict(person=person_id)
                note = '传统王期' if spans else '绝对任期未定'
                text = person['summary']
            else:
                spans = [[max(period['start'], r['start']), min(period['end'], r['end'])]
                         for r in person['reigns'] if r['start'] <= period['end'] and r['end'] >= period['start']]
                params = dict(person=person_id)
                note = '本卷已收录称号任期；非生卒年'
                text = person['bio'][0]
            names = [person.get('latin', ''), person.get('greek', ''), person.get('nativeName', {}).get('text', '')]
            value = person.get('aliases', [])
            names.extend(value if isinstance(value, list) else [value])
            key = f'{pid}:{person_id}'
            if key in aliases:
                names.extend(aliases[key])
                used_aliases.add(key)
            identity = identities['people'].get(identities['lookup'].get(key))
            if identity:
                names.extend(identity['aliases'])
            add('person', person_id, person['zh'], names, text[:240], spans, params, note)
            if identity:
                entries[-1]['globalPerson'] = identity['id']
                entries[-1]['globalURL'] = identity['url']
        if pid == 'kingdom':
            for eid, event in data['events'].items():
                y = event['year']
                params = dict(year=y) if y is not None else dict(person=event['people'][0])
                params['focus'] = f'event:{eid}'
                add('event', eid, event['title'], [], event['text'], [[y, y]] if y is not None else [],
                    params, event['dating'])
        else:
            for raw, record in data['years'].items():
                y = -int(raw) if pid == 'republic' else int(raw)
                for i, event in enumerate(record['events']):
                    # Positional locators for legacy schemas are navigation hints,
                    # never new scholarly/stable event IDs (future PR06 owns those).
                    eid = event.get('id', f'{raw}:{i}')
                    add('event', eid, event['title'], [], event['description'], [[y, y]],
                        dict(year=year_key(pid, y), focus=f'event:{i}'), event.get('certainty', ''))
    for story in read('data/republic/stories.json'):
        spans = [[-story['start'], -story['chapters'][-1]['year']]]
        add_story = dict(story=story['id'], year=story['start'])
        entries.append(dict(id=f'republic:story:{story["id"]}', period='republic', kind='story',
                            title=story['title'], names=[story['subtitle'], story['theme']],
                            text=story['setup'], spans=spans, note=f'{len(story["chapters"])}章 · 历史剧本',
                            url='republic/#' + urlencode(add_story)))
        for i, chapter in enumerate(story['chapters']):
            entries.append(dict(id=f'republic:chapter:{story["id"]}:{i}', period='republic', kind='chapter',
                                title=chapter['title'], names=[story['title']], text=chapter['text'],
                                spans=[[-chapter['year'], -chapter['year']]], note=f'{story["title"]} · 第{i+1}章',
                                url='republic/#' + urlencode(dict(story=story['id'], year=chapter['year'], focus='chapter'))))
    assert used_aliases == set(aliases), f'Invalid search alias targets: {set(aliases) - used_aliases}'
    assert len({e['id'] for e in entries}) == len(entries), 'Duplicate search keys'
    return dict(schemaVersion=1, periods=[{k: p[k] for k in ('id', 'title', 'start', 'end')} for p in periods],
                entries=entries)


def write_index():
    target = ROOT / 'data/search/index.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(compile_index(), ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_index()
