"""Read-only projection of the five existing maps; never interpolate boundaries."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))


def source_ranges(p):
    if 'sourceStages' in p:
        return p['sourceStages']
    if 'sourceProperties' in p:
        s = p['sourceProperties']
        # Source 0 is retained as provenance, never used as a historical UI year.
        return [{'polity': s['Name'], 'from': s['FromYear'], 'to': s['ToYear']}]
    if 'sourceFrom' in p:
        return [{'polity': 'Roman Republic / Roman Empire', 'from': p['sourceFrom'], 'to': p['sourceTo']}]
    return []


def build_index():
    project = read('project.json')
    events = read('data/events/index.json')
    result = {'schemaVersion': 1, 'version': '', 'license': 'CC BY-SA 4.0',
              'method': '按原卷已有图层的适用年份选择阶段；阶段内沿用原几何，不插值、不推算逐年边界或面积。事件是独立文字证据，不从多边形推断控制权或变化原因。',
              'periods': [], 'stages': {}, 'presets': read('data-source/map-compare/presets.json')['presets']}
    for period in project['periods']:
        pid, start, end = period['id'], period['start'], period['end']
        row = {k: period[k] for k in ['id', 'title', 'start', 'end']}
        row['stages'] = []
        if pid == 'kingdom':
            source = read('data/kingdom/records.json')
            features = None
        else:
            source = read(f'data/{pid}/territories.json')
            features = source['features']
            assert all(f['geometry']['type'] in ['Polygon', 'MultiPolygon'] for f in features)
        groups = []
        for year in range(start, end + 1):
            if year == 0:
                continue
            if features is None:
                key = tuple(source['years'][str(year)]['rulers'])
            else:
                key = tuple(i for i, f in enumerate(features) if f['properties']['from'] <= year <= f['properties']['to'])
                assert key, (pid, year, 'Missing original map stage')
            if groups and groups[-1]['key'] == key:
                groups[-1]['to'] = year
            else:
                groups.append({'from': year, 'to': year, 'key': key})
        for group in groups:
            a, b, key = group['from'], group['to'], group['key']
            sid = f'{pid}:{a}:{b}'
            stage = {'id': sid, 'period': pid, 'from': a, 'to': b,
                     'kind': 'places' if features is None else 'territory', 'layers': [], 'points': []}
            if features is None:
                stage['label'] = '／'.join(source['people'][k]['zh'] for k in key) or '传统王位空缺'
                stage['note'] = '传统王期叙事关联地点；坐标沿用原卷近似位置，不是当年控制区或事件现场。交接年可合列先后两王；空位期不补造地点或疆域。'
                stage['rulers'] = list(key)
                for point_id in sorted({p for k in key for p in source['people'][k]['places']}):
                    p = source['places'][point_id]
                    stage['points'].append({'id': point_id, 'label': p['zh'], 'coordinates': [p['lon'], p['lat']],
                                            'note': p['note'], 'references': [source['sources'][k] for k in p['sources']]})
            else:
                labels = {'east': '东部', 'west': '西部', 'byzantine': '拜占庭', 'nicaea': '尼西亚', 'latin': '拉丁帝国', 'trebizond': '特拉比松', 'roman': '罗马阶段'}
                stage['label'] = '／'.join(dict.fromkeys(labels.get(features[i]['properties'].get('polity', features[i]['properties'].get('side', 'roman')), '罗马阶段') for i in key))
                stage['note'] = '原卷阶段重建；源阶段、显示适用期与所选年度分别列出。'
                for i in key:
                    p = features[i]['properties']
                    ranges = source_ranges(p)
                    borrowed = bool(p.get('approximate')) or any(not (s['from'] <= a <= s['to']) for s in ranges)
                    stage['layers'].append({'featureIndex': i, 'from': p['from'], 'to': p['to'],
                        'label': p['label'], 'key': p.get('polity', p.get('side', 'roman')),
                        'caption': p.get('caption', p['label'] + '；原卷阶段轮廓，不划分争位者辖境。'),
                        'precision': 'schematic' if p.get('precision') == 'schematic' else 'borrowed' if borrowed else 'reconstruction',
                        'sourceStages': ranges, 'references': p.get('sources', [{'label': 'Cliopatria / Seshat v0.2.0', 'url': source['source']}]),
                        'license': p.get('license', 'CC BY 4.0'), 'provenance': p.get('provenance', source['modifications'])})
            result['stages'][sid] = stage
            row['stages'].append(sid)
        result['periods'].append(row)
    ids = set()
    for preset in result['presets']:
        assert preset['id'] not in ids
        ids.add(preset['id'])
        for side in ['a', 'b']:
            p = next(p for p in result['periods'] if p['id'] == preset[side]['period'])
            assert preset[side]['year'] != 0 and p['start'] <= preset[side]['year'] <= p['end']
        assert preset['events'] and all(k in events['entries'] for k in preset['events'])
        preset['readings'] = [{'id': k, 'title': events['entries'][k]['title'], 'url': events['entries'][k]['url']} for k in preset['events']]
    digest = hashlib.sha256(json.dumps(result, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    result['version'] = 'map-compare-' + digest
    return result


def write_index():
    result = build_index()
    target = ROOT / 'data/map-compare/index.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    return result


if __name__ == '__main__':
    print(f"Map comparison: {len(write_index()['stages'])} existing stage combinations")
