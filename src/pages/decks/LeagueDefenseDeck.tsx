/**
 * League Defense deck — predictive defensive rankings.
 *
 * Per the site's home-page promise: predictive rankings, not cumulative
 * scorebook fiction. Lean on EPA-based and scheme-adjusted metrics over
 * raw allowed yardage. A defense that's faced 10 garbage-time drives
 * shouldn't look elite just because their opponents trailed by 21.
 *
 * Tabs:
 *   01. Overall Rankings        — DVOA-style composite, EPA-weighted
 *   02. Pass Defense Rankings   — by EPA/play, pressure, coverage scheme
 *   03. Run Defense Rankings    — by EPA/play, success rate, stuffed%
 *   04. Matchup Grid            — best & worst matchups by position
 *   05. Fantasy Defense (DST)   — sacks, INTs, return TDs — start/sit
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, ScatterTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function LeagueDefenseDeck() {
  const tabs: DeckTab[] = [
    { id: 'overall',  label: 'Overall Rankings',     render: () => <Overall /> },
    { id: 'pass',     label: 'Pass Defense',         render: () => <PassDef /> },
    { id: 'run',      label: 'Run Defense',          render: () => <RunDef /> },
    { id: 'matchups', label: 'Matchup Grid',         render: () => <Matchups /> },
    { id: 'fantasy',  label: 'Fantasy Defense',      fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="League Defense"
      intro="Predictive rankings, not cumulative scorebook fiction. EPA-weighted and opponent-adjusted, so a defense that's faced ten garbage-time drives doesn't look elite just because their opponents trailed by 21."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={9}
    />
  )
}

/* ============================================================
 * Tab 01 — Overall Rankings
 * ============================================================ */
