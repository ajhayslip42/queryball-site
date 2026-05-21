/**
 * QB view — the position-shaped version of Single Player for quarterbacks.
 *
 * Tabs:
 *   01. Overview              — passing snapshot, completion by depth, pressure mix, target distribution
 *   02. Week by Week          — passing yards/attempts/comp%/TDs by week
 *   03. Game-State Splits     — by down, distance, zone, quarter, situations
 *   04. Per-Play Efficiency   — EPA/db, success rate, CPOE
 *   05. Fantasy Production    — all fantasy views, isolated to this tab
 */

import { type DeckTab } from '@/components/deck/DeckShell'
import { Tile, Grid, StatBlock } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, AreaTile, DonutTile, ScatterTile, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'
import type { Player } from '@/lib/players'

export function getQBTabs(player: Player): DeckTab[] {
  return [
    { id: 'overview',   label: 'Overview',           render: () => <Overview player={player} /> },
    { id: 'weekly',     label: 'Week by Week',       render: () => <Weekly player={player} /> },
    { id: 'splits',     label: 'Game-State Splits',  render: () => <Splits player={player} /> },
    { id: 'efficiency', label: 'Per-Play Efficiency',render: () => <Efficiency player={player} /> },
    { id: 'fantasy',    label: 'Fantasy Production', fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}

export const QB_SLICERS = [
  'season', 'week', 'team', 'opponent', 'homeAway',
  'down', 'distance', 'score', 'zone', 'qtr', 'personnel',
  'shotgun', 'playType', 'garbage',
] as const

/* ============================================================
 * Tab 01 — Overview
 * ============================================================ */
function Overview({ player }: { player: Player }) {
  const passYdsByWeek = [
    { name: 'W5', air: 192, yac: 139 }, { name: 'W6', air: 116, yac: 104 },
    { name: 'W7', air: 188, yac: 124 }, { name: 'W8', air: 142, yac: 102 },
  ]
  const compByDepth = [
    { name: 'Behind LOS', value: 88 }, { name: '0–9',  value: 76 },
    { name: '10–19',      value: 62 }, { name: '20+',  value: 41 },
  ]
  const sackMix = [
    { name: 'Sacked',  value: 4,   color: PALETTE.bad },
    { name: 'Threw',   value: 119, color: PALETTE.accent },
    { name: 'Scramble',value: 11,  color: PALETTE.cool },
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
    { key: 'pos',  label: 'Pos' },
    { key: 'tgt',  label: 'Tgt', numeric: true },
    { key: 'rec',  label: 'Rec', numeric: true },
    { key: 'yds',  label: 'Yds', numeric: true },
    { key: 'td',   label: 'TD',  numeric: true },
    { key: 'adot', label: 'aDOT',numeric: true, format: (v) => fmt.num(v, 1) },
    { key: 'yacrec', label: 'YAC/Rec', numeric: true, format: (v) => fmt.num(v, 1) },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <div className="qcard p-5 col-span-12 lg:col-span-5">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-chalk border border-line flex items-center justify-center font-display text-3xl">
              {player.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow">QB · {player.team}</p>
              <h3 className="font-display text-3xl tracking-tight mt-1">{player.name}</h3>
              {player.jersey != null && <p className="text-xs text-muted mt-1">#{player.jersey}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-line2">
            <Cell label="Games" value="4" />
            <Cell label="Pass Yds" value="1,107" />
            <Cell label="Pass TD" value="9" />
            <Cell label="QBR" value="72.4" trend={{ dir: 'up', value: '6.1' }} />
          </div>
        </div>
        <StatBlock label="Comp %" value="68.4%" sub="vs lg avg 65.1" />
        <StatBlock label="Y/A"    value="8.2"   sub="when leading 1–8" />
        <StatBlock label="TD:INT" value="9:1"   sub="Wk 5–8 slice" />
        <StatBlock label="Pos Rk" value="#3"    sub="of 32" />
      </Grid>

      <Grid>
        <Tile title="Passing yardage by week" subtitle="Air yards + YAC" span={4}>
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

      <Grid>
        <Tile title="Under pressure vs clean pocket" span={2}>
          <BarTile data={[
            { name: 'Y/A clean', value: 9.2 },
            { name: 'Y/A press', value: 5.4 },
            { name: 'Cmp% clean', value: 71.2 },
            { name: 'Cmp% press', value: 51.6 },
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
        <Tile title="Dropback outcomes" span={2}>
          <DonutTile data={sackMix} height={200} />
        </Tile>
      </Grid>

      <Tile title="Target distribution by receiver" subtitle="Within the current slicer slice" span={12}>
        <DataTable rows={targets} columns={targetCols} defaultSort={{ key: 'tgt', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 02 — Week by Week
 * ============================================================ */
function Weekly({ player }: { player: Player }) {
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
      <Tile title={`${player.name} — passing yards by week`} subtitle="Raw production, no fantasy" span={12}>
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

/* ============================================================
 * Tab 03 — Game-State Splits
 * ============================================================ */
function Splits({ player }: { player: Player }) {
  const byDown = [{ name: '1st', value: 58 }, { name: '2nd', value: 41 }, { name: '3rd', value: 32 }, { name: '4th', value: 5 }]
  const byDist = [{ name: '1–3', value: 28 }, { name: '4–6', value: 22 }, { name: '7–9', value: 31 }, { name: '10+', value: 55 }]
  const byZone = [
    { name: 'Own 1–20', value: 14 }, { name: 'Own 21–50', value: 56 },
    { name: 'Opp 49–21', value: 48 }, { name: 'Red zone', value: 16 }, { name: 'Goal line', value: 2 },
  ]
  const byQtr = [
    { name: 'Q1', value: 31, color: PALETTE.accent  },
    { name: 'Q2', value: 38, color: PALETTE.accent2 },
    { name: 'Q3', value: 27, color: PALETTE.cool    },
    { name: 'Q4', value: 40, color: PALETTE.muted   },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <Tile title="Dropbacks by down" span={3}><BarTile data={byDown} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Dropbacks by distance to go" span={3}><BarTile data={byDist} height={220} color={PALETTE.accent2} /></Tile>
      </Grid>
      <Grid>
        <Tile title="Dropbacks by field zone" span={3}><BarTile data={byZone} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Dropbacks by quarter" span={3}><DonutTile data={byQtr} height={220} /></Tile>
      </Grid>
      <Grid>
        <StatBlock label="3rd-down conv %" value="44.1%" sub="Lg avg 38.7" />
        <StatBlock label="2-min comp%"     value="71.4%" sub="21 / 49 plays" />
        <StatBlock label="When trailing"   value="8.6 Y/A" sub="trail 1–8 slice" />
        <StatBlock label="Shotgun rate"    value="82.3%" sub="vs 74 lg avg" />
      </Grid>
    </div>
  )
}

/* ============================================================
 * Tab 04 — Per-Play Efficiency
 * ============================================================ */
function Efficiency({ player }: { player: Player }) {
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
  const scatter = Array.from({ length: 32 }, (_, i) => ({
    x: -0.10 + Math.random() * 0.50,
    y: 38 + Math.random() * 16,
    z: 80 + Math.random() * 200,
    label: `QB${i}`,
  }))
  scatter[0] = { x: 0.34, y: 52.6, z: 240, label: player.name.split(' ').map(n => n[0]).join('') }

  return (
    <div className="space-y-4">
      <Tile title="EPA per dropback by week" subtitle="Negative = below average expectation. Dashed line = league average." span={12}>
        <LineTile data={epa} height={240}
          series={[{ key: 'value', label: 'EPA/db', color: PALETTE.accent }]}
          formatY={v => fmt.signed(v, 2)}
          refLine={{ y: 0, label: 'avg' }} />
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
        <StatBlock label="EPA/db"          value="+0.34" sub="Lg #2" />
        <StatBlock label="Success rate"    value="52.6%" sub="vs lg 45.1" />
        <StatBlock label="CPOE"            value="+3.2"  sub="Lg #4" />
        <StatBlock label="Pressure-to-sack" value="14.1%" sub="Best in lg" />
      </Grid>
    </div>
  )
}

/* ============================================================
 * Tab 05 — Fantasy Production (isolated)
 * ============================================================ */
function Fantasy({ player }: { player: Player }) {
  const fpByWeek = [
    { name: 'W5', passing: 22.4, rushing: 4.8, bonus: 4.0 },
    { name: 'W6', passing: 14.1, rushing: 7.1, bonus: 1.6 },
    { name: 'W7', passing: 18.5, rushing: 4.2, bonus: 4.0 },
    { name: 'W8', passing: 16.8, rushing: 3.9, bonus: 0.0 },
  ]
  const boomBust = [
    { name: 'Boom (25+)',   value: 3, color: PALETTE.ok },
    { name: 'Solid (15–24)',value: 1, color: PALETTE.accent },
    { name: 'Bust (<15)',   value: 0, color: PALETTE.bad },
  ]
  const byFormat = [
    { name: 'PPR', value: 25.4 }, { name: '½ PPR', value: 25.4 },
    { name: 'Standard', value: 25.4 }, { name: '6-pt pass', value: 31.4 }, { name: 'Superflex', value: 25.4 },
  ]
  const log = [
    { wk: 5, opp: '@ NO',   payds: 331, patd: 3, int: 0, ruyds: 18, rutd: 0, bonus: 3, ppr: 31.2 },
    { wk: 6, opp: 'vs DEN', payds: 220, patd: 2, int: 1, ruyds: 31, rutd: 1, bonus: 0, ppr: 22.8 },
    { wk: 7, opp: '@ SF',   payds: 312, patd: 2, int: 0, ruyds: 12, rutd: 0, bonus: 3, ppr: 26.7 },
    { wk: 8, opp: 'vs LV',  payds: 244, patd: 2, int: 0, ruyds: 22, rutd: 0, bonus: 0, ppr: 20.7 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk',    label: 'Wk',  numeric: true },
    { key: 'opp',   label: 'Opp' },
    { key: 'payds', label: 'Pa Yds', numeric: true },
    { key: 'patd',  label: 'Pa TD',  numeric: true },
    { key: 'int',   label: 'INT',    numeric: true },
    { key: 'ruyds', label: 'Ru Yds', numeric: true },
    { key: 'rutd',  label: 'Ru TD',  numeric: true },
    { key: 'bonus', label: 'Bonus',  numeric: true },
    { key: 'ppr',   label: 'PPR',    numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <div className="qcard p-5" style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FA 100%)',
        borderLeft: '3px solid #2A3B47',
      }}>
        <p className="eyebrow text-accent2">Fantasy Production · QB</p>
        <h4 className="font-display text-3xl mt-1 leading-tight">All fantasy-scoring views live here.</h4>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          PPR · half-PPR · standard · superflex · 6-pt passing — everything fantasy-shaped sits on
          this tab so the other four reports stay focused on the football itself.
        </p>
      </div>
      <Grid>
        <StatBlock label="Total FP (PPR)"   value="101.4" sub="4-game slice" />
        <StatBlock label="FP / Game"        value="25.4"  trend={{ dir: 'up', value: '3.1' }} sub="vs season avg" />
        <StatBlock label="Pos Rank (FP/G)"  value="QB1"   sub="of 32" />
        <StatBlock label="Boom rate (25+)"  value="75%"   sub="3 / 4 games" />
      </Grid>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Scoring format</span>
        <button className="chip applied">PPR</button>
        <button className="chip">½ PPR</button>
        <button className="chip">Standard</button>
        <button className="chip">Superflex</button>
        <button className="chip">6-pt pass TD</button>
      </div>
      <Grid>
        <Tile title="Fantasy points by week" subtitle="Stacked: passing · rushing · bonuses" span={4}>
          <StackedBarTile data={fpByWeek} xKey="name" height={240}
            series={[
              { key: 'passing', label: 'Passing FP', color: PALETTE.accent2 },
              { key: 'rushing', label: 'Rushing FP', color: PALETTE.cool },
              { key: 'bonus',   label: 'Bonuses',    color: PALETTE.accent },
            ]} />
        </Tile>
        <Tile title="Boom / Bust mix" span={2}>
          <DonutTile data={boomBust} height={240} />
        </Tile>
      </Grid>
      <Tile title="FP distribution by scoring format" span={12}>
        <BarTile data={byFormat} height={200} color={PALETTE.accent2} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Fantasy game log" subtitle="Source of points by week" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

/* helpers */
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
