/**
 * TeamPositionDeck — the intra-room view for QB / RB / WR / TE.
 *
 * Complete rework: reports are no longer team-vs-team leaderboards (those live
 * in League Production). Instead every report answers a within-the-room
 * question: how does Chase compare to Higgins? Who gets the ball on 3rd down?
 * Who's trending up over the last four weeks?
 *
 * Six reports, in this order:
 *   1. Room Overview        headshots + volume-share treemap + per-player mini
 *   2. Data Table           every player in the room, position-aware columns
 *   3. Situational Splits   stacked-bar of intra-room share by down/zone/qtr/score
 *   4. Weekly Rotation      who was playing which week (share by week)
 *   5. Efficiency Head-to-Head   yds/tgt, yds/carry, YAC%, catch%, 1D/tgt
 *   6. Fantasy              PPR points, per-player, within the room
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import { useSlicers } from '@/lib/slicers'
import { sliceLabel, thresholdHaving } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'
import { useQuery } from '@/lib/useQuery'
import DataTable, { type Column } from '@/components/DataTable'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { MetricReport, F, type Metric } from '@/components/deck/Panels'
import {
  BarTile, HBarTile, TreemapTile, PctBarTile, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'
import { TEAMS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'

export default function TeamPositionDeck({ position, title, intro, deckIndex }: {
  position: Pos
  title: string
  intro: string
  deckIndex: number
}) {
  const tabs: DeckTab[] = [
    { id: 'overview',    label: 'Room Overview',        render: () => <RoomOverview pos={position} /> },
    { id: 'data',        label: 'Data Table',           render: () => <RoomDataTable pos={position} /> },
    { id: 'situational', label: 'Situational Splits',   render: () => <SituationalSplits pos={position} /> },
    { id: 'weekly',      label: 'Weekly Rotation',      render: () => <WeeklyRotation pos={position} /> },
    { id: 'efficiency',  label: 'Efficiency H2H',       render: () => <EfficiencyH2H pos={position} /> },
    { id: 'fantasy',     label: 'Fantasy',              fantasy: true, render: () => <RoomFantasy pos={position} /> },
  ]
  return (
    <DeckShell deckIndex={deckIndex} title={title} intro={intro} tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','threshold']} />
  )
}

/* ============================================================================
 * Shared team selection: the room is a specific team, defaulting to the top
 * team by volume when the user hasn't chosen. All reports use this.
 * ========================================================================== */
function useRoomTeam(): { team: string; label: string } {
  const { slicers } = useSlicers()
  const team = slicers.teams[0] ?? 'KC'
  // TEAMS is a string[] of abbreviations; the abbreviation is the display label
  // since we don't ship full team names on the client (kept small).
  return { team, label: team }
}

function volumeKeyFor(pos: Pos): string {
  if (pos === 'QB') return 'attempts'
  if (pos === 'RB') return 'carries'
  return 'targets'
}

/* ============================================================================
 * Report 1 — ROOM OVERVIEW
 * Headshots row, treemap of the room's share of that team's volume, per-player
 * mini stat cards. Layout is bespoke: not a small-multiples grid.
 * ========================================================================== */
