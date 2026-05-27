/**
 * PlayerView — generic, position-aware Single Player view on REAL data.
 * 8 report tabs. Drives QBView/RBView/WRView/TEView.
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
    { id: 'overview', label: 'Overview',         render: () => <Overview player={player} /> },
    { id: 'weekly',   label: 'Week by Week',     render: () => <Weekly player={player} /> },
    { id: 'downdist', label: 'Down & Distance',  render: () => <DownDist player={player} /> },
    { id: 'gamestate',label: 'Game State',       render: () => <GameState player={player} /> },
    { id: 'depth',    label: player.position === 'RB' ? 'Run Direction' : 'Pass Depth', render: () => <Depth player={player} /> },
    { id: 'field',    label: 'Field & Quarter',  render: () => <Field player={player} /> },
    { id: 'data',     label: 'Data Table',       render: () => <DataTab player={player} /> },
    { id: 'fantasy',  label: 'Fantasy',          fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}

export const PLAYER_SLICERS = [
  'season','week','team','opponent','homeAway','down','distance','score','zone','qtr',
  'passDepth','runDir','pressure','shotgun','playType','garbage',
] as const

function roleId(pos: Pos) { return pos === 'QB' ? 'passer_player_id' : pos === 'RB' ? 'rusher_player_id' : 'receiver_player_id' }
function ydCol(pos: Pos) { return pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards' }

/* ============ Overview (real player KPIs — kept) ============ */
function Overview({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const pos = player.position as Pos
  const where = playerWeekWhere(slicers)
  const sql = `SELECT count(*) g,
      sum(passing_yards)::int pass_yds, sum(passing_tds)::int pass_td, sum(interceptions)::int picks,
      sum(completions)::int cmp, sum(attempts)::int att,
      sum(carries)::int car, sum(rushing_yards)::int rush_yds, sum(rushing_tds)::int rush_td,
      sum(targets)::int tgt, sum(receptions)::int rec, sum(receiving_yards)::int rec_yds,
      sum(receiving_tds)::int rec_td, round(avg(fantasy_points_ppr),1) ppg,
      round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1) adot
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}`
  const q = useQuery<any>(sql, [sql])
  const wkSql = `SELECT season||'-W'||lpad(week::text,2,'0') name, ${ydCol(pos)}::int value
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where} ORDER BY season, week`
  const wk = useQuery<{ name: string; value: number }>(wkSql, [wkSql])
  const blocks = (r: any) => pos === 'QB'
    ? [['Games', r.g], ['Pass yds', fmt.int(r.pass_yds)], ['Pass TD', r.pass_td], ['INT', r.picks],
       ['Comp%', `${fmt.num(r.cmp * 100 / Math.max(r.att, 1), 1)}%`], ['PPR/G', fmt.num(r.ppg, 1)]]
    : pos === 'RB'
    ? [['Games', r.g], ['Carries', r.car], ['Rush yds', fmt.int(r.rush_yds)],
       ['YPC', fmt.num(r.rush_yds / Math.max(r.car, 1), 1)], ['Rec', r.rec], ['PPR/G', fmt.num(r.ppg, 1)]]
    : [['Games', r.g], ['Targets', r.tgt], ['Rec', r.rec], ['Rec yds', fmt.int(r.rec_yds)],
       ['aDOT', fmt.num(r.adot, 1)], ['PPR/G', fmt.num(r.ppg, 1)]]
  const ydLabel = pos === 'QB' ? 'Passing yards' : pos === 'RB' ? 'Rushing yards' : 'Receiving yards'
  return (
    <div className="space-y-4">
      <QueryState q={q} height={110}>{rows => (
        <Grid>{blocks(rows[0]).map(([l, v]) => <StatBlock key={String(l)} label={String(l)} value={v as any} />)}</Grid>
      )}</QueryState>
      <Tile title={`${ydLabel} by game`} subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={wk} height={300}>{rows => <BarTile data={rows} height={300} color={PALETTE.accent} formatY={v => fmt.int(v)} />}</QueryState>
      </Tile>
    </div>
  )
}

/* ============ Week by Week ============ */
function Weekly({ player }: { player: Player }) {
  const { slicers } = useSlicers(); const pos = player.position as Pos
  const where = playerWeekWhere(slicers)
  const sql = `SELECT season, week, opponent_team opp,
      completions::int cmp, attempts::int att, passing_yards::int pass_yds, passing_tds::int pass_td,
      carries::int car, rushing_yards::int rush_yds, rushing_tds::int rush_td,
      targets::int tgt, receptions::int rec, receiving_yards::int rec_yds, receiving_tds::int rec_td,
      round(fantasy_points_ppr,1) ppr
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where} ORDER BY season DESC, week DESC`
  const q = useQuery<any>(sql, [sql])
  const base: Column<any>[] = [{ key: 'season', label: 'Szn' }, { key: 'week', label: 'Wk', numeric: true }, { key: 'opp', label: 'Opp' }]
  const stat: Column<any>[] = pos === 'QB'
    ? [{ key: 'cmp', label: 'Cmp', numeric: true }, { key: 'att', label: 'Att', numeric: true }, { key: 'pass_yds', label: 'Yds', numeric: true }, { key: 'pass_td', label: 'TD', numeric: true }, { key: 'rush_yds', label: 'RuYd', numeric: true }]
    : pos === 'RB'
    ? [{ key: 'car', label: 'Car', numeric: true }, { key: 'rush_yds', label: 'Yds', numeric: true }, { key: 'rush_td', label: 'TD', numeric: true }, { key: 'rec', label: 'Rec', numeric: true }, { key: 'rec_yds', label: 'ReYd', numeric: true }]
    : [{ key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true }, { key: 'rec_yds', label: 'Yds', numeric: true }, { key: 'rec_td', label: 'TD', numeric: true }]
  const cols = [...base, ...stat, { key: 'ppr', label: 'PPR', numeric: true, format: (v: number) => fmt.num(v, 1) }]
  return (
    <Tile title="Weekly game log" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
      <QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'week', dir: 'desc' }} />}</QueryState>
    </Tile>
  )
}

