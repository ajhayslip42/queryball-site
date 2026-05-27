/**
 * Team TE deck — how each offense uses its tight ends.
 *
 * Tabs:
 *   01. TE Usage Profile      — in-line vs flexed, route share vs blocking
 *   02. Red-Zone & Goal-Line  — where TE value usually lives
 *   03. TE Room Distribution  — multi-TE deployment, TE1 vs TE2 split
 *   04. Production Detail     — aDOT, target rate per route, YPRR
 *   05. Fantasy Implications  — TE-premium vs PPR vs standard
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, DonutTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function TeamTEDeck() {
  const tabs: DeckTab[] = [
    { id: 'usage',       label: 'TE Usage Profile',     render: () => <Usage /> },
    { id: 'redzone',     label: 'Red-Zone & Goal-Line', render: () => <RedZone /> },
    { id: 'distribution',label: 'TE Room Distribution', render: () => <Distribution /> },
    { id: 'production',  label: 'Production Detail',    render: () => <Production /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="Team — Tight Ends"
      intro="How each offense uses its tight ends. In-line vs flexed alignment, route share vs blocking duty, red-zone usage, and the multi-TE deployment that drives target distribution."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={5}
    />
  )
}

/* Tab 01 — Usage */
function Usage() {
  const teUsage = [
    { team: 'KC',  te1: 'Kelce',     route_rt: 84.2, block_rt: 15.8, inline: 38, flexed: 42, slot: 20 },
    { team: 'SF',  te1: 'Kittle',    route_rt: 71.4, block_rt: 28.6, inline: 56, flexed: 28, slot: 16 },
    { team: 'BAL', te1: 'Andrews',   route_rt: 78.6, block_rt: 21.4, inline: 48, flexed: 34, slot: 18 },
    { team: 'DET', te1: 'LaPorta',   route_rt: 76.8, block_rt: 23.2, inline: 41, flexed: 38, slot: 21 },
    { team: 'LV',  te1: 'Bowers',    route_rt: 81.2, block_rt: 18.8, inline: 26, flexed: 44, slot: 30 },
    { team: 'ARI', te1: 'McBride',   route_rt: 78.4, block_rt: 21.6, inline: 38, flexed: 36, slot: 26 },
    { team: 'MIN', te1: 'Hockenson', route_rt: 79.1, block_rt: 20.9, inline: 41, flexed: 40, slot: 19 },
    { team: 'CLE', te1: 'Njoku',     route_rt: 74.2, block_rt: 25.8, inline: 51, flexed: 32, slot: 17 },
    { team: 'JAX', te1: 'Engram',    route_rt: 82.1, block_rt: 17.9, inline: 24, flexed: 38, slot: 38 },
    { team: 'ATL', te1: 'Pitts',     route_rt: 73.6, block_rt: 26.4, inline: 21, flexed: 44, slot: 35 },
  ]
  const cols: Column<typeof teUsage[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'te1',      label: 'TE1' },
    { key: 'route_rt', label: 'Route%',  numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'block_rt', label: 'Block%',  numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'inline',   label: 'In-line%',numeric: true, format: v => `${v}%` },
    { key: 'flexed',   label: 'Flexed%', numeric: true, format: v => `${v}%` },
    { key: 'slot',     label: 'Slot%',   numeric: true, format: v => `${v}%` },
  ]
  const align = teUsage.slice(0, 10).map(t => ({
    name: t.team, inline: t.inline, flexed: t.flexed, slot: t.slot,
  }))
  const routeRate = teUsage.map(t => ({ name: t.team, value: t.route_rt }))
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg route rate" value="76.4%" sub="snaps as receiver" />
        <StatBlock label="Lg avg in-line"    value="38.4%" sub="attached to the line" />
        <StatBlock label="Lg avg flexed"     value="38.1%" sub="detached from line" />
        <StatBlock label="Most receiver-like"value="JAX · Engram 82%" sub="route rate" />
      </Grid>
      <Tile title="Alignment mix by team — top 10" subtitle="In-line / flexed / slot — split of TE1 snaps" span={12}>
        <StackedBarTile data={align} xKey="name" height={260}
          series={[
            { key: 'inline', label: 'In-line', color: PALETTE.accent2 },
            { key: 'flexed', label: 'Flexed',  color: PALETTE.accent },
            { key: 'slot',   label: 'Slot',    color: PALETTE.cool },
          ]} />
      </Tile>
      <Tile title="Route rate by team" subtitle="What % of TE1 snaps are routes (vs blocking)" span={12}>
        <BarTile data={routeRate} height={260} color={PALETTE.accent} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="TE1 usage profile — top 10 teams" span={12}>
        <DataTable rows={teUsage} columns={cols} defaultSort={{ key: 'route_rt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 02 — Red Zone */
function RedZone() {
  const rz = [
    { team: 'KC',  te1: 'Kelce',     rz_tgt: 14, rz_td: 6, ez_tgt: 8, ez_td: 5 },
    { team: 'BAL', te1: 'Andrews',   rz_tgt: 16, rz_td: 7, ez_tgt: 10, ez_td: 6 },
    { team: 'DET', te1: 'LaPorta',   rz_tgt: 13, rz_td: 5, ez_tgt: 7, ez_td: 4 },
    { team: 'ARI', te1: 'McBride',   rz_tgt: 12, rz_td: 4, ez_tgt: 6, ez_td: 3 },
    { team: 'LV',  te1: 'Bowers',    rz_tgt: 11, rz_td: 3, ez_tgt: 5, ez_td: 2 },
    { team: 'MIN', te1: 'Hockenson', rz_tgt: 10, rz_td: 4, ez_tgt: 6, ez_td: 3 },
    { team: 'CLE', te1: 'Njoku',     rz_tgt:  9, rz_td: 3, ez_tgt: 4, ez_td: 2 },
    { team: 'PHI', te1: 'Goedert',   rz_tgt:  8, rz_td: 2, ez_tgt: 4, ez_td: 2 },
    { team: 'SF',  te1: 'Kittle',    rz_tgt: 10, rz_td: 5, ez_tgt: 6, ez_td: 4 },
    { team: 'DAL', te1: 'Ferguson',  rz_tgt:  8, rz_td: 3, ez_tgt: 5, ez_td: 2 },
  ]
  const cols: Column<typeof rz[0]>[] = [
    { key: 'team',    label: 'Team' },
    { key: 'te1',     label: 'TE1' },
    { key: 'rz_tgt',  label: 'RZ Tgt', numeric: true },
    { key: 'rz_td',   label: 'RZ TD',  numeric: true },
    { key: 'ez_tgt',  label: 'EZ Tgt', numeric: true },
    { key: 'ez_td',   label: 'EZ TD',  numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg TE RZ tgt%"   value="22.4%" sub="of team RZ targets" />
        <StatBlock label="RZ leader (TE1)"     value="Andrews · 16" sub="RZ targets" />
        <StatBlock label="EZ leader (TE1)"     value="Andrews · 10" sub="end-zone targets" />
        <StatBlock label="RZ → TD conversion"  value="42%" sub="of TE RZ targets → TD" />
      </Grid>
      <Tile title="TE1 red-zone targets by team" subtitle="High-leverage TE work" span={12}>
        <BarTile data={rz.map(r => ({ name: r.team, value: r.rz_tgt }))} height={260} color={PALETTE.accent} />
      </Tile>
      <Tile title="TE1 red-zone TDs by team" subtitle="Where the fantasy ceiling comes from" span={12}>
        <BarTile data={rz.map(r => ({ name: r.team, value: r.rz_td }))} height={260} color={PALETTE.ok} />
      </Tile>
      <Tile title="Red-zone & end-zone — TE1 of each team" span={12}>
        <DataTable rows={rz} columns={cols} defaultSort={{ key: 'rz_td', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 03 — Distribution */
function Distribution() {
  const dist = [
    { team: 'KC',  te1: 'Kelce',     te1_share: 78.4, te2: 'Gray',     te2_share: 18.4 },
    { team: 'BAL', te1: 'Andrews',   te1_share: 71.2, te2: 'Likely',   te2_share: 25.4 },
    { team: 'SF',  te1: 'Kittle',    te1_share: 82.6, te2: 'Dwelley',  te2_share: 14.2 },
    { team: 'DET', te1: 'LaPorta',   te1_share: 76.8, te2: 'Wright',   te2_share: 16.4 },
    { team: 'PHI', te1: 'Goedert',   te1_share: 68.4, te2: 'Calcaterra',te2_share:22.7 },
    { team: 'LV',  te1: 'Bowers',    te1_share: 84.1, te2: 'Mayer',    te2_share: 12.6 },
    { team: 'ARI', te1: 'McBride',   te1_share: 79.6, te2: 'Higgins',  te2_share: 14.8 },
    { team: 'CLE', te1: 'Njoku',     te1_share: 74.2, te2: 'Akers',    te2_share: 19.4 },
    { team: 'MIN', te1: 'Hockenson', te1_share: 77.1, te2: 'Oliver',   te2_share: 16.8 },
    { team: 'DAL', te1: 'Ferguson',  te1_share: 64.4, te2: 'Schoonmaker', te2_share: 28.4 },
  ]
  const cols: Column<typeof dist[0]>[] = [
    { key: 'team',       label: 'Team' },
    { key: 'te1',        label: 'TE1' },
    { key: 'te1_share',  label: 'TE1 Share%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'te2',        label: 'TE2' },
    { key: 'te2_share',  label: 'TE2 Share%', numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const concentration = dist.map(d => ({ name: d.team, te1: d.te1_share, te2: d.te2_share }))
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg TE1 share" value="74.8%" sub="of team TE targets" />
        <StatBlock label="Most concentrated"value="LV · 84.1%" sub="Bowers" />
        <StatBlock label="Most committee"   value="DAL · 64.4%" sub="Ferguson / Schoonmaker" />
        <StatBlock label="Multi-TE rate"    value="38.4%" sub="lg avg snaps with 2+ TEs on field" />
      </Grid>
      <Tile title="TE1 vs TE2 target share — top 10" subtitle="Who owns the position group" span={12}>
        <StackedBarTile data={concentration} xKey="name" height={260}
          series={[
            { key: 'te1', label: 'TE1', color: PALETTE.accent },
            { key: 'te2', label: 'TE2', color: PALETTE.muted },
          ]} />
      </Tile>
      <Tile title="TE room distribution — top 10 teams" span={12}>
        <DataTable rows={dist} columns={cols} defaultSort={{ key: 'te1_share', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 04 — Production */
function Production() {
  const prod = [
    { team: 'KC',  te1: 'Kelce',     adot: 7.1, yac: 5.8, cr: 71.4, yprr: 2.51, tr: 30.2 },
    { team: 'LV',  te1: 'Bowers',    adot: 6.8, yac: 6.4, cr: 76.2, yprr: 2.68, tr: 32.4 },
    { team: 'BAL', te1: 'Andrews',   adot: 8.2, yac: 4.6, cr: 68.7, yprr: 2.34, tr: 26.8 },
    { team: 'DET', te1: 'LaPorta',   adot: 7.4, yac: 5.2, cr: 72.4, yprr: 2.28, tr: 25.4 },
    { team: 'SF',  te1: 'Kittle',    adot: 8.4, yac: 6.2, cr: 71.8, yprr: 2.41, tr: 24.8 },
    { team: 'ARI', te1: 'McBride',   adot: 7.6, yac: 4.8, cr: 73.4, yprr: 2.22, tr: 27.4 },
    { team: 'MIN', te1: 'Hockenson', adot: 8.1, yac: 5.1, cr: 70.2, yprr: 2.18, tr: 24.1 },
    { team: 'CLE', te1: 'Njoku',     adot: 7.8, yac: 4.7, cr: 67.4, yprr: 2.04, tr: 24.6 },
    { team: 'JAX', te1: 'Engram',    adot: 6.4, yac: 5.4, cr: 74.6, yprr: 1.96, tr: 22.1 },
    { team: 'ATL', te1: 'Pitts',     adot: 11.2, yac: 3.8, cr: 58.4, yprr: 1.72, tr: 19.4 },
  ]
  const cols: Column<typeof prod[0]>[] = [
    { key: 'team',  label: 'Team' },
    { key: 'te1',   label: 'TE1' },
    { key: 'adot',  label: 'aDOT',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'yac',   label: 'YAC/R', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'cr',    label: 'Catch%',numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'yprr',  label: 'YPRR',  numeric: true, format: v => fmt.num(v, 2) },
    { key: 'tr',    label: 'Tgt/Rt%',numeric: true,format: v => `${v.toFixed(1)}%` },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="YPRR leader"     value="Bowers · 2.68" sub="best per-route" />
        <StatBlock label="aDOT leader"     value="Pitts · 11.2" sub="vertical TE" />
        <StatBlock label="Catch% leader"   value="Bowers · 76.2%" sub="best hands" />
        <StatBlock label="Tgt rate leader" value="Bowers · 32.4%" sub="targets per route" />
      </Grid>
      <Tile title="YPRR by TE1 — top 10 teams" subtitle="Best per-play production" span={12}>
        <BarTile data={prod.map(p => ({ name: p.team, value: p.yprr }))} height={260} color={PALETTE.accent} formatY={v => fmt.num(v, 2)} />
      </Tile>
      <Tile title="TE1 production detail — top 10" span={12}>
        <DataTable rows={prod} columns={cols} defaultSort={{ key: 'yprr', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* Tab 05 — Fantasy */
function Fantasy() {
  const ranks = [
    { rank: 1, team: 'LV',  te1: 'Bowers',     fpg: 17.3, ppr: 17.3, tep: 22.6, profile: 'Volume + role' },
    { rank: 2, team: 'KC',  te1: 'Kelce',      fpg: 17.8, ppr: 17.8, tep: 23.2, profile: 'Mahomes weapon' },
    { rank: 3, team: 'BAL', te1: 'Andrews',    fpg: 14.8, ppr: 14.8, tep: 19.4, profile: 'RZ specialist' },
    { rank: 4, team: 'DET', te1: 'LaPorta',    fpg: 14.2, ppr: 14.2, tep: 18.6, profile: 'Goff target' },
    { rank: 5, team: 'ARI', te1: 'McBride',    fpg: 13.4, ppr: 13.4, tep: 17.6, profile: 'High-volume' },
    { rank: 6, team: 'MIN', te1: 'Hockenson',  fpg: 12.7, ppr: 12.7, tep: 16.8, profile: 'Possession' },
    { rank: 7, team: 'SF',  te1: 'Kittle',     fpg: 12.4, ppr: 12.4, tep: 16.2, profile: 'YAC machine' },
    { rank: 8, team: 'CLE', te1: 'Njoku',      fpg: 11.6, ppr: 11.6, tep: 15.1, profile: 'Streaker' },
    { rank: 9, team: 'JAX', te1: 'Engram',     fpg: 11.2, ppr: 11.2, tep: 14.6, profile: 'Pseudo-WR' },
    { rank: 10,team: 'ATL', te1: 'Pitts',      fpg: 10.4, ppr: 10.4, tep: 13.7, profile: 'Boom/bust' },
  ]
  const cols: Column<typeof ranks[0]>[] = [
    { key: 'rank',    label: '#',     numeric: true },
    { key: 'team',    label: 'Team' },
    { key: 'te1',     label: 'TE1' },
    { key: 'ppr',     label: 'PPR',   numeric: true, format: v => fmt.num(v, 1) },
    { key: 'tep',     label: 'TE prem',numeric: true,format: v => fmt.num(v, 1) },
    { key: 'profile', label: 'Profile' },
  ]
  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Implications · TE"
        headline="TE-premium is the format that matters."
        body="In standard PPR, the gap between TE1 and TE12 is small. In TE-premium (1.5 PPR for TEs), that gap widens dramatically — and the position becomes one of the most strategic on the roster."
      />
      <Grid>
        <StatBlock label="TE1 (PPR)"        value="Kelce · 17.8" sub="standard PPR" />
        <StatBlock label="TE1 (TE-prem)"    value="Kelce · 23.2" sub="1.5 PPR for TE" />
        <StatBlock label="Avg TE1–12 (PPR)" value="13.2" sub="weekly starting baseline" />
        <StatBlock label="TE12 → TE6 gap"   value="2.4 FP/G" sub="streaming penalty in PPR" />
      </Grid>
      <FormatPicker formats={['PPR','½ PPR','Standard','TE premium']} active="TE premium" />
      <Tile title="TE1 FP/G — TE-premium scoring" subtitle="Where positional scarcity matters most" span={12}>
        <BarTile data={ranks.map(r => ({ name: r.team, value: r.tep, color: TEAM_COLORS[r.team] || PALETTE.accent }))} height={260} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Top 10 TE outlook — by format" span={12}>
        <DataTable rows={ranks} columns={cols} defaultSort={{ key: 'tep', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
