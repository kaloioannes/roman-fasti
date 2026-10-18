"""Build all period modules with content-addressed assets and relative URLs."""
import hashlib
import json
import posixpath
from pathlib import Path
import re
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / 'site'


def build(destination):
    destination = Path(destination).resolve()
    if destination == ROOT or ROOT.is_relative_to(destination) or any(
        destination.is_relative_to(ROOT / name) for name in ['site', 'data', 'data-source', 'scripts', '.git']
    ):
        raise ValueError('Build destination must be separate from repository sources')
    destination.mkdir(parents=True, exist_ok=True)
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
    for source in sorted(SITE.rglob('*.html')):
        name = source.relative_to(SITE).as_posix()
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(rewrite(name, source.read_text(encoding='utf-8')), encoding='utf-8')
    for name in ['LICENSE', 'DATA_LICENSE.md', 'THIRD_PARTY.md']:
        text = (ROOT / name).read_text(encoding='utf-8')
        # Research sources stay in the repository; attribution links in the
        # standalone deployment should still resolve to their originals.
        text = re.sub(r'\]\(((?:site/|data-source/)[^)]+)\)',
                      r'](https://github.com/kaloioannes/roman-republic-fasti/blob/main/\1)', text)
        (destination / name).write_text(text, encoding='utf-8')
    (destination / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (destination / '.nojekyll').touch()
    return manifest


if __name__ == '__main__':
    destination = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / '_site'
    print(json.dumps(build(destination), indent=2))
