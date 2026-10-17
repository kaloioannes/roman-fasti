"""Rebuild the checked-in imperial GIS subset; Shapely required, no network.

Source attributes retain Cliopatria's inclusive historical-year intervals.
The UI describes these as reconstruction stages, not exact annual frontiers.
"""
import json
from pathlib import Path
from shapely.geometry import shape, mapping, MultiPolygon
from shapely.geometry.polygon import orient
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]


def land_geometry():
    top = json.loads((ROOT / 'site/shared/assets/land-50m.json').read_text(encoding='utf-8'))
    scale, translate = top['transform']['scale'], top['transform']['translate']
    arcs = []
    for arc in top['arcs']:
        x = y = 0
        points = []
        for dx, dy in arc:
            x += dx
            y += dy
            points.append((x * scale[0] + translate[0], y * scale[1] + translate[1]))
        arcs.append(points)

    def ring(ids):
        points = []
        for i in ids:
            part = arcs[i] if i >= 0 else arcs[~i][::-1]
            points.extend(part if not points else part[1:])
        return points

    obj = top['objects']['land']
    polygons = []
    for g in obj.get('geometries', [obj]):
        if g['type'] == 'Polygon':
            polygons.append([ring(r) for r in g['arcs']])
        elif g['type'] == 'MultiPolygon':
            polygons.extend([[ring(r) for r in p] for p in g['arcs']])
    return shape({'type': 'MultiPolygon', 'coordinates': polygons}).buffer(0)


def year(y):
    return f'前{-y}年' if y < 0 else f'{y}年'


def build():
    source = json.loads((ROOT / 'data-source/empire/imperial-territories.geojson').read_text(encoding='utf-8'))
    land = land_geometry()
    features = []
    # Cliopatria's frame years do not encode political recognition. In particular
    # its Gallic interval extends to 282 and its early Palmyrene label predates
    # the adoption of imperial titles. Union these into the Roman world's outer
    # footprint, rather than reproducing those intervals as emperor boundaries.
    boundaries = sorted({-27, 396, 116, 117, 127} | {
        max(-27, f['properties']['FromYear']) for f in source['features']
    } | {min(396, f['properties']['ToYear'] + 1) for f in source['features']})
    roman = {f['properties']['FromYear']: f for f in source['features'] if f['properties']['Name'] == 'Roman Empire'}
    for start, next_start in zip(boundaries, boundaries[1:]):
        end = next_start - 1
        if start == 0:
            start = 1
        if end == 0:
            end = -1
        if start > end:
            continue
        selected = [f for f in source['features'] if f['properties']['FromYear'] <= start <= f['properties']['ToYear']]
        note = ''
        if start == 116:
            selected = [roman[117]]
            note = '116年扩张高峰借用源数据117—126年轮廓近似。'
        elif 117 <= start <= 126:
            selected = [roman[127]]
            note = '117年起撤出难以维持的东方征服；采用相邻127—153年的收缩轮廓近似，未沿用源数据延至126年的最大外缘。'
        geometry = unary_union([shape(f['geometry']).buffer(0) for f in selected]).intersection(land).simplify(.008, preserve_topology=True)
        if geometry.is_empty:
            raise ValueError(f'Empty imperial map: {start}')
        if geometry.geom_type == 'Polygon':
            geometry = orient(geometry, sign=-1)
        elif geometry.geom_type == 'MultiPolygon':
            geometry = MultiPolygon([orient(poly, sign=-1) for poly in geometry.geoms])
        else:
            raise ValueError(f'Unexpected map geometry: {geometry.geom_type}')
        label = f'罗马世界外缘 · {year(start)}—{year(end)}'
        source_stages = [{'polity': f['properties']['Name'], 'from': f['properties']['FromYear'], 'to': f['properties']['ToYear']} for f in selected]
        caption = f'{label}；合并源数据中的罗马及区域政权轮廓，仅示外缘，不划分中央、共帝或争位者疆界。{note}'
        if start == 395:
            caption += '395年合并东西两部分治区显示共同外缘，内部政治关系见年度记事。'
        features.append({'type': 'Feature', 'properties': {'from': start, 'to': end,
                        'sourceStages': source_stages,
                        'label': label, 'caption': caption}, 'geometry': mapping(geometry)})
    output = {'type': 'FeatureCollection', 'features': features, 'source': source['source'],
              'license': 'CC BY 4.0', 'modifications': 'Roman-world outer footprint: union contemporaneous source polities without reproducing their disputed political dates; clipped to Natural Earth 1:50m; simplified 0.008 degrees; D3 ring orientation. 116 uses source117 outline; 117–126 uses source127 outline to reflect Hadrianic withdrawal. No year zero; original source-stage provenance retained.'}
    (ROOT / 'data/empire/territories.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Imperial map: {len(features)} reconstruction stages')


if __name__ == '__main__':
    build()
