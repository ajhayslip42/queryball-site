/**
 * PlayerView — generic, position-aware Single Player view. REAL DATA.
 * 8 reports; each report has 10+ visuals (mini-table + small-multiples grid).
 * Report #2 is the packed all-metrics data table. First-down metrics included.
 */
import { type DeckTab, Tile } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, type Metric } from '@/components/deck/Panels'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'
import { fmt } from '@/lib/nfl'
import type { Player } from '@/lib/players'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
const sq = (s: string) => `'${s.replace(/'/g, "''")}'`
const F = {
  int: (v: number) => fmt.int(v), d1: (v: number) => fmt.num(v, 1), d2: (v: number) => fmt.num(v, 2),
  epa: (v: number) => fmt.signed(v, 3), pct: (v: number) => `${fmt.num(v, 1)}%`,
}
type M = { key: string; label: string; expr: string; f: keyof typeof F }
const metrics = (defs: M[]): Metric[] => defs.map(d => ({ key: d.key, label: d.label, fmt: F[d.f] }))
const sel = (defs: M[]): string => defs.map(d => `${d.expr} AS ${d.key}`).join(', ')
const miniCols = (catLabel: string, defs: M[]): Column<any>[] =>
  [{ key: 'cat', label: catLabel }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]

export function buildPlayerTabs(player: Player): DeckTab[] {
  return [
    { id: 'overview', label: 'Overview',         render: () => <Weekly player={player} kind="prod" /> },
    { id: 'data',     label: 'Data Table',        render: () => <DataTab player={player} /> },
    { id: 'rates',    label: 'Weekly Rates',      render: () => <Weekly player={player} kind="rate" /> },
    { id: 'downdist', label: 'Down & Distance',   render: () => <DownDist player={player} /> },
    { id: 'gamestate',label: 'Game State',        render: () => <Splits player={player} dim="score" /> },
    { id: 'depth',    label: player.position === 'RB' ? 'Run Direction' : 'Pass Depth', render: () => <Depth player={player} /> },
    { id: 'field',    label: 'Field & Quarter',   render: () => <FieldQtr player={player} /> },
    { id: 'fantasy',  label: 'Fantasy',           fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}
export const PLAYER_SLICERS = [
  'season','week','team','opponent','homeAway','down','distance','score','zone','qtr',
  'passDepth','runDir','pressure','shotgun','playType','garbage',
] as const

const roleId = (pos: Pos) => pos === 'QB' ? 'passer_player_id' : pos === 'RB' ? 'rusher_player_id' : 'receiver_player_id'
const roleFilter = (pos: Pos) => pos === 'QB' ? '(pass_attempt=1 OR sack=1)' : pos === 'RB' ? 'rush_attempt=1' : 'pass_attempt=1'

/* ---- weekly metric sets (player_week, one row per game) ---- */
function pwProd(pos: Pos): M[] {
  if (pos === 'QB') return [
    { key: 'py', label: 'Pass Yds', expr: 'passing_yards', f: 'int' },
    { key: 'att', label: 'Attempts', expr: 'attempts', f: 'int' },
    { key: 'cmp', label: 'Completions', expr: 'completions', f: 'int' },
    { key: 'ptd', label: 'Pass TD', expr: 'passing_tds', f: 'int' },
    { key: 'intc', label: 'INT', expr: 'interceptions', f: 'int' },
    { key: 'fd', label: 'Pass 1st Downs', expr: 'passing_first_downs', f: 'int' },
    { key: 'ay', label: 'Air Yards', expr: 'passing_air_yards', f: 'int' },
    { key: 'sk', label: 'Sacks', expr: 'sacks', f: 'int' },
    { key: 'ry', label: 'Rush Yds', expr: 'rushing_yards', f: 'int' },
    { key: 'ppr', label: 'PPR Pts', expr: 'fantasy_points_ppr', f: 'd1' },
  ]
  if (pos === 'RB') return [
    { key: 'ry', label: 'Rush Yds', expr: 'rushing_yards', f: 'int' },
    { key: 'car', label: 'Carries', expr: 'carries', f: 'int' },
    { key: 'rtd', label: 'Rush TD', expr: 'rushing_tds', f: 'int' },
    { key: 'rfd', label: 'Rush 1st Downs', expr: 'rushing_first_downs', f: 'int' },
    { key: 'tgt', label: 'Targets', expr: 'targets', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'receptions', f: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'receiving_yards', f: 'int' },
    { key: 'recfd', label: 'Rec 1st Downs', expr: 'receiving_first_downs', f: 'int' },
    { key: 'td', label: 'Total TD', expr: 'rushing_tds+receiving_tds', f: 'int' },
    { key: 'ppr', label: 'PPR Pts', expr: 'fantasy_points_ppr', f: 'd1' },
  ]
  return [
    { key: 'tgt', label: 'Targets', expr: 'targets', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'receptions', f: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'receiving_yards', f: 'int' },
    { key: 'rtd', label: 'Rec TD', expr: 'receiving_tds', f: 'int' },
    { key: 'fd', label: 'Rec 1st Downs', expr: 'receiving_first_downs', f: 'int' },
    { key: 'ay', label: 'Air Yards', expr: 'receiving_air_yards', f: 'int' },
    { key: 'yac', label: 'YAC', expr: 'receiving_yards_after_catch', f: 'int' },
    { key: 'tsh', label: 'Tgt Share %', expr: 'target_share*100', f: 'd1' },
    { key: 'wopr', label: 'WOPR', expr: 'wopr', f: 'd2' },
    { key: 'ppr', label: 'PPR Pts', expr: 'fantasy_points_ppr', f: 'd1' },
  ]
}
function pwRate(pos: Pos): M[] {
  if (pos === 'QB') return [
    { key: 'cmppct', label: 'Comp %', expr: 'round(completions*100.0/nullif(attempts,0),1)', f: 'pct' },
    { key: 'ya', label: 'Yards / Att', expr: 'round(passing_yards*1.0/nullif(attempts,0),2)', f: 'd2' },
    { key: 'tdpct', label: 'TD %', expr: 'round(passing_tds*100.0/nullif(attempts,0),1)', f: 'pct' },
    { key: 'intpct', label: 'INT %', expr: 'round(interceptions*100.0/nullif(attempts,0),1)', f: 'pct' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(passing_first_downs*100.0/nullif(attempts,0),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT', expr: 'round(passing_air_yards*1.0/nullif(attempts,0),1)', f: 'd1' },
    { key: 'epa', label: 'Pass EPA', expr: 'round(passing_epa,2)', f: 'd2' },
    { key: 'skpct', label: 'Sack %', expr: 'round(sacks*100.0/nullif(attempts+sacks,0),1)', f: 'pct' },
    { key: 'repa', label: 'Rush EPA', expr: 'round(rushing_epa,2)', f: 'd2' },
    { key: 'ppr', label: 'PPR Pts', expr: 'round(fantasy_points_ppr,1)', f: 'd1' },
  ]
  if (pos === 'RB') return [
    { key: 'ypc', label: 'Yards / Carry', expr: 'round(rushing_yards*1.0/nullif(carries,0),2)', f: 'd2' },
    { key: 'fdpc', label: '1st Down / Carry', expr: 'round(rushing_first_downs*1.0/nullif(carries,0),3)', f: 'd2' },
    { key: 'fdpct', label: 'Rush 1st Down %', expr: 'round(rushing_first_downs*100.0/nullif(carries,0),1)', f: 'pct' },
    { key: 'repa', label: 'Rush EPA', expr: 'round(rushing_epa,2)', f: 'd2' },
    { key: 'catch', label: 'Catch %', expr: 'round(receptions*100.0/nullif(targets,0),1)', f: 'pct' },
    { key: 'ypr', label: 'Yards / Rec', expr: 'round(receiving_yards*1.0/nullif(receptions,0),1)', f: 'd1' },
    { key: 'recepa', label: 'Rec EPA', expr: 'round(receiving_epa,2)', f: 'd2' },
    { key: 'touch', label: 'Touches', expr: 'carries+receptions', f: 'int' },
    { key: 'scrim', label: 'Scrimmage Yds', expr: 'rushing_yards+receiving_yards', f: 'int' },
    { key: 'ppr', label: 'PPR Pts', expr: 'round(fantasy_points_ppr,1)', f: 'd1' },
  ]
  return [
    { key: 'catch', label: 'Catch %', expr: 'round(receptions*100.0/nullif(targets,0),1)', f: 'pct' },
    { key: 'ypr', label: 'Yards / Rec', expr: 'round(receiving_yards*1.0/nullif(receptions,0),1)', f: 'd1' },
    { key: 'ypt', label: 'Yards / Tgt', expr: 'round(receiving_yards*1.0/nullif(targets,0),2)', f: 'd2' },
    { key: 'adot', label: 'aDOT', expr: 'round(receiving_air_yards*1.0/nullif(targets,0),1)', f: 'd1' },
    { key: 'yacr', label: 'YAC / Rec', expr: 'round(receiving_yards_after_catch*1.0/nullif(receptions,0),1)', f: 'd1' },
    { key: 'fdpct', label: '1st Down / Tgt %', expr: 'round(receiving_first_downs*100.0/nullif(targets,0),1)', f: 'pct' },
    { key: 'epa', label: 'Rec EPA', expr: 'round(receiving_epa,2)', f: 'd2' },
    { key: 'tdr', label: 'TD / Tgt %', expr: 'round(receiving_tds*100.0/nullif(targets,0),1)', f: 'pct' },
    { key: 'yacpct', label: 'YAC %', expr: 'round(receiving_yards_after_catch*100.0/nullif(receiving_yards,0),1)', f: 'pct' },
    { key: 'ppr', label: 'PPR Pts', expr: 'round(fantasy_points_ppr,1)', f: 'd1' },
  ]
}
/* ---- plays metric set (aggregated per split) ---- */
function playDefs(pos: Pos): M[] {
  const common = (volLabel: string): M[] => [
    { key: 'n', label: volLabel, expr: 'count(*)', f: 'int' },
    { key: 'yds', label: 'Yards', expr: pos === 'RB' ? 'sum(rushing_yards)' : pos === 'QB' ? 'sum(passing_yards)' : 'sum(receiving_yards)', f: 'int' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
    { key: 'sr', label: 'Success %', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'fd', label: '1st Downs', expr: 'sum(first_down)', f: 'int' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'td', label: 'TDs', expr: 'sum(touchdown)', f: 'int' },
  ]
  if (pos === 'RB') return [...common('Carries'),
    { key: 'ypc', label: 'Yards / Carry', expr: 'round(avg(rushing_yards),2)', f: 'd2' },
    { key: 'expl', label: 'Explosive (10+)', expr: 'count(*) FILTER(WHERE rushing_yards>=10)', f: 'int' },
    { key: 'stuff', label: 'Stuffed (≤0)', expr: 'count(*) FILTER(WHERE rushing_yards<=0)', f: 'int' },
  ]
  if (pos === 'QB') return [...common('Dropbacks'),
    { key: 'cmp', label: 'Completions', expr: 'sum(complete_pass)', f: 'int' },
    { key: 'adot', label: 'aDOT', expr: 'round(avg(air_yards),1)', f: 'd1' },
    { key: 'intc', label: 'INTs', expr: 'sum(interception)', f: 'int' },
  ]
  return [...common('Targets'),
    { key: 'rec', label: 'Receptions', expr: 'sum(complete_pass)', f: 'int' },
    { key: 'adot', label: 'aDOT', expr: 'round(avg(air_yards),1)', f: 'd1' },
    { key: 'yac', label: 'YAC', expr: 'sum(yards_after_catch)', f: 'int' },
  ]
}

function useWeekly(player: Player, defs: M[]) {
  const { slicers } = useSlicers()
  const sql = `SELECT season||'-W'||lpad(week::text,2,'0') AS cat, ${sel(defs)}
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season, week`
  return { q: useQuery<any>(sql, [sql]), slicers }
}
function useSplit(player: Player, catExpr: string, defs: M[], extra = '') {
  const { slicers } = useSlicers(); const pos = player.position as Pos
  const sql = `SELECT ${catExpr} AS cat, ${sel(defs)}
    FROM plays WHERE ${roleId(pos)}=${sq(player.gsis_id)} AND ${roleFilter(pos)} ${playsWhere(slicers)} ${extra}
    GROUP BY cat ORDER BY cat`
  return { q: useQuery<any>(sql, [sql]), slicers }
}

/* ===== Weekly report (prod or rate) ===== */
function Weekly({ player, kind }: { player: Player; kind: 'prod' | 'rate' }) {
  const pos = player.position as Pos
  const defs = kind === 'prod' ? pwProd(pos) : pwRate(pos)
  const { q, slicers } = useWeekly(player, defs)
  return (
    <MetricReport loading={q.loading}
      title={kind === 'prod' ? 'Weekly production' : 'Weekly efficiency & rates'}
      subtitle={`${player.name} · game by game · ${sliceLabel(slicers)}`}
      mini={{ rows: q.data ?? [], cols: miniCols('Game', defs), sort: { key: 'cat', dir: 'desc' }, caption: 'Every game in the slice' }}
      panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) }]} />
  )
}

/* ===== Down & Distance ===== */
function DownDist({ player }: { player: Player }) {
  const pos = player.position as Pos; const defs = playDefs(pos)
  const down = useSplit(player, `'Down '||down::int`, defs, 'AND down IS NOT NULL')
  const dist = useSplit(player, `CASE WHEN ydstogo<=3 THEN '1-3' WHEN ydstogo<=6 THEN '4-6' WHEN ydstogo<=9 THEN '7-9' WHEN ydstogo=10 THEN '10' ELSE '11+' END`, defs, 'AND down IS NOT NULL')
  const m6 = metrics(defs).slice(0, 6)
  return (
    <MetricReport loading={down.q.loading} title="Down & distance"
      subtitle={`${player.name} · ${sliceLabel(down.slicers)}`}
      mini={{ rows: down.q.data ?? [], cols: miniCols('Down', defs), caption: 'By down' }}
      panels={[
        { heading: 'By down', rows: down.q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) },
        { heading: 'By distance to go', rows: dist.q.data ?? [], categoryKey: 'cat', metrics: m6 },
      ]} />
  )
}

