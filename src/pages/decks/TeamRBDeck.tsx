/**
 * Team RB deck — how each team rations its backfield.
 *
 * Tabs:
 *   01. Carry Distribution     — which back gets the work
 *   02. Goal-Line & Red Zone   — high-leverage touches
 *   03. Pass-Catching Role     — routes, targets, third-down usage
 *   04. Backfield Efficiency   — YPC, contact, success rate
 *   05. Fantasy Implications   — RB1 vs RB2 workload security
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, DonutTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function TeamRBDeck() {
  const tabs: DeckTab[] = [
    { id: 'carries',     label: 'Carry Distribution',   render: () => <Carries /> },
    { id: 'goalline',    label: 'Goal-Line & Red Zone', render: () => <GoalLine /> },
    { id: 'passing-game',label: 'Pass-Catching Role',   render: () => <PassGame /> },
    { id: 'efficiency',  label: 'Backfield Efficiency', render: () => <Efficiency /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="Team — Running Backs"
      intro="How each team rations its backfield. Carry distribution, goal-line work, third-down pass-catching role, efficiency by gap, and where the high-leverage touches actually go."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={3}
    />
  )
}

/* Tab 01 — Carries */
function Carries() {
  const phiBackfield = [
    { name: 'S. Barkley',    role: 'RB1', share: 76.2, car: 162, ypg: 89.4, snap_pct: 71.4 },
    { name: 'K. Gainwell',   role: 'RB2', share: 18.4, car:  39, ypg: 18.7, snap_pct: 22.1 },
    { name: 'W. Shipley',    role: 'RB3', share:  5.4, car:  11, ypg:  5.2, snap_pct:  6.5 },
  ]
  const cols: Column<typeof phiBackfield[0]>[] = [
    { key: 'name', label: 'Player' },
    { key: 'role', label: 'Role' },
    { key: 'share',label: 'Car Share%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'car',  label: 'Carries',    numeric: true },
    { key: 'ypg',  label: 'Yds/G',      numeric: true, format: v => fmt.num(v, 1) },
    { key: 'snap_pct',label: 'Snap%',   numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const concentration = [
    { team: 'BAL', rb1: 78.4, rb2: 14.2, rb3: 7.4 },
    { team: 'PHI', rb1: 76.2, rb2: 18.4, rb3: 5.4 },
    { team: 'IND', rb1: 71.8, rb2: 22.1, rb3: 6.1 },
    { team: 'JAX', rb1: 68.4, rb2: 24.6, rb3: 7.0 },
    { team: 'TEN', rb1: 62.4, rb2: 28.1, rb3: 9.5 },
    { team: 'DET', rb1: 56.4, rb2: 39.2, rb3: 4.4 },
    { team: 'SF',  rb1: 54.2, rb2: 31.4, rb3: 14.4},
    { team: 'MIA', rb1: 52.7, rb2: 34.2, rb3: 13.1},
    { team: 'ATL', rb1: 78.6, rb2: 15.1, rb3: 6.3 },
    { team: 'CHI', rb1: 64.8, rb2: 26.4, rb3: 8.8 },
  ]
  const teamShares = concentration.map(t => ({ name: t.team, rb1: t.rb1, rb2: t.rb2, rb3: t.rb3 }))
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg RB1 share" value="64.7%" sub="of team carries" />
        <StatBlock label="Lg avg RB2 share" value="26.4%" sub="of team carries" />
        <StatBlock label="Most concentrated"value="ATL · 78.6%" sub="Bijan dominant" />
        <StatBlock label="Most committee"   value="MIA · 52.7%" sub="Achane/Mostert split" />
      </Grid>
      <Tile title="Backfield concentration — top 10 teams" subtitle="Stacked share by depth chart spot" span={12}>
        <StackedBarTile data={teamShares} xKey="name" height={260}
          series={[
            { key: 'rb1', label: 'RB1', color: PALETTE.accent },
            { key: 'rb2', label: 'RB2', color: PALETTE.accent2 },
            { key: 'rb3', label: 'RB3+',color: PALETTE.muted },
          ]} />
      </Tile>
      <Tile title="Example: PHI backfield distribution" subtitle="Toggle team via the slicer rail" span={12}>
        <DataTable rows={phiBackfield} columns={cols} defaultSort={{ key: 'share', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 02 — Goal Line */
function GoalLine() {
  const gl = [
    { team: 'BAL', rb1: 'Henry',     gl_car: 18, gl_td: 7, rz_car: 31, rz_td: 9 },
    { team: 'PHI', rb1: 'Barkley',   gl_car: 16, gl_td: 6, rz_car: 28, rz_td: 8 },
    { team: 'KC',  rb1: 'Pacheco',   gl_car: 14, gl_td: 5, rz_car: 24, rz_td: 6 },
    { team: 'BUF', rb1: 'Cook',      gl_car: 13, gl_td: 4, rz_car: 22, rz_td: 5 },
    { team: 'DET', rb1: 'Gibbs',     gl_car: 12, gl_td: 5, rz_car: 21, rz_td: 7 },
    { team: 'ATL', rb1: 'Robinson',  gl_car: 14, gl_td: 4, rz_car: 26, rz_td: 6 },
    { team: 'IND', rb1: 'Taylor',    gl_car: 11, gl_td: 4, rz_car: 19, rz_td: 5 },
    { team: 'GB',  rb1: 'Jacobs',    gl_car: 13, gl_td: 4, rz_car: 20, rz_td: 6 },
    { team: 'TEN', rb1: 'Pollard',   gl_car:  9, gl_td: 2, rz_car: 17, rz_td: 4 },
    { team: 'CHI', rb1: 'Swift',     gl_car:  8, gl_td: 2, rz_car: 15, rz_td: 3 },
  ]
  const cols: Column<typeof gl[0]>[] = [
    { key: 'team',   label: 'Team' },
    { key: 'rb1',    label: 'RB1' },
    { key: 'gl_car', label: 'GL Car',  numeric: true },
    { key: 'gl_td',  label: 'GL TD',   numeric: true },
    { key: 'rz_car', label: 'RZ Car',  numeric: true },
    { key: 'rz_td',  label: 'RZ TD',   numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg GL TD%"   value="38.4%" sub="of GL carries → TD" />
        <StatBlock label="Lg leader (GL)"  value="D. Henry · 7" sub="goal-line TDs" />
        <StatBlock label="RB1 GL share"    value="74.2%" sub="of team GL carries" />
        <StatBlock label="Committee teams" value="6" sub="GL work splits between backs" />
      </Grid>
      <Tile title="Goal-line carries — RB1 of each team" subtitle="High-leverage workload" span={12}>
        <BarTile data={gl.map(g => ({ name: g.team, value: g.gl_car }))} height={260} color={PALETTE.accent} />
      </Tile>
      <Tile title="Goal-line TDs — RB1 of each team" span={12}>
        <BarTile data={gl.map(g => ({ name: g.team, value: g.gl_td }))} height={260} color={PALETTE.ok} />
      </Tile>
      <Tile title="Goal-line & RZ workload — full table" span={12}>
        <DataTable rows={gl} columns={cols} defaultSort={{ key: 'gl_td', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 03 — Pass Game */
function PassGame() {
  const passRole = [
    { team: 'SF',  rb: 'McCaffrey',   routes: 178, tgt: 56, rec: 47, rec_yds: 384, third_rt: 84.1 },
    { team: 'DET', rb: 'Gibbs',       routes: 162, tgt: 42, rec: 36, rec_yds: 298, third_rt: 76.4 },
    { team: 'PHI', rb: 'Barkley',     routes: 154, tgt: 38, rec: 31, rec_yds: 264, third_rt: 71.2 },
    { team: 'MIA', rb: 'Achane',      routes: 148, tgt: 36, rec: 28, rec_yds: 247, third_rt: 68.4 },
    { team: 'NYJ', rb: 'Hall',        routes: 142, tgt: 34, rec: 27, rec_yds: 231, third_rt: 73.1 },
    { team: 'LAR', rb: 'Williams',    routes: 134, tgt: 31, rec: 25, rec_yds: 212, third_rt: 66.4 },
    { team: 'KC',  rb: 'Pacheco',     routes: 124, tgt: 24, rec: 19, rec_yds: 168, third_rt: 62.7 },
    { team: 'MIN', rb: 'Jones',       routes: 119, tgt: 22, rec: 18, rec_yds: 152, third_rt: 64.1 },
    { team: 'BUF', rb: 'Cook',        routes: 116, tgt: 21, rec: 16, rec_yds: 141, third_rt: 58.4 },
    { team: 'CIN', rb: 'Mixon',       routes: 108, tgt: 19, rec: 15, rec_yds: 124, third_rt: 56.2 },
  ]
  const cols: Column<typeof passRole[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'rb',       label: 'RB' },
    { key: 'routes',   label: 'Routes',  numeric: true },
    { key: 'tgt',      label: 'Tgt',     numeric: true },
    { key: 'rec',      label: 'Rec',     numeric: true },
    { key: 'rec_yds',  label: 'Rec Yds', numeric: true },
    { key: 'third_rt', label: '3rd Rt%', numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Pass-game leader" value="C. McCaffrey" sub="178 routes, 56 tgts" />
        <StatBlock label="Lg avg routes/g (RB1)"value="17.4" sub="among lead backs" />
        <StatBlock label="Lg avg RB tgt share"value="14.6%" sub="of team passing" />
        <StatBlock label="3rd-down route leader"value="McCaffrey · 84%" sub="on-field for passing downs" />
      </Grid>
      <Tile title="Routes run by lead RB" subtitle="Volume = PPR floor" span={12}>
        <BarTile data={passRole.map(p => ({ name: p.team, value: p.routes }))} height={260} color={PALETTE.accent} />
      </Tile>
      <Tile title="3rd-down route participation" subtitle="When the RB stays on the field for passing downs" span={12}>
        <BarTile data={passRole.map(p => ({ name: p.team, value: p.third_rt }))} height={260} color={PALETTE.cool} formatY={v => `${v.toFixed(0)}%`} />
      </Tile>
      <Tile title="Pass-catching role — RB1 of each team" span={12}>
        <DataTable rows={passRole} columns={cols} defaultSort={{ key: 'routes', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 04 — Efficiency */
function Efficiency() {
  const eff = [
    { team: 'BAL', rb: 'Henry',     car: 168, ypc: 5.4, ybc: 2.1, yac: 3.3, brk: 28, sr: 51.4 },
    { team: 'PHI', rb: 'Barkley',   car: 162, ypc: 5.3, ybc: 1.9, yac: 3.4, brk: 31, sr: 49.2 },
    { team: 'DET', rb: 'Gibbs',     car: 124, ypc: 5.1, ybc: 2.4, yac: 2.7, brk: 22, sr: 52.6 },
    { team: 'SF',  rb: 'McCaffrey', car: 138, ypc: 5.0, ybc: 2.2, yac: 2.8, brk: 24, sr: 53.1 },
    { team: 'ATL', rb: 'Robinson',  car: 156, ypc: 4.9, ybc: 1.7, yac: 3.2, brk: 26, sr: 48.6 },
    { team: 'IND', rb: 'Taylor',    car: 148, ypc: 4.8, ybc: 1.8, yac: 3.0, brk: 21, sr: 47.4 },
    { team: 'KC',  rb: 'Pacheco',   car: 132, ypc: 4.6, ybc: 1.6, yac: 3.0, brk: 19, sr: 46.1 },
    { team: 'GB',  rb: 'Jacobs',    car: 144, ypc: 4.5, ybc: 1.9, yac: 2.6, brk: 18, sr: 47.8 },
    { team: 'BUF', rb: 'Cook',      car: 126, ypc: 4.5, ybc: 1.7, yac: 2.8, brk: 17, sr: 45.4 },
    { team: 'MIA', rb: 'Achane',    car: 118, ypc: 5.6, ybc: 2.3, yac: 3.3, brk: 24, sr: 52.4 },
  ]
  const cols: Column<typeof eff[0]>[] = [
    { key: 'team', label: 'Team' },
    { key: 'rb',   label: 'RB' },
    { key: 'car',  label: 'Car', numeric: true },
    { key: 'ypc',  label: 'YPC', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'ybc',  label: 'YBC', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'yac',  label: 'YAC', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'brk',  label: 'BrkT',numeric: true },
    { key: 'sr',   label: 'Suc%',numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg YPC"      value="4.4" sub="lead-back qualifiers" />
        <StatBlock label="Lg avg YBC"      value="1.9" sub="yards before contact" />
        <StatBlock label="Lg avg YAC"      value="2.7" sub="yards after contact" />
        <StatBlock label="YPC leader"      value="Achane · 5.6" sub="lead backs" />
      </Grid>
      <Tile title="YPC leaders — lead backs" span={12}>
        <BarTile data={eff.map(e => ({ name: e.team, value: e.ypc }))} height={260} color={PALETTE.accent} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Yards before vs after contact — top 10 teams" subtitle="Where the yards come from" span={12}>
        <StackedBarTile data={eff.slice(0, 10).map(e => ({ name: e.team, ybc: e.ybc, yac: e.yac }))} xKey="name" height={260}
          series={[
            { key: 'ybc', label: 'Before contact', color: PALETTE.accent2 },
            { key: 'yac', label: 'After contact',  color: PALETTE.cool },
          ]} />
      </Tile>
      <Tile title="Backfield efficiency — lead RBs" span={12}>
        <DataTable rows={eff} columns={cols} defaultSort={{ key: 'ypc', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 05 — Fantasy */
function Fantasy() {
  const ranks = [
    { rank: 1, team: 'SF',  rb: 'McCaffrey',   fpg: 26.4, hi: 33.4, lo: 17.2, opp: 19.8, profile: 'Dual-threat' },
    { rank: 2, team: 'PHI', rb: 'Barkley',     fpg: 24.0, hi: 38.7, lo: 14.1, opp: 21.4, profile: 'Bell-cow' },
    { rank: 3, team: 'BAL', rb: 'Henry',       fpg: 21.1, hi: 34.6, lo: 11.2, opp: 22.6, profile: 'Two-down + TDs' },
    { rank: 4, team: 'ATL', rb: 'Robinson',    fpg: 20.5, hi: 31.4, lo: 12.4, opp: 20.1, profile: 'Bell-cow' },
    { rank: 5, team: 'DET', rb: 'Gibbs',       fpg: 19.8, hi: 28.6, lo: 12.1, opp: 16.2, profile: '1B (passing-down)' },
    { rank: 6, team: 'IND', rb: 'Taylor',      fpg: 18.4, hi: 26.7, lo: 11.4, opp: 18.6, profile: 'Workhorse' },
    { rank: 7, team: 'MIA', rb: 'Achane',      fpg: 17.6, hi: 31.2, lo: 8.4,  opp: 14.8, profile: 'Big-play' },
    { rank: 8, team: 'KC',  rb: 'Pacheco',     fpg: 16.4, hi: 24.1, lo: 9.6,  opp: 17.4, profile: 'Lead back' },
    { rank: 9, team: 'NYJ', rb: 'Hall',        fpg: 15.8, hi: 27.4, lo: 7.2,  opp: 16.1, profile: 'Variance' },
    { rank: 10,team: 'GB',  rb: 'Jacobs',      fpg: 15.4, hi: 25.2, lo: 9.8,  opp: 18.1, profile: 'Bell-cow' },
  ]
  const cols: Column<typeof ranks[0]>[] = [
    { key: 'rank',   label: '#',   numeric: true },
    { key: 'team',   label: 'Team' },
    { key: 'rb',     label: 'RB' },
    { key: 'fpg',    label: 'FP/G',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'hi',     label: 'High',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'lo',     label: 'Low',   numeric: true, format: v => fmt.num(v, 1) },
    { key: 'opp',    label: 'Opp/G', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'profile',label: 'Profile' },
  ]
  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Implications · RB"
        headline="Workload security drives the position."
        body="At RB, fantasy production correlates more strongly with opportunities (carries + targets) than with raw efficiency. The Opp/G column is the truer predictor of consistency than FP/G."
      />
      <Grid>
        <StatBlock label="RB1 (avg)"     value="C. McCaffrey · 26.4" sub="PPR" />
        <StatBlock label="Opp/G leader"  value="D. Henry · 22.6" sub="touches per game" />
        <StatBlock label="Avg RB1–12 FP/G"value="19.4" sub="weekly starting baseline" />
        <StatBlock label="Avg RB13–24 FP/G"value="13.1" sub="flex / streaming territory" />
      </Grid>
      <FormatPicker formats={['PPR', '½ PPR', 'Standard', 'Superflex']} active="PPR" />
      <Tile title="RB FP/G by team — top 10" subtitle="The fantasy version of the RB1 chart" span={12}>
        <BarTile data={ranks.map(r => ({ name: r.team, value: r.fpg, color: TEAM_COLORS[r.team] || PALETTE.accent }))} height={260} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Top 10 RB fantasy outlook" span={12}>
        <DataTable rows={ranks} columns={cols} defaultSort={{ key: 'fpg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
