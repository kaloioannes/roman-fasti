"""Gazetteer evidence, date precision, explicit edges and deterministic publication."""
import copy
import unittest
from unittest.mock import patch
import build_places as build
import build_events as events


class PlaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = build.compile_places()

    def test_complete_projection_is_deterministic_and_all_events_survive(self):
        self.assertEqual(self.index, events.read('data/places/index.json'))
        self.assertEqual(self.index, build.compile_places())
        source = events.compile_events()
        self.assertEqual(set(source['entries']), set(self.index['entries']))
        for id, e in self.index['entries'].items():
            self.assertEqual(e['date'], source['entries'][id]['date'])
            self.assertEqual(e['spans'], source['entries'][id]['spans'])
            self.assertEqual([r['place'] for r in e['placeRelations']], source['entries'][id]['places'])

    def test_old_ids_and_citations_survive_without_guessed_coordinates(self):
        places = self.index['places']
        original = events.read('data-source/events/places.json')
        self.assertTrue(set(original) <= set(places))
        for id, p in original.items():
            self.assertTrue(set(p['aliases']) <= set(places[id]['aliases']))
            self.assertTrue(all(r in places[id]['references'] for r in p['references']))
        for id in ['rubicon','alba-longa','zama','kleidion','dalmatia']:
            self.assertFalse(places[id]['locations'])
        self.assertNotEqual(places['nicaea']['locations'][0]['coordinates'], places['nicaea-gaul']['locations'][0]['coordinates'])
        self.assertNotEqual(places['astacus']['locations'][0]['coordinates'], places['nicomedia']['locations'][0]['coordinates'])
        self.assertEqual(places['manzikert']['external'][0]['relation'], 'comparison')
        self.assertEqual(places['adrianople']['external'][0]['id'], '501428')

    def test_references_are_locatable_and_do_not_upgrade_inherited_event_research(self):
        for p in self.index['places'].values():
            for ref in p['references']:
                events.check_reference(ref)
                if ref.get('access') == 'dataset':
                    self.assertEqual(ref['access'], 'dataset')
                    self.assertIn(ref['edition'], ref['snapshot'])
                    self.assertIn(ref['locator'].split(' · ')[0], ref['snapshot'])
                    self.assertEqual(ref['license'], 'CC BY 3.0')
        e=events.compile_events()['entries']['byzantine:byz-526-1']
        self.assertEqual([r['place'] for r in e['placeRelations']], ['antioch'])
        self.assertTrue(all(r['consultation']=='inherited' for r in e['placeRelations'][0]['references']))

    def test_bad_coordinates_dates_sources_and_identity_are_rejected(self):
        original=events.read
        mutations=[lambda v:v['places']['rome']['locations'][0].update(coordinates=[181,45]),
                   lambda v:v['places']['rome']['locations'][0].update(coordinates=[float('nan'),45]),
                   lambda v:v['places']['rome']['locations'][0].update(fromYear=0),
                   lambda v:v['places']['rome']['locations'][0].update(fromYear=400,toYear=300),
                   lambda v:v['places']['rome']['locations'][0].update(references=[999]),
                   lambda v:v['places']['rome']['locations'][0].update(precision='exact-battlefield'),
                   lambda v:v['places']['rome']['references'][0].update(snapshot=''),
                   lambda v:v['places']['rome']['references'][0].update(snapshot='javascript:alert(1)'),
                   lambda v:v['places']['rome']['references'][0].update(edition='main'),
                   lambda v:v['places']['rome'].update(catalogPeriods=['unknown']),
                   lambda v:v['places']['rome'].update(aliases=[]),
                   lambda v:v['places']['nicaea']['connections'][0].update(place='missing'),
                   lambda v:v['places'].pop('rome')]
        for mutate in mutations:
            def read(path):
                v=copy.deepcopy(original(path))
                if path=='data-source/places/gazetteer.json':mutate(v)
                return v
            with self.subTest(mutate=mutate),patch.object(events,'read',read),self.assertRaises(ValueError):
                build.compile_places()


if __name__=='__main__':
    unittest.main()
