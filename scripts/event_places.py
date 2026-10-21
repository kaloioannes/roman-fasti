"""Evidence-backed gazetteer overlay; never infer locations from event text."""
import copy
import math
import re


def apply_places(places, read, require, check_reference):
    source = read('data-source/places/gazetteer.json')
    require(source.get('schemaVersion') == 1 and isinstance(source.get('places'), dict), 'Invalid gazetteer')
    rows = copy.deepcopy(source['places'])
    require(set(places) <= set(rows), 'Gazetteer lost existing place IDs')
    def interval(row):
        a, b = row.get('fromYear'), row.get('toYear')
        require(all(v is None or (type(v) is int and v != 0) for v in [a,b]) and (a is None or b is None or a <= b), 'Invalid place date range')
    for id, p in rows.items():
        require(p.get('id') == id and p.get('label') and p.get('note') and isinstance(p.get('aliases'), list), 'Invalid gazetteer identity')
        require(p.get('status') in {'approximate', 'disputed', 'unlocated'}, 'Invalid place status')
        require(isinstance(p.get('references'), list) and p['references'], 'Unsourced place')
        for ref in p['references']:
            check_reference(ref)
            if ref['consultation'] == 'direct':
                require(all(ref.get(k) for k in ['author','edition','scope','license','snapshot']), 'Incomplete gazetteer source')
                pid=ref['url'].rsplit('/',1)[-1]
                require(pid.isdigit() and re.fullmatch(r'[0-9a-f]{40}',ref['edition']) and ref.get('access')=='dataset' and ref['license']=='CC BY 3.0', 'Invalid gazetteer dataset credit')
                expected='https://github.com/isawnyu/pleiades.datasets/blob/'+ref['edition']+'/data/json/'+'/'.join(pid[:-2])+'/'+pid+'.json'
                require(ref['snapshot']==expected, 'Invalid gazetteer snapshot URL')
        def evidence(row):
            require(row.get('note') and isinstance(row.get('references'), list) and row['references'] and all(type(i) is int and 0 <= i < len(p['references']) for i in row['references']), 'Invalid place evidence')
        interval(p['coverage'])
        require(p['coverage'].get('note'), 'Unexplained place coverage')
        require(all(isinstance(p.get(k), list) for k in ['names','locations','external','connections']), 'Invalid place collections')
        require(isinstance(p.get('catalogPeriods',[]),list) and set(p.get('catalogPeriods',[])) <= {'kingdom','republic','empire','divided-empire','byzantine'}, 'Invalid place catalogue periods')
        require(len({r['id'] for r in p['locations']}) == len(p['locations']), 'Duplicate place location')
        for n in p['names']:
            interval(n); evidence(n)
            require(n.get('label') and n.get('kind') in {'attestation','modern','historical'}, 'Invalid place name')
        for loc in p['locations']:
            interval(loc); evidence(loc)
            c = loc.get('coordinates')
            require(isinstance(c, list) and len(c) == 2 and all(type(v) in [int,float] and math.isfinite(v) for v in c) and -180 <= c[0] <= 180 and -90 <= c[1] <= 90, 'Invalid place coordinates')
            require(loc.get('precision') in {'site','city','region'} and loc.get('certainty') in {'certain','approximate','disputed'}, 'Invalid coordinate precision')
        require(bool(p['locations']) == (p['status'] == 'approximate'), 'Unlocated place has map point')
        for edge in p['connections']:
            evidence(edge)
            require(edge.get('place') in rows and edge['place'] != id and edge.get('type') in {'different-place','relocation-context','related'}, 'Broken place connection')
        for x in p['external']:
            require(x.get('id','').isdigit() and x.get('url') == 'https://pleiades.stoa.org/places/'+x['id'] and x.get('relation') in {'identity','comparison'} and x.get('note'), 'Invalid external place link')
        # Preserve previous identity citations as well as the new geographic evidence.
        old = places.get(id)
        if old:
            require(set(old['aliases']) <= set(p['aliases']) and old['label'] == p['label'], 'Gazetteer changed existing place identity')
            p['references'].extend(r for r in old['references'] if r not in p['references'])
    places.clear()
    places.update(rows)
