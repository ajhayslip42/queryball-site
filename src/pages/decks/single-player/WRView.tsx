/**
 * WR view — Single Player shaped for wide receivers.
 *
 * Tabs:
 *   01. Overview              — target share, alignment, route share, target depth
 *   02. Week by Week          — targets, catches, yards by week
 *   03. Game-State Splits     — RZ targets, by score, by personnel, by alignment
 *   04. Per-Play Efficiency   — yards per route run, YAC over expected, contested rate, separation
 *   05. Fantasy Production    — all fantasy views, isolated
 */

import { type DeckTab } from '@/components/deck/DeckShell'
import { Tile, Grid, StatBlock } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, AreaTile, DonutTile, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'
import type { Player } from '@/lib/players'

export function getWRTabs(player: Player): DeckTab[] {
  return [
    { id: 'overview',   label: 'Overview',           render: () => <Overview player={player} /> },
    { id: 'weekly',     label: 'Week by Week',       render: () => <Weekly player={player} /> },
    { id: 'splits',     label: 'Game-State Splits',  render: () => <Splits player={player} /> },
    { id: 'efficiency', label: 'Per-Play Efficiency',render: () => <Efficiency player={player} /> },
    { id: 'fantasy',    label: 'Fantasy Production', fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}

export const WR_SLICERS = [
  'season', 'week', 'team', 'opponent', 'homeAway',
  'down', 'distance', 'score', 'zone', 'qtr', 'personnel',
  'shotgun', 'playType', 'garbage',
] as const

function Overview({ player }: { player: Player }) {
  const tgtsByWeek = [
    { name: 'W1', air: 78, yac: 42 }, { name: 'W2', air: 56, yac: 31 },
    { name: 'W3', air: 91, yac: 58 }, { name: 'W4', air: 64, yac: 39 },
  ]
  const alignment = [
    { name: 'X (boundary)', value: 64, color: PALETTE.accent },
    { name: 'Z (field)',    value: 22, color: PALETTE.cool },
    { name: 'Slot',         value: 14, color: PALETTE.accent2 },
  ]
  const depth = [
    { name: 'Screen', value: 12 }, { name: 'Short (0–9)', value: 38 },
    { name: 'Int (10–19)', value: 28 }, { name: 'Deep (20+)', value: 22 },
  ]
  const route = [
    { route: 'Go',     n: 14, tgt: 8,  yds: 142, td: 1, yprr: 2.8 },
    { route: 'Slant',  n: 18, tgt: 11, yds:  98, td: 1, yprr: 2.1 },
    { route: 'Curl',   n: 22, tgt: 9,  yds:  87, td: 0, yprr: 1.4 },
    { route: 'Post',   n: 11, tgt: 6,  yds:  91, td: 1, yprr: 2.9 },
    { route: 'Dig',    n: 14, tgt: 5,  yds:  72, td: 0, yprr: 1.9 },
    { route: 'Out',    n: 16, tgt: 7,  yds:  64, td: 0, yprr: 1.3 },
    { route: 'Screen', n: 12, tgt: 11, yds:  68, td: 1, yprr: 1.6 },
  ]
  const cols: Column<typeof route[0]>[] = [
    { key: 'route', label: 'Route' },
    { key: 'n',     label: 'Routes', numeric: true },
    { key: 'tgt',   label: 'Tgt',    numeric: true },
    { key: 'yds',   label: 'Yds',    numeric: true },
    { key: 'td',    label: 'TD',     numeric: true },
    { key: 'yprr',  label: 'YPRR',   numeric: true, format: v => fmt.num(v, 2) },
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
              <p className="eyebrow">WR · {player.team}</p>
              <h3 className="font-display text-3xl tracking-tight mt-1">{player.name}</h3>
              {player.jersey != null && <p className="text-xs text-muted mt-1">#{player.jersey}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-line2">
            <Cell label="Games" value="4" />
            <Cell label="Targets" value="44" />
            <Cell label="Catches" value="29" />
            <Cell label="Yards" value="459" trend={{ dir: 'up', value: '87' }} />
          </div>
        </div>
        <StatBlock label="Tgt Share" value="28%" sub="of team pass attempts" />
        <StatBlock label="aDOT" value="12.4" sub="vs WR avg 10.1" />
        <StatBlock label="YAC / Rec" value="5.6" sub="lg avg 4.8" />
        <StatBlock label="Pos Rk" value="#4" sub="of 100 WRs" />
      </Grid>

      <Grid>
        <Tile title="Receiving yards by week — air vs YAC" subtitle="Where the yards come from" span={4}>
          <StackedBarTile data={tgtsByWeek} xKey="name" height={240}
            series={[
              { key: 'air', label: 'Air yards', color: PALETTE.accent },
              { key: 'yac', label: 'YAC',       color: PALETTE.cool },
            ]} />
        </Tile>
        <Tile title="Alignment mix" subtitle="Where he lines up" span={2}>
          <DonutTile data={alignment} height={240} />
        </Tile>
      </Grid>

      <Grid>
        <Tile title="Target distribution by depth" subtitle="Air-yards bucket" span={3}>
          <BarTile data={depth} height={200} color={PALETTE.accent} />
        </Tile>
        <Tile title="Red-zone usage" span={3}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Cell label="RZ targets" value="11" />
            <Cell label="RZ TDs" value="4" />
            <Cell label="EZ targets" value="7" small />
            <Cell label="RZ tgt share" value="34%" small />
          </div>
        </Tile>
      </Grid>

      <Tile title="Route tree" subtitle="Per-route production. YPRR = yards per route run." span={12}>
        <DataTable rows={route} columns={cols} defaultSort={{ key: 'yprr', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

function Weekly({ player }: { player: Player }) {
  const targets = [{ name: 'W1', value: 11 }, { name: 'W2', value: 8 }, { name: 'W3', value: 14 }, { name: 'W4', value: 11 }]
  const yards   = [{ name: 'W1', value: 120}, { name: 'W2', value: 87}, { name: 'W3', value: 149}, { name: 'W4', value: 103}]
  const catchPct = [{ name: 'W1', value: 73 }, { name: 'W2', value: 50 }, { name: 'W3', value: 71 }, { name: 'W4', value: 64 }]
  const log = [
    { wk: 1, opp: '@ NYG',  tgt: 11, rec: 8, yds: 120, td: 1, adot: 11.4, yac_rec: 5.2, longest: 38, cont_pct: 18 },
    { wk: 2, opp: 'vs SF',  tgt: 8,  rec: 4, yds: 87,  td: 1, adot: 14.1, yac_rec: 6.8, longest: 42, cont_pct: 25 },
    { wk: 3, opp: '@ HOU',  tgt: 14, rec: 10, yds: 149, td: 1, adot: 13.2, yac_rec: 6.1, longest: 31, cont_pct: 21 },
    { wk: 4, opp: 'vs DAL', tgt: 11, rec: 7, yds: 103, td: 1, adot: 10.8, yac_rec: 4.4, longest: 26, cont_pct: 18 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk', label: 'Wk', numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'td',  label: 'TD',  numeric: true },
    { key: 'adot',label: 'aDOT',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'yac_rec', label: 'YAC/R', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'longest', label: 'Long', numeric: true },
    { key: 'cont_pct', label: 'Cont%', numeric: true, format: v => `${v}%` },
  ]
  return (
    <div className="space-y-4">
      <Tile title={`${player.name} — receiving yards by week`} span={12}>
        <BarTile data={yards} height={240} color={PALETTE.accent} />
      </Tile>
      <Grid>
        <Tile title="Targets by week" span={3}><AreaTile data={targets} height={200} color={PALETTE.accent} /></Tile>
        <Tile title="Catch % by week" span={3}><LineTile data={catchPct} height={200} series={[{ key: 'value', label: 'Catch%', color: PALETTE.accent2 }]} formatY={v => `${v}%`} /></Tile>
      </Grid>
      <Tile title="Weekly game log" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

function Splits({ player }: { player: Player }) {
  const byDown = [{ name: '1st', value: 19 }, { name: '2nd', value: 16 }, { name: '3rd', value: 9 }, { name: '4th', value: 0 }]
  const byScore = [
    { name: 'Lead 9+', value: 8 }, { name: 'Lead 1–8', value: 12 }, { name: 'Tied', value: 9 },
    { name: 'Trail 1–8', value: 11 }, { name: 'Trail 9+', value: 4 },
  ]
  const byZone = [
    { name: 'Own 1–20', value: 4 }, { name: 'Own 21–50', value: 18 },
    { name: 'Opp 49–21', value: 11 }, { name: 'Red zone', value: 8 }, { name: 'Goal line', value: 3 },
  ]
  const byAlignment = [
    { name: 'X (out)',  value: 28, color: PALETTE.accent },
    { name: 'Z (out)',  value: 9,  color: PALETTE.cool },
    { name: 'Slot',     value: 7,  color: PALETTE.accent2 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <Tile title="Targets by down" span={3}><BarTile data={byDown} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Targets by score state" span={3}><BarTile data={byScore} height={220} color={PALETTE.accent2} /></Tile>
      </Grid>
      <Grid>
        <Tile title="Targets by field zone" span={3}><BarTile data={byZone} height={220} color={PALETTE.cool} /></Tile>
        <Tile title="Targets by alignment" span={3}><DonutTile data={byAlignment} height={220} /></Tile>
      </Grid>
      <Grid>
        <StatBlock label="3rd-down target share" value="34%"  sub="vs team avg 23%" />
        <StatBlock label="RZ target share"       value="34%"  sub="lg #6 among WRs" />
        <StatBlock label="When trailing"         value="3.2 tgts/g" sub="trail 1+ slice" />
        <StatBlock label="11-personnel YPRR"     value="2.4" sub="vs WR avg 1.8" />
      </Grid>
    </div>
  )
}

function Efficiency({ player }: { player: Player }) {
  const yprr = [{ name: 'W1', value: 2.3 }, { name: 'W2', value: 1.9 }, { name: 'W3', value: 2.7 }, { name: 'W4', value: 2.2 }]
  const yacx = [{ name: 'W1', value: 1.1 }, { name: 'W2', value: 0.4 }, { name: 'W3', value: 1.4 }, { name: 'W4', value: 0.6 }]
  const sep  = [{ name: 'W1', value: 3.1 }, { name: 'W2', value: 2.6 }, { name: 'W3', value: 3.4 }, { name: 'W4', value: 2.9 }]
  return (
    <div className="space-y-4">
      <Tile title="Yards per route run (YPRR) by week" subtitle="The single best per-play WR metric" span={12}>
        <LineTile data={yprr} height={240}
          series={[{ key: 'value', label: 'YPRR', color: PALETTE.accent }]}
          formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Grid>
        <Tile title="YAC over expected by week" subtitle="Yards beyond model expectation" span={3}>
          <BarTile data={yacx} height={200} color={PALETTE.cool} formatY={v => fmt.signed(v, 1)} />
        </Tile>
        <Tile title="Separation at catch (yds)" subtitle="Avg space at the moment of catch" span={3}>
          <BarTile data={sep} height={200} color={PALETTE.accent2} formatY={v => fmt.num(v, 1)} />
        </Tile>
      </Grid>
      <Grid>
        <StatBlock label="YPRR"               value="2.31" sub="lg #5 among WRs" />
        <StatBlock label="YAC over expected"  value="+0.9" sub="per reception" />
        <StatBlock label="Catch rate"         value="66%"  sub="29 / 44 targets" />
        <StatBlock label="Contested catch %"  value="54%"  sub="7 / 13 contested" />
      </Grid>
    </div>
  )
}

function Fantasy({ player }: { player: Player }) {
  const fpByWeek = [
    { name: 'W1', receiving: 18.0, td: 6.0, bonus: 0.0 },
    { name: 'W2', receiving: 12.7, td: 6.0, bonus: 0.0 },
    { name: 'W3', receiving: 24.9, td: 6.0, bonus: 0.0 },
    { name: 'W4', receiving: 17.3, td: 6.0, bonus: 0.0 },
  ]
  const boomBust = [
    { name: 'Boom (20+)',   value: 2, color: PALETTE.ok },
    { name: 'Solid (12–19)',value: 2, color: PALETTE.accent },
    { name: 'Bust (<12)',   value: 0, color: PALETTE.bad },
  ]
  const byFormat = [
    { name: 'PPR',       value: 22.4 }, { name: '½ PPR', value: 18.9 },
    { name: 'Standard',  value: 15.4 }, { name: 'Superflex', value: 22.4 },
  ]
  const log = [
    { wk: 1, opp: '@ NYG',  tgt: 11, rec: 8, yds: 120, td: 1, ppr: 24.0 },
    { wk: 2, opp: 'vs SF',  tgt: 8,  rec: 4, yds: 87,  td: 1, ppr: 18.7 },
    { wk: 3, opp: '@ HOU',  tgt: 14, rec: 10,yds: 149, td: 1, ppr: 30.9 },
    { wk: 4, opp: 'vs DAL', tgt: 11, rec: 7, yds: 103, td: 1, ppr: 23.3 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk', label: 'Wk', numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'td',  label: 'TD',  numeric: true },
    { key: 'ppr', label: 'PPR', numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <div className="qcard p-5" style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FA 100%)',
        borderLeft: '3px solid #2A3B47',
      }}>
        <p className="eyebrow text-accent2">Fantasy Production · WR</p>
        <h4 className="font-display text-3xl mt-1 leading-tight">All fantasy-scoring views live here.</h4>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          PPR · half-PPR · standard. The format toggle matters most at WR — PPR rewards target volume
          even on quiet weeks; standard punishes possession receivers and rewards big-play guys.
        </p>
      </div>
      <Grid>
        <StatBlock label="Total FP (PPR)" value="96.9" sub="4-game slice" />
        <StatBlock label="FP / Game"     value="24.2" trend={{ dir: 'up', value: '4.8' }} sub="vs season avg" />
        <StatBlock label="Pos Rank"      value="WR3"  sub="of 100" />
        <StatBlock label="Boom rate"     value="50%"  sub="2 / 4 games" />
      </Grid>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Scoring format</span>
        <button className="chip applied">PPR</button>
        <button className="chip">½ PPR</button>
        <button className="chip">Standard</button>
        <button className="chip">Superflex</button>
      </div>
      <Grid>
        <Tile title="Fantasy points by week" subtitle="Receiving · TDs · bonuses" span={4}>
          <StackedBarTile data={fpByWeek} xKey="name" height={240}
            series={[
              { key: 'receiving', label: 'Receiving', color: PALETTE.accent },
              { key: 'td',        label: 'TDs',       color: PALETTE.accent2 },
              { key: 'bonus',     label: 'Bonus',     color: PALETTE.cool },
            ]} />
        </Tile>
        <Tile title="Boom / Bust mix" span={2}><DonutTile data={boomBust} height={240} /></Tile>
      </Grid>
      <Tile title="FP by scoring format" subtitle="How much PPR is propping up the line" span={12}>
        <BarTile data={byFormat} height={200} color={PALETTE.accent2} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Fantasy game log" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

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
