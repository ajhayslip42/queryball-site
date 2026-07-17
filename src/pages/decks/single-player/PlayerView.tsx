/**
 * PlayerView — the Single-Player deck (all four positions).
 *
 * This file replaces the per-position views (QBView/RBView/WRView/TEView) with
 * a unified shell that shapes itself to the player's position at render time.
 *
 * Design goals from the iteration-10 spec:
 *   - Headshot header at the top of every report (from players.parquet).
 *   - Dense tables, more columns per row, tighter font (the "PowerBI feel").
 *   - Position-aware columns everywhere — no more one-size-fits-all Data Table.
 *   - Varied chart types: pies for run gap, quadrant heatmaps for QB, stacked
 *     bars for WR air-yards-plus-YAC, etc.
 *   - Zero EPA / WPA / WP / OE on the surface — the concepts stay in the
 *     reconstruction for advanced work but never make the visible metric list.
 *   - Down & Distance and Field & Quarter reports frame outputs as conversion
 *     rates, not raw counts, per the owner's "situational-frequency" thesis.
 */

import { useMemo } from 'react'
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'
import { useQuery } from '@/lib/useQuery'
import DataTable, { type Column } from '@/components/DataTable'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import {
  MetricReport, metricsOf, selOf, miniColsOf, F, autoType, type MDef, type Metric,
} from '@/components/deck/Panels'
import {
  BarTile, HBarTile, StackedBarTile, PieTile, TreemapTile, PctBarTile, QuadrantHeatmap, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'
import type { Player } from '@/lib/players'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
const sq = (s: string) => `'${s.replace(/'/g, "''")}'`
const roleId = (pos: Pos) => pos === 'QB' ? 'passer_player_id' : pos === 'RB' ? 'rusher_player_id' : 'receiver_player_id'
const roleFilter = (pos: Pos) => pos === 'QB' ? '(pass_attempt=1 OR sack=1)' : pos === 'RB' ? 'rush_attempt=1' : 'pass_attempt=1'

export function buildPlayerTabs(player: Player): DeckTab[] {
  return [
    { id: 'overview',  label: 'Overview',         render: () => <Overview player={player} /> },
    { id: 'data',      label: 'Data Table',       render: () => <DataTab player={player} /> },
    { id: 'weekly',    label: 'Weekly Production',render: () => <WeeklyProduction player={player} /> },
    { id: 'downdist',  label: 'Down & Distance',  render: () => <DownDist player={player} /> },
    { id: 'gamestate', label: 'Game State',       render: () => <GameState player={player} /> },
    { id: 'depthdir',  label: player.position === 'RB' ? 'Run Gap' : 'Pass Depth × Direction',
      render: () => <DepthDirection player={player} /> },
    { id: 'field',     label: 'Field & Quarter',  render: () => <FieldQtr player={player} /> },
    { id: 'fantasy',   label: 'Fantasy',          fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}
export const PLAYER_SLICERS = [
  'season','week','team','opponent','homeAway','down','distance','score','zone','qtr',
  'passDepth','runDir','pressure','shotgun','playType',
] as const

/* ============================================================================
 * Header block used at the top of every Overview.
 * ========================================================================== */
function PlayerHeader({ player, subtitle }: { player: Player; subtitle: string }) {
  return (
    <div className="rounded border border-line bg-paper p-3 flex items-center gap-4">
      {player.headshot ? (
        <img src={player.headshot} alt={player.name} className="w-16 h-16 rounded-full object-cover border border-line bg-cream flex-shrink-0" />
      ) : (
        <div className="w-16 h-16 rounded-full bg-cream flex items-center justify-center text-muted text-lg font-semibold flex-shrink-0">
          {player.name.split(' ').map(p => p[0]).join('').slice(0, 2)}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-xl tracking-tight text-ink truncate">{player.name}</h3>
        <p className="text-[11.5px] text-muted mt-0.5 truncate">
          <span className="font-mono">{player.position}</span> · {player.team ?? '—'} · {subtitle}
        </p>
      </div>
    </div>
  )
}

/* ============================================================================
 * Overview — one dense summary card + a position-shaped chart set.
 *
 *   QB → stacked TDs (pass+rush) by week, comp% line, pressure-response bar
 *   RB → carries+targets stacked by week, YPC bar, receiving pie
 *   WR → AY-completed + YAC + AY-incomplete stacked by week, catch% line
 *   TE → similar to WR but with in-line/flexed context in future
 * ========================================================================== */
function Overview({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const sql = `SELECT season, week,
      opponent_team opp,
      attempts::int att, completions::int cmp, passing_yards::int py, passing_tds::int ptd, interceptions::int intc, passing_first_downs::int pfd,
      carries::int car, rushing_yards::int ry, rushing_tds::int rtd, rushing_first_downs::int rfd,
      targets::int tgt, receptions::int rec, receiving_yards::int recy, receiving_tds::int retd, receiving_first_downs::int recfd,
      receiving_air_yards::int reay, receiving_air_yards_completed::int reay_c, receiving_air_yards_incomplete::int reay_i,
      receiving_yards_after_catch::int yac
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season, week`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []

  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      {q.loading || rows.length === 0 ? <Tile><QueryState loading={q.loading} rows={rows} /></Tile> : (
        <>
          {/* Position-specific summary strip */}
          <SummaryStrip player={player} rows={rows} />
          {/* Position-specific chart set */}
          {pos === 'QB' ? <QBOverviewCharts rows={rows} />
            : pos === 'RB' ? <RBOverviewCharts player={player} rows={rows} />
            : <WROverviewCharts rows={rows} />}
        </>
      )}
    </div>
  )
}

function SummaryStrip({ player, rows }: { player: Player; rows: any[] }) {
  const pos = player.position as Pos
  const acc = rows.reduce((s: any, r: any) => {
    (Object.keys(r) as string[]).forEach(k => { if (typeof r[k] === 'number') s[k] = (s[k] || 0) + r[k] })
    s.gp = (s.gp || 0) + 1
    return s
  }, {} as any)
  const stats: [string, string | number][] = pos === 'QB' ? [
    ['Games', acc.gp], ['Cmp/Att', `${acc.cmp}/${acc.att}`], ['Cmp %', pctOf(acc.cmp, acc.att)],
    ['Pass Yds', fmt.int(acc.py)], ['Pass TD', acc.ptd], ['INT', acc.intc], ['Pass 1D', acc.pfd],
    ['Y/A', divRound(acc.py, acc.att, 2)],
  ] : pos === 'RB' ? [
    ['Games', acc.gp], ['Carries', acc.car], ['Rush Yds', fmt.int(acc.ry)], ['Rush TD', acc.rtd],
    ['YPC', divRound(acc.ry, acc.car, 2)], ['Rush 1D', acc.rfd],
    ['Targets', acc.tgt], ['Rec', acc.rec], ['Rec Yds', fmt.int(acc.recy)], ['Opps', acc.car + acc.tgt],
  ] : [
    ['Games', acc.gp], ['Targets', acc.tgt], ['Rec', acc.rec],
    ['Catch %', pctOf(acc.rec, acc.tgt)], ['Rec Yds', fmt.int(acc.recy)], ['Rec TD', acc.retd],
    ['Rec 1D', acc.recfd], ['aDOT', divRound(acc.reay, acc.tgt, 1)],
    ['AirY (comp)', fmt.int(acc.reay_c)], ['AirY (inc)', fmt.int(acc.reay_i)],
    ['YAC', fmt.int(acc.yac)], ['YAC %', pctOf(acc.yac, acc.recy)],
  ]
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="eyebrow mb-2">Summary — current slice</p>
      <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {stats.map(([k, v]) => (
          <div key={String(k)} className="rounded bg-cream px-2 py-1.5">
            <p className="text-[9.5px] text-muted uppercase tracking-wider">{k}</p>
            <p className="text-[13px] font-semibold text-ink num">{String(v)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function QBOverviewCharts({ rows }: { rows: any[] }) {
  const weekly = rows.map(r => ({
    name: `W${r.week}`,
    Pass: r.ptd || 0, Rush: r.rtd || 0,
  }))
  const compPct = rows.map(r => ({ name: `W${r.week}`, value: r.att ? Math.round((r.cmp / r.att) * 1000) / 10 : 0 }))
  const yardsBar = rows.map(r => ({ name: `W${r.week}`, value: r.py }))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Touchdowns by week (Pass vs Rush)</p>
        <StackedBarTile data={weekly} height={180} xKey="name" series={[{ key: 'Pass', label: 'Pass', color: PALETTE.accent }, { key: 'Rush', label: 'Rush', color: PALETTE.accent2 }]} />
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Pass yards by week</p>
        <BarTile data={yardsBar} height={180} color={PALETTE.accent} formatY={v => fmt.int(v)} />
      </div>
      <div className="rounded border border-line bg-paper p-3 lg:col-span-2">
        <p className="eyebrow mb-2">Completion % by week</p>
        <BarTile data={compPct} height={140} color={PALETTE.cool} formatY={v => `${v}%`} />
      </div>
    </div>
  )
}
function RBOverviewCharts({ player, rows }: { player: Player; rows: any[] }) {
  // Weekly touches (carries + targets stacked)
  const touchStack = rows.map(r => ({ name: `W${r.week}`, Carries: r.car || 0, Targets: r.tgt || 0 }))
  // Weekly YPC line-style bar
  const ypc = rows.map(r => ({ name: `W${r.week}`, value: r.car ? Math.round(r.ry / r.car * 100) / 100 : 0 }))
  // Rush gap distribution — plays-based query for the full season slice
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Weekly touches (Carries + Targets)</p>
        <StackedBarTile data={touchStack} height={180} xKey="name" series={[{ key: 'Carries', label: 'Carries', color: PALETTE.accent }, { key: 'Targets', label: 'Targets', color: PALETTE.ok }]} />
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Yards / carry by week</p>
        <BarTile data={ypc} height={180} color={PALETTE.accent2} formatY={v => v.toFixed(2)} />
      </div>
      <RBGapDistribution player={player} />
    </div>
  )
}
function RBGapDistribution({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const sql = `SELECT
      CASE
        WHEN run_location='left' AND run_gap='end' THEN 'L End'
        WHEN run_location='left' AND run_gap='tackle' THEN 'L Tackle'
        WHEN run_location='left' AND run_gap='guard' THEN 'L Guard'
        WHEN run_location='middle' THEN 'Middle'
        WHEN run_location='right' AND run_gap='guard' THEN 'R Guard'
        WHEN run_location='right' AND run_gap='tackle' THEN 'R Tackle'
        WHEN run_location='right' AND run_gap='end' THEN 'R End'
        ELSE 'Other'
      END gap,
      count(*)::int carries, sum(rushing_yards)::int yds,
      round(avg(rushing_yards),2) ypc
    FROM plays WHERE rusher_player_id=${sq(player.gsis_id)} AND rush_attempt=1 ${playsWhere(slicers)}
    GROUP BY gap ORDER BY carries DESC`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  return (
    <div className="rounded border border-line bg-paper p-3 lg:col-span-2">
      <p className="eyebrow mb-2">Carries by gap (7-bucket)</p>
      {q.loading ? <div className="h-40 flex items-center justify-center text-[11px] text-muted">Loading…</div> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <TreemapTile data={rows.map(r => ({ name: r.gap, value: r.carries }))} height={200} />
          <div className="space-y-1">
            {rows.map((r: any, i: number) => (
              <div key={r.gap} className="flex items-center justify-between text-[12px] py-1 border-b border-line last:border-0">
                <span className="text-ink">{r.gap}</span>
                <span className="num text-muted text-[11px]">{r.carries} car · {r.ypc} YPC · {fmt.int(r.yds)} yds</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
function WROverviewCharts({ rows }: { rows: any[] }) {
  // Stacked bar: AY (completed) + YAC + AY (incomplete). Owner's specific ask.
  const stack = rows.map(r => ({
    name: `W${r.week}`,
    'AY (comp)': r.reay_c || 0,
    'YAC': r.yac || 0,
    'AY (inc)': r.reay_i || 0,
  }))
  const catchPct = rows.map(r => ({ name: `W${r.week}`, value: r.tgt ? Math.round((r.rec / r.tgt) * 1000) / 10 : 0 }))
  const targets = rows.map(r => ({ name: `W${r.week}`, value: r.tgt }))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded border border-line bg-paper p-3 lg:col-span-2">
        <p className="eyebrow mb-2">Weekly production: Air Yards (completed) + YAC + Air Yards (incomplete)</p>
        <p className="text-[10.5px] text-muted mb-2 leading-snug">
          "AY (inc)" is the "what could have been" bucket — air yards on targets that didn't come down.
        </p>
        <StackedBarTile data={stack} height={200} xKey="name"
          series={[{ key: 'AY (comp)', label: 'AY (comp)', color: PALETTE.accent }, { key: 'YAC', label: 'YAC', color: PALETTE.ok }, { key: 'AY (inc)', label: 'AY (inc)', color: PALETTE.bad }]} />
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Targets by week</p>
        <BarTile data={targets} height={150} color={PALETTE.accent2} />
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Catch % by week</p>
        <BarTile data={catchPct} height={150} color={PALETTE.cool} formatY={v => `${v}%`} />
      </div>
    </div>
  )
}
function pctOf(a: number, b: number) { return b ? `${((a / b) * 100).toFixed(1)}%` : '—' }
function divRound(a: number, b: number, d: number) { return b ? (a / b).toFixed(d) : '—' }

/* ============================================================================
 * Data Table — position-aware columns, tight zebra table.
 * ========================================================================== */
function DataTab({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const sql = `SELECT season szn, week wk, opponent_team opp,
      attempts::int att, completions::int cmp, passing_yards::int py, passing_tds::int ptd, interceptions::int intc, passing_first_downs::int pfd, passing_air_yards::int pay,
      carries::int car, rushing_yards::int ry, rushing_tds::int rtd, rushing_first_downs::int rfd,
      targets::int tgt, receptions::int rec, receiving_yards::int recy, receiving_tds::int retd, receiving_first_downs::int recfd,
      receiving_air_yards::int reay, receiving_air_yards_completed::int reay_c, receiving_air_yards_incomplete::int reay_i,
      receiving_yards_after_catch::int yac,
      round(receiving_air_yards*1.0/nullif(targets,0),1) adot,
      round(receiving_yards_after_catch*100.0/nullif(receiving_yards,0),1) yacpct,
      round(passing_yards*1.0/nullif(attempts,0),2) ypa,
      round(rushing_yards*1.0/nullif(carries,0),2) ypc,
      round(receptions*100.0/nullif(targets,0),1) catchpct,
      (passing_tds+rushing_tds+receiving_tds)::int totd,
      (passing_yards+rushing_yards+receiving_yards)::int totyd,
      round(fantasy_points_ppr,1) ppr
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season DESC, week DESC`
  const q = useQuery<any>(sql, [sql])
  const cols = dataTableColumnsFor(pos)
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={`${sliceLabel(slicers)} · every game, every column`} />
      <div className="rounded border border-line bg-paper p-2 overflow-x-auto">
        <QueryState q={q} height={460}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'wk', dir: 'desc' }} tight zebra />
        )}</QueryState>
      </div>
    </div>
  )
}
function dataTableColumnsFor(pos: Pos): Column<any>[] {
  const base: Column<any>[] = [
    { key: 'szn', label: 'Szn' }, { key: 'wk', label: 'Wk', numeric: true }, { key: 'opp', label: 'Opp' },
  ]
  if (pos === 'QB') return [
    ...base,
    { key: 'cmp', label: 'Cmp', numeric: true }, { key: 'att', label: 'Att', numeric: true },
    { key: 'py', label: 'Pa Yds', numeric: true }, { key: 'ptd', label: 'Pa TD', numeric: true },
    { key: 'intc', label: 'INT', numeric: true }, { key: 'pfd', label: 'Pa 1D', numeric: true },
    { key: 'ypa', label: 'Y/A', numeric: true, format: F.d2 },
    { key: 'pay', label: 'AirY', numeric: true },
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'Ru Yds', numeric: true },
    { key: 'rtd', label: 'Ru TD', numeric: true },
    { key: 'totd', label: 'Tot TD', numeric: true }, { key: 'totyd', label: 'Tot Yds', numeric: true },
    { key: 'ppr', label: 'PPR', numeric: true, format: F.d1 },
  ]
  if (pos === 'RB') return [
    ...base,
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'Ru Yds', numeric: true },
    { key: 'ypc', label: 'YPC', numeric: true, format: F.d2 },
    { key: 'rtd', label: 'Ru TD', numeric: true }, { key: 'rfd', label: 'Ru 1D', numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
    { key: 'recy', label: 'Re Yds', numeric: true }, { key: 'retd', label: 'Re TD', numeric: true },
    { key: 'recfd', label: 'Re 1D', numeric: true },
    { key: 'yac', label: 'YAC', numeric: true },
    { key: 'catchpct', label: 'Catch%', numeric: true, format: F.pct },
    { key: 'totd', label: 'Tot TD', numeric: true }, { key: 'totyd', label: 'Tot Yds', numeric: true },
    { key: 'ppr', label: 'PPR', numeric: true, format: F.d1 },
  ]
  return [
    ...base,
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
    { key: 'recy', label: 'Re Yds', numeric: true }, { key: 'retd', label: 'Re TD', numeric: true },
    { key: 'recfd', label: 'Re 1D', numeric: true },
    { key: 'reay', label: 'AirY', numeric: true },
    { key: 'reay_c', label: 'AirY (c)', numeric: true },
    { key: 'reay_i', label: 'AirY (i)', numeric: true },
    { key: 'yac', label: 'YAC', numeric: true },
    { key: 'adot', label: 'aDOT', numeric: true, format: F.d1 },
    { key: 'catchpct', label: 'Catch%', numeric: true, format: F.pct },
    { key: 'yacpct', label: 'YAC%', numeric: true, format: F.pct },
    { key: 'totd', label: 'Tot TD', numeric: true },
    { key: 'ppr', label: 'PPR', numeric: true, format: F.d1 },
  ]
}

/* ============================================================================
 * Weekly Production — the wall-of-charts version, one metric per tile.
 * ========================================================================== */
function WeeklyProduction({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const defs = pwProd(pos)
  const sql = `SELECT season||'-W'||lpad(week::text,2,'0') AS cat, ${selOf(defs)}
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season, week`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <MetricReport loading={q.loading} title="Weekly production"
        subtitle="Every metric, every game — no EPA, no fantasy points here"
        mini={{ rows: q.data ?? [], cols: miniColsOf('Game', defs), sort: { key: 'cat', dir: 'desc' }, caption: 'Sortable by any column', tight: true }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
    </div>
  )
}
function pwProd(pos: Pos): MDef[] {
  if (pos === 'QB') return [
    { key: 'py', label: 'Pass Yds', expr: 'passing_yards', f: 'int' },
    { key: 'att', label: 'Attempts', expr: 'attempts', f: 'int' },
    { key: 'cmp', label: 'Completions', expr: 'completions', f: 'int' },
    { key: 'ptd', label: 'Pass TD', expr: 'passing_tds', f: 'int' },
    { key: 'intc', label: 'INT', expr: 'interceptions', f: 'int' },
    { key: 'pfd', label: 'Pass 1st Downs', expr: 'passing_first_downs', f: 'int' },
    { key: 'ay', label: 'Air Yards', expr: 'passing_air_yards', f: 'int' },
    { key: 'ry', label: 'Rush Yds', expr: 'rushing_yards', f: 'int' },
    { key: 'rtd', label: 'Rush TD', expr: 'rushing_tds', f: 'int' },
    { key: 'totyd', label: 'Total Yds', expr: 'passing_yards+rushing_yards', f: 'int' },
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
    { key: 'opps', label: 'Opportunities', expr: 'opportunities', f: 'int' },
    { key: 'scrim', label: 'Scrimmage Yds', expr: 'rushing_yards+receiving_yards', f: 'int' },
  ]
  return [
    { key: 'tgt', label: 'Targets', expr: 'targets', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'receptions', f: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'receiving_yards', f: 'int' },
    { key: 'rtd', label: 'Rec TD', expr: 'receiving_tds', f: 'int' },
    { key: 'fd', label: 'Rec 1st Downs', expr: 'receiving_first_downs', f: 'int' },
    { key: 'reay', label: 'Air Yards', expr: 'receiving_air_yards', f: 'int' },
    { key: 'reay_c', label: 'AY (comp)', expr: 'receiving_air_yards_completed', f: 'int' },
    { key: 'reay_i', label: 'AY (inc)', expr: 'receiving_air_yards_incomplete', f: 'int' },
    { key: 'yac', label: 'YAC', expr: 'receiving_yards_after_catch', f: 'int' },
    { key: 'totyd', label: 'Total Yds', expr: 'receiving_yards+COALESCE(rushing_yards,0)', f: 'int' },
  ]
}

/* ============================================================================
 * Down & Distance — situational-outcome-first.
 *   Conversion% is the headline read. Raw output is secondary.
 * ========================================================================== */
function DownDist({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const defs = playSituationalDefs(pos)
  const down = useSplit(player, `'Down '||down::int`, defs, 'AND down IS NOT NULL')
  const dist = useSplit(player, `CASE WHEN ydstogo<=3 THEN '1-3' WHEN ydstogo<=6 THEN '4-6' WHEN ydstogo<=9 THEN '7-9' WHEN ydstogo=10 THEN '10' ELSE '11+' END`, defs, 'AND down IS NOT NULL')
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <MetricReport loading={down.q.loading} title="Down & distance — conversion first"
        subtitle={`${player.name} · outcomes framed as rates, not raw counts`}
        mini={{ rows: down.q.data ?? [], cols: miniColsOf('Down', defs), caption: 'By down', tight: true }}
        panels={[
          { heading: 'By down', rows: down.q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) },
          { heading: 'By yards to go', rows: dist.q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs).slice(0, 6) },
        ]} />
    </div>
  )
}

function GameState({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const defs = playSituationalDefs(pos)
  const expr = `CASE WHEN score_differential<=-9 THEN 'Losing 9+' WHEN score_differential<=-1 THEN 'Losing 1-8' WHEN score_differential=0 THEN 'Tied' WHEN score_differential<=8 THEN 'Winning 1-8' ELSE 'Winning 9+' END`
  const s = useSplit(player, expr, defs)
  const qtr = useSplit(player, `'Q'||qtr::int`, defs, 'AND qtr IS NOT NULL AND qtr<=4')
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <MetricReport loading={s.q.loading} title="Game state"
        subtitle="Scoreboard shapes usage more than most realize"
        mini={{ rows: s.q.data ?? [], cols: miniColsOf('State', defs), caption: 'By score state', tight: true }}
        panels={[
          { heading: 'By score state', rows: s.q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) },
          { heading: 'By quarter', rows: qtr.q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs).slice(0, 6) },
        ]} />
    </div>
  )
}

/* ============================================================================
 * Depth × Direction — the position-specific chart the owner asked for.
 *   QB → quadrant heatmap of comp% by pass_location × depth bucket.
 *   RB → 7-bucket run-gap pie / small-multiples grid of YPC.
 *   WR/TE → depth-bucket bar of targets + a direction table.
 * ========================================================================== */
function DepthDirection({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  if (pos === 'QB') return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <QBQuadrantReport player={player} />
    </div>
  )
  if (pos === 'RB') return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <RBRunGapReport player={player} />
    </div>
  )
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <WRDepthReport player={player} />
    </div>
  )
}

function QBQuadrantReport({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const sql = `SELECT
      COALESCE(pass_location,'?') dir,
      CASE
        WHEN air_yards <= 0 THEN 'Behind LOS'
        WHEN air_yards <= 5 THEN '1-5'
        WHEN air_yards <= 10 THEN '6-10'
        WHEN air_yards <= 15 THEN '11-15'
        WHEN air_yards <= 25 THEN '16-25'
        ELSE '26+'
      END depth,
      count(*)::int att, sum(complete_pass)::int cmp,
      round(sum(complete_pass)*100.0/count(*),1) comp_pct,
      round(sum(passing_yards)*1.0/count(*),2) ypa,
      sum(passing_yards)::int yds, sum(passing_tds)::int td
    FROM plays WHERE passer_player_id=${sq(player.gsis_id)} AND pass_attempt=1
      AND air_yards IS NOT NULL AND pass_location IS NOT NULL ${playsWhere(slicers)}
    GROUP BY dir, depth`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  const DIRS = ['left', 'middle', 'right']
  const DEPTHS = ['Behind LOS', '1-5', '6-10', '11-15', '16-25', '26+']
  const cellVal = (r: number, c: number, field: 'comp_pct' | 'att' | 'ypa' | 'td') => {
    const rec = rows.find((x: any) => x.dir === DIRS[r] && x.depth === DEPTHS[c])
    return rec ? rec[field] : null
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="rounded border border-line bg-paper p-3 lg:col-span-2">
        <p className="eyebrow mb-2">Completion % by pass direction × depth</p>
        {q.loading ? <div className="h-40 flex items-center justify-center text-[11px] text-muted">Loading…</div> : (
          <QuadrantHeatmap rows={DIRS.map(d => d[0].toUpperCase() + d.slice(1))}
            cols={DEPTHS} cells={[0,1,2].map(ri => DEPTHS.map((_, ci) => cellVal(ri, ci, 'comp_pct')))}
            height={200} formatCell={v => v == null ? '—' : `${v}%`} />
        )}
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Attempts by direction × depth</p>
        {q.loading ? <div className="h-40 flex items-center justify-center text-[11px] text-muted">Loading…</div> : (
          <QuadrantHeatmap rows={DIRS.map(d => d[0].toUpperCase() + d.slice(1))}
            cols={DEPTHS} cells={[0,1,2].map(ri => DEPTHS.map((_, ci) => cellVal(ri, ci, 'att')))}
            height={200} />
        )}
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Yards / Attempt by direction × depth</p>
        {q.loading ? <div className="h-40 flex items-center justify-center text-[11px] text-muted">Loading…</div> : (
          <QuadrantHeatmap rows={DIRS.map(d => d[0].toUpperCase() + d.slice(1))}
            cols={DEPTHS} cells={[0,1,2].map(ri => DEPTHS.map((_, ci) => cellVal(ri, ci, 'ypa')))}
            height={200} formatCell={v => v == null ? '—' : v.toFixed(1)} />
        )}
      </div>
    </div>
  )
}
function RBRunGapReport({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const sql = `SELECT
      CASE
        WHEN run_location='left' AND run_gap='end' THEN 'L End'
        WHEN run_location='left' AND run_gap='tackle' THEN 'L Tackle'
        WHEN run_location='left' AND run_gap='guard' THEN 'L Guard'
        WHEN run_location='middle' THEN 'Middle'
        WHEN run_location='right' AND run_gap='guard' THEN 'R Guard'
        WHEN run_location='right' AND run_gap='tackle' THEN 'R Tackle'
        WHEN run_location='right' AND run_gap='end' THEN 'R End'
        ELSE 'Other'
      END gap,
      count(*)::int carries, sum(rushing_yards)::int yds,
      round(avg(rushing_yards),2) ypc, sum(rush_touchdown)::int td,
      sum(first_down)::int fds,
      round(sum(first_down)*100.0/count(*),1) fd_pct
    FROM plays WHERE rusher_player_id=${sq(player.gsis_id)} AND rush_attempt=1 ${playsWhere(slicers)}
    GROUP BY gap`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Carries distribution by gap</p>
          {q.loading ? <div className="h-40 flex items-center justify-center text-[11px] text-muted">Loading…</div>
            : <PieTile data={rows.map((r: any) => ({ name: r.gap, value: r.carries }))} height={220} />}
        </div>
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Yards / carry by gap</p>
          {q.loading ? <div className="h-40 flex items-center justify-center text-[11px] text-muted">Loading…</div>
            : <HBarTile data={rows.map((r: any) => ({ name: r.gap, value: r.ypc })).sort((a: any, b: any) => b.value - a.value)}
                height={22 * rows.length + 20} color={PALETTE.accent2} formatX={v => v.toFixed(2)} />}
        </div>
      </div>
      <div className="rounded border border-line bg-paper p-3 overflow-x-auto">
        <p className="eyebrow mb-2">Full gap breakdown</p>
        <QueryState q={q} height={200}>{rows => (
          <DataTable rows={rows} columns={[
            { key: 'gap', label: 'Gap' },
            { key: 'carries', label: 'Car', numeric: true },
            { key: 'yds', label: 'Yds', numeric: true },
            { key: 'ypc', label: 'YPC', numeric: true, format: F.d2 },
            { key: 'td', label: 'TD', numeric: true },
            { key: 'fds', label: '1D', numeric: true },
            { key: 'fd_pct', label: '1D%', numeric: true, format: F.pct },
          ]} defaultSort={{ key: 'carries', dir: 'desc' }} tight zebra />
        )}</QueryState>
      </div>
    </div>
  )
}
function WRDepthReport({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const sql = `SELECT
      CASE WHEN air_yards<=0 THEN 'Behind LOS' WHEN air_yards<=5 THEN '1-5' WHEN air_yards<=10 THEN '6-10'
           WHEN air_yards<=15 THEN '11-15' WHEN air_yards<=25 THEN '16-25' ELSE '26+' END depth,
      COALESCE(pass_location,'?') dir,
      count(*)::int tgts, sum(complete_pass)::int rec,
      round(sum(complete_pass)*100.0/count(*),1) catch_pct,
      sum(receiving_yards)::int yds, sum(receiving_yards)::int yds2,
      sum(air_yards)::int ay, sum(yards_after_catch)::int yac,
      sum(first_down)::int fds
    FROM plays WHERE receiver_player_id=${sq(player.gsis_id)} AND pass_attempt=1
      AND air_yards IS NOT NULL ${playsWhere(slicers)}
    GROUP BY depth, dir`
  const q = useQuery<any>(sql, [sql])
  const rows = q.data ?? []
  const depthAgg = ['Behind LOS','1-5','6-10','11-15','16-25','26+'].map(d => {
    const inD = rows.filter((r: any) => r.depth === d)
    const tgts = inD.reduce((s: number, r: any) => s + r.tgts, 0)
    const rec = inD.reduce((s: number, r: any) => s + r.rec, 0)
    const yds = inD.reduce((s: number, r: any) => s + r.yds, 0)
    return { name: d, targets: tgts, receptions: rec, yards: yds, catch_pct: tgts ? Math.round(rec / tgts * 1000) / 10 : 0 }
  }).filter(x => x.targets > 0)
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Targets by depth bucket</p>
          <BarTile data={depthAgg.map(x => ({ name: x.name, value: x.targets }))} height={200} color={PALETTE.accent} />
        </div>
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Catch % by depth</p>
          <HBarTile data={depthAgg.map(x => ({ name: x.name, value: x.catch_pct }))}
            height={200} color={PALETTE.cool} formatX={v => `${v}%`} />
        </div>
      </div>
      <div className="rounded border border-line bg-paper p-3 overflow-x-auto">
        <p className="eyebrow mb-2">Full depth × direction table</p>
        <QueryState q={q} height={280}>{rows => (
          <DataTable rows={rows} columns={[
            { key: 'depth', label: 'Depth' }, { key: 'dir', label: 'Dir' },
            { key: 'tgts', label: 'Tgt', numeric: true },
            { key: 'rec', label: 'Rec', numeric: true },
            { key: 'catch_pct', label: 'Catch%', numeric: true, format: F.pct },
            { key: 'yds', label: 'Yds', numeric: true },
            { key: 'ay', label: 'AirY', numeric: true },
            { key: 'yac', label: 'YAC', numeric: true },
            { key: 'fds', label: '1D', numeric: true },
          ]} defaultSort={{ key: 'tgts', dir: 'desc' }} tight zebra />
        )}</QueryState>
      </div>
    </div>
  )
}

/* ============================================================================
 * Field & Quarter — conversion frames + volume.
 * ========================================================================== */
function FieldQtr({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const defs = playSituationalDefs(pos)
  const zone = useSplit(player, `CASE WHEN yardline_100<=5 THEN 'Goal Line' WHEN yardline_100<=20 THEN 'Red Zone' WHEN yardline_100<=50 THEN 'Opp Territory' WHEN yardline_100<=80 THEN 'Own Territory' ELSE 'Backed Up' END`, defs)
  const qtr = useSplit(player, `'Q'||qtr::int`, defs, 'AND qtr IS NOT NULL AND qtr<=4')
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <MetricReport loading={zone.q.loading} title="Field zone & quarter"
        subtitle={`${player.name} · usage often looks completely different in the red zone`}
        mini={{ rows: zone.q.data ?? [], cols: miniColsOf('Field zone', defs), caption: 'By field zone', tight: true }}
        panels={[
          { heading: 'By field zone', rows: zone.q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) },
          { heading: 'By quarter', rows: qtr.q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs).slice(0, 6) },
        ]} />
    </div>
  )
}

/* ============================================================================
 * Situational metric defs (conversion first). Same for all positions —
 * asks the plays table, not the game log.
 * ========================================================================== */
function playSituationalDefs(pos: Pos): MDef[] {
  const common: MDef[] = [
    { key: 'plays', label: 'Plays', expr: 'count(*)', f: 'int' },
    { key: 'yds', label: 'Yards', expr: 'sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0))', f: 'int' },
    { key: 'ypp', label: 'Yds / Play', expr: 'round(sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0))*1.0/count(*),2)', f: 'd2' },
    { key: 'fd', label: '1st Downs', expr: 'sum(first_down)', f: 'int' },
    { key: 'fd_pct', label: '1D / Play %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'td', label: 'TDs', expr: 'sum(pass_touchdown)+sum(rush_touchdown)', f: 'int' },
  ]
  if (pos === 'QB') return [
    ...common,
    { key: 'cmp_pct', label: 'Comp %', expr: 'round(sum(complete_pass)*100.0/count(*),1)', f: 'pct' },
    { key: 'ay', label: 'Air Yds', expr: 'sum(air_yards)', f: 'int' },
    { key: 'sk', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
    { key: 'intc', label: 'INT', expr: 'sum(interception)', f: 'int' },
  ]
  if (pos === 'RB') return [
    ...common,
    { key: 'stuff', label: 'Stuff % (≤0)', expr: 'round(count(*) FILTER(WHERE rushing_yards<=0)*100.0/count(*),1)', f: 'pct' },
    { key: 'expl', label: 'Explosive (10+)', expr: 'count(*) FILTER(WHERE rushing_yards>=10)', f: 'int' },
    { key: 'ypc', label: 'YPC', expr: 'round(avg(rushing_yards),2)', f: 'd2' },
  ]
  return [
    ...common,
    { key: 'cmp_pct', label: 'Catch %', expr: 'round(sum(complete_pass)*100.0/count(*),1)', f: 'pct' },
    { key: 'ay', label: 'AY', expr: 'sum(air_yards)', f: 'int' },
    { key: 'yac', label: 'YAC', expr: 'sum(yards_after_catch)', f: 'int' },
  ]
}
function useSplit(player: Player, catExpr: string, defs: MDef[], extra = '') {
  const { slicers } = useSlicers(); const pos = player.position as Pos
  const sql = `SELECT ${catExpr} AS cat, ${selOf(defs)}
    FROM plays WHERE ${roleId(pos)}=${sq(player.gsis_id)} AND ${roleFilter(pos)} ${playsWhere(slicers)} ${extra}
    GROUP BY cat ORDER BY cat`
  return { q: useQuery<any>(sql, [sql]), slicers }
}

/* ============================================================================
 * Fantasy — the ONLY place fantasy_points appears on Single Player.
 * ========================================================================== */
function Fantasy({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const defs: MDef[] = [
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
  const sql = `SELECT season||'-W'||lpad(week::text,2,'0') AS cat, ${selOf(defs)}
    FROM ${playerGameLog(slicers, { playerId: player.gsis_id })} g ORDER BY season, week`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-3">
      <PlayerHeader player={player} subtitle={sliceLabel(slicers)} />
      <FantasyBanner label={`Fantasy · ${player.name}`} headline="Every fantasy week, broken down."
        body="PPR and standard scoring with the component breakdown — passing, rushing, receiving, reception points, plus total first downs and touches. Recomputed against the current slice." />
      <MetricReport loading={q.loading}
        mini={{ rows: q.data ?? [], cols: miniColsOf('Game', defs), sort: { key: 'cat', dir: 'desc' }, caption: 'Weekly fantasy detail', tight: true }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
    </div>
  )
}
