/**
 * League Production — REAL DATA. 7 dense reports, 10+ visuals each.
 * Position-filtered leaderboards (set Position in the rail). Report #2 is the
 * packed table. First downs run through every report; the Situational report is
 * plays-based and honors down/distance/score/field so leaderboards stay in context.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, metricsOf, selOf, F, type MDef } from '@/components/deck/Panels'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'

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
    { key: 'ppr', label: 'PPR (total)', expr: 'round(sum(fantasy_points_ppr),1)', f: 'd1' },
    { key: 'g', label: 'Games', expr: 'count(*)', f: 'int' },
  ]
  if (pos === 'RB') return [
    { key: 'ry', label: 'Rush Yds', expr: 'sum(rushing_yards)::int', f: 'int' },
    { key: 'rtd', label: 'Rush TD', expr: 'sum(rushing_tds)::int', f: 'int' },
    { key: 'rfd', label: 'Rush 1st Downs', expr: 'sum(rushing_first_downs)::int', f: 'int' },
    { key: 'car', label: 'Carries', expr: 'sum(carries)::int', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'sum(receptions)::int', f: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'sum(receiving_yards)::int', f: 'int' },
    { key: 'ypc', label: 'Yds / Carry', expr: 'round(sum(rushing_yards)*1.0/nullif(sum(carries),0),2)', f: 'd2' },
    { key: 'scrim', label: 'Scrimmage Yds', expr: '(sum(rushing_yards)+sum(receiving_yards))::int', f: 'int' },
    { key: 'ppr', label: 'PPR (total)', expr: 'round(sum(fantasy_points_ppr),1)', f: 'd1' },
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
    { key: 'ppr', label: 'PPR (total)', expr: 'round(sum(fantasy_points_ppr),1)', f: 'd1' },
    { key: 'g', label: 'Games', expr: 'count(*)', f: 'int' },
  ]
}
function rateDefs(pos: Pos): MDef[] {
  if (pos === 'QB') return [
    { key: 'epa', label: 'EPA / Gm', expr: 'round(avg(passing_epa),3)', f: 'epa' },
    { key: 'ypa', label: 'Yds / Att', expr: 'round(sum(passing_yards)*1.0/nullif(sum(attempts),0),2)', f: 'd2' },
    { key: 'comp', label: 'Comp %', expr: 'round(sum(completions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'tdpct', label: 'TD %', expr: 'round(sum(passing_tds)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'intpct', label: 'INT %', expr: 'round(sum(interceptions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'fdpa', label: '1st Down / Att %', expr: 'round(sum(passing_first_downs)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT', expr: 'round(sum(passing_air_yards)*1.0/nullif(sum(attempts),0),1)', f: 'd1' },
    { key: 'yac', label: 'YAC / Comp', expr: 'round(sum(passing_yards_after_catch)*1.0/nullif(sum(completions),0),1)', f: 'd1' },
    { key: 'sackpct', label: 'Sack %', expr: 'round(sum(sacks)*100.0/nullif(sum(attempts)+sum(sacks),0),1)', f: 'pct' },
    { key: 'att', label: 'Attempts', expr: 'sum(attempts)::int', f: 'int' },
  ]
  if (pos === 'RB') return [
    { key: 'epa', label: 'Rush EPA / Gm', expr: 'round(avg(rushing_epa),3)', f: 'epa' },
    { key: 'ypc', label: 'Yds / Carry', expr: 'round(sum(rushing_yards)*1.0/nullif(sum(carries),0),2)', f: 'd2' },
    { key: 'fdpc', label: '1st Down / Carry %', expr: 'round(sum(rushing_first_downs)*100.0/nullif(sum(carries),0),1)', f: 'pct' },
    { key: 'tdpc', label: 'TD / Carry %', expr: 'round(sum(rushing_tds)*100.0/nullif(sum(carries),0),1)', f: 'pct' },
    { key: 'ypr', label: 'Yds / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'repa', label: 'Rec EPA / Gm', expr: 'round(avg(receiving_epa),3)', f: 'epa' },
    { key: 'ypt', label: 'Yds / Touch', expr: 'round((sum(rushing_yards)+sum(receiving_yards))*1.0/nullif(sum(carries)+sum(receptions),0),2)', f: 'd2' },
    { key: 'car', label: 'Carries', expr: 'sum(carries)::int', f: 'int' },
    { key: 'tgt', label: 'Targets', expr: 'sum(targets)::int', f: 'int' },
  ]
  return [
    { key: 'epa', label: 'Rec EPA / Gm', expr: 'round(avg(receiving_epa),3)', f: 'epa' },
    { key: 'ypt', label: 'Yds / Target', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(targets),0),2)', f: 'd2' },
    { key: 'ypr', label: 'Yds / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'fdpt', label: '1st Down / Tgt %', expr: 'round(sum(receiving_first_downs)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'tdpt', label: 'TD / Tgt %', expr: 'round(sum(receiving_tds)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT', expr: 'round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1)', f: 'd1' },
    { key: 'yac', label: 'YAC / Rec', expr: 'round(sum(receiving_yards_after_catch)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'tgt', label: 'Targets', expr: 'sum(targets)::int', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'sum(receptions)::int', f: 'int' },
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
    FROM ${playerGameLog(slicers)} g GROUP BY player_display_name, "position", recent_team`
  const sql = `SELECT cat, ${defs.map(d => `${d.expr} AS ${d.key}`).join(', ')} FROM (${inner})
    WHERE pos='${pos}' AND g >= ${minG(slicers)} ORDER BY ${sortKey} DESC NULLS LAST LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'cat', label: 'Player' }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.fmt] }))]
  return <MetricReport loading={q.loading} title="Volume & usage" subtitle={`${pos} · opportunity share & touches · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols, sort: { key: sortKey, dir: 'desc' }, caption: `Top 20 ${pos}s — sortable` }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', short: true, metrics: defs.map(d => ({ key: d.key, label: d.label, fmt: F[d.fmt] })) }]} />
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
  const sortKey = kind === 'rate' ? 'epa' : kind === 'fantasy' ? 'ppr' : defs[0].key
  const { title, sub } = KIND_META[kind]
  const fantasy = kind === 'fantasy'
  const sql = `SELECT player_display_name AS cat, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}'
    GROUP BY cat HAVING count(distinct game_id) >= ${minG(slicers)} ORDER BY ${sortKey} DESC NULLS LAST LIMIT 20`
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
    GROUP BY 1,2 HAVING count(distinct game_id) >= ${minG(slicers)} ORDER BY ${defs[0].key} DESC NULLS LAST LIMIT 60`
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
function weeklyDefs(pos: Pos): MDef[] {
  const yd = pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'
  const td = pos === 'QB' ? 'passing_tds' : pos === 'RB' ? 'rushing_tds' : 'receiving_tds'
  const fd = pos === 'QB' ? 'passing_first_downs' : pos === 'RB' ? 'rushing_first_downs' : 'receiving_first_downs'
  const vol = pos === 'QB' ? 'attempts' : pos === 'RB' ? 'carries' : 'targets'
  const volLabel = pos === 'QB' ? 'Attempts' : pos === 'RB' ? 'Carries' : 'Targets'
  const bigThresh = pos === 'QB' ? 300 : 100
  return [
    { key: 'yds', label: `League ${pos} Yds`, expr: `sum(${yd})::int`, f: 'int' },
    { key: 'tds', label: 'Total TDs', expr: `sum(${td})::int`, f: 'int' },
    { key: 'fds', label: 'Total 1st Downs', expr: `sum(${fd})::int`, f: 'int' },
    { key: 'vol', label: volLabel, expr: `sum(${vol})::int`, f: 'int' },
    { key: 'fpts', label: 'League PPR', expr: 'round(sum(fantasy_points_ppr),1)', f: 'd1' },
    { key: 'np', label: 'Players', expr: 'count(distinct player_id)', f: 'int' },
    { key: 'ppg', label: 'PPR / Player', expr: 'round(sum(fantasy_points_ppr)*1.0/nullif(count(distinct player_id),0),1)', f: 'd1' },
    { key: 'ypp', label: 'Yds / Player', expr: `round(sum(${yd})*1.0/nullif(count(distinct player_id),0),1)`, f: 'd1' },
    { key: 'big', label: `${bigThresh}+ Yd Games`, expr: `count(*) FILTER(WHERE ${yd}>=${bigThresh})`, f: 'int' },
    { key: 'rows', label: 'Player-Games', expr: 'count(*)', f: 'int' },
  ]
}
function Weekly() {
  const { slicers } = useSlicers(); const pos = usePos(); const defs = weeklyDefs(pos)
  const sql = `SELECT week AS cat, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}'
    GROUP BY cat ORDER BY week`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'cat', label: 'Week' }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]
  const lineMetrics = metricsOf(defs).map(m => ({ ...m, type: 'line' as const }))
  return <MetricReport loading={q.loading} title="Weekly league trends" subtitle={`${pos} · league totals by week · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols, sort: { key: 'cat', dir: 'asc' }, caption: 'Week by week' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: lineMetrics }]} />
}

export default function LeagueProductionDeck() {
  const tabs: DeckTab[] = [
    { id: 'leaderboard', label: 'Position Leaderboard', render: () => <PlayerReport kind="prod" /> },
    { id: 'data',        label: 'Data Table',           render: () => <DataTab /> },
    { id: 'efficiency',  label: 'Efficiency Leaders',   render: () => <PlayerReport kind="rate" /> },
    { id: 'usage',       label: 'Volume & Usage',       render: () => <Usage /> },
    { id: 'situational', label: 'Situational Splits',   render: () => <Situational /> },
    { id: 'weekly',      label: 'Weekly Trends',        render: () => <Weekly /> },
    { id: 'fantasy',     label: 'Fantasy Leaders',      fantasy: true, render: () => <PlayerReport kind="fantasy" /> },
  ]
  return (
    <DeckShell title="League Production" deckIndex={6}
      intro="Cross-league leaderboards, sliced honestly. Filter by position to compare like-for-like — production, efficiency, usage, situational splits, weekly trends and fantasy — all the way down to whatever slice of the season matters. First downs run throughout; the situational report is play-by-play, so down, distance, score and field position all bite."
      tabs={tabs}
      slicerGroups={['season','week','position','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}
