"""Build all period modules with content-addressed assets and relative URLs."""
import hashlib
import json
import posixpath
from pathlib import Path
import re
import shutil
import sys
from html import escape
from string import Template
from build_search import write_index
from build_events import write_events
from build_timeline import write_timeline
from build_people import write_people
from build_republic_people import write_index as write_republic_people

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'


def roman(number):
    result = ''
    for value, glyph in [(1000, 'M'), (900, 'CM'), (500, 'D'), (400, 'CD'), (100, 'C'),
                         (90, 'XC'), (50, 'L'), (40, 'XL'), (10, 'X'), (9, 'IX'),
                         (5, 'V'), (4, 'IV'), (1, 'I')]:
        count, number = divmod(number, value)
        result += glyph * count
    return result


def render_page(name, content):
    """Derive catalogue and adjacent-volume links from the same chronology."""
    periods = [p for p in json.loads((ROOT / 'project.json').read_text(encoding='utf-8'))['periods']
               if p['status'] == 'available']
    if name == 'index.html':
        template = Template((SITE / 'catalog-card.html.template').read_text(encoding='utf-8'))
        cards = ''.join(template.substitute({k: escape(str(v)) for k, v in period.items()},
                       number=roman(i + 1)) for i, period in enumerate(periods))
        content = content.replace('<!-- period-cards -->', cards)
        dates = []
        for period, year, label in ([(p, p['start'], p['milestone']) for p in periods]
                                    + [(periods[-1], periods[-1]['end'], '终章')]):
            key = -year if period['id'] == 'republic' else year
            dates.append(f'<a href="{period["id"]}/#year={key}"><span>{abs(year)} '
                         f'<small>{"BC" if year < 0 else "AD"}</small></span>{escape(label)}</a>')
        content = content.replace('<!-- era-dates -->', ''.join(dates))
    for i, period in enumerate(periods):
        marker = f'<footer class="period-footer" data-period="{period["id"]}"><a href="../">全部时期</a></footer>'
        def adjacent(target, direction):
            if target is None:
                return '<span aria-hidden="true"></span>'
            title = escape(target['title'])
            return f'<a href="../{target["id"]}/">{("← " if direction == "previous" else "")}{title}{(" →" if direction == "next" else "")}</a>'
        footer = (f'<footer class="period-footer" data-period="{period["id"]}" aria-label="时期导航">'
                  + adjacent(periods[i-1] if i else None, 'previous')
                  + '<a href="../">FASTI · 全部时期</a>'
                  + adjacent(periods[i+1] if i+1 < len(periods) else None, 'next') + '</footer>')
        content = content.replace(marker, footer)
    return content


def build(destination):
    destination = Path(destination).resolve()
    if destination == ROOT or ROOT.is_relative_to(destination) or any(
        destination.is_relative_to(ROOT / name) for name in ['site', 'data', 'data-source', 'scripts', '.git']
    ):
        raise ValueError('Build destination must be separate from repository sources')
    write_republic_people()
    write_people()
    write_events()
    write_timeline()
    write_index()
    destination.mkdir(parents=True, exist_ok=True)
    pages = sorted(SITE.rglob('*.html'))
    page_names = {source.relative_to(SITE).as_posix() for source in pages}
    # The destination is a dedicated publication directory. Retired entry pages
    # must disappear from incremental builds as well as clean CI builds.
    for target in destination.rglob('*.html'):
        if target.relative_to(destination).as_posix() not in page_names and target.resolve().is_relative_to(destination):
            target.unlink()
    previous = destination / 'asset-manifest.json'
    if previous.exists():
        for name in json.loads(previous.read_text(encoding='utf-8')).values():
            target = (destination / name).resolve()
            if target.is_relative_to(destination) and target.is_file():
                target.unlink()
    shutil.copytree(SITE / 'shared/assets', destination / 'shared/assets', dirs_exist_ok=True)
    manifest = {}

    def fingerprint(name, content):
        source = Path(name)
        digest = hashlib.sha256(content).hexdigest()[:16]
        versioned = source.with_name(f'{source.stem}.{digest}{source.suffix}').as_posix()
        target = destination / versioned
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        manifest[name] = versioned

    def rewrite(name, content):
        directory = posixpath.dirname(name)
        def replace(match):
            quote, url = match.groups()
            key = posixpath.normpath(posixpath.join(directory, url))
            if key in manifest:
                url = posixpath.relpath(manifest[key], directory or '.')
            return quote + url + quote
        return re.sub(r'''(["'])([^"'\s]+)\1''', replace, content)

    fingerprint('project.json', (ROOT / 'project.json').read_bytes())
    for source in sorted((ROOT / 'data').rglob('*.json')):
        fingerprint(source.relative_to(ROOT).as_posix(), source.read_bytes())
    for suffix in ['*.css', '*.js']:
        for source in sorted(SITE.rglob(suffix)):
            if (SITE / 'shared/assets') in source.parents:
                continue
            name = source.relative_to(SITE).as_posix()
            fingerprint(name, rewrite(name, source.read_text(encoding='utf-8')).encode('utf-8'))
    for source in pages:
        name = source.relative_to(SITE).as_posix()
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rewrite(name, render_page(name, source.read_text(encoding='utf-8'))), encoding='utf-8')
    for name in ['LICENSE', 'DATA_LICENSE.md', 'THIRD_PARTY.md']:
        text = (ROOT / name).read_text(encoding='utf-8')
        # Research sources stay in the repository; attribution links in the
        # standalone deployment should still resolve to their originals.
        text = re.sub(r'\]\(((?:site/|data-source/)[^)]+)\)',
                      r'](https://github.com/kaloioannes/roman-fasti/blob/main/\1)', text)
        (destination / name).write_text(text, encoding='utf-8')
    (destination / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (destination / '.nojekyll').touch()
    return manifest


if __name__ == '__main__':
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '_site'
    print(json.dumps(build(destination), indent=2))
