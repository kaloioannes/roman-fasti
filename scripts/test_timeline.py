"""Independent chronology and lossless-projection regression checks."""
import copy
import json
from collections import Counter
import unittest
from build_timeline import ROOT, read, axis, cell, coordinate, compile_timeline, endpoint, empire_dates


class TimelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = compile_timeline()

    def stage(self, key):
        return self.data['stages'][key]

    def test_committed_projection_is_reproducible(self):
        self.assertEqual(read('data/timeline/index.json'), self.data)
        self.assertEqual(compile_timeline(), self.data)

    def test_every_original_appointment_and_title_survives(self):
        for period in self.data['periods']:
            pid = period['id']
            source = read(f'data/{pid}/records.json')
            rows = [s for s in self.data['stages'].values() if s['period'] == pid and not s['isVacancy']]
            if pid == 'republic':
                expected = Counter((o['person'], o['role'], -int(y)) for y, r in source['years'].items() for o in r['officers'])
                self.assertEqual(Counter((s['person'], s['kind'], s['startYear']) for s in rows), expected)
                self.assertEqual(len(rows), 1201)
                self.assertTrue(all(s['start']['value'] is None and s['end']['value'] is None for s in rows))
            elif pid == 'kingdom':
                self.assertEqual(len(rows), len(source['people']))
                for s in rows:
                    p = source['people'][s['person']]
                    self.assertEqual((s['startYear'], s['endYear']), (p['start'], p['end']))
            else:
                self.assertEqual(len(rows), sum(len(p['reigns']) for p in source['people'].values()))
                for s in rows:
                    r = source['people'][s['person']]['reigns'][int(s['id'].rsplit(':', 1)[1])]
                    self.assertEqual((s['startYear'], s['endYear'], s['kind']), (r['start'], r['end'], r['kind']))
                    self.assertEqual(s['note'], r['note'])
                    self.assertEqual(s['territory'], r['territory'])
                    if pid != 'empire':
                        for point in ('start', 'end'):
                            self.assertEqual(s[point]['precision'], r[point+'Date']['precision'])
                            self.assertEqual(s[point]['value'], r[point+'Date']['value'])
                            self.assertEqual(s[point]['label'], r[point+'Date']['label'])
            self.assertTrue(all(s['scopeStart'] == period['start'] and s['scopeEnd'] == period['end'] for s in rows))

    def test_projection_does_not_modify_sources(self):
        config = read('data-source/timeline/editorial.json')
        volumes = {p['id']: read(f'data/{p["id"]}/records.json') for p in self.data['periods']}
        before = copy.deepcopy((config, volumes))
        compile_timeline(config, volumes)
        self.assertEqual((config, volumes), before)

    def test_all_references_resolve(self):
        for s in self.data['stages'].values():
            if not s['isVacancy']:
                self.assertIn(s['period']+':'+s['person'], self.data['people'])
            self.assertTrue(s['sources'])
            self.assertTrue(all(k in self.data['sources'] for k in s['sources']))
        self.assertEqual(len(self.data['stages']), 1582)
        self.assertEqual(sum(s['isVacancy'] for s in self.data['stages'].values()), 16)

    def test_four_emperors_are_not_four_full_years(self):
        galba, otho, vitellius, vespasian = [self.stage(f'empire:{p}:0') for p in ('galba', 'otho', 'vitellius', 'vespasian')]
        self.assertEqual(galba['end']['value'], '0069-01-15')
        self.assertEqual(otho['start']['value'], '0069-01-15')
        self.assertEqual(otho['end']['value'], '0069-04-16')
        self.assertEqual(vespasian['start']['value'], '0069-07-01')
        self.assertLess(otho['end']['bounds'][1]-otho['start']['bounds'][0], .3)
        self.assertEqual(vitellius['start']['precision'], 'month')
        self.assertIn('uncertain', vitellius['end']['flags'])
        self.assertIn('12月', vespasian['authorityNote'])

    def test_238_does_not_acquire_month_or_day_dates(self):
        for p in ('gordian-i', 'gordian-ii', 'pupienus', 'balbinus'):
            s = self.stage(f'empire:{p}:0')
            self.assertEqual(s['start']['value'], None)
            self.assertEqual(s['start']['bounds'], [238, 239])
            self.assertIn('uncertain', s['start']['flags'])

    def test_sisters_and_successor_have_independent_precise_stages(self):
        zoe, theodora, successor = [self.stage(f'byzantine:{p}:0') for p in ('zoe', 'theodora', 'constantine-ix')]
        self.assertEqual(zoe['start']['value'], '1042-04-21')
        self.assertEqual(zoe['end']['value'], '1042-06-11')
        self.assertEqual(zoe['start'], theodora['start'])
        self.assertEqual(zoe['end'], theodora['end'])
        self.assertEqual(zoe['end'], successor['start'])

    def test_restorations_never_bridge_loss_of_office(self):
        rows = [s for s in self.data['stages'].values() if s['period'] == 'byzantine' and s['person'] == 'justinian-ii']
        self.assertEqual([(s['startYear'], s['endYear']) for s in rows], [(685, 695), (705, 711)])
        rows = [s for s in self.data['stages'].values() if s['period'] == 'empire' and s['person'] == 'maximian' and s['kind'] != 'caesar']
        self.assertEqual([(s['startYear'], s['endYear']) for s in rows], [(286, 305), (306, 308), (310, 310)])

    def test_title_and_power_are_distinct(self):
        basil = self.stage('byzantine:basil-ii:1')
        self.assertEqual(basil['kind'], 'junior')
        self.assertEqual(basil['authority'][0]['status'], 'title')
        self.assertEqual(basil['authority'][0]['start'], basil['start'])
        self.assertEqual(basil['authority'][0]['end'], basil['end'])
        self.assertEqual(self.stage('byzantine:basil-ii:0')['startYear'], 976)
        commodus = self.stage('empire:commodus:0')
        self.assertEqual(commodus['startYear'], 177)
        self.assertEqual([p['status'] for p in commodus['authority']], ['shared', 'governing'])
        self.assertIn('摄政', self.stage('byzantine:constantine-vii:0')['authorityNote'])
        for stage in self.data['stages'].values():
            for phase in stage['authority']:
                self.assertGreaterEqual(phase['start']['bounds'][0], stage['start']['bounds'][0])
                self.assertLessEqual(phase['end']['bounds'][1], stage['end']['bounds'][1])

    def test_alternative_dates_enclose_all_candidates(self):
        point = self.stage('byzantine:justinian-ii:0')['start']
        self.assertEqual(point['precision'], 'range')
        self.assertEqual(point['bounds'], [cell(685, 7, 10)[0], cell(685, 9)[1]])
        point = self.stage('byzantine:constantine-symbatios:0')['start']
        self.assertEqual(point['bounds'], [cell(813, 12, 25)[0], cell(814, 4, 16)[1]])
        point = self.stage('byzantine:john-viii:1')['start']
        self.assertEqual(point['bounds'], [1407, 1417])
        for person, bounds in [('julius-priscus', [250, 252]), ('licinianus', [250, 252]), ('septimius-271', [271, 273])]:
            stage = self.stage(f'empire:{person}:0')
            self.assertEqual(stage['start']['bounds'], bounds)
            self.assertEqual(stage['end']['bounds'], bounds)
        self.assertEqual(self.stage('divided-empire:constans-ii:0')['start']['bounds'], [409, 411])
        self.assertEqual(self.stage('divided-empire:patricius:0')['start']['bounds'], [469, 471])

    def test_month_only_short_reigns_and_duration_prose(self):
        short = self.stage('empire:saturninus-89:0')
        self.assertEqual(short['start']['value'], '0089-01')
        self.assertEqual(short['end']['value'], '0089-01')
        silvanus = self.stage('empire:silvanus:0')
        self.assertEqual(silvanus['start']['bounds'], cell(355, 8))
        self.assertEqual(silvanus['end']['bounds'], cell(355, 9))

    def test_undated_tatius_and_traditional_interregnum(self):
        tatius = self.stage('kingdom:titus-tatius:0')
        self.assertIsNone(tatius['start'])
        gap = self.stage('kingdom:vacancy:interregnum')
        self.assertIn('traditional', gap['start']['flags'])
        self.assertIn('两端', gap['label'])

    def test_courts_vacancies_and_exile_are_preserved(self):
        rows = [s for s in self.data['stages'].values() if s['period'] == 'divided-empire']
        self.assertEqual(sum(s['isVacancy'] for s in rows), 10)
        self.assertTrue(any(s['side'] == 'west' and s['kind'] == 'exile' and s['person'] == 'julius-nepos' for s in rows))
        self.assertTrue(all(s['side'] == 'unspecified' for s in self.data['stages'].values() if s['period'] == 'empire'))

    def test_historical_year_axis_and_julian_dates(self):
        self.assertEqual(axis(-1)+1, axis(1))
        self.assertEqual(cell(-1)[1], cell(1)[0])
        self.assertEqual(coordinate(100, 2, 29), 100+59/366)
        with self.assertRaises(ValueError):
            coordinate(101, 2, 29)
        with self.assertRaises(ValueError):
            axis(0)
        point = endpoint({}, -44)
        self.assertIsNone(point['value'])
        self.assertEqual(point['precision'], 'year')

    def test_editorial_errors_fail_the_build(self):
        for mutate in [
            lambda c: c['annotations'].update({'empire:missing:0': next(iter(c['annotations'].values()))}),
            lambda c: c['annotations']['empire:vespasian:0'].update(sourceText='Not in source'),
            lambda c: c['annotations']['empire:commodus:0']['phases'][0].update(start=1),
            lambda c: c['presets'][0].update(period='missing'),
            lambda c: c['presets'][0].update(to=0),
        ]:
            c = read('data-source/timeline/editorial.json')
            mutate(c)
            with self.assertRaises(ValueError):
                compile_timeline(c)


if __name__ == '__main__':
    unittest.main()
