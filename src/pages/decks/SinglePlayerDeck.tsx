/**
 * Single Player Productivity — the reference deck (Iteration 3).
 *
 * Five tabs:
 *   01. Overview              — football-only KPIs and the receiver target table
 *   02. Week by Week          — production trends, no fantasy
 *   03. Game-State Splits     — by down, distance, zone, quarter, situations
 *   04. Per-Play Efficiency   — EPA / success rate / CPOE
 *   05. Fantasy Production    — every fantasy view (PPR, ½, std, superflex, 6-pt)
 *
 * Iteration 3 rule: ALL fantasy content lives on Tab 05 only. Tabs 01–04 have
 * no fantasy-points references whatsoever.
 *
 * Visualizations are powered by mock data in this reference template — when
 * the parquet files land via the refresh script, swap the const arrays for
 * useQuery() calls. The DeckShell, SlicerPanel, and chart components are
 * unchanged regardless of data source.
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, AreaTile, DonutTile, ScatterTile, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'

const SLICER_GROUPS = [
  'season', 'week', 'position', 'team', 'opponent', 'homeAway',
  'down', 'distance', 'score', 'zone', 'qtr', 'personnel',
  'shotgun', 'playType', 'garbage',
] as const

export default function SinglePlayerDeck() {
  const tabs: DeckTab[] = [
    { id: 'overview',   label: 'Overview',           render: () => <OverviewTab /> },
    { id: 'weekly',     label: 'Week by Week',       render: () => <WeeklyTab /> },
    { id: 'splits',     label: 'Game-State Splits',  render: () => <SplitsTab /> },
    { id: 'efficiency', label: 'Per-Play Efficiency',render: () => <EfficiencyTab /> },
    { id: 'fantasy',    label: 'Fantasy Production', fantasy: true, render: () => <FantasyTab /> },
  ]

  return (
    <DeckShell
      title="Single Player Productivity"
      intro="The microscope view. Pick a player, then re-frame every number through the contexts that actually predict next week's output."
      tabs={tabs}
      slicerGroups={[...SLICER_GROUPS]}
      deckIndex={1}
      currentSubject={{ label: 'Patrick Mahomes', sub: 'KC · QB · 2024 season' }}
    />
  )
}

/* ========================================================================
 * Tab 01 — Overview (football only, no fantasy)
 * ====================================================================== */
