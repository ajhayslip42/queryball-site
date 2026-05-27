/**
 * Team Defense (Against) — REAL DATA.
 *
 * A position toggle (QB/RB/WR/TE) reshapes the "allowed" tabs. Fantasy- and
 * yards-allowed come from grouping offensive player_week by opponent_team —
 * i.e. what each defense surrenders to that position. Overall defensive EPA
 * comes from play-by-play.
 */

import { useState } from 'react'
import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS, POSITION_COLORS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'

function pwWhere(slicers: ReturnType<typeof useSlicers>['slicers']): string {
  const seasons = slicers.seasons.length ? slicers.seasons.join(',') : '2024'
  const st = slicers.seasonType === 'postseason' ? 'POST' : slicers.seasonType === 'all' ? null : 'REG'
  let w = ` AND season IN (${seasons})`
  if (st) w += ` AND season_type='${st}'`
  if (slicers.weeks.length) w += ` AND week IN (${slicers.weeks.join(',')})`
  return w
}

function PositionToggle({ pos, onChange }: { pos: Pos; onChange: (p: Pos) => void }) {
  return (
    <div className="qcard p-4 mb-2 flex items-center gap-3 flex-wrap"
      style={{ background: 'linear-gradient(180deg,#FFF 0%,#F7F9FA 100%)', borderLeft: '3px solid #6191A5' }}>
      <div>
        <p className="eyebrow">Defense vs</p>
        <p className="text-xs text-muted mt-0.5">Switch position to reshape the allowed-stat tabs.</p>
      </div>
      <div className="flex gap-2 ml-auto">
        {(['QB','RB','WR','TE'] as Pos[]).map(p => (
          <button key={p} onClick={() => onChange(p)}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              backgroundColor: pos === p ? POSITION_COLORS[p] : '#F7F9FA',
              color: pos === p ? '#FFF' : '#5B7280',
              border: pos === p ? `2px solid ${POSITION_COLORS[p]}` : '2px solid #E5E9EC',
            }}>vs {p}</button>
        ))}
      </div>
    </div>
  )
}

export default function TeamDefenseDeck() {
  const [pos, setPos] = useState<Pos>('WR')
  const tabs: DeckTab[] = [
    { id: 'fantasy-allowed', label: 'Fantasy Allowed', render: () => <FantasyAllowed pos={pos} setPos={setPos} /> },
    { id: 'yards-allowed',   label: 'Yards Allowed',   render: () => <YardsAllowed pos={pos} setPos={setPos} /> },
    { id: 'epa',             label: 'Overall EPA',     render: () => <OverallEpa /> },
  ]
  return (
    <DeckShell title="Team Defense (Against)" deckIndex={7}
      intro="What each defense actually allows, by position. The toggle reshapes the allowed-stat tabs; everything is live from the data and sliceable by the rail."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','shotgun','playType','garbage']} />
  )
}

type TabProps = { pos: Pos; setPos: (p: Pos) => void }

function FantasyAllowed({ pos, setPos }: TabProps) {
  const { slicers } = useSlicers()
  const w = pwWhere(slicers)
  const sql = `
    SELECT opponent_team def,
      round(sum(fantasy_points_ppr)/nullif(count(distinct season||'-'||week),0),1) fppg,
      round(sum(fantasy_points_ppr),1) total
    FROM player_week WHERE position='${pos}' AND opponent_team IS NOT NULL ${w}
    GROUP BY 1 ORDER BY fppg ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'fppg', label: `PPR/G allowed to ${pos}`, numeric: true, format: v => fmt.num(v, 1) },
    { key: 'total', label: 'Total allowed', numeric: true, format: v => fmt.num(v, 0) },
  ]
  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <FantasyBanner label={`Fantasy Allowed · vs ${pos}`} headline={`Which defenses give up the most to ${pos}s.`}
        body={`PPR points allowed to ${pos}s per game. Lower = tougher matchup. Best matchups (most allowed) sort to the bottom — flip the sort to scout streamers.`} />
      <Grid>
        <StatBlock label="Toughest vs " value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].fppg, 1)} PPR/g` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub={`vs ${pos}`} />
        <StatBlock label="Defenses" value={q.data ? String(q.data.length) : '–'} sub="ranked" />
        <StatBlock label="Position" value={pos} sub="toggle above" />
      </Grid>
      <Tile title={`PPR/G allowed to ${pos}s by defense`} subtitle={`Lower is tougher · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={340}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.def, value: r.fppg, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={340} formatY={v => fmt.num(v, 1)} />
        )}</QueryState>
      </Tile>
      <Tile title={`Fantasy allowed to ${pos}s — full table`} span={12}>
        <QueryState q={q} height={360}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'fppg', dir: 'asc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

function YardsAllowed({ pos, setPos }: TabProps) {
  const { slicers } = useSlicers()
  const w = pwWhere(slicers)
  const yd = pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'
  const td = pos === 'QB' ? 'passing_tds' : pos === 'RB' ? 'rushing_tds' : 'receiving_tds'
  const sql = `
    SELECT opponent_team def,
      round(sum(${yd})/nullif(count(distinct season||'-'||week),0),1) ypg,
      sum(${td})::int td, sum(${yd})::int yds
    FROM player_week WHERE position='${pos}' AND opponent_team IS NOT NULL ${w}
    GROUP BY 1 ORDER BY ypg ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'ypg', label: `Yds/G to ${pos}`, numeric: true, format: v => fmt.num(v, 1) },
    { key: 'td', label: 'TD allowed', numeric: true },
    { key: 'yds', label: 'Total yds', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <Grid>
        <StatBlock label={`Best vs ${pos}`} value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].ypg, 1)} yds/g` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="yards allowed" />
        <StatBlock label="Defenses" value={q.data ? String(q.data.length) : '–'} sub="ranked" />
        <StatBlock label="Position" value={pos} sub="toggle above" />
      </Grid>
      <Tile title={`Yards/G allowed to ${pos}s`} subtitle={`Lower is tougher · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={340}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.def, value: r.ypg, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={340} formatY={v => fmt.num(v, 0)} />
        )}</QueryState>
      </Tile>
      <Tile title={`Yards allowed to ${pos}s — full table`} span={12}>
        <QueryState q={q} height={360}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ypg', dir: 'asc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

function OverallEpa() {
  const { slicers } = useSlicers()
  const seasons = slicers.seasons.length ? slicers.seasons.join(',') : '2024'
  const st = slicers.seasonType === 'postseason' ? 'POST' : slicers.seasonType === 'all' ? null : 'REG'
  let w = ` AND season IN (${seasons})`
  if (st) w += ` AND season_type='${st}'`
  if (slicers.weeks.length) w += ` AND week IN (${slicers.weeks.join(',')})`
  const sql = `
    SELECT defteam def, round(avg(epa),3) epa, count(*) plays
    FROM plays WHERE defteam IS NOT NULL AND epa IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'epa', label: 'EPA/play allowed', numeric: true, format: v => fmt.signed(v, 3) },
    { key: 'plays', label: 'Plays', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Best defense" value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${fmt.signed(q.data[0].epa, 3)} EPA/play` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="all plays" />
        <StatBlock label="Metric" value="EPA/play" sub="negative = better D" />
        <StatBlock label="Source" value="Play-by-play" sub="2023–2025" />
      </Grid>
      <Tile title="EPA per play allowed by defense" subtitle={`Most negative = best defense · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.def, value: r.epa, color: TEAM_COLORS[r.def] || PALETTE.bad }))} height={360} formatY={v => fmt.signed(v, 2)} />
        )}</QueryState>
      </Tile>
      <Tile title="Defensive EPA — full rankings" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}
