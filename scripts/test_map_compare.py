"""Check the projection against every original map-year, including borrowed layers."""
import copy
import json
import unittest
from unittest.mock import patch
from build_map_compare import ROOT, build_index, read


class ComparisonTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = build_index()

    def test_generated_and_deterministic(self):
        self.assertEqual(self.data, build_index())
        self.assertEqual(self.data, read('data/map-compare/index.json'))
        self.assertEqual(len(self.data['presets']), 12)

    def test_all_original_years_and_layer_combinations(self):
        for period in self.data['periods']:
            pid = period['id']
            original = read(f'data/{pid}/records.json' if pid == 'kingdom' else f'data/{pid}/territories.json')
            stages = [self.data['stages'][k] for k in period['stages']]
            for year in range(period['start'], period['end'] + 1):
                if not year:
                    continue
                matches = [s for s in stages if s['from'] <= year <= s['to']]
                self.assertEqual(len(matches), 1, (pid, year))
                s = matches[0]
                if pid == 'kingdom':
                    rulers = original['years'][str(year)]['rulers']
                    self.assertEqual(s['rulers'], rulers)
                    self.assertEqual({p['id'] for p in s['points']}, {p for r in rulers for p in original['people'][r]['places']})
                    self.assertEqual(s['layers'], [])
                else:
                    indices = [i for i, f in enumerate(original['features']) if f['properties']['from'] <= year <= f['properties']['to']]
                    self.assertEqual([l['featureIndex'] for l in s['layers']], indices, (pid, year))
                    for layer in s['layers']:
                        p = original['features'][layer['featureIndex']]['properties']
                        self.assertEqual(layer['label'], p['label'])
                        self.assertEqual(layer['from'], p['from'])
                        self.assertEqual(layer['to'], p['to'])
                        if p.get('caption'):
                            self.assertEqual(layer['caption'], p['caption'])

    def test_proxies_keep_source_dates_and_caveats(self):
        def layers(pid, year):
            return next(s for s in self.data['stages'].values() if s['period'] == pid and s['from'] <= year <= s['to'])['layers']
        for year, source_year in [(116, 117), (117, 127), (126, 127)]:
            l = layers('empire', year)[0]
            self.assertEqual(l['precision'], 'borrowed')
            self.assertEqual(l['sourceStages'][0]['from'], source_year)
            self.assertIn('近似', l['caption'])
        west = next(l for l in layers('divided-empire', 476) if l['key'] == 'west')
        self.assertEqual(west['sourceStages'][0]['to'], 475)
        self.assertEqual(west['precision'], 'borrowed')
        for year, source_year in [(1402, 1395), (1403, 1407), (1406, 1407)]:
            l = next(l for l in layers('byzantine', year) if l['key'] == 'byzantine')
            self.assertEqual(l['sourceStages'][0]['from'], source_year)
            self.assertEqual(l['precision'], 'borrowed')
        self.assertEqual(layers('republic', -509)[0]['precision'], 'schematic')
        self.assertEqual(layers('republic', -27)[0]['sourceStages'][0]['to'], -26)

    def test_editorial_links_must_resolve(self):
        def bad_read(path):
            v = copy.deepcopy(read(path))
            if path == 'data-source/map-compare/presets.json':
                v['presets'][0]['events'].append('missing:event')
            return v
        with patch('build_map_compare.read', bad_read), self.assertRaises(AssertionError):
            build_index()


if __name__ == '__main__':
    unittest.main()
