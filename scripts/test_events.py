"""Identity, chronology, referential integrity and lossless legacy migration."""
import copy
import unittest
from unittest.mock import patch
import build_events as build


class EventTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = build.compile_events()

    def mutated(self, name, mutate):
        original = build.read
        def read(path):
            v = copy.deepcopy(original(path))
            if path == name: mutate(v)
            return v
        return patch.object(build, 'read', read)

    def test_committed_projection_and_navigation(self):
        self.assertEqual(self.index, build.read('data/events/index.json'))
        self.assertEqual(build.navigation(self.index), build.read('data/events/navigation.json'))
        self.assertEqual(self.index, build.compile_events())

    def test_lossless_origin_coverage(self):
        count = 0
        for p in self.index['periods']:
            pid = p['id'];data = build.read(f'data/{pid}/records.json')
            events = list(data['events'].values()) if pid == 'kingdom' else [e for r in data['years'].values() for e in r['events']]
            count += len(events)
            for e in events:
                projected = self.index['entries'][pid+':'+e['id']]
                self.assertEqual(projected['title'], e['title'])
                self.assertEqual(projected['text'], e.get('description', e.get('text')))
                self.assertTrue(projected['origins'])
        self.assertEqual(sum(bool(e['origins']) for e in self.index['entries'].values()), count)

    def test_words_and_source_order_do_not_assign_ids(self):
        def change(data):
            rows = data['years']['1071']['events'];rows.reverse();rows[0]['title']='Edited words'
        with self.mutated('data/byzantine/records.json', change):
            edited = build.compile_events()
        self.assertEqual(set(edited['entries']), set(self.index['entries']))
        self.assertNotEqual(edited['version'], self.index['version'])
        self.assertEqual(edited['entries']['byzantine:byz-1071-1']['title'], 'Edited words')

    def test_one_cross_year_object_and_multiple_year_memberships(self):
        key='byzantine:fourth-crusade-1202-1204'
        e=self.index['entries'][key]
        self.assertEqual(e['spans'], [[1202,1204]])
        self.assertEqual([r['year'] for r in e['years']], [1202,1203,1204])
        for y in [1202,1203,1204]: self.assertEqual(self.index['byYear'][f'byzantine:{y}'].count(key),1)
        self.assertEqual(sum(e['id']==key for e in self.index['entries'].values()),1)

    def test_manuscript_window_is_not_duplicated(self):
        for key, years in [('byzantine:byz-951-1',[951,952]),('byzantine:byz-1013-1',[1012,1013])]:
            e=self.index['entries'][key]
            self.assertEqual(e['date']['extent'],'window')
            self.assertEqual([r['year'] for r in e['years']],years)
            for y in years: self.assertEqual(self.index['byYear'][f'byzantine:{y}'].count(key),1)

    def test_person_place_and_year_reference_same_identity(self):
        key='byzantine:manzikert-1071'
        self.assertIn(key,self.index['byPerson']['byzantine:romanos-iv'])
        self.assertIn(key,self.index['byPlace']['manzikert'])
        self.assertIn(key,self.index['byYear']['byzantine:1071'])
        self.assertNotIn('byzantine:bari-1071',self.index['byPerson']['byzantine:romanos-iv'])

    def test_explicit_source_windows_do_not_become_continuous_events(self):
        e=self.index['entries']['empire:emp-bc14-1']
        self.assertEqual(e['spans'],[[-16,-13]])
        self.assertEqual(e['recordKind'],'background')
        self.assertEqual(e['date']['extent'],'window')
        self.assertEqual(e['origins'][0]['year'],-14)

    def test_summary_and_children_are_different_types(self):
        self.assertEqual(self.index['entries']['byzantine:byz-1071-1']['recordKind'],'annual-summary')
        for id in ['byzantine:manzikert-1071','byzantine:bari-1071']:
            self.assertEqual(self.index['entries'][id]['recordKind'],'event')
            self.assertIn({'type':'expands','event':'byzantine:byz-1071-1'}, self.index['entries'][id]['relations'])

    def test_missing_metadata_and_duplicate_ids_fail(self):
        with self.mutated('data-source/events/metadata.json',lambda v:v.pop('republic:rep-bc44-1')):
            with self.assertRaisesRegex(ValueError,'Missing metadata'):build.compile_events()
        with self.mutated('data/byzantine/records.json',lambda v:v['years']['1071']['events'].append(copy.deepcopy(v['years']['1071']['events'][0]))):
            with self.assertRaisesRegex(ValueError,'Duplicate source'):build.compile_events()

    def test_bad_links_enums_and_evidence_fail(self):
        for field,value,message in [('people',[dict(period='byzantine',person='missing',role='participant',basis='basis')],'Broken event person'),('places',['missing'],'Broken event place'),('topics',['unrecognized'],'Invalid themes'),('recordKind','guess','Invalid event'),('references',[],'Unsourced event'),('relations',[dict(type='part-of',event='missing')],'Broken event relation')]:
            with self.subTest(field=field),self.mutated('data-source/events/events.json',lambda v:v[0].update({field:value})):
                with self.assertRaisesRegex(ValueError,message):build.compile_events()

    def test_cycles_and_invalid_citations_fail(self):
        with self.mutated('data-source/events/events.json',lambda v:v[0].update(relations=[dict(type='part-of',event=v[0]['id'])])):
            with self.assertRaisesRegex(ValueError,'Broken event relation'):build.compile_events()
        for field,value in [('url','javascript:alert(1)'),('locator',''),('consultation','assumed'),('checked',None)]:
            with self.subTest(field=field),self.mutated('data-source/events/events.json',lambda v:v[0]['references'][0].update({field:value})):
                with self.assertRaises((ValueError,TypeError)):build.compile_events()

    def test_date_semantics_and_no_zero(self):
        date=copy.deepcopy(self.index['entries']['byzantine:manzikert-1071']['date'])
        for endpoint in ['start','end']: date[endpoint]={'year':-1 if endpoint=='start' else 1,'precision':'year'}
        date['extent']='span';build.check_date(date)
        for value in [0,1.5,2000]:
            bad=copy.deepcopy(date);bad['start']['year']=value
            with self.assertRaises(ValueError):build.check_date(bad)
        bad=copy.deepcopy(date);bad['start']={'year':1071,'month':2,'day':29,'precision':'day'}
        with self.assertRaises(ValueError):build.check_date(bad)
        bad=copy.deepcopy(date);bad['start']={'year':1,'month':2,'precision':'year'}
        with self.assertRaises(ValueError):build.check_date(bad)
        bad=copy.deepcopy(date);bad['start']['year']=2
        with self.assertRaisesRegex(ValueError,'Reversed'):build.check_date(bad)

    def test_old_id_migrations_are_explicit_one_hop(self):
        event=self.index['entries']['byzantine:manzikert-1071']
        alias=dict(target=event['id'],reason='Test-only editorial migration',references=event['references'])
        with self.mutated('data-source/events/aliases.json',lambda v:v.update({'byzantine:retired-test':alias})):
            self.assertEqual(build.compile_events()['aliases']['byzantine:retired-test']['target'],event['id'])
        alias['target']='byzantine:unknown'
        with self.mutated('data-source/events/aliases.json',lambda v:v.update({'byzantine:retired-test':alias})):
            with self.assertRaisesRegex(ValueError,'Invalid event alias'):build.compile_events()


if __name__ == '__main__':unittest.main()
