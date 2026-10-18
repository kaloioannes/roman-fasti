"""Identity corruption, no automatic merges, faithful offices and year links."""
import copy
import unittest
from urllib.parse import parse_qs, urlsplit

import build_people as build


class PeopleTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = build.read('data-source/people/identities.json')
        cls.index = build.compile_people()
        cls.periods = [p for p in build.read('project.json')['periods'] if p['status'] == 'available']
        cls.volumes = {p['id']: build.read(f'data/{p["id"]}/records.json') for p in cls.periods}

    def test_committed_projection_and_determinism(self):
        self.assertEqual(self.index, build.read('data/people/index.json'))
        self.assertEqual(self.index, build.compile_people())

    def test_explicit_bidirectional_identities(self):
        self.assertEqual(self.index['lookup']['republic:p6faf564142'], self.index['lookup']['empire:augustus'])
        for pid in ['theodosius-i', 'arcadius', 'honorius']:
            self.assertEqual(self.index['lookup'][f'empire:{pid}'], self.index['lookup'][f'divided-empire:{pid}'])
        for pid in ['zeno', 'basiliscus']:
            self.assertEqual(self.index['lookup'][f'divided-empire:{pid}'], self.index['lookup'][f'byzantine:{pid}'])
        self.assertEqual(self.index['lookup']['divided-empire:marcus-east'], self.index['lookup']['byzantine:marcus'])
        self.assertNotIn('divided-empire:marcus-britain', self.index['lookup'])
        for key, gid in self.index['lookup'].items():
            self.assertIn(key, [p['period']+':'+p['person'] for p in self.index['people'][gid]['profiles']])

    def test_homonymous_local_ids_stay_distinct(self):
        for pid in ['constantine-iii', 'constans-ii']:
            a, b = f'divided-empire:{pid}', f'byzantine:{pid}'
            self.assertFalse(self.index['lookup'].get(a) and self.index['lookup'].get(a) == self.index['lookup'].get(b))
            self.assertTrue(any({a, b} == {p['period']+':'+p['person'] for p in d['profiles']} for d in self.index['distinct']))

    def test_names_and_ids_never_generate_identity(self):
        volumes = copy.deepcopy(self.volumes)
        # Manufacture identical names in two existing records; no new mapping.
        for v in ['divided-empire', 'byzantine']:
            volumes[v]['people']['constantine-iii']['zh'] = '完全相同的名字'
            volumes[v]['people']['constantine-iii']['latin'] = 'Same Name'
        self.assertEqual(build.compile_people(volumes=volumes)['lookup'], self.index['lookup'])

    def test_all_appointments_keep_source_records(self):
        for identity in self.index['people'].values():
            for profile in identity['profiles']:
                pid, person = profile['period'], profile['person']
                data = self.volumes[pid]
                expected = []
                if pid == 'republic':
                    for year, record in data['years'].items():
                        expected.extend(o for o in record['officers'] if o['person'] == person)
                else:
                    expected = data['people'][person]['reigns']
                self.assertEqual([a['record'] for a in profile['appointments']], expected)

    def test_augustus_all_seven_consulships_and_no_invented_offices(self):
        p = self.index['people']['roman-augustus']['profiles'][0]
        self.assertEqual([a['start'] for a in p['appointments']], [-43, -33, -31, -30, -29, -28, -27])
        self.assertEqual(len(p['appointments']), 7)

    def test_years_are_actual_memberships_not_whole_reign_spans(self):
        for identity in self.index['people'].values():
            union = set()
            for p in identity['profiles']:
                pid, person = p['period'], p['person']
                expected = set()
                for raw, record in self.volumes[pid]['years'].items():
                    members = record['officers'] if pid == 'republic' else record['rulers']
                    if any((m if isinstance(m, str) else m['person']) == person for m in members):
                        expected.add(-int(raw) if pid == 'republic' else int(raw))
                self.assertEqual({r['year'] for r in p['years']}, expected)
                union |= expected
            self.assertEqual([y['year'] for y in identity['years']], sorted(union))
            self.assertNotIn(0, union)

    def test_overlapping_boundary_keeps_both_volume_links(self):
        year = next(y for y in self.index['people']['roman-augustus']['years'] if y['year'] == -27)
        self.assertEqual({p['period'] for p in year['profiles']}, {'republic', 'empire'})
        self.assertEqual({parse_qs(urlsplit(p['url']).fragment)['year'][0] for p in year['profiles']}, {'27', '-27'})

    def test_all_profile_and_year_routes_resolve(self):
        for person in self.index['people'].values():
            for p in person['profiles']:
                for url in [p['url']] + [r['url'] for r in p['years']]:
                    params = parse_qs(urlsplit(url).fragment)
                    data = self.volumes[p['period']]
                    if 'person' in params:
                        self.assertIn(params['person'][0], data['people'])
                    if 'year' in params:
                        self.assertIn(params['year'][0], data['years'])

    def test_zeno_exile_restoration_precision_and_disagreement_preserved(self):
        d, b = self.index['people']['roman-zeno']['profiles']
        self.assertEqual([a['record']['kind'] for a in d['appointments']], ['central', 'exile', 'central'])
        self.assertEqual(len(b['appointments']), 2)
        self.assertEqual(d['appointments'][0]['record']['startDate']['value'], '0474-02-09')
        self.assertEqual(b['appointments'][0]['record']['startDate']['value'], '0474-01-29')
        self.assertEqual(d['appointments'][2]['record']['startDate']['precision'], 'month')
        self.assertEqual(d['years'][-1]['year'], 476)
        self.assertEqual(b['years'][-1]['year'], 491)

    def reject(self, mutate, regex):
        source = copy.deepcopy(self.source)
        mutate(source)
        with self.assertRaisesRegex(ValueError, regex):
            build.compile_people(source, volumes=self.volumes)

    def test_missing_profile_fails(self):
        self.reject(lambda s: s['people'][0]['profiles'][0].update(person='missing'), 'Invalid identity target')

    def test_duplicate_profile_fails(self):
        self.reject(lambda s: s['people'][1]['profiles'].append(s['people'][0]['profiles'][0]), 'mapped more than once')

    def test_duplicate_global_id_fails(self):
        self.reject(lambda s: s['people'][1].update(id=s['people'][0]['id']), 'duplicate global ID')

    def test_identity_reuse_fails(self):
        self.reject(lambda s: s['people'][0]['profiles'][0]['identityCheck'].update(wikiTitle='A different Octavius'), 'Identity marker changed')

    def test_missing_or_invalid_evidence_fails(self):
        self.reject(lambda s: s['people'][0]['profiles'][0].update(evidence=[]), 'Invalid evidence')
        self.reject(lambda s: s['people'][0]['profiles'][0].update(evidence=['missing']), 'Invalid evidence')
        self.reject(lambda s: s['evidence']['rg1'].update(url='javascript:alert(1)'), 'Invalid evidence URL')
        self.reject(lambda s: s['evidence']['rg1'].update(consultation='assumed'), 'consultation status')
        self.reject(lambda s: s['evidence']['rg1'].update(locator=''), 'Incomplete evidence')

    def test_single_volume_is_not_cross_volume_identity(self):
        self.reject(lambda s: s['people'][0].update(profiles=s['people'][0]['profiles'][:1]), 'must cross volumes')

    def test_explicitly_distinct_people_cannot_be_merged(self):
        def mutate(s):
            row = copy.deepcopy(s['people'][0])
            row['id'] = 'incorrect-identity'
            row['profiles'] = []
            for p in s['distinct'][0]['profiles']:
                record = self.volumes[p['period']]['people'][p['person']]
                row['profiles'].append({**p, 'identityCheck': {'zh': record['zh']}, 'evidence': ['dir-distinct'], 'editorNote': 'Intentional bad merge'})
            s['people'].append(row)
        self.reject(mutate, 'Distinct people were merged')

    def test_search_mapping_is_explicit_and_preserves_local_results(self):
        import build_search
        entries = {e['id']: e for e in build_search.compile_index()['entries'] if e['kind'] == 'person'}
        for key, gid in self.index['lookup'].items():
            period, person = key.split(':', 1)
            e = entries[f'{period}:person:{person}']
            self.assertEqual(e['globalPerson'], gid)
            self.assertTrue(e['url'].startswith(period+'/#'))
        self.assertNotIn('globalPerson', entries['divided-empire:person:constantine-iii'])
        self.assertNotIn('globalPerson', entries['byzantine:person:constantine-iii'])


if __name__ == '__main__':
    unittest.main()
