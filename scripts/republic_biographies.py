"""Evidence-based Republican biographies; never select by rank or quota."""
import json
from urllib.parse import urlsplit

ROLES = {
    'consul': '正任执政官', 'suffect': '补任执政官',
    'tribune': '具执政官权力的军事保民官',
    'decemvir': '十人委员会成员', 'dictator': '独裁官',
}
ROSTER_SOURCE = {
    'label': '执政官与特殊官职名录',
    'url': 'https://en.wikipedia.org/wiki/List_of_Roman_consuls',
}


def load_biographies(directory, people):
    """Require an explicit, unique identity and source for every authored row."""
    texts = {}
    for number, row in enumerate((directory / 'biographies.tsv').read_text(encoding='utf-8').splitlines(), 1):
        if not row.strip() or row.startswith('#'):
            continue
        title, separator, text = row.partition('|')
        if not separator or not title.strip() or not text.strip():
            raise ValueError(f'Invalid biography row {number}')
        if title in texts:
            raise ValueError(f'Duplicate biography title: {title}')
        texts[title] = text
    manifest = json.loads((directory / 'biography-identities.json').read_text(encoding='utf-8'))
    if manifest.get('schemaVersion') != 1:
        raise ValueError('Unsupported biography identity schema')
    result, matched = {}, set()
    for entry in manifest['entries']:
        title, pid = entry['title'], entry['person']
        if title not in texts or title in matched:
            raise ValueError(f'Missing or duplicate biography text: {title}')
        if pid in result:
            raise ValueError(f'Duplicate biography identity: {pid}')
        person = people.get(pid)
        if not person or not person['identified'] or person['wikiTitle'] != entry['wikiTitle']:
            raise ValueError(f'Biography identity mismatch: {title} -> {pid}')
        sources = entry.get('sources', [])
        if not sources or any(not s.get('label', '').strip() or urlsplit(s.get('url', '')).scheme != 'https' or not urlsplit(s.get('url', '')).netloc for s in sources):
            raise ValueError(f'Missing biography source: {title}')
        result[pid] = {'text': texts[title], 'sources': sources}
        matched.add(title)
    if matched != texts.keys():
        raise ValueError(f'Unmatched biographies: {sorted(texts.keys() - matched)}')
    return result


def attach_biographies(people, careers, authored):
    """Keep prose separate from summaries mechanically derived from appointments."""
    for pid, person in people.items():
        entry = authored.get(pid)
        person['bio'] = entry['text'] if entry else ''
        person['bioSources'] = entry['sources'] if entry else []
        person['bioStatus'] = 'authored' if entry else 'office-summary' if person['identified'] else 'insufficient'
        appointments = sorted(careers[pid], key=lambda c: (-c['year'], c['role'], c['term']))
        person['officeSummary'] = '本数据库收录的任职：' + '；'.join(
            f"前{c['year']}年{ROLES[c['role']]}（名录标注第{c['term']}次任职）" for c in appointments
        ) + '。'
        person['officeSummarySources'] = [ROSTER_SOURCE]
