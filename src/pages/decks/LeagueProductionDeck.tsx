/**
 * League Production deck — REAL DATA.
 *
 * Cross-league leaderboards driven by the live player_week + games tables,
 * filtered through the slicer rail. Position-aware: the leaderboard reshapes
 * to passing / rushing / receiving stats based on the position slicer.
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, LineTile, PALETTE } from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker, QueryState } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playerWeekWhere, sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function LeagueProductionDeck() {
  const tabs: DeckTab[] = [
    { id: 'leaderboard', label: 'Position Leaderboard', render: () => <Leaderboard /> },
    { id: 'team',        label: 'Team Production',      render: () => <TeamProd /> },
    { id: 'weekly',      label: 'Weekly Trends',        render: () => <Weekly /> },
    { id: 'efficiency',  label: 'Efficiency Leaders',   render: () => <Efficiency /> },
    { id: 'fantasy',     label: 'Fantasy Leaders',      fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="League Production"
      intro="Cross-league leaderboards, sliced honestly. Filter by position to compare like-for-like, through whatever slice of the season matters. Every number here is live from the data."
      tabs={tabs}
      slicerGroups={['season','week','position','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={6}
    />
  )
}

/* ============================================================
 * Tab 01 — Position Leaderboard
 * ============================================================ */
