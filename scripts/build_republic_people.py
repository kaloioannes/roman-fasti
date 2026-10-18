"""Republican dossier navigation and a complete, non-merging identity audit."""
import copy
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
ROLES = {'consul': '正任执政官', 'suffect': '补任执政官',
         'tribune': '具执政官权力的军事保民官', 'decemvir': '十人委员会成员', 'dictator': '独裁官'}


def read(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8'))


def normalize(text):
    text = ''.join(c for c in unicodedata.normalize('NFKD', text) if not unicodedata.combining(c)).lower()
    return re.sub(r'\bj(?=[a-z])', 'i', text).strip()


def compile_index(data=None, ledger=None, search_aliases=None, identities=None):
    data = data if data is not None else read('data/republic/records.json')
    ledger = ledger if ledger is not None else read('data-source/republic/person-aliases.json')
    search_aliases = search_aliases if search_aliases is not None else read('data-source/search/aliases.json')
    identities = identities if identities is not None else read('data-source/people/identities.json')
    if ledger.get('schemaVersion') != 1 or not ledger.get('method') or not isinstance(ledger.get('redirects'), dict):
        raise ValueError('Invalid Republican alias ledger')
    people, groups = {}, {}
    for pid, person in data['people'].items():
        names = [person['latin'], person['wikiTitle']]
        names.extend(search_aliases.get('republic:' + pid, []))
        for identity in identities['people']:
            if any(p['period'] == 'republic' and p['person'] == pid for p in identity['profiles']):
                names.extend(identity['aliases'])
        people[pid] = {'names': list(dict.fromkeys(n for n in names if n)), 'appointments': [], 'sameNames': []}
        groups.setdefault(normalize(person['latin']), []).append(pid)
    for year, record in sorted(data['years'].items(), key=lambda item: -int(item[0])):
        for index, office in enumerate(record['officers']):
            if office['person'] not in people or office['role'] not in ROLES:
                raise ValueError('Invalid Republican appointment')
            people[office['person']]['appointments'].append({'year': int(year), 'index': index})
    candidates = []
    for name, ids in sorted(groups.items()):
        if len(ids) < 2:
            continue
        group_id = 'name-' + hashlib.sha256(name.encode()).hexdigest()[:12]
        candidates.append({'id': group_id, 'name': data['people'][ids[0]]['latin'], 'people': ids,
                           'status': 'needs-research'})
        for pid in ids:
            people[pid]['sameNames'] = [i for i in ids if i != pid]
    for pid, entry in people.items():
        appointments = entry['appointments']
        if not appointments:
            raise ValueError('Person has no Republican appointments: ' + pid)
        years = list(dict.fromkeys(a['year'] for a in appointments))
        entry['years'] = years
        entry['roles'] = list(dict.fromkeys(data['years'][str(a['year'])]['officers'][a['index']]['role'] for a in appointments))
        entry['dateLabel'] = f'前{years[0]}年' if len(years) == 1 else f'前{years[0]}—前{years[-1]}年（已收录任年范围）'
        entry['distinction'] = entry['dateLabel'] + ' · ' + '／'.join(ROLES[r] for r in entry['roles']) + f' · {len(appointments)}项记录'
    redirects = copy.deepcopy(ledger['redirects'])
    for old, row in redirects.items():
        # No chains, cycles, live-ID shadowing or undocumented migration.
        if not re.fullmatch(r'p[0-9a-f]{10}', old) or old in people or row.get('person') not in people:
            raise ValueError('Invalid Republican old-ID target: ' + old)
        sources = row.get('sources', [])
        if not row.get('note', '').strip() or not sources or any(not s.get('label', '').strip() or not s.get('locator', '').strip() or urlsplit(s.get('url', '')).scheme != 'https' or not urlsplit(s.get('url', '')).netloc for s in sources):
            raise ValueError('Missing old-ID migration evidence: ' + old)
    return {'schemaVersion': 1, 'method': ledger['method'], 'people': people, 'redirects': redirects,
            'candidates': candidates, 'unidentified': [pid for pid, p in data['people'].items() if not p['identified']]}


def review_markdown(index, data):
    lines = ['# 共和国人物身份审阅候选（自动生成）', '',
             '由 `python scripts/build_republic_people.py` 从当前档案生成。**候选不是重复身份结论。** 不据同名、相近任年、任次或 `identified=false` 合并。', '',
             f"范围：{len(index['people'])}个条目、{sum(len(p['appointments']) for p in index['people'].values())}项任职；{len(index['candidates'])}组规范化拉丁全名候选；{len(index['unidentified'])}条身份待考。所有原ID和年度成员保留。", '',
             '只比较完整拉丁姓名（忽略大小写、重音及词首J/I）；不做模糊姓氏、亲属或正文提名匹配。每组可能同时包括不同人物与待研究重复；时间跨度只用于区分现有档案，不推断生卒年。', '',
             '研究时对读源名录 `roster.json` 的具体年度/官职、`profiles.json` 专条身份、简介身份表及可定位的外部证据。确认同一人后另作显式资料迁移，在 `person-aliases.json` 保留旧ID、目标、理由和出处定位，并更新全部成员与跨卷引用。当前迁移数为0。', '',
             '## 同名／潜在重复组', '']
    def row(pid):
        p, meta = data['people'][pid], index['people'][pid]
        url = 'https://kaloioannes.github.io/roman-fasti/republic/#person=' + pid
        source = 'https://github.com/kaloioannes/roman-fasti/blob/main/data-source/republic/roster.json'
        lines.append(f"| [{pid}]({url}) | {p['zh']} | {meta['distinction']} | {'已有专条身份' if p['identified'] else '身份待考'} | [{p['wikiTitle']}]({p['url']})；[源名录]({source})：年度 {', '.join(map(str, meta['years']))} / officers |")
    for group in index['candidates']:
        lines.extend([f"### {group['name']} · {group['id']}", '', '状态：待研究；各档案分别保留。', '',
                      '| 人物ID／档案 | 中文名 | 已收录任职（非生涯边界） | 当前识别方式 | 资料定位 |', '|---|---|---|---|---|'])
        for pid in group['people']:
            row(pid)
        lines.append('')
    lines.extend(['## 全部身份待考条目', '', '独立列出所有待考条目，包括没有同名候选的条目。未识别到独立专条不表示人物不存在。', '',
                  '| 人物ID／档案 | 中文名 | 已收录任职（非生涯边界） | 当前识别方式 | 资料定位 |', '|---|---|---|---|---|'])
    for pid in index['unidentified']:
        row(pid)
    return '\n'.join(lines) + '\n'


def write_index():
    data = read('data/republic/records.json')
    index = compile_index(data)
    (ROOT / 'data/republic/people.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    (ROOT / 'docs/republic-identity-review.md').write_text(review_markdown(index, data), encoding='utf-8', newline='\n')


if __name__ == '__main__':
    write_index()
