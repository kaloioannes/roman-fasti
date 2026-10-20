"""Coverage, chronology, source-link integrity and deterministic search builds."""
import copy
import unittest
from collections import Counter
from unittest.mock import patch
from urllib.parse import parse_qs, urlsplit

import build_search as build
from build_events import compile_events
from build_glossary import compile_glossary


class SearchIndexTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = build.read('data/search/index.json')
        cls.events = compile_events()
        cls.glossary = compile_glossary()

    def test_committed_index_matches_sources(self):
        self.assertEqual(self.index, build.compile_index())
        self.assertEqual(build.compile_index(), build.compile_index())

    def test_every_person_and_event_is_projected(self):
        for period in self.index['periods']:
            pid = period['id']
            data = build.read(f'data/{pid}/records.json')
            projected = [e for e in self.index['entries'] if e['period'] == pid]
            people = [e for e in projected if e['kind'] == 'person']
            self.assertEqual({e['id'].split(':', 2)[2] for e in people}, set(data['people']))
            count = sum(e['period'] == pid for e in self.events['entries'].values())
            self.assertEqual(sum(e['kind'] == 'event' for e in projected), count)
        stories = build.read('data/republic/stories.json')
        counts = Counter(e['kind'] for e in self.index['entries'])
        self.assertEqual(counts['story'], len(stories))
        self.assertEqual(counts['chapter'], sum(len(s['chapters']) for s in stories))

    def test_all_targets_resolve_to_real_source_objects(self):
        data = {p['id']: build.read(f'data/{p["id"]}/records.json') for p in self.index['periods']}
        for e in self.index['entries']:
            pid = e['period']
            self.assertTrue(e['title'] and e['text'], e['id'])
            for a, b in e['spans']:
                self.assertLessEqual(a, b)
                self.assertNotIn(0, [a, b])
            url = urlsplit(e['url'])
            if e['kind'] == 'term':
                self.assertEqual(url.path, 'glossary/')
                key = parse_qs(url.fragment)['term'][0]
                entry = self.glossary['entries'][key]
                self.assertEqual(entry['label'], e['title'])
                self.assertTrue(any(pid in s['periods'] for s in entry['senses']))
                continue
            if e['kind'] == 'place':
                self.assertEqual(url.path, 'places/')
                key = parse_qs(url.fragment)['place'][0]
                self.assertEqual(self.events['places'][key]['label'], e['title'])
                self.assertTrue(any(self.events['entries'][id]['period'] == pid for id in self.events['byPlace'][key]))
                continue
            if e['kind'] == 'event':
                self.assertEqual(url.path, 'events/')
                key = parse_qs(url.fragment)['event'][0]
                self.assertEqual(self.events['entries'][key]['title'], e['title'])
                continue
            self.assertEqual(url.path, f'{pid}/')
            p = {k: v[0] for k, v in parse_qs(url.fragment).items()}
            if 'person' in p:
                self.assertIn(p['person'], data[pid]['people'])
            if 'year' in p:
                self.assertIn(p['year'], data[pid]['years'])
                r = data[pid]['years'][p['year']]
                focus = p.get('focus', '')
                if focus.startswith('person:'):
                    self.assertIn(focus[7:], [o['person'] for o in r['officers']])
                if focus.startswith('event:') and pid != 'kingdom':
                    self.assertEqual(r['events'][int(focus[6:])]['title'], e['title'])
            if pid == 'kingdom' and p.get('focus', '').startswith('event:'):
                self.assertIn(p['focus'][6:], data[pid]['events'])

    def test_unknown_alias_target_fails(self):
        original = build.read
        def read(name):
            value = copy.deepcopy(original(name))
            if name == 'data-source/search/aliases.json':
                value['republic:missing-person'] = ['invalid']
            return value
        with patch.object(build, 'read', read), self.assertRaisesRegex(AssertionError, 'Invalid search alias targets'):
            build.compile_index()

    def test_projection_is_text_only_and_bounded(self):
        target = build.ROOT / 'data/search/index.json'
        self.assertLess(target.stat().st_size, 1_600_000)
        self.assertNotIn('geometry', target.read_text(encoding='utf-8'))


if __name__ == '__main__':
    unittest.main()