type LbRow = {
  nm: string; tm: string; g: number; tgt?: number; rec?: number; yds: number
  ypr?: number; td: number; ypg: number; att?: number; comp?: number; car?: number
}
function Leaderboard() {
  const { slicers } = useSlicers()
  const pos = slicers.positions[0] ?? 'WR'
  const where = playerWeekWhere({ ...slicers, positions: [pos] })

  const isPass = pos === 'QB'
  const isRush = pos === 'RB'
  const ydCol = isPass ? 'passing_yards' : isRush ? 'rushing_yards' : 'receiving_yards'
  const tdCol = isPass ? 'passing_tds' : isRush ? 'rushing_tds' : 'receiving_tds'

  const sql = `
    SELECT player_display_name nm, recent_team tm, count(*) g,
      sum(targets)::int tgt, sum(receptions)::int rec, sum(carries)::int car,
      sum(attempts)::int att, sum(completions)::int comp,
      sum(${ydCol})::int yds, sum(${tdCol})::int td,
      round(sum(${ydCol})*1.0/nullif(count(*),0),1) ypg,
      round(sum(${ydCol})*1.0/nullif(sum(${isPass ? 'completions' : isRush ? 'carries' : 'receptions'}),0),1) ypr
    FROM player_week WHERE 1=1 ${where} AND position='${pos}'
    GROUP BY 1,2
    HAVING count(*) >= 1 AND sum(${ydCol}) > 0
    ORDER BY yds DESC LIMIT 30`
  const q = useQuery<LbRow>(sql, [sql])

  const cols: Column<LbRow>[] = isPass ? [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' },
    { key: 'g', label: 'G', numeric: true }, { key: 'comp', label: 'Cmp', numeric: true },
    { key: 'att', label: 'Att', numeric: true }, { key: 'yds', label: 'Yds', numeric: true },
    { key: 'ypr', label: 'Y/C', numeric: true, format: v => fmt.num(v,1) },
    { key: 'td', label: 'TD', numeric: true }, { key: 'ypg', label: 'Y/G', numeric: true, format: v => fmt.num(v,1) },
  ] : isRush ? [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' },
    { key: 'g', label: 'G', numeric: true }, { key: 'car', label: 'Car', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true }, { key: 'ypr', label: 'Y/C', numeric: true, format: v => fmt.num(v,1) },
    { key: 'td', label: 'TD', numeric: true }, { key: 'ypg', label: 'Y/G', numeric: true, format: v => fmt.num(v,1) },
  ] : [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' },
    { key: 'g', label: 'G', numeric: true }, { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true }, { key: 'yds', label: 'Yds', numeric: true },
    { key: 'ypr', label: 'Y/R', numeric: true, format: v => fmt.num(v,1) },
    { key: 'td', label: 'TD', numeric: true }, { key: 'ypg', label: 'Y/G', numeric: true, format: v => fmt.num(v,1) },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={`${pos} · ${sliceLabel(slicers)}`} sub="set via slicer rail" />
        <StatBlock label="Players in slice" value={q.data ? String(q.data.length) : '–'} sub="qualified" />
        <StatBlock label="Leader" value={q.data?.[0]?.nm ?? '–'} sub={q.data?.[0] ? `${fmt.int(q.data[0].yds)} yds` : ''} />
        <StatBlock label="Stat basis" value={isPass ? 'Passing' : isRush ? 'Rushing' : 'Receiving'} sub="reshapes by position" />
      </Grid>
      <Tile title={`Top 10 ${pos} by yards`} subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={280}>{rows => (
          <BarTile data={rows.slice(0,10).map(r => ({ name: r.nm.split(' ').slice(-1)[0], value: r.yds }))} height={280} color={PALETTE.accent} />
        )}</QueryState>
      </Tile>
      <Tile title={`${pos} leaderboard`} subtitle="Toggle position via the slicer rail" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'yds', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 02 — Team Production
 * ============================================================ */
type TeamRow = { team: string; ppg: number; pass_ypg: number; rush_ypg: number; tot_ypg: number }
function TeamProd() {
  const { slicers } = useSlicers()
  const seasons = slicers.seasons.length ? slicers.seasons.join(',') : '2024'
  const st = slicers.seasonType === 'postseason' ? 'POST' : 'REG'

  const sql = `
    WITH pts AS (
      SELECT team, avg(pts) ppg FROM (
        SELECT home_team team, home_score pts, season, game_type FROM games
        UNION ALL SELECT away_team, away_score, season, game_type FROM games
      ) WHERE season IN (${seasons}) AND game_type='${st}' GROUP BY 1),
    yds AS (
      SELECT recent_team team,
        sum(passing_yards)*1.0/count(distinct season||'-'||week) pass_ypg,
        sum(rushing_yards)*1.0/count(distinct season||'-'||week) rush_ypg
      FROM player_week WHERE season IN (${seasons}) AND season_type='${st}'
      GROUP BY 1)
    SELECT p.team, round(p.ppg,1) ppg, round(y.pass_ypg,0) pass_ypg,
      round(y.rush_ypg,0) rush_ypg, round(y.pass_ypg+y.rush_ypg,0) tot_ypg
    FROM pts p JOIN yds y USING(team) ORDER BY ppg DESC`
  const q = useQuery<TeamRow>(sql, [sql])

  const cols: Column<TeamRow>[] = [
    { key: 'team', label: 'Team' },
    { key: 'ppg', label: 'PPG', numeric: true, format: v => fmt.num(v,1) },
    { key: 'pass_ypg', label: 'Pass Y/G', numeric: true },
    { key: 'rush_ypg', label: 'Rush Y/G', numeric: true },
    { key: 'tot_ypg', label: 'Tot Y/G', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="team offense" />
        <StatBlock label="Top scorer" value={q.data?.[0]?.team ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].ppg,1)} ppg` : ''} />
        <StatBlock label="Teams" value={q.data ? String(q.data.length) : '–'} sub="in slice" />
        <StatBlock label="Note" value="Real" sub="PPG from final scores" />
      </Grid>
      <Tile title="Points per game by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={300}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.team, value: r.ppg, color: TEAM_COLORS[r.team] || PALETTE.accent }))} height={300} formatY={v => fmt.num(v,1)} />
        )}</QueryState>
      </Tile>
      <Tile title="Team offense — full leaderboard" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ppg', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 03 — Weekly Trends
 * ============================================================ */
type WkRow = { name: string; value: number }
function Weekly() {
  const { slicers } = useSlicers()
  const seasons = slicers.seasons.length ? slicers.seasons.join(',') : '2024'
  const st = slicers.seasonType === 'postseason' ? 'POST' : 'REG'

  const sql = `
    SELECT 'W'||week name, week,
      round(sum(passing_yards+rushing_yards)*1.0/count(distinct recent_team),1) value
    FROM player_week WHERE season IN (${seasons}) AND season_type='${st}'
    GROUP BY week ORDER BY week`
  const q = useQuery<WkRow & { week: number }>(sql, [sql])

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="league-wide" />
        <StatBlock label="Weeks" value={q.data ? String(q.data.length) : '–'} sub="in slice" />
        <StatBlock label="Metric" value="Yds/team/wk" sub="total offense" />
        <StatBlock label="Note" value="Real" sub="live aggregation" />
      </Grid>
      <Tile title="League total yards per team, by week" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={300}>{rows => (
          <LineTile data={rows} height={300}
            series={[{ key: 'value', label: 'Yds/team', color: PALETTE.accent }]}
            formatY={v => fmt.int(v)} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 04 — Efficiency Leaders (real cols: aDOT, YAC, catch%, WOPR, EPA)
 * ============================================================ */
type EffRow = {
  nm: string; tm: string; tgt: number; rec: number; yds: number
  adot: number; yac: number; catch_pct: number; wopr: number; epa: number
}
function Efficiency() {
  const { slicers } = useSlicers()
  const pos = ['WR','TE','RB'].includes(slicers.positions[0]) ? slicers.positions[0] : 'WR'
  const where = playerWeekWhere({ ...slicers, positions: [pos] })
  const sql = `
    SELECT player_display_name nm, recent_team tm,
      sum(targets)::int tgt, sum(receptions)::int rec, sum(receiving_yards)::int yds,
      round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1) adot,
      round(sum(receiving_yards_after_catch)*1.0/nullif(sum(receptions),0),1) yac,
      round(sum(receptions)*100.0/nullif(sum(targets),0),1) catch_pct,
      round(avg(wopr),3) wopr, round(sum(receiving_epa),1) epa
    FROM player_week WHERE 1=1 ${where} AND position='${pos}'
    GROUP BY 1,2 HAVING sum(targets) >= 20
    ORDER BY epa DESC LIMIT 20`
  const q = useQuery<EffRow>(sql, [sql])
  const cols: Column<EffRow>[] = [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v,1) },
    { key: 'yac', label: 'YAC/R', numeric: true, format: v => fmt.num(v,1) },
    { key: 'catch_pct', label: 'Catch%', numeric: true, format: v => `${fmt.num(v,1)}%` },
    { key: 'wopr', label: 'WOPR', numeric: true, format: v => fmt.num(v,2) },
    { key: 'epa', label: 'Rec EPA', numeric: true, format: v => fmt.signed(v,1) },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={`${pos} · ${sliceLabel(slicers)}`} sub="≥20 targets" />
        <StatBlock label="EPA leader" value={q.data?.[0]?.nm ?? '–'} sub={q.data?.[0] ? `${fmt.signed(q.data[0].epa,1)} rec EPA` : ''} />
        <StatBlock label="Qualified" value={q.data ? String(q.data.length) : '–'} sub="players" />
        <StatBlock label="Metrics" value="Real" sub="aDOT · YAC · WOPR · EPA" />
      </Grid>
      <Tile title={`Efficiency leaders — ${pos}`} subtitle="Sorted by receiving EPA · real per-target metrics" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 05 — Fantasy Leaders
 * ============================================================ */
type FpRow = { nm: string; pos: string; tm: string; g: number; total: number; ppg: number; hi: number }
function Fantasy() {
  const { slicers } = useSlicers()
  const where = playerWeekWhere(slicers)
  const sql = `
    SELECT player_display_name nm, position pos, recent_team tm, count(*) g,
      round(sum(fantasy_points_ppr),1) total, round(avg(fantasy_points_ppr),1) ppg,
      round(max(fantasy_points_ppr),1) hi
    FROM player_week WHERE 1=1 ${where}
      AND position IN ('QB','RB','WR','TE')
    GROUP BY 1,2,3 HAVING count(*) >= 1
    ORDER BY ppg DESC LIMIT 25`
  const q = useQuery<FpRow>(sql, [sql])
  const cols: Column<FpRow>[] = [
    { key: 'nm', label: 'Player' }, { key: 'pos', label: 'Pos' }, { key: 'tm', label: 'Tm' },
    { key: 'g', label: 'G', numeric: true },
    { key: 'total', label: 'Total', numeric: true, format: v => fmt.num(v,1) },
    { key: 'ppg', label: 'PPG', numeric: true, format: v => fmt.num(v,1) },
    { key: 'hi', label: 'High', numeric: true, format: v => fmt.num(v,1) },
  ]
  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Leaders · League-wide"
        headline="The top of the board, live from the data."
        body="PPR scoring, recomputed against whatever slice of the season you've set in the rail. Adjust seasons, weeks, or position and the leaderboard follows."
      />
      <Grid>
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="PPR" />
        <StatBlock label="PPG leader" value={q.data?.[0]?.nm ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].ppg,1)} ppg` : ''} />
        <StatBlock label="Players" value={q.data ? String(q.data.length) : '–'} sub="ranked" />
        <StatBlock label="Format" value="PPR" sub="fantasy_points_ppr" />
      </Grid>
      <FormatPicker formats={['PPR']} active="PPR" />
      <Tile title="Top fantasy producers — PPG" subtitle={`PPR · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={300}>{rows => (
          <BarTile data={rows.slice(0,12).map(r => ({ name: r.nm.split(' ').slice(-1)[0], value: r.ppg }))} height={300} color={PALETTE.accent2} formatY={v => fmt.num(v,1)} />
        )}</QueryState>
      </Tile>
      <Tile title="Fantasy leaderboard — all positions" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ppg', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}