/* shared situational query builder over plays */
function useSplit(player: Player, groupExpr: string, label: string, order: string) {
  const { slicers } = useSlicers(); const pos = player.position as Pos
  const yds = ydCol(pos); const where = playsWhere(slicers)
  const sql = `SELECT ${groupExpr} AS name, count(*) plays, sum(${yds})::int yds,
      round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr
    FROM plays WHERE ${roleId(pos)}=${sq(player.gsis_id)} ${where} ${label}
    GROUP BY 1 ORDER BY ${order}`
  return { q: useQuery<any>(sql, [sql]), slicers, yds }
}
const splitCols: Column<any>[] = [
  { key: 'name', label: 'Situation' }, { key: 'plays', label: 'Plays', numeric: true },
  { key: 'yds', label: 'Yds', numeric: true }, { key: 'epa', label: 'EPA', numeric: true, format: v => fmt.signed(v, 3) },
  { key: 'sr', label: 'Succ%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
]

function DownDist({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const d = useSplit(player, `'Down '||down::int`, 'AND down IS NOT NULL', 'name')
  const dist = useSplit(player, `CASE WHEN ydstogo<=3 THEN '1-3' WHEN ydstogo<=6 THEN '4-6' WHEN ydstogo<=9 THEN '7-9' WHEN ydstogo=10 THEN '10' ELSE '11+' END`, 'AND down IS NOT NULL', 'name')
  return (
    <div className="space-y-4">
      <Tile title="By down" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={d.q} height={220}>{r => <DataTable rows={r} columns={splitCols} defaultSort={{ key: 'name', dir: 'asc' }} />}</QueryState>
      </Tile>
      <Tile title="EPA by distance to go" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={dist.q} height={240}>{r => <BarTile data={r.map(x => ({ name: x.name, value: x.epa }))} height={240} color={PALETTE.accent2} formatY={v => fmt.signed(v, 2)} />}</QueryState>
      </Tile>
    </div>
  )
}

function GameState({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const s = useSplit(player, `CASE WHEN score_differential<=-17 THEN '1 Losing 17+' WHEN score_differential<=-9 THEN '2 Losing 9-16' WHEN score_differential<=-4 THEN '3 Losing 4-8' WHEN score_differential<0 THEN '4 Losing 1-3' WHEN score_differential=0 THEN '5 Tied' WHEN score_differential<=3 THEN '6 Winning 1-3' WHEN score_differential<=8 THEN '7 Winning 4-8' WHEN score_differential<=16 THEN '8 Winning 9-16' ELSE '9 Winning 17+' END`, '', 'name')
  return (
    <div className="space-y-4">
      <Tile title="EPA per play by game state" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={s.q} height={300}>{r => <BarTile data={r.map(x => ({ name: x.name.slice(2), value: x.epa }))} height={300} color={PALETTE.accent} formatY={v => fmt.signed(v, 2)} />}</QueryState>
      </Tile>
      <Tile title="Production by game state" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={s.q} height={260}>{r => <DataTable rows={r.map(x => ({ ...x, name: x.name.slice(2) }))} columns={splitCols} defaultSort={{ key: 'plays', dir: 'desc' }} />}</QueryState>
      </Tile>
    </div>
  )
}

/* Pass Depth (QB/WR/TE) or Run Direction (RB) — item 3 air yards */
function Depth({ player }: { player: Player }) {
  const { slicers } = useSlicers(); const pos = player.position as Pos
  const where = playsWhere(slicers)
  if (pos === 'RB') {
    const sql = `SELECT COALESCE(run_location,'unknown') name, count(*) plays, sum(rushing_yards)::int yds,
        round(avg(rushing_yards),2) ypc, round(avg(epa),3) epa
      FROM plays WHERE rusher_player_id=${sq(player.gsis_id)} AND rush_attempt=1 ${where}
      GROUP BY 1 ORDER BY plays DESC`
    const q = useQuery<any>(sql, [sql])
    const cols: Column<any>[] = [{ key: 'name', label: 'Direction' }, { key: 'plays', label: 'Att', numeric: true }, { key: 'yds', label: 'Yds', numeric: true }, { key: 'ypc', label: 'YPC', numeric: true, format: v => fmt.num(v, 2) }, { key: 'epa', label: 'EPA', numeric: true, format: v => fmt.signed(v, 3) }]
    return (
      <div className="space-y-4">
        <Tile title="Rushing by direction" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
          <QueryState q={q} height={240}>{r => <BarTile data={r.map(x => ({ name: x.name, value: x.yds }))} height={240} color={PALETTE.accent} />}</QueryState>
        </Tile>
        <Tile title="Run direction detail" span={12}><QueryState q={q} height={220}>{r => <DataTable rows={r} columns={cols} defaultSort={{ key: 'plays', dir: 'desc' }} />}</QueryState></Tile>
      </div>
    )
  }
  const idc = pos === 'QB' ? 'passer_player_id' : 'receiver_player_id'
  const byDepth = `SELECT CASE WHEN air_yards<0 THEN '1 Behind LOS' WHEN air_yards<=9 THEN '2 Short (0-9)' WHEN air_yards<=19 THEN '3 Intermediate (10-19)' ELSE '4 Deep (20+)' END AS name,
      count(*) plays, sum(complete_pass)::int comp, sum(passing_yards)::int yds, round(avg(epa),3) epa
    FROM plays WHERE ${idc}=${sq(player.gsis_id)} AND pass_attempt=1 AND air_yards IS NOT NULL ${where}
    GROUP BY 1 ORDER BY name`
  const qd = useQuery<any>(byDepth, [byDepth])
  const byDir = `SELECT COALESCE(pass_location,'?') name, count(*) plays, sum(passing_yards)::int yds, round(avg(epa),3) epa
    FROM plays WHERE ${idc}=${sq(player.gsis_id)} AND pass_attempt=1 ${where} GROUP BY 1 ORDER BY plays DESC`
  const qdir = useQuery<any>(byDir, [byDir])
  const depthCols: Column<any>[] = [{ key: 'name', label: 'Depth' }, { key: 'plays', label: 'Att', numeric: true }, { key: 'comp', label: 'Comp', numeric: true }, { key: 'yds', label: 'Yds', numeric: true }, { key: 'epa', label: 'EPA', numeric: true, format: v => fmt.signed(v, 3) }]
  return (
    <div className="space-y-4">
      <Tile title="Yards by target depth (air yards)" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={qd} height={260}>{r => <BarTile data={r.map(x => ({ name: x.name.slice(2), value: x.yds }))} height={260} color={PALETTE.accent} />}</QueryState>
      </Tile>
      <Tile title="By depth bucket" span={6}><QueryState q={qd} height={220}>{r => <DataTable rows={r.map(x => ({ ...x, name: x.name.slice(2) }))} columns={depthCols} defaultSort={{ key: 'name', dir: 'asc' }} />}</QueryState></Tile>
      <Tile title="By direction (L/M/R)" span={6}><QueryState q={qdir} height={220}>{r => <BarTile data={r.map(x => ({ name: x.name, value: x.yds }))} height={220} color={PALETTE.accent2} />}</QueryState></Tile>
    </div>
  )
}

function Field({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const zone = useSplit(player, `CASE WHEN yardline_100<=20 THEN '1 Red zone' WHEN yardline_100<=50 THEN '2 Opp territory' WHEN yardline_100<=80 THEN '3 Own territory' ELSE '4 Backed up' END`, '', 'name')
  const qtr = useSplit(player, `'Q'||qtr::int`, 'AND qtr IS NOT NULL AND qtr<=4', 'name')
  return (
    <div className="space-y-4">
      <Tile title="Production by field zone" subtitle={`${player.name} · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={zone.q} height={240}>{r => <BarTile data={r.map(x => ({ name: x.name.slice(2), value: x.yds }))} height={240} color={PALETTE.accent} />}</QueryState>
      </Tile>
      <Tile title="EPA by quarter" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={qtr.q} height={220}>{r => <BarTile data={r.map(x => ({ name: x.name, value: x.epa }))} height={220} color={PALETTE.accent2} formatY={v => fmt.signed(v, 2)} />}</QueryState>
      </Tile>
    </div>
  )
}

/* Packed data table (item 4) */
function DataTab({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const where = playerWeekWhere(slicers)
  const sql = `SELECT season szn, week wk, opponent_team opp,
      completions::int cmp, attempts::int att, passing_yards::int py, passing_tds::int ptd, interceptions::int intc,
      round(passing_epa,2) pepa, carries::int car, rushing_yards::int ry, rushing_tds::int rtd,
      targets::int tgt, receptions::int rec, receiving_yards::int recy, receiving_tds::int rtd2,
      round(receiving_air_yards*1.0/nullif(targets,0),1) adot, receiving_yards_after_catch::int yac,
      round(target_share*100,1) tgtsh, round(wopr,2) wopr, round(receiving_epa,2) repa,
      round(fantasy_points,1) std, round(fantasy_points_ppr,1) ppr
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where} ORDER BY season DESC, week DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'szn', label: 'Szn' }, { key: 'wk', label: 'Wk', numeric: true }, { key: 'opp', label: 'Opp' },
    { key: 'cmp', label: 'Cmp', numeric: true }, { key: 'att', label: 'Att', numeric: true }, { key: 'py', label: 'PaYd', numeric: true }, { key: 'ptd', label: 'PaTD', numeric: true }, { key: 'intc', label: 'INT', numeric: true }, { key: 'pepa', label: 'PaEPA', numeric: true, format: v => fmt.num(v, 2) },
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'RuYd', numeric: true }, { key: 'rtd', label: 'RuTD', numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true }, { key: 'recy', label: 'ReYd', numeric: true }, { key: 'rtd2', label: 'ReTD', numeric: true },
    { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) }, { key: 'yac', label: 'YAC', numeric: true }, { key: 'tgtsh', label: 'Tgt%', numeric: true, format: v => `${fmt.num(v, 0)}` }, { key: 'wopr', label: 'WOPR', numeric: true, format: v => fmt.num(v, 2) }, { key: 'repa', label: 'ReEPA', numeric: true, format: v => fmt.num(v, 2) },
    { key: 'std', label: 'STD', numeric: true, format: v => fmt.num(v, 1) }, { key: 'ppr', label: 'PPR', numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <Tile title="Everything — weekly, every metric" subtitle={`${player.name} · ${sliceLabel(slicers)} · scroll horizontally for all columns`} span={12}>
      <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'wk', dir: 'desc' }} dense />}</QueryState>
    </Tile>
  )
}

