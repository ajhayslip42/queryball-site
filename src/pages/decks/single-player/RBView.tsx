/**
 * RB view — Single Player shaped for running backs.
 *
 * Tabs:
 *   01. Overview              — rushing snapshot, gap breakdown, broken tackles, pass-catching role
 *   02. Week by Week          — carries, yards, YPC, broken tackles by week
 *   03. Game-State Splits     — goal-line, 3rd-down, score state, field position
 *   04. Per-Play Efficiency   — yards before/after contact, success rate, EPA per carry
 *   05. Fantasy Production    — all fantasy views, isolated to this tab
 */

import { type DeckTab } from '@/components/deck/DeckShell'
import { Tile, Grid, StatBlock } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, AreaTile, DonutTile, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'
import type { Player } from '@/lib/players'

export function getRBTabs(player: Player): DeckTab[] {
  return [
    { id: 'overview',   label: 'Overview',           render: () => <Overview player={player} /> },
    { id: 'weekly',     label: 'Week by Week',       render: () => <Weekly player={player} /> },
    { id: 'splits',     label: 'Game-State Splits',  render: () => <Splits player={player} /> },
    { id: 'efficiency', label: 'Per-Play Efficiency',render: () => <Efficiency player={player} /> },
    { id: 'fantasy',    label: 'Fantasy Production', fantasy: true, render: () => <Fantasy player={player} /> },
  ]
}

export const RB_SLICERS = [
  'season', 'week', 'team', 'opponent', 'homeAway',
  'down', 'distance', 'score', 'zone', 'qtr', 'personnel',
  'shotgun', 'playType', 'garbage',
] as const

