"""Provenance, identity reuse, date semantics and reversible read projections."""
import copy
import json
import unittest
from pathlib import Path
from build_power import compile_power, navigation, read, ROOT
from build_search import compile_index


class PowerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src = read('data-source/power/people.json')
        cls.index = compile_power()

    def test_deterministic_and_committed(self):
        self.assertEqual(self.index, compile_power())
        self.assertEqual(self.index, read('data/power/index.json'))
        self.assertEqual(navigation(self.index), read('data/power/navigation.json'))

    def test_every_action_has_auditable_evidence_and_date_semantics(self):
        for p in self.index['people'].values():
            for row in p['roles'] + p['actions']:
                self.assertTrue(row['references'])
                self.assertNotIn(0, [row['date']['start'], row['date']['end']])
                for ref in row['references']:
                    source = self.index['sources'][ref['source']]
                    for key in ['scope', 'limitations', 'edition', 'author', 'checked']:
                        self.assertTrue(source[key])
                    self.assertTrue(ref['locator'] and ref['supports'])
            self.assertTrue(all(a['date']['meaning'] == 'occurrence' for a in p['actions']))
            self.assertTrue(all(r['date']['meaning'] != 'occurrence' for r in p['roles']))

    def test_original_volume_catalogues_stay_unchanged(self):
        paths = [ROOT / f'data/{p["id"]}/records.json' for p in self.index['periods']]
        before = {f: f.read_bytes() for f in paths}
        compile_power()
        self.assertEqual(before, {f: f.read_bytes() for f in paths})
        for p in self.index['people'].values():
            if p['identity']['kind'] == 'new':
                self.assertFalse(any(p['id'] in json.loads(f.read_text(encoding='utf-8'))['people'] for f in paths))

    def test_reuses_confirmed_people_and_distinguishes_names(self):
        people = self.index['people']
        self.assertEqual(people['cicero']['profiles'][0]['person'], 'pe72e7aae32')
        self.assertEqual(people['agrippa']['profiles'][0]['person'], 'p622a2ed1a3')
        self.assertEqual(people['irene']['profiles'][0]['person'], 'irene')
        self.assertEqual(self.index['byNode']['livia'], 'livia')
        self.assertEqual(self.index['byNode']['anna-dalassene'], 'anna-dalassene')
        self.assertEqual(people['theodora-justinian']['identity']['distinctFrom'][0]['person'], 'theodora')
        self.assertFalse(any(r['person'] == 'theodora-justinian' for r in self.index['byPerson'].get('byzantine:theodora', [])))
        self.assertFalse(any(r['person'] == 'cicero' for r in self.index['byPerson'].get('republic:pbb2a0dc352', [])))
        self.assertEqual([r['date']['start'] for r in people['irene']['roles']], [780, 792])
        self.assertNotIn('byzantine:791', {key for key, rows in self.index['byYear'].items() if any(r['person'] == 'irene' for r in rows)})

    def test_navigation_is_exact_and_bidirectional(self):
        nav = navigation(self.index)
        for p in self.index['people'].values():
            for q in p['profiles']:
                self.assertIn(dict(person=p['id'], relation='self', note='本人的角色与行动'), nav['byPerson'][q['period'] + ':' + q['person']])
            for a in p['actions']:
                expected = dict(person=p['id'], action=a['id'])
                if a['event']:
                    self.assertIn(expected, nav['byEvent'][a['event']['id']])
                if a['date']['start'] is None:
                    self.assertFalse(any(expected in rows for rows in nav['byYear'].values()))
                else:
                    for year in range(a['date']['start'], a['date']['end'] + 1):
                        self.assertIn(expected, nav['byYear'][a['period'] + ':' + str(year)])
        self.assertLess(len(json.dumps(nav, ensure_ascii=False).encode()), 40000)
        self.assertNotIn('sources', nav)

    def test_search_can_find_every_dossier_without_emperor_classification(self):
        projected = [p for p in compile_index()['entries'] if p['kind'] == 'power']
        for p in self.index['people'].values():
            rows = [v for v in projected if v['url'] == p['url']]
            self.assertEqual({v['period'] for v in rows}, set(p['periods']))
            self.assertTrue(all(v['kind'] != 'person' for v in rows))

    def reject(self, change, message=None):
        src = copy.deepcopy(self.src); change(src)
        with self.assertRaises((ValueError, KeyError, TypeError)):
            compile_power(src)

    def test_broken_edits_fail(self):
        cases = [
            lambda s: s['people'].append(copy.deepcopy(s['people'][0])),
            lambda s: s['people'][0]['identity'].update(person='pbb2a0dc352'),
            lambda s: s['people'][0]['identity'].update(identityCheck={}),
            lambda s: s['people'][1]['identity'].update(node='absent'),
            lambda s: s['people'][4]['identity'].update(kind='volume', period='empire', person='absent'),
            lambda s: s['people'][4].update(id='nero'),
            lambda s: s['people'][0]['roles'][0]['date'].update(start=0),
            lambda s: s['people'][0]['roles'][0]['date'].update(precision='day'),
            lambda s: s['people'][0]['roles'][0]['date'].update(precision='unknown'),
            lambda s: s['people'][0]['roles'][0]['date'].update(meaning='occurrence'),
            lambda s: s['people'][0]['actions'][0]['date'].update(meaning='tenure'),
            lambda s: s['people'][0]['actions'][0].update(references=[]),
            lambda s: s['people'][0]['actions'][0]['references'][0].update(source='absent'),
            lambda s: s['people'][0]['actions'][0]['references'][0].update(locator=''),
            lambda s: s['people'][0]['actions'][0].update(status='score-95'),
            lambda s: s['people'][0]['actions'][0].update(status='disputed', caution=''),
            lambda s: s['people'][0]['actions'][0]['event'].update(id='absent'),
            lambda s: s['people'][0]['actions'][0]['event'].update(id='byzantine:byz-532-1'),
            lambda s: s['people'][0]['actions'][0]['date'].update(start=-48, end=-48),
            lambda s: s['people'][0]['actions'][0].update(period='byzantine'),
            lambda s: s['people'][0].update(related=['absent']),
            lambda s: s['sources']['tac-1'].update(scope=''),
            lambda s: s['sources']['tac-1'].update(access='indirect'),
            lambda s: s['sources']['tac-1'].update(checked='2099-01-01'),
        ]
        for i, change in enumerate(cases):
            with self.subTest(case=i): self.reject(change)


if __name__ == '__main__':
    unittest.main()
