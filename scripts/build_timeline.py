"""Read-only projection of all five volumes' offices and title stages.

Coordinates are display bounds, never invented accession dates or durations.
The source records, their annual memberships and identities remain authoritative.
"""
import hashlib
import json
import re
from pathlib import Path
from build_people import ROLES, KINDS, require, read

ROOT = Path(__file__).resolve().parents[1]
KINDS = {**KINDS, 'king': '传统王期', 'vacancy': '宫廷／官职空缺', **ROLES}
SIDES = {'unspecified': '未分宫廷', 'west': '西部宫廷', 'east': '东部宫廷', 'both': '跨两部'}


def when(year):
    return f'公元前{-year}年' if year < 0 else f'{year}年'


def axis(year):
    require(isinstance(year, int) and year != 0, 'Invalid historical year')
    return year + 1 if year < 0 else year


def coordinate(year, month=1, day=1):
    # Proleptic Julian month lengths solely for plotting; do not use datetime,
    # Gregorian conversion or JS Date (which special-cases years 0–99).
    astronomical = year + 1 if year < 0 else year
    days = [31, 29 if astronomical % 4 == 0 else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    require(1 <= month <= 12 and 1 <= day <= days[month-1], 'Invalid Julian date')
    return axis(year) + (sum(days[:month-1]) + day-1) / sum(days)


def cell(year, month=None, day=None):
    low = coordinate(year, month or 1, day or 1)
    if day:
        high = low + 1 / (366 if (year + (year < 0)) % 4 == 0 else 365)
    elif month:
        high = axis(year)+1 if month == 12 else coordinate(year, month+1)
    else:
        high = axis(year)+1
    return [low, high]


def chinese_points(label, fallback):
    """Expand only explicit date tokens; carry a printed year/month in shorthand.

    Seasons, 'early', 'late' and unparsed prose stay at year precision. These
    bounds convey ignorance, not January/December accession assertions.
    """
    # A duration such as “约28日” is not the 28th day of a carried month.
    label = re.sub(r'(?:约|持续|在位)\d+(?:日|天|周|个月)', '', label)
    label = re.sub(r'(前?\d{1,4})(?=[或／]\d{1,4}年)', r'\1年', label)
    pattern = r'(?:(前?)(\d{1,4})年)?(?:(\d{1,2})月)?(?:(\d{1,2})日)?'
    year, month, points = fallback, None, []
    for match in re.finditer(pattern, label):
        bc, y, m, d = match.groups()
        if not any((y, m, d)):
            continue
        if y:
            year, month = -int(y) if bc else int(y), None
        if m:
            month = int(m)
        points.append((year, month, int(d) if d else None))
    return points


def endpoint(raw, fallback, traditional=False):
    precision = raw.get('precision', 'year')
    label = raw.get('label') or when(fallback)
    value = raw.get('value')
    flags = []
    if traditional:
        flags.append('traditional')
    if precision in ('circa', 'range') or re.search(r'约|异说|争议|或|／|前后|初|末|春|夏|秋|冬|讨论', label):
        flags.append('uncertain')
    if value:
        match = re.fullmatch(r'(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?', value)
        require(match, f'Invalid endpoint {raw}')
        y, m, d = (int(v) if v is not None else None for v in match.groups())
        bounds = cell(y, m, d)
        if 'uncertain' in flags and re.search(r'[或／]', label):
            # Some older source schemas retain a working value alongside
            # explicit alternatives in the label. Keep both, not just value.
            candidates = [cell(*p) for p in chinese_points(label, fallback)]
            bounds = [min([bounds[0], *[p[0] for p in candidates]]),
                      max([bounds[1], *[p[1] for p in candidates]])]
    else:
        points = chinese_points(label, fallback)
        if not points:
            points = [(fallback, None, None)]
        # Ranges enclose alternatives; do not pick a midpoint or preferred day.
        bounds = [min(cell(*p)[0] for p in points), max(cell(*p)[1] for p in points)]
    require(bounds[0] < bounds[1], 'Invalid endpoint window')
    return {'label': label, 'precision': precision, 'value': value, 'bounds': bounds, 'flags': flags}


def empire_dates(reign):
    label = reign['tenure']
    # A semicolon separates an initial claim from later recognition. Preserve
    # that distinction in the full label, never silently select recognition.
    parts = re.split(r'—|(?<=月)至(?=\d{1,2}月)', label)
    first, last = (parts[0].split('；')[0], parts[-1]) if len(parts) > 1 else (label, label)
    result = []
    for text, fallback in [(first, reign['start']), (last, reign['end'])]:
        points = chinese_points(text, fallback)
        ambiguous = re.search(r'约|前后|或|／|初|末|春|夏|秋|冬', text)
        if not points or not text or ambiguous:
            raw = {'precision': 'range' if points and len(points) > 1 else 'circa' if re.search(r'约|前后', text) else 'year',
                   'value': None, 'label': text or when(fallback)+'（确月日未详）'}
        else:
            y, m, d = points[0]
            # Explicit text must agree with the original annual endpoint.
            if y != fallback:
                raw = {'precision': 'year', 'value': None, 'label': when(fallback)+'（原文见任期）'}
            else:
                value = ('-' if y < 0 else '') + f'{abs(y):04}' + (f'-{m:02}' if m else '') + (f'-{d:02}' if d else '')
                raw = {'precision': 'day' if d else 'month' if m else 'year', 'value': value,
                       'label': when(y)+(f'{m}月' if m else '')+(f'{d}日' if d else '')}
        result.append(endpoint(raw, fallback))
    return result


def compile_timeline(editorial=None, volumes=None):
    config = editorial if editorial is not None else read('data-source/timeline/editorial.json')
    require(config.get('schemaVersion') == 1, 'Invalid timeline editorial schema')
    periods = [{k: p[k] for k in ('id', 'title', 'start', 'end')} for p in read('project.json')['periods'] if p['status'] == 'available']
    volumes = volumes if volumes is not None else {p['id']: read(f'data/{p["id"]}/records.json') for p in periods}
    stages, sources, people = {}, {}, {}
    def refs(pid, ids):
        result = []
        for source in ids:
            item = source if isinstance(source, dict) else volumes[pid]['sources'][source]
            key = hashlib.sha256(json.dumps(item, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]
            require(item.get('label') and item.get('url', '').startswith('https://'), 'Invalid timeline source')
            sources[key] = item
            if key not in result:
                result.append(key)
        require(result, 'Missing timeline source')
        return result

    for period in periods:
        pid, data = period['id'], volumes[period['id']]
        for person, p in data['people'].items():
            names = [p['zh'], p.get('latin', ''), p.get('greek', ''), p.get('nativeName', {}).get('text', '')]
            aliases = p.get('aliases', [])
            names += aliases if isinstance(aliases, list) else [aliases]
            people[pid+':'+person] = {'zh': p['zh'], 'names': [n for n in names if n], 'url': f'{pid}/#person={person}'}
        def add(person, i, r, references, label=None, note=None):
            key = f'{pid}:{person}:{i}'
            require(key not in stages, 'Duplicate stage')
            start, end = r.get('start'), r.get('end')
            if start is None:
                dates = [None, None]
            elif pid == 'empire':
                dates = empire_dates(r)
            else:
                dates = [endpoint(r.get(k+'Date', {}), y, pid == 'kingdom') for k, y in [('start', start), ('end', end)]]
            if dates[0]:
                require(dates[0]['bounds'][0] <= dates[1]['bounds'][1], f'Reversed stage {key}')
            stages[key] = {'id': key, 'period': pid, 'person': person, 'kind': r['kind'],
                           'side': r.get('side', 'unspecified'), 'startYear': start, 'endYear': end,
                           'scopeStart': period['start'], 'scopeEnd': period['end'],
                           'start': dates[0], 'end': dates[1], 'label': label or r.get('tenure') or
                           ('绝对任期未定' if start is None else f'{dates[0]["label"]} — {dates[1]["label"]}'),
                           'territory': r.get('territory', ''), 'recognition': r.get('recognition', ''),
                           'note': note if note is not None else r.get('note', ''), 'certainty': r.get('certainty', ''),
                           'reference': data['people'].get(person, {}).get('reference', ''),
                           'sources': refs(pid, references), 'authority': [], 'isVacancy': r['kind'] == 'vacancy'}
        if pid == 'republic':
            for raw, record in data['years'].items():
                y = -int(raw)
                for i, office in enumerate(record['officers']):
                    add(office['person'], f'{raw}-{i}', {'start': y, 'end': y, 'kind': office['role']}, record['sources'],
                        when(y)+' · '+ROLES[office['role']], ' '.join([office.get('note', ''), *record.get('notes', [])]))
                if not record['officers']:
                    add('vacancy', raw, {'start': y, 'end': y, 'kind': 'vacancy'}, record['sources'],
                        when(y)+' · 最高官职空缺', ' '.join(record.get('notes', [])))
        elif pid == 'kingdom':
            for person, p in data['people'].items():
                add(person, 0, {**p, 'kind': 'king'}, p['sources'], note=p['summary'])
            gaps = sorted(int(y) for y, r in data['years'].items() if r['interregnum'])
            require(gaps == [-716, -715], 'Review changed regal interregnum before projecting')
            add('vacancy', 'interregnum', {'start': gaps[0], 'end': gaps[-1], 'kind': 'vacancy'},
                ['livy', 'dion-numa'], '前716—前715年 · 传统一年空位的两端',
                '元老轮流代理；两年标签是同一个一年区间的两端，不表示两个完整无王年。见李维1.17、狄奥尼修斯2.57—58。')
        else:
            for person, p in data['people'].items():
                for i, r in enumerate(p['reigns']):
                    add(person, i, r, list(dict.fromkeys(r.get('dateSources', []) + p['sources'])))
            for vacancy in data.get('vacancies', []):
                start = int(vacancy['startDate']['value'][:4])
                end = int(vacancy['endDate']['value'][:4])
                add('vacancy', vacancy['id'], {**vacancy, 'start': start, 'end': end, 'kind': 'vacancy'}, vacancy['sources'], vacancy['label'])
    # Editorial power phases are explicitly anchored in an existing stage and
    # its inherited source text. They do not add appointments or change titles.
    for key, entry in config.get('annotations', {}).items():
        require(key in stages, f'Unknown annotation stage {key}')
        stage = stages[key]
        require(entry.get('basis') and entry.get('note'), 'Missing annotation basis')
        require(entry['basis'] in ('tenure', 'territory', 'note', 'biography'), 'Invalid annotation basis')
        profile = volumes[stage['period']]['people'][stage['person']]
        original = profile['reigns'][int(key.rsplit(':', 1)[1])]
        basis = ' '.join(profile['bio']) if entry['basis'] == 'biography' else original.get(entry['basis'], '')
        require(entry.get('sourceText') and entry['sourceText'] in basis, f'Annotation evidence changed {key}')
        stage['authorityNote'] = entry['note']
        for phase in entry.get('phases', []):
            require(phase['status'] in ('governing', 'shared', 'title', 'contested'), 'Invalid power phase')
            require(phase.get('label'), 'Missing phase label')
            a, b = phase['start'], phase['end']
            require(stage['startYear'] <= a <= b <= stage['endYear'], 'Power phase outside title')
            left = endpoint(phase['startDate'], a) if phase.get('startDate') else stage['start'] if a == stage['startYear'] else endpoint({'label': when(a)}, a)
            right = endpoint(phase['endDate'], b) if phase.get('endDate') else stage['end'] if b == stage['endYear'] else endpoint({'label': when(b)}, b)
            require(stage['start']['bounds'][0] <= left['bounds'][0] < right['bounds'][1] <= stage['end']['bounds'][1], 'Power dates outside title')
            stage['authority'].append({**phase, 'start': left, 'end': right})
    presets = config['presets']
    require(presets and len({p['id'] for p in presets}) == len(presets), 'Duplicate preset')
    for p in presets:
        require(p['period'] in volumes and -753 <= p['from'] <= p['to'] <= 1453 and p['from'] != 0 and p['to'] != 0 and p.get('note'), 'Invalid preset')
    output = {'schemaVersion': 1, 'periods': periods, 'kinds': KINDS, 'sides': SIDES,
              'people': people, 'stages': stages, 'sources': sources, 'presets': presets,
              'method': config['method']}
    output['version'] = hashlib.sha256(json.dumps(output, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:16]
    return output


def write_timeline():
    target = ROOT / 'data/timeline/index.json'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(compile_timeline(), ensure_ascii=False, separators=(',', ':'))+'\n', encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_timeline()
