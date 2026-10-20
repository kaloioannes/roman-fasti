"""Narrative evidence, exact identity links, adapters, reverse indexes and failures."""
import copy
import unittest
from unittest.mock import patch
import build_stories as b


class Stories(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = b.compile_stories()

    def test_committed_and_deterministic(self):
        self.assertEqual(b.read('data/stories/index.json'), self.index)
        self.assertEqual(b.compile_stories(), self.index)
        self.assertEqual(b.read('data/stories/navigation.json'), b.navigation(self.index))

    def test_existing_republican_edition_preserved(self):
        for old in b.read('data/republic/stories.json'):
            new = self.index['stories'][old['id']]
            self.assertTrue(new['legacy'])
            self.assertEqual([c['paragraphs'][0] for c in new['chapters']], [c['text'] for c in old['chapters']])
            self.assertEqual([c['year'] for c in new['chapters']], [-c['year'] for c in old['chapters']])
            for c, original in zip(new['chapters'], old['chapters']):
                self.assertEqual(c['references'][0]['locator'], original['reference'])
                self.assertEqual(self.index['sources'][c['references'][0]['source']]['access'], 'inherited')

    def test_bidirectional_navigation_exactly_matches_editorial_links(self):
        expected_year, expected_person = {}, {}
        for sid, s in self.index['stories'].items():
            for c in s['chapters']:
                row = dict(story=sid, chapter=c['id'])
                expected_year.setdefault(f'{s["period"]}:{c["year"]}', []).append(row)
                for p in c['people']:
                    expected_person.setdefault(p['key'], []).append(row)
        self.assertEqual(self.index['byYear'], expected_year)
        self.assertEqual(self.index['byPerson'], expected_person)

    def test_historical_semantics(self):
        stories = self.index['stories']
        self.assertEqual({s['period'] for s in stories.values()}, {'kingdom','republic','empire','divided-empire','byzantine'})
        self.assertEqual(stories['exile-and-return']['chapters'][-1]['year'], 1261)
        shared = stories['kings-and-citizens']['chapters'][1]
        self.assertEqual(shared['dateKind'], 'reading-anchor')
        self.assertIn('未定', shared['dateLabel'])
        self.assertEqual(stories['tetrarchy-to-civil-war']['chapters'][-1]['year'], 324)
        self.assertTrue(any('Galerius' in name for name in stories['tetrarchy-to-civil-war']['aliases']))
        self.assertIn('帝号', stories['two-courts']['chapters'][-1]['paragraphs'][0])
        self.assertEqual(self.index['sources']['psellus']['access'], 'inherited')

    def test_reject_bad_edits(self):
        original=b.read
        mutations=[lambda v:v['stories'][0]['chapters'][0].update(year=0),
                   lambda v:v['stories'][0]['chapters'][1].update(id=v['stories'][0]['chapters'][0]['id']),
                   lambda v:v['stories'][0]['chapters'][0].update(references=[]),
                   lambda v:v['stories'][0]['chapters'][0]['references'][0].update(source='missing'),
                   lambda v:v['stories'][0]['chapters'][0]['references'][0].update(supports=''),
                   lambda v:v['stories'][0]['chapters'][0].update(people=['kingdom:missing']),
                   lambda v:v['stories'][0]['chapters'][0].update(people=['power:missing']),
                   lambda v:v['stories'][0]['chapters'][0].update(year=1453),
                   lambda v:v['sources']['livy'].update(access='verified-by-model')]
        for mutation in mutations:
            def read(name):
                value=copy.deepcopy(original(name))
                if name=='data-source/stories/stories.json': mutation(value)
                return value
            with self.subTest(mutation=mutation),patch.object(b,'read',read),self.assertRaises((AssertionError,KeyError)):
                b.compile_stories()


if __name__=='__main__':
    unittest.main()