function Overview({ player }: { player: Player }) {
  const rushByWeek = [
    { name: 'W1', bc: 38, ac: 47 }, { name: 'W2', bc: 22, ac: 38 },
    { name: 'W3', bc: 45, ac: 62 }, { name: 'W4', bc: 31, ac: 49 },
  ]
  const gapDist = [
    { name: 'LE',  value: 12 }, { name: 'LT', value: 18 }, { name: 'LG', value: 14 },
    { name: 'MID', value: 26 }, { name: 'RG', value: 11 }, { name: 'RT', value: 19 }, { name: 'RE', value: 8 },
  ]
  const usageMix = [
    { name: 'Rushes',  value: 78,  color: PALETTE.accent },
    { name: 'Targets', value: 22,  color: PALETTE.cool },
  ]
  const teammates = [
    { name: 'Saquon Barkley',    role: 'RB1',   car: 78, ru_yds: 412, tgt: 17, rec: 14, rec_yds: 121, td: 5 },
    { name: 'Kenneth Gainwell',  role: 'RB2',   car: 28, ru_yds: 119, tgt:  9, rec:  7, rec_yds:  52, td: 1 },
    { name: 'Will Shipley',      role: 'RB3',   car: 11, ru_yds:  44, tgt:  3, rec:  2, rec_yds:  18, td: 0 },
  ]
  const teamCols: Column<typeof teammates[0]>[] = [
    { key: 'name', label: 'Player' },
    { key: 'role', label: 'Role' },
    { key: 'car',  label: 'Car', numeric: true },
    { key: 'ru_yds', label: 'Ru Yds', numeric: true },
    { key: 'tgt',  label: 'Tgt', numeric: true },
    { key: 'rec',  label: 'Rec', numeric: true },
    { key: 'rec_yds', label: 'Rec Yds', numeric: true },
    { key: 'td',   label: 'TD',  numeric: true },
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
              <p className="eyebrow">RB · {player.team}</p>
              <h3 className="font-display text-3xl tracking-tight mt-1">{player.name}</h3>
              {player.jersey != null && <p className="text-xs text-muted mt-1">#{player.jersey}</p>}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-line2">
            <Cell label="Games" value="4" />
            <Cell label="Carries" value="78" />
            <Cell label="Ru Yds" value="412" />
            <Cell label="Ru TDs" value="5" trend={{ dir: 'up', value: '2' }} />
          </div>
        </div>
        <StatBlock label="YPC" value="5.3" sub="vs lg avg 4.2" />
        <StatBlock label="YAC / car" value="3.4" sub="after first contact" />
        <StatBlock label="Brk tackles" value="14" sub="lg #2" />
        <StatBlock label="Pos Rk" value="#1" sub="of 64" />
      </Grid>

      <Grid>
        <Tile title="Rush yards by week — before/after contact" subtitle="Where the yards come from" span={4}>
          <StackedBarTile data={rushByWeek} xKey="name" height={240}
            series={[
              { key: 'bc', label: 'Before contact', color: PALETTE.accent2 },
              { key: 'ac', label: 'After contact',  color: PALETTE.cool },
            ]} />
        </Tile>
        <Tile title="Carries by gap" subtitle="Where he runs" span={2}>
          <BarTile data={gapDist} height={240} color={PALETTE.accent} />
        </Tile>
      </Grid>

      <Grid>
        <Tile title="Usage mix" subtitle="Rushes vs targets" span={2}>
          <DonutTile data={usageMix} height={200} />
        </Tile>
        <Tile title="Red-zone work" subtitle="In the RZ slice" span={2}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Cell label="RZ carries" value="14" />
            <Cell label="RZ TDs" value="5" />
            <Cell label="Goal-line" value="6 / 7" small />
            <Cell label="RZ tgt share" value="22%" small />
          </div>
        </Tile>
        <Tile title="3rd-down work" subtitle="Pass-down usage" span={2}>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Cell label="3rd-down snaps" value="38" />
            <Cell label="3rd-down tgts"  value="11" />
            <Cell label="Conv rate" value="58%" small />
            <Cell label="Lg rank" value="#4" small />
          </div>
        </Tile>
      </Grid>

      <Tile title="Backfield distribution" subtitle="Touches within the team" span={12}>
        <DataTable rows={teammates} columns={teamCols} defaultSort={{ key: 'car', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

function Weekly({ player }: { player: Player }) {
  const carries = [{ name: 'W1', value: 22 }, { name: 'W2', value: 14 }, { name: 'W3', value: 25 }, { name: 'W4', value: 17 }]
  const ruYds   = [{ name: 'W1', value: 85 }, { name: 'W2', value: 60 }, { name: 'W3', value: 107 },{ name: 'W4', value: 80 }]
  const ypc     = [{ name: 'W1', value: 3.9 },{ name: 'W2', value: 4.3 },{ name: 'W3', value: 4.3 },{ name: 'W4', value: 4.7 }]
  const brkTkl  = [{ name: 'W1', value: 4 },  { name: 'W2', value: 2 },  { name: 'W3', value: 5 },  { name: 'W4', value: 3 }]
  const log = [
    { wk: 1, opp: '@ GB',   car: 22, yds: 85,  ypc: 3.9, td: 1, tgt: 6, rec: 5, rec_yds: 28, brk: 4, ypca: 3.1 },
    { wk: 2, opp: 'vs ATL', car: 14, yds: 60,  ypc: 4.3, td: 1, tgt: 4, rec: 3, rec_yds: 19, brk: 2, ypca: 3.3 },
    { wk: 3, opp: '@ NO',   car: 25, yds: 107, ypc: 4.3, td: 2, tgt: 4, rec: 3, rec_yds: 32, brk: 5, ypca: 3.4 },
    { wk: 4, opp: 'vs TB',  car: 17, yds: 80,  ypc: 4.7, td: 1, tgt: 3, rec: 3, rec_yds: 42, brk: 3, ypca: 3.6 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk', label: 'Wk', numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'car', label: 'Car', numeric: true },
    { key: 'yds', label: 'Yds', numeric: true },
    { key: 'ypc', label: 'YPC', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'td',  label: 'TD',  numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true },
    { key: 'rec_yds', label: 'Rec Y', numeric: true },
    { key: 'brk', label: 'BrkT', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Tile title={`${player.name} — rushing yards by week`} span={12}>
        <BarTile data={ruYds} height={240} color={PALETTE.accent} />
      </Tile>
      <Grid>
        <Tile title="Carries by week" span={2}><AreaTile data={carries} height={200} color={PALETTE.accent} /></Tile>
        <Tile title="YPC by week"     span={2}><LineTile data={ypc} height={200} series={[{ key: 'value', label: 'YPC', color: PALETTE.accent2 }]} formatY={v => fmt.num(v, 1)} /></Tile>
        <Tile title="Broken tackles"  span={2}><BarTile data={brkTkl} height={200} color={PALETTE.cool} /></Tile>
      </Grid>
      <Tile title="Weekly game log" span={12}>
        <DataTable rows={log} columns={cols} defaultSort={{ key: 'wk', dir: 'asc' }} />
      </Tile>
    </div>
  )
}

function Splits({ player }: { player: Player }) {
  const byDown = [{ name: '1st', value: 48 }, { name: '2nd', value: 23 }, { name: '3rd', value: 7 }, { name: '4th', value: 0 }]
  const byZone = [
    { name: 'Own 1–20', value: 8 }, { name: 'Own 21–50', value: 41 },
    { name: 'Opp 49–21', value: 22 }, { name: 'Red zone', value: 14 }, { name: 'Goal line', value: 6 },
  ]
  const byScore = [
    { name: 'Lead 9+', value: 28 }, { name: 'Lead 1–8', value: 18 }, { name: 'Tied', value: 14 },
    { name: 'Trail 1–8', value: 12 }, { name: 'Trail 9+', value: 6 },
  ]
  const byPersonnel = [
    { name: '11', value: 42 }, { name: '12', value: 21 }, { name: '21', value: 9 }, { name: '13', value: 4 }, { name: '22', value: 2 },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <Tile title="Carries by down" span={3}><BarTile data={byDown} height={220} color={PALETTE.accent} /></Tile>
        <Tile title="Carries by field zone" span={3}><BarTile data={byZone} height={220} color={PALETTE.accent2} /></Tile>
      </Grid>
      <Grid>
        <Tile title="Carries by score state" span={3}><BarTile data={byScore} height={220} color={PALETTE.cool} /></Tile>
        <Tile title="Carries by personnel" span={3}><BarTile data={byPersonnel} height={220} color={PALETTE.accent} /></Tile>
      </Grid>
      <Grid>
        <StatBlock label="Goal-line conv %" value="86%"  sub="6 / 7 carries" />
        <StatBlock label="3rd-and-short"    value="71%" sub="3rd & 1–3 conv" />
        <StatBlock label="When leading"     value="5.8 YPC" sub="lead 9+ slice" />
        <StatBlock label="11-personnel YPC" value="5.1" sub="42 of 78 car" />
      </Grid>
    </div>
  )
}

function Efficiency({ player }: { player: Player }) {
  const ypca = [
    { name: 'W1', value: 3.1 }, { name: 'W2', value: 3.3 },
    { name: 'W3', value: 3.4 }, { name: 'W4', value: 3.6 },
  ]
  const sr = [
    { name: 'W1', value: 51 }, { name: 'W2', value: 43 },
    { name: 'W3', value: 56 }, { name: 'W4', value: 47 },
  ]
  const epa = [
    { name: 'W1', value: 0.04 }, { name: 'W2', value: -0.02 },
    { name: 'W3', value: 0.12 }, { name: 'W4', value: 0.07 },
  ]
  return (
    <div className="space-y-4">
      <Tile title="YPC after contact by week" subtitle="What he creates beyond what was blocked" span={12}>
        <LineTile data={ypca} height={240}
          series={[{ key: 'value', label: 'Yds after contact', color: PALETTE.cool }]}
          formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Grid>
        <Tile title="Rush success rate by week" span={3}>
          <BarTile data={sr} height={200} color={PALETTE.ok} formatY={v => `${v}%`} />
        </Tile>
        <Tile title="EPA per carry by week" span={3}>
          <BarTile data={epa} height={200} color={PALETTE.accent} formatY={v => fmt.signed(v, 2)} />
        </Tile>
      </Grid>
      <Grid>
        <StatBlock label="Yds before contact" value="1.9" sub="vs lg 2.3" />
        <StatBlock label="Yds after contact"  value="3.4" sub="vs lg 2.1" />
        <StatBlock label="Success rate"       value="49%" sub="lg avg 41%" />
        <StatBlock label="Stuff rate"         value="12%" sub="<= 0 yds; lg 21%" />
      </Grid>
    </div>
  )
}

function Fantasy({ player }: { player: Player }) {
  const fpByWeek = [
    { name: 'W1', rushing: 11.5, receiving: 5.8, td: 6 },
    { name: 'W2', rushing: 7.0,  receiving: 4.9, td: 6 },
    { name: 'W3', rushing: 13.7, receiving: 6.2, td: 12 },
    { name: 'W4', rushing: 10.2, receiving: 7.2, td: 6 },
  ]
  const boomBust = [
    { name: 'Boom (20+)',   value: 2, color: PALETTE.ok },
    { name: 'Solid (12–19)',value: 2, color: PALETTE.accent },
    { name: 'Bust (<12)',   value: 0, color: PALETTE.bad },
  ]
  const byFormat = [
    { name: 'PPR',      value: 23.4 }, { name: '½ PPR', value: 21.7 },
    { name: 'Standard', value: 19.9 }, { name: 'Superflex', value: 23.4 },
  ]
  const log = [
    { wk: 1, opp: '@ GB',   car: 22, ru_yds: 85,  ru_td: 1, tgt: 6, rec: 5, rec_yds: 28, rec_td: 0, ppr: 23.3 },
    { wk: 2, opp: 'vs ATL', car: 14, ru_yds: 60,  ru_td: 1, tgt: 4, rec: 3, rec_yds: 19, rec_td: 0, ppr: 17.9 },
    { wk: 3, opp: '@ NO',   car: 25, ru_yds: 107, ru_td: 2, tgt: 4, rec: 3, rec_yds: 32, rec_td: 0, ppr: 31.9 },
    { wk: 4, opp: 'vs TB',  car: 17, ru_yds: 80,  ru_td: 1, tgt: 3, rec: 3, rec_yds: 42, rec_td: 0, ppr: 23.2 },
  ]
  const cols: Column<typeof log[0]>[] = [
    { key: 'wk', label: 'Wk', numeric: true },
    { key: 'opp', label: 'Opp' },
    { key: 'car', label: 'Car', numeric: true },
    { key: 'ru_yds', label: 'Ru Y', numeric: true },
    { key: 'ru_td', label: 'Ru TD', numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true },
    { key: 'rec', label: 'Rec', numeric: true },
    { key: 'rec_yds', label: 'Rec Y', numeric: true },
    { key: 'rec_td',  label: 'Rec TD', numeric: true },
    { key: 'ppr',     label: 'PPR', numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <div className="qcard p-5" style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FA 100%)',
        borderLeft: '3px solid #2A3B47',
      }}>
        <p className="eyebrow text-accent2">Fantasy Production · RB</p>
        <h4 className="font-display text-3xl mt-1 leading-tight">All fantasy-scoring views live here.</h4>
        <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">
          PPR · half-PPR · standard — all the formats that matter for running backs, with the pass-catching
          component broken out so you can see the floor a receiving role gives.
        </p>
      </div>
      <Grid>
        <StatBlock label="Total FP (PPR)" value="96.3" sub="4-game slice" />
        <StatBlock label="FP / Game"     value="24.1" trend={{ dir: 'up', value: '4.6' }} sub="vs season avg" />
        <StatBlock label="Pos Rank"      value="RB1"  sub="of 64" />
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
        <Tile title="Fantasy points by week" subtitle="Stacked: rushing · receiving · TDs" span={4}>
          <StackedBarTile data={fpByWeek} xKey="name" height={240}
            series={[
              { key: 'rushing',   label: 'Rushing',   color: PALETTE.accent },
              { key: 'receiving', label: 'Receiving', color: PALETTE.cool },
              { key: 'td',        label: 'TDs',       color: PALETTE.accent2 },
            ]} />
        </Tile>
        <Tile title="Boom / Bust mix" span={2}><DonutTile data={boomBust} height={240} /></Tile>
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