function Overall() {
  const rankings = [
    { rank:  1, team: 'BAL', composite: 12.4, epa_play: -0.18, pass_rank:  1, run_rank:  3, prev:  2, change: 'up'   },
    { rank:  2, team: 'CLE', composite: 11.8, epa_play: -0.16, pass_rank:  2, run_rank:  5, prev:  1, change: 'down' },
    { rank:  3, team: 'SF',  composite: 11.2, epa_play: -0.14, pass_rank:  3, run_rank:  4, prev:  4, change: 'up'   },
    { rank:  4, team: 'PHI', composite: 10.8, epa_play: -0.12, pass_rank:  6, run_rank:  2, prev:  3, change: 'down' },
    { rank:  5, team: 'NYJ', composite: 10.4, epa_play: -0.10, pass_rank:  4, run_rank:  7, prev:  6, change: 'up'   },
    { rank:  6, team: 'PIT', composite:  9.8, epa_play: -0.08, pass_rank:  7, run_rank:  6, prev:  5, change: 'down' },
    { rank:  7, team: 'GB',  composite:  9.4, epa_play: -0.07, pass_rank:  5, run_rank:  9, prev:  8, change: 'up'   },
    { rank:  8, team: 'KC',  composite:  8.6, epa_play: -0.05, pass_rank:  9, run_rank:  8, prev:  7, change: 'down' },
    { rank:  9, team: 'DEN', composite:  7.8, epa_play: -0.03, pass_rank:  8, run_rank: 11, prev: 11, change: 'up'   },
    { rank: 10, team: 'BUF', composite:  7.4, epa_play: -0.02, pass_rank: 12, run_rank: 10, prev:  9, change: 'down' },
    { rank: 11, team: 'DET', composite:  6.8, epa_play:  0.01, pass_rank: 14, run_rank:  1, prev: 10, change: 'down' },
    { rank: 12, team: 'MIA', composite:  6.2, epa_play:  0.03, pass_rank: 11, run_rank: 13, prev: 13, change: 'up'   },
    { rank: 13, team: 'TB',  composite:  5.4, epa_play:  0.06, pass_rank: 13, run_rank: 14, prev: 12, change: 'down' },
    { rank: 14, team: 'IND', composite:  4.6, epa_play:  0.08, pass_rank: 15, run_rank: 12, prev: 14, change: 'same' },
    { rank: 15, team: 'CIN', composite:  4.2, epa_play:  0.10, pass_rank: 10, run_rank: 18, prev: 15, change: 'same' },
    { rank: 16, team: 'LAR', composite:  3.6, epa_play:  0.12, pass_rank: 17, run_rank: 15, prev: 17, change: 'up'   },
  ]
  const cols: Column<typeof rankings[0]>[] = [
    { key: 'rank',       label: '#',             numeric: true },
    { key: 'team',       label: 'Team' },
    { key: 'composite',  label: 'Composite',     numeric: true, format: v => fmt.num(v, 1) },
    { key: 'epa_play',   label: 'EPA/play',      numeric: true, format: v => fmt.signed(v, 2) },
    { key: 'pass_rank',  label: 'Pass rank',     numeric: true },
    { key: 'run_rank',   label: 'Run rank',      numeric: true },
    { key: 'prev',       label: 'Prev wk',       numeric: true },
    { key: 'change',     label: 'Δ' },
  ]
  const top10 = rankings.slice(0, 10).map(r => ({
    name: r.team, value: r.composite, color: TEAM_COLORS[r.team] || PALETTE.accent,
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="#1 overall"          value="BAL · 12.4" sub="composite score" />
        <StatBlock label="Lg avg EPA/play"     value="0.00" sub="negative = above avg D" />
        <StatBlock label="Biggest riser (wk)"  value="DEN · +2" sub="rank improvement" />
        <StatBlock label="Biggest faller (wk)" value="DET · -1" sub="rank decline" />
      </Grid>
      <Tile title="Composite defensive rating — top 10" subtitle="EPA-weighted + opponent-adjusted" span={12}>
        <BarTile data={top10} height={280} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Overall defensive rankings — top 16" subtitle="Predictive composite, not scorebook" span={12}>
        <DataTable rows={rankings} columns={cols} defaultSort={{ key: 'composite', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 02 — Pass Defense
 * ============================================================ */
function PassDef() {
  const passD = [
    { team: 'BAL', epa_pass: -0.22, ypa_allowed: 5.6, pressure_rt: 32.6, sack_rt: 9.4, blitz_rt: 28.1, ay_allowed: 6.4 },
    { team: 'CLE', epa_pass: -0.18, ypa_allowed: 5.8, pressure_rt: 33.2, sack_rt: 9.1, blitz_rt: 31.4, ay_allowed: 6.7 },
    { team: 'SF',  epa_pass: -0.16, ypa_allowed: 6.1, pressure_rt: 31.4, sack_rt: 8.6, blitz_rt: 18.4, ay_allowed: 6.8 },
    { team: 'NYJ', epa_pass: -0.14, ypa_allowed: 6.2, pressure_rt: 28.4, sack_rt: 7.8, blitz_rt: 27.1, ay_allowed: 7.1 },
    { team: 'GB',  epa_pass: -0.12, ypa_allowed: 6.4, pressure_rt: 26.8, sack_rt: 7.4, blitz_rt: 22.1, ay_allowed: 7.2 },
    { team: 'PHI', epa_pass: -0.10, ypa_allowed: 6.6, pressure_rt: 29.1, sack_rt: 8.2, blitz_rt: 24.6, ay_allowed: 7.4 },
    { team: 'PIT', epa_pass: -0.08, ypa_allowed: 6.8, pressure_rt: 27.6, sack_rt: 7.2, blitz_rt: 29.4, ay_allowed: 7.6 },
    { team: 'DEN', epa_pass: -0.06, ypa_allowed: 7.0, pressure_rt: 26.4, sack_rt: 6.8, blitz_rt: 25.4, ay_allowed: 7.8 },
    { team: 'KC',  epa_pass: -0.04, ypa_allowed: 7.2, pressure_rt: 25.4, sack_rt: 6.4, blitz_rt: 26.4, ay_allowed: 8.0 },
    { team: 'CIN', epa_pass: -0.02, ypa_allowed: 7.4, pressure_rt: 24.8, sack_rt: 6.1, blitz_rt: 23.1, ay_allowed: 8.2 },
    { team: 'MIA', epa_pass:  0.00, ypa_allowed: 7.5, pressure_rt: 24.1, sack_rt: 5.8, blitz_rt: 21.4, ay_allowed: 8.4 },
    { team: 'BUF', epa_pass:  0.02, ypa_allowed: 7.6, pressure_rt: 23.8, sack_rt: 5.4, blitz_rt: 20.6, ay_allowed: 8.6 },
  ]
  const cols: Column<typeof passD[0]>[] = [
    { key: 'team',         label: 'Team' },
    { key: 'epa_pass',     label: 'EPA/pass',      numeric: true, format: v => fmt.signed(v, 2) },
    { key: 'ypa_allowed',  label: 'Y/A allowed',   numeric: true, format: v => fmt.num(v, 1) },
    { key: 'ay_allowed',   label: 'aDOT allowed',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'pressure_rt',  label: 'Pressure%',     numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'sack_rt',      label: 'Sack%',         numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'blitz_rt',     label: 'Blitz%',        numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const epaPass = passD.map(p => ({ name: p.team, value: p.epa_pass }))
  const pressVsSack = passD.slice(0, 10).map(p => ({
    x: p.pressure_rt, y: p.sack_rt, z: 200, label: p.team,
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Best EPA/pass D"   value="BAL · -0.22" sub="leagues above mean" />
        <StatBlock label="Best pressure D"   value="CLE · 33.2%" sub="of dropbacks" />
        <StatBlock label="Lg avg sack rate"  value="7.4%"        sub="of dropbacks" />
        <StatBlock label="Most blitz-happy"  value="DET · 32.6%" sub="of dropbacks" />
      </Grid>
      <Tile title="EPA per pass allowed — top 12 defenses" subtitle="Most negative = best pass D" span={12}>
        <BarTile data={epaPass} height={280} color={PALETTE.bad} formatY={v => fmt.signed(v, 2)} />
      </Tile>
      <Tile title="Pressure rate vs sack conversion" subtitle="Bubble = team. Top-right = elite finishers." span={12}>
        <ScatterTile data={pressVsSack} xKey="x" yKey="y" zKey="z" height={300}
          formatX={v => `${v.toFixed(1)}%`} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Pass defense rankings — top 12" span={12}>
        <DataTable rows={passD} columns={cols} defaultSort={{ key: 'epa_pass', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 03 — Run Defense
 * ============================================================ */
function RunDef() {
  const runD = [
    { team: 'DET', epa_run: -0.14, ypc_allowed: 3.4, stuff_rt: 24.6, suc_rt: 38.4, exp_rt: 6.8, gap_int: 78.4 },
    { team: 'PHI', epa_run: -0.12, ypc_allowed: 3.6, stuff_rt: 22.4, suc_rt: 39.2, exp_rt: 7.4, gap_int: 76.2 },
    { team: 'BAL', epa_run: -0.10, ypc_allowed: 3.8, stuff_rt: 21.4, suc_rt: 40.1, exp_rt: 7.8, gap_int: 74.6 },
    { team: 'SF',  epa_run: -0.09, ypc_allowed: 3.9, stuff_rt: 20.8, suc_rt: 40.8, exp_rt: 8.1, gap_int: 73.4 },
    { team: 'CLE', epa_run: -0.08, ypc_allowed: 4.0, stuff_rt: 20.2, suc_rt: 41.4, exp_rt: 8.4, gap_int: 72.1 },
    { team: 'PIT', epa_run: -0.06, ypc_allowed: 4.1, stuff_rt: 19.6, suc_rt: 42.1, exp_rt: 8.7, gap_int: 71.4 },
    { team: 'NYJ', epa_run: -0.04, ypc_allowed: 4.2, stuff_rt: 18.8, suc_rt: 42.8, exp_rt: 9.1, gap_int: 70.2 },
    { team: 'KC',  epa_run: -0.02, ypc_allowed: 4.3, stuff_rt: 18.2, suc_rt: 43.4, exp_rt: 9.4, gap_int: 69.4 },
    { team: 'GB',  epa_run:  0.00, ypc_allowed: 4.4, stuff_rt: 17.6, suc_rt: 44.1, exp_rt: 9.8, gap_int: 68.6 },
    { team: 'BUF', epa_run:  0.02, ypc_allowed: 4.5, stuff_rt: 17.1, suc_rt: 44.8, exp_rt: 10.2,gap_int: 67.8 },
    { team: 'IND', epa_run:  0.04, ypc_allowed: 4.6, stuff_rt: 16.4, suc_rt: 45.4, exp_rt: 10.6,gap_int: 66.4 },
    { team: 'DEN', epa_run:  0.06, ypc_allowed: 4.7, stuff_rt: 15.8, suc_rt: 46.1, exp_rt: 11.1,gap_int: 65.2 },
  ]
  const cols: Column<typeof runD[0]>[] = [
    { key: 'team',         label: 'Team' },
    { key: 'epa_run',      label: 'EPA/run',        numeric: true, format: v => fmt.signed(v, 2) },
    { key: 'ypc_allowed',  label: 'YPC allowed',    numeric: true, format: v => fmt.num(v, 1) },
    { key: 'stuff_rt',     label: 'Stuff%',         numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'suc_rt',       label: 'Suc% allowed',   numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'exp_rt',       label: 'Explosive%',     numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'gap_int',      label: 'Gap integrity',  numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const epaRun = runD.map(r => ({ name: r.team, value: r.epa_run }))
  const stuffVsExp = runD.slice(0, 10).map(r => ({
    name: r.team, stuff: r.stuff_rt, exp: r.exp_rt,
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Best EPA/run D"    value="DET · -0.14" sub="opponent-adjusted" />
        <StatBlock label="Best stuff rate"   value="DET · 24.6%" sub="runs ≤ 0 yds" />
        <StatBlock label="Lg avg YPC allowed"value="4.3"         sub="among shown teams" />
        <StatBlock label="Lg avg gap integ"  value="71.0%"       sub="run defense discipline" />
      </Grid>
      <Tile title="EPA per rush allowed — top 12 defenses" subtitle="Most negative = best run D" span={12}>
        <BarTile data={epaRun} height={280} color={PALETTE.bad} formatY={v => fmt.signed(v, 2)} />
      </Tile>
      <Tile title="Stuff rate vs explosive run rate — top 10" subtitle="High stuff + low explosive = elite run D" span={12}>
        <StackedBarTile data={stuffVsExp} xKey="name" height={260}
          series={[
            { key: 'stuff', label: 'Stuff% (good)',     color: PALETTE.ok  },
            { key: 'exp',   label: 'Explosive% (bad)',  color: PALETTE.bad },
          ]} />
      </Tile>
      <Tile title="Run defense rankings — top 12" span={12}>
        <DataTable rows={runD} columns={cols} defaultSort={{ key: 'epa_run', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 04 — Matchup Grid
 * ============================================================ */
function Matchups() {
  // Best/worst matchups by position — a fantasy-scouting tool
  const matchupsQB = [
    { team: 'HOU', vs_qb_fp: 22.4, rank: 30, last3: 25.8, trend: 'up'   },
    { team: 'NYJ', vs_qb_fp: 23.1, rank: 31, last3: 24.4, trend: 'up'   },
    { team: 'DEN', vs_qb_fp: 21.6, rank: 28, last3: 23.2, trend: 'up'   },
    { team: 'KC',  vs_qb_fp: 20.2, rank: 24, last3: 21.4, trend: 'same' },
    { team: 'PHI', vs_qb_fp: 19.4, rank: 22, last3: 20.6, trend: 'down' },
  ]
  const matchupsRB = [
    { team: 'HOU', vs_rb_fp: 22.8, rank: 31, last3: 24.4, trend: 'up'   },
    { team: 'BUF', vs_rb_fp: 21.4, rank: 28, last3: 22.8, trend: 'up'   },
    { team: 'GB',  vs_rb_fp: 20.2, rank: 26, last3: 21.6, trend: 'same' },
    { team: 'SF',  vs_rb_fp: 19.4, rank: 23, last3: 18.4, trend: 'down' },
    { team: 'PIT', vs_rb_fp: 18.6, rank: 21, last3: 19.4, trend: 'up'   },
  ]
  const matchupsWR = [
    { team: 'HOU', vs_wr_fp: 36.8, rank: 32, last3: 38.4, trend: 'up'   },
    { team: 'KC',  vs_wr_fp: 35.4, rank: 30, last3: 36.2, trend: 'up'   },
    { team: 'DEN', vs_wr_fp: 34.2, rank: 28, last3: 33.6, trend: 'same' },
    { team: 'PIT', vs_wr_fp: 32.8, rank: 26, last3: 34.1, trend: 'up'   },
    { team: 'GB',  vs_wr_fp: 31.4, rank: 24, last3: 30.2, trend: 'down' },
  ]
  const matchupsTE = [
    { team: 'HOU', vs_te_fp: 16.4, rank: 31, last3: 17.8, trend: 'up'   },
    { team: 'DEN', vs_te_fp: 15.1, rank: 29, last3: 16.4, trend: 'up'   },
    { team: 'GB',  vs_te_fp: 13.8, rank: 26, last3: 14.6, trend: 'same' },
    { team: 'KC',  vs_te_fp: 12.6, rank: 24, last3: 13.2, trend: 'down' },
    { team: 'PIT', vs_te_fp: 11.4, rank: 22, last3: 12.4, trend: 'up'   },
  ]
  const qbCols: Column<typeof matchupsQB[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'rank',     label: '#',            numeric: true },
    { key: 'vs_qb_fp', label: 'FP/G allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'last3',    label: 'Last 3',       numeric: true, format: v => fmt.num(v, 1) },
    { key: 'trend',    label: 'Trend' },
  ]
  const rbCols: Column<typeof matchupsRB[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'rank',     label: '#',            numeric: true },
    { key: 'vs_rb_fp', label: 'FP/G allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'last3',    label: 'Last 3',       numeric: true, format: v => fmt.num(v, 1) },
    { key: 'trend',    label: 'Trend' },
  ]
  const wrCols: Column<typeof matchupsWR[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'rank',     label: '#',            numeric: true },
    { key: 'vs_wr_fp', label: 'FP/G allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'last3',    label: 'Last 3',       numeric: true, format: v => fmt.num(v, 1) },
    { key: 'trend',    label: 'Trend' },
  ]
  const teCols: Column<typeof matchupsTE[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'rank',     label: '#',            numeric: true },
    { key: 'vs_te_fp', label: 'FP/G allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'last3',    label: 'Last 3',       numeric: true, format: v => fmt.num(v, 1) },
    { key: 'trend',    label: 'Trend' },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Best QB matchup"  value="HOU · 22.4 FP" sub="DET defense ranks 30th vs QB" />
        <StatBlock label="Best RB matchup"  value="HOU · 22.8 FP" sub="bottom-3 run D" />
        <StatBlock label="Best WR matchup"  value="HOU · 36.8 FP" sub="bottom-3 pass D" />
        <StatBlock label="Best TE matchup"  value="HOU · 16.4 FP" sub="bottom-3 TE D" />
      </Grid>
      <Grid>
        <Tile title="Best matchups vs QB" subtitle="Bottom-5 defenses against QBs" span={3}>
          <DataTable rows={matchupsQB} columns={qbCols} defaultSort={{ key: 'vs_qb_fp', dir: 'desc' }} />
        </Tile>
        <Tile title="Best matchups vs RB" subtitle="Bottom-5 defenses against RBs" span={3}>
          <DataTable rows={matchupsRB} columns={rbCols} defaultSort={{ key: 'vs_rb_fp', dir: 'desc' }} />
        </Tile>
      </Grid>
      <Grid>
        <Tile title="Best matchups vs WR" subtitle="Bottom-5 defenses against WRs" span={3}>
          <DataTable rows={matchupsWR} columns={wrCols} defaultSort={{ key: 'vs_wr_fp', dir: 'desc' }} />
        </Tile>
        <Tile title="Best matchups vs TE" subtitle="Bottom-5 defenses against TEs" span={3}>
          <DataTable rows={matchupsTE} columns={teCols} defaultSort={{ key: 'vs_te_fp', dir: 'desc' }} />
        </Tile>
      </Grid>
    </div>
  )
}

/* ============================================================
 * Tab 05 — Fantasy DST
 * ============================================================ */
function Fantasy() {
  const dst = [
    { rank:  1, team: 'BAL', fpg: 11.4, sk: 28, int: 8, fr: 4, td: 2, sty: 1, pa: 16.2 },
    { rank:  2, team: 'CLE', fpg: 10.8, sk: 31, int: 6, fr: 5, td: 1, sty: 2, pa: 18.4 },
    { rank:  3, team: 'PIT', fpg: 10.2, sk: 26, int: 7, fr: 3, td: 2, sty: 0, pa: 17.6 },
    { rank:  4, team: 'SF',  fpg:  9.6, sk: 24, int: 8, fr: 2, td: 1, sty: 1, pa: 19.1 },
    { rank:  5, team: 'PHI', fpg:  9.2, sk: 27, int: 5, fr: 4, td: 2, sty: 0, pa: 19.4 },
    { rank:  6, team: 'GB',  fpg:  8.8, sk: 23, int: 9, fr: 3, td: 1, sty: 1, pa: 20.1 },
    { rank:  7, team: 'NYJ', fpg:  8.4, sk: 25, int: 6, fr: 4, td: 1, sty: 0, pa: 20.6 },
    { rank:  8, team: 'KC',  fpg:  8.1, sk: 22, int: 7, fr: 3, td: 1, sty: 0, pa: 20.8 },
    { rank:  9, team: 'DET', fpg:  7.6, sk: 21, int: 6, fr: 4, td: 1, sty: 1, pa: 22.4 },
    { rank: 10, team: 'BUF', fpg:  7.2, sk: 20, int: 8, fr: 2, td: 0, sty: 0, pa: 22.8 },
    { rank: 11, team: 'MIA', fpg:  6.8, sk: 19, int: 7, fr: 3, td: 0, sty: 1, pa: 23.4 },
    { rank: 12, team: 'DEN', fpg:  6.4, sk: 18, int: 5, fr: 4, td: 1, sty: 0, pa: 24.1 },
    { rank: 13, team: 'TB',  fpg:  6.1, sk: 21, int: 4, fr: 3, td: 0, sty: 1, pa: 24.6 },
    { rank: 14, team: 'CIN', fpg:  5.8, sk: 17, int: 6, fr: 2, td: 0, sty: 0, pa: 25.2 },
    { rank: 15, team: 'LAR', fpg:  5.4, sk: 19, int: 4, fr: 3, td: 0, sty: 0, pa: 25.8 },
  ]
  const cols: Column<typeof dst[0]>[] = [
    { key: 'rank',  label: '#',       numeric: true },
    { key: 'team',  label: 'Team' },
    { key: 'fpg',   label: 'FP/G',    numeric: true, format: v => fmt.num(v, 1) },
    { key: 'sk',    label: 'Sacks',   numeric: true },
    { key: 'int',   label: 'INTs',    numeric: true },
    { key: 'fr',    label: 'FR',      numeric: true },
    { key: 'td',    label: 'D TDs',   numeric: true },
    { key: 'sty',   label: 'Safety',  numeric: true },
    { key: 'pa',    label: 'PA/G',    numeric: true, format: v => fmt.num(v, 1) },
  ]
  const fpgChart = dst.map(d => ({ name: d.team, value: d.fpg, color: TEAM_COLORS[d.team] || PALETTE.accent }))
  const sackInts = dst.slice(0, 10).map(d => ({ name: d.team, sk: d.sk, int: d.int }))

  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Defense · DST"
        headline="Sacks + turnovers + return TDs — and matchup."
        body="DST scoring is bursty by nature. The leaderboard shows season totals, but DST is best streamed against bottom-tier offenses. Pair this with the matchup grid above to find single-week edges."
      />
      <Grid>
        <StatBlock label="DST1"            value="BAL · 11.4" sub="FP/G" />
        <StatBlock label="Sack leader"     value="CLE · 31"   sub="defensive sacks" />
        <StatBlock label="INT leader"      value="GB · 9"     sub="defensive INTs" />
        <StatBlock label="D-TD leader"     value="BAL/PHI · 2"sub="defensive TDs" />
      </Grid>
      <FormatPicker formats={['Standard', '½ PPR', 'PPR', 'IDP']} active="Standard" />
      <Tile title="DST fantasy points per game — top 15" subtitle="Where to start/stream" span={12}>
        <BarTile data={fpgChart} height={280} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Sacks vs interceptions — top 10" subtitle="The big-play axis" span={12}>
        <StackedBarTile data={sackInts} xKey="name" height={260}
          series={[
            { key: 'sk',  label: 'Sacks', color: PALETTE.accent  },
            { key: 'int', label: 'INTs',  color: PALETTE.accent2 },
          ]} />
      </Tile>
      <Tile title="Fantasy DST leaderboard — top 15" span={12}>
        <DataTable rows={dst} columns={cols} defaultSort={{ key: 'fpg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
