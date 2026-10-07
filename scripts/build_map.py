import json,math
from pathlib import Path
from shapely.geometry import shape,mapping,box
from shapely.ops import unary_union
from shapely.geometry.polygon import orient
R=Path(__file__).resolve().parent.parent
data=json.loads((R/'data-source/roman-territories.geojson').read_text())
# Decode Natural Earth topology to clip reconstructed control areas to detailed land.
top=json.loads((R/'assets/land-50m.json').read_text())
scale=top['transform']['scale'];tr=top['transform']['translate'];arcs=[]
for arc in top['arcs']:
 x=y=0;pts=[]
 for dx,dy in arc:
  x+=dx;y+=dy;pts.append((x*scale[0]+tr[0],y*scale[1]+tr[1]))
 arcs.append(pts)
def ring(ids):
 result=[]
 for i in ids:
  part=arcs[i] if i>=0 else arcs[~i][::-1]
  result.extend(part if not result else part[1:])
 return result
obj=top['objects']['land'];geoms=obj.get('geometries',[obj]);polys=[]
for g in geoms:
 if g['type']=='Polygon':polys.append([ring(rs) for rs in g['arcs']])
 elif g['type']=='MultiPolygon':polys.extend([[ring(rs) for rs in poly] for poly in g['arcs']])
geom={'type':'MultiPolygon','coordinates':polys}
land=shape(geom).buffer(0)
records=[]
for f in data['features']:
 p=f['properties'];start=p['FromYear'];end=p['ToYear']
 if p['Name']=='Roman Republic' and start>=-500 and start<=-32 or p['Name']=='Roman Empire' and -31<=start<=-27:
  g=shape(f['geometry']).buffer(0).intersection(land).simplify(.008,preserve_topology=True)
  if g.is_empty:continue
  # GeoJSON standard rings are CCW; d3 spherical paths need CW for small regions.
  if g.geom_type=='Polygon':g=orient(g,sign=-1)
  elif g.geom_type=='MultiPolygon':g=type(g)([orient(poly,sign=-1) for poly in g.geoms])
  if start==-500:start=-509
  end=min(-27,end)
  if start<=-338:view=[10.7,40.5,14.4,43.4]
  elif start<=-265:view=[7.3,36.4,19,47.2]
  elif start<=-200:view=[-8,29,29,49]
  else:view=[-12,25,44,53]
  period=f'前{-start}—{-end}年' if start!=end else f'前{-start}年'
  caption=f'采用 Cliopatria / Seshat 的{period}重建阶段，沿 Natural Earth 海岸线裁切。色块表示重建的罗马控制范围，不等于所有盟邦或短期军事占领。'
  if start==-509:caption='早期共和国采用前500—481年的重建轮廓，向前延用至前509年；这里只示意罗马核心控制区。底图采用 Natural Earth 海岸线。'
  records.append({'type':'Feature','properties':{'from':start,'to':end,'label':period,'view':view,'caption':caption,'sourceFrom':p['FromYear'],'sourceTo':p['ToYear']},'geometry':mapping(g)})
out={'type':'FeatureCollection','features':records,'source':'https://github.com/Seshat-Global-History-Databank/cliopatria/releases/tag/v0.2.0','license':'CC BY 4.0','modifications':'Roman features selected; clipped to Natural Earth 1:50m land; simplified at 0.008 degrees; first republican outline extended from 500 to 509 BCE.'}
(R/'data/territories.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print('map stages',len(records),'bytes',(R/'data/territories.json').stat().st_size)