/* ===== Splits by a single dimension (score) ===== */
function Splits({ player, dim }: { player: Player; dim: 'score' }) {
  const pos = player.position as Pos; const defs = playDefs(pos)
  const expr = `CASE WHEN score_differential<=-17 THEN 'Lose 17+' WHEN score_differential<=-9 THEN 'Lose 9-16' WHEN score_differential<=-4 THEN 'Lose 4-8' WHEN score_differential<0 THEN 'Lose 1-3' WHEN score_differential=0 THEN 'Tied' WHEN score_differential<=3 THEN 'Win 1-3' WHEN score_differential<=8 THEN 'Win 4-8' WHEN score_differential<=16 THEN 'Win 9-16' ELSE 'Win 17+' END`
  const s = useSplit(player, expr, defs)
  return (
    <MetricReport loading={s.q.loading} title="Game-state splits"
      subtitle={`${player.name} · by score differential · ${sliceLabel(s.slicers)}`}
      mini={{ rows: s.q.data ?? [], cols: miniCols('Game state', defs), caption: 'By score state' }}
      panels={[{ rows: s.q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) }]} />
  )
}

/* ===== Pass depth & direction (or run direction for RB) ===== */
function Depth({ player }: { player: Player }) {
  const pos = player.position as Pos; const defs = playDefs(pos)
  if (pos === 'RB') {
    const dir = useSplit(player, `COALESCE(run_location,'?')`, defs)
    const gap = useSplit(player, `COALESCE(run_gap,'?')`, defs)
    const m6 = metrics(defs).slice(0, 6)
    return (
      <MetricReport loading={dir.q.loading} title="Run direction & gap"
        subtitle={`${player.name} · ${sliceLabel(dir.slicers)}`}
        mini={{ rows: dir.q.data ?? [], cols: miniCols('Direction', defs), caption: 'By run direction' }}
        panels={[
          { heading: 'By direction', rows: dir.q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) },
          { heading: 'By gap', rows: gap.q.data ?? [], categoryKey: 'cat', metrics: m6 },
        ]} />
    )
  }
  const depth = useSplit(player, `CASE WHEN air_yards<0 THEN 'Behind LOS' WHEN air_yards<=9 THEN 'Short' WHEN air_yards<=19 THEN 'Intermediate' ELSE 'Deep 20+' END`, defs, 'AND air_yards IS NOT NULL')
  const dir = useSplit(player, `COALESCE(pass_location,'?')`, defs)
  const m6 = metrics(defs).slice(0, 6)
  return (
    <MetricReport loading={depth.q.loading} title="Pass depth & direction"
      subtitle={`${player.name} · air-yards buckets and L/M/R · ${sliceLabel(depth.slicers)}`}
      mini={{ rows: depth.q.data ?? [], cols: miniCols('Depth', defs), caption: 'By target depth' }}
      panels={[
        { heading: 'By target depth', rows: depth.q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) },
        { heading: 'By direction (L/M/R)', rows: dir.q.data ?? [], categoryKey: 'cat', metrics: m6 },
      ]} />
  )
}

