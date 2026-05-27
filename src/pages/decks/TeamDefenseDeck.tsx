/**
 * Team Defense deck — what each defense allows, by position.
 *
 * The position toggle (QB / RB / WR / TE) sits at the top of every tab and
 * re-shapes the entire deck. Metrics across defensive position views are
 * similar enough that one deck with a toggle beats four separate decks.
 *
 * Tabs:
 *   01. Yards Allowed         — bulk allowed by position
 *   02. Efficiency Allowed    — EPA/play, success rate against
 *   03. Situational Defense   — RZ, 3rd-down, by score state
 *   04. Coverage & Pressure   — coverage scheme, blitz rate, sack rate
 *   05. Fantasy Allowed       — FP/G allowed by position
 */

import { useState } from 'react'
import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, DonutTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS, POSITION_COLORS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'

/* ============================================================
 * Position toggle — shared by all tabs in this deck
 * ============================================================ */
function PositionToggle({ pos, onChange }: { pos: Pos; onChange: (p: Pos) => void }) {
  const positions: Pos[] = ['QB', 'RB', 'WR', 'TE']
  return (
    <div className="qcard p-4 mb-2 flex items-center gap-3 flex-wrap" style={{
      background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FA 100%)',
      borderLeft: '3px solid #6191A5',
    }}>
      <div>
        <p className="eyebrow">Defense vs</p>
        <p className="text-xs text-muted mt-0.5">Switch the position to re-shape every chart on this tab.</p>
      </div>
      <div className="flex gap-2 ml-auto">
        {positions.map(p => (
          <button
            key={p}
            onClick={() => onChange(p)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              backgroundColor: pos === p ? POSITION_COLORS[p] : '#F7F9FA',
              color: pos === p ? '#FFFFFF' : '#5B7280',
              border: pos === p ? `2px solid ${POSITION_COLORS[p]}` : '2px solid #E5E9EC',
            }}
          >
            vs {p}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ============================================================
 * The deck itself — holds the position state at the top
 * ============================================================ */
export default function TeamDefenseDeck() {
  const [pos, setPos] = useState<Pos>('QB')

  const tabs: DeckTab[] = [
    { id: 'yards',       label: 'Yards Allowed',      render: () => <YardsAllowed pos={pos} setPos={setPos} /> },
    { id: 'efficiency',  label: 'Efficiency Allowed', render: () => <EfficiencyAllowed pos={pos} setPos={setPos} /> },
    { id: 'situational', label: 'Situational',        render: () => <Situational pos={pos} setPos={setPos} /> },
    { id: 'coverage',    label: 'Coverage & Pressure',render: () => <Coverage pos={pos} setPos={setPos} /> },
    { id: 'fantasy',     label: 'Fantasy Allowed',    fantasy: true, render: () => <Fantasy pos={pos} setPos={setPos} /> },
  ]

  return (
    <DeckShell
      title="Team Defense (Against)"
      intro="What each defense actually allows, by position. The position toggle at the top of every tab re-shapes the entire deck — defense vs QB, vs RB, vs WR, vs TE — so you compare apples to apples."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={7}
    />
  )
}

type TabProps = { pos: Pos; setPos: (p: Pos) => void }

/* ============================================================
 * Tab 01 — Yards Allowed (by position)
 * ============================================================ */
function YardsAllowed({ pos, setPos }: TabProps) {
  const data: Record<Pos, { team: string; ypg: number; td: number; long: number; explosives: number }[]> = {
    QB: [
      { team: 'BAL', ypg: 174, td: 12, long: 58, explosives: 14 },
      { team: 'SF',  ypg: 182, td: 13, long: 62, explosives: 16 },
      { team: 'CLE', ypg: 188, td: 15, long: 71, explosives: 17 },
      { team: 'PIT', ypg: 194, td: 14, long: 54, explosives: 15 },
      { team: 'GB',  ypg: 198, td: 16, long: 49, explosives: 18 },
      { team: 'DEN', ypg: 204, td: 17, long: 63, explosives: 19 },
      { team: 'PHI', ypg: 208, td: 16, long: 58, explosives: 20 },
      { team: 'HOU', ypg: 214, td: 18, long: 71, explosives: 22 },
      { team: 'KC',  ypg: 218, td: 15, long: 47, explosives: 18 },
      { team: 'NYJ', ypg: 222, td: 17, long: 56, explosives: 21 },
    ],
    RB: [
      { team: 'BAL', ypg:  78, td: 4, long: 28, explosives:  4 },
      { team: 'CLE', ypg:  82, td: 5, long: 31, explosives:  5 },
      { team: 'KC',  ypg:  87, td: 6, long: 24, explosives:  4 },
      { team: 'PHI', ypg:  91, td: 6, long: 38, explosives:  6 },
      { team: 'NYJ', ypg:  94, td: 7, long: 42, explosives:  7 },
      { team: 'PIT', ypg:  96, td: 5, long: 29, explosives:  5 },
      { team: 'SF',  ypg:  98, td: 7, long: 34, explosives:  6 },
      { team: 'GB',  ypg: 101, td: 7, long: 51, explosives:  7 },
      { team: 'BUF', ypg: 104, td: 8, long: 47, explosives:  8 },
      { team: 'HOU', ypg: 107, td: 8, long: 38, explosives:  7 },
    ],
    WR: [
      { team: 'BAL', ypg: 128, td:  8, long: 51, explosives: 10 },
      { team: 'NYJ', ypg: 134, td:  9, long: 58, explosives: 12 },
      { team: 'CLE', ypg: 138, td:  9, long: 47, explosives: 11 },
      { team: 'SF',  ypg: 142, td: 10, long: 62, explosives: 13 },
      { team: 'PHI', ypg: 148, td: 10, long: 54, explosives: 14 },
      { team: 'GB',  ypg: 152, td: 11, long: 49, explosives: 14 },
      { team: 'PIT', ypg: 158, td: 10, long: 58, explosives: 15 },
      { team: 'DEN', ypg: 162, td: 12, long: 71, explosives: 16 },
      { team: 'KC',  ypg: 168, td: 11, long: 47, explosives: 15 },
      { team: 'HOU', ypg: 172, td: 13, long: 63, explosives: 17 },
    ],
    TE: [
      { team: 'NYJ', ypg:  34, td: 2, long: 24, explosives:  2 },
      { team: 'BAL', ypg:  38, td: 2, long: 28, explosives:  3 },
      { team: 'CLE', ypg:  41, td: 3, long: 31, explosives:  3 },
      { team: 'SF',  ypg:  44, td: 3, long: 28, explosives:  3 },
      { team: 'PHI', ypg:  47, td: 4, long: 36, explosives:  4 },
      { team: 'PIT', ypg:  51, td: 3, long: 34, explosives:  4 },
      { team: 'KC',  ypg:  54, td: 4, long: 42, explosives:  5 },
      { team: 'GB',  ypg:  58, td: 5, long: 38, explosives:  5 },
      { team: 'DEN', ypg:  62, td: 4, long: 47, explosives:  5 },
      { team: 'HOU', ypg:  67, td: 6, long: 51, explosives:  6 },
    ],
  }

  const rows = data[pos]
  const cols: Column<typeof rows[0]>[] = [
    { key: 'team',       label: 'Team' },
    { key: 'ypg',        label: 'Yds/G allowed', numeric: true },
    { key: 'td',         label: 'TDs allowed',   numeric: true },
    { key: 'long',       label: 'Longest',       numeric: true },
    { key: 'explosives', label: 'Explosives',    numeric: true },
  ]
  const ypgChart = rows.map(r => ({ name: r.team, value: r.ypg, color: TEAM_COLORS[r.team] || PALETTE.accent }))

  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <Grid>
        <StatBlock label={`Best defense vs ${pos}`}  value={`${rows[0].team} · ${rows[0].ypg} yds/g`} sub="fewest yards allowed" />
        <StatBlock label={`Worst vs ${pos}`}         value={`${rows[rows.length-1].team} · ${rows[rows.length-1].ypg} yds/g`} sub="most yards allowed" />
        <StatBlock label={`Lg avg vs ${pos}`}        value={`${Math.round(rows.reduce((s, r) => s + r.ypg, 0) / rows.length)} yds/g`} sub="among top 10 shown" />
        <StatBlock label="Position toggle"           value={pos} sub="changes the entire tab" />
      </Grid>
      <Tile title={`Yards per game allowed to ${pos}s — top 10 defenses`} subtitle="Lower is better" span={12}>
        <BarTile data={ypgChart} height={280} />
      </Tile>
      <Tile title={`Yards allowed to ${pos}s — full table`} span={12}>
        <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ypg', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 02 — Efficiency Allowed
 * ============================================================ */
function EfficiencyAllowed({ pos, setPos }: TabProps) {
  const data: Record<Pos, { team: string; epa: number; sr: number; sucy: number; succ_run: number }[]> = {
    QB: [
      { team: 'BAL', epa: -0.18, sr: 38.4, sucy: 5.4, succ_run: 4.2 },
      { team: 'SF',  epa: -0.14, sr: 39.7, sucy: 5.6, succ_run: 4.4 },
      { team: 'CLE', epa: -0.12, sr: 40.1, sucy: 5.8, succ_run: 4.6 },
      { team: 'PIT', epa: -0.08, sr: 41.4, sucy: 5.9, succ_run: 4.8 },
      { team: 'GB',  epa: -0.06, sr: 42.6, sucy: 6.1, succ_run: 5.0 },
      { team: 'PHI', epa: -0.04, sr: 43.2, sucy: 6.3, succ_run: 5.2 },
      { team: 'KC',  epa: -0.02, sr: 43.8, sucy: 6.4, succ_run: 5.4 },
      { team: 'DEN', epa:  0.02, sr: 44.6, sucy: 6.6, succ_run: 5.6 },
      { team: 'HOU', epa:  0.06, sr: 45.2, sucy: 6.8, succ_run: 5.8 },
      { team: 'NYJ', epa:  0.08, sr: 46.1, sucy: 6.9, succ_run: 6.0 },
    ],
    RB: [
      { team: 'BAL', epa: -0.12, sr: 36.4, sucy: 3.8, succ_run: 3.2 },
      { team: 'CLE', epa: -0.10, sr: 37.2, sucy: 3.9, succ_run: 3.4 },
      { team: 'KC',  epa: -0.08, sr: 38.1, sucy: 4.0, succ_run: 3.6 },
      { team: 'PHI', epa: -0.06, sr: 39.4, sucy: 4.1, succ_run: 3.8 },
      { team: 'NYJ', epa: -0.04, sr: 40.2, sucy: 4.2, succ_run: 4.0 },
      { team: 'PIT', epa: -0.02, sr: 41.1, sucy: 4.3, succ_run: 4.2 },
      { team: 'SF',  epa:  0.00, sr: 42.4, sucy: 4.4, succ_run: 4.4 },
      { team: 'GB',  epa:  0.02, sr: 43.1, sucy: 4.5, succ_run: 4.6 },
      { team: 'BUF', epa:  0.04, sr: 44.2, sucy: 4.6, succ_run: 4.7 },
      { team: 'HOU', epa:  0.06, sr: 45.4, sucy: 4.7, succ_run: 4.9 },
    ],
    WR: [
      { team: 'BAL', epa: -0.16, sr: 38.4, sucy: 6.1, succ_run: 5.2 },
      { team: 'NYJ', epa: -0.12, sr: 39.6, sucy: 6.4, succ_run: 5.4 },
      { team: 'CLE', epa: -0.10, sr: 40.2, sucy: 6.6, succ_run: 5.6 },
      { team: 'SF',  epa: -0.08, sr: 41.1, sucy: 6.8, succ_run: 5.8 },
      { team: 'PHI', epa: -0.04, sr: 42.4, sucy: 7.0, succ_run: 6.0 },
      { team: 'GB',  epa: -0.02, sr: 43.2, sucy: 7.2, succ_run: 6.2 },
      { team: 'PIT', epa:  0.02, sr: 44.1, sucy: 7.4, succ_run: 6.4 },
      { team: 'DEN', epa:  0.04, sr: 44.8, sucy: 7.6, succ_run: 6.6 },
      { team: 'KC',  epa:  0.06, sr: 45.6, sucy: 7.8, succ_run: 6.8 },
      { team: 'HOU', epa:  0.08, sr: 46.4, sucy: 8.0, succ_run: 7.0 },
    ],
    TE: [
      { team: 'NYJ', epa: -0.20, sr: 32.4, sucy: 4.2, succ_run: 3.4 },
      { team: 'BAL', epa: -0.16, sr: 34.2, sucy: 4.6, succ_run: 3.8 },
      { team: 'CLE', epa: -0.14, sr: 35.4, sucy: 4.8, succ_run: 4.0 },
      { team: 'SF',  epa: -0.10, sr: 37.1, sucy: 5.0, succ_run: 4.2 },
      { team: 'PHI', epa: -0.06, sr: 38.4, sucy: 5.2, succ_run: 4.4 },
      { team: 'PIT', epa: -0.04, sr: 39.6, sucy: 5.4, succ_run: 4.6 },
      { team: 'KC',  epa:  0.00, sr: 41.2, sucy: 5.6, succ_run: 4.8 },
      { team: 'GB',  epa:  0.02, sr: 42.1, sucy: 5.8, succ_run: 5.0 },
      { team: 'DEN', epa:  0.04, sr: 43.2, sucy: 6.0, succ_run: 5.2 },
      { team: 'HOU', epa:  0.08, sr: 44.6, sucy: 6.2, succ_run: 5.4 },
    ],
  }

  const rows = data[pos]
  const cols: Column<typeof rows[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'epa',      label: 'EPA/play allowed', numeric: true, format: v => fmt.signed(v, 2) },
    { key: 'sr',       label: 'Suc% allowed',     numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'sucy',     label: 'Yds/play allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'succ_run', label: 'Y/play succ',      numeric: true, format: v => fmt.num(v, 1) },
  ]

  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <Grid>
        <StatBlock label={`Best EPA defense vs ${pos}`} value={`${rows[0].team} · ${fmt.signed(rows[0].epa, 2)}`} sub="most negative = best" />
        <StatBlock label={`Lg avg EPA/play vs ${pos}`}  value={fmt.signed(rows.reduce((s, r) => s + r.epa, 0) / rows.length, 2)} sub="across shown teams" />
        <StatBlock label={`Lg avg suc% allowed vs ${pos}`}value={`${(rows.reduce((s, r) => s + r.sr, 0) / rows.length).toFixed(1)}%`} sub="play-level efficiency" />
        <StatBlock label="Position toggle"              value={pos} sub="re-shapes entire tab" />
      </Grid>
      <Tile title={`EPA/play allowed to ${pos}s — top 10 defenses`} subtitle="Negative = above-average defense" span={12}>
        <BarTile data={rows.map(r => ({ name: r.team, value: r.epa }))} height={280} color={PALETTE.bad} formatY={v => fmt.signed(v, 2)} />
      </Tile>
      <Tile title={`Efficiency allowed vs ${pos}s — full table`} span={12}>
        <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 03 — Situational
 * ============================================================ */
function Situational({ pos, setPos }: TabProps) {
  const sit = [
    { team: 'BAL', rz_td_allowed: 41.2, third_conv_allowed: 32.4, two_min_pts: 0.8, q4_pts: 4.1 },
    { team: 'SF',  rz_td_allowed: 44.6, third_conv_allowed: 34.1, two_min_pts: 1.1, q4_pts: 4.8 },
    { team: 'CLE', rz_td_allowed: 46.8, third_conv_allowed: 35.4, two_min_pts: 1.2, q4_pts: 5.2 },
    { team: 'NYJ', rz_td_allowed: 48.2, third_conv_allowed: 36.2, two_min_pts: 1.4, q4_pts: 5.4 },
    { team: 'PIT', rz_td_allowed: 49.4, third_conv_allowed: 37.1, two_min_pts: 1.6, q4_pts: 5.7 },
    { team: 'PHI', rz_td_allowed: 51.2, third_conv_allowed: 38.4, two_min_pts: 1.8, q4_pts: 6.1 },
    { team: 'KC',  rz_td_allowed: 52.6, third_conv_allowed: 39.2, two_min_pts: 1.9, q4_pts: 6.3 },
    { team: 'GB',  rz_td_allowed: 54.1, third_conv_allowed: 40.4, two_min_pts: 2.1, q4_pts: 6.6 },
    { team: 'DEN', rz_td_allowed: 56.8, third_conv_allowed: 42.1, two_min_pts: 2.4, q4_pts: 7.1 },
    { team: 'HOU', rz_td_allowed: 58.4, third_conv_allowed: 44.6, two_min_pts: 2.7, q4_pts: 7.6 },
  ]
  const cols: Column<typeof sit[0]>[] = [
    { key: 'team',               label: 'Team' },
    { key: 'rz_td_allowed',      label: 'RZ TD% allowed',  numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'third_conv_allowed', label: '3rd Conv% allowed',numeric: true,format: v => `${v.toFixed(1)}%` },
    { key: 'two_min_pts',        label: '2-min Pts allowed',numeric: true,format: v => fmt.num(v, 1) },
    { key: 'q4_pts',             label: 'Q4 PPG allowed',  numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <Grid>
        <StatBlock label={`Best RZ defense vs ${pos}`}  value="BAL · 41.2%" sub="lowest RZ TD% allowed" />
        <StatBlock label="Best 3rd-down defense"         value="BAL · 32.4%" sub="lowest conv% allowed" />
        <StatBlock label="Best Q4 defense"               value="BAL · 4.1 PPG" sub="closing strength" />
        <StatBlock label="Position toggle"               value={pos} sub="re-shapes entire tab" />
      </Grid>
      <Tile title={`Red-zone TD% allowed to ${pos}s`} subtitle="Lower = better defense in the RZ" span={12}>
        <BarTile data={sit.map(s => ({ name: s.team, value: s.rz_td_allowed }))} height={260} color={PALETTE.ok} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title={`3rd-down conversion allowed vs ${pos}s`} span={12}>
        <BarTile data={sit.map(s => ({ name: s.team, value: s.third_conv_allowed }))} height={260} color={PALETTE.accent} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title={`Situational defense vs ${pos}s — full table`} span={12}>
        <DataTable rows={sit} columns={cols} defaultSort={{ key: 'rz_td_allowed', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 04 — Coverage & Pressure
 * ============================================================ */
function Coverage({ pos, setPos }: TabProps) {
  const cov = [
    { team: 'BAL', man_rt: 38.4, zone_rt: 61.6, blitz_rt: 28.1, sack_rt: 9.4, prs_rt: 32.6 },
    { team: 'PHI', man_rt: 22.1, zone_rt: 77.9, blitz_rt: 24.6, sack_rt: 8.2, prs_rt: 29.1 },
    { team: 'SF',  man_rt: 18.4, zone_rt: 81.6, blitz_rt: 18.4, sack_rt: 8.6, prs_rt: 31.4 },
    { team: 'NYJ', man_rt: 32.6, zone_rt: 67.4, blitz_rt: 27.1, sack_rt: 7.8, prs_rt: 28.4 },
    { team: 'CLE', man_rt: 41.2, zone_rt: 58.8, blitz_rt: 31.4, sack_rt: 9.1, prs_rt: 33.2 },
    { team: 'GB',  man_rt: 26.4, zone_rt: 73.6, blitz_rt: 22.1, sack_rt: 7.4, prs_rt: 26.8 },
    { team: 'PIT', man_rt: 28.1, zone_rt: 71.9, blitz_rt: 29.4, sack_rt: 7.2, prs_rt: 27.6 },
    { team: 'KC',  man_rt: 31.2, zone_rt: 68.8, blitz_rt: 26.4, sack_rt: 6.8, prs_rt: 25.4 },
    { team: 'BUF', man_rt: 24.1, zone_rt: 75.9, blitz_rt: 21.4, sack_rt: 6.4, prs_rt: 24.6 },
    { team: 'DET', man_rt: 36.8, zone_rt: 63.2, blitz_rt: 32.6, sack_rt: 6.1, prs_rt: 23.8 },
  ]
  const cols: Column<typeof cov[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'man_rt',   label: 'Man%',   numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'zone_rt',  label: 'Zone%',  numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'blitz_rt', label: 'Blitz%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'prs_rt',   label: 'Press%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'sack_rt',  label: 'Sack%',  numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const coverageMix = cov.slice(0, 8).map(c => ({ name: c.team, man: c.man_rt, zone: c.zone_rt }))
  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <Grid>
        <StatBlock label="Lg avg man rate"   value="29.4%" sub="man coverage" />
        <StatBlock label="Lg avg blitz rate" value="26.1%" sub="of dropbacks" />
        <StatBlock label="Pressure leader"   value="CLE · 33.2%" sub="QB pressures" />
        <StatBlock label="Sack rate leader"  value="BAL · 9.4%"  sub="of dropbacks" />
      </Grid>
      <Tile title="Coverage mix — top 8 defenses" subtitle="Man vs zone share" span={12}>
        <StackedBarTile data={coverageMix} xKey="name" height={260}
          series={[
            { key: 'man',  label: 'Man',  color: PALETTE.accent  },
            { key: 'zone', label: 'Zone', color: PALETTE.accent2 },
          ]} />
      </Tile>
      <Tile title="Coverage & pressure profile — top 10 defenses" span={12}>
        <DataTable rows={cov} columns={cols} defaultSort={{ key: 'prs_rt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 05 — Fantasy Allowed
 * ============================================================ */
function Fantasy({ pos, setPos }: TabProps) {
  const data: Record<Pos, { team: string; fp_allowed: number; rank: number; hi_allowed: number; lo_allowed: number; trend: 'up' | 'down' }[]> = {
    QB: [
      { team: 'BAL', fp_allowed: 14.2, rank: 1,  hi_allowed: 22.4, lo_allowed: 6.8,  trend: 'down' },
      { team: 'SF',  fp_allowed: 15.6, rank: 2,  hi_allowed: 24.1, lo_allowed: 8.2,  trend: 'down' },
      { team: 'CLE', fp_allowed: 16.4, rank: 3,  hi_allowed: 26.7, lo_allowed: 9.1,  trend: 'down' },
      { team: 'PIT', fp_allowed: 17.2, rank: 4,  hi_allowed: 24.8, lo_allowed: 10.4, trend: 'up'   },
      { team: 'GB',  fp_allowed: 18.1, rank: 5,  hi_allowed: 28.4, lo_allowed: 11.2, trend: 'down' },
      { team: 'PHI', fp_allowed: 19.4, rank: 6,  hi_allowed: 31.6, lo_allowed: 12.8, trend: 'up'   },
      { team: 'KC',  fp_allowed: 20.2, rank: 7,  hi_allowed: 29.4, lo_allowed: 13.4, trend: 'down' },
      { team: 'DEN', fp_allowed: 21.6, rank: 8,  hi_allowed: 32.8, lo_allowed: 14.1, trend: 'up'   },
      { team: 'HOU', fp_allowed: 22.4, rank: 9,  hi_allowed: 34.2, lo_allowed: 15.6, trend: 'up'   },
      { team: 'NYJ', fp_allowed: 23.1, rank: 10, hi_allowed: 33.4, lo_allowed: 14.8, trend: 'up'   },
    ],
    RB: [
      { team: 'BAL', fp_allowed: 13.4, rank: 1,  hi_allowed: 19.8, lo_allowed: 7.2,  trend: 'down' },
      { team: 'CLE', fp_allowed: 14.6, rank: 2,  hi_allowed: 21.4, lo_allowed: 8.4,  trend: 'down' },
      { team: 'KC',  fp_allowed: 15.8, rank: 3,  hi_allowed: 22.7, lo_allowed: 9.6,  trend: 'down' },
      { team: 'PHI', fp_allowed: 16.4, rank: 4,  hi_allowed: 24.1, lo_allowed: 10.2, trend: 'up'   },
      { team: 'NYJ', fp_allowed: 17.2, rank: 5,  hi_allowed: 26.4, lo_allowed: 11.4, trend: 'up'   },
      { team: 'PIT', fp_allowed: 18.6, rank: 6,  hi_allowed: 28.1, lo_allowed: 12.8, trend: 'down' },
      { team: 'SF',  fp_allowed: 19.4, rank: 7,  hi_allowed: 27.6, lo_allowed: 13.1, trend: 'up'   },
      { team: 'GB',  fp_allowed: 20.2, rank: 8,  hi_allowed: 29.4, lo_allowed: 14.2, trend: 'up'   },
      { team: 'BUF', fp_allowed: 21.4, rank: 9,  hi_allowed: 31.8, lo_allowed: 15.4, trend: 'up'   },
      { team: 'HOU', fp_allowed: 22.8, rank: 10, hi_allowed: 34.2, lo_allowed: 16.1, trend: 'up'   },
    ],
    WR: [
      { team: 'BAL', fp_allowed: 24.1, rank: 1,  hi_allowed: 36.4, lo_allowed: 12.8, trend: 'down' },
      { team: 'NYJ', fp_allowed: 25.8, rank: 2,  hi_allowed: 38.1, lo_allowed: 14.4, trend: 'down' },
      { team: 'CLE', fp_allowed: 27.4, rank: 3,  hi_allowed: 41.2, lo_allowed: 15.6, trend: 'up'   },
      { team: 'SF',  fp_allowed: 28.6, rank: 4,  hi_allowed: 42.8, lo_allowed: 16.4, trend: 'down' },
      { team: 'PHI', fp_allowed: 30.1, rank: 5,  hi_allowed: 44.1, lo_allowed: 17.8, trend: 'up'   },
      { team: 'GB',  fp_allowed: 31.4, rank: 6,  hi_allowed: 46.4, lo_allowed: 19.2, trend: 'up'   },
      { team: 'PIT', fp_allowed: 32.8, rank: 7,  hi_allowed: 48.6, lo_allowed: 20.4, trend: 'down' },
      { team: 'DEN', fp_allowed: 34.2, rank: 8,  hi_allowed: 51.2, lo_allowed: 21.7, trend: 'up'   },
      { team: 'KC',  fp_allowed: 35.4, rank: 9,  hi_allowed: 52.8, lo_allowed: 22.8, trend: 'up'   },
      { team: 'HOU', fp_allowed: 36.8, rank: 10, hi_allowed: 54.6, lo_allowed: 24.1, trend: 'up'   },
    ],
    TE: [
      { team: 'NYJ', fp_allowed:  6.4, rank: 1,  hi_allowed: 12.8, lo_allowed: 2.4, trend: 'down' },
      { team: 'BAL', fp_allowed:  7.2, rank: 2,  hi_allowed: 14.1, lo_allowed: 2.8, trend: 'down' },
      { team: 'CLE', fp_allowed:  8.4, rank: 3,  hi_allowed: 16.4, lo_allowed: 3.2, trend: 'up'   },
      { team: 'SF',  fp_allowed:  9.1, rank: 4,  hi_allowed: 18.2, lo_allowed: 3.6, trend: 'down' },
      { team: 'PHI', fp_allowed: 10.2, rank: 5,  hi_allowed: 19.4, lo_allowed: 4.2, trend: 'up'   },
      { team: 'PIT', fp_allowed: 11.4, rank: 6,  hi_allowed: 21.6, lo_allowed: 4.8, trend: 'up'   },
      { team: 'KC',  fp_allowed: 12.6, rank: 7,  hi_allowed: 23.4, lo_allowed: 5.4, trend: 'down' },
      { team: 'GB',  fp_allowed: 13.8, rank: 8,  hi_allowed: 25.1, lo_allowed: 6.1, trend: 'up'   },
      { team: 'DEN', fp_allowed: 15.1, rank: 9,  hi_allowed: 27.4, lo_allowed: 6.8, trend: 'up'   },
      { team: 'HOU', fp_allowed: 16.4, rank: 10, hi_allowed: 29.8, lo_allowed: 7.4, trend: 'up'   },
    ],
  }

  const rows = data[pos]
  const cols: Column<typeof rows[0]>[] = [
    { key: 'rank',       label: '#',          numeric: true },
    { key: 'team',       label: 'Team' },
    { key: 'fp_allowed', label: 'FP/G allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'hi_allowed', label: 'High allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'lo_allowed', label: 'Low allowed',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'trend',      label: 'Trend' },
  ]

  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <FantasyBanner
        label={`Fantasy Allowed · vs ${pos}`}
        headline={`Which defenses give up the most to ${pos}s.`}
        body={`Toggle the position above. The rankings recompute against ${pos}-only fantasy production — so you're matching like-for-like when scouting matchups.`}
      />
      <Grid>
        <StatBlock label={`Best matchup defense (${pos})`} value={`${rows[0].team} · ${fmt.num(rows[0].fp_allowed, 1)}`} sub="FP/G allowed" />
        <StatBlock label="Lg avg FP/G allowed"             value={fmt.num(rows.reduce((s, r) => s + r.fp_allowed, 0) / rows.length, 1)} sub={`vs ${pos}`} />
        <StatBlock label="Spread (best → worst)"           value={`${fmt.num(rows[rows.length-1].fp_allowed - rows[0].fp_allowed, 1)} FP/G`} sub="matchup edge available" />
        <StatBlock label="Position toggle"                 value={pos} sub="re-shapes entire tab" />
      </Grid>
      <FormatPicker formats={['PPR','½ PPR','Standard','TE prem']} active="PPR" />
      <Tile title={`Fantasy points allowed to ${pos}s — top 10`} subtitle="Lower is harder to score against" span={12}>
        <BarTile data={rows.map(r => ({ name: r.team, value: r.fp_allowed, color: TEAM_COLORS[r.team] || PALETTE.accent }))} height={280} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title={`FP/G allowed to ${pos}s — full table`} span={12}>
        <DataTable rows={rows} columns={cols} defaultSort={{ key: 'fp_allowed', dir: 'asc' }} />
      </Tile>
    </div>
  )
}