function RoomOverview({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const vol = volumeKeyFor(pos)
  const sql = `SELECT
      g.player_id id,
      g.player_display_name nm,
      max(pl.headshot) hs,
      count(distinct g.game_id) gp,
      sum(g.attempts)::int att, sum(g.completions)::int cmp, sum(g.passing_yards)::int py, sum(g.passing_tds)::int ptd, sum(g.interceptions)::int intc,
      sum(g.carries)::int car, sum(g.rushing_yards)::int ry, sum(g.rushing_tds)::int rtd,
      sum(g.targets)::int tgt, sum(g.receptions)::int rec, sum(g.receiving_yards)::int recy, sum(g.receiving_tds)::int retd,
      sum(g.receiving_air_yards)::int reay, sum(g.receiving_yards_after_catch)::int yac,
      sum(g.receiving_air_yards_incomplete)::int reay_inc,
      sum(g.opportunities)::int opps
    FROM ${playerGameLog(teamS)} g
    LEFT JOIN players pl ON pl.gsis_id = g.player_id
    WHERE g."position" = '${pos}'
    GROUP BY g.player_id, g.player_display_name
    HAVING sum(g.${vol}) > 0 ${thresholdHaving(teamS)}
    ORDER BY sum(g.${vol}) DESC
    LIMIT 8`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data) return <Tile><QueryState loading={q.loading} rows={q.data} /></Tile>
  const rows = q.data
  const totalVol = rows.reduce((s, r) => s + (r[({ QB:'att', RB:'car', WR:'tgt', TE:'tgt' } as any)[pos]] || 0), 0)

  const treemapData = rows.map(r => ({
    name: lastName(r.nm),
    value: r[({ QB:'att', RB:'car', WR:'tgt', TE:'tgt' } as any)[pos]] || 0,
  }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg tracking-tight">{label} — {pos} room</h3>
        <p className="text-[11.5px] text-muted mt-0.5">{sliceLabel(slicers)}</p>
      </div>

      {/* Headshots row */}
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">The Room</p>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {rows.map(r => (
            <div key={r.id} className="flex-shrink-0 w-24 text-center">
              {r.hs ? (
                <img src={r.hs} alt={r.nm} className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-line bg-cream" />
              ) : (
                <div className="w-20 h-20 rounded-full mx-auto bg-cream flex items-center justify-center text-muted text-xs">
                  {initials(r.nm)}
                </div>
              )}
              <p className="text-[11px] font-semibold text-ink mt-1.5 truncate" title={r.nm}>{r.nm}</p>
              <p className="text-[10px] text-muted num">
                {pos === 'QB' ? `${r.att} att` : pos === 'RB' ? `${r.car} car` : `${r.tgt} tgt`}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Share treemap + share bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Share of {pos === 'QB' ? 'Attempts' : pos === 'RB' ? 'Carries' : 'Targets'}</p>
          <TreemapTile data={treemapData} height={220} />
        </div>
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Volume distribution</p>
          <PctBarTile data={treemapData} height={40} />
          <div className="mt-3 space-y-1">
            {rows.slice(0, 5).map(r => {
              const v = r[({ QB:'att', RB:'car', WR:'tgt', TE:'tgt' } as any)[pos]] || 0
              const pct = totalVol ? (v / totalVol * 100).toFixed(1) : '0'
              return (
                <div key={r.id} className="flex items-center justify-between text-[12px] py-0.5 border-b border-line last:border-0">
                  <span className="truncate">{r.nm}</span>
                  <span className="num text-muted">{v} <span className="text-[10px]">({pct}%)</span></span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Per-player mini cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {rows.slice(0, 6).map(r => (
          <div key={r.id} className="rounded border border-line bg-paper p-3">
            <div className="flex items-center gap-2 mb-2">
              {r.hs ? (
                <img src={r.hs} alt="" className="w-10 h-10 rounded-full object-cover border border-line" />
              ) : <div className="w-10 h-10 rounded-full bg-cream" />}
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink truncate">{r.nm}</p>
                <p className="text-[10px] text-muted num">{r.gp} games</p>
              </div>
            </div>
            <MiniStats pos={pos} row={r} />
          </div>
        ))}
      </div>
    </div>
  )
}
function MiniStats({ pos, row }: { pos: Pos; row: any }) {
  const stats = pos === 'QB' ? [
    ['Cmp/Att', `${row.cmp}/${row.att}`], ['Pass Yds', fmt.int(row.py)], ['TD', row.ptd], ['INT', row.intc],
  ] : pos === 'RB' ? [
    ['Carries', row.car], ['Rush Yds', fmt.int(row.ry)], ['Rush TD', row.rtd], ['Opps', row.opps],
    ['Targets', row.tgt], ['Rec Yds', fmt.int(row.recy)],
  ] : [
    ['Targets', row.tgt], ['Rec', row.rec], ['Rec Yds', fmt.int(row.recy)], ['Rec TD', row.retd],
    ['Air Yds', fmt.int(row.reay)], ['YAC', fmt.int(row.yac)],
  ]
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
      {stats.map(([k, v]) => (
        <div key={String(k)} className="flex justify-between text-[11px]">
          <span className="text-muted">{k}</span><span className="num text-ink font-semibold">{String(v)}</span>
        </div>
      ))}
    </div>
  )
}

/* ============================================================================
 * Report 2 — DATA TABLE
 * Densely packed. Position-aware columns. Zebra. Tight font.
 * ========================================================================== */
function RoomDataTable({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT
      g.player_display_name nm,
      count(distinct g.game_id) gp,
      sum(g.attempts)::int att, sum(g.completions)::int cmp, sum(g.passing_yards)::int py, sum(g.passing_tds)::int ptd, sum(g.interceptions)::int intc, sum(g.passing_first_downs)::int pfd,
      sum(g.carries)::int car, sum(g.rushing_yards)::int ry, sum(g.rushing_tds)::int rtd, sum(g.rushing_first_downs)::int rfd,
      sum(g.targets)::int tgt, sum(g.receptions)::int rec, sum(g.receiving_yards)::int recy, sum(g.receiving_tds)::int retd, sum(g.receiving_first_downs)::int recfd,
      sum(g.receiving_air_yards)::int reay, sum(g.receiving_air_yards_completed)::int reay_c, sum(g.receiving_air_yards_incomplete)::int reay_i,
      sum(g.receiving_yards_after_catch)::int yac,
      sum(g.opportunities)::int opps,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.receptions),0),1) ypr,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.targets),0),1) ypt,
      round(sum(g.rushing_yards)*1.0/nullif(sum(g.carries),0),2) ypc,
      round(sum(g.receptions)*100.0/nullif(sum(g.targets),0),1) catch_pct,
      round(sum(g.receiving_yards_after_catch)*100.0/nullif(sum(g.receiving_yards),0),1) yac_pct
    FROM ${playerGameLog(teamS)} g
    WHERE g."position" = '${pos}'
    GROUP BY g.player_display_name
    HAVING count(distinct g.game_id) >= 1 ${thresholdHaving(teamS)}
    ORDER BY sum(g.${volumeKeyFor(pos)}) DESC
    LIMIT 40`
  const q = useQuery<any>(sql, [sql])
  const cols = tableColumnsFor(pos)
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">{label} · {pos} — All room data</h3>
        <p className="text-[11.5px] text-muted mt-0.5">{sliceLabel(slicers)}</p>
      </div>
      <QueryState loading={q.loading} rows={q.data}>
        <div className="rounded border border-line bg-paper p-2 overflow-x-auto">
          <DataTable rows={q.data ?? []} columns={cols}
            defaultSort={{ key: cols[2]?.key as string, dir: 'desc' }} tight zebra />
        </div>
      </QueryState>
    </div>
  )
}

function tableColumnsFor(pos: Pos): Column<any>[] {
  const base: Column<any>[] = [
    { key: 'nm', label: 'Player' },
    { key: 'gp', label: 'GP', numeric: true },
  ]
  if (pos === 'QB') return [
    ...base,
    { key: 'att', label: 'Att', numeric: true }, { key: 'cmp', label: 'Cmp', numeric: true },
    { key: 'py', label: 'Pass Yds', numeric: true }, { key: 'ptd', label: 'Pass TD', numeric: true },
    { key: 'intc', label: 'INT', numeric: true }, { key: 'pfd', label: 'Pass 1D', numeric: true },
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'Rush Yds', numeric: true },
    { key: 'rtd', label: 'Rush TD', numeric: true },
  ]
  if (pos === 'RB') return [
    ...base,
    { key: 'car', label: 'Carries', numeric: true }, { key: 'ry', label: 'Rush Yds', numeric: true },
    { key: 'rtd', label: 'Rush TD', numeric: true }, { key: 'rfd', label: 'Rush 1D', numeric: true },
    { key: 'ypc', label: 'YPC', numeric: true, format: F.d2 },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
    { key: 'recy', label: 'Rec Yds', numeric: true }, { key: 'retd', label: 'Rec TD', numeric: true },
    { key: 'opps', label: 'Opps', numeric: true },
  ]
  // WR / TE
  return [
    ...base,
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true },
    { key: 'recy', label: 'Rec Yds', numeric: true }, { key: 'retd', label: 'Rec TD', numeric: true },
    { key: 'recfd', label: 'Rec 1D', numeric: true },
    { key: 'reay', label: 'AirY', numeric: true }, { key: 'reay_c', label: 'AirY (comp)', numeric: true },
    { key: 'reay_i', label: 'AirY (inc)', numeric: true },
    { key: 'yac', label: 'YAC', numeric: true },
    { key: 'catch_pct', label: 'Catch%', numeric: true, format: F.pct },
    { key: 'yac_pct', label: 'YAC%', numeric: true, format: F.pct },
    { key: 'ypt', label: 'Yds/Tgt', numeric: true, format: F.d1 },
  ]
}

/* ============================================================================
 * Report 3 — SITUATIONAL SPLITS
 * For each of down, zone, quarter, and score-state, a stacked bar of intra-room
 * volume share. This is your "who gets carries on 3rd down?" report.
 * ========================================================================== */
function SituationalSplits({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const volCol = volumeKeyFor(pos)
  const volLabel = pos === 'QB' ? 'Attempts' : pos === 'RB' ? 'Carries' : 'Targets'

  // We pull a single wide query grouped by (player, dim, bucket). Then split per-panel.
  // Because we need multiple dims, we run four queries in parallel (via multiple hooks).
  const dims: { key: string; label: string; expr: string; buckets: (string | number)[] }[] = [
    { key: 'dn',  label: 'Down',        expr: 'down',
      buckets: [1,2,3,4] },
    { key: 'zn',  label: 'Field Zone',  expr: `CASE WHEN yardline_100<=5 THEN 'Goal' WHEN yardline_100<=20 THEN 'RZ' WHEN yardline_100 BETWEEN 21 AND 49 THEN 'Opp' WHEN yardline_100 BETWEEN 50 AND 79 THEN 'Own' ELSE 'BackedUp' END`,
      buckets: ['Goal','RZ','Opp','Own','BackedUp'] },
    { key: 'qtr', label: 'Quarter',     expr: `CASE WHEN qtr=5 THEN 'OT' ELSE 'Q'||qtr END`,
      buckets: ['Q1','Q2','Q3','Q4','OT'] },
    { key: 'sd',  label: 'Score State', expr: `CASE WHEN score_differential<=-9 THEN 'Losing 9+' WHEN score_differential<=-1 THEN 'Losing 1-8' WHEN score_differential=0 THEN 'Tied' WHEN score_differential<=8 THEN 'Winning 1-8' ELSE 'Winning 9+' END`,
      buckets: ['Losing 9+','Losing 1-8','Tied','Winning 1-8','Winning 9+'] },
  ]

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">{label} · {pos} — Situational room share</h3>
        <p className="text-[11.5px] text-muted mt-0.5">Who gets the {volLabel.toLowerCase()} in each situation? · {sliceLabel(slicers)}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {dims.map(dim => <SituationalPanel key={dim.key} pos={pos} teamS={teamS} team={team} dim={dim} volCol={volCol} volLabel={volLabel} />)}
      </div>
    </div>
  )
}
function SituationalPanel({ pos, teamS, team, dim, volCol, volLabel }: {
  pos: Pos; teamS: any; team: string; dim: { key: string; label: string; expr: string; buckets: (string | number)[] };
  volCol: string; volLabel: string
}) {
  // Room's rush/pass count broken down by the situation × player.
  const roleFilter = pos === 'QB'
    ? "pass_attempt=1 AND passer_player_id IS NOT NULL"
    : pos === 'RB'
    ? "rush_attempt=1 AND rusher_player_id IS NOT NULL"
    : "pass_attempt=1 AND receiver_player_id IS NOT NULL"
  const roleId = pos === 'QB' ? 'passer_player_id' : pos === 'RB' ? 'rusher_player_id' : 'receiver_player_id'
  const sql = `
    WITH ev AS (
      SELECT ${roleId} pid, ${dim.expr} bucket
      FROM plays WHERE ${roleFilter}
        AND posteam = '${team}' AND season IN (${teamS.seasons.join(',') || '2025'}) AND season_type = 'REG'
    )
    SELECT pl.display_name nm, ev.bucket, count(*)::int v
    FROM ev JOIN players pl ON pl.gsis_id = ev.pid
    JOIN (SELECT gsis_id, position FROM players) po ON po.gsis_id = ev.pid
    WHERE po.position = '${pos}'
    GROUP BY pl.display_name, ev.bucket
    HAVING count(*) > 0`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data) return <div className="rounded border border-line bg-paper p-3"><QueryState loading={q.loading} rows={q.data} /></div>
  // Pivot into recharts-friendly stacked-bar rows: one row per bucket, one column per player.
  const rows = q.data
  const players = [...new Set(rows.map(r => r.nm))].slice(0, 8) // cap for legibility
  const pivot = dim.buckets.map(b => {
    const row: any = { name: String(b) }
    let tot = 0
    players.forEach(p => {
      const rec = rows.find(r => r.nm === p && String(r.bucket) === String(b))
      row[p as string] = rec?.v ?? 0
      tot += row[p as string]
    })
    row._tot = tot
    return row
  })
  const colors = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, PALETTE.cool, '#9AAEB8', '#C98A3B', '#4B698A']
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="eyebrow mb-2">{volLabel} by {dim.label}</p>
      <div style={{ height: 220 }}>
        {/* Custom SVG stacked-bar. Recharts default is fine but this pivots simpler. */}
        <StackedShareBars data={pivot} keys={players as string[]} colors={colors} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
        {(players as string[]).map((p, i) => (
          <span key={p} className="inline-flex items-center gap-1 text-[9.5px]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-ink">{lastName(p)}</span>
          </span>
        ))}
      </div>
    </div>
  )
}
function StackedShareBars({ data, keys, colors }: { data: any[]; keys: string[]; colors: string[] }) {
  // Renders one horizontal stacked bar per row (bucket), with each key's share.
  return (
    <div className="space-y-2">
      {data.map(row => (
        <div key={row.name}>
          <div className="flex justify-between mb-0.5">
            <span className="text-[10.5px] text-muted">{row.name}</span>
            <span className="text-[10px] text-muted num">{row._tot}</span>
          </div>
          <div className="flex w-full rounded overflow-hidden h-4 border border-line">
            {keys.map((k, i) => {
              const v = Number(row[k]) || 0
              const pct = row._tot ? (v / row._tot) * 100 : 0
              if (pct === 0) return null
              return (
                <div key={k} className="text-[9px] font-semibold text-white text-center overflow-hidden flex items-center justify-center"
                  title={`${k}: ${v} (${pct.toFixed(1)}%)`}
                  style={{ background: colors[i % colors.length], width: `${pct}%` }}>
                  {pct >= 15 ? `${pct.toFixed(0)}%` : ''}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ============================================================================
 * Report 4 — WEEKLY ROTATION
 * Who was playing which week. Stacked bar per week showing volume share, plus a
 * per-player line ("what was Chase's target load week over week?").
 * ========================================================================== */
function WeeklyRotation({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const volCol = volumeKeyFor(pos)
  const volLabel = pos === 'QB' ? 'Attempts' : pos === 'RB' ? 'Carries' : 'Targets'

  const sql = `SELECT week, player_display_name nm, sum(${volCol})::int v
    FROM ${playerGameLog(teamS)} g WHERE g."position" = '${pos}'
    GROUP BY week, player_display_name HAVING sum(${volCol}) > 0
    ORDER BY week`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data || q.data.length === 0) return <Tile><QueryState loading={q.loading} rows={q.data} /></Tile>
  const rows = q.data
  const weeks = [...new Set(rows.map(r => r.week))].sort((a: any, b: any) => a - b)
  const totalPer = new Map<string, number>()
  rows.forEach((r: any) => totalPer.set(r.nm, (totalPer.get(r.nm) || 0) + r.v))
  const players = Array.from(totalPer.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([n]) => n)
  const pivot = weeks.map((w: any) => {
    const row: any = { name: `W${w}` }
    let tot = 0
    players.forEach(p => {
      const rec = rows.find((r: any) => r.week === w && r.nm === p)
      row[p] = rec?.v ?? 0; tot += row[p]
    })
    row._tot = tot
    return row
  })
  const colors = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, PALETTE.cool, '#9AAEB8', '#C98A3B', '#4B698A']
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">{label} · {pos} — Week-by-week rotation</h3>
        <p className="text-[11.5px] text-muted mt-0.5">{sliceLabel(slicers)}</p>
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">{volLabel} share by week</p>
        <StackedShareBars data={pivot} keys={players} colors={colors} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
          {players.map((p, i) => (
            <span key={p} className="inline-flex items-center gap-1 text-[9.5px]">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span>{lastName(p)}</span>
            </span>
          ))}
        </div>
      </div>
      {/* Per-player mini bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.slice(0, 6).map(p => {
          const data = weeks.map((w: any) => ({
            name: `W${w}`,
            value: rows.find((r: any) => r.week === w && r.nm === p)?.v ?? 0,
          }))
          return (
            <div key={p} className="rounded border border-line bg-paper p-3">
              <p className="text-[11px] font-semibold text-ink truncate">{p}</p>
              <p className="text-[10px] text-muted mb-1">{volLabel.toLowerCase()}/wk</p>
              <BarTile data={data} height={100} color={PALETTE.accent} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================================
 * Report 5 — EFFICIENCY H2H
 * Per-touch rates only. Yds/tgt, yds/carry, YAC%, catch%, 1D/tgt. Horizontal
 * bars sorted so the top rate is obvious.
 * ========================================================================== */
function EfficiencyH2H({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT g.player_display_name nm,
      count(distinct g.game_id) gp,
      round(sum(g.passing_yards)*1.0/nullif(sum(g.attempts),0),2) ypa,
      round(sum(g.completions)*100.0/nullif(sum(g.attempts),0),1) cmp_pct,
      round(sum(g.passing_yards)*1.0/nullif(sum(g.completions),0),1) ypc_pass,
      round(sum(g.rushing_yards)*1.0/nullif(sum(g.carries),0),2) ypc,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.receptions),0),1) ypr,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.targets),0),1) ypt,
      round(sum(g.receptions)*100.0/nullif(sum(g.targets),0),1) catch_pct,
      round(sum(g.receiving_yards_after_catch)*100.0/nullif(sum(g.receiving_yards),0),1) yac_pct,
      round(sum(g.receiving_first_downs)*100.0/nullif(sum(g.targets),0),1) fd_pct,
      round(sum(g.receiving_air_yards)*1.0/nullif(sum(g.targets),0),1) adot
    FROM ${playerGameLog(teamS)} g WHERE g."position" = '${pos}'
    GROUP BY g.player_display_name
    HAVING count(distinct g.game_id) >= 1 AND sum(g.${volumeKeyFor(pos)}) > 0 ${thresholdHaving(teamS)}
    ORDER BY sum(g.${volumeKeyFor(pos)}) DESC LIMIT 8`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data) return <Tile><QueryState loading={q.loading} rows={q.data} /></Tile>
  const rows = q.data
  const metricSet: { key: string; label: string; fmt: (v: number) => string }[] =
    pos === 'QB' ? [
      { key: 'ypa', label: 'Yds / Att', fmt: F.d2 },
      { key: 'cmp_pct', label: 'Comp %', fmt: F.pct },
      { key: 'ypc_pass', label: 'Yds / Comp', fmt: F.d1 },
    ] : pos === 'RB' ? [
      { key: 'ypc', label: 'Yds / Carry', fmt: F.d2 },
      { key: 'ypr', label: 'Yds / Rec', fmt: F.d1 },
      { key: 'catch_pct', label: 'Catch %', fmt: F.pct },
    ] : [
      { key: 'ypt', label: 'Yds / Tgt', fmt: F.d1 },
      { key: 'ypr', label: 'Yds / Rec', fmt: F.d1 },
      { key: 'catch_pct', label: 'Catch %', fmt: F.pct },
      { key: 'yac_pct', label: 'YAC %', fmt: F.pct },
      { key: 'fd_pct', label: '1D / Tgt', fmt: F.pct },
      { key: 'adot', label: 'aDOT', fmt: F.d1 },
    ]
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">{label} · {pos} — Efficiency head-to-head</h3>
        <p className="text-[11.5px] text-muted mt-0.5">Per-touch productivity within the room · {sliceLabel(slicers)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {metricSet.map(m => {
          const data = rows.map(r => ({ name: lastName(r.nm), value: r[m.key] ?? 0 })).sort((a, b) => b.value - a.value)
          return (
            <div key={m.key} className="rounded border border-line bg-paper p-3">
              <p className="eyebrow mb-2">{m.label}</p>
              <HBarTile data={data} height={22 * data.length + 20} color={PALETTE.accent2} formatX={m.fmt} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ============================================================================
 * Report 6 — FANTASY (room-only)
 * Purely for internal room comparison. Keeps PPR here, nowhere else.
 * ========================================================================== */
function RoomFantasy({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT g.player_display_name nm,
      count(distinct g.game_id) gp,
      round(sum(g.fantasy_points),1) std,
      round(sum(g.fantasy_points_ppr),1) ppr,
      round(sum(g.fantasy_points_ppr)/nullif(count(distinct g.game_id),0),1) ppg,
      sum(g.passing_tds+g.rushing_tds+g.receiving_tds)::int totd,
      sum(g.passing_yards+g.rushing_yards+g.receiving_yards)::int totyd,
      sum(g.receptions)::int rec, sum(g.opportunities)::int opps
    FROM ${playerGameLog(teamS)} g WHERE g."position" = '${pos}'
    GROUP BY g.player_display_name HAVING count(distinct g.game_id) >= 1 ${thresholdHaving(teamS)}
    ORDER BY ppr DESC NULLS LAST LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-3">
      <FantasyBanner label={`Fantasy · ${label} ${pos}`} headline={`How the room's PPR is distributed.`}
        body="Cumulative PPR is the only spot on the site where fantasy points appear. Points-per-game is the read that survives injuries." />
      <QueryState loading={q.loading} rows={q.data}>
        <div className="rounded border border-line bg-paper p-2 overflow-x-auto">
          <DataTable rows={q.data ?? []}
            columns={[
              { key: 'nm', label: 'Player' },
              { key: 'gp', label: 'GP', numeric: true },
              { key: 'ppr', label: 'PPR', numeric: true, format: F.d1 },
              { key: 'ppg', label: 'PPR/G', numeric: true, format: F.d1 },
              { key: 'std', label: 'Std', numeric: true, format: F.d1 },
              { key: 'totd', label: 'Total TD', numeric: true },
              { key: 'totyd', label: 'Total Yds', numeric: true },
              { key: 'rec', label: 'Rec', numeric: true },
              { key: 'opps', label: 'Opps', numeric: true },
            ]}
            defaultSort={{ key: 'ppr', dir: 'desc' }} dense zebra />
        </div>
      </QueryState>
    </div>
  )
}

/* ============================================================================
 * Utilities
 * ========================================================================== */
function lastName(s: string): string {
  if (!s) return ''
  const parts = s.split(' ')
  return parts[parts.length - 1] || s
}
function initials(s: string): string {
  if (!s) return ''
  return s.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}