/* ===== Field & Quarter ===== */
function FieldQtr({ player }: { player: Player }) {
  const pos = player.position as Pos; const defs = playDefs(pos)
  const zone = useSplit(player, `CASE WHEN yardline_100<=20 THEN 'Red zone' WHEN yardline_100<=50 THEN 'Opp territory' WHEN yardline_100<=80 THEN 'Own territory' ELSE 'Backed up' END`, defs)
  const qtr = useSplit(player, `'Q'||qtr::int`, defs, 'AND qtr IS NOT NULL AND qtr<=4')
  const m6 = metrics(defs).slice(0, 6)
  return (
    <MetricReport loading={zone.q.loading} title="Field zone & quarter"
      subtitle={`${player.name} · ${sliceLabel(zone.slicers)}`}
      mini={{ rows: zone.q.data ?? [], cols: miniCols('Field zone', defs), caption: 'By field zone' }}
      panels={[
        { heading: 'By field zone', rows: zone.q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) },
        { heading: 'By quarter', rows: qtr.q.data ?? [], categoryKey: 'cat', metrics: m6 },
      ]} />
  )
}

/* ===== Fantasy ===== */
function Fantasy({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const defs: M[] = [
    { key: 'ppr', label: 'PPR Pts', expr: 'round(fantasy_points_ppr,1)', f: 'd1' },
    { key: 'std', label: 'Standard Pts', expr: 'round(fantasy_points,1)', f: 'd1' },
    { key: 'passpt', label: 'Passing Pts', expr: 'round(passing_yards*0.04+passing_tds*4-interceptions*2,1)', f: 'd1' },
    { key: 'rushpt', label: 'Rushing Pts', expr: 'round(rushing_yards*0.1+rushing_tds*6,1)', f: 'd1' },
    { key: 'recpt', label: 'Receiving Pts', expr: 'round(receiving_yards*0.1+receiving_tds*6+receptions,1)', f: 'd1' },
    { key: 'recpt0', label: 'Reception Pts', expr: 'receptions', f: 'int' },
    { key: 'tdtot', label: 'Total TD', expr: 'passing_tds+rushing_tds+receiving_tds', f: 'int' },
    { key: 'fdtot', label: 'Total 1st Downs', expr: 'COALESCE(passing_first_downs,0)+COALESCE(rushing_first_downs,0)+COALESCE(receiving_first_downs,0)', f: 'int' },
    { key: 'yds', label: 'Total Yds', expr: 'COALESCE(passing_yards,0)+COALESCE(rushing_yards,0)+COALESCE(receiving_yards,0)', f: 'int' },
    { key: 'touch', label: 'Touches', expr: 'COALESCE(carries,0)+COALESCE(receptions,0)', f: 'int' },
  ]
  const sql = `SELECT season||'-W'||lpad(week::text,2,'0') AS cat, ${sel(defs)}
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season, week`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-4">
      <FantasyBanner label={`Fantasy · ${player.name}`} headline="Every fantasy week, broken down."
        body="PPR and standard scoring with the component breakdown — passing, rushing, receiving, reception points, plus total first downs and touches. Recomputed against the current slice." />
      <MetricReport loading={q.loading}
        mini={{ rows: q.data ?? [], cols: miniCols('Game', defs), sort: { key: 'cat', dir: 'desc' }, caption: 'Weekly fantasy detail' }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metrics(defs) }]} />
    </div>
  )
}

