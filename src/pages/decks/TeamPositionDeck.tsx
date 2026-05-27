/**
 * TeamPositionDeck — generic team-level view for a position group, REAL DATA.
 *
 * The four team decks (QB/RB/WR/TE) delegate here with a position arg. Tabs:
 *   01. By Team        — league-wide production at this position, by team
 *   02. Room Detail    — one team's player breakdown + usage share
 *   03. Fantasy        — position fantasy points by team
 *
 * Everything is queried live from player_week, filtered by the slicer rail.
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'

function whereFor(slicers: ReturnType<typeof useSlicers>['slicers']): string {
  const seasons = slicers.seasons.length ? slicers.seasons.join(',') : '2024'
  const st = slicers.seasonType === 'postseason' ? 'POST'
    : slicers.seasonType === 'all' ? null : 'REG'
  let w = ` AND season IN (${seasons})`
  if (st) w += ` AND season_type='${st}'`
  if (slicers.weeks.length) w += ` AND week IN (${slicers.weeks.join(',')})`
  return w
}

/* primary production columns per position */
function statFor(pos: Pos) {
  if (pos === 'QB') return { yd: 'passing_yards', td: 'passing_tds', vol: 'attempts', volLabel: 'Att', ydLabel: 'Pass yds' }
  if (pos === 'RB') return { yd: 'rushing_yards', td: 'rushing_tds', vol: 'carries', volLabel: 'Car', ydLabel: 'Rush yds' }
  return { yd: 'receiving_yards', td: 'receiving_tds', vol: 'targets', volLabel: 'Tgt', ydLabel: 'Rec yds' }
}

export default function TeamPositionDeck({ position, title, intro, deckIndex }: {
  position: Pos; title: string; intro: string; deckIndex: number
}) {
  const tabs: DeckTab[] = [
    { id: 'byteam',  label: 'By Team',     render: () => <ByTeam pos={position} /> },
    { id: 'room',    label: 'Room Detail', render: () => <Room pos={position} /> },
    { id: 'fantasy', label: 'Fantasy',     fantasy: true, render: () => <Fantasy pos={position} /> },
  ]
  return (
    <DeckShell
      title={title} intro={intro} tabs={tabs} deckIndex={deckIndex}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','shotgun','playType','garbage']}
    />
  )
}

/* ===== Tab 01 — By Team ===== */
function ByTeam({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const s = statFor(pos)
  const w = whereFor(slicers)
  const sql = `
    SELECT recent_team tm, sum(${s.yd})::int yds, sum(${s.td})::int td, sum(${s.vol})::int vol
    FROM player_week WHERE position='${pos}' ${w}
    GROUP BY 1 ORDER BY yds DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' },
    { key: 'yds', label: s.ydLabel, numeric: true },
    { key: 'td', label: 'TD', numeric: true },
    { key: 'vol', label: s.volLabel, numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={`${pos} · ${sliceLabel(slicers)}`} sub="team totals" />
        <StatBlock label="Top team" value={q.data?.[0]?.tm ?? '–'} sub={q.data?.[0] ? `${fmt.int(q.data[0].yds)} ${s.ydLabel.toLowerCase()}` : ''} />
        <StatBlock label="Teams" value={q.data ? String(q.data.length) : '–'} sub="ranked" />
        <StatBlock label="Basis" value={s.ydLabel} sub="from player_week" />
      </Grid>
      <Tile title={`${s.ydLabel} by team — ${pos}s`} subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={320}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.tm, value: r.yds, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={320} />
        )}</QueryState>
      </Tile>
      <Tile title={`Team ${pos} production — full table`} span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'yds', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ===== Tab 02 — Room Detail ===== */
function Room({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const s = statFor(pos)
  const team = slicers.teams[0] ?? 'KC'
  const w = whereFor(slicers)
  const sql = `
    WITH tot AS (SELECT sum(${s.vol}) t FROM player_week WHERE position='${pos}' AND recent_team='${team}' ${w})
    SELECT player_display_name nm, sum(${s.vol})::int vol,
      round(sum(${s.vol})*100.0/nullif((SELECT t FROM tot),0),1) shr,
      sum(${s.yd})::int yds, sum(${s.td})::int td
    FROM player_week WHERE position='${pos}' AND recent_team='${team}' ${w}
    GROUP BY 1 HAVING sum(${s.vol}) > 0 ORDER BY vol DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'nm', label: 'Player' },
    { key: 'vol', label: s.volLabel, numeric: true },
    { key: 'shr', label: `${s.volLabel} Share%`, numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'yds', label: s.ydLabel, numeric: true },
    { key: 'td', label: 'TD', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {team}'s {pos} room for {sliceLabel(slicers)}. Pick a different team in the slicer rail
        (Team filter) to switch rooms. Share is each player's % of the room's {s.volLabel.toLowerCase()}.
      </p>
      <Tile title={`${team} — ${pos} room: ${s.volLabel.toLowerCase()} share`} subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={300}>{rows => (
          <BarTile data={rows.slice(0, 8).map(r => ({ name: r.nm.split(' ').slice(-1)[0], value: r.shr }))} height={300}
            color={PALETTE.accent} formatY={v => `${fmt.num(v, 0)}%`} />
        )}</QueryState>
      </Tile>
      <Tile title={`${team} — ${pos} room detail`} span={12}>
        <QueryState q={q} height={300}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'vol', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

/* ===== Tab 03 — Fantasy ===== */
function Fantasy({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const w = whereFor(slicers)
  const sql = `
    SELECT recent_team tm, round(sum(fantasy_points_ppr),1) total,
      round(sum(fantasy_points_ppr)/nullif(count(distinct season||'-'||week),0),1) ppg
    FROM player_week WHERE position='${pos}' ${w}
    GROUP BY 1 ORDER BY total DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' },
    { key: 'total', label: 'Total PPR', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'ppg', label: 'PPR/wk', numeric: true, format: v => fmt.num(v, 1) },
  ]
  return (
    <div className="space-y-4">
      <FantasyBanner label={`Fantasy · Team ${pos}`} headline={`Which teams' ${pos}s score the most.`}
        body={`Total PPR fantasy points produced by each team's ${pos} group across the current slice. A proxy for where the ${pos} fantasy value is concentrated.`} />
      <Tile title={`Team ${pos} fantasy production`} subtitle={`PPR · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={320}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.tm, value: r.total, color: TEAM_COLORS[r.tm] || PALETTE.accent2 }))} height={320} formatY={v => fmt.int(v)} />
        )}</QueryState>
      </Tile>
      <Tile title="Full table" span={12}>
        <QueryState q={q} height={360}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'total', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}
