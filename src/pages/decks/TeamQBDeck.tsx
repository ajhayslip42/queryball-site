/**
 * Team QB deck — how each team uses its quarterback.
 *
 * Tabs:
 *   01. QB Usage Profile     — dropbacks, scramble rate, play-action, shotgun, no-huddle
 *   02. Target Distribution  — who the QB throws to
 *   03. Pressure & Pocket    — pressure response, sack rate, time-to-throw
 *   04. Situational QB       — 3rd-down, RZ, 2-minute, closing
 *   05. Fantasy Implications — team-level QB fantasy outlook
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, DonutTile, ScatterTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function TeamQBDeck() {
  const tabs: DeckTab[] = [
    { id: 'usage',       label: 'QB Usage Profile',     render: () => <Usage /> },
    { id: 'distribution',label: 'Target Distribution',  render: () => <Distribution /> },
    { id: 'pressure',    label: 'Pressure & Pocket',    render: () => <Pressure /> },
    { id: 'situational', label: 'Situational',          render: () => <Situational /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="Team — Quarterback"
      intro="How each team uses its QB. Dropback volume, target distribution, scramble rate, pressure response, and the situations where the QB is asked to win the game."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={2}
    />
  )
}

/* Tab 01 — Usage */
function Usage() {
  const teamUsage = [
    { team: 'BUF', db: 281, dbg: 35.1, sr: 8.2, par: 24.1, sg: 76.3, nh: 12.4 },
    { team: 'KC',  db: 274, dbg: 34.3, sr: 6.4, par: 22.8, sg: 82.1, nh:  9.6 },
    { team: 'CIN', db: 286, dbg: 35.8, sr: 4.1, par: 21.4, sg: 78.6, nh:  8.2 },
    { team: 'LAR', db: 268, dbg: 33.5, sr: 3.8, par: 28.9, sg: 74.2, nh:  6.7 },
    { team: 'BAL', db: 258, dbg: 32.3, sr: 14.2,par: 26.1, sg: 71.4, nh:  7.1 },
    { team: 'PHI', db: 248, dbg: 31.0, sr: 11.8,par: 19.6, sg: 68.4, nh: 14.2 },
    { team: 'DET', db: 254, dbg: 31.8, sr: 4.6, par: 31.2, sg: 72.6, nh:  5.8 },
    { team: 'SF',  db: 242, dbg: 30.3, sr: 5.2, par: 32.4, sg: 64.8, nh:  4.6 },
    { team: 'MIA', db: 261, dbg: 32.6, sr: 6.8, par: 25.7, sg: 79.4, nh: 11.2 },
    { team: 'HOU', db: 257, dbg: 32.1, sr: 8.4, par: 22.3, sg: 75.8, nh:  7.9 },
    { team: 'GB',  db: 246, dbg: 30.8, sr: 7.2, par: 21.8, sg: 73.1, nh:  6.4 },
    { team: 'MIN', db: 263, dbg: 32.9, sr: 3.4, par: 24.6, sg: 76.7, nh:  8.8 },
  ]
  const cols: Column<typeof teamUsage[0]>[] = [
    { key: 'team', label: 'Team' },
    { key: 'db',   label: 'Dropbacks', numeric: true },
    { key: 'dbg',  label: 'DB/G',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'sr',   label: 'Scram%',numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'par',  label: 'PA%',   numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'sg',   label: 'SG%',   numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'nh',   label: 'NH%',   numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const dbChart = teamUsage.slice(0, 12).map(t => ({ name: t.team, value: t.dbg, color: TEAM_COLORS[t.team] || PALETTE.accent }))
  const sgVsHud = [
    { name: 'Shotgun',  value: 74.6, color: PALETTE.accent  },
    { name: 'Under-C',  value: 25.4, color: PALETTE.accent2 },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg DB/G"      value="32.4" sub="dropbacks per game" />
        <StatBlock label="Lg avg scramble%" value="6.8%"  sub="of dropbacks" />
        <StatBlock label="Lg avg PA%"       value="24.6%" sub="play-action rate" />
        <StatBlock label="Most pass-happy"  value="CIN" sub="35.8 DB/G" />
      </Grid>
      <Grid>
        <Tile title="Dropbacks per game — top 12" span={4}>
          <BarTile data={dbChart} height={260} formatY={v => fmt.num(v, 1)} />
        </Tile>
        <Tile title="League snap mix" subtitle="All teams averaged" span={2}>
          <DonutTile data={sgVsHud} height={260} />
        </Tile>
      </Grid>
      <Tile title="QB usage profile — all teams" subtitle="Sortable. Adjust slicers for slice-level breakdowns." span={12}>
        <DataTable rows={teamUsage} columns={cols} defaultSort={{ key: 'dbg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 02 — Distribution */
function Distribution() {
  const kcDist = [
    { name: 'Kelce',    pos: 'TE', tgt: 78, share: 27.4 },
    { name: 'Rice',     pos: 'WR', tgt: 64, share: 22.5 },
    { name: 'Worthy',   pos: 'WR', tgt: 41, share: 14.4 },
    { name: 'Pacheco',  pos: 'RB', tgt: 28, share:  9.8 },
    { name: 'Brown',    pos: 'WR', tgt: 24, share:  8.4 },
    { name: 'Other',    pos: '–',  tgt: 49, share: 17.5 },
  ]
  const byPos = [
    { name: 'WR', value: 58.4, color: '#3F8060' },
    { name: 'TE', value: 22.1, color: '#A0594B' },
    { name: 'RB', value: 17.2, color: '#2A3B47' },
    { name: 'FB', value:  2.3, color: '#6191A5' },
  ]
  const depth = [
    { name: 'Behind LOS', value: 18.2 },
    { name: 'Short (0–9)', value: 47.6 },
    { name: 'Int (10–19)', value: 24.1 },
    { name: 'Deep (20+)',  value: 10.1 },
  ]
  const cols: Column<typeof kcDist[0]>[] = [
    { key: 'name',  label: 'Receiver' },
    { key: 'pos',   label: 'Pos' },
    { key: 'tgt',   label: 'Tgt', numeric: true },
    { key: 'share', label: 'Share%', numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg WR tgt share" value="58.4%" sub="of all team targets" />
        <StatBlock label="Lg avg TE tgt share" value="22.1%" sub="of all team targets" />
        <StatBlock label="Lg avg deep rate"    value="10.1%" sub="targets 20+ yds downfield" />
        <StatBlock label="Lg avg checkdown"    value="18.2%" sub="targets behind LOS" />
      </Grid>
      <Grid>
        <Tile title="League-wide targets by position" subtitle="Slice-adjusted share" span={2}>
          <DonutTile data={byPos} height={240} />
        </Tile>
        <Tile title="Targets by depth — league" span={4}>
          <BarTile data={depth} height={240} color={PALETTE.accent} formatY={v => `${v}%`} />
        </Tile>
      </Grid>
      <Tile title="Example: KC target distribution" subtitle="Toggle team via slicer rail" span={12}>
        <DataTable rows={kcDist} columns={cols} defaultSort={{ key: 'tgt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 03 — Pressure & Pocket */
function Pressure() {
  const teamPress = [
    { team: 'KC',  pres: 28.4, sk: 4.2, ttt: 2.61, ypa_cl: 8.4, ypa_pr: 5.1 },
    { team: 'BUF', pres: 26.1, sk: 3.8, ttt: 2.54, ypa_cl: 8.7, ypa_pr: 5.6 },
    { team: 'CIN', pres: 31.6, sk: 5.4, ttt: 2.78, ypa_cl: 8.9, ypa_pr: 4.9 },
    { team: 'BAL', pres: 24.2, sk: 3.1, ttt: 2.48, ypa_cl: 8.6, ypa_pr: 5.8 },
    { team: 'PHI', pres: 27.8, sk: 4.6, ttt: 2.62, ypa_cl: 8.1, ypa_pr: 4.7 },
    { team: 'DET', pres: 22.4, sk: 2.8, ttt: 2.41, ypa_cl: 8.5, ypa_pr: 6.1 },
    { team: 'SF',  pres: 23.6, sk: 3.4, ttt: 2.46, ypa_cl: 8.3, ypa_pr: 5.7 },
    { team: 'GB',  pres: 29.1, sk: 4.8, ttt: 2.67, ypa_cl: 7.9, ypa_pr: 4.6 },
    { team: 'HOU', pres: 30.4, sk: 5.1, ttt: 2.72, ypa_cl: 8.0, ypa_pr: 4.5 },
    { team: 'LAR', pres: 25.7, sk: 4.0, ttt: 2.56, ypa_cl: 8.2, ypa_pr: 5.2 },
  ]
  const cols: Column<typeof teamPress[0]>[] = [
    { key: 'team',   label: 'Team' },
    { key: 'pres',   label: 'Press%',numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'sk',     label: 'Sack%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'ttt',    label: 'TTT',   numeric: true, format: v => fmt.num(v, 2) },
    { key: 'ypa_cl', label: 'Y/A cln',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'ypa_pr', label: 'Y/A prs',numeric: true, format: v => fmt.num(v, 1) },
  ]
  const presChart = teamPress.map(t => ({ name: t.team, value: t.pres }))
  const cleanVsPress = teamPress.slice(0, 8).map(t => ({
    name: t.team, clean: t.ypa_cl, press: t.ypa_pr,
  }))
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg pressure%"  value="26.9%" sub="of QB dropbacks" />
        <StatBlock label="Lg avg sack rate"  value="4.1%"  sub="of dropbacks" />
        <StatBlock label="Lg avg TTT"        value="2.59s" sub="time to throw" />
        <StatBlock label="Y/A clean → press" value="8.4 → 5.3" sub="lg average" />
      </Grid>
      <Tile title="Pressure rate by team" subtitle="% of dropbacks under pressure" span={12}>
        <BarTile data={presChart} height={260} color={PALETTE.bad} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Y/A: clean pocket vs pressured" subtitle="Side-by-side, top 8 teams" span={12}>
        <StackedBarTile data={cleanVsPress} xKey="name" height={260}
          series={[
            { key: 'clean', label: 'Y/A clean', color: PALETTE.accent },
            { key: 'press', label: 'Y/A pressured', color: PALETTE.bad },
          ]} />
      </Tile>
      <Tile title="Pressure response — full table" span={12}>
        <DataTable rows={teamPress} columns={cols} defaultSort={{ key: 'sk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* Tab 04 — Situational */
function Situational() {
  const sit = [
    { team: 'BAL', t3rd: 48.2, rztd: 64.1, twomin: 71.3, fourthq: 9.6 },
    { team: 'BUF', t3rd: 46.7, rztd: 62.4, twomin: 73.1, fourthq: 8.9 },
    { team: 'KC',  t3rd: 44.1, rztd: 68.4, twomin: 78.6, fourthq: 11.2 },
    { team: 'CIN', t3rd: 43.6, rztd: 58.1, twomin: 64.2, fourthq: 8.4 },
    { team: 'DET', t3rd: 45.8, rztd: 66.2, twomin: 67.1, fourthq: 7.8 },
    { team: 'PHI', t3rd: 42.4, rztd: 59.7, twomin: 62.8, fourthq: 9.1 },
    { team: 'SF',  t3rd: 41.2, rztd: 61.4, twomin: 65.3, fourthq: 7.4 },
    { team: 'MIA', t3rd: 40.6, rztd: 54.8, twomin: 68.4, fourthq: 8.2 },
    { team: 'LAR', t3rd: 39.8, rztd: 57.2, twomin: 61.6, fourthq: 6.9 },
    { team: 'HOU', t3rd: 38.4, rztd: 52.6, twomin: 63.7, fourthq: 7.1 },
  ]
  const cols: Column<typeof sit[0]>[] = [
    { key: 'team',    label: 'Team' },
    { key: 't3rd',    label: '3rd Conv%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'rztd',    label: 'RZ TD%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'twomin',  label: '2-min Suc%',numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'fourthq', label: 'Q4 PPG',    numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg 3rd-down conv%" value="41.2%" sub="all situations" />
        <StatBlock label="Lg RZ TD%"          value="58.6%" sub="of RZ trips" />
        <StatBlock label="Lg 2-min success"   value="66.4%" sub="successful drives" />
        <StatBlock label="Q4 PPG leader"      value="KC · 11.2" sub="closing offense" />
      </Grid>
      <Tile title="3rd-down conversion rate by team" subtitle="High-leverage QB performance" span={12}>
        <BarTile data={sit.map(s => ({ name: s.team, value: s.t3rd }))} height={260} color={PALETTE.accent} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Red-zone TD% by team" subtitle="Where points are actually scored" span={12}>
        <BarTile data={sit.map(s => ({ name: s.team, value: s.rztd }))} height={260} color={PALETTE.ok} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Situational performance — full table" span={12}>
        <DataTable rows={sit} columns={cols} defaultSort={{ key: 'rztd', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 05 — Fantasy */
function Fantasy() {
  const ranks = [
    { rank: 1, team: 'BAL', qb: 'L. Jackson',  fpg: 28.1, hi: 39.6, lo: 18.2, fmt_lead: 'Rush-heavy' },
    { rank: 2, team: 'BUF', qb: 'J. Allen',    fpg: 26.7, hi: 38.4, lo: 17.4, fmt_lead: 'Balanced' },
    { rank: 3, team: 'PHI', qb: 'J. Hurts',    fpg: 26.0, hi: 35.2, lo: 18.6, fmt_lead: 'TD-vulture' },
    { rank: 4, team: 'KC',  qb: 'P. Mahomes',  fpg: 24.8, hi: 31.4, lo: 18.4, fmt_lead: 'Volume passer' },
    { rank: 5, team: 'CIN', qb: 'J. Burrow',   fpg: 23.4, hi: 32.1, lo: 14.6, fmt_lead: 'Pass-heavy' },
    { rank: 6, team: 'DET', qb: 'J. Goff',     fpg: 22.6, hi: 30.4, lo: 14.2, fmt_lead: 'Volume passer' },
    { rank: 7, team: 'WAS', qb: 'J. Daniels',  fpg: 22.1, hi: 31.8, lo: 13.4, fmt_lead: 'Rushing upside' },
    { rank: 8, team: 'HOU', qb: 'C.J. Stroud', fpg: 21.4, hi: 28.7, lo: 13.6, fmt_lead: 'Pocket passer' },
    { rank: 9, team: 'MIA', qb: 'T. Tagovailoa',fpg:20.8, hi: 27.2, lo: 12.4, fmt_lead: 'Volume passer' },
    { rank: 10,team: 'GB',  qb: 'J. Love',     fpg: 20.4, hi: 29.6, lo: 11.7, fmt_lead: 'Variance' },
  ]
  const cols: Column<typeof ranks[0]>[] = [
    { key: 'rank',     label: '#',  numeric: true },
    { key: 'team',     label: 'Team' },
    { key: 'qb',       label: 'QB' },
    { key: 'fpg',      label: 'FP/G', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'hi',       label: 'High', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'lo',       label: 'Low',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'fmt_lead', label: 'Profile' },
  ]
  const fpgChart = ranks.map(r => ({ name: r.team, value: r.fpg, color: TEAM_COLORS[r.team] || PALETTE.accent }))
  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Implications · QB"
        headline="Which QBs to target, by team profile."
        body="QB fantasy production has two drivers: passing volume and rushing upside. The leaderboard sorts by FP/G; the profile column hints at which kind of QB this is."
      />
      <Grid>
        <StatBlock label="QB1 (avg)"       value="L. Jackson · 28.1" sub="rushing-driven ceiling" />
        <StatBlock label="QB1 (passing only)"value="J. Allen · 21.4" sub="non-rush FP" />
        <StatBlock label="Avg QB1–12 FP/G" value="23.7" sub="weekly starting baseline" />
        <StatBlock label="Avg QB13–24 FP/G"value="17.4" sub="streaming territory" />
      </Grid>
      <FormatPicker formats={['Std (4-pt)', '6-pt pass', '½ PPR', 'Superflex']} active="6-pt pass" />
      <Tile title="QB FP/G by team" subtitle="The fantasy version of the depth chart" span={12}>
        <BarTile data={fpgChart} height={260} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Top 10 QB fantasy outlook" span={12}>
        <DataTable rows={ranks} columns={cols} defaultSort={{ key: 'fpg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
