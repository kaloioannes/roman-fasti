"""Prepare a Pages release whose entry points always use matching assets."""
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]


def build(destination):
    destination.mkdir(parents=True, exist_ok=True)
    shutil.copytree(ROOT / 'assets', destination / 'assets', dirs_exist_ok=True)
    manifest = {}

    def fingerprint(name, content):
        source = Path(name)
        digest = hashlib.sha256(content).hexdigest()[:16]
        versioned = source.with_name(f'{source.stem}.{digest}{source.suffix}').as_posix()
        target = destination / versioned
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        manifest[name] = versioned

    for name in ['data/republic.json', 'data/territories.json', 'data/stories.json', 'style.css']:
        fingerprint(name, (ROOT / name).read_bytes())
    script = (ROOT / 'app.js').read_text(encoding='utf-8')
    for original, versioned in manifest.items():
        script = script.replace(f"'{original}'", f"'{versioned}'")
    fingerprint('app.js', script.encode('utf-8'))
    html = (ROOT / 'index.html').read_text(encoding='utf-8')
    for original in ['style.css', 'app.js']:
        html = html.replace(f'"{original}"', f'"{manifest[original]}"')
    (destination / 'index.html').write_text(html, encoding='utf-8')
    (destination / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (destination / '.nojekyll').touch()
    return manifest


if __name__ == '__main__':
    destination = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / '_site'
    print(json.dumps(build(destination), indent=2))
