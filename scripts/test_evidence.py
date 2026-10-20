"""Research integrity: provenance, editorial choices, legacy preservation and export."""
import copy
import unittest
from unittest.mock import patch
import build_events as build


class EvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls): cls.index = build.compile_events()

    def edited(self, file, change):
        original = build.read
        def read(path):
            data = copy.deepcopy(original(path))
            if path == file: change(data)
            return data
        return patch.object(build, 'read', read)

    def test_all_citations_disclose_scope_without_overwriting_previous_reading(self):
        for e in self.index['entries'].values():
            for r in e['references']:
                self.assertIn(r['sourceKind'], self.index['sourceKinds'])
                self.assertIn(r['access'], self.index['access'])
                self.assertTrue(r['scope'])
                build.check_reference(r)
            self.assertEqual(len({r['id'] for r in e['references']}),len(e['references']))
        for original in build.read('data-source/events/events.json'):
            projected = self.index['entries'][original['id']]['references']
            for before, after in zip(original['references'], projected):
                for field in before: self.assertEqual(before[field],after[field])
        # Research does not create a new annual bucket, person relation or date.
        with self.edited('data-source/evidence/dossiers.json',lambda d:d.clear()), self.edited('data-source/evidence/sources.json',lambda d:d.clear()):
            plain = build.compile_events()
        self.assertEqual(set(plain['entries']),set(self.index['entries']))
        for id,e in self.index['entries'].items():
            for k in ['date','text','origins','people','placeRelations','years','relations']:
                self.assertEqual(e[k],plain['entries'][id][k])

    def test_dossiers_are_reachable_and_all_claims_have_locators(self):
        nav = build.navigation(self.index)
        for id,d in build.read('data-source/evidence/dossiers.json').items():
            self.assertTrue(nav['entries'][id]['hasEvidence'])
            self.assertIn('evidence=claim%3A'+d['claims'][0]['id'],nav['entries'][id]['evidenceUrl'])
            self.assertEqual(self.index['entries'][id]['evidence']['claims'],d['claims'])
            refs={r['id']:r for r in self.index['entries'][id]['references']}
            for c in d['claims']:
                for ref in c['references']: self.assertTrue(refs[ref]['locator'])
        self.assertEqual({e['period'] for e in self.index['entries'].values() if e['evidence']},
                         {p['id'] for p in self.index['periods']})

    def test_abstract_does_not_claim_to_be_full_text(self):
        e = self.index['entries']['byzantine:byz-674-1']
        inherited = next(r for r in e['references'] if 'Oman' in r['label'])
        self.assertEqual(inherited['sourceKind'],'modern')
        self.assertEqual(inherited['consultation'],'inherited')
        self.assertIsNone(inherited['checked'])
        ref = next(r for r in e['references'] if r['id']=='reassessment')
        self.assertEqual(ref['access'],'abstract')
        self.assertIn('没有取得',ref['scope'])
        indirect = next(r for r in e['references'] if r['id']=='howard-indirect')
        self.assertEqual(indirect['consultation'],'indirect')
        self.assertIn('Modern reassessment',indirect['via']['label'])

    def test_editorial_choices_and_translation_note_are_explicit(self):
        siege = self.index['entries']['byzantine:byz-678-1']['evidence']['disputes'][0]
        self.assertEqual(siege['adopted'],'qualified')
        self.assertEqual(len(siege['positions']),4)
        for y in [1205,1208]:
            d = self.index['entries'][f'byzantine:byz-{y}-1']['evidence']['disputes'][0]
            self.assertEqual(d['adopted'],'separate')
            self.assertTrue(d['rationale'] and d['limits'])
        e = self.index['entries']['byzantine:manzikert-1071']
        self.assertIn('Sewter',e['evidence']['claims'][1]['text'])

    def test_broken_claims_or_dispute_positions_fail(self):
        key='byzantine:byz-674-1'; file='data-source/evidence/dossiers.json'
        mutations = [
            lambda d:d.update({'missing:event':d.pop(key)}),
            lambda d:d[key]['claims'][0].update(references=['missing']),
            lambda d:d[key]['claims'].append(d[key]['claims'][0]),
            lambda d:d[key]['disputes'][0].update(adopted='missing'),
            lambda d:d[key]['disputes'][0].update(rationale=''),
            lambda d:d[key]['disputes'][0]['positions'].pop(),
            lambda d:d[key]['citations'][0].update(source='missing'),
            lambda d:d[key]['citations'][0].update(id='legacy-1'),
        ]
        # Removing the final position makes its dedicated citation unused.
        for mutation in mutations:
            with self.subTest(mutation=mutation),self.edited(file,mutation):
                with self.assertRaises(ValueError): build.compile_events()

    def test_invalid_access_dates_urls_and_indirect_paths_fail(self):
        key='byzantine:byz-674-1'; file='data-source/evidence/dossiers.json'
        for change in [dict(access='legacy'),dict(checked='2026-02-30'),dict(checked=None),dict(url='javascript:alert(1)'),
                       dict(scope=''),dict(consultation='inherited')]:
            with self.subTest(change=change),self.edited(file,lambda d:d[key]['citations'][0].update(change)):
                with self.assertRaises(ValueError):build.compile_events()
        with self.edited(file,lambda d:d[key]['citations'][2].pop('via')):
            with self.assertRaisesRegex(ValueError,'indirect'):build.compile_events()
        def bibliography(d):
            for r in d[key]['citations']:
                r.update(access='bibliography',consultation='direct');r.pop('via',None)
        with self.edited(file,bibliography):
            with self.assertRaisesRegex(ValueError,'Bibliography'):build.compile_events()

    def test_evidence_revision_updates_content_version_and_is_deterministic(self):
        key='kingdom:foundation'
        with self.edited('data-source/evidence/dossiers.json',lambda d:d[key]['claims'][0].update(note='Revised research limit')):
            changed=build.compile_events()
        self.assertEqual(changed['entries'][key]['id'],key)
        self.assertNotEqual(changed['version'],self.index['version'])
        self.assertEqual(self.index,build.compile_events())


if __name__=='__main__':unittest.main()
