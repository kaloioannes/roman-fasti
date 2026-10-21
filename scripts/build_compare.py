"""Read-only comparison projection. Only explicit identity maps join people."""
import copy
import hashlib
import json
from pathlib import Path
from build_people import read, require

ROOT = Path(__file__).resolve().parents[1]


def compile_compare():
    timeline = read('data/timeline/index.json')
    identities = read('data/people/index.json')
    events = read('data/events/index.json')
    power = read('data/power/index.json')
    people, lookup, sources = {}, {}, copy.deepcopy(timeline['sources'])

    def refs(rows):
        result = []
        for source in rows:
            require(source.get('label') and source.get('url', '').startswith('https://'), 'Invalid comparison source')
            key = hashlib.sha256(json.dumps(source, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
            sources[key] = copy.deepcopy(source)
            result.append(key)
        return list(dict.fromkeys(result))

    for period in timeline['periods']:
        pid = period['id']
        volume = read(f'data/{pid}/records.json')
        for local, p in volume['people'].items():
            key = pid+':'+local
            gid = identities['lookup'].get(key)
            canonical = 'global:'+gid if gid else key
            lookup[key] = canonical
            row = people.setdefault(canonical, {'id': canonical, 'label': identities['people'][gid]['zh'] if gid else p['zh'],
                'names': [], 'profiles': [], 'stages': [], 'events': [], 'power': [],
                'identity': copy.deepcopy(identities['people'][gid]) if gid else None})
            row['names'] = list(dict.fromkeys(row['names'] + timeline['people'][key]['names'] +
                                             (identities['people'][gid]['aliases'] if gid else [])))
            dynasty = volume.get('dynasties', {}).get(p.get('dynasty'))
            raw_sources = [volume['sources'][s] for s in p.get('sources', [])] if pid != 'republic' else p['bioSources']+p['officeSummarySources']
            bio = p.get('bio', [])
            profile = {'key': key, 'period': pid, 'person': local, 'label': p['zh'], 'url': timeline['people'][key]['url'],
                'names': timeline['people'][key]['names'], 'bio': [bio] if isinstance(bio, str) and bio else bio or [],
                'summary': p.get('officeSummary') or p.get('summary', ''), 'reference': p.get('reference', ''),
                'dynasty': copy.deepcopy(dynasty), 'dynastyNote': p.get('dynastyNote', ''),
                'era': p.get('era', ''), 'title': p.get('title', ''), 'traditionalYears': p.get('traditionalYears'),
                'identified': p.get('identified'), 'bioStatus': p.get('bioStatus'), 'purple': copy.deepcopy(p.get('purple')),
                # No volume has structured birth/death fields. Do not mine prose.
                'birth': None, 'death': None, 'sources': refs(raw_sources)}
            if dynasty:
                profile['dynastySources'] = refs([volume['sources'][s] for s in dynasty['sources']])
            profile['purpleSources'] = refs([volume['sources'][s] for s in p.get('purple', {}).get('sources', [])]) if p.get('purple') else []
            row['profiles'].append(profile)

    stages = {k: copy.deepcopy(s) for k, s in timeline['stages'].items() if not s['isVacancy']}
    for key, s in stages.items():
        canonical = lookup[s['period']+':'+s['person']]
        people[canonical]['stages'].append(key)
    linked_events = {}
    for profile, ids in events['byPerson'].items():
        require(profile in lookup, 'Unknown comparison event person')
        for eid in ids:
            e = events['entries'][eid]
            linked_events[eid] = {k: copy.deepcopy(e[k]) for k in
                ('id', 'title', 'text', 'url', 'period', 'date', 'spans', 'people', 'recordKind', 'references')}
            row = people[lookup[profile]]
            if eid not in row['events']:
                row['events'].append(eid)
    # Supplementary power dossiers retain their own role/date semantics. An
    # observed date range never becomes an uninterrupted office or imperial title.
    for key, p in power['people'].items():
        targets = {lookup[q['period']+':'+q['person']] for q in p['profiles']}
        require(len(targets) <= 1, 'Conflicting power identity')
        canonical = next(iter(targets)) if targets else 'power:'+key
        lookup['power:'+key] = canonical
        row = people.setdefault(canonical, {'id': canonical, 'label': p['label'], 'names': [p['label'], p['native'], *p['aliases']],
            'profiles': [], 'stages': [], 'events': [], 'power': [], 'identity': None})
        row['power'].append(copy.deepcopy(p))
        row['names'] = list(dict.fromkeys(row['names']+[p['label'], p['native'], *p['aliases']]))

    editorial = read('data-source/compare/editorial.json')
    restorations = {}
    for key, entries in editorial['returns'].items():
        require(key in lookup, 'Unknown return identity')
        row = people[lookup[key]]
        for entry in entries:
            s = stages.get(entry['stage'])
            require(s and entry['stage'] in row['stages'], 'Unknown return stage')
            profile = next(p for p in row['profiles'] if p['key'] == s['period']+':'+s['person'])
            require(entry['quote'] and entry['quote'] in ' '.join(profile['bio']), 'Return evidence changed')
            require(entry['label'] and entry['kind'] in ('restoration', 'renewed-claim', 'renewed-rule'), 'Invalid return kind')
            restorations.setdefault(row['id'], []).append(copy.deepcopy(entry))

    for row in people.values():
        row['stages'].sort(key=lambda k: (stages[k]['start']['bounds'][0] if stages[k]['start'] else float('inf'), k))
    for preset in editorial['presets']:
        require(preset['a'] in lookup and preset['b'] in lookup and lookup[preset['a']] != lookup[preset['b']], 'Invalid comparison preset')
    output = {'schemaVersion': 1, 'license': 'CC BY-SA 4.0', 'periods': timeline['periods'],
        'kinds': timeline['kinds'], 'sides': timeline['sides'], 'people': people, 'lookup': lookup,
        'stages': stages, 'sources': sources, 'events': linked_events, 'powerSources': power['sources'],
        'powerKinds': power['kinds'], 'returns': restorations, 'presets': editorial['presets'],
        'method': '比较的是本库已收录资料；只有人工身份表与权力档案的显式身份连接才汇总。同名不合并，空白不是没有发生。原卷重叠阶段分卷保留，时长不跨卷相加；没有皇帝优劣评分。引用沿用原档案，本次未重新核读外部文献。'}
    output['version'] = hashlib.sha256(json.dumps(output, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    return output


def write_compare():
    target = ROOT/'data/compare/index.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(compile_compare(), ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_compare()
