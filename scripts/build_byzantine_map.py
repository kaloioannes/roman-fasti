"""Offline derivative of the checked-in Cliopatria Byzantine subset."""
import json
from copy import deepcopy
from pathlib import Path
from shapely.geometry import shape, mapping, MultiPolygon
from shapely.geometry.polygon import orient
from build_imperial_map import land_geometry

ROOT = Path(__file__).resolve().parents[1]
NAMES = {'Eastern Roman Empire': ('byzantine', '东罗马'),
         'Byzantine Empire': ('byzantine', '拜占庭'),
         'Nicaean Empire': ('nicaea', '尼西亚'),
         'Latin Empire': ('latin', '拉丁帝国'),
         'Empire of Trebizond': ('trebizond', '特拉比松')}


def build():
    source_path = ROOT / 'data-source/byzantine/territories.geojson'
    source = json.loads(source_path.read_text(encoding='utf-8'))
    assert all(f['properties']['Name'] in NAMES for f in source['features'])
    land, features = land_geometry(), []
    for f in source['features']:
        p = f['properties']
        start, end = max(476, p['FromYear']), min(1453, p['ToYear'])
        geometry = shape(f['geometry']).buffer(0).intersection(land).simplify(.008, preserve_topology=True)
        if geometry.is_empty:
            raise ValueError(f'Empty geometry: {p}')
        if geometry.geom_type == 'Polygon':
            geometry = orient(geometry, sign=-1)
        elif geometry.geom_type == 'MultiPolygon':
            geometry = MultiPolygon([orient(g, sign=-1) for g in geometry.geoms])
        else:
            raise ValueError(geometry.geom_type)
        polity, label = NAMES[p['Name']]
        features.append({'type': 'Feature', 'properties': {
            'from': start, 'to': end, 'polity': polity,
            'sourceProperties': p, 'label': f'{label} · {start}—{end}年',
            'caption': f'源GIS阶段：{p["Name"]} {p["FromYear"]}—{p["ToYear"]}；并非逐年调查疆界。'
        }, 'geometry': mapping(geometry)})
    # Cliopatria has no independent Byzantine feature for 1402–1406. Never
    # disguise this source gap as an authored exact frontier. Use two openly
    # labelled neighboring reference stages, with their actual provenance.
    for start, end, reference_year in [(1402, 1402, 1401), (1403, 1406, 1407)]:
        template = next(f for f in features if f['properties']['polity'] == 'byzantine'
                        and f['properties']['from'] <= reference_year <= f['properties']['to'])
        f = deepcopy(template)
        f['properties'].update({'from': start, 'to': end, 'approximate': True,
                                'label': f'拜占庭 · {start}—{end}年（邻近阶段参考）',
                                'caption': f'源GIS缺少{start}—{end}年独立要素，借用{reference_year}年的源阶段参考；不是本年调查疆界，不精确复现安卡拉战役或1403年条约的领土效果。'})
        features.append(f)
    output = ROOT / 'data/byzantine'
    output.mkdir(parents=True, exist_ok=True)
    result = {'type': 'FeatureCollection', 'features': features, 'source': source['source'],
              'license': 'CC BY 4.0', 'modifications': 'Independent polity layers; historical dates clipped to 476–1453; Natural Earth 1:50m coast clipping; 0.008 degree simplification; clockwise D3 outer rings. Original source attributes retained.'}
    (output / 'territories.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Byzantine map: {len(features)} source stages')


if __name__ == '__main__':
    build()
