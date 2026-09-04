/**
 * League Production — REAL DATA. 7 dense reports, 10+ visuals each.
 * Position-filtered leaderboards (set Position in the rail). Report #2 is the
 * packed table. First downs run through every report; the Situational report is
 * plays-based and honors down/distance/score/field so leaderboards stay in context.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, metricsOf, selOf, F, autoType, type MDef } from '@/components/deck/Panels'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel, thresholdHaving } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'
import { PctBarTile, TreemapTile, PALETTE } from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
const minG = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 3)
const sq = (v: string) => v.replace(/'/g, "''")

/* ---- position-aware metric sets (player_week, category = player) ---- */
function prodDefs(pos: Pos): MDef[] {
  if (pos === 'QB') return [
    { key: 'py', label: 'Pass Yds', expr: 'sum(passing_yards)::int', f: 'int' },
    { key: 'ptd', label: 'Pass TD', expr: 'sum(passing_tds)::int', f: 'int' },
    { key: 'pfd', label: 'Pass 1st Downs', expr: 'sum(passing_first_downs)::int', f: 'int' },
    { key: 'intt', label: 'INT', expr: 'sum(interceptions)::int', f: 'int' },
    { key: 'att', label: 'Attempts', expr: 'sum(attempts)::int', f: 'int' },
    { key: 'comp', label: 'Comp %', expr: 'round(sum(completions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'ypg', label: 'Pass Yds / Gm', expr: 'round(sum(passing_yards)*1.0/count(*),1)', f: 'd1' },
    { key: 'tdg', label: 'Pass TD / Gm', expr: 'round(sum(passing_tds)*1.0/count(*),2)', f: 'd2' },
    { key: 'ay', label: 'Air Yards', expr: 'sum(passing_air_yards)::int', f: 'int' },
    { key: 'g', label: 'Games', expr: 'count(*)', f: 'int' },
  ]
  if (pos === 'RB') return [
    { key: 'ry', label: 'Rush Yds', expr: 'sum(rushing_yards)::int', f: 'int' },
    { key: 'rtd', label: 'Rush TD', expr: 'sum(rushing_tds)::int', f: 'int' },
    { key: 'rfd', label: 'Rush 1st Downs', expr: 'sum(rushing_first_downs)::int', f: 'int' },
    { key: 'car', label: 'Carries', expr: 'sum(carries)::int', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'sum(receptions)::int', f: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'sum(receiving_yards)::int', f: 'int' },
    { key: 'opps', label: 'Opportunities', expr: '(sum(carries)+sum(targets))::int', f: 'int' },
    { key: 'ypc', label: 'Yds / Carry', expr: 'round(sum(rushing_yards)*1.0/nullif(sum(carries),0),2)', f: 'd2' },
    { key: 'scrim', label: 'Scrimmage Yds', expr: '(sum(rushing_yards)+sum(receiving_yards))::int', f: 'int' },
    { key: 'totfd', label: 'Total 1st Downs', expr: '(sum(rushing_first_downs)+sum(receiving_first_downs))::int', f: 'int' },
    { key: 'g', label: 'Games', expr: 'count(*)', f: 'int' },
  ]
  return [
    { key: 'recy', label: 'Rec Yds', expr: 'sum(receiving_yards)::int', f: 'int' },
    { key: 'rtd', label: 'Rec TD', expr: 'sum(receiving_tds)::int', f: 'int' },
    { key: 'rfd', label: 'Rec 1st Downs', expr: 'sum(receiving_first_downs)::int', f: 'int' },
    { key: 'tgt', label: 'Targets', expr: 'sum(targets)::int', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'sum(receptions)::int', f: 'int' },
    { key: 'ypg', label: 'Rec Yds / Gm', expr: 'round(sum(receiving_yards)*1.0/count(*),1)', f: 'd1' },
    { key: 'ypr', label: 'Yds / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'ay', label: 'Air Yards', expr: 'sum(receiving_air_yards)::int', f: 'int' },
    { key: 'ay_inc', label: 'AirY on Incomplete', expr: 'sum(receiving_air_yards_incomplete)::int', f: 'int' },
    { key: 'yac', label: 'YAC', expr: 'sum(receiving_yards_after_catch)::int', f: 'int' },
    { key: 'g', label: 'Games', expr: 'count(*)', f: 'int' },
  ]
}
function rateDefs(pos: Pos): MDef[] {
  if (pos === 'QB') return [
    { key: 'ypa', label: 'Yds / Att', expr: 'round(sum(passing_yards)*1.0/nullif(sum(attempts),0),2)', f: 'd2' },
    { key: 'comp', label: 'Comp %', expr: 'round(sum(completions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'tdpct', label: 'TD %', expr: 'round(sum(passing_tds)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'intpct', label: 'INT %', expr: 'round(sum(interceptions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'fdpa', label: '1st Down / Att %', expr: 'round(sum(passing_first_downs)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT', expr: 'round(sum(passing_air_yards)*1.0/nullif(sum(attempts),0),1)', f: 'd1' },
    { key: 'yac', label: 'YAC / Comp', expr: 'round(sum(passing_yards_after_catch)*1.0/nullif(sum(completions),0),1)', f: 'd1' },
    { key: 'sackpct', label: 'Sack %', expr: 'round(sum(sacks)*100.0/nullif(sum(attempts)+sum(sacks),0),1)', f: 'pct' },
    { key: 'ay_inc_att', label: 'AirY / Inc', expr: 'round(sum(passing_air_yards)*1.0/nullif(sum(attempts)-sum(completions),0),1)', f: 'd1' },
    { key: 'att', label: 'Attempts', expr: 'sum(attempts)::int', f: 'int' },
  ]
  if (pos === 'RB') return [
    { key: 'ypc', label: 'Yds / Carry', expr: 'round(sum(rushing_yards)*1.0/nullif(sum(carries),0),2)', f: 'd2' },
    { key: 'fdpc', label: '1st Down / Carry %', expr: 'round(sum(rushing_first_downs)*100.0/nullif(sum(carries),0),1)', f: 'pct' },
    { key: 'tdpc', label: 'TD / Carry %', expr: 'round(sum(rushing_tds)*100.0/nullif(sum(carries),0),1)', f: 'pct' },
    { key: 'ypr', label: 'Yds / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'ypt', label: 'Yds / Touch', expr: 'round((sum(rushing_yards)+sum(receiving_yards))*1.0/nullif(sum(carries)+sum(receptions),0),2)', f: 'd2' },
    { key: 'opp_g', label: 'Opps / Gm', expr: 'round((sum(carries)+sum(targets))*1.0/nullif(count(distinct game_id),0),1)', f: 'd1' },
    { key: 'fd_opp', label: '1st Down / Opp %', expr: 'round((sum(rushing_first_downs)+sum(receiving_first_downs))*100.0/nullif(sum(carries)+sum(targets),0),1)', f: 'pct' },
    { key: 'car', label: 'Carries', expr: 'sum(carries)::int', f: 'int' },
    { key: 'tgt', label: 'Targets', expr: 'sum(targets)::int', f: 'int' },
  ]
  return [
    { key: 'ypt', label: 'Yds / Target', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(targets),0),2)', f: 'd2' },
    { key: 'ypr', label: 'Yds / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'fdpt', label: '1st Down / Tgt %', expr: 'round(sum(receiving_first_downs)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'tdpt', label: 'TD / Tgt %', expr: 'round(sum(receiving_tds)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT', expr: 'round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1)', f: 'd1' },
    { key: 'yac', label: 'YAC / Rec', expr: 'round(sum(receiving_yards_after_catch)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'yac_pct', label: 'YAC %', expr: 'round(sum(receiving_yards_after_catch)*100.0/nullif(sum(receiving_yards),0),1)', f: 'pct' },
    { key: 'ay_inc', label: 'AirY / Incompletion', expr: 'round(sum(receiving_air_yards_incomplete)*1.0/nullif(sum(incompletions),0),1)', f: 'd1' },
    { key: 'tgt', label: 'Targets', expr: 'sum(targets)::int', f: 'int' },
  ]
}
/* Volume & Usage — bespoke. Target/air-yards share & WOPR are computed via a
 * window over the team total (all positions) in the same slice, so the shares
 * stay honest no matter how the data is sliced. */
type UDef = { key: string; label: string; expr: string; fmt: keyof typeof F }
function usageOuter(pos: Pos): UDef[] {
  if (pos === 'QB') return [
    { key: 'att', label: 'Attempts', expr: 'att::int', fmt: 'int' },
    { key: 'apg', label: 'Att / Gm', expr: 'round(att*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'db', label: 'Dropbacks', expr: '(att+sk)::int', fmt: 'int' },
    { key: 'ay', label: 'Air Yards', expr: 'pay::int', fmt: 'int' },
    { key: 'aypg', label: 'Air Yds / Gm', expr: 'round(pay*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'cmp', label: 'Completions', expr: 'cmp::int', fmt: 'int' },
    { key: 'sk', label: 'Sacks Taken', expr: 'sk::int', fmt: 'int' },
    { key: 'car', label: 'Rush Att', expr: 'car::int', fmt: 'int' },
    { key: 'ry', label: 'Rush Yds', expr: 'ry::int', fmt: 'int' },
    { key: 'g', label: 'Games', expr: 'g', fmt: 'int' },
  ]
  if (pos === 'RB') return [
    { key: 'car', label: 'Carries', expr: 'car::int', fmt: 'int' },
    { key: 'cpg', label: 'Carries / Gm', expr: 'round(car*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'tgt', label: 'Targets', expr: 'tgt::int', fmt: 'int' },
    { key: 'tpg', label: 'Targets / Gm', expr: 'round(tgt*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'touch', label: 'Touches', expr: '(car+rec)::int', fmt: 'int' },
    { key: 'tcg', label: 'Touches / Gm', expr: 'round((car+rec)*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'tshare', label: 'Target Share %', expr: 'round(tgt*100.0/nullif(team_tgt,0),1)', fmt: 'd1' },
    { key: 'rec', label: 'Receptions', expr: 'rec::int', fmt: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'recy::int', fmt: 'int' },
    { key: 'g', label: 'Games', expr: 'g', fmt: 'int' },
  ]
  return [
    { key: 'tgt', label: 'Targets', expr: 'tgt::int', fmt: 'int' },
    { key: 'tpg', label: 'Targets / Gm', expr: 'round(tgt*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'tshare', label: 'Target Share %', expr: 'round(tgt*100.0/nullif(team_tgt,0),1)', fmt: 'd1' },
    { key: 'ayshare', label: 'Air Yds Share %', expr: 'round(ray*100.0/nullif(team_ay,0),1)', fmt: 'd1' },
    { key: 'wopr', label: 'WOPR', expr: 'round(1.5*tgt/nullif(team_tgt,0)+0.7*ray/nullif(team_ay,0),3)', fmt: 'd2' },
    { key: 'ay', label: 'Air Yards', expr: 'ray::int', fmt: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'rec::int', fmt: 'int' },
    { key: 'rpg', label: 'Rec / Gm', expr: 'round(rec*1.0/nullif(g,0),1)', fmt: 'd1' },
    { key: 'recy', label: 'Rec Yds', expr: 'recy::int', fmt: 'int' },
    { key: 'g', label: 'Games', expr: 'g', fmt: 'int' },
  ]
}
function Usage() {
  const { slicers } = useSlicers(); const pos = usePos(); const defs = usageOuter(pos)
  const sortKey = defs[0].key
  const inner = `SELECT player_display_name cat, "position" pos, recent_team tm,
      count(distinct game_id) g, sum(attempts) att, sum(completions) cmp, sum(passing_air_yards) pay, sum(sacks) sk,
      sum(carries) car, sum(rushing_yards) ry, sum(targets) tgt, sum(receptions) rec, sum(receiving_yards) recy, sum(receiving_air_yards) ray,
      sum(sum(targets)) OVER (PARTITION BY recent_team) team_tgt,
      sum(sum(receiving_air_yards)) OVER (PARTITION BY recent_team) team_ay
    FROM ${playerGameLog(slicers)} g GROUP BY player_display_name, "position", recent_team HAVING 1=1 ${thresholdHaving(slicers)}`
  const sql = `SELECT cat, ${defs.map(d => `${d.expr} AS ${d.key}`).join(', ')} FROM (${inner})
    WHERE pos='${pos}' AND g >= ${minG(slicers)} ORDER BY ${sortKey} DESC NULLS LAST LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'cat', label: 'Player' }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.fmt] }))]
  return <MetricReport loading={q.loading} title="Volume & usage" subtitle={`${pos} · opportunity share & touches · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols, sort: { key: sortKey, dir: 'desc' }, caption: `Top 20 ${pos}s — sortable` }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', short: true, metrics: defs.map((d, i) => ({ key: d.key, label: d.label, fmt: F[d.fmt], type: autoType(d.fmt, i) })) }]} />
}
const FANTASY_DEFS: MDef[] = [
  { key: 'ppr', label: 'PPR (total)', expr: 'round(sum(fantasy_points_ppr),1)', f: 'd1' },
  { key: 'ppg', label: 'PPR / Gm', expr: 'round(sum(fantasy_points_ppr)*1.0/count(*),1)', f: 'd1' },
  { key: 'std', label: 'Standard (total)', expr: 'round(sum(fantasy_points),1)', f: 'd1' },
  { key: 'stdg', label: 'Standard / Gm', expr: 'round(sum(fantasy_points)*1.0/count(*),1)', f: 'd1' },
  { key: 'td', label: 'Total TDs', expr: '(sum(passing_tds)+sum(rushing_tds)+sum(receiving_tds))::int', f: 'int' },
  { key: 'fd', label: 'Total 1st Downs', expr: '(sum(passing_first_downs)+sum(rushing_first_downs)+sum(receiving_first_downs))::int', f: 'int' },
  { key: 'yds', label: 'Total Yards', expr: '(sum(passing_yards)+sum(rushing_yards)+sum(receiving_yards))::int', f: 'int' },
  { key: 'rec', label: 'Receptions', expr: 'sum(receptions)::int', f: 'int' },
  { key: 'floor', label: 'Floor (worst Gm)', expr: 'round(min(fantasy_points_ppr),1)', f: 'd1' },
  { key: 'ceil', label: 'Ceiling (best Gm)', expr: 'round(max(fantasy_points_ppr),1)', f: 'd1' },
]

const usePos = () => (useSlicers().slicers.positions[0] ?? 'WR') as Pos

/* Generic player_week leaderboard report — kind-driven so no hooks live in tab callbacks */
type Kind = 'prod' | 'rate' | 'fantasy'
const KIND_META: Record<Kind, { title: string; sub: string }> = {
  prod: { title: 'Position leaderboard', sub: 'production & first downs' },
  rate: { title: 'Efficiency leaders', sub: 'per-play & per-opportunity rates' },
  fantasy: { title: 'Fantasy leaders', sub: 'PPR, standard, floor & ceiling' },
}
function defsFor(kind: Kind, pos: Pos): MDef[] {
  return kind === 'prod' ? prodDefs(pos) : kind === 'rate' ? rateDefs(pos) : FANTASY_DEFS
}
function PlayerReport({ kind }: { kind: Kind }) {
  const { slicers } = useSlicers(); const pos = usePos()
  const defs = defsFor(kind, pos)
  // FIX: rate defs (Efficiency Leaders) never had an 'epa' column — sort key
  // was invalid, causing DuckDB to reject the query and the tab to render empty.
  // Fall back to the position's headline rate (defs[0]) same as prod uses.
  const sortKey = kind === 'fantasy' ? 'ppr' : defs[0].key
  const { title, sub } = KIND_META[kind]
  const fantasy = kind === 'fantasy'
  const sql = `SELECT player_display_name AS cat, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}'
    GROUP BY cat HAVING count(distinct game_id) >= ${minG(slicers)} ${thresholdHaving(slicers)} ORDER BY ${sortKey} DESC NULLS LAST LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'cat', label: 'Player' }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]
  const body = (
    <MetricReport loading={q.loading} title={title} subtitle={`${pos} · ${sub} · ${sliceLabel(slicers)}`}
      mini={{ rows: q.data ?? [], cols, sort: { key: sortKey, dir: 'desc' }, caption: `Top 20 ${pos}s — sortable` }}
      panels={[{ rows: q.data ?? [], categoryKey: 'cat', short: true, metrics: metricsOf(defs) }]} />
  )
  if (!fantasy) return body
  return <div className="space-y-4"><FantasyBanner label="Fantasy Leaders" headline="Volume, efficiency, floor and ceiling in one view." body="PPR and standard totals plus per-game rates, with each player's worst and best game so you can separate the steady from the spiky. Set position and slice in the rail." />{body}</div>
}

/* Report #2 — packed table (position-aware, with team) */
function DataTab() {
  const { slicers } = useSlicers(); const pos = usePos()
  const defs = [...prodDefs(pos), ...rateDefs(pos).filter(d => !prodDefs(pos).some(p => p.key === d.key)).slice(0, 6)]
  const sql = `SELECT player_display_name nm, recent_team tm, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}'
    GROUP BY 1,2 HAVING count(distinct game_id) >= ${minG(slicers)} ${thresholdHaving(slicers)} ORDER BY ${defs[0].key} DESC NULLS LAST LIMIT 60`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' },
    ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]
  return <Tile title={`Every ${pos} — packed metrics`} subtitle={`${sliceLabel(slicers)} · honors the rail · scroll horizontally`} span={12}>
    <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: defs[0].key, dir: 'desc' }} dense />}</QueryState>
  </Tile>
}

/* Report #5 — Situational (plays-based, honors down/distance/score/field) */
const SIT_DEFS: MDef[] = [
  { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
  { key: 'sr', label: 'Success %', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
  { key: 'fd', label: '1st Downs', expr: 'sum(first_down)', f: 'int' },
  { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
  { key: 'td', label: 'TDs', expr: 'sum(touchdown)', f: 'int' },
  { key: 'e3', label: '3rd-Down EPA', expr: 'round(avg(epa) FILTER(WHERE down=3),3)', f: 'epa' },
  { key: 'fd3', label: '3rd-Down 1st Downs', expr: 'sum(first_down) FILTER(WHERE down=3)', f: 'int' },
  { key: 'rz', label: 'Red-Zone plays', expr: 'count(*) FILTER(WHERE yardline_100<=20)', f: 'int' },
  { key: 'expl', label: 'Explosive plays', expr: 'count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))', f: 'int' },
  { key: 'n', label: 'Plays', expr: 'count(*)', f: 'int' },
]
function Situational() {
  const { slicers } = useSlicers(); const pos = usePos()
  const role = pos === 'QB' ? 'passer' : pos === 'RB' ? 'rusher' : 'receiver'
  const base = pos === 'RB' ? 'rush_attempt=1' : 'pass_attempt=1'
  const minN = slicers.weeks.length ? 1 : 20
  const sql = `SELECT ${role}_player_name AS cat, ${selOf(SIT_DEFS)} FROM plays
    WHERE ${role}_player_name IS NOT NULL AND ${base}
      AND ${role}_player_id IN (SELECT gsis_id FROM players WHERE position='${sq(pos)}') ${playsWhere(slicers)}
    GROUP BY cat HAVING count(*) >= ${minN} ORDER BY n DESC LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'cat', label: 'Player' }, ...SIT_DEFS.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]
  return <MetricReport loading={q.loading} title="Situational production" subtitle={`${pos} · by-play, in the slice you set · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols, sort: { key: 'epa', dir: 'desc' }, caption: 'Top 20 by volume — set down/distance/score in the rail' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', short: true, metrics: metricsOf(SIT_DEFS) }]} />
}

/* Report #6 — Weekly league trends (category = week) */
/* ============================================================================
 * NEW: EMERGING PRODUCERS
 * Players whose most-recent 4 games meaningfully outpace their prior baseline.
 * For each position, sort by the delta (last-4-avg minus prior-avg) in the
 * position's headline volume metric.
 * ========================================================================== */
function EmergingProducers() {
  const { slicers } = useSlicers(); const pos = usePos()
  const vol = pos === 'QB' ? 'attempts' : pos === 'RB' ? 'carries' : 'targets'
  const yd  = pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'
  const volLabel = pos === 'QB' ? 'Attempts' : pos === 'RB' ? 'Carries' : 'Targets'
  const ydLabel = pos === 'QB' ? 'Pass Yds' : pos === 'RB' ? 'Rush Yds' : 'Rec Yds'
  // For each player: split games into last-4 vs prior by row_number over
  // player-week rows sorted desc by season/week; compare averages.
  const sql = `
    WITH gl AS (
      SELECT player_id, player_display_name nm, recent_team tm, season, week, ${vol} v, ${yd} y
      FROM ${playerGameLog(slicers)} g WHERE g."position" = '${pos}'
    ),
    ranked AS (
      SELECT *, row_number() OVER (PARTITION BY player_id ORDER BY season DESC, week DESC) rn,
             count(*) OVER (PARTITION BY player_id) gp
      FROM gl
    )
    SELECT nm, max(tm) tm,
      max(gp) gp,
      round(avg(v) FILTER (WHERE rn <= 4), 1) v_recent,
      round(avg(v) FILTER (WHERE rn >  4), 1) v_prior,
      round(avg(y) FILTER (WHERE rn <= 4), 1) y_recent,
      round(avg(y) FILTER (WHERE rn >  4), 1) y_prior,
      round(avg(v) FILTER (WHERE rn <= 4) - avg(v) FILTER (WHERE rn > 4), 1) v_delta,
      round(avg(y) FILTER (WHERE rn <= 4) - avg(y) FILTER (WHERE rn > 4), 1) y_delta
    FROM ranked
    GROUP BY nm HAVING max(gp) >= 6 AND avg(v) FILTER (WHERE rn <= 4) >= 2
    ORDER BY v_delta DESC NULLS LAST LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' }, { key: 'gp', label: 'GP', numeric: true },
    { key: 'v_recent', label: `${volLabel} (L4)`, numeric: true, format: F.d1 },
    { key: 'v_prior', label: `${volLabel} (prior)`, numeric: true, format: F.d1 },
    { key: 'v_delta', label: 'Δ Volume', numeric: true, format: F.d1 },
    { key: 'y_recent', label: `${ydLabel} (L4)`, numeric: true, format: F.d1 },
    { key: 'y_prior', label: `${ydLabel} (prior)`, numeric: true, format: F.d1 },
    { key: 'y_delta', label: `Δ ${ydLabel}`, numeric: true, format: F.d1 },
  ]
  return <MetricReport loading={q.loading} title="Emerging producers"
    subtitle={`${pos} · last-4 vs season-to-date · ${sliceLabel(slicers)} · players heating up`}
    mini={{ rows: q.data ?? [], cols, sort: { key: 'v_delta', dir: 'desc' }, caption: 'Sorted by volume delta' }}
    panels={[]} />
}

/* ============================================================================
 * NEW: POSITION × TEAM
 * For each team, the breakdown of production/volume by position. Shows both
 * league-total and team-by-team splits.
 * ========================================================================== */
function PositionByTeam() {
  const { slicers } = useSlicers()
  const sql = `SELECT recent_team tm, "position" pos,
      sum(attempts+carries+targets)::int touches,
      sum(passing_yards+rushing_yards+receiving_yards)::int yds,
      sum(passing_tds+rushing_tds+receiving_tds)::int tds,
      sum(passing_first_downs+rushing_first_downs+receiving_first_downs)::int fds
    FROM ${playerGameLog(slicers)} g
    WHERE "position" IN ('QB','RB','WR','TE')
    GROUP BY recent_team, "position"
    ORDER BY recent_team, "position"`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  // Aggregate to leaguewide totals per position for the top summary.
  const leagueByPos = ['QB','RB','WR','TE'].map(p => {
    const acc = rows.filter(r => r.pos === p).reduce((s, r) => ({
      touches: s.touches + (r.touches || 0),
      yds: s.yds + (r.yds || 0),
      tds: s.tds + (r.tds || 0),
    }), { touches: 0, yds: 0, tds: 0 })
    return { name: p, ...acc, value: acc.yds }
  })
  // Per-team stacked bars (yards by position)
  const teams = [...new Set(rows.map(r => r.tm))].sort()
  const pivot = teams.map(tm => {
    const row: any = { name: tm }; let tot = 0
    ;['QB','RB','WR','TE'].forEach(p => {
      const rec = rows.find(r => r.tm === tm && r.pos === p)
      row[p] = rec?.yds ?? 0; tot += row[p]
    })
    row._tot = tot
    return row
  }).sort((a, b) => b._tot - a._tot)
  const colors = [PALETTE.accent2, PALETTE.ok, PALETTE.accent, PALETTE.bad]

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">Position × Team</h3>
        <p className="text-[11.5px] text-muted mt-0.5">Positional distribution of production, both leaguewide and per team · {sliceLabel(slicers)}</p>
      </div>
      {/* Leaguewide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">League-wide yards by position</p>
          <PctBarTile data={leagueByPos} height={40} />
          <div className="mt-3 grid grid-cols-4 gap-2 text-center">
            {leagueByPos.map((r, i) => (
              <div key={r.name} className="rounded bg-cream p-2">
                <p className="text-[11px] font-semibold text-ink">{r.name}</p>
                <p className="text-[10px] text-muted num mt-0.5">{fmt.int(r.yds)} yds</p>
                <p className="text-[10px] text-muted num">{r.tds} TDs</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">League touches by position</p>
          <TreemapTile data={leagueByPos.map(r => ({ name: r.name, value: r.touches }))} height={220} />
        </div>
      </div>
      {/* Per team */}
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Yards by position, per team (sorted by total)</p>
        <div className="grid grid-cols-1 gap-1.5" style={{ maxHeight: 560, overflowY: 'auto' }}>
          {pivot.map(row => (
            <div key={row.name} className="flex items-center gap-2">
              <span className="w-10 text-[11px] font-mono text-muted flex-shrink-0">{row.name}</span>
              <div className="flex-1 flex h-4 rounded overflow-hidden border border-line">
                {['QB','RB','WR','TE'].map((p, i) => {
                  const v = row[p]; const pct = row._tot ? v / row._tot * 100 : 0
                  if (pct === 0) return null
                  return <div key={p} title={`${p}: ${v} (${pct.toFixed(1)}%)`}
                    className="text-[9px] font-semibold text-white flex items-center justify-center"
                    style={{ background: colors[i], width: `${pct}%` }}>
                    {pct >= 15 ? p : ''}
                  </div>
                })}
              </div>
              <span className="w-16 text-right text-[10.5px] text-muted num flex-shrink-0">{fmt.int(row._tot)}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-3 justify-end">
          {['QB','RB','WR','TE'].map((p, i) => (
            <span key={p} className="inline-flex items-center gap-1 text-[9.5px]">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors[i] }} />{p}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LeagueProductionDeck() {
  const tabs: DeckTab[] = [
    { id: 'leaderboard', label: 'Position Leaderboard', render: () => <PlayerReport kind="prod" /> },
    { id: 'data',        label: 'Data Table',           render: () => <DataTab /> },
    { id: 'efficiency',  label: 'Efficiency Leaders',   render: () => <PlayerReport kind="rate" /> },
    { id: 'usage',       label: 'Volume & Usage',       render: () => <Usage /> },
    { id: 'situational', label: 'Situational Splits',   render: () => <Situational /> },
    { id: 'emerging',    label: 'Emerging Producers',   render: () => <EmergingProducers /> },
    { id: 'positiontm',  label: 'Position × Team',      render: () => <PositionByTeam /> },
    { id: 'fantasy',     label: 'Fantasy Leaders',      fantasy: true, render: () => <PlayerReport kind="fantasy" /> },
  ]
  return (
    <DeckShell title="League Production" deckIndex={6}
      intro="Cross-league leaderboards, sliced honestly. Filter by position to compare like-for-like — production, efficiency, usage, situational splits, and who's heating up. Situational and emerging reports read from play-by-play, so down, distance, score and field position all bite."
      tabs={tabs}
      slicerGroups={['season','week','position','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','threshold']} />
  )
}