function Fantasy({ player }: { player: Player }) {
  const { slicers } = useSlicers()
  const where = playerWeekWhere(slicers)
  const sql = `SELECT season||'-W'||lpad(week::text,2,'0') name, round(fantasy_points_ppr,1) value
    FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where} ORDER BY season, week`
  const q = useQuery<{ name: string; value: number }>(sql, [sql])
  const totSql = `SELECT count(*) g, round(sum(fantasy_points_ppr),1) total, round(avg(fantasy_points_ppr),1) ppg,
      round(max(fantasy_points_ppr),1) hi, round(min(fantasy_points_ppr),1) lo FROM player_week WHERE player_id=${sq(player.gsis_id)} ${where}`
  const tot = useQuery<any>(totSql, [totSql])
  return (
    <div className="space-y-4">
      <FantasyBanner label={`Fantasy · ${player.name}`} headline="Every fantasy week, live."
        body="PPR scoring across the current slice. Use the rail to isolate seasons, weeks, depth of target, or game state." />
      <QueryState q={tot} height={110}>{rows => (
        <Grid>
          <StatBlock label="Games" value={rows[0].g} /><StatBlock label="Total PPR" value={fmt.num(rows[0].total, 1)} />
          <StatBlock label="PPR / game" value={fmt.num(rows[0].ppg, 1)} /><StatBlock label="Range" value={`${fmt.num(rows[0].lo, 1)}–${fmt.num(rows[0].hi, 1)}`} />
        </Grid>
      )}</QueryState>
      <Tile title="PPR points by game" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={300}>{rows => <BarTile data={rows} height={300} color={PALETTE.accent2} formatY={v => fmt.num(v, 0)} />}</QueryState>
      </Tile>
    </div>
  )
}
