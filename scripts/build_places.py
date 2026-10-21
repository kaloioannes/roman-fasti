"""Small independent event map projection. All events, including unmapped, survive."""
import hashlib
import json
from build_events import ROOT, compile_events


def compile_places():
    index = compile_events()
    events = {id:{k:e[k] for k in ['id','period','title','url','recordKind','date','topics','people','placeRelations','years','spans']} for id,e in index['entries'].items()}
    # Links and roles suffice for the map; detailed citations remain in event dossiers.
    for e in events.values():
        e['people'] = [{k:r[k] for k in ['label','url','role']} for r in e['people']]
        e['placeRelations'] = [{k:r[k] for k in ['place','label','url','role','basis']} for r in e['placeRelations']]
    value = dict(schemaVersion=1, eventVersion=index['version'], license=index['license'], attribution='FASTI contributors; Pleiades creators and contributors (per-place credits, CC BY 3.0); Natural Earth (public domain).',
                 periods=index['periods'], kinds=index['kinds'], topics=index['topics'], places=index['places'], entries=events)
    digest=hashlib.sha256(json.dumps(value,ensure_ascii=False,sort_keys=True).encode()).hexdigest()[:12]
    value['version']='places-v1-'+digest
    return value


def write_places():
    value=compile_places()
    target=ROOT/'data/places'; target.mkdir(exist_ok=True)
    (target/'index.json').write_text(json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8',newline='\n')
    return value


if __name__ == '__main__':
    index=write_places()
    print(f'Places: {len(index["places"])} dossiers, {len(index["entries"])} event objects retained')
