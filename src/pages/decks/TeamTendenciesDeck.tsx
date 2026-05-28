/**
 * Team Tendencies — REAL DATA from play-by-play. 7 reports, 10+ visuals each.
 * Report #2 is the packed data table. First-down metrics throughout.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, metricsOf, selOf, miniColsOf, F, type MDef } from '@/components/deck/Panels'
import { QueryState } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'

const minN = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 50)

export default function TeamTendenciesDeck() {
  const tabs: DeckTab[] = [
    { id: 'splits',  label: 'Pass / Run & Tempo', render: () => <Report kind="splits" /> },
    { id: 'data',    label: 'Data Table',         render: () => <DataTab /> },
    { id: 'bydown',  label: 'By Down',            render: () => <Report kind="down" /> },
    { id: 'airyards',label: 'Air Yards',          render: () => <Report kind="air" /> },
    { id: 'sit',     label: 'Situational',        render: () => <Report kind="sit" /> },
    { id: 'explosive',label: 'Explosive & Scoring',render: () => <Report kind="expl" /> },
    { id: 'eff',     label: 'Efficiency',         render: () => <Report kind="eff" /> },
  ]
  return (
    <DeckShell title="Team Tendencies" deckIndex={8}
      intro="What each offense does, from play-by-play — balance, tempo, depth of target, situational behavior, explosiveness, and efficiency. Every report is sliceable by score, quarter, field zone, and pass depth in the rail."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}

const SETS: Record<string, { title: string; sub: string; defs: MDef[] }> = {
  splits: { title: 'Pass / run balance & tempo', sub: 'by team', defs: [
    { key: 'pass', label: 'Pass %', expr: 'round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1)', f: 'pct' },
    { key: 'plays', label: 'Plays', expr: 'count(*)', f: 'int' }, { key: 'passn', label: 'Pass Plays', expr: 'sum(pass_attempt)', f: 'int' }, { key: 'rushn', label: 'Rush Plays', expr: 'sum(rush_attempt)', f: 'int' },
    { key: 'sg', label: 'Shotgun %', expr: 'round(count(*) FILTER(WHERE shotgun=1)*100.0/count(*),1)', f: 'pct' }, { key: 'nh', label: 'No-Huddle %', expr: 'round(count(*) FILTER(WHERE no_huddle=1)*100.0/count(*),1)', f: 'pct' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' }, { key: 'sr', label: 'Success %', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' }, { key: 'fd', label: '1st Downs', expr: 'sum(first_down)', f: 'int' },
  ] },
  down: { title: 'Tendency by down', sub: 'pass rate & conversion by down, by team', defs: [
    { key: 'd1', label: '1st-Down Pass %', expr: 'round(sum(pass_attempt) FILTER(WHERE down=1)*100.0/nullif(count(*) FILTER(WHERE down=1),0),1)', f: 'pct' },
    { key: 'd2', label: '2nd-Down Pass %', expr: 'round(sum(pass_attempt) FILTER(WHERE down=2)*100.0/nullif(count(*) FILTER(WHERE down=2),0),1)', f: 'pct' },
    { key: 'd3', label: '3rd-Down Pass %', expr: 'round(sum(pass_attempt) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'c1', label: '1st-Down 1stD %', expr: 'round(sum(first_down) FILTER(WHERE down=1)*100.0/nullif(count(*) FILTER(WHERE down=1),0),1)', f: 'pct' },
    { key: 'c2', label: '2nd-Down 1stD %', expr: 'round(sum(first_down) FILTER(WHERE down=2)*100.0/nullif(count(*) FILTER(WHERE down=2),0),1)', f: 'pct' },
    { key: 'c3', label: '3rd-Down Conv %', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'e1', label: '1st-Down EPA', expr: 'round(avg(epa) FILTER(WHERE down=1),3)', f: 'epa' },
    { key: 'e2', label: '2nd-Down EPA', expr: 'round(avg(epa) FILTER(WHERE down=2),3)', f: 'epa' },
    { key: 'e3', label: '3rd-Down EPA', expr: 'round(avg(epa) FILTER(WHERE down=3),3)', f: 'epa' },
    { key: 'n3', label: '3rd-Down Plays', expr: 'count(*) FILTER(WHERE down=3)', f: 'int' },
  ] },
  air: { title: 'Air yards & depth of target', sub: 'by team', defs: [
    { key: 'adot', label: 'aDOT', expr: 'round(avg(air_yards) FILTER(WHERE pass_attempt=1),1)', f: 'd1' },
    { key: 'deep', label: 'Deep % (20+)', expr: 'round(count(*) FILTER(WHERE pass_attempt=1 AND air_yards>=20)*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)', f: 'pct' },
    { key: 'short', label: 'Short % (0-9)', expr: 'round(count(*) FILTER(WHERE pass_attempt=1 AND air_yards BETWEEN 0 AND 9)*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)', f: 'pct' },
    { key: 'behind', label: 'Behind LOS %', expr: 'round(count(*) FILTER(WHERE pass_attempt=1 AND air_yards<0)*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)', f: 'pct' },
    { key: 'lft', label: 'Left %', expr: "round(count(*) FILTER(WHERE pass_location='left')*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)", f: 'pct' },
    { key: 'mid', label: 'Middle %', expr: "round(count(*) FILTER(WHERE pass_location='middle')*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)", f: 'pct' },
    { key: 'rgt', label: 'Right %', expr: "round(count(*) FILTER(WHERE pass_location='right')*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)", f: 'pct' },
    { key: 'ay', label: 'Total Air Yds', expr: 'sum(air_yards) FILTER(WHERE pass_attempt=1)', f: 'int' },
    { key: 'yac', label: 'Total YAC', expr: 'sum(yards_after_catch)', f: 'int' },
    { key: 'pfd', label: 'Pass 1st Downs', expr: 'sum(first_down) FILTER(WHERE pass_attempt=1)', f: 'int' },
  ] },
  sit: { title: 'Situational behavior', sub: 'third down, red zone, goal line — by team', defs: [
    { key: 'third', label: '3rd-Down Conv %', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'tpass', label: '3rd-Down Pass %', expr: 'round(sum(pass_attempt) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'fourth', label: '4th-Down Conv %', expr: 'round(sum(first_down) FILTER(WHERE down=4)*100.0/nullif(count(*) FILTER(WHERE down=4),0),1)', f: 'pct' },
    { key: 'rzplays', label: 'RZ Plays', expr: 'count(*) FILTER(WHERE yardline_100<=20)', f: 'int' },
    { key: 'rztd', label: 'RZ TD %', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1)', f: 'pct' },
    { key: 'rzpass', label: 'RZ Pass %', expr: 'round(sum(pass_attempt) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1)', f: 'pct' },
    { key: 'glplays', label: 'Goal-Line Plays', expr: 'count(*) FILTER(WHERE yardline_100<=5)', f: 'int' },
    { key: 'gltd', label: 'Goal-Line TD %', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=5)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=5),0),1)', f: 'pct' },
    { key: 'shortyd', label: 'Short-Yd Conv %', expr: 'round(sum(first_down) FILTER(WHERE ydstogo<=2)*100.0/nullif(count(*) FILTER(WHERE ydstogo<=2),0),1)', f: 'pct' },
    { key: 'epasit', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
  ] },
  expl: { title: 'Explosive plays & scoring', sub: 'by team', defs: [
    { key: 'expl', label: 'Explosive %', expr: 'round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1)', f: 'pct' },
    { key: 'pass20', label: 'Pass 20+', expr: 'count(*) FILTER(WHERE pass_attempt=1 AND passing_yards>=20)', f: 'int' },
    { key: 'rush15', label: 'Rush 15+', expr: 'count(*) FILTER(WHERE rush_attempt=1 AND rushing_yards>=15)', f: 'int' },
    { key: 'pass40', label: 'Pass 40+', expr: 'count(*) FILTER(WHERE pass_attempt=1 AND passing_yards>=40)', f: 'int' },
    { key: 'td', label: 'Total TDs', expr: 'sum(touchdown)', f: 'int' },
    { key: 'passtd', label: 'Pass TDs', expr: 'sum(touchdown) FILTER(WHERE pass_attempt=1)', f: 'int' },
    { key: 'rushtd', label: 'Rush TDs', expr: 'sum(touchdown) FILTER(WHERE rush_attempt=1)', f: 'int' },
    { key: 'fd', label: 'Total 1st Downs', expr: 'sum(first_down)', f: 'int' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
  ] },
  eff: { title: 'Overall efficiency', sub: 'by team', defs: [
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' }, { key: 'pepa', label: 'Pass EPA', expr: 'round(avg(epa) FILTER(WHERE pass_attempt=1),3)', f: 'epa' },
    { key: 'repa', label: 'Rush EPA', expr: 'round(avg(epa) FILTER(WHERE rush_attempt=1),3)', f: 'epa' }, { key: 'sr', label: 'Success %', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'psr', label: 'Pass Success %', expr: 'round(sum(success) FILTER(WHERE pass_attempt=1)*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1)', f: 'pct' },
    { key: 'rsr', label: 'Rush Success %', expr: 'round(sum(success) FILTER(WHERE rush_attempt=1)*100.0/nullif(count(*) FILTER(WHERE rush_attempt=1),0),1)', f: 'pct' },
    { key: 'ypp', label: 'Yards / Play', expr: 'round(sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0))*1.0/count(*),2)', f: 'd2' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'cpoe', label: 'CPOE', expr: 'round(avg(cpoe),2)', f: 'd2' }, { key: 'plays', label: 'Plays', expr: 'count(*)', f: 'int' },
  ] },
}

function Report({ kind }: { kind: keyof typeof SETS }) {
  const { slicers } = useSlicers(); const set = SETS[kind]
  const sql = `SELECT posteam AS cat, ${selOf(set.defs)} FROM plays
    WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)}
    GROUP BY cat HAVING count(*) >= ${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return <MetricReport loading={q.loading} title={set.title} subtitle={`${set.sub} · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Team', set.defs), sort: { key: set.defs[0].key, dir: 'desc' }, caption: 'Every team' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(set.defs) }]} />
}

function DataTab() {
  const { slicers } = useSlicers()
  const sql = `SELECT posteam tm, count(*) plays,
      round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1) pass_rt,
      round(count(*) FILTER(WHERE shotgun=1)*100.0/count(*),1) sg, round(count(*) FILTER(WHERE no_huddle=1)*100.0/count(*),1) nh,
      round(avg(air_yards) FILTER(WHERE pass_attempt=1),1) adot, round(avg(epa),3) epa,
      round(avg(epa) FILTER(WHERE pass_attempt=1),3) pepa, round(avg(epa) FILTER(WHERE rush_attempt=1),3) repa,
      round(sum(success)*100.0/count(*),1) sr, sum(first_down)::int fd, round(sum(first_down)*100.0/count(*),1) fdpct,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third,
      round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1) rztd,
      round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1) expl
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)}
    GROUP BY 1 HAVING count(*) >= ${minN(slicers)} ORDER BY epa DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' }, { key: 'plays', label: 'Plays', numeric: true }, { key: 'pass_rt', label: 'Pass%', numeric: true, format: F.d1 }, { key: 'sg', label: 'SG%', numeric: true, format: F.d1 }, { key: 'nh', label: 'NH%', numeric: true, format: F.d1 },
    { key: 'adot', label: 'aDOT', numeric: true, format: F.d1 }, { key: 'epa', label: 'EPA', numeric: true, format: F.epa }, { key: 'pepa', label: 'PaEPA', numeric: true, format: F.epa }, { key: 'repa', label: 'RuEPA', numeric: true, format: F.epa },
    { key: 'sr', label: 'Succ%', numeric: true, format: F.d1 }, { key: 'fd', label: '1stD', numeric: true }, { key: 'fdpct', label: '1stD%', numeric: true, format: F.d1 }, { key: 'third', label: '3rd%', numeric: true, format: F.d1 }, { key: 'rztd', label: 'RZTD%', numeric: true, format: F.d1 }, { key: 'expl', label: 'Expl%', numeric: true, format: F.d1 },
  ]
  return <Tile title="Every offense — packed tendencies" subtitle={`${sliceLabel(slicers)} · honors all rail filters · scroll horizontally`} span={12}>
    <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'desc' }} dense />}</QueryState>
  </Tile>
}
