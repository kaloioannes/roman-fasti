"""Every source office survives; names only create review candidates."""
import copy
import unittest
from collections import Counter

import build_republic_people as build


class RepublicanPeopleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build.read('data/republic/records.json')
        cls.index = build.compile_index()

    def test_determinism_and_generated_review(self):
        self.assertEqual(self.index, build.read('data/republic/people.json'))
        self.assertEqual(self.index, build.compile_index())
        self.assertEqual(build.review_markdown(self.index, self.data),
                         (build.ROOT / 'docs/republic-identity-review.md').read_text(encoding='utf-8'))

    def test_all_people_and_every_office_exactly_once(self):
        self.assertEqual(set(self.index['people']), set(self.data['people']))
        expected = Counter((int(y), i, o['person'], o['role'], o['term'], o['note'])
                           for y, r in self.data['years'].items() for i, o in enumerate(r['officers']))
        actual = Counter()
        for pid, p in self.index['people'].items():
            years, roles = [], []
            for ref in p['appointments']:
                y, i = ref['year'], ref['index']
                o = self.data['years'][str(y)]['officers'][i]
                actual[(y, i, pid, o['role'], o['term'], o['note'])] += 1
                years.append(y)
                roles.append(o['role'])
            self.assertEqual(years, sorted(years, reverse=True))
            self.assertEqual(p['years'], list(dict.fromkeys(years)))
            self.assertEqual(p['roles'], list(dict.fromkeys(roles)))
        self.assertEqual(actual, expected)

    def test_compilation_does_not_mutate_source(self):
        before = copy.deepcopy(self.data)
        build.compile_index(self.data)
        self.assertEqual(self.data, before)

    def test_multi_term_and_two_offices_in_same_year(self):
        augustus = self.index['people']['p6faf564142']
        self.assertEqual(augustus['years'], [43, 33, 31, 30, 29, 28, 27])
        caesar = self.index['people']['pe9d1a9956a']
        self.assertEqual(len(caesar['appointments']), 5)
        for pid, p in self.index['people'].items():
            refs = [r for r in p['appointments'] if r['year'] == 451]
            if len(refs) > 1:
                self.assertEqual(len(refs), 2)
                self.assertEqual({self.data['years']['451']['officers'][r['index']]['role'] for r in refs}, {'consul', 'decemvir'})
                break
        else:
            self.fail('Lost 451 BC parallel office records')

    def test_all_unidentified_in_report_including_unique_names(self):
        expected = {pid for pid, p in self.data['people'].items() if not p['identified']}
        self.assertEqual(set(self.index['unidentified']), expected)
        report = build.review_markdown(self.index, self.data).split('## 全部身份待考条目')[1]
        self.assertTrue(all(pid in report for pid in expected))
        self.assertTrue(any(not self.index['people'][pid]['sameNames'] for pid in expected))

    def test_homonyms_complete_symmetric_and_unmerged(self):
        for pid, p in self.index['people'].items():
            expected = {other for other, row in self.data['people'].items() if other != pid and build.normalize(row['latin']) == build.normalize(self.data['people'][pid]['latin'])}
            self.assertEqual(set(p['sameNames']), expected)
            self.assertTrue(all(pid in self.index['people'][other]['sameNames'] for other in expected))
        self.assertTrue(all(g['status'] == 'needs-research' for g in self.index['candidates']))
        self.assertEqual(self.index['redirects'], {})

    def test_names_only_produce_candidates(self):
        data = copy.deepcopy(self.data)
        ids = list(data['people'])[:2]
        for pid in ids:
            data['people'][pid]['latin'] = 'Same Name'
            data['people'][pid]['zh'] = '同名'
        result = build.compile_index(data)
        self.assertEqual(len(result['people']), len(data['people']))
        self.assertIn(ids[1], result['people'][ids[0]]['sameNames'])
        self.assertEqual(result['redirects'], {})

    def test_search_aliases_and_original_identity_titles(self):
        names = self.index['people']['pe9d1a9956a']['names']
        self.assertIn('Julius Caesar', names)
        self.assertIn('屋大维', self.index['people']['p6faf564142']['names'])
        self.assertEqual(build.normalize('JÚLIUS'), build.normalize('Iulius'))

    def ledger(self, old='p0000000000', target='pe9d1a9956a'):
        return {'schemaVersion': 1, 'method': 'Test-only explicit migration fixture', 'redirects': {
            old: {'person': target, 'note': 'Fixture; never committed as historical migration', 'sources': [
                {'label': 'Fixture', 'url': 'https://example.org/evidence', 'locator': 'test'}]}}}

    def test_explicit_old_id_preserves_target_without_changing_offices(self):
        value = build.compile_index(ledger=self.ledger())
        self.assertEqual(value['people'], self.index['people'])
        self.assertEqual(value['redirects']['p0000000000']['person'], 'pe9d1a9956a')

    def test_reject_live_missing_chained_and_evidenceless_redirects(self):
        cases = [self.ledger(old='pe9d1a9956a'), self.ledger(target='missing')]
        chain = self.ledger(target='p0000000001')
        chain['redirects']['p0000000001'] = self.ledger()['redirects']['p0000000000']
        cases.append(chain)
        for field in ['note', 'sources']:
            ledger = self.ledger()
            ledger['redirects']['p0000000000'][field] = '' if field == 'note' else []
            cases.append(ledger)
        ledger = self.ledger()
        del ledger['redirects']['p0000000000']['sources'][0]['locator']
        cases.append(ledger)
        for value in cases:
            with self.subTest(value=value), self.assertRaises(ValueError):
                build.compile_index(ledger=value)

    def test_missing_office_fails(self):
        data = copy.deepcopy(self.data)
        data['years']['44']['officers'][0]['person'] = 'missing'
        with self.assertRaises(ValueError):
            build.compile_index(data)


if __name__ == '__main__':
    unittest.main()
