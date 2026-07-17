/**
 * League Defense — cross-league rankings.
 *
 * REWORK: EPA and Success% are OUT of the visible metrics (owner preference).
 * The rankings lean on directly measurable outcomes: yards allowed, first downs
 * allowed, TDs allowed, completion %, conversion rates, explosive rate.
 *
 * The "Pass D by Depth" report is now a proper grid — one table per depth bucket
 * (Behind LOS / 1-5 / 6-10 / 11-15 / 16-25 / 26+), each showing every defense's
 * completion %, attempts faced, yards allowed. That was the owner's specific ask.
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
    { id: 'depth',   label: 'Pass D by Depth',      render: () => <PassByDepth /> },
    { id: 'sit',     label: 'Situational Defense',  render: () => <Report kind="sit" /> },
    { id: 'dst',     label: 'Fantasy DST',          fantasy: true, render: () => <Dst /> },
  ]
  return (
    <DeckShell title="League Defense" deckIndex={9}
      intro="Cross-league defensive rankings driven by directly measurable outcomes — yards, first downs, TDs, conversion rates — not EPA. Plays-based, so down, distance, score, and field position bite every report."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType']} />
  )
}

const SETS: Record<string, { title: string; sub: string; base: string; defs: MDef[]; sortKey: string; sortDir: 'asc' | 'desc' }> = {
  overall: {
    title: 'Overall rankings',
    sub: 'Every defense, sortable by any column',
    base: '(pass_attempt=1 OR rush_attempt=1)',
    sortKey: 'yg', sortDir: 'asc',
    defs: [
      { key: 'yg', label: 'Yds / Play', expr: 'round(sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0))*1.0/count(*),2)', f: 'd2' },
      { key: 'fdpct', label: '1D % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
      { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
      { key: 'ptd', label: 'Pass TDs allowed', expr: 'sum(pass_touchdown)::int', f: 'int' },
      { key: 'rtd', label: 'Rush TDs allowed', expr: 'sum(rush_touchdown)::int', f: 'int' },
      { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
      { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
      { key: 'expl', label: 'Explosive % allowed', expr: 'round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1)', f: 'pct' },
      { key: 'thirdC', label: '3rd Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
      { key: 'plays', label: 'Plays faced', expr: 'count(*)', f: 'int' },
    ]
  },
  pass: {
    title: 'Pass defense',
    sub: 'Every defense through the air',
    base: 'pass_attempt=1',
    sortKey: 'ypa', sortDir: 'asc',
    defs: [
      { key: 'ypa', label: 'Yds / Att', expr: 'round(sum(passing_yards)*1.0/count(*),2)', f: 'd2' },
      { key: 'comp', label: 'Comp %', expr: 'round(sum(complete_pass)*100.0/count(*),1)', f: 'pct' },
      { key: 'adot', label: 'aDOT faced', expr: 'round(avg(air_yards),1)', f: 'd1' },
      { key: 'yds', label: 'Pass Yds allowed', expr: 'sum(passing_yards)', f: 'int' },
      { key: 'yac', label: 'YAC allowed', expr: 'sum(yards_after_catch)', f: 'int' },
      { key: 'yacpct', label: 'YAC %', expr: 'round(sum(yards_after_catch)*100.0/nullif(sum(passing_yards),0),1)', f: 'pct' },
      { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
      { key: 'fdpct', label: '1D / Att %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
      { key: 'td', label: 'Pass TDs allowed', expr: 'sum(pass_touchdown)::int', f: 'int' },
      { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
      { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
      { key: 'att', label: 'Attempts faced', expr: 'count(*)', f: 'int' },
    ]
  },
  run: {
    title: 'Run defense',
    sub: 'Every defense on the ground',
    base: 'rush_attempt=1',
    sortKey: 'ypc', sortDir: 'asc',
    defs: [
      { key: 'ypc', label: 'YPC allowed', expr: 'round(avg(rushing_yards),2)', f: 'd2' },
      { key: 'stuff', label: 'Stuff % (≤0)', expr: 'round(count(*) FILTER(WHERE rushing_yards<=0)*100.0/count(*),1)', f: 'pct' },
      { key: 'expl', label: 'Explosive % (10+)', expr: 'round(count(*) FILTER(WHERE rushing_yards>=10)*100.0/count(*),1)', f: 'pct' },
      { key: 'yds', label: 'Rush Yds allowed', expr: 'sum(rushing_yards)', f: 'int' },
      { key: 'td', label: 'Rush TDs allowed', expr: 'sum(rush_touchdown)::int', f: 'int' },
      { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
      { key: 'fdpct', label: '1D / Car %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
      { key: 'gapL', label: 'YPC vs Left', expr: 'round(avg(rushing_yards) FILTER(WHERE run_location=\'left\'),2)', f: 'd2' },
      { key: 'gapM', label: 'YPC vs Middle', expr: 'round(avg(rushing_yards) FILTER(WHERE run_location=\'middle\'),2)', f: 'd2' },
      { key: 'gapR', label: 'YPC vs Right', expr: 'round(avg(rushing_yards) FILTER(WHERE run_location=\'right\'),2)', f: 'd2' },
      { key: 'car', label: 'Carries faced', expr: 'count(*)', f: 'int' },
    ]
  },
  sit: {
    title: 'Situational defense',
    sub: 'Third down, red zone, goal line — outcomes only',
    base: '(pass_attempt=1 OR rush_attempt=1)',
    sortKey: 'third', sortDir: 'asc',
    defs: [
      { key: 'third', label: '3rd Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
      { key: 'fourth', label: '4th Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=4)*100.0/nullif(count(*) FILTER(WHERE down=4),0),1)', f: 'pct' },
      { key: 'rztd', label: 'RZ TD % allowed', expr: 'round((sum(pass_touchdown)+sum(rush_touchdown)) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1)', f: 'pct' },
      { key: 'gltd', label: 'Goal-Line TD %', expr: 'round((sum(pass_touchdown)+sum(rush_touchdown)) FILTER(WHERE yardline_100<=5)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=5),0),1)', f: 'pct' },
      { key: 'short', label: 'Short-Yd Conv %', expr: 'round(sum(first_down) FILTER(WHERE ydstogo<=2)*100.0/nullif(count(*) FILTER(WHERE ydstogo<=2),0),1)', f: 'pct' },
      { key: 'fd3', label: '3rd 1D allowed', expr: 'sum(first_down) FILTER(WHERE down=3)', f: 'int' },
      { key: 'rzn', label: 'RZ Plays faced', expr: 'count(*) FILTER(WHERE yardline_100<=20)', f: 'int' },
      { key: 'n3', label: '3rd Down Plays', expr: 'count(*) FILTER(WHERE down=3)', f: 'int' },
      { key: 'twom', label: '2-Min Yds allowed', expr: 'sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0)) FILTER(WHERE half_seconds_remaining<=120)', f: 'int' },
      { key: 'twomTD', label: '2-Min TDs allowed', expr: '(sum(pass_touchdown)+sum(rush_touchdown)) FILTER(WHERE half_seconds_remaining<=120)', f: 'int' },
    ]
  },
}

function Report({ kind }: { kind: keyof typeof SETS }) {
  const { slicers } = useSlicers(); const set = SETS[kind]
  const sql = `SELECT defteam AS cat, ${selOf(set.defs)} FROM plays WHERE defteam IS NOT NULL AND ${set.base} ${playsWhere(slicers)} GROUP BY cat HAVING count(*) >= ${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return <MetricReport loading={q.loading} title={set.title} subtitle={`${set.sub} · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Defense', set.defs), sort: { key: set.sortKey, dir: set.sortDir }, caption: 'Every defense — sortable' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(set.defs) }]} />
}

/* ============================================================================
 * Pass D by Depth — GRID VIEW (owner-requested).
 * One table per depth bucket, each showing every defense on the same metrics.
 * ========================================================================== */
