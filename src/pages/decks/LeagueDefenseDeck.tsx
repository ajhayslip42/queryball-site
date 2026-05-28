/**
 * League Defense — REAL DATA, EPA-driven. 7 dense reports, 10+ visuals each.
 * Report #2 is the packed metrics table. Plays-based reports honor the whole
 * rail (incl. pass depth & direction). First-downs-allowed run through every set.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, metricsOf, selOf, miniColsOf, F, type MDef } from '@/components/deck/Panels'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'

const minN = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 50)

export default function LeagueDefenseDeck() {
  const tabs: DeckTab[] = [
    { id: 'overall', label: 'Overall Rankings',     render: () => <Report kind="overall" /> },
    { id: 'data',    label: 'Data Table',           render: () => <DataTab /> },
    { id: 'pass',    label: 'Pass Defense',         render: () => <Report kind="pass" /> },
    { id: 'run',     label: 'Run Defense',          render: () => <Report kind="run" /> },
    { id: 'depth',   label: 'Pass D by Depth',      render: () => <Report kind="depth" /> },
    { id: 'sit',     label: 'Situational Defense',  render: () => <Report kind="sit" /> },
    { id: 'dst',     label: 'Fantasy DST',          fantasy: true, render: () => <Dst /> },
  ]
  return (
    <DeckShell title="League Defense" deckIndex={9}
      intro="Predictive rankings, not scorebook fiction. Every defense ranked by EPA per play allowed — overall, pass, run, by depth of target, and situationally — with first downs allowed throughout. Plays-based reports honor the whole rail, so you can isolate (e.g.) deep throws to the right on third down. Live from play-by-play."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}

const SETS: Record<string, { title: string; sub: string; base: string; defs: MDef[] }> = {
  overall: { title: 'Overall defense — league rankings', sub: 'EPA & success allowed, every defense', base: '(pass_attempt=1 OR rush_attempt=1)', defs: [
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
    { key: 'sr', label: 'Success % allowed', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'pepa', label: 'Pass EPA allowed', expr: 'round(avg(epa) FILTER(WHERE pass_attempt=1),3)', f: 'epa' },
    { key: 'repa', label: 'Rush EPA allowed', expr: 'round(avg(epa) FILTER(WHERE rush_attempt=1),3)', f: 'epa' },
    { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
    { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
    { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
    { key: 'expl', label: 'Explosive % allowed', expr: 'round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1)', f: 'pct' },
    { key: 'plays', label: 'Plays faced', expr: 'count(*)', f: 'int' },
  ] },
  pass: { title: 'Pass defense — league rankings', sub: 'efficiency & first downs allowed through the air', base: 'pass_attempt=1', defs: [
    { key: 'epa', label: 'EPA / pass allowed', expr: 'round(avg(epa),3)', f: 'epa' },
    { key: 'comp', label: 'Comp % allowed', expr: 'round(sum(complete_pass)*100.0/count(*),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT faced', expr: 'round(avg(air_yards),1)', f: 'd1' },
    { key: 'ypa', label: 'Yds / Att allowed', expr: 'round(sum(passing_yards)*1.0/count(*),2)', f: 'd2' },
    { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
    { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'yds', label: 'Pass Yds allowed', expr: 'sum(passing_yards)', f: 'int' },
    { key: 'td', label: 'Pass TDs allowed', expr: 'sum(touchdown)', f: 'int' },
    { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
    { key: 'att', label: 'Attempts faced', expr: 'count(*)', f: 'int' },
  ] },
  run: { title: 'Run defense — league rankings', sub: 'EPA, YPC & stuffs allowed', base: 'rush_attempt=1', defs: [
    { key: 'epa', label: 'EPA / rush allowed', expr: 'round(avg(epa),3)', f: 'epa' },
    { key: 'ypc', label: 'YPC allowed', expr: 'round(avg(rushing_yards),2)', f: 'd2' },
    { key: 'stuff', label: 'Stuff % (≤0)', expr: 'round(count(*) FILTER(WHERE rushing_yards<=0)*100.0/count(*),1)', f: 'pct' },
    { key: 'expl', label: 'Explosive allowed (10+)', expr: 'count(*) FILTER(WHERE rushing_yards>=10)', f: 'int' },
    { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
    { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'sr', label: 'Success % allowed', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'td', label: 'Rush TDs allowed', expr: 'sum(touchdown)', f: 'int' },
    { key: 'yds', label: 'Rush Yds allowed', expr: 'sum(rushing_yards)', f: 'int' },
    { key: 'car', label: 'Carries faced', expr: 'count(*)', f: 'int' },
  ] },
  depth: { title: 'Pass defense by depth', sub: 'set Pass depth/direction in the rail to isolate (e.g.) deep right', base: 'pass_attempt=1 AND air_yards IS NOT NULL', defs: [
    { key: 'epa', label: 'EPA / pass allowed', expr: 'round(avg(epa),3)', f: 'epa' },
    { key: 'comp', label: 'Comp % allowed', expr: 'round(sum(complete_pass)*100.0/count(*),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT faced', expr: 'round(avg(air_yards),1)', f: 'd1' },
    { key: 'yds', label: 'Yards allowed', expr: 'sum(passing_yards)', f: 'int' },
    { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
    { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'deep', label: 'Deep att faced (20+)', expr: 'count(*) FILTER(WHERE air_yards>=20)', f: 'int' },
    { key: 'td', label: 'TDs allowed', expr: 'sum(touchdown)', f: 'int' },
    { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
    { key: 'att', label: 'Attempts faced', expr: 'count(*)', f: 'int' },
  ] },
  sit: { title: 'Situational defense', sub: 'third/fourth down, red zone, goal line — allowed', base: '(pass_attempt=1 OR rush_attempt=1)', defs: [
    { key: 'third', label: '3rd-Down Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'rztd', label: 'RZ TD % allowed', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1)', f: 'pct' },
    { key: 'gltd', label: 'Goal-Line TD % allowed', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=5)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=5),0),1)', f: 'pct' },
    { key: 'fourth', label: '4th-Down Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=4)*100.0/nullif(count(*) FILTER(WHERE down=4),0),1)', f: 'pct' },
    { key: 'short', label: 'Short-Yd Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE ydstogo<=2)*100.0/nullif(count(*) FILTER(WHERE ydstogo<=2),0),1)', f: 'pct' },
    { key: 'e3', label: '3rd-Down EPA', expr: 'round(avg(epa) FILTER(WHERE down=3),3)', f: 'epa' },
    { key: 'fd3', label: '3rd-Down 1stD allowed', expr: 'sum(first_down) FILTER(WHERE down=3)', f: 'int' },
    { key: 'rzn', label: 'RZ Plays faced', expr: 'count(*) FILTER(WHERE yardline_100<=20)', f: 'int' },
    { key: 'n3', label: '3rd-Down Plays', expr: 'count(*) FILTER(WHERE down=3)', f: 'int' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
  ] },
}

function Report({ kind }: { kind: keyof typeof SETS }) {
  const { slicers } = useSlicers(); const set = SETS[kind]
  const sql = `SELECT defteam AS cat, ${selOf(set.defs)} FROM plays WHERE defteam IS NOT NULL AND ${set.base} ${playsWhere(slicers)} GROUP BY cat HAVING count(*) >= ${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return <MetricReport loading={q.loading} title={set.title} subtitle={`${set.sub} · lower EPA = tougher · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Defense', set.defs), sort: { key: set.defs[0].key, dir: 'asc' }, caption: 'Every defense — sortable' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(set.defs) }]} />
}

/* Report #2 — packed metrics table */
function DataTab() {
  const { slicers } = useSlicers()
  const sql = `SELECT defteam tm, count(*) plays, round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr,
      round(avg(epa) FILTER(WHERE pass_attempt=1),3) pepa, round(avg(epa) FILTER(WHERE rush_attempt=1),3) repa,
      round(avg(air_yards) FILTER(WHERE pass_attempt=1),1) adot, sum(first_down)::int fd, round(sum(first_down)*100.0/count(*),1) fdpct,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third,
      round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1) rztd,
      sum(touchdown)::int td, sum(sack)::int sacks, sum(interception)::int ints, sum(fumble_lost)::int fum,
      round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1) expl
    FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)}
    GROUP BY 1 HAVING count(*) >= ${minN(slicers)} ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Def' }, { key: 'plays', label: 'Plays', numeric: true }, { key: 'epa', label: 'EPA', numeric: true, format: F.epa }, { key: 'sr', label: 'Succ%', numeric: true, format: F.d1 },
    { key: 'pepa', label: 'PaEPA', numeric: true, format: F.epa }, { key: 'repa', label: 'RuEPA', numeric: true, format: F.epa }, { key: 'adot', label: 'aDOTfc', numeric: true, format: F.d1 },
    { key: 'fd', label: '1stD', numeric: true }, { key: 'fdpct', label: '1stD%', numeric: true, format: F.d1 }, { key: 'third', label: '3rd%', numeric: true, format: F.d1 }, { key: 'rztd', label: 'RZTD%', numeric: true, format: F.d1 },
    { key: 'td', label: 'TD', numeric: true }, { key: 'sacks', label: 'Sk', numeric: true }, { key: 'ints', label: 'INT', numeric: true }, { key: 'fum', label: 'FumR', numeric: true }, { key: 'expl', label: 'Expl%', numeric: true, format: F.d1 },
  ]
  return <Tile title="Every defense — packed metrics" subtitle={`${sliceLabel(slicers)} · honors all rail filters · scroll horizontally`} span={12}>
    <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} dense />}</QueryState>
  </Tile>
}

/* Report #7 — Fantasy DST (dense) */
const DST_DEFS: MDef[] = [
  { key: 'splash', label: 'Splash score', expr: 'sum(sack)+sum(interception)*2+sum(fumble_lost)*2', f: 'int' },
  { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
  { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
  { key: 'fum', label: 'Fumble recoveries', expr: 'sum(fumble_lost)', f: 'int' },
  { key: 'tak', label: 'Takeaways', expr: 'sum(interception)+sum(fumble_lost)', f: 'int' },
  { key: 'sg', label: 'Sacks / Gm', expr: 'round(sum(sack)*1.0/nullif(count(distinct game_id),0),2)', f: 'd2' },
  { key: 'tg', label: 'Takeaways / Gm', expr: 'round((sum(interception)+sum(fumble_lost))*1.0/nullif(count(distinct game_id),0),2)', f: 'd2' },
  { key: 'fda', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
  { key: 'epa', label: 'EPA / play allowed', expr: 'round(avg(epa),3)', f: 'epa' },
  { key: 'gms', label: 'Games', expr: 'count(distinct game_id)', f: 'int' },
]
function Dst() {
  const { slicers } = useSlicers()
  const sql = `SELECT defteam AS cat, ${selOf(DST_DEFS)} FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)} GROUP BY cat HAVING count(*) >= ${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-4">
      <FantasyBanner label="Fantasy Defense · DST" headline="Sacks and takeaways drive DST scoring." body="A splash-play score (sacks + 2×INT + 2×fumble recoveries) as a quick proxy for big-play defenses, plus per-game rates so short slices stay fair. Stream by matchup." />
      <MetricReport loading={q.loading} title="Fantasy DST — splash & takeaways" subtitle={sliceLabel(slicers)}
        mini={{ rows: q.data ?? [], cols: miniColsOf('Defense', DST_DEFS), sort: { key: 'splash', dir: 'desc' }, caption: 'Every defense — sort by splash score' }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(DST_DEFS) }]} />
    </div>
  )
}
