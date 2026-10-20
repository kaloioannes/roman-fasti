"""Sourced dynasty dossiers. Classification, kinship and succession stay distinct."""
import copy
import json
import re
from datetime import date
from pathlib import Path
from build_people import compile_people, require
from build_timeline import compile_timeline
from build_events import compile_events

ROOT = Path(__file__).resolve().parents[1]
TYPES = {'parent': '亲生父母 → 子女', 'marriage': '婚姻', 'adoption': '收养者 → 养子女',
         'designation': '政治指定／继承安排', 'succession': '帝位承接 → 继位者'}
STATUS = {'attested': '文献明确记载', 'disputed': '存在异说', 'reported': '作者转述／传闻'}


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def compile_dynasties(editorial=None):
    source = copy.deepcopy(editorial if editorial is not None else read('data-source/dynasties/relations.json'))
    require(source.get('schemaVersion') == 1, 'Invalid dynasty schema')
    date.fromisoformat(source['version'])
    require(source.get('method'), 'Missing dynasty method')
    periods = [p for p in read('project.json')['periods'] if p['status'] == 'available']
    volumes = {p['id']: read(f'data/{p["id"]}/records.json') for p in periods}
    identities = compile_people()
    timeline, events = compile_timeline(), compile_events()
    topics, nodes, sources, by_person = {}, {}, {}, {}
    text = lambda v: isinstance(v, str) and bool(v.strip())
    key = lambda v: text(v) and re.fullmatch(r'[a-z][a-z0-9-]*', v)
    year = lambda v: type(v) is int and v != 0 and -753 <= v <= 1453
    for sid, s in source['sources'].items():
        require(key(sid) and all(text(s.get(k)) for k in ['label', 'author', 'edition', 'url', 'scope', 'limitations']), 'Invalid relationship source')
        require(s['url'].startswith('https://') and s['access'] in ['excerpt', 'text', 'indirect'], 'Invalid source access')
        date.fromisoformat(s['checked'])
        if s['access'] == 'indirect':
            require(all(text(s.get('via', {}).get(k)) for k in ['label', 'url', 'locator']), 'Missing indirect path')
        sources[sid] = s

    def refs(rows):
        require(isinstance(rows, list) and rows, 'Missing relationship evidence')
        for r in rows:
            require(r['source'] in sources and text(r.get('locator')) and text(r.get('supports')), 'Invalid relationship citation')
            if r['source'].startswith('suet-'):
                chapter = re.match(r'(\d+)', r['locator'])
                if chapter:
                    r['url'] = sources[r['source']]['url'] + '#' + chapter[1]

    def node(pid, person):
        local = f'{pid}:{person}'
        require(pid in volumes and person in volumes[pid]['people'], 'Unknown dynasty person: ' + local)
        gid = identities['lookup'].get(local)
        nid = 'global:' + gid if gid else local
        if nid not in nodes:
            p = volumes[pid]['people'][person]
            profiles = identities['people'][gid]['profiles'] if gid else [{'period': pid, 'person': person, 'url': f'{pid}/#person={person}'}]
            nodes[nid] = dict(id=nid, label=p['zh'], native=p.get('greek') or p.get('latin', ''),
                              profiles=[{k: v[k] for k in ['period', 'person', 'url']} for v in profiles],
                              url=identities['people'][gid]['url'] if gid else f'{pid}/#person={person}',
                              role='原卷人物；身份与任期以原档案为准', references=[])
        return nid

    for period in periods:
        pid, volume = period['id'], volumes[period['id']]
        for did, dynasty in volume.get('dynasties', {}).items():
            tid = pid + '--' + did
            members = [node(pid, person) for person, p in volume['people'].items() if p.get('dynasty') == did]
            require(members, 'Empty dynasty classification')
            classification_sources = []
            for sid in dynasty['sources']:
                ref = volume['sources'][sid]
                source_id = f'inherited:{pid}:{sid}'
                sources[source_id] = {**ref, 'access': 'inherited', 'scope': '沿用本卷王朝分类依据；本次未重新通读。'}
                classification_sources.append(source_id)
            stage_ids = [s['id'] for s in timeline['stages'].values() if s['period'] == pid and not s['isVacancy'] and node(pid, s['person']) in members]
            spans = sorted({(timeline['stages'][s]['startYear'], timeline['stages'][s]['endYear']) for s in stage_ids})
            topic = dict(id=tid, period=pid, dynasty=did, label=dynasty['label'], kind=dynasty['kind'],
                         note=dynasty['note'], classificationSources=classification_sources, members=members,
                         nodes=list(members), edges=[], sections=[], highlights=[], stages=stage_ids,
                         spans=[list(s) for s in spans], url='dynasties/#topic=' + tid,
                         related=[], events=[], contextEvents=[])
            # An event's explicit participation is not derived from reign overlap.
            local_members = {person for person, p in volume['people'].items() if p.get('dynasty') == did}
            for eid, event in events['entries'].items():
                if event['period'] != pid:
                    continue
                if any(p['person'] in local_members and p['period'] == pid for p in event['people']):
                    topic['events'].append(eid)
                elif any(a <= hi and b >= lo for a, b in event['spans'] for lo, hi in spans):
                    topic['contextEvents'].append(eid)
            topics[tid] = topic

    for n in source['nodes']:
        nid = n['id']
        require(key(nid) and nid not in nodes, 'Duplicate supporting node')
        require(all(text(n.get(k)) for k in ['label', 'native', 'role']), 'Invalid supporting person')
        refs(n['references'])
        if n.get('profile'):
            pid, person = n['profile']['period'], n['profile']['person']
            original = volumes[pid]['people'][person]
            require(n['profile'].get('identityCheck') and all(original.get(k) == v for k, v in n['profile']['identityCheck'].items()), 'Supporting identity changed')
            resolved = node(pid, person)
            require(nid not in nodes, 'Duplicate profile alias')
            nodes[nid] = {**nodes[resolved], **n, 'profiles': nodes[resolved]['profiles'], 'url': nodes[resolved]['url']}
        else:
            nodes[nid] = {**n, 'profiles': [], 'url': None}
    seen_edges = set()
    for tid, edit in source['topics'].items():
        require(tid in topics, 'Unknown topic')
        topic = topics[tid]
        require(edit.get('sections') and edit.get('edges'), 'Empty curated dossier')
        for section in edit['sections']:
            require(text(section.get('title')) and text(section.get('text')), 'Invalid dossier section')
            refs(section['references'])
        topic['sections'] = edit['sections']
        topic['aliases'] = edit.get('aliases', [])
        for eid in edit.get('highlights', []):
            require(eid in events['entries'] and events['entries'][eid]['period'] == topic['period'], 'Unknown highlighted event')
            topic['highlights'].append(eid)
        for edge in edit['edges']:
            require(key(edge['id']) and edge['id'] not in seen_edges, 'Duplicate edge ID')
            seen_edges.add(edge['id'])
            require(edge['type'] in TYPES and edge['status'] in STATUS, 'Invalid relationship type/status')
            require(edge['from'] in nodes and edge['to'] in nodes and edge['from'] != edge['to'], 'Unknown relationship endpoint')
            require(text(edge.get('note')) and text(edge.get('date', {}).get('label')), 'Missing relationship explanation/date')
            d = edge['date']
            require(d['precision'] in ['year', 'range', 'circa', 'unknown'], 'Invalid relationship date precision')
            if d['precision'] == 'unknown':
                require(d.get('start') is None and d.get('end') is None, 'Unknown date has invented bounds')
            else:
                require(year(d.get('start')) and year(d.get('end')) and d['start'] <= d['end'], 'Invalid relationship date')
                require(d['precision'] != 'year' or d['start'] == d['end'], 'Year relationship spans multiple years')
            require(edge['status'] == 'attested' or text(edge.get('dispute')), 'Missing dispute explanation')
            refs(edge['references'])
            topic['edges'].append(edge)
            topic['nodes'] = list(dict.fromkeys(topic['nodes'] + [edge['from'], edge['to']]))
        # Biological ancestry cannot contain a cycle; political succession can
        # revisit a restored ruler and is deliberately not subjected to this rule.
        children = {}
        for edge in topic['edges']:
            if edge['type'] == 'parent' and edge['status'] == 'attested':
                children.setdefault(edge['from'], []).append(edge['to'])
        def visit(n, path):
            require(n not in path, 'Cyclic biological ancestry')
            for child in children.get(n, []):
                visit(child, path | {n})
        for n in children:
            visit(n, set())
    for topic in topics.values():
        topic['curated'] = bool(topic['edges'])
        # Cross-volume dossier links use an explicit table, never same-name inference.
        for other in source.get('relatedTopics', {}).get(topic['id'], []):
            require(other in topics and other != topic['id'], 'Unknown related dynasty topic')
            topic['related'].append(other)
        for nid in topic['nodes']:
            for profile in nodes[nid]['profiles']:
                local = profile['period'] + ':' + profile['person']
                by_person.setdefault(local, []).append(topic['id'])
    used_stages = {s for t in topics.values() for s in t['stages']}
    used_events = {e for t in topics.values() for e in t['events'] + t['contextEvents'] + t['highlights']}
    return dict(schemaVersion=1, version=source['version'], license='CC BY-SA 4.0', method=source['method'],
                types=TYPES, statuses=STATUS, periods=[{k: p[k] for k in ['id', 'title', 'start', 'end']} for p in periods],
                topics=topics, nodes=nodes, sources=sources, byPerson=by_person,
                stages={s: timeline['stages'][s] for s in sorted(used_stages)}, stageKinds=timeline['kinds'],
                stageSources=timeline['sources'],
                events={e: {k: events['entries'][e][k] for k in ['id', 'title', 'text', 'url', 'period', 'spans', 'people', 'recordKind']} for e in sorted(used_events)})


def write_dynasties():
    index = compile_dynasties()
    nav = dict(schemaVersion=1, byPerson=index['byPerson'], topics={tid: {k: t[k] for k in ['id', 'label', 'url', 'curated']} for tid, t in index['topics'].items()})
    for name, value in [('index', index), ('navigation', nav)]:
        target = ROOT / f'data/dynasties/{name}.json'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_dynasties()
