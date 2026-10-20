"""Preserve classifications and title stages; reject unsupported relationship edits."""
import copy
import json
import unittest
from build_dynasties import ROOT, read, compile_dynasties


class DynastyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = read('data-source/dynasties/relations.json')
        cls.index = compile_dynasties()

    def test_committed_deterministic_and_source_unchanged(self):
        original = copy.deepcopy(self.source)
        self.assertEqual(self.index, read('data/dynasties/index.json'))
        self.assertEqual(self.index, compile_dynasties(self.source))
        self.assertEqual(self.source, original)
        self.assertLess((ROOT/'data/dynasties/navigation.json').stat().st_size, 50_000)
        self.assertLess((ROOT/'data/dynasties/index.json').stat().st_size, 1_700_000)

    def test_all_existing_classifications_and_stages_are_preserved(self):
        for pid in ['empire', 'divided-empire', 'byzantine']:
            data = read(f'data/{pid}/records.json')
            for did, dynasty in data['dynasties'].items():
                t = self.index['topics'][pid+'--'+did]
                for key in ['label','note','kind']:
                    self.assertEqual(t[key], dynasty[key])
                people = {k:p for k,p in data['people'].items() if p['dynasty']==did}
                self.assertEqual(len(t['members']), len(people))
                self.assertEqual(len(t['stages']), sum(len(p['reigns']) for p in people.values()))
                self.assertEqual({self.index['stages'][id]['person'] for id in t['stages']}, set(people))
                self.assertEqual(t['curated'], t['id'] in self.source['topics'])
                # A label never creates a relationship edge on its own.
                if t['id'] not in self.source['topics']:
                    self.assertEqual(t['edges'], [])

    def test_layers_uncertainty_and_unrealized_designation(self):
        jc = self.index['topics']['empire--julio-claudian']
        self.assertEqual(set(e['type'] for e in jc['edges']), set(self.index['types']))
        rumour = next(e for e in jc['edges'] if e['id']=='parent-augustus-drusus-rumour')
        self.assertEqual(rumour['status'], 'reported')
        self.assertTrue(rumour['dispute'])
        self.assertTrue(any(e['type']=='parent' and e['from']=='tiberius-nero-father' and e['to']=='drusus-elder' for e in jc['edges']))
        for nid in ['gaius-caesar','lucius-caesar','agrippa-postumus']:
            self.assertNotIn(nid, jc['members'])
            self.assertFalse(any(e['type']=='succession' and e['to']==nid for e in jc['edges']))
        komnenos = self.index['topics']['byzantine--komnenos']
        self.assertNotEqual('isaac-sebastokrator', 'isaac-alexios-son')
        self.assertIn('isaac-alexios-son',komnenos['nodes'])
        self.assertIn('isaac-sebastokrator',komnenos['nodes'])
        self.assertFalse(any(e['type']=='parent' and e['from']=='byzantine:isaac-i' and e['to']=='byzantine:alexios-i' for e in komnenos['edges']))

    def test_identity_and_bidirectional_links(self):
        i = self.index
        self.assertIn('empire--julio-claudian',i['byPerson']['republic:p6faf564142'])
        self.assertIn('empire--julio-claudian',i['byPerson']['empire:augustus'])
        self.assertIn('empire--julio-claudian',i['byPerson']['republic:p622a2ed1a3'])
        self.assertEqual(i['nodes']['agrippa']['url'],'republic/#person=p622a2ed1a3')
        self.assertEqual(i['nodes']['global:roman-augustus']['url'],'people/#person=roman-augustus')
        for topic in i['topics'].values():
            for nid in topic['nodes']:
                for p in i['nodes'][nid]['profiles']:
                    self.assertIn(topic['id'],i['byPerson'][p['period']+':'+p['person']])
        for key, tids in i['byPerson'].items():
            for tid in tids:
                self.assertTrue(any(key==p['period']+':'+p['person'] for nid in i['topics'][tid]['nodes'] for p in i['nodes'][nid]['profiles']))

    def test_events_are_explicit_or_labelled_context(self):
        original = read('data/events/index.json')['entries']
        for t in self.index['topics'].values():
            members = {p['person'] for nid in t['members'] for p in self.index['nodes'][nid]['profiles'] if p['period']==t['period']}
            self.assertFalse(set(t['events']) & set(t['contextEvents']))
            for eid in t['events']:
                self.assertTrue(any(p['period']==t['period'] and p['person'] in members for p in original[eid]['people']))
            for eid in t['highlights']:
                self.assertEqual(original[eid]['period'],t['period'])
                self.assertEqual(self.index['events'][eid]['url'], original[eid]['url'])

    def test_invalid_editorial_changes_fail(self):
        def edge(d):return d['topics']['empire--julio-claudian']['edges'][0]
        mutations = [
            lambda d: edge(d).update(to='missing-person'),
            lambda d: edge(d).update(to=edge(d)['from']),
            lambda d: edge(d).update(type='same-surname'),
            lambda d: edge(d).update(status='ninety-five-percent'),
            lambda d: edge(d).update(references=[]),
            lambda d: edge(d)['references'][0].update(source='missing'),
            lambda d: edge(d)['references'][0].update(locator=''),
            lambda d: edge(d)['references'][0].update(supports=''),
            lambda d: edge(d).update(status='disputed'),
            lambda d: edge(d)['date'].update(precision='year',start=0,end=0),
            lambda d: edge(d)['date'].update(precision='year',start=14,end=37),
            lambda d: edge(d)['date'].update(start=14),
            lambda d: d['topics']['empire--julio-claudian']['edges'].append(copy.deepcopy(edge(d))),
            lambda d: d['topics']['empire--julio-claudian']['highlights'].append('empire:missing'),
            lambda d: d['sources']['suet-augustus'].update(checked='not-a-date'),
            lambda d: d['nodes'][0]['references'][0].update(locator=''),
            lambda d: d['relatedTopics']['empire--theodosian'].append('missing'),
            lambda d: next(n for n in d['nodes'] if n['id']=='agrippa')['profile']['identityCheck'].update(wikiTitle='Wrong person'),
        ]
        for mutation in mutations:
            d=copy.deepcopy(self.source);mutation(d)
            with self.subTest(mutation=mutation),self.assertRaises((ValueError,KeyError)):
                compile_dynasties(d)
        d=copy.deepcopy(self.source);e=copy.deepcopy(edge(d));e.update(id='ancestry-cycle',**{'from':e['to'],'to':e['from']});d['topics']['empire--julio-claudian']['edges'].append(e)
        with self.assertRaisesRegex(ValueError,'Cyclic biological ancestry'):
            compile_dynasties(d)


if __name__ == '__main__':
    unittest.main()
