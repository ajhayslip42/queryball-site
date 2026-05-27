/**
 * PlayerView — generic, position-aware Single Player view on REAL data.
 *
 * The four position files (QBView/RBView/WRView/TEView) delegate here. Tabs and
 * stat columns adapt to the player's position. Everything is queried live from
 * player_week (weekly tidy stats) and plays (situational), filtered by the
 * selected player and the slicer rail.
 */

import { type DeckTab, Tile, Grid, StatBlock } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, LineTile, PALETTE } from '@/components/charts/Charts'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playerWeekWhere, playsWhere, sliceLabel } from '@/lib/slicerSql'
import { fmt } from '@/lib/nfl'
import type { Player } from '@/lib/players'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
const sq = (s: string) => `'${s.replace(/'/g, "''")}'`

export function buildPlayerTabs(player: Player): DeckTab[] {
  return [
    { id: 'overview', label: 'Overview',          render: () => <Overview player={player} /> },
    { id: 'weekly',   label: 'Week by Week',       render: () => <Weekly player={player} /> },
    { id: 'splits',   label: 'Game-State Splits',  render: () => <Splits player={player} /> },
    { id: 'fantasy',  label: 'Fantasy Production', fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}

export const PLAYER_SLICERS = [
  'season', 'week', 'team', 'opponent', 'homeAway',
  'down', 'distance', 'score', 'zone', 'qtr', 'shotgun', 'playType', 'garbage',
] as const

/* The plays-table id column for this player's primary role. */
function roleIdCol(pos: Pos): string {
  if (pos === 'QB') return 'passer_player_id'
  if (pos === 'RB') return 'rusher_player_id'
  return 'receiver_player_id'
}

/* ============================================================ Overview */
function Overview({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const where = playerWeekWhere(slicers)
  const sql = `
    SELECT count(*) g,
      sum(passing_yards)::int pass_yds, sum(passing_tds)::int pass_td, sum(interceptions)::int picks,
      sum(completions)::int cmp, sum(attempts)::int att,
      sum(carries)::int car, sum(rushing_yards)::int rush_yds, sum(rushing_tds)::int rush_td,
      sum(targets)::int tgt, sum(receptions)::int rec, sum(receiving_yards)::int rec_yds,
      sum(receiving_tds)::int rec_td, round(avg(fantasy_points_ppr),1) ppg
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}`
  const q = useQuery<any>(sql, [sql])

  const wkSql = `
    SELECT season||'-W'||lpad(week::text,2,'0') name,
      ${pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'}::int value
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}
    ORDER BY season, week`
  const wk = useQuery<{ name: string; value: number }>(wkSql, [wkSql])

  const blocks = (r: any) => {
    if (pos === 'QB') return [
      ['Games', r.g], ['Pass yds', fmt.int(r.pass_yds)], ['Pass TD', r.pass_td],
      ['INT', r.picks], ['Comp%', `${fmt.num(r.cmp * 100 / Math.max(r.att, 1), 1)}%`], ['PPR/G', fmt.num(r.ppg, 1)],
    ]
    if (pos === 'RB') return [
      ['Games', r.g], ['Carries', r.car], ['Rush yds', fmt.int(r.rush_yds)],
      ['YPC', fmt.num(r.rush_yds / Math.max(r.car, 1), 1)], ['Rec', r.rec], ['PPR/G', fmt.num(r.ppg, 1)],
    ]
    return [
      ['Games', r.g], ['Targets', r.tgt], ['Rec', r.rec], ['Rec yds', fmt.int(r.rec_yds)],
      ['Rec TD', r.rec_td], ['PPR/G', fmt.num(r.ppg, 1)],
    ]
  }
  const ydLabel = pos === 'QB' ? 'Passing yards' : pos === 'RB' ? 'Rushing yards' : 'Receiving yards'

  return (
    <div className="space-y-4">
      <QueryState q={q} height={120}>{rows => (
        <Grid>{blocks(rows[0]).map(([l, v]) => (
          <StatBlock key={String(l)} label={String(l)} value={v as any} sub={sliceLabel(slicers)} />
        ))}</Grid>
      )}</QueryState>
      <Tile title={`${ydLabel} by game`} subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={wk} height={300}>{rows => (
          <BarTile data={rows} height={300} color={PALETTE.accent} formatY={v => fmt.int(v)} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================ Weekly */
function Weekly({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const where = playerWeekWhere(slicers)
  const sql = `
    SELECT season, week, opponent_team opp,
      completions::int cmp, attempts::int att, passing_yards::int pass_yds, passing_tds::int pass_td,
      carries::int car, rushing_yards::int rush_yds, rushing_tds::int rush_td,
      targets::int tgt, receptions::int rec, receiving_yards::int rec_yds, receiving_tds::int rec_td,
      round(fantasy_points_ppr,1) ppr
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}
    ORDER BY season DESC, week DESC`
  const q = useQuery<any>(sql, [sql])

  const base: Column<any>[] = [
    { key: 'season', label: 'Szn' }, { key: 'week', label: 'Wk', numeric: true }, { key: 'opp', label: 'Opp' },
  ]
  const stat: Column<any>[] = pos === 'QB' ? [
    { key: 'cmp', label: 'Cmp', numeric: true }, { key: 'att', label: 'Att', numeric: true },
    { key: 'pass_yds', label: 'Yds', numeric: true }, { key: 'pass_td', label: 'TD', numeric: true },
  ] : pos === 'RB' ? [
    { key: 'car', label: 'Car', numeric: true }, { key: 'rush_yds', label: 'Yds', numeric: true },
    { key: 'rush_td', label: 'TD', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
  ] : [
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
    { key: 'rec_yds', label: 'Yds', numeric: true }, { key: 'rec_td', label: 'TD', numeric: true },
  ]
  const cols = [...base, ...stat, { key: 'ppr', label: 'PPR', numeric: true, format: (v: number) => fmt.num(v, 1) }]

  return (
    <div className="space-y-4">
      <Tile title="Weekly game log" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'week', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================ Splits (plays) */
function Splits({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const idCol = roleIdCol(pos)
  const where = playsWhere(slicers)
  const yds = pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'

  // By down
  const downSql = `
    SELECT 'Down '||down::int name, count(*) plays, sum(${yds})::int yds,
      round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr
    FROM plays WHERE ${idCol}=${sq(player.gsis_id)} ${where} AND down IS NOT NULL
    GROUP BY down ORDER BY down`
  const byDown = useQuery<any>(downSql, [downSql])

  // By score state
  const scoreSql = `
    SELECT CASE
        WHEN score_differential <= -9 THEN '1 Trailing 9+'
        WHEN score_differential < 0 THEN '2 Trailing 1-8'
        WHEN score_differential = 0 THEN '3 Tied'
        WHEN score_differential <= 8 THEN '4 Leading 1-8'
        ELSE '5 Leading 9+' END name,
      count(*) plays, sum(${yds})::int yds, round(avg(epa),3) epa
    FROM plays WHERE ${idCol}=${sq(player.gsis_id)} ${where}
    GROUP BY 1 ORDER BY 1`
  const byScore = useQuery<any>(scoreSql, [scoreSql])

  const downCols: Column<any>[] = [
    { key: 'name', label: 'Situation' }, { key: 'plays', label: 'Plays', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'epa', label: 'EPA/play', numeric: true, format: v => fmt.signed(v, 3) },
    { key: 'sr', label: 'Success%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Situational breakdown for {player.name} from play-by-play (2023–2025 available).
        Adjust the rail to slice further — by down, score, field zone, quarter, and more.
      </p>
      <Tile title="By down" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={byDown} height={260}>{rows => (
          <DataTable rows={rows} columns={downCols} defaultSort={{ key: 'name', dir: 'asc' }} />
        )}</QueryState>
      </Tile>
      <Tile title="EPA per play by game state" subtitle="Negative score = trailing" span={12}>
        <QueryState q={byScore} height={260}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.name.slice(2), value: r.epa }))} height={260}
            color={PALETTE.accent2} formatY={v => fmt.signed(v, 2)} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================ Fantasy */
function Fantasy({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const where = playerWeekWhere(slicers)
  const sql = `
    SELECT season||'-W'||lpad(week::text,2,'0') name, round(fantasy_points_ppr,1) value
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}
    ORDER BY season, week`
  const q = useQuery<{ name: string; value: number }>(sql, [sql])
  const totSql = `
    SELECT count(*) g, round(sum(fantasy_points_ppr),1) total, round(avg(fantasy_points_ppr),1) ppg,
      round(max(fantasy_points_ppr),1) hi, round(min(fantasy_points_ppr),1) lo
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}`
  const tot = useQuery<any>(totSql, [totSql])

  return (
    <div className="space-y-4">
      <FantasyBanner label={`Fantasy · ${player.name}`} headline="Every fantasy week, live."
        body="PPR scoring across the current slice. Use the rail to isolate seasons or weeks; the chart and totals recompute." />
      <QueryState q={tot} height={120}>{rows => (
        <Grid>
          <StatBlock label="Games" value={rows[0].g} sub="in slice" />
          <StatBlock label="Total PPR" value={fmt.num(rows[0].total, 1)} sub="points" />
          <StatBlock label="PPR / game" value={fmt.num(rows[0].ppg, 1)} sub="average" />
          <StatBlock label="Range" value={`${fmt.num(rows[0].lo, 1)}–${fmt.num(rows[0].hi, 1)}`} sub="floor to ceiling" />
        </Grid>
      )}</QueryState>
      <Tile title="PPR points by game" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={300}>{rows => (
          <BarTile data={rows} height={300} color={PALETTE.accent2} formatY={v => fmt.num(v, 0)} />
        )}</QueryState>
      </Tile>
    </div>
  )
}
