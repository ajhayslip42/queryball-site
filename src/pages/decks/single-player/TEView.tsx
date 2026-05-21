/**
 * TE view — Single Player shaped for tight ends.
 *
 * Tabs:
 *   01. Overview              — alignment (in-line vs flexed), targets, blocking-vs-routes mix
 *   02. Week by Week          — targets, yards, TDs, routes by week
 *   03. Game-State Splits     — RZ work, by score, by personnel, by alignment
 *   04. Per-Play Efficiency   — YPRR, target rate per route, contested catch %
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

export function getTETabs(player: Player): DeckTab[] {
  return [
    { id: 'overview',   label: 'Overview',           render: () => <Overview player={player} /> },
    { id: 'weekly',     label: 'Week by Week',       render: () => <Weekly player={player} /> },
    { id: 'splits',     label: 'Game-State Splits',  render: () => <Splits player={player} /> },
    { id: 'efficiency', label: 'Per-Play Efficiency',render: () => <Efficiency player={player} /> },
    { id: 'fantasy',    label: 'Fantasy Production', fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}

export const TE_SLICERS = [
  'season', 'week', 'team', 'opponent', 'homeAway',
  'down', 'distance', 'score', 'zone', 'qtr', 'personnel',
  'shotgun', 'playType', 'garbage',
] as const

function Overview({ player }: { player: Player }) {
  const snapsByWeek = [
    { name: 'W1', routes: 32, block: 14 }, { name: 'W2', routes: 28, block: 18 },
    { name: 'W3', routes: 36, block: 12 }, { name: 'W4', routes: 30, block: 16 },
  ]
  const alignmentMix = [
    { name: 'In-line',  value: 52, color: PALETTE.accent2 },
    { name: 'Flexed',   value: 28, color: PALETTE.accent },
    { name: 'Slot',     value: 16, color: PALETTE.cool },
    { name: 'Backfield',value:  4, color: PALETTE.muted },
  ]
  const tgtByAlign = [
    { name: 'In-line',  value: 12 }, { name: 'Flexed', value: 14 },
    { name: 'Slot',     value: 9 },  { name: 'Backfield', value: 2 },
  ]
  const rzTable = [
    { situation: 'Inside 20',       routes: 22, tgt: 8, rec: 6, yds: 51, td: 3 },
    { situation: 'Inside 10',       routes: 11, tgt: 5, rec: 4, yds: 27, td: 3 },
    { situation: 'Goal line (≤5)',  routes:  5, tgt: 2, rec: 2, yds:  6, td: 2 },
  ]
  const rzCols: Column<typeof rzTable[0]>[] = [
    { key: 'situation', label: 'Situation' },
    { key: 'routes',    label: 'Routes',    numeric: true },
    { key: 'tgt',       label: 'Tgt',       numeric: true },
    { key: 'rec',       label: 'Rec',       numeric: true },
    { key: 'yds',       label: 'Yds',       numeric: true },
    { key: 'td',        label: 'TD',        numeric: true },
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
              <p className="eyebrow">TE · {player.team}</p>
              <h3 className="font-display text-3xl tracking-tight mt-1">{player.name}</h3>
              {player.jersey != null && <p className="text-xs text-muted mt-1">#{player.jersey}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-line2">
            <Cell label="Games" value="4" />
            <Cell label="Targets" value="37" />
            <Cell label="Catches" value="28" />
            <Cell label="Yards" value="316" trend={{ dir: 'up', value: '52' }} />
          </div>
        </div>
        <StatBlock label="Tgt Share" value="22%" sub="of team pass attempts" />
        <StatBlock label="aDOT" value="7.4" sub="vs TE avg 8.1" />
        <StatBlock label="Route rate" value="68%" sub="routes / dropbacks" />
        <StatBlock label="Pos Rk" value="#3" sub="of 32 TEs" />
      </Grid>

      <Grid>
        <Tile title="Snaps by week — routes vs blocking" subtitle="What he was asked to do" span={4}>
          <StackedBarTile data={snapsByWeek} xKey="name" height={240}
            series={[
              { key: 'routes', label: 'Routes',   color: PALETTE.accent },
              { key: 'block',  label: 'Blocking', color: PALETTE.accent2 },
            ]} />
        </Tile>
        <Tile title="Alignment mix" subtitle="Where he lines up" span={2}>
          <DonutTile data={alignmentMix} height={240} />
        </Tile>
      </Grid>

      <Grid>
        <Tile title="Targets by alignment" subtitle="Where the receptions come from" span={3}>
          <BarTile data={tgtByAlign} height={200} color={PALETTE.accent} />
        </Tile>
        <Tile title="Red-zone snapshot" span={3}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Cell label="RZ targets" value="8" />
            <Cell label="RZ TDs" value="3" />
            <Cell label="EZ targets" value="5" small />
            <Cell label="RZ tgt share" value="29%" small />
          </div>
        </Tile>
      </Grid>

      <Tile title="Red-zone production" subtitle="Where TE value usually lives" span={12}>
        <DataTable rows={rzTable} columns={rzCols} />
      </Tile>
    </div>
  )
}

function Weekly({ player }: { player: Player }) {
  const tgt   = [{ name: 'W1', value: 10 }, { name: 'W2', value: 8 },  { name: 'W3', value: 11 }, { name: 'W4', value: 8 }]
  const yds   = [{ name: 'W1', value: 88 }, { name: 'W2', value: 65 }, { name: 'W3', value: 97 }, { name: 'W4', value: 66 }]
  const td    = [{ name: 'W1', value: 1 },  { name: 'W2', value: 0 },  { name: 'W3', value: 2 },  { name: 'W4', value: 0 }]
  const routes= [{ name: 'W1', value: 32 }, { name: 'W2', value: 28 }, { name: 'W3', value: 36 }, { name: 'W4', value: 30 }]
  const log = [
    { wk: 1, opp: '@ DEN',  routes: 32, tgt: 10, rec: 7, yds: 88, td: 1, yprr: 2.8 },
    { wk: 2, opp: 'vs CIN', routes: 28, tgt:  8, rec: 6, yds: 65, td: 0, yprr: 2.3 },
    { wk: 3, opp: '@ ATL',  routes: 36, tgt: 11, rec: 9, yds: 97, td: 2, yprr: 2.7 },
    { wk: 4, opp: 'vs LAC', routes: 30, tgt:  8, rec: 6, yds: 66, td: 0, yprr: 2.2 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk', label: 'Wk', numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'routes', label: 'Routes', numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'td',  label: 'TD',  numeric: true },
    { key: 'yprr',label: 'YPRR',numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <Tile title={`${player.name} — receiving yards by week`} span={12}>
        <BarTile data={yds} height={240} color={PALETTE.accent} />
      </Tile>
      <Grid>
        <Tile title="Targets by week" span={2}><AreaTile data={tgt} height={200} color={PALETTE.accent} /></Tile>
        <Tile title="Routes run by week" span={2}><LineTile data={routes} height={200} series={[{ key: 'value', label: 'Routes', color: PALETTE.accent2 }]} /></Tile>
        <Tile title="TDs by week" span={2}><BarTile data={td} height={200} color={PALETTE.cool} /></Tile>
      </Grid>
      <Tile title="Weekly game log" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

function Splits({ player }: { player: Player }) {
  const byDown = [{ name: '1st', value: 16 }, { name: '2nd', value: 14 }, { name: '3rd', value: 7 }, { name: '4th', value: 0 }]
  const byScore = [
    { name: 'Lead 9+', value: 7 }, { name: 'Lead 1–8', value: 9 }, { name: 'Tied', value: 8 },
    { name: 'Trail 1–8', value: 9 }, { name: 'Trail 9+', value: 4 },
  ]
  const byZone = [
    { name: 'Own 1–20', value: 4 }, { name: 'Own 21–50', value: 15 },
    { name: 'Opp 49–21', value: 10 }, { name: 'Red zone', value: 6 }, { name: 'Goal line', value: 2 },
  ]
  const byPersonnel = [
    { name: '11', value: 14 }, { name: '12', value: 18 }, { name: '13', value: 4 }, { name: '21', value: 1 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <Tile title="Targets by down" span={3}><BarTile data={byDown} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Targets by score state" span={3}><BarTile data={byScore} height={220} color={PALETTE.accent2} /></Tile>
      </Grid>
      <Grid>
        <Tile title="Targets by field zone" span={3}><BarTile data={byZone} height={220} color={PALETTE.cool} /></Tile>
        <Tile title="Targets by personnel" span={3}><BarTile data={byPersonnel} height={220} color={PALETTE.accent} /></Tile>
      </Grid>
      <Grid>
        <StatBlock label="3rd-down tgt share" value="26%" sub="of team 3rd-down passes" />
        <StatBlock label="RZ tgt share"       value="29%" sub="lg #4 among TEs" />
        <StatBlock label="12-personnel YPRR"  value="2.5" sub="when 2 TEs in" />
        <StatBlock label="In-line YPRR"       value="1.8" sub="when attached to the line" />
      </Grid>
    </div>
  )
}

function Efficiency({ player }: { player: Player }) {
  const yprr = [{ name: 'W1', value: 2.8 }, { name: 'W2', value: 2.3 }, { name: 'W3', value: 2.7 }, { name: 'W4', value: 2.2 }]
  const tgtRate = [{ name: 'W1', value: 31 }, { name: 'W2', value: 29 }, { name: 'W3', value: 31 }, { name: 'W4', value: 27 }]
  const ctcst = [{ name: 'W1', value: 71 }, { name: 'W2', value: 50 }, { name: 'W3', value: 67 }, { name: 'W4', value: 60 }]
  return (
    <div className="space-y-4">
      <Tile title="Yards per route run (YPRR) by week" subtitle="The premier TE efficiency metric" span={12}>
        <LineTile data={yprr} height={240}
          series={[{ key: 'value', label: 'YPRR', color: PALETTE.accent }]}
          formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Grid>
        <Tile title="Target rate per route" span={3}>
          <BarTile data={tgtRate} height={200} color={PALETTE.ok} formatY={v => `${v}%`} />
        </Tile>
        <Tile title="Contested catch %" span={3}>
          <BarTile data={ctcst} height={200} color={PALETTE.accent2} formatY={v => `${v}%`} />
        </Tile>
      </Grid>
      <Grid>
        <StatBlock label="YPRR"              value="2.51" sub="lg #3 among TEs" />
        <StatBlock label="Tgt rate / route"  value="30%"  sub="vs lg 18%" />
        <StatBlock label="Catch rate"        value="76%"  sub="28 / 37 targets" />
        <StatBlock label="Drop rate"         value="3%"   sub="1 / 29 catchable" />
      </Grid>
    </div>
  )
}

function Fantasy({ player }: { player: Player }) {
  const fpByWeek = [
    { name: 'W1', receiving: 15.8, td: 6.0, bonus: 0.0 },
    { name: 'W2', receiving: 12.5, td: 0.0, bonus: 0.0 },
    { name: 'W3', receiving: 18.7, td: 12.0,bonus: 0.0 },
    { name: 'W4', receiving: 12.6, td: 0.0, bonus: 0.0 },
  ]
  const boomBust = [
    { name: 'Boom (15+)',   value: 3, color: PALETTE.ok },
    { name: 'Solid (10–14)',value: 1, color: PALETTE.accent },
    { name: 'Bust (<10)',   value: 0, color: PALETTE.bad },
  ]
  const byFormat = [
    { name: 'PPR',       value: 18.6 }, { name: '½ PPR', value: 15.1 },
    { name: 'Standard',  value: 11.6 }, { name: 'TE prem', value: 22.6 },
  ]
  const log = [
    { wk: 1, opp: '@ DEN',  tgt: 10, rec: 7, yds: 88, td: 1, ppr: 21.8 },
    { wk: 2, opp: 'vs CIN', tgt:  8, rec: 6, yds: 65, td: 0, ppr: 12.5 },
    { wk: 3, opp: '@ ATL',  tgt: 11, rec: 9, yds: 97, td: 2, ppr: 30.7 },
    { wk: 4, opp: 'vs LAC', tgt:  8, rec: 6, yds: 66, td: 0, ppr: 12.6 },
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
        <p className="eyebrow text-accent2">Fantasy Production · TE</p>
        <h4 className="font-display text-3xl mt-1 leading-tight">All fantasy-scoring views live here.</h4>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          PPR · half-PPR · standard · TE-premium. TE-premium (1.5 PPR for TEs) is the format where the
          position actually matters — the toggle shows you the gap between formats clearly.
        </p>
      </div>
      <Grid>
        <StatBlock label="Total FP (PPR)" value="77.6" sub="4-game slice" />
        <StatBlock label="FP / Game"     value="19.4" trend={{ dir: 'up', value: '2.7' }} sub="vs season avg" />
        <StatBlock label="Pos Rank"      value="TE1"  sub="of 32" />
        <StatBlock label="Boom rate"     value="75%"  sub="3 / 4 games" />
      </Grid>
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">Scoring format</span>
        <button className="chip applied">PPR</button>
        <button className="chip">½ PPR</button>
        <button className="chip">Standard</button>
        <button className="chip">TE premium</button>
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
      <Tile title="FP by scoring format" subtitle="Where TE-premium changes the math" span={12}>
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
