"""Offline search projection; source volume schemas and identities stay separate."""
import json
from pathlib import Path
from urllib.parse import urlencode
from build_people import compile_people
from build_events import compile_events

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
    event_index = compile_events()
    for eid, event in event_index['entries'].items():
        names = [event_index['places'][p]['label'] for p in event['places']]
        names.extend(n for p in event['places'] for n in event_index['places'][p]['aliases'])
        names.extend(p['label'] for p in event['people'])
        entries.append(dict(id=f'{event["period"]}:event:{eid.split(":",1)[1]}', period=event['period'], kind='event',
                            title=event['title'], names=names, text=event['text'], spans=event['spans'], url=event['url'],
                            note=event_index['kinds'][event['recordKind']]+' · '+event['date']['note']))
    for place_id, place in event_index['places'].items():
        related = [event_index['entries'][id] for id in event_index['byPlace'][place_id]]
        for period in periods:
            rows = [e for e in related if e['period'] == period['id']]
            if not rows:
                continue
            entries.append(dict(id=f'{period["id"]}:place:{place_id}',period=period['id'],kind='place',
                                title=place['label'],names=place['aliases'],text=place['note'],
                                spans=[list(s) for s in sorted({tuple(s) for e in rows for s in e['spans']})],
                                url='places/#'+urlencode(dict(place=place_id)),
                                note=f'{period["title"]} · {len(rows)}条明确关联记事；同一地点跨卷共用档案'))
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
