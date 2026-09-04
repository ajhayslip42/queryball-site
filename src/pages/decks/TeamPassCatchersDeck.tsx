/**
 * TeamPassCatchersDeck — combined WR + TE deck.
 *
 * Same six reports as TeamPositionDeck (Room Overview, Data Table, Situational
 * Splits, Weekly Rotation, Efficiency H2H, Fantasy) — but the roster is drawn
 * from BOTH the WR and TE rooms, with an in-deck toggle at the top for
 * "Both / WR / TE" so a great tight end sits alongside the WRs he actually
 * competes with for targets on his own team.
 *
 * Kept as a separate file from TeamPositionDeck to avoid any regression risk to
 * the QB/RB single-position decks that still use that shared engine.
 *
 * Volume metric across all three modes is TARGETS — both positions catch
 * passes the same way, so target share is the honest denominator.
 */
import { useState } from 'react'
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import { useSlicers } from '@/lib/slicers'
import { sliceLabel, thresholdHaving } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'
import { useQuery } from '@/lib/useQuery'
import DataTable, { type Column } from '@/components/DataTable'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { F } from '@/components/deck/Panels'
import {
  BarTile, HBarTile, TreemapTile, PctBarTile, PALETTE,
} from '@/components/charts/Charts'
import { fmt } from '@/lib/nfl'
import clsx from 'clsx'

type PosFilter = 'both' | 'WR' | 'TE'

/** Convert the deck's toggle state to the actual list of positions used in SQL. */
function positionsFor(f: PosFilter): ('WR' | 'TE')[] {
  return f === 'both' ? ['WR', 'TE'] : [f]
}
/** Emit a SQL fragment like `IN ('WR','TE')` or `= 'WR'`. */
function posClause(f: PosFilter): string {
  const list = positionsFor(f).map(p => `'${p}'`).join(',')
  return positionsFor(f).length === 1 ? `= ${list}` : `IN (${list})`
}

/* -------------------- The in-deck toggle -------------------- */
function PosToggle({ value, onChange }: { value: PosFilter; onChange: (v: PosFilter) => void }) {
  const options: { key: PosFilter; label: string; hint: string }[] = [
    { key: 'both', label: 'WR + TE', hint: 'The full pass-catching room' },
    { key: 'WR',   label: 'WR only', hint: 'Wide receivers only' },
    { key: 'TE',   label: 'TE only', hint: 'Tight ends only' },
  ]
  return (
    <div className="mb-5 flex items-center gap-3 flex-wrap">
      <span className="eyebrow">Room includes</span>
      <div className="inline-flex rounded-full border border-line bg-paper p-0.5">
        {options.map(o => (
          <button key={o.key} type="button" onClick={() => onChange(o.key)}
            title={o.hint}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-[12px] font-medium transition-colors',
              value === o.key
                ? 'bg-accent2 text-paper'
                : 'text-muted hover:text-ink'
            )}>
            {o.label}
          </button>
        ))}
      </div>
      <span className="text-[11px] text-muted">
        {options.find(o => o.key === value)?.hint}
      </span>
    </div>
  )
}

/* -------------------- Deck entry -------------------- */
export default function TeamPassCatchersDeck({
  initialFilter = 'both',
}: { initialFilter?: PosFilter } = {}) {
  const [posFilter, setPosFilter] = useState<PosFilter>(initialFilter)

  const tabs: DeckTab[] = [
    { id: 'overview',    label: 'Room Overview',      render: () => <RoomOverview f={posFilter} /> },
    { id: 'data',        label: 'Data Table',         render: () => <RoomDataTable f={posFilter} /> },
    { id: 'situational', label: 'Situational Splits', render: () => <SituationalSplits f={posFilter} /> },
    { id: 'weekly',      label: 'Weekly Rotation',    render: () => <WeeklyRotation f={posFilter} /> },
    { id: 'efficiency',  label: 'Efficiency H2H',     render: () => <EfficiencyH2H f={posFilter} /> },
    { id: 'fantasy',     label: 'Fantasy',            fantasy: true, render: () => <RoomFantasy f={posFilter} /> },
  ]
  return (
    <>
      <DeckShell
        deckIndex={4}
        title="Team — Pass Catchers"
        intro="Every player who catches passes for one team, in one deck. Target share, air-yards distribution, situational usage, and week-by-week rotation — with the room drawn from both wide receivers and tight ends because a great TE competes with the WR corps for targets, not with other TEs across the league. Toggle above to isolate WR or TE only when you need to."
        tabs={tabs}
        slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','threshold']}
        prefixContent={<PosToggle value={posFilter} onChange={setPosFilter} />}
      />
    </>
  )
}

