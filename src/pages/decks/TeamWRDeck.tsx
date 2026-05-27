/**
 * Team WR deck — how each offense feeds its receivers.
 *
 * Tabs:
 *   01. Target Share         — who eats, by WR depth chart spot
 *   02. Alignment & Routes   — X / Z / slot snaps per receiver, route concepts
 *   03. Situational Targets  — 3rd-down, RZ, 2-minute targets
 *   04. Production Detail    — aDOT, YAC, catch rate, YPRR
 *   05. Fantasy Implications — WR1/WR2/WR3 outlook, floor vs ceiling
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, DonutTile, ScatterTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function TeamWRDeck() {
  const tabs: DeckTab[] = [
    { id: 'target-share',label: 'Target Share',         render: () => <TargetShare /> },
    { id: 'alignment',   label: 'Alignment & Routes',   render: () => <Alignment /> },
    { id: 'situational', label: 'Situational Targets',  render: () => <Situational /> },
    { id: 'production',  label: 'Production Detail',    render: () => <Production /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="Team — Wide Receivers"
      intro="How each offense feeds its receivers. Target share by alignment and situation, route concepts, who's getting the chances in the moments that matter."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={4}
    />
  )
}

/* Tab 01 — Target Share */
function TargetShare() {
  const minRoom = [
    { name: 'J. Jefferson',   role: 'WR1', tgt: 92, share: 32.4, yds: 943, td: 6 },
    { name: 'J. Addison',     role: 'WR2', tgt: 58, share: 20.4, yds: 487, td: 4 },
    { name: 'J. Nailor',      role: 'WR3', tgt: 24, share:  8.5, yds: 178, td: 1 },
    { name: 'T. Hockenson',   role: 'TE',  tgt: 47, share: 16.5, yds: 384, td: 2 },
    { name: 'A. Jones',       role: 'RB',  tgt: 21, share:  7.4, yds: 142, td: 0 },
    { name: 'Others',         role: '–',   tgt: 42, share: 14.8, yds: 261, td: 1 },
  ]
  const cols: Column<typeof minRoom[0]>[] = [
    { key: 'name',  label: 'Receiver' },
    { key: 'role',  label: 'Role' },
    { key: 'tgt',   label: 'Tgt',    numeric: true },
    { key: 'share', label: 'Share%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'yds',   label: 'Yds',    numeric: true },
    { key: 'td',    label: 'TD',     numeric: true },
  ]
  const wr1Share = [
    { team: 'MIN', wr1: 32.4, wr2: 20.4, wr3: 8.5 },
    { team: 'CIN', wr1: 30.8, wr2: 22.1, wr3: 9.4 },
    { team: 'NYG', wr1: 32.1, wr2: 14.8, wr3: 11.2 },
    { team: 'ATL', wr1: 28.6, wr2: 18.4, wr3: 10.6 },
    { team: 'DAL', wr1: 27.4, wr2: 17.8, wr3: 12.1 },
    { team: 'MIA', wr1: 27.2, wr2: 21.4, wr3:  8.7 },
    { team: 'JAX', wr1: 26.4, wr2: 18.6, wr3: 11.4 },
    { team: 'WAS', wr1: 25.8, wr2: 17.2, wr3: 13.4 },
    { team: 'DET', wr1: 24.6, wr2: 13.4, wr3: 11.8 },
    { team: 'PHI', wr1: 24.2, wr2: 19.7, wr3:  8.4 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg WR1 share" value="26.8%" sub="of team targets" />
        <StatBlock label="Lg avg WR2 share" value="18.4%" sub="of team targets" />
        <StatBlock label="Most concentrated"value="MIN · 32.4%" sub="Jefferson dominant" />
        <StatBlock label="Most distributed" value="DET · 24.6%" sub="multi-WR offense" />
      </Grid>
      <Tile title="WR target share by depth-chart spot — top 10 teams" subtitle="Stacked: WR1 / WR2 / WR3" span={12}>
        <StackedBarTile data={wr1Share} xKey="team" height={260}
          series={[
            { key: 'wr1', label: 'WR1', color: PALETTE.accent },
            { key: 'wr2', label: 'WR2', color: PALETTE.accent2 },
            { key: 'wr3', label: 'WR3', color: PALETTE.muted },
          ]} />
      </Tile>
      <Tile title="Example: MIN target distribution" subtitle="Toggle team via the slicer rail" span={12}>
        <DataTable rows={minRoom} columns={cols} defaultSort={{ key: 'tgt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 02 — Alignment */
function Alignment() {
  const align = [
    { team: 'MIN', wr1: 'Jefferson',  x: 38, z: 41, slot: 21, motion: 31.4 },
    { team: 'CIN', wr1: 'Chase',      x: 62, z: 24, slot: 14, motion: 22.1 },
    { team: 'DAL', wr1: 'Lamb',       x: 28, z: 26, slot: 46, motion: 41.4 },
    { team: 'PHI', wr1: 'Brown',      x: 78, z: 16, slot:  6, motion: 18.4 },
    { team: 'DET', wr1: 'St. Brown',  x: 22, z: 31, slot: 47, motion: 38.4 },
    { team: 'MIA', wr1: 'Hill',       x: 24, z: 38, slot: 38, motion: 34.6 },
    { team: 'HOU', wr1: 'Collins',    x: 71, z: 21, slot:  8, motion: 19.2 },
    { team: 'LAR', wr1: 'Nacua',      x: 31, z: 22, slot: 47, motion: 36.4 },
    { team: 'ATL', wr1: 'London',     x: 64, z: 22, slot: 14, motion: 21.6 },
    { team: 'NYJ', wr1: 'Wilson',     x: 28, z: 36, slot: 36, motion: 32.8 },
  ]
  const cols: Column<typeof align[0]>[] = [
    { key: 'team',   label: 'Team' },
    { key: 'wr1',    label: 'WR1' },
    { key: 'x',      label: 'X%',     numeric: true, format: v => `${v}%` },
    { key: 'z',      label: 'Z%',     numeric: true, format: v => `${v}%` },
    { key: 'slot',   label: 'Slot%',  numeric: true, format: v => `${v}%` },
    { key: 'motion', label: 'Motion%',numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const concepts = [
    { name: 'Quick (screen/slant)', value: 31.4 },
    { name: 'Choice (curl/dig)',    value: 24.8 },
    { name: 'Verticals (post/go)',  value: 18.6 },
    { name: 'Crossers (drag/over)', value: 14.7 },
    { name: 'Other',                value: 10.5 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg slot rate"  value="28.4%" sub="WR1 alignment" />
        <StatBlock label="Lg avg motion rate"value="27.8%" sub="of WR snaps" />
        <StatBlock label="Most schemed-up"   value="DAL · 41.4% motion" sub="Lamb gets pre-snap help" />
        <StatBlock label="Most static"       value="PHI · 18.4% motion" sub="line up and win" />
      </Grid>
      <Tile title="Route concept mix — league average" subtitle="What route trees offenses lean on" span={12}>
        <BarTile data={concepts} height={260} color={PALETTE.accent} formatY={v => `${v}%`} />
      </Tile>
      <Tile title="WR1 alignment by team — top 10" subtitle="X (boundary) / Z (field) / Slot — and motion usage" span={12}>
        <DataTable rows={align} columns={cols} defaultSort={{ key: 'motion', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 03 — Situational */
function Situational() {
  const rzTgt = [
    { team: 'CIN', wr1: 'Chase',     rz_tgt: 18, rz_td: 5, ez_tgt: 11, ez_td: 4 },
    { team: 'MIN', wr1: 'Jefferson', rz_tgt: 16, rz_td: 4, ez_tgt:  9, ez_td: 3 },
    { team: 'DAL', wr1: 'Lamb',      rz_tgt: 17, rz_td: 4, ez_tgt: 10, ez_td: 3 },
    { team: 'PHI', wr1: 'Brown',     rz_tgt: 14, rz_td: 3, ez_tgt:  8, ez_td: 3 },
    { team: 'TB',  wr1: 'Evans',     rz_tgt: 19, rz_td: 6, ez_tgt: 12, ez_td: 5 },
    { team: 'DET', wr1: 'St. Brown', rz_tgt: 13, rz_td: 3, ez_tgt:  7, ez_td: 2 },
    { team: 'ATL', wr1: 'London',    rz_tgt: 12, rz_td: 2, ez_tgt:  6, ez_td: 2 },
    { team: 'HOU', wr1: 'Collins',   rz_tgt: 11, rz_td: 3, ez_tgt:  6, ez_td: 2 },
    { team: 'BAL', wr1: 'Flowers',   rz_tgt: 10, rz_td: 2, ez_tgt:  5, ez_td: 1 },
    { team: 'KC',  wr1: 'Rice',      rz_tgt:  9, rz_td: 2, ez_tgt:  4, ez_td: 1 },
  ]
  const cols: Column<typeof rzTgt[0]>[] = [
    { key: 'team',    label: 'Team' },
    { key: 'wr1',     label: 'WR1' },
    { key: 'rz_tgt',  label: 'RZ Tgt',numeric: true },
    { key: 'rz_td',   label: 'RZ TD', numeric: true },
    { key: 'ez_tgt',  label: 'EZ Tgt',numeric: true },
    { key: 'ez_td',   label: 'EZ TD', numeric: true },
  ]
  const thirdDown = [
    { name: 'CIN', value: 38.1 }, { name: 'MIN', value: 36.4 },
    { name: 'KC',  value: 31.4 }, { name: 'BUF', value: 28.7 },
    { name: 'PHI', value: 33.2 }, { name: 'DAL', value: 35.6 },
    { name: 'MIA', value: 32.4 }, { name: 'DET', value: 29.8 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg RZ WR tgt%"  value="48.6%" sub="of RZ passes to WRs" />
        <StatBlock label="RZ leader (WR1)"    value="Evans · 19" sub="RZ targets" />
        <StatBlock label="Lg avg 3rd-dn WR%"  value="62.4%" sub="WRs targeted on 3rd-down" />
        <StatBlock label="3rd-dn leader (WR1)"value="Chase · 38.1%" sub="of team's 3rd-dn tgts" />
      </Grid>
      <Tile title="WR1 3rd-down target share — top 8 teams" subtitle="Volume on the highest-leverage downs" span={12}>
        <BarTile data={thirdDown} height={260} color={PALETTE.accent} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Red-zone & end-zone targets — WR1 of each team" span={12}>
        <DataTable rows={rzTgt} columns={cols} defaultSort={{ key: 'rz_tgt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 04 — Production */
function Production() {
  const prod = [
    { team: 'MIN', wr1: 'Jefferson', adot: 12.4, yac: 5.6, cr: 69.6, yprr: 3.83 },
    { team: 'CIN', wr1: 'Chase',     adot: 11.8, yac: 6.1, cr: 69.3, yprr: 3.74 },
    { team: 'HOU', wr1: 'Collins',   adot: 13.1, yac: 4.8, cr: 68.7, yprr: 3.42 },
    { team: 'LAR', wr1: 'Nacua',     adot:  9.4, yac: 7.2, cr: 69.0, yprr: 3.27 },
    { team: 'PHI', wr1: 'Brown',     adot: 12.9, yac: 5.2, cr: 66.2, yprr: 3.26 },
    { team: 'DAL', wr1: 'Lamb',      adot: 11.2, yac: 6.4, cr: 69.0, yprr: 3.24 },
    { team: 'DET', wr1: 'St. Brown', adot:  8.9, yac: 6.8, cr: 76.5, yprr: 3.09 },
    { team: 'MIA', wr1: 'Hill',      adot: 12.1, yac: 6.2, cr: 68.4, yprr: 3.04 },
    { team: 'ATL', wr1: 'London',    adot: 10.4, yac: 5.4, cr: 66.7, yprr: 2.91 },
    { team: 'NYJ', wr1: 'Wilson',    adot: 11.6, yac: 4.9, cr: 60.7, yprr: 2.78 },
  ]
  const cols: Column<typeof prod[0]>[] = [
    { key: 'team', label: 'Team' },
    { key: 'wr1',  label: 'WR1' },
    { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'yac',  label: 'YAC/R',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'cr',   label: 'Catch%',numeric:true, format: v => `${v.toFixed(1)}%` },
    { key: 'yprr', label: 'YPRR', numeric: true, format: v => fmt.num(v, 2) },
  ]
  const scatter = prod.map(p => ({ x: p.adot, y: p.yprr, z: 200, label: p.team }))
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="YPRR leader"     value="Jefferson · 3.83" sub="WR1 of each team" />
        <StatBlock label="Best YAC creator"value="Nacua · 7.2" sub="YAC per reception" />
        <StatBlock label="Best hands"      value="St. Brown · 76.5%" sub="catch rate" />
        <StatBlock label="Deepest aDOT"    value="Collins · 13.1" sub="avg target depth" />
      </Grid>
      <Tile title="aDOT vs YPRR — WR1 efficiency" subtitle="Bubble = team. Top-right = elite at depth." span={12}>
        <ScatterTile data={scatter} xKey="x" yKey="y" zKey="z" height={300}
          formatX={v => fmt.num(v, 1)} formatY={v => fmt.num(v, 2)} />
      </Tile>
      <Tile title="WR1 production detail — top 10 teams" span={12}>
        <DataTable rows={prod} columns={cols} defaultSort={{ key: 'yprr', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 05 — Fantasy */
function Fantasy() {
  const ranks = [
    { rank: 1, team: 'MIN', wr1: 'Jefferson', wr1_fpg: 24.8, wr2: 'Addison',   wr2_fpg: 13.4, wr3_fpg: 6.8 },
    { rank: 2, team: 'CIN', wr1: 'Chase',     wr1_fpg: 22.7, wr2: 'Higgins',   wr2_fpg: 14.1, wr3_fpg: 7.2 },
    { rank: 3, team: 'DAL', wr1: 'Lamb',      wr1_fpg: 21.8, wr2: 'Tolbert',   wr2_fpg: 10.6, wr3_fpg: 5.4 },
    { rank: 4, team: 'PHI', wr1: 'Brown',     wr1_fpg: 20.2, wr2: 'Smith',     wr2_fpg: 14.6, wr3_fpg: 4.8 },
    { rank: 5, team: 'DET', wr1: 'St. Brown', wr1_fpg: 19.4, wr2: 'Williams',  wr2_fpg:  9.8, wr3_fpg: 6.2 },
    { rank: 6, team: 'MIA', wr1: 'Hill',      wr1_fpg: 18.7, wr2: 'Waddle',    wr2_fpg: 12.4, wr3_fpg: 5.1 },
    { rank: 7, team: 'HOU', wr1: 'Collins',   wr1_fpg: 18.2, wr2: 'Diggs',     wr2_fpg: 11.7, wr3_fpg: 6.4 },
    { rank: 8, team: 'LAR', wr1: 'Nacua',     wr1_fpg: 17.8, wr2: 'Kupp',      wr2_fpg: 14.9, wr3_fpg: 4.6 },
    { rank: 9, team: 'JAX', wr1: 'Thomas',    wr1_fpg: 17.4, wr2: 'Davis',     wr2_fpg:  9.4, wr3_fpg: 5.2 },
    { rank: 10,team: 'ATL', wr1: 'London',    wr1_fpg: 17.1, wr2: 'McCloud',   wr2_fpg:  8.6, wr3_fpg: 5.8 },
  ]
  const cols: Column<typeof ranks[0]>[] = [
    { key: 'rank',    label: '#',    numeric: true },
    { key: 'team',    label: 'Team' },
    { key: 'wr1',     label: 'WR1' },
    { key: 'wr1_fpg', label: 'WR1 FP/G',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'wr2',     label: 'WR2' },
    { key: 'wr2_fpg', label: 'WR2 FP/G',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'wr3_fpg', label: 'WR3 FP/G',numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Implications · WR"
        headline="Whole rooms, ranked. Floor vs ceiling by team."
        body="WR fantasy in PPR is target-driven — but ceiling games come from a few key situational factors: aDOT, RZ usage, motion rate. The leaderboard shows the WR1/WR2 split alongside FP/G."
      />
      <Grid>
        <StatBlock label="WR1 (avg)"        value="J. Jefferson · 24.8" sub="PPR" />
        <StatBlock label="WR2 (avg)"        value="Kupp · 14.9" sub="PPR" />
        <StatBlock label="Avg WR1–12 FP/G"  value="19.6" sub="weekly starting baseline" />
        <StatBlock label="Avg WR13–36 FP/G" value="12.8" sub="flex / streaming territory" />
      </Grid>
      <FormatPicker formats={['PPR','½ PPR','Standard']} active="PPR" />
      <Tile title="WR1 FP/G by team — top 10" span={12}>
        <BarTile data={ranks.map(r => ({ name: r.team, value: r.wr1_fpg, color: TEAM_COLORS[r.team] || PALETTE.accent }))} height={260} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Top 10 WR rooms — fantasy outlook" span={12}>
        <DataTable rows={ranks} columns={cols} defaultSort={{ key: 'wr1_fpg', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
