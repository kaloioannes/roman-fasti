"""Comparison must preserve original identities, stages and explicit relations."""
import copy
import json
import unittest
from unittest.mock import patch
from pathlib import Path
from build_compare import compile_compare, ROOT


class ComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = compile_compare()
        cls.timeline = json.loads((ROOT/'data/timeline/index.json').read_text('utf8'))

    def test_all_original_people_and_stages(self):
        d = self.data
        for key in self.timeline['people']:
            p = d['people'][d['lookup'][key]]
            self.assertIn(key, [q['key'] for q in p['profiles']])
        self.assertEqual(d['stages'], {k: s for k, s in self.timeline['stages'].items() if not s['isVacancy']})
        self.assertEqual(len([s for p in d['people'].values() for s in p['stages']]), 1566)

    def test_explicit_identity_only(self):
        d = self.data
        self.assertEqual(d['lookup']['empire:augustus'], d['lookup']['republic:p6faf564142'])
        self.assertNotEqual(d['lookup']['byzantine:constantine-iii'], d['lookup']['divided-empire:constantine-iii'])
        self.assertEqual(len(d['people']), 1200)
        self.assertEqual(d['lookup']['power:cicero'], d['lookup']['republic:pe72e7aae32'])
        self.assertEqual(len(d['people'][d['lookup']['power:pulcheria']]['stages']), 0)

    def test_all_profile_sources_and_unknowns(self):
        for row in self.data['people'].values():
            for p in row['profiles']:
                self.assertIsNone(p['birth'])
                self.assertIsNone(p['death'])
                self.assertTrue(p['sources'])
                self.assertTrue(all(k in self.data['sources'] for k in p['sources']))

    def test_events_are_explicit_not_reign_background(self):
        events = json.loads((ROOT/'data/events/index.json').read_text('utf8'))
        expected = {}
        for key, ids in events['byPerson'].items():
            expected.setdefault(self.data['lookup'][key], set()).update(ids)
        for key, p in self.data['people'].items():
            self.assertEqual(set(p['events']), expected.get(key, set()))
        for key, e in self.data['events'].items():
            for field in e:
                self.assertEqual(e[field], events['entries'][key][field])

    def test_returns_have_exact_original_text_and_stages(self):
        d = self.data
        for key, entries in d['returns'].items():
            p = d['people'][key]
            for r in entries:
                self.assertIn(r['stage'], p['stages'])
                self.assertTrue(any(r['quote'] in ' '.join(q['bio']) for q in p['profiles']))
        self.assertEqual(len(d['returns']['global:roman-zeno']), 1)
        self.assertEqual(len(d['returns']['byzantine:john-v']), 2)
        self.assertNotIn('byzantine:constantine-vii', d['returns'])

    def test_bad_editorial_and_relation_targets_fail(self):
        from build_compare import read
        for target in ('quote', 'stage', 'person', 'preset', 'event'):
            def edited(name):
                value = copy.deepcopy(read(name))
                if name == 'data-source/compare/editorial.json':
                    if target in ('quote', 'stage'):
                        value['returns']['byzantine:zeno'][0][target] = 'missing'
                    if target == 'person':
                        value['returns']['missing'] = value['returns'].pop('byzantine:zeno')
                    if target == 'preset':
                        value['presets'][0]['b'] = value['presets'][0]['a']
                if name == 'data/events/index.json' and target == 'event':
                    value['byPerson']['missing'] = []
                return value
            with self.subTest(target=target), patch('build_compare.read', side_effect=edited):
                with self.assertRaises(ValueError):
                    compile_compare()

    def test_rebuild_is_identical_and_preserves_all_inputs(self):
        paths = list((ROOT/'data').glob('*/*.json'))+list((ROOT/'data-source').glob('*/*'))
        paths = [p for p in paths if p.is_file()]
        before = {p: p.read_bytes() for p in paths}
        self.assertEqual(self.data, compile_compare())
        self.assertEqual(self.data, json.loads((ROOT/'data/compare/index.json').read_text('utf8')))
        self.assertTrue(all(p.read_bytes() == v for p, v in before.items()))


if __name__ == '__main__':
    unittest.main()
