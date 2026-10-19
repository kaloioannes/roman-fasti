"""Bidirectional reading edges, explicit identities and evidence failure modes."""
import copy
import unittest
from unittest.mock import patch
import build_events as build
from review_event_link_candidates import candidates


class EventLinkTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = build.compile_events()

    def edited(self, name, mutate):
        original = build.read
        def read(path):
            value = copy.deepcopy(original(path))
            if path == name:
                mutate(value)
            return value
        return patch.object(build, 'read', read)

    def test_every_edge_has_evidence_and_exact_inverse(self):
        index = self.index
        for id, e in index['entries'].items():
            self.assertEqual(e['places'], [p['place'] for p in e['placeRelations']])
            for p in e['people']:
                self.assertEqual(index['byPerson'][p['period']+':'+p['person']].count(id), 1)
            for p in e['placeRelations']:
                self.assertEqual(index['byPlace'][p['place']].count(id), 1)
                self.assertEqual(p['url'], 'places/#place='+p['place'])
            for edge in e['people'] + e['placeRelations']:
                self.assertTrue(edge['basis'])
                self.assertTrue(edge['evidence']['note'])
                self.assertTrue(edge['references'])
                for ref in edge['references']:
                    build.check_reference(ref)
                    self.assertEqual(ref['consultation'], 'inherited')
                if edge['evidence']['kind'] == 'event-text':
                    self.assertIn(edge['evidence']['quote'], e['title']+'\n'+e['text'])
        for key, ids in index['byPerson'].items():
            self.assertEqual(len(ids), len(set(ids)))
            self.assertEqual(set(ids), {id for id,e in index['entries'].items() if any(p['period']+':'+p['person']==key for p in e['people'])})
        for key, ids in index['byPlace'].items():
            self.assertEqual(set(ids), {id for id,e in index['entries'].items() if key in e['places']})

    def test_cross_volume_aggregation_uses_only_identity_table(self):
        index=self.index; identities=build.read('data/people/index.json')
        for global_id, person in identities['people'].items():
            expected={id for p in person['profiles'] for id in index['byPerson'].get(p['period']+':'+p['person'], [])}
            self.assertEqual(set(index['byGlobalPerson'][global_id]), expected)
        augustus=identities['lookup']['empire:augustus']
        self.assertIn('republic:rep-bc27-1',index['byGlobalPerson'][augustus])
        self.assertIn('empire:emp-bc27-1',index['byGlobalPerson'][augustus])

    def test_mention_and_reign_do_not_create_participation(self):
        index=self.index
        for event, person in [('empire:emp-ad378-1','gratian'),('byzantine:byz-626-1','heraclius')]:
            edge=next(p for p in index['entries'][event]['people'] if p['person']==person)
            self.assertEqual(edge['role'],'mentioned')
        self.assertNotIn('byzantine:bari-1071',index['byPerson']['byzantine:romanos-iv'])
        self.assertNotIn('byzantine:byz-541-1',index['byPerson'].get('byzantine:justinian-i',[]))
        # Same-name contemporary Republican entries remain separate.
        self.assertNotIn('republic:rep-bc107-1',index['byPerson'].get('republic:p7c8c28aa29',[]))

    def test_undated_and_cross_year_places_keep_one_event(self):
        index=self.index
        self.assertEqual(index['entries']['kingdom:ostia-foundation']['years'],[])
        self.assertIn('kingdom:ostia-foundation',index['byPlace']['ostia'])
        self.assertEqual(index['byPlace']['constantinople'].count('byzantine:fourth-crusade-1202-1204'),1)
        self.assertEqual([r['year'] for r in index['entries']['byzantine:fourth-crusade-1202-1204']['years']],[1202,1203,1204])

    def test_invalid_or_stale_editorial_edges_fail(self):
        path='data-source/events/links.json';key='republic:rep-bc44-1'
        mutations=[(lambda v:v[key]['people'][0].update(person='absent'),'Broken editorial person'),
                   (lambda v:v[key]['people'][0].update(role='reigning'),'Unexplained link'),
                   (lambda v:v[key]['people'][0].update(quote='invented quotation'),'Link evidence no longer matches'),
                   (lambda v:v[key]['people'][0].update(references=[999]),'Invalid link evidence'),
                   (lambda v:v[key]['people'][0].update(references=[]),'Invalid link evidence'),
                   (lambda v:v[key]['people'].append(copy.deepcopy(v[key]['people'][0])),'Duplicate editorial link')]
        for mutate,message in mutations:
            with self.subTest(message=message),self.edited(path,mutate),self.assertRaisesRegex(ValueError,message):
                build.compile_events()
        with self.edited(path,lambda v:v.update({'empire:absent':copy.deepcopy(v[key])})),self.assertRaisesRegex(ValueError,'Orphan editorial'):
            build.compile_events()
        for field,value,message in [('place','absent','Broken editorial place'),('role','conquered','Unexplained link')]:
            with self.edited(path,lambda v:v['kingdom:foundation']['places'][0].update({field:value})),self.assertRaisesRegex(ValueError,message):
                build.compile_events()

    def test_navigation_covers_all_editable_edges_without_full_archive(self):
        nav=build.navigation(self.index)
        for id,e in self.index['entries'].items():
            if e['people'] or e['places']:
                self.assertIn(id,nav['entries'])
                self.assertEqual(len(nav['entries'][id]['people']),len(e['people']))
        self.assertNotIn('text',next(iter(nav['entries'].values())))
        self.assertFalse(any('references' in p for e in nav['entries'].values() for p in e['people']))

    def test_text_mentions_stay_candidates_and_keep_ambiguous_ids(self):
        index={'entries':{'republic:test':dict(period='republic',title='同名人物行动',text='Marcus Example appears here',people=[])}}
        volumes={'republic':{'people':{'first':dict(zh='某甲',latin='Marcus Example'), 'second':dict(zh='某乙',latin='Marcus Example')}}}
        before=copy.deepcopy(index)
        report=candidates(index,volumes)
        self.assertEqual({r['person'] for r in report[0]['candidates']},{'republic:first','republic:second'})
        self.assertEqual(report[0]['status'],'unreviewed')
        self.assertEqual(index,before)


if __name__ == '__main__':
    unittest.main()
