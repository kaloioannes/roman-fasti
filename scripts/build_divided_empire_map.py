"""Rebuild the pinned Cliopatria subset offline; Shapely is needed for GIS only."""
import json
from copy import deepcopy
from pathlib import Path
from shapely.geometry import shape, mapping, MultiPolygon
from shapely.geometry.polygon import orient
from build_imperial_map import land_geometry

ROOT = Path(__file__).resolve().parents[1]


def build():
    source = json.loads((ROOT / 'data-source/divided-empire/territories.geojson').read_text(encoding='utf-8'))
    land, features = land_geometry(), []
    for feature in source['features']:
        p = feature['properties']
        assert p['Name'] in {'Eastern Roman Empire', 'Western Roman Empire'}
        geometry = shape(feature['geometry']).buffer(0).intersection(land).simplify(.008, preserve_topology=True)
        assert not geometry.is_empty, p
        if geometry.geom_type == 'Polygon':
            geometry = orient(geometry, sign=-1)
        elif geometry.geom_type == 'MultiPolygon':
            geometry = MultiPolygon([orient(g, sign=-1) for g in geometry.geoms])
        else:
            raise ValueError(geometry.geom_type)
        side = 'west' if p['Name'] == 'Western Roman Empire' else 'east'
        features.append({'type': 'Feature', 'properties': {
            'from': max(395, p['FromYear']), 'to': min(476, p['ToYear']), 'side': side,
            'sourceProperties': p,
            'label': f'{"西部" if side == "west" else "东部"} · 源阶段{p["FromYear"]}—{p["ToYear"]}年'
        }, 'geometry': mapping(geometry)})
    # Source western polygons stop in 475. Do not relabel them as an exact
    # 476 frontier or erase the western court before the September deposition.
    previous = next(f for f in features if f['properties']['side'] == 'west'
                    and f['properties']['from'] <= 475 <= f['properties']['to'])
    reference = deepcopy(previous)
    reference['properties'].update({
        'from': 476, 'to': 476, 'approximate': True, 'referenceYear': 475,
        'label': '西部 · 476年退位前参照（借用源469—475年轮廓，不是本年调查疆界）'})
    features.append(reference)
    for year in range(395, 477):
        for side in ['west', 'east']:
            assert any(f['properties']['side'] == side and f['properties']['from'] <= year <= f['properties']['to'] for f in features), (year, side)
    result = {'type': 'FeatureCollection', 'features': features, 'source': source['source'],
              'sourceCommit': source['sourceCommit'], 'license': 'CC BY 4.0',
              'modifications': 'Eastern/western layers; display dates clipped to 395–476; Natural Earth 1:50m land clipping; topology-preserving .008 degree simplification; clockwise D3 outer rings; original source properties retained.'}
    output = ROOT / 'data/divided-empire'
    output.mkdir(parents=True, exist_ok=True)
    (output / 'territories.json').write_text(json.dumps(result, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Divided Empire map: {len(features)} source stages')


if __name__ == '__main__':
    build()