/* -------------------- Shared helpers -------------------- */
function useRoomTeam(): { team: string; label: string } {
  const { slicers } = useSlicers()
  const team = slicers.teams[0] ?? 'KC'
  return { team, label: team }
}

/* ============================================================================
 * Report 1 — ROOM OVERVIEW
 * ========================================================================== */
function RoomOverview({ f }: { f: PosFilter }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT
      g.player_id id,
      g.player_display_name nm,
      g."position" pos,
      max(pl.headshot) hs,
      count(distinct g.game_id) gp,
      sum(g.targets)::int tgt, sum(g.receptions)::int rec, sum(g.receiving_yards)::int recy, sum(g.receiving_tds)::int retd,
      sum(g.receiving_air_yards)::int reay, sum(g.receiving_yards_after_catch)::int yac,
      sum(g.receiving_air_yards_incomplete)::int reay_inc,
      sum(g.receiving_first_downs)::int recfd
    FROM ${playerGameLog(teamS)} g
    LEFT JOIN players pl ON pl.gsis_id = g.player_id
    WHERE g."position" ${posClause(f)}
    GROUP BY g.player_id, g.player_display_name, g."position"
    HAVING sum(g.targets) > 0 ${thresholdHaving(teamS)}
    ORDER BY sum(g.targets) DESC
    LIMIT 8`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data) return <Tile><QueryState loading={q.loading} rows={q.data} /></Tile>
  const rows = q.data
  const totalTgt = rows.reduce((s, r) => s + (r.tgt || 0), 0)
  const treemapData = rows.map(r => ({
    name: `${lastName(r.nm)} (${r.pos})`,
    value: r.tgt || 0,
  }))
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-display text-lg tracking-tight">
          {label} — {f === 'both' ? 'Pass-catching' : f} room
        </h3>
        <p className="text-[11.5px] text-muted mt-0.5">{sliceLabel(slicers)}</p>
      </div>

      {/* Headshots */}
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
                <span className="mr-1 inline-block rounded bg-cream px-1 py-0.5 text-[9px] font-semibold text-accent2">{r.pos}</span>
                {r.tgt} tgt
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Share treemap + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Share of Targets</p>
          <TreemapTile data={treemapData} height={220} />
        </div>
        <div className="rounded border border-line bg-paper p-3">
          <p className="eyebrow mb-2">Volume distribution</p>
          <PctBarTile data={treemapData} height={40} />
          <div className="mt-3 space-y-1">
            {rows.slice(0, 6).map(r => {
              const pct = totalTgt ? (r.tgt / totalTgt * 100).toFixed(1) : '0'
              return (
                <div key={r.id} className="flex items-center justify-between text-[12px] py-0.5 border-b border-line last:border-0">
                  <span className="truncate">
                    {r.nm}
                    <span className="ml-1.5 text-[10px] text-muted font-semibold">{r.pos}</span>
                  </span>
                  <span className="num text-muted">{r.tgt} <span className="text-[10px]">({pct}%)</span></span>
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
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-ink truncate">{r.nm}</p>
                <p className="text-[10px] text-muted num">
                  <span className="text-accent2 font-semibold">{r.pos}</span> · {r.gp} games
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {[
                ['Targets', r.tgt], ['Rec', r.rec], ['Rec Yds', fmt.int(r.recy)], ['Rec TD', r.retd],
                ['Air Yds', fmt.int(r.reay)], ['YAC', fmt.int(r.yac)],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between text-[11px]">
                  <span className="text-muted">{k}</span><span className="num text-ink font-semibold">{String(v)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ============================================================================
 * Report 2 — DATA TABLE (with a Pos column now)
 * ========================================================================== */
function RoomDataTable({ f }: { f: PosFilter }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT
      g.player_display_name nm,
      g."position" pos,
      count(distinct g.game_id) gp,
      sum(g.targets)::int tgt, sum(g.receptions)::int rec, sum(g.receiving_yards)::int recy, sum(g.receiving_tds)::int retd, sum(g.receiving_first_downs)::int recfd,
      sum(g.receiving_air_yards)::int reay, sum(g.receiving_air_yards_completed)::int reay_c, sum(g.receiving_air_yards_incomplete)::int reay_i,
      sum(g.receiving_yards_after_catch)::int yac,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.receptions),0),1) ypr,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.targets),0),1) ypt,
      round(sum(g.receptions)*100.0/nullif(sum(g.targets),0),1) catch_pct,
      round(sum(g.receiving_yards_after_catch)*100.0/nullif(sum(g.receiving_yards),0),1) yac_pct
    FROM ${playerGameLog(teamS)} g
    WHERE g."position" ${posClause(f)}
    GROUP BY g.player_display_name, g."position"
    HAVING count(distinct g.game_id) >= 1 ${thresholdHaving(teamS)}
    ORDER BY sum(g.targets) DESC
    LIMIT 40`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'nm', label: 'Player' },
    { key: 'pos', label: 'Pos' },
    { key: 'gp', label: 'GP', numeric: true },
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
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-display text-lg tracking-tight">
          {label} · {f === 'both' ? 'Pass catchers' : f} — All room data
        </h3>
        <p className="text-[11.5px] text-muted mt-0.5">{sliceLabel(slicers)}</p>
      </div>
      <QueryState loading={q.loading} rows={q.data}>
        <div className="rounded border border-line bg-paper p-2 overflow-x-auto">
          <DataTable rows={q.data ?? []} columns={cols}
            defaultSort={{ key: 'tgt', dir: 'desc' }} tight zebra />
        </div>
      </QueryState>
    </div>
  )
}