/* ===== Report #2 — packed data table ===== */
function DataTab({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const sql = `SELECT season szn, week wk, opponent_team opp,
      completions::int cmp, attempts::int att, passing_yards::int py, passing_tds::int ptd, interceptions::int intc,
      passing_first_downs::int pfd, round(passing_epa,2) pepa, passing_air_yards::int pay,
      carries::int car, rushing_yards::int ry, rushing_tds::int rtd, rushing_first_downs::int rfd, round(rushing_epa,2) repa,
      targets::int tgt, receptions::int rec, receiving_yards::int recy, receiving_tds::int retd, receiving_first_downs::int recfd,
      round(receiving_air_yards*1.0/nullif(targets,0),1) adot, receiving_yards_after_catch::int yac,
      receiving_air_yards::int reay, round(receiving_yards_after_catch*100.0/nullif(receiving_yards,0),1) yacpct,
      round(receiving_epa,2) recepa, round(fantasy_points,1) std, round(fantasy_points_ppr,1) ppr
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season DESC, week DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'szn', label: 'Szn' }, { key: 'wk', label: 'Wk', numeric: true }, { key: 'opp', label: 'Opp' },
    { key: 'cmp', label: 'Cmp', numeric: true }, { key: 'att', label: 'Att', numeric: true }, { key: 'py', label: 'PaYd', numeric: true }, { key: 'ptd', label: 'PaTD', numeric: true }, { key: 'intc', label: 'INT', numeric: true }, { key: 'pfd', label: 'Pa1D', numeric: true }, { key: 'pepa', label: 'PaEPA', numeric: true, format: F.d2 }, { key: 'pay', label: 'AirY', numeric: true },
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'RuYd', numeric: true }, { key: 'rtd', label: 'RuTD', numeric: true }, { key: 'rfd', label: 'Ru1D', numeric: true }, { key: 'repa', label: 'RuEPA', numeric: true, format: F.d2 },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true }, { key: 'recy', label: 'ReYd', numeric: true }, { key: 'retd', label: 'ReTD', numeric: true }, { key: 'recfd', label: 'Re1D', numeric: true },
    { key: 'adot', label: 'aDOT', numeric: true, format: F.d1 }, { key: 'yac', label: 'YAC', numeric: true }, { key: 'reay', label: 'ReAirY', numeric: true }, { key: 'yacpct', label: 'YAC%', numeric: true, format: F.d1 }, { key: 'recepa', label: 'ReEPA', numeric: true, format: F.d2 },
    { key: 'std', label: 'STD', numeric: true, format: F.d1 }, { key: 'ppr', label: 'PPR', numeric: true, format: F.d1 },
  ]
  return (
    <Tile title="Everything — weekly, every metric" subtitle={`${player.name} · ${sliceLabel(slicers)} · scroll horizontally for all columns`} span={12}>
      <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'wk', dir: 'desc' }} dense />}</QueryState>
    </Tile>
  )
}
