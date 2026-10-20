"""Explicit narrative edition plus a lossless adapter for the Republican stories."""
import copy
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def compile_stories():
    source = read('data-source/stories/stories.json')
    assert source['schemaVersion'] == 1
    periods = {p['id']: p for p in read('project.json')['periods']}
    records = {pid: read(f'data/{pid}/records.json') for pid in periods}
    power = read('data/power/index.json')['people']
    sources = copy.deepcopy(source['sources'])
    stories = copy.deepcopy(source['stories'])
    text = lambda value: isinstance(value, str) and bool(value.strip())
    slug = lambda value: text(value) and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', value)
    for sid, s in sources.items():
        assert slug(sid) and all(text(s[k]) for k in ['label', 'author', 'edition', 'url', 'scope', 'limitations', 'checked'])
        assert s['url'].startswith('https://') and s['access'] in ['excerpt', 'inherited', 'indirect']
        assert s['kind'] in ['primary', 'research', 'reference']
        date.fromisoformat(s['checked'])
        if s['access'] == 'indirect':
            assert s['via']['url'].startswith('https://') and text(s['via']['locator'])
    # Never upgrade the original edition's consultation status or manufacture IDs
    # for its named cast members. Year-derived chapter keys preserve old links.
    for old in read('data/republic/stories.json'):
        refs = []
        for i, entry in enumerate(old['sources']):
            sid = 'republic-' + old['id'] + '-' + str(i)
            sources[sid] = dict(label=entry['label'], url=entry['url'], author='见原卷来源',
                                edition='沿用共和国剧本编辑版', kind='primary', access='inherited',
                                checked='2026-10-21', scope='沿用原章卷章定位；本次未重新核读全文。',
                                limitations='这是原版引用的保留，不是本次直接查阅记录。')
            refs.append(sid)
        stories.append(dict(id=old['id'], period='republic', title=old['title'], subtitle=old['subtitle'],
                            theme=old['theme'], question=old['question'], setup=old['setup'],
                            caution='原共和国剧本原文与出处保留；本次提供统一阅读适配，不新增人物身份判断。',
                            cast=[dict(label=p['name'], role=p['role']) for p in old['cast']],
                            legacy=True, chapters=[dict(id='y'+str(c['year']), title=c['title'],
                            year=-c['year'], dateLabel=f'前{c["year"]}年', dateKind='year',
                            paragraphs=[c['text']], question='', people=[],
                            references=[dict(source=refs[c['source']], locator=c['reference'], supports='原版本章叙述')])
                            for c in old['chapters']]))
    output, by_year, by_person = {}, {}, {}
    for story in stories:
        sid, pid = story['id'], story['period']
        assert slug(sid) and sid not in output and pid in periods, f'Invalid story {sid}'
        assert all(text(story[k]) for k in ['title', 'subtitle', 'theme', 'question', 'setup', 'caution'])
        assert len(story['chapters']) >= 2 and story['cast']
        for person in story['cast']:
            assert text(person['label']) and text(person['role'])
        chapter_ids, previous = set(), -10000
        aliases = list(story.get('aliases', []))
        for chapter in story['chapters']:
            cid, year = chapter['id'], chapter['year']
            assert slug(cid) and cid not in chapter_ids, f'Duplicate chapter {sid}:{cid}'
            assert type(year) is int and year != 0 and periods[pid]['start'] <= year <= periods[pid]['end']
            assert year >= previous, f'Nonchronological story {sid}'
            assert chapter['dateKind'] in ['year', 'range', 'traditional', 'reading-anchor'] and text(chapter['dateLabel'])
            assert text(chapter['title']) and chapter['paragraphs'] and all(text(p) for p in chapter['paragraphs'])
            assert chapter['references'], f'Missing evidence {sid}:{cid}'
            for r in chapter['references']:
                assert r['source'] in sources and text(r['locator']) and text(r['supports']), f'Invalid citation {sid}:{cid}'
            chapter_ids.add(cid)
            previous = year
            chapter['url'] = f'stories/#story={sid}&chapter={cid}'
            chapter['yearURL'] = f'{pid}/#year={-year if pid == "republic" else year}'
            chapter['people'] = list(dict.fromkeys(chapter['people']))
            people = []
            for key in chapter['people']:
                volume, person = key.split(':', 1)
                if volume == 'power':
                    p = power[person]
                    people.append(dict(key=key, label=p['label'], url=p['url']))
                    aliases.extend([p['native'], *p['aliases']])
                else:
                    p = records[volume]['people'][person]
                    people.append(dict(key=key, label=p['zh'], url=f'{volume}/#person={person}'))
                    aliases.extend([p.get('latin', ''), p.get('greek', ''), p.get('nativeName', {}).get('text', '')])
                    names = p.get('aliases', [])
                    aliases.extend(names if isinstance(names, list) else [names])
                by_person.setdefault(key, []).append(dict(story=sid, chapter=cid))
            chapter['people'] = people
            by_year.setdefault(f'{pid}:{year}', []).append(dict(story=sid, chapter=cid))
        story['url'] = f'stories/#story={sid}'
        story['aliases'] = list(dict.fromkeys(a for a in aliases if text(a)))
        story['start'], story['end'] = story['chapters'][0]['year'], story['chapters'][-1]['year']
        output[sid] = story
    return dict(schemaVersion=1, version=source['version'], license='CC BY-SA 4.0',
                method=source['method'], periods=list(periods.values()), stories=output, sources=sources,
                byYear=by_year, byPerson=by_person)


def navigation(index):
    return dict(schemaVersion=1, stories={sid:dict(id=sid, title=s['title'], period=s['period'], url=s['url'],
                chapters={c['id']:dict(title=c['title'], url=c['url']) for c in s['chapters']})
                for sid, s in index['stories'].items()}, byYear=index['byYear'], byPerson=index['byPerson'])


def write_stories():
    index = compile_stories()
    for name, value in [('index', index), ('navigation', navigation(index))]:
        path = ROOT / f'data/stories/{name}.json'
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_stories()