/* ============================================================================
 * Report 3 — SITUATIONAL SPLITS
 * ========================================================================== */
function SituationalSplits({ f }: { f: PosFilter }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const dims: { key: string; label: string; expr: string; buckets: (string | number)[] }[] = [
    { key: 'dn',  label: 'Down',        expr: 'down', buckets: [1,2,3,4] },
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
        <h3 className="font-display text-lg tracking-tight">
          {label} · {f === 'both' ? 'Pass catchers' : f} — Situational room share
        </h3>
        <p className="text-[11.5px] text-muted mt-0.5">Who gets targets in each situation? · {sliceLabel(slicers)}</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {dims.map(dim => <SituationalPanel key={dim.key} f={f} teamS={teamS} team={team} dim={dim} />)}
      </div>
    </div>
  )
}
function SituationalPanel({ f, teamS, team, dim }: {
  f: PosFilter; teamS: any; team: string; dim: { key: string; label: string; expr: string; buckets: (string | number)[] };
}) {
  const positions = positionsFor(f).map(p => `'${p}'`).join(',')
  const sql = `
    WITH ev AS (
      SELECT receiver_player_id pid, ${dim.expr} bucket
      FROM plays WHERE pass_attempt=1 AND receiver_player_id IS NOT NULL
        AND posteam = '${team}' AND season IN (${teamS.seasons.join(',') || '2025'}) AND season_type = 'REG'
    )
    SELECT pl.display_name nm, po.position pos, ev.bucket, count(*)::int v
    FROM ev
    JOIN players pl ON pl.gsis_id = ev.pid
    JOIN (SELECT gsis_id, position FROM players) po ON po.gsis_id = ev.pid
    WHERE po.position IN (${positions})
    GROUP BY pl.display_name, po.position, ev.bucket
    HAVING count(*) > 0`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data) return <div className="rounded border border-line bg-paper p-3"><QueryState loading={q.loading} rows={q.data} /></div>
  const rows = q.data
  const players = [...new Set(rows.map(r => r.nm))].slice(0, 8)
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
  const posOf = new Map<string, string>()
  rows.forEach((r: any) => { if (!posOf.has(r.nm)) posOf.set(r.nm, r.pos) })
  const colors = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, PALETTE.cool, '#9AAEB8', '#C98A3B', '#4B698A']
  return (
    <div className="rounded border border-line bg-paper p-3">
      <p className="eyebrow mb-2">Targets by {dim.label}</p>
      <div style={{ height: 220 }}>
        <StackedShareBars data={pivot} keys={players as string[]} colors={colors} />
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
        {(players as string[]).map((p, i) => (
          <span key={p} className="inline-flex items-center gap-1 text-[9.5px]">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
            <span className="text-ink">{lastName(p)}</span>
            <span className="text-muted">({posOf.get(p)})</span>
          </span>
        ))}
      </div>
    </div>
  )
}
function StackedShareBars({ data, keys, colors }: { data: any[]; keys: string[]; colors: string[] }) {
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
 * ========================================================================== */
function WeeklyRotation({ f }: { f: PosFilter }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT week, player_display_name nm, "position" pos, sum(targets)::int v
    FROM ${playerGameLog(teamS)} g WHERE g."position" ${posClause(f)}
    GROUP BY week, player_display_name, "position" HAVING sum(targets) > 0
    ORDER BY week`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data || q.data.length === 0) return <Tile><QueryState loading={q.loading} rows={q.data} /></Tile>
  const rows = q.data
  const weeks = [...new Set(rows.map(r => r.week))].sort((a: any, b: any) => a - b)
  const totalPer = new Map<string, number>()
  const posOf = new Map<string, string>()
  rows.forEach((r: any) => {
    totalPer.set(r.nm, (totalPer.get(r.nm) || 0) + r.v)
    if (!posOf.has(r.nm)) posOf.set(r.nm, r.pos)
  })
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
        <h3 className="font-display text-lg tracking-tight">
          {label} · {f === 'both' ? 'Pass catchers' : f} — Week-by-week rotation
        </h3>
        <p className="text-[11.5px] text-muted mt-0.5">{sliceLabel(slicers)}</p>
      </div>
      <div className="rounded border border-line bg-paper p-3">
        <p className="eyebrow mb-2">Targets share by week</p>
        <StackedShareBars data={pivot} keys={players} colors={colors} />
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5">
          {players.map((p, i) => (
            <span key={p} className="inline-flex items-center gap-1 text-[9.5px]">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span>{lastName(p)}</span>
              <span className="text-muted">({posOf.get(p)})</span>
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {players.slice(0, 6).map(p => {
          const data = weeks.map((w: any) => ({
            name: `W${w}`,
            value: rows.find((r: any) => r.week === w && r.nm === p)?.v ?? 0,
          }))
          return (
            <div key={p} className="rounded border border-line bg-paper p-3">
              <p className="text-[11px] font-semibold text-ink truncate">
                {p} <span className="ml-1 text-[9px] text-muted font-normal">{posOf.get(p)}</span>
              </p>
              <p className="text-[10px] text-muted mb-1">targets/wk</p>
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
 * ========================================================================== */
function EfficiencyH2H({ f }: { f: PosFilter }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT g.player_display_name nm,
      g."position" pos,
      count(distinct g.game_id) gp,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.receptions),0),1) ypr,
      round(sum(g.receiving_yards)*1.0/nullif(sum(g.targets),0),1) ypt,
      round(sum(g.receptions)*100.0/nullif(sum(g.targets),0),1) catch_pct,
      round(sum(g.receiving_yards_after_catch)*100.0/nullif(sum(g.receiving_yards),0),1) yac_pct,
      round(sum(g.receiving_first_downs)*100.0/nullif(sum(g.targets),0),1) fd_pct,
      round(sum(g.receiving_air_yards)*1.0/nullif(sum(g.targets),0),1) adot
    FROM ${playerGameLog(teamS)} g WHERE g."position" ${posClause(f)}
    GROUP BY g.player_display_name, g."position"
    HAVING count(distinct g.game_id) >= 1 AND sum(g.targets) > 0 ${thresholdHaving(teamS)}
    ORDER BY sum(g.targets) DESC LIMIT 8`
  const q = useQuery<any>(sql, [sql])
  if (q.loading || !q.data) return <Tile><QueryState loading={q.loading} rows={q.data} /></Tile>
  const rows = q.data
  const metricSet = [
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
        <h3 className="font-display text-lg tracking-tight">
          {label} · {f === 'both' ? 'Pass catchers' : f} — Efficiency head-to-head
        </h3>
        <p className="text-[11.5px] text-muted mt-0.5">Per-touch productivity within the room · {sliceLabel(slicers)}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {metricSet.map(m => {
          const data = rows.map(r => ({
            name: `${lastName(r.nm)} (${r.pos})`,
            value: r[m.key] ?? 0,
          })).sort((a, b) => b.value - a.value)
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
 * Report 6 — FANTASY
 * PPG-forward (same convention as the Fantasy tab on the other team decks).
 * ========================================================================== */
function RoomFantasy({ f }: { f: PosFilter }) {
  const { slicers } = useSlicers()
  const { team, label } = useRoomTeam()
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT g.player_display_name nm,
      g."position" pos,
      count(distinct g.game_id) gp,
      round(sum(g.fantasy_points_ppr)/nullif(count(distinct g.game_id),0),1) ppg,
      round(sum(g.fantasy_points_ppr),1) ppr,
      round(sum(g.fantasy_points),1) std,
      round(sum(g.fantasy_points)/nullif(count(distinct g.game_id),0),1) stdppg,
      sum(g.receiving_tds)::int totd,
      sum(g.receiving_yards)::int totyd,
      sum(g.receptions)::int rec,
      sum(g.targets)::int tgt
    FROM ${playerGameLog(teamS)} g WHERE g."position" ${posClause(f)}
    GROUP BY g.player_display_name, g."position" HAVING count(distinct g.game_id) >= 1 ${thresholdHaving(teamS)}
    ORDER BY ppg DESC NULLS LAST LIMIT 20`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-3">
      <FantasyBanner
        label={`Fantasy · ${label} pass catchers`}
        headline="How the room's fantasy production splits."
        body="PPG (points per game, PPR scoring) is the primary read — it survives injuries and short samples. Total FP is the cumulative sum. Toggle above to isolate WR or TE only."
      />
      <QueryState loading={q.loading} rows={q.data}>
        <div className="rounded border border-line bg-paper p-2 overflow-x-auto">
          <DataTable rows={q.data ?? []}
            columns={[
              { key: 'nm', label: 'Player' },
              { key: 'pos', label: 'Pos' },
              { key: 'gp', label: 'GP', numeric: true },
              { key: 'ppg', label: 'PPG', numeric: true, format: F.d1 },
              { key: 'ppr', label: 'Total FP', numeric: true, format: F.d1 },
              { key: 'stdppg', label: 'Std PPG', numeric: true, format: F.d1 },
              { key: 'std', label: 'Total Std', numeric: true, format: F.d1 },
              { key: 'totd', label: 'Rec TD', numeric: true },
              { key: 'totyd', label: 'Rec Yds', numeric: true },
              { key: 'rec', label: 'Rec', numeric: true },
              { key: 'tgt', label: 'Tgt', numeric: true },
            ]}
            defaultSort={{ key: 'ppg', dir: 'desc' }} dense zebra />
        </div>
      </QueryState>
    </div>
  )
}

/* -------------------- Utilities -------------------- */
function lastName(s: string): string {
  if (!s) return ''
  const parts = s.split(' ')
  return parts[parts.length - 1] || s
}
function initials(s: string): string {
  if (!s) return ''
  return s.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}
