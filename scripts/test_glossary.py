"""Institutional meanings, citation integrity, reverse examples and bad edits."""
import copy
import unittest
from build_glossary import ROOT, read, compile_glossary, inline_projection


class GlossaryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = read('data-source/glossary/entries.json')
        cls.index = compile_glossary()

    def test_committed_and_repeatable(self):
        self.assertEqual(self.index, read('data/glossary/index.json'))
        self.assertEqual(self.index, compile_glossary())
        self.assertEqual(inline_projection(self.index), read('data/glossary/inline.json'))
        self.assertLess((ROOT/'data/glossary/inline.json').stat().st_size, 65_000)

    def test_core_distinctions_and_period_specific_meanings(self):
        e = self.index['entries']
        self.assertTrue({'consul','consul-suffectus','consular-tribune','decemvir','dictator',
                         'augustus','caesar','basileus','co-emperor','regency','purple-born','porphyra'} <= set(e))
        self.assertGreaterEqual(len(e['caesar']['senses']), 3)
        self.assertIn('现代', e['dictator']['caution'])
        self.assertIn('不是自动继位', e['purple-born']['senses'][0]['limits'])
        for eid in ['caesar','augustus','sebastos']:
            self.assertNotIn(eid, e[eid]['inline'], 'Never annotate personal names as titles')
        self.assertNotIn('恺撒', e['caesar']['inline'])
        self.assertNotIn('奥古斯都', e['augustus']['inline'])

    def test_examples_are_exact_reversible_reading_links(self):
        expected_person, expected_year = {}, {}
        for eid, e in self.index['entries'].items():
            for x in e['examples']:
                expected_year.setdefault(f'{x["period"]}:{x["year"]}', set()).add(eid)
                self.assertIn('year=', x['yearURL'])
                if x.get('person'):
                    expected_person.setdefault(f'{x["period"]}:{x["person"]}', set()).add(eid)
        self.assertEqual(expected_person, {k:set(v) for k,v in self.index['byPerson'].items()})
        self.assertEqual(expected_year, {k:set(v) for k,v in self.index['byYear'].items()})
        self.assertEqual(self.index['entries']['consul-suffectus']['examples'][0]['yearURL'], 'republic/#year=43')

    def test_missing_or_ambiguous_entities_fail(self):
        for mutation in [
            lambda d: d['entries'][0].update(id='bad:id'),
            lambda d: d['entries'].append(copy.deepcopy(d['entries'][0])),
            lambda d: d['entries'][0]['related'].append('missing'),
            lambda d: d['entries'][0]['senses'][0].update(periods=['missing']),
            lambda d: d['entries'][0]['senses'][0].update(range=[0, 1]),
            lambda d: d['entries'][0]['senses'][0].update(range=[-509, -753]),
            lambda d: d['entries'][0]['examples'][0].update(person='missing'),
            lambda d: d['entries'][0]['examples'][0].update(year=1000),
            lambda d: d['entries'][0]['examples'][0].update(sense='missing'),
            lambda d: d['entries'][1]['inline'].append('国王'),
        ]:
            d=copy.deepcopy(self.source);mutation(d)
            with self.subTest(edit=mutation), self.assertRaises(AssertionError):
                compile_glossary(d)

    def test_missing_evidence_or_false_access_is_rejected(self):
        for mutation in [
            lambda d: d['entries'][0]['senses'][0].update(references=[]),
            lambda d: d['entries'][0]['examples'][0].update(references=[]),
            lambda d: d['entries'][0]['senses'][0]['references'][0].update(source='missing'),
            lambda d: d['entries'][0]['senses'][0]['references'][0].update(locator=''),
            lambda d: d['entries'][0]['senses'][0]['references'][0].update(supports=''),
            lambda d: d['sources']['livy'].update(access='abstract'),
            lambda d: d['sources']['livy'].update(access='indirect'),
            lambda d: d['sources']['livy'].update(url='javascript:alert(1)'),
            lambda d: d['sources']['livy'].update(checked='2026-02-30'),
        ]:
            d=copy.deepcopy(self.source);mutation(d)
            with self.subTest(edit=mutation), self.assertRaises((AssertionError,ValueError)):
                compile_glossary(d)


if __name__ == '__main__':
    unittest.main()
