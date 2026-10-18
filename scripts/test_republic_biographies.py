"""Regression checks for evidence growth and explicit identity/source edits."""
import copy
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from republic_biographies import attach_biographies, load_biographies

ROOT = Path(__file__).resolve().parent.parent


class BiographyGrowthTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.directory = Path(self.temp.name)
        source = ROOT / 'data-source/republic'
        for name in ['biographies.tsv', 'biography-identities.json']:
            shutil.copyfile(source / name, self.directory / name)
        self.data = json.loads((ROOT / 'data/republic/records.json').read_text(encoding='utf-8'))
        self.people = copy.deepcopy(self.data['people'])
        self.manifest = json.loads((self.directory / 'biography-identities.json').read_text(encoding='utf-8'))

    def tearDown(self):
        self.temp.cleanup()

    def save_manifest(self):
        (self.directory / 'biography-identities.json').write_text(json.dumps(self.manifest), encoding='utf-8')

    def test_growth_preserves_every_existing_biography_and_appointments(self):
        before = load_biographies(self.directory, self.people)
        pid = next(pid for pid, p in self.people.items() if p['bioStatus'] == 'office-summary')
        p = self.people[pid]
        # A brief, sourced editorial addition must be accepted without word/count targets.
        text = '本条仅据官员名录记其任职。'
        with (self.directory / 'biographies.tsv').open('a', encoding='utf-8') as out:
            out.write(p['wikiTitle'] + '|' + text + '\n')
        self.manifest['entries'].append({'title': p['wikiTitle'], 'person': pid, 'wikiTitle': p['wikiTitle'], 'sources': [{'label': '官员名录', 'url': 'https://en.wikipedia.org/wiki/List_of_Roman_consuls'}]})
        self.save_manifest()
        # Insertion order and unrelated profile text are irrelevant to inclusion.
        self.people = dict(reversed(list(self.people.items())))
        after = load_biographies(self.directory, self.people)
        self.assertEqual(len(after), len(before) + 1)
        for key, entry in before.items():
            self.assertEqual(after[key], entry)
        self.assertEqual(after[pid]['text'], text)
        years = copy.deepcopy(self.data['years'])
        careers = {pid: [] for pid in self.people}
        for record in years.values():
            for office in record['officers']:
                careers[office['person']].append({'year': record['year'], 'role': office['role'], 'term': office['term']})
        attach_biographies(self.people, careers, after)
        self.assertEqual(self.people[pid]['bioStatus'], 'authored')
        self.assertEqual(years, self.data['years'])
        for key, old in self.data['people'].items():
            self.assertEqual(self.people[key]['officeSummary'], old['officeSummary'])

        # Exercise the actual build entry point with the edited sources, too.
        project = self.directory / 'project'
        shutil.copytree(ROOT / 'data-source/republic', project / 'data-source/republic')
        (project / 'scripts').mkdir()
        (project / 'data/republic').mkdir(parents=True)
        for name in ['build_data.py', 'republic_biographies.py']:
            shutil.copyfile(ROOT / 'scripts' / name, project / 'scripts' / name)
        for name in ['biographies.tsv', 'biography-identities.json']:
            shutil.copyfile(self.directory / name, project / 'data-source/republic' / name)
        subprocess.run([sys.executable, str(project / 'scripts/build_data.py')], check=True, capture_output=True)
        built = json.loads((project / 'data/republic/records.json').read_text(encoding='utf-8'))
        self.assertEqual(built['stats']['biographies'], self.data['stats']['biographies'] + 1)
        self.assertEqual(built['years'], self.data['years'])
        self.assertEqual(built['people'].keys(), self.data['people'].keys())
        for key, old in self.data['people'].items():
            self.assertEqual(built['people'][key]['officeSummary'], old['officeSummary'])
            if old['bio']:
                self.assertEqual(built['people'][key]['bio'], old['bio'])
                self.assertEqual(built['people'][key]['bioSources'], old['bioSources'])

    def test_new_unmatched_text_is_an_error_instead_of_silently_disappearing(self):
        with (self.directory / 'biographies.tsv').open('a', encoding='utf-8') as out:
            out.write('Unknown identity|资料。\n')
        with self.assertRaisesRegex(ValueError, 'Unmatched biographies'):
            load_biographies(self.directory, self.people)

    def test_bad_identity_sources_and_duplicate_edits_fail(self):
        original = copy.deepcopy(self.manifest)
        for kind in ['missing-person', 'wrong-title', 'unidentified', 'no-source', 'bad-url', 'empty-host', 'duplicate-person', 'duplicate-text', 'missing-text']:
            with self.subTest(kind=kind):
                self.manifest = copy.deepcopy(original)
                people = copy.deepcopy(self.people)
                entry = self.manifest['entries'][0]
                if kind == 'missing-person': entry['person'] = 'missing'
                elif kind == 'wrong-title': entry['wikiTitle'] = 'Other namesake'
                elif kind == 'unidentified': people[entry['person']]['identified'] = False
                elif kind == 'no-source': entry['sources'] = []
                elif kind == 'bad-url': entry['sources'][0]['url'] = 'http://example.com'
                elif kind == 'empty-host': entry['sources'][0]['url'] = 'https://'
                elif kind == 'duplicate-person': self.manifest['entries'][1]['person'] = entry['person']
                elif kind == 'duplicate-text': self.manifest['entries'].append(copy.deepcopy(entry))
                elif kind == 'missing-text': entry['title'] = 'Missing text'
                self.save_manifest()
                with self.assertRaises(ValueError): load_biographies(self.directory, people)

    def test_duplicate_or_empty_source_row_fails(self):
        original = (self.directory / 'biographies.tsv').read_text(encoding='utf-8')
        for row in [original.splitlines()[0], 'Empty biography|', 'Malformed row']:
            (self.directory / 'biographies.tsv').write_text(original + row + '\n', encoding='utf-8')
            with self.assertRaises(ValueError): load_biographies(self.directory, self.people)

    def test_full_build_is_repeatable(self):
        output = ROOT / 'data/republic/records.json'
        before = output.read_bytes()
        subprocess.run([sys.executable, str(ROOT / 'scripts/build_data.py')], check=True, capture_output=True)
        self.assertEqual(output.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
