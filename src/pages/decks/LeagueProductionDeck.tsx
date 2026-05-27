/**
 * League Production deck.
 *
 * Cross-league leaderboards, sliced honestly. Filter by position to compare
 * like-for-like (don't put QBs and RBs on the same yardage chart).
 *
 * Tabs:
 *   01. Position Leaderboard  — top 20 at the selected position
 *   02. Team Production       — which offenses are producing
 *   03. Weekly Trends         — league averages by week
 *   04. Efficiency Leaders    — per-play metrics, not bulk
 *   05. Fantasy Leaders       — PPR/half/standard leaderboards
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, LineTile, DonutTile, ScatterTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
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
      intro="Cross-league leaderboards, sliced honestly. Filter by position to compare like-for-like — QBs against QBs, receivers against receivers — through whatever slice of the season matters."
      tabs={tabs}
      slicerGroups={['season','week','position','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={6}
    />
  )
}

/* ============================================================
 * Tab 01 — Position Leaderboard
 * ============================================================ */
function Leaderboard() {
  const wrLeaders = [
    { rank: 1,  name: 'Justin Jefferson',  team: 'MIN', g: 8, tgt: 92, rec: 64, yds: 943, ypr: 14.7, td: 6, ypg: 117.9 },
    { rank: 2,  name: "Ja'Marr Chase",     team: 'CIN', g: 8, tgt: 88, rec: 61, yds: 891, ypr: 14.6, td: 7, ypg: 111.4 },
    { rank: 3,  name: 'CeeDee Lamb',       team: 'DAL', g: 8, tgt: 84, rec: 58, yds: 824, ypr: 14.2, td: 5, ypg: 103.0 },
    { rank: 4,  name: 'Amon-Ra St. Brown', team: 'DET', g: 8, tgt: 81, rec: 62, yds: 779, ypr: 12.6, td: 6, ypg: 97.4 },
    { rank: 5,  name: 'A.J. Brown',        team: 'PHI', g: 8, tgt: 77, rec: 51, yds: 762, ypr: 14.9, td: 5, ypg: 95.3 },
    { rank: 6,  name: 'Puka Nacua',        team: 'LAR', g: 7, tgt: 71, rec: 49, yds: 696, ypr: 14.2, td: 4, ypg: 99.4 },
    { rank: 7,  name: 'Tyreek Hill',       team: 'MIA', g: 8, tgt: 79, rec: 54, yds: 712, ypr: 13.2, td: 4, ypg: 89.0 },
    { rank: 8,  name: 'Nico Collins',      team: 'HOU', g: 7, tgt: 67, rec: 46, yds: 678, ypr: 14.7, td: 5, ypg: 96.9 },
    { rank: 9,  name: 'Drake London',      team: 'ATL', g: 8, tgt: 72, rec: 48, yds: 654, ypr: 13.6, td: 4, ypg: 81.8 },
    { rank: 10, name: 'Garrett Wilson',    team: 'NYJ', g: 8, tgt: 84, rec: 51, yds: 631, ypr: 12.4, td: 3, ypg: 78.9 },
    { rank: 11, name: 'Mike Evans',        team: 'TB',  g: 8, tgt: 68, rec: 44, yds: 619, ypr: 14.1, td: 7, ypg: 77.4 },
    { rank: 12, name: 'DK Metcalf',        team: 'SEA', g: 8, tgt: 64, rec: 41, yds: 598, ypr: 14.6, td: 4, ypg: 74.8 },
    { rank: 13, name: 'Malik Nabers',      team: 'NYG', g: 7, tgt: 78, rec: 48, yds: 576, ypr: 12.0, td: 3, ypg: 82.3 },
    { rank: 14, name: 'Brian Thomas Jr.',  team: 'JAX', g: 8, tgt: 62, rec: 39, yds: 567, ypr: 14.5, td: 5, ypg: 70.9 },
    { rank: 15, name: 'Marvin Harrison Jr.',team: 'ARI',g: 8, tgt: 66, rec: 42, yds: 558, ypr: 13.3, td: 4, ypg: 69.8 },
    { rank: 16, name: 'Terry McLaurin',    team: 'WAS', g: 8, tgt: 61, rec: 38, yds: 542, ypr: 14.3, td: 4, ypg: 67.8 },
    { rank: 17, name: 'DJ Moore',          team: 'CHI', g: 8, tgt: 69, rec: 44, yds: 528, ypr: 12.0, td: 3, ypg: 66.0 },
    { rank: 18, name: 'Davante Adams',     team: 'LV',  g: 7, tgt: 71, rec: 41, yds: 517, ypr: 12.6, td: 3, ypg: 73.9 },
    { rank: 19, name: 'Cooper Kupp',       team: 'LAR', g: 6, tgt: 58, rec: 39, yds: 489, ypr: 12.5, td: 2, ypg: 81.5 },
    { rank: 20, name: 'Calvin Ridley',     team: 'TEN', g: 8, tgt: 58, rec: 36, yds: 476, ypr: 13.2, td: 4, ypg: 59.5 },
  ]
  const cols: Column<typeof wrLeaders[0]>[] = [
    { key: 'rank', label: '#',    numeric: true },
    { key: 'name', label: 'Player' },
    { key: 'team', label: 'Team' },
    { key: 'g',    label: 'G',    numeric: true },
    { key: 'tgt',  label: 'Tgt',  numeric: true },
    { key: 'rec',  label: 'Rec',  numeric: true },
    { key: 'yds',  label: 'Yds',  numeric: true },
    { key: 'ypr',  label: 'Y/R',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'td',   label: 'TD',   numeric: true },
    { key: 'ypg',  label: 'Y/G',  numeric: true, format: v => fmt.num(v, 1) },
  ]

  const top10Chart = wrLeaders.slice(0, 10).map(w => ({ name: w.name.split(' ').slice(-1)[0], value: w.yds }))
  const positionMix = [
    { name: 'QB', value: 32, color: '#6191A5' },
    { name: 'RB', value: 64, color: '#2A3B47' },
    { name: 'WR', value: 96, color: '#3F8060' },
    { name: 'TE', value: 32, color: '#A0594B' },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value="WR · 2025 · Wk 1–8" sub="adjust via slicers" />
        <StatBlock label="Players in slice"  value="96" sub="active receivers" />
        <StatBlock label="Median Yds/G"      value="42.1" sub="among qualified WRs" />
        <StatBlock label="Top performer"     value="J. Jefferson" sub="117.9 yds/g" />
      </Grid>
      <Grid>
        <Tile title="Top 10 by yards" subtitle="Within the current slice" span={4}>
          <BarTile data={top10Chart} height={260} color={PALETTE.accent} />
        </Tile>
        <Tile title="Player count by position" subtitle="In the qualifying slice" span={2}>
          <DonutTile data={positionMix} height={260} />
        </Tile>
      </Grid>
      <Tile title="Position leaderboard — Wide Receivers" subtitle="Sortable. Toggle position via the slicer rail." span={12}>
        <DataTable rows={wrLeaders} columns={cols} defaultSort={{ key: 'yds', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 02 — Team Production
 * ============================================================ */
function TeamProd() {
  const teamOff = [
    { team: 'BUF', ppg: 30.4, ypg: 392, pass_ypg: 261, rush_ypg: 131, td_g: 3.5, plays: 64.2 },
    { team: 'DET', ppg: 29.8, ypg: 401, pass_ypg: 254, rush_ypg: 147, td_g: 3.4, plays: 65.4 },
    { team: 'BAL', ppg: 29.1, ypg: 416, pass_ypg: 218, rush_ypg: 198, td_g: 3.3, plays: 64.8 },
    { team: 'KC',  ppg: 27.6, ypg: 358, pass_ypg: 251, rush_ypg: 107, td_g: 3.1, plays: 63.9 },
    { team: 'SF',  ppg: 26.8, ypg: 374, pass_ypg: 238, rush_ypg: 136, td_g: 3.0, plays: 62.7 },
    { team: 'CIN', ppg: 26.1, ypg: 369, pass_ypg: 271, rush_ypg:  98, td_g: 2.9, plays: 64.1 },
    { team: 'MIA', ppg: 25.4, ypg: 357, pass_ypg: 232, rush_ypg: 125, td_g: 2.8, plays: 63.0 },
    { team: 'PHI', ppg: 24.9, ypg: 348, pass_ypg: 214, rush_ypg: 134, td_g: 2.8, plays: 62.4 },
    { team: 'HOU', ppg: 24.2, ypg: 339, pass_ypg: 244, rush_ypg:  95, td_g: 2.7, plays: 61.8 },
    { team: 'GB',  ppg: 23.8, ypg: 331, pass_ypg: 208, rush_ypg: 123, td_g: 2.6, plays: 62.1 },
    { team: 'MIN', ppg: 23.4, ypg: 328, pass_ypg: 226, rush_ypg: 102, td_g: 2.6, plays: 61.9 },
    { team: 'TB',  ppg: 22.7, ypg: 324, pass_ypg: 232, rush_ypg:  92, td_g: 2.5, plays: 60.8 },
    { team: 'LAR', ppg: 22.1, ypg: 321, pass_ypg: 219, rush_ypg: 102, td_g: 2.4, plays: 61.0 },
    { team: 'ATL', ppg: 21.6, ypg: 317, pass_ypg: 204, rush_ypg: 113, td_g: 2.4, plays: 60.4 },
    { team: 'WAS', ppg: 21.1, ypg: 312, pass_ypg: 198, rush_ypg: 114, td_g: 2.3, plays: 59.8 },
    { team: 'IND', ppg: 20.6, ypg: 308, pass_ypg: 201, rush_ypg: 107, td_g: 2.3, plays: 59.6 },
  ]
  const cols: Column<typeof teamOff[0]>[] = [
    { key: 'team', label: 'Team' },
    { key: 'ppg',  label: 'PPG',     numeric: true, format: v => fmt.num(v, 1) },
    { key: 'ypg',  label: 'Yds/G',   numeric: true },
    { key: 'pass_ypg', label: 'Pass Y/G', numeric: true },
    { key: 'rush_ypg', label: 'Rush Y/G', numeric: true },
    { key: 'td_g', label: 'TD/G',    numeric: true, format: v => fmt.num(v, 1) },
    { key: 'plays',label: 'Plays/G', numeric: true, format: v => fmt.num(v, 1) },
  ]
  const ppgChart = teamOff.slice(0, 12).map(t => ({
    name: t.team, value: t.ppg, color: TEAM_COLORS[t.team] || PALETTE.accent,
  }))
  const passVsRun = teamOff.slice(0, 12).map(t => ({
    name: t.team, pass: t.pass_ypg, rush: t.rush_ypg,
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="League PPG"    value="22.7" sub="all 32 teams avg" />
        <StatBlock label="League Yds/G"  value="338"  sub="balanced sample" />
        <StatBlock label="Pass-to-rush"  value="58 / 42" sub="league split" />
        <StatBlock label="Top scorer"    value="BUF" sub="30.4 ppg" />
      </Grid>
      <Tile title="Points per game — top 12" span={12}>
        <BarTile data={ppgChart} height={280} color={PALETTE.accent} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Pass vs run yardage — top 12" subtitle="Hover bars for breakdown" span={12}>
        <BarTile data={passVsRun.map(t => ({ name: t.name, value: t.pass + t.rush }))} height={240} color={PALETTE.accent2} />
      </Tile>
      <Tile title="Team offense — full leaderboard" span={12}>
        <DataTable rows={teamOff} columns={cols} defaultSort={{ key: 'ppg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 03 — Weekly Trends
 * ============================================================ */
function Weekly() {
  const ppgByWeek = [
    { name: 'W1', value: 21.4 }, { name: 'W2', value: 22.1 },
    { name: 'W3', value: 23.7 }, { name: 'W4', value: 22.9 },
    { name: 'W5', value: 24.2 }, { name: 'W6', value: 23.1 },
    { name: 'W7', value: 22.6 }, { name: 'W8', value: 23.4 },
  ]
  const passRate = [
    { name: 'W1', value: 58.2 }, { name: 'W2', value: 59.1 },
    { name: 'W3', value: 60.4 }, { name: 'W4', value: 57.8 },
    { name: 'W5', value: 58.9 }, { name: 'W6', value: 60.1 },
    { name: 'W7', value: 59.7 }, { name: 'W8', value: 58.6 },
  ]
  const epaWeek = [
    { name: 'W1', pass:  0.12, rush: -0.04 },
    { name: 'W2', pass:  0.08, rush: -0.06 },
    { name: 'W3', pass:  0.14, rush: -0.02 },
    { name: 'W4', pass:  0.09, rush: -0.05 },
    { name: 'W5', pass:  0.16, rush: -0.01 },
    { name: 'W6', pass:  0.11, rush: -0.03 },
    { name: 'W7', pass:  0.10, rush: -0.04 },
    { name: 'W8', pass:  0.13, rush: -0.02 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Avg PPG this slice"  value="22.9" sub="all teams, all weeks" />
        <StatBlock label="Pass rate"           value="59.1%" sub="league average" />
        <StatBlock label="EPA / pass play"     value="+0.12" sub="positive = above expectation" />
        <StatBlock label="EPA / rush play"     value="-0.03" sub="rushing is below break-even" />
      </Grid>
      <Tile title="League average points per game by week" subtitle="Smoothed across all 32 teams" span={12}>
        <LineTile data={ppgByWeek} height={260}
          series={[{ key: 'value', label: 'PPG', color: PALETTE.accent }]}
          formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Grid>
        <Tile title="Pass rate by week" span={3}>
          <BarTile data={passRate} height={220} color={PALETTE.accent2} formatY={v => `${v.toFixed(0)}%`} />
        </Tile>
        <Tile title="EPA per play — pass vs rush" span={3}>
          <LineTile data={epaWeek} xKey="name" height={220}
            series={[
              { key: 'pass', label: 'Pass EPA', color: PALETTE.accent },
              { key: 'rush', label: 'Rush EPA', color: PALETTE.bad },
            ]}
            formatY={v => fmt.signed(v, 2)}
            refLine={{ y: 0, label: 'break-even' }} />
        </Tile>
      </Grid>
    </div>
  )
}

/* ============================================================
 * Tab 04 — Efficiency Leaders
 * ============================================================ */
function Efficiency() {
  const wrEff = [
    { rank: 1,  name: 'Justin Jefferson',  team: 'MIN', routes: 246, tgt: 92, yds: 943, yprr: 3.83, adot: 12.4, sep: 3.2 },
    { rank: 2,  name: "Ja'Marr Chase",     team: 'CIN', routes: 238, tgt: 88, yds: 891, yprr: 3.74, adot: 11.8, sep: 3.4 },
    { rank: 3,  name: 'Nico Collins',      team: 'HOU', routes: 198, tgt: 67, yds: 678, yprr: 3.42, adot: 13.1, sep: 3.1 },
    { rank: 4,  name: 'Puka Nacua',        team: 'LAR', routes: 213, tgt: 71, yds: 696, yprr: 3.27, adot: 9.4,  sep: 3.6 },
    { rank: 5,  name: 'A.J. Brown',        team: 'PHI', routes: 234, tgt: 77, yds: 762, yprr: 3.26, adot: 12.9, sep: 3.0 },
    { rank: 6,  name: 'CeeDee Lamb',       team: 'DAL', routes: 254, tgt: 84, yds: 824, yprr: 3.24, adot: 11.2, sep: 3.3 },
    { rank: 7,  name: 'Cooper Kupp',       team: 'LAR', routes: 152, tgt: 58, yds: 489, yprr: 3.22, adot: 9.8,  sep: 3.7 },
    { rank: 8,  name: 'Brian Thomas Jr.',  team: 'JAX', routes: 184, tgt: 62, yds: 567, yprr: 3.08, adot: 13.4, sep: 3.0 },
    { rank: 9,  name: 'Amon-Ra St. Brown', team: 'DET', routes: 252, tgt: 81, yds: 779, yprr: 3.09, adot: 8.9,  sep: 3.5 },
    { rank: 10, name: 'Tyreek Hill',       team: 'MIA', routes: 234, tgt: 79, yds: 712, yprr: 3.04, adot: 12.1, sep: 3.4 },
  ]
  const cols: Column<typeof wrEff[0]>[] = [
    { key: 'rank',  label: '#',     numeric: true },
    { key: 'name',  label: 'Player' },
    { key: 'team',  label: 'Team' },
    { key: 'routes',label: 'Routes',numeric: true },
    { key: 'tgt',   label: 'Tgt',   numeric: true },
    { key: 'yds',   label: 'Yds',   numeric: true },
    { key: 'yprr',  label: 'YPRR',  numeric: true, format: v => fmt.num(v, 2) },
    { key: 'adot',  label: 'aDOT',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'sep',   label: 'Sep',   numeric: true, format: v => fmt.num(v, 1) },
  ]
  const scatter = wrEff.map(w => ({
    x: w.adot, y: w.yprr, z: w.tgt * 4, label: w.name.split(' ').slice(-1)[0],
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Bulk vs efficiency" value="≠" sub="leaders diverge from yardage leaders" />
        <StatBlock label="YPRR leader"        value="J. Jefferson" sub="3.83 yds/route run" />
        <StatBlock label="Lg YPRR median"     value="1.58" sub="among qualified WRs" />
        <StatBlock label="Lg aDOT median"     value="10.4" sub="depth of target" />
      </Grid>
      <Tile title="aDOT vs YPRR — WR efficiency landscape" subtitle="Bubble size = targets. Top-right corner = elite vertical efficiency." span={12}>
        <ScatterTile data={scatter} xKey="x" yKey="y" zKey="z" height={320}
          formatX={v => fmt.num(v, 1)} formatY={v => fmt.num(v, 2)} />
      </Tile>
      <Tile title="Top 10 efficiency leaders — Wide Receivers" subtitle="Sorted by YPRR" span={12}>
        <DataTable rows={wrEff} columns={cols} defaultSort={{ key: 'yprr', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 05 — Fantasy Leaders
 * ============================================================ */
function Fantasy() {
  const ppr = [
    { rank: 1, name: 'Justin Jefferson',  team: 'MIN', pos: 'WR', g: 8, total: 198.4, avg: 24.8, hi: 31.2, bust: 0 },
    { rank: 2, name: 'Saquon Barkley',    team: 'PHI', pos: 'RB', g: 8, total: 192.1, avg: 24.0, hi: 38.7, bust: 1 },
    { rank: 3, name: 'Christian McCaffrey',team:'SF', pos: 'RB', g: 7, total: 184.6, avg: 26.4, hi: 33.4, bust: 0 },
    { rank: 4, name: "Ja'Marr Chase",     team: 'CIN', pos: 'WR', g: 8, total: 181.7, avg: 22.7, hi: 29.8, bust: 1 },
    { rank: 5, name: 'CeeDee Lamb',       team: 'DAL', pos: 'WR', g: 8, total: 174.2, avg: 21.8, hi: 32.1, bust: 0 },
    { rank: 6, name: 'Derrick Henry',     team: 'BAL', pos: 'RB', g: 8, total: 168.9, avg: 21.1, hi: 34.6, bust: 1 },
    { rank: 7, name: 'Bijan Robinson',    team: 'ATL', pos: 'RB', g: 8, total: 164.1, avg: 20.5, hi: 31.4, bust: 1 },
    { rank: 8, name: 'A.J. Brown',        team: 'PHI', pos: 'WR', g: 8, total: 161.7, avg: 20.2, hi: 27.8, bust: 1 },
    { rank: 9, name: 'Jahmyr Gibbs',      team: 'DET', pos: 'RB', g: 8, total: 158.4, avg: 19.8, hi: 28.6, bust: 1 },
    { rank: 10,name: 'Travis Kelce',      team: 'KC',  pos: 'TE', g: 8, total: 142.3, avg: 17.8, hi: 24.4, bust: 2 },
    { rank: 11,name: 'Brock Bowers',      team: 'LV',  pos: 'TE', g: 8, total: 138.7, avg: 17.3, hi: 23.1, bust: 1 },
    { rank: 12,name: 'Patrick Mahomes',   team: 'KC',  pos: 'QB', g: 8, total: 198.2, avg: 24.8, hi: 31.4, bust: 0 },
    { rank: 13,name: 'Josh Allen',        team: 'BUF', pos: 'QB', g: 8, total: 213.6, avg: 26.7, hi: 38.4, bust: 0 },
    { rank: 14,name: 'Jalen Hurts',       team: 'PHI', pos: 'QB', g: 8, total: 208.1, avg: 26.0, hi: 35.2, bust: 0 },
    { rank: 15,name: 'Lamar Jackson',     team: 'BAL', pos: 'QB', g: 8, total: 224.7, avg: 28.1, hi: 39.6, bust: 0 },
  ]
  const cols: Column<typeof ppr[0]>[] = [
    { key: 'rank', label: '#',    numeric: true },
    { key: 'name', label: 'Player' },
    { key: 'team', label: 'Team' },
    { key: 'pos',  label: 'Pos' },
    { key: 'g',    label: 'G',    numeric: true },
    { key: 'total',label: 'Total',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'avg',  label: 'Avg',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'hi',   label: 'High', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'bust', label: 'Busts',numeric: true },
  ]
  const top10Chart = ppr.slice(0, 10).map(p => ({ name: p.name.split(' ').slice(-1)[0], value: p.avg }))

  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Leaders · League-wide"
        headline="The top of the leaderboard, by scoring format."
        body="Toggle the format. Adjust the slicer rail. The leaderboard recomputes against whatever slice of the season you've defined."
      />
      <Grid>
        <StatBlock label="QB1 (avg)"   value="L. Jackson · 28.1" sub="PPR" />
        <StatBlock label="RB1 (avg)"   value="C. McCaffrey · 26.4" sub="PPR" />
        <StatBlock label="WR1 (avg)"   value="J. Jefferson · 24.8" sub="PPR" />
        <StatBlock label="TE1 (avg)"   value="T. Kelce · 17.8" sub="PPR" />
      </Grid>
      <FormatPicker formats={['PPR','½ PPR','Standard','Superflex','TE prem']} active="PPR" />
      <Tile title="Top 10 fantasy producers — all positions, PPG" subtitle="Toggle the format to recompute." span={12}>
        <BarTile data={top10Chart} height={260} color={PALETTE.accent2} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Full PPR leaderboard" subtitle="Top 15 across all positions" span={12}>
        <DataTable rows={ppr} columns={cols} defaultSort={{ key: 'avg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
