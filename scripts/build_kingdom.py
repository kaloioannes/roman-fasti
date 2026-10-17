"""Compile the traditional regal chronology; no network or third-party packages.

Inclusive year buckets mark presence during a transition year, not full-year rule.
Undated traditions remain separate objects and are never turned into dated events.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'data-source' / 'kingdom'


def read(name):
    return json.loads((SOURCE / f'{name}.json').read_text(encoding='utf-8'))


def compile_data():
    sources = read('sources')
    people = {p['id']: p for p in read('people')}
    events = {e['id']: e for e in read('events')}
    places = {p['id']: p for p in read('places')}
    assert len(people) == len(read('people')), 'Duplicate person ID'
    assert len(events) == len(read('events')), 'Duplicate event ID'
    assert len(places) == len(read('places')), 'Duplicate place ID'
    for item in [*people.values(), *events.values(), *places.values()]:
        assert item['sources'] and all(s in sources for s in item['sources']), item['id']
    for p in people.values():
        assert len(p['bio']) >= 3 and all(s in places for s in p['places']), p['id']
        assert (p['start'] is None) == (p['end'] is None), p['id']
        if p['start'] is not None:
            assert p['end'] - p['start'] == p['traditionalYears'], p['id']
    for e in events.values():
        assert e['people'] and all(p in people for p in e['people']), e['id']
        assert e['year'] is None or -753 <= e['year'] <= -509, e['id']
        assert e['passage'], e['id']
    years = {}
    for y in range(-753, -508):
        rulers = [p['id'] for p in people.values() if p['start'] is not None and p['start'] <= y <= p['end']]
        dated = [e['id'] for e in events.values() if e['year'] == y]
        background = [e['id'] for e in events.values() if e['year'] is None and any(p in rulers for p in e['people'])]
        interregnum = y in (-716, -715)
        assert rulers or interregnum, f'Missing ruler/status: {y}'
        years[str(y)] = dict(year=y, auc=754+y, rulers=rulers, events=dated,
                            traditions=background, interregnum=interregnum,
                            status='traditional-event' if dated else 'no-datable-record',
                            note='本年无可定年记载。以下任期内事迹仅供背景阅读，不表示发生在本年。' if not dated else '本年记事依传统纪年定位，并非同时代年度档案。',
                            sources=['dion-chron'])
    return dict(meta=dict(title='罗马王政时代国王数据库',start=-753,end=-509,yearZero=False,
                          schemaVersion=1,researchDate='2026-10-18',license='CC BY-SA 4.0'),
                stats=dict(years=len(years),kings=7,people=len(people),
                           datedEvents=sum(e['year'] is not None for e in events.values()),
                           undatedTraditions=sum(e['year'] is None for e in events.values())),
                sources=sources,people=people,events=events,places=places,
                years=years,method=read('method'))


if __name__ == '__main__':
    data = compile_data()
    destination = ROOT / 'data' / 'kingdom'
    destination.mkdir(parents=True, exist_ok=True)
    (destination / 'records.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',', ':'))+'\n',encoding='utf-8')
    print(json.dumps(data['stats'],ensure_ascii=False))