function OverviewTab() {
  const passYdsByWeek = [
    { name: 'W5', air: 192, yac: 139 }, { name: 'W6', air: 116, yac: 104 },
    { name: 'W7', air: 188, yac: 124 }, { name: 'W8', air: 142, yac: 102 },
  ]
  const compByDepth = [
    { name: 'Behind LOS', value: 88 }, { name: '0–9',  value: 76 },
    { name: '10–19',      value: 62 }, { name: '20+',  value: 41 },
  ]
  const sackMix = [
    { name: 'Sacked', value: 4, color: PALETTE.bad },
    { name: 'Threw',  value: 119, color: PALETTE.accent },
    { name: 'Scramble', value: 11, color: PALETTE.cool },
  ]

  const targets = [
    { name: 'Travis Kelce',    pos: 'TE', tgt: 38, rec: 27, yds: 344, td: 3, adot: 7.1,  yacrec: 5.8 },
    { name: 'Rashee Rice',     pos: 'WR', tgt: 31, rec: 22, yds: 261, td: 2, adot: 5.9,  yacrec: 6.4 },
    { name: 'Xavier Worthy',   pos: 'WR', tgt: 22, rec: 14, yds: 198, td: 2, adot: 11.3, yacrec: 3.6 },
    { name: 'Isiah Pacheco',   pos: 'RB', tgt: 11, rec:  9, yds:  66, td: 0, adot: 0.6,  yacrec: 7.0 },
    { name: 'Hollywood Brown', pos: 'WR', tgt:  8, rec:  5, yds:  87, td: 1, adot: 14.2, yacrec: 4.1 },
  ]

  const targetCols: Column<typeof targets[0]>[] = [
    { key: 'name', label: 'Receiver' },
    { key: 'pos', label: 'Pos' },
    { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'td',  label: 'TD',  numeric: true },
    { key: 'adot',label: 'aDOT',numeric: true, format: (v) => fmt.num(v, 1) },
    { key: 'yacrec', label: 'YAC/Rec', numeric: true, format: (v) => fmt.num(v, 1) },
  ]

  return (
    <div className="space-y-4">
      {/* Row 1: snapshot + KPIs */}
      <Grid>
        <div className="qcard p-5 col-span-12 lg:col-span-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-chalk border border-line flex items-center justify-center font-display text-3xl">PM</div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">QB · Kansas City Chiefs</p>
              <h3 className="font-display text-3xl tracking-tight mt-1">Patrick Mahomes</h3>
              <p className="text-xs text-muted mt-1">Drafted 2017 R1 #10 · Texas Tech · 6'2" / 230</p>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-line2">
            <Cell label="Games" value="4" />
            <Cell label="Pass Yds" value="1,107" />
            <Cell label="Pass TD" value="9" />
            <Cell label="QBR" value="72.4" trend={{ dir: 'up', value: '6.1' }} />
          </div>
        </div>

        <StatBlockSmall label="Comp %" value="68.4%" sub="vs lg avg 65.1" />
        <StatBlockSmall label="Y/A"    value="8.2"   sub="when leading 1–8" />
        <StatBlockSmall label="TD:INT" value="9:1"   sub="Wk 5–8 slice" />
        <StatBlockSmall label="Pos Rk" value="#3"    sub="of 32" />
      </Grid>

      {/* Row 2: passing distribution + completion-by-depth */}
      <Grid>
        <Tile title="Passing yardage by week" subtitle="Stacked: air yards + YAC" span={4}>
          <StackedBarTile data={passYdsByWeek} xKey="name" height={240}
            series={[
              { key: 'air', label: 'Air yards', color: PALETTE.accent },
              { key: 'yac', label: 'YAC',       color: PALETTE.accent2 },
            ]} />
        </Tile>
        <Tile title="Completion % by depth" subtitle="Air-yards bucket" span={2}>
          <BarTile data={compByDepth} height={240} color={PALETTE.accent} formatY={v => `${v}%`} />
        </Tile>
      </Grid>

      {/* Row 3: pressure + RZ + sack rate */}
      <Grid>
        <Tile title="Under pressure vs clean pocket" subtitle="Y/A and comp%" span={2}>
          <BarTile data={[
            { name: 'Y/A clean', value: 9.2 },
            { name: 'Y/A pressure', value: 5.4 },
            { name: 'Comp% clean', value: 71.2 },
            { name: 'Comp% pressure', value: 51.6 },
          ]} height={200} color={PALETTE.cool} />
        </Tile>
        <Tile title="Red-zone efficiency" subtitle="TD% on RZ dropbacks" span={2}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Cell label="RZ TD%" value="62.5%" />
            <Cell label="RZ Att" value="16" />
            <Cell label="Goal-line" value="4 / 5" small />
            <Cell label="Lg Rank" value="#2" small />
          </div>
        </Tile>
        <Tile title="Dropback outcomes" subtitle="What happened on each play" span={2}>
          <DonutTile data={sackMix} height={200} />
        </Tile>
      </Grid>

      {/* Row 4: target distribution table */}
      <Tile title="Target distribution by receiver" subtitle="Within the current slicer slice" span={12}>
        <DataTable rows={targets} columns={targetCols} defaultSort={{ key: 'tgt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ========================================================================
 * Tab 02 — Week by Week (football only, no fantasy)
 * ====================================================================== */
function WeeklyTab() {
  const passYds = [
    { name: 'W5', value: 331 }, { name: 'W6', value: 220 },
    { name: 'W7', value: 312 }, { name: 'W8', value: 244 },
  ]
  const attempts = [
    { name: 'W5', value: 34 }, { name: 'W6', value: 29 },
    { name: 'W7', value: 38 }, { name: 'W8', value: 35 },
  ]
  const comp = [
    { name: 'W5', value: 73.5 }, { name: 'W6', value: 65.5 },
    { name: 'W7', value: 73.7 }, { name: 'W8', value: 62.9 },
  ]
  const tds = [
    { name: 'W5', value: 3 }, { name: 'W6', value: 2 },
    { name: 'W7', value: 2 }, { name: 'W8', value: 2 },
  ]
  const log = [
    { wk: 5, opp: '@ NO',   att: 34, cmp: 25, yds: 331, td: 3, int: 0, sk: 1, ypa: 9.7, qbr: 81.2 },
    { wk: 6, opp: 'vs DEN', att: 29, cmp: 19, yds: 220, td: 2, int: 1, sk: 2, ypa: 7.6, qbr: 62.4 },
    { wk: 7, opp: '@ SF',   att: 38, cmp: 28, yds: 312, td: 2, int: 0, sk: 1, ypa: 8.2, qbr: 78.6 },
    { wk: 8, opp: 'vs LV',  att: 35, cmp: 22, yds: 244, td: 2, int: 0, sk: 2, ypa: 7.0, qbr: 67.3 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk',  label: 'Wk',  numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'att', label: 'Att', numeric: true },
    { key: 'cmp', label: 'Cmp', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'td',  label: 'TD',  numeric: true },
    { key: 'int', label: 'INT', numeric: true },
    { key: 'sk',  label: 'Sk',  numeric: true },
    { key: 'ypa', label: 'Y/A', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'qbr', label: 'QBR', numeric: true, format: v => fmt.num(v, 1) },
  ]

  return (
    <div className="space-y-4">
      <Tile title="Passing yards by week" subtitle="No fantasy scoring — raw production by week" span={12}>
        <BarTile data={passYds} height={240} color={PALETTE.accent} />
      </Tile>
      <Grid>
        <Tile title="Attempts by week" span={2}>
          <AreaTile data={attempts} height={200} color={PALETTE.accent} />
        </Tile>
        <Tile title="Completion % by week" span={2}>
          <LineTile data={comp} height={200} series={[{ key: 'value', label: 'Comp%', color: PALETTE.accent2 }]} formatY={v => `${v}%`} />
        </Tile>
        <Tile title="TD passes by week" span={2}>
          <BarTile data={tds} height={200} color={PALETTE.cool} />
        </Tile>
      </Grid>
      <Tile title="Weekly game log" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* ========================================================================
 * Tab 03 — Game-State Splits (football only, no fantasy)
 * ====================================================================== */
function SplitsTab() {
  const byDown    = [{ name: '1st', value: 58 }, { name: '2nd', value: 41 }, { name: '3rd', value: 32 }, { name: '4th', value: 5 }]
  const byDist    = [{ name: '1–3', value: 28 }, { name: '4–6', value: 22 }, { name: '7–9', value: 31 }, { name: '10+', value: 55 }]
  const byZone    = [{ name: 'Own 1–20', value: 14 }, { name: 'Own 21–50', value: 56 }, { name: 'Opp 49–21', value: 48 }, { name: 'Red zone', value: 16 }, { name: 'Goal line', value: 2 }]
  const byQtr = [
    { name: 'Q1', value: 31, color: PALETTE.accent  },
    { name: 'Q2', value: 38, color: PALETTE.accent2 },
    { name: 'Q3', value: 27, color: PALETTE.cool    },
    { name: 'Q4', value: 40, color: PALETTE.muted   },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <Tile title="Plays by down" span={3}><BarTile data={byDown} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Plays by distance to go" span={3}><BarTile data={byDist} height={220} color={PALETTE.accent2} /></Tile>
      </Grid>
      <Grid>
        <Tile title="Plays by field zone" span={3}><BarTile data={byZone} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Plays by quarter" span={3}><DonutTile data={byQtr} height={220} /></Tile>
      </Grid>
      <Grid>
        <StatBlockSmall label="3rd-down conv %" value="44.1%" sub="Lg avg 38.7" />
        <StatBlockSmall label="2-min comp%"     value="71.4%" sub="21 / 49 plays" />
        <StatBlockSmall label="When trailing"   value="8.6 Y/A" sub="trail 1–8 slice" />
        <StatBlockSmall label="Shotgun rate"    value="82.3%" sub="vs 74 lg avg" />
      </Grid>
    </div>
  )
}

/* ========================================================================
 * Tab 04 — Per-Play Efficiency (football only, no fantasy)
 * ====================================================================== */
function EfficiencyTab() {
  const epa = [
    { name: 'W5', value: 0.49 }, { name: 'W6', value: 0.12 },
    { name: 'W7', value: 0.41 }, { name: 'W8', value: 0.34 },
  ]
  const sr = [
    { name: 'W5', value: 55 }, { name: 'W6', value: 48 },
    { name: 'W7', value: 56 }, { name: 'W8', value: 52 },
  ]
  const cpoe = [
    { name: 'W5', value: 5.1 }, { name: 'W6', value: -1.2 },
    { name: 'W7', value: 4.4 }, { name: 'W8', value: 2.3 },
  ]
  // Scatter: every QB this year — EPA/db (x) vs success rate (y), bubble = volume
  const scatter = Array.from({ length: 32 }, (_, i) => ({
    x: -0.10 + Math.random() * 0.50,
    y: 38 + Math.random() * 16,
    z: 80 + Math.random() * 200,
    label: `QB${i}`,
  }))
  scatter[0] = { x: 0.34, y: 52.6, z: 240, label: 'PM' }

  return (
    <div className="space-y-4">
      <Tile title="EPA per dropback by week" subtitle="Negative = below average expectation. Dashed line = NFL average." span={12}>
        <LineTile data={epa} height={240}
          series={[{ key: 'value', label: 'EPA/db', color: PALETTE.accent }]}
          formatY={v => fmt.signed(v, 2)}
          refLine={{ y: 0, label: 'avg' }}
        />
      </Tile>
      <Grid>
        <Tile title="Success rate by week" span={3}>
          <BarTile data={sr} height={200} color={PALETTE.ok} formatY={v => `${v}%`} />
        </Tile>
        <Tile title="CPOE by week" subtitle="Completion % over expected" span={3}>
          <BarTile data={cpoe} height={200} color={PALETTE.accent} formatY={v => fmt.signed(v, 1)} />
        </Tile>
      </Grid>
      <Tile title="EPA / success rate scatter" subtitle="All QBs this year. Bubble = dropbacks." span={12}>
        <ScatterTile data={scatter} xKey="x" yKey="y" zKey="z" height={280}
          formatX={v => fmt.signed(v, 2)} formatY={v => `${v}%`} />
      </Tile>
      <Grid>
        <StatBlockSmall label="EPA/db"          value="+0.34" sub="Lg #2" />
        <StatBlockSmall label="Success rate"    value="52.6%" sub="vs lg 45.1" />
        <StatBlockSmall label="CPOE"            value="+3.2"  sub="Lg #4" />
        <StatBlockSmall label="Pressure-to-sack" value="14.1%" sub="Best in lg" />
      </Grid>
    </div>
  )
}

/* ========================================================================
 * Tab 05 — Fantasy Production (NEW IN ITERATION 3)
 * All fantasy-scoring views live here. Nothing fantasy on other tabs.
 * ====================================================================== */
function FantasyTab() {
  const fpByWeek = [
    { name: 'W5', passing: 22.4, rushing: 4.8, bonus: 4.0 },
    { name: 'W6', passing: 14.1, rushing: 7.1, bonus: 1.6 },
    { name: 'W7', passing: 18.5, rushing: 4.2, bonus: 4.0 },
    { name: 'W8', passing: 16.8, rushing: 3.9, bonus: 0.0 },
  ]
  const boomBust = [
    { name: 'Boom (25+)',   value: 3, color: PALETTE.ok },
    { name: 'Solid (15–24)', value: 1, color: PALETTE.accent },
    { name: 'Bust (<15)',   value: 0, color: PALETTE.bad },
  ]
  const byFormat = [
    { name: 'PPR', value: 25.4 }, { name: '½ PPR', value: 25.4 },
    { name: 'Standard', value: 25.4 }, { name: '6-pt pass', value: 31.4 }, { name: 'Superflex', value: 25.4 },
  ]
  const vsPos = [
    { name: 'Player', value: 25.4 }, { name: 'QB1 cutoff', value: 22.8 },
    { name: 'QB12 cutoff', value: 17.1 }, { name: 'Median', value: 14.6 },
  ]
  const byState = [
    { name: 'Lead 9+', value: 4.2 }, { name: 'Lead 1–8', value: 12.1 },
    { name: 'Tied',    value: 4.7 }, { name: 'Trail 1–8', value: 3.8 },
    { name: 'Trail 9+', value: 0.6 },
  ]
  const log = [
    { wk: 5, opp: '@ NO',   payds: 331, patd: 3, int: 0, ruyds: 18, rutd: 0, bonus: 3,  ppr: 31.2 },
    { wk: 6, opp: 'vs DEN', payds: 220, patd: 2, int: 1, ruyds: 31, rutd: 1, bonus: 0,  ppr: 22.8 },
    { wk: 7, opp: '@ SF',   payds: 312, patd: 2, int: 0, ruyds: 12, rutd: 0, bonus: 3,  ppr: 26.7 },
    { wk: 8, opp: 'vs LV',  payds: 244, patd: 2, int: 0, ruyds: 22, rutd: 0, bonus: 0,  ppr: 20.7 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk', label: 'Wk', numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'payds', label: 'Pa Yds', numeric: true },
    { key: 'patd',  label: 'Pa TD',  numeric: true },
    { key: 'int',   label: 'INT',    numeric: true },
    { key: 'ruyds', label: 'Ru Yds', numeric: true },
    { key: 'rutd',  label: 'Ru TD',  numeric: true },
    { key: 'bonus', label: 'Bonus',  numeric: true, format: v => fmt.signed(v, 0) },
    { key: 'ppr',   label: 'PPR',    numeric: true, format: v => fmt.num(v, 1) },
  ]

  return (
    <div className="space-y-4">
      {/* Header card explaining the tab */}
      <div className="qcard p-5" style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FA 100%)',
        borderLeft: '3px solid #2A3B47',
      }}>
        <p className="eyebrow text-accent2">Fantasy Production</p>
        <h4 className="font-display text-3xl mt-1 leading-tight">All fantasy-scoring views live here.</h4>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          PPR · half-PPR · standard · superflex · 6-pt passing — everything fantasy-shaped sits on
          this tab so the other four reports stay focused on the football itself.
        </p>
      </div>

      {/* KPIs */}
      <Grid>
        <StatBlockSmall label="Total FP (PPR)"   value="101.4" sub="4-game slice" />
        <StatBlockSmall label="FP / Game"        value="25.4"  trend={{ dir: 'up', value: '3.1' }} sub="vs season avg" />
        <StatBlockSmall label="Pos Rank (FP/G)"  value="QB1"   sub="of 32" />
        <StatBlockSmall label="Boom rate (25+)"  value="75%"   sub="3 / 4 games" />
      </Grid>

      {/* Scoring format toggle (visual only here) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Scoring format</span>
        <button className="chip applied">PPR</button>
        <button className="chip">½ PPR</button>
        <button className="chip">Standard</button>
        <button className="chip">Superflex</button>
        <button className="chip">6-pt pass TD</button>
        <button className="chip">Custom…</button>
      </div>

      {/* Main fantasy charts */}
      <Grid>
        <Tile title="Fantasy points by week" subtitle="Stacked: passing · rushing · bonuses" span={4}>
          <StackedBarTile data={fpByWeek} xKey="name" height={240}
            series={[
              { key: 'passing', label: 'Passing FP', color: PALETTE.accent2 },
              { key: 'rushing', label: 'Rushing FP', color: PALETTE.cool },
              { key: 'bonus',   label: 'Bonuses',    color: PALETTE.accent },
            ]} />
        </Tile>
        <Tile title="Boom / Bust mix" subtitle="% of games by tier" span={2}>
          <DonutTile data={boomBust} height={240} />
        </Tile>
      </Grid>

      <Grid>
        <Tile title="FP distribution by format" subtitle="Same player, different scoring" span={3}>
          <BarTile data={byFormat} height={200} color={PALETTE.accent2} formatY={v => fmt.num(v, 1)} />
        </Tile>
        <Tile title="FP vs position median" subtitle="Gap to QB12, QB1" span={3}>
          <BarTile data={vsPos} height={200} color={PALETTE.accent} formatY={v => fmt.num(v, 1)} />
        </Tile>
      </Grid>

      <Tile title="Fantasy game log" subtitle="Source of points by week — passing, rushing, bonuses" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>

      <Grid>
        <Tile title="FP by game state" subtitle="Where points came from" span={3}>
          <BarTile data={byState} height={200} color={PALETTE.accent} formatY={v => fmt.num(v, 1)} />
        </Tile>
        <Tile title="Consistency (coefficient of variation)" subtitle="Lower = steadier week-to-week" span={3}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Cell label="CV (4-wk)"   value="0.18" />
            <Cell label="CV (season)" value="0.31" />
            <Cell label="Lg avg CV"   value="0.34" small />
            <Cell label="Floor (PPR)" value="20.7" small />
          </div>
        </Tile>
      </Grid>
    </div>
  )
}

/* -------------------- small helpers used within tabs -------------------- */

function Cell({ label, value, trend, small = false }:
  { label: string; value: string; trend?: { dir: 'up' | 'down'; value: string }; small?: boolean }) {
  return (
    <div>
      <p className="stat-label">{label}</p>
      <p className={small ? 'stat-num-sm num' : 'stat-num num'}>
        {value}
        {trend && <span className={`stat-trend ml-1 ${trend.dir}`}>{trend.dir === 'up' ? '↑' : '↓'}{trend.value}</span>}
      </p>
    </div>
  )
}

function StatBlockSmall({ label, value, sub, trend }:
  { label: string; value: string; sub?: string; trend?: { dir: 'up' | 'down'; value: string } }) {
  return (
    <div className="qcard p-5 col-span-6 lg:col-span-3">
      <p className="stat-label">{label}</p>
      <p className="stat-num num">
        {value}
        {trend && <span className={`stat-trend ml-1 ${trend.dir}`}>{trend.dir === 'up' ? '↑' : '↓'}{trend.value}</span>}
      </p>
      {sub && <p className="text-xs text-muted mt-2">{sub}</p>}
    </div>
  )
}