function PassByDepth() {
  const { slicers } = useSlicers()
  // Depth buckets defined outside the panel so labels are shared.
  const BUCKETS = [
    { key: 'behindLOS', label: 'Behind LOS', cond: 'air_yards <= 0' },
    { key: 'd1to5',     label: '1–5',        cond: 'air_yards BETWEEN 1 AND 5' },
    { key: 'd6to10',    label: '6–10',       cond: 'air_yards BETWEEN 6 AND 10' },
    { key: 'd11to15',   label: '11–15',      cond: 'air_yards BETWEEN 11 AND 15' },
    { key: 'd16to25',   label: '16–25',      cond: 'air_yards BETWEEN 16 AND 25' },
    { key: 'd26plus',   label: '26+',        cond: 'air_yards >= 26' },
  ]
  const selects = BUCKETS.map(b =>
    `count(*) FILTER(WHERE ${b.cond}) att_${b.key},
     sum(complete_pass) FILTER(WHERE ${b.cond}) comp_${b.key},
     sum(passing_yards) FILTER(WHERE ${b.cond}) yds_${b.key},
     sum(first_down) FILTER(WHERE ${b.cond}) fd_${b.key},
     sum(pass_touchdown) FILTER(WHERE ${b.cond}) td_${b.key}`
  ).join(',\n     ')
  const sql = `SELECT defteam tm, ${selects}
    FROM plays WHERE defteam IS NOT NULL AND pass_attempt=1 AND air_yards IS NOT NULL ${playsWhere(slicers)}
    GROUP BY defteam HAVING count(*) >= ${minN(slicers)}`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">Pass defense by depth</h3>
        <p className="text-[11.5px] text-muted mt-0.5">Every defense, cut by depth of target. Hover a row to see attempts faced. · {sliceLabel(slicers)}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {BUCKETS.map(b => {
          const shaped = rows.map((r: any) => ({
            tm: r.tm,
            att: r[`att_${b.key}`] || 0,
            comp: r[`comp_${b.key}`] || 0,
            comp_pct: r[`att_${b.key}`] ? Math.round((r[`comp_${b.key}`] / r[`att_${b.key}`]) * 1000) / 10 : 0,
            yds: r[`yds_${b.key}`] || 0,
            ypa: r[`att_${b.key}`] ? Math.round((r[`yds_${b.key}`] / r[`att_${b.key}`]) * 100) / 100 : 0,
            fd: r[`fd_${b.key}`] || 0,
            td: r[`td_${b.key}`] || 0,
          })).filter((r: any) => r.att > 0).sort((a: any, b: any) => a.comp_pct - b.comp_pct)
          const cols: Column<any>[] = [
            { key: 'tm', label: 'Def' },
            { key: 'att', label: 'Att', numeric: true },
            { key: 'comp_pct', label: 'Comp%', numeric: true, format: F.pct },
            { key: 'ypa', label: 'Y/A', numeric: true, format: F.d2 },
            { key: 'yds', label: 'Yds', numeric: true },
            { key: 'fd', label: '1D', numeric: true },
            { key: 'td', label: 'TD', numeric: true },
          ]
          return (
            <div key={b.key} className="rounded border border-line bg-paper p-3">
              <p className="eyebrow mb-2">Depth {b.label}</p>
              <div className="overflow-x-auto">
                <DataTable rows={shaped} columns={cols} defaultSort={{ key: 'comp_pct', dir: 'asc' }} tight zebra />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Data Table — packed metrics per defense (no EPA/success) */
function DataTab() {
  const { slicers } = useSlicers()
  const sql = `SELECT defteam tm, count(*) plays,
      round(sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0))*1.0/count(*),2) yg,
      sum(passing_yards)::int py, sum(rushing_yards)::int ry,
      sum(pass_touchdown)::int ptd, sum(rush_touchdown)::int rtd,
      round(sum(complete_pass) FILTER(WHERE pass_attempt=1)*100.0/nullif(count(*) FILTER(WHERE pass_attempt=1),0),1) comp,
      round(avg(air_yards) FILTER(WHERE pass_attempt=1),1) adot,
      sum(first_down)::int fd,
      round(sum(first_down)*100.0/count(*),1) fdpct,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third,
      round((sum(pass_touchdown)+sum(rush_touchdown)) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1) rztd,
      sum(sack)::int sacks, sum(interception)::int ints, sum(fumble_lost)::int fum,
      round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1) expl
    FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)}
    GROUP BY 1 HAVING count(*) >= ${minN(slicers)} ORDER BY yg ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Def' }, { key: 'plays', label: 'Plays', numeric: true },
    { key: 'yg', label: 'Y/P', numeric: true, format: F.d2 },
    { key: 'py', label: 'Pass Yds', numeric: true }, { key: 'ry', label: 'Rush Yds', numeric: true },
    { key: 'ptd', label: 'PaTD', numeric: true }, { key: 'rtd', label: 'RuTD', numeric: true },
    { key: 'comp', label: 'Comp%', numeric: true, format: F.pct },
    { key: 'adot', label: 'aDOTfc', numeric: true, format: F.d1 },
    { key: 'fd', label: '1D', numeric: true }, { key: 'fdpct', label: '1D%', numeric: true, format: F.pct },
    { key: 'third', label: '3rd%', numeric: true, format: F.pct },
    { key: 'rztd', label: 'RZTD%', numeric: true, format: F.pct },
    { key: 'sacks', label: 'Sk', numeric: true }, { key: 'ints', label: 'INT', numeric: true },
    { key: 'fum', label: 'FumR', numeric: true }, { key: 'expl', label: 'Expl%', numeric: true, format: F.pct },
  ]
  return <Tile title="Every defense — packed metrics" subtitle={`${sliceLabel(slicers)} · scroll horizontally`} span={12}>
    <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'yg', dir: 'asc' }} tight zebra />}</QueryState>
  </Tile>
}

/* Fantasy DST — keeps the "splash score" concept but drops EPA */
const DST_DEFS: MDef[] = [
  { key: 'splash', label: 'Splash score', expr: 'sum(sack)+sum(interception)*2+sum(fumble_lost)*2', f: 'int' },
  { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
  { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
  { key: 'fum', label: 'Fumble recoveries', expr: 'sum(fumble_lost)', f: 'int' },
  { key: 'tak', label: 'Takeaways', expr: 'sum(interception)+sum(fumble_lost)', f: 'int' },
  { key: 'sg', label: 'Sacks / Gm', expr: 'round(sum(sack)*1.0/nullif(count(distinct game_id),0),2)', f: 'd2' },
  { key: 'tg', label: 'Takeaways / Gm', expr: 'round((sum(interception)+sum(fumble_lost))*1.0/nullif(count(distinct game_id),0),2)', f: 'd2' },
  { key: 'fda', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
  { key: 'ypp', label: 'Yds / Play allowed', expr: 'round(sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0))*1.0/count(*),2)', f: 'd2' },
  { key: 'gms', label: 'Games', expr: 'count(distinct game_id)', f: 'int' },
]
function Dst() {
  const { slicers } = useSlicers()
  const sql = `SELECT defteam AS cat, ${selOf(DST_DEFS)} FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)} GROUP BY cat HAVING count(*) >= ${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-4">
      <FantasyBanner label="Fantasy Defense · DST" headline="Sacks and takeaways drive DST scoring." body="A splash-play score (sacks + 2×INT + 2×fumble recoveries) as a quick proxy for big-play defenses, plus per-game rates so short slices stay fair." />
      <MetricReport loading={q.loading} title="Fantasy DST — splash & takeaways" subtitle={sliceLabel(slicers)}
        mini={{ rows: q.data ?? [], cols: miniColsOf('Defense', DST_DEFS), sort: { key: 'splash', dir: 'desc' }, caption: 'Every defense — sort by splash score' }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(DST_DEFS) }]} />
    </div>
  )
}
