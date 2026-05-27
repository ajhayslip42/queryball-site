/**
 * Team Defense (Against) — REAL DATA. 7 report tabs.
 * Position toggle reshapes the "allowed by position" tabs (player_week).
 * Plays-based tabs honor the full slicer rail incl. pass depth & direction —
 * so you can ask "how do the Colts defend deep passes on the right?"
 */
import { useState } from 'react'
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS, POSITION_COLORS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
function pwWhere(s: ReturnType<typeof useSlicers>['slicers']): string {
  const seasons = s.seasons.length ? s.seasons.join(',') : '2024'
  const st = s.seasonType === 'postseason' ? 'POST' : s.seasonType === 'all' ? null : 'REG'
  let w = ` AND season IN (${seasons})`; if (st) w += ` AND season_type='${st}'`
  if (s.weeks.length) w += ` AND week IN (${s.weeks.join(',')})`
  return w
}
function PositionToggle({ pos, onChange }: { pos: Pos; onChange: (p: Pos) => void }) {
  return (
    <div className="qcard p-4 mb-2 flex items-center gap-3 flex-wrap" style={{ background: 'linear-gradient(180deg,#FFF 0%,#F7F9FA 100%)', borderLeft: '3px solid #6191A5' }}>
      <div><p className="eyebrow">Defense vs</p><p className="text-xs text-muted mt-0.5">Reshapes the allowed-stat tabs.</p></div>
      <div className="flex gap-2 ml-auto">
        {(['QB', 'RB', 'WR', 'TE'] as Pos[]).map(p => (
          <button key={p} onClick={() => onChange(p)} className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
            style={{ backgroundColor: pos === p ? POSITION_COLORS[p] : '#F7F9FA', color: pos === p ? '#FFF' : '#5B7280', border: pos === p ? `2px solid ${POSITION_COLORS[p]}` : '2px solid #E5E9EC' }}>vs {p}</button>
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
    { id: 'pass-depth',      label: 'Pass D by Depth', render: () => <PassDepth /> },
    { id: 'direction',       label: 'Pass D by Direction', render: () => <Direction /> },
    { id: 'situational',     label: 'Situational',     render: () => <Situational /> },
    { id: 'data',            label: 'Data Table',      render: () => <DataTab /> },
  ]
  return (
    <DeckShell title="Team Defense (Against)" deckIndex={7}
      intro="What each defense allows. The toggle reshapes the allowed-stat tabs; the play-by-play tabs honor the whole rail — including pass depth and direction, so you can isolate (e.g.) deep throws to the right."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}
type TP = { pos: Pos; setPos: (p: Pos) => void }

function FantasyAllowed({ pos, setPos }: TP) {
  const { slicers } = useSlicers(); const w = pwWhere(slicers)
  const sql = `SELECT opponent_team def, round(sum(fantasy_points_ppr)/nullif(count(distinct season||'-'||week),0),1) fppg, round(sum(fantasy_points_ppr),1) total
    FROM player_week WHERE position='${pos}' AND opponent_team IS NOT NULL ${w} GROUP BY 1 ORDER BY fppg ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'fppg', label: `PPR/G to ${pos}`, numeric: true, format: v => fmt.num(v, 1) }, { key: 'total', label: 'Total', numeric: true, format: v => fmt.num(v, 0) }]
  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <FantasyBanner label={`Fantasy Allowed · vs ${pos}`} headline={`Which defenses give up the most to ${pos}s.`} body={`PPR allowed per game. Lower = tougher. Sort ascending for the stingiest, descending to scout streaming matchups.`} />
      <Tile title={`PPR/G allowed to ${pos}s`} subtitle={`Lower is tougher · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={340}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.fppg, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={340} formatY={v => fmt.num(v, 1)} />}</QueryState>
      </Tile>
      <Tile title={`Fantasy allowed to ${pos}s — full table`} span={12}><QueryState q={q} height={360}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'fppg', dir: 'asc' }} />}</QueryState></Tile>
    </div>
  )
}

function YardsAllowed({ pos, setPos }: TP) {
  const { slicers } = useSlicers(); const w = pwWhere(slicers)
  const yd = pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'
  const td = pos === 'QB' ? 'passing_tds' : pos === 'RB' ? 'rushing_tds' : 'receiving_tds'
  const sql = `SELECT opponent_team def, round(sum(${yd})/nullif(count(distinct season||'-'||week),0),1) ypg, sum(${td})::int td, sum(${yd})::int yds
    FROM player_week WHERE position='${pos}' AND opponent_team IS NOT NULL ${w} GROUP BY 1 ORDER BY ypg ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'ypg', label: `Yds/G to ${pos}`, numeric: true, format: v => fmt.num(v, 1) }, { key: 'td', label: 'TD', numeric: true }, { key: 'yds', label: 'Total', numeric: true }]
  return (
    <div className="space-y-4">
      <PositionToggle pos={pos} onChange={setPos} />
      <Tile title={`Yds/G allowed to ${pos}s`} subtitle={`Lower is tougher · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={340}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.ypg, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={340} formatY={v => fmt.num(v, 0)} />}</QueryState>
      </Tile>
      <Tile title={`Yards allowed to ${pos}s — full table`} span={12}><QueryState q={q} height={360}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ypg', dir: 'asc' }} />}</QueryState></Tile>
    </div>
  )
}

function OverallEpa() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr, count(*) plays
    FROM plays WHERE defteam IS NOT NULL AND epa IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'epa', label: 'EPA/play allowed', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'sr', label: 'Succ% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'plays', label: 'Plays', numeric: true }]
  return (
    <div className="space-y-4">
      <Tile title="EPA per play allowed by defense" subtitle={`Most negative = best · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.epa, color: TEAM_COLORS[r.def] || PALETTE.bad }))} height={360} formatY={v => fmt.signed(v, 2)} />}</QueryState>
      </Tile>
      <Tile title="Defensive EPA — full rankings" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} />}</QueryState></Tile>
    </div>
  )
}

/* Pass defense by depth — honors passDepth/passDir filters from the rail */
function PassDepth() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def,
      round(avg(epa),3) epa,
      round(sum(complete_pass)*100.0/nullif(count(*),0),1) comp_pct,
      round(sum(passing_yards)/nullif(count(distinct game_id),0),1) ypg,
      round(avg(air_yards),1) adot, count(*) att
    FROM plays WHERE defteam IS NOT NULL AND pass_attempt=1 AND air_yards IS NOT NULL ${w}
    GROUP BY 1 HAVING count(*)>${slicers.weeks.length ? 1 : 30} ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'epa', label: 'EPA/pass allowed', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'comp_pct', label: 'Comp% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'adot', label: 'aDOT faced', numeric: true, format: v => fmt.num(v, 1) }, { key: 'ypg', label: 'Pass Y/G', numeric: true, format: v => fmt.num(v, 0) }, { key: 'att', label: 'Att', numeric: true }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Use the <strong>Pass depth &amp; direction</strong> filter in the rail to isolate (e.g.) deep passes (20+ air yards). This table then shows how each defense fares against exactly that throw. {sliceLabel(slicers)}.</p>
      <Tile title="EPA per pass allowed (within the current depth filter)" subtitle={`Most negative = best · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.epa, color: TEAM_COLORS[r.def] || PALETTE.bad }))} height={360} formatY={v => fmt.signed(v, 2)} />}</QueryState>
      </Tile>
      <Tile title="Pass defense detail" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} dense />}</QueryState></Tile>
    </div>
  )
}

/* Pass defense broken out by direction (L/M/R) */
function Direction() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def,
      round(avg(epa) FILTER(WHERE pass_location='left'),3) lft,
      round(avg(epa) FILTER(WHERE pass_location='middle'),3) mid,
      round(avg(epa) FILTER(WHERE pass_location='right'),3) rgt
    FROM plays WHERE defteam IS NOT NULL AND pass_attempt=1 AND pass_location IS NOT NULL ${w}
    GROUP BY 1 HAVING count(*)>${slicers.weeks.length ? 1 : 50} ORDER BY def`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'lft', label: 'EPA Left', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'mid', label: 'EPA Middle', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'rgt', label: 'EPA Right', numeric: true, format: v => fmt.signed(v, 3) }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">EPA allowed on passes to each side of the field (negative = the defense fares well). Combine with the depth filter in the rail for splits like "deep right." {sliceLabel(slicers)}.</p>
      <Tile title="EPA allowed by pass direction" subtitle={`Negative = stronger defense · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={420}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'rgt', dir: 'asc' }} dense />}</QueryState>
      </Tile>
    </div>
  )
}

function Situational() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third_allowed,
      round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1) rz_td,
      count(*) plays
    FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 HAVING count(*)>${slicers.weeks.length ? 1 : 50} ORDER BY third_allowed ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'third_allowed', label: '3rd conv% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'rz_td', label: 'RZ TD% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'plays', label: 'Plays', numeric: true }]
  return (
    <div className="space-y-4">
      <Tile title="Third-down conversion rate allowed" subtitle={`Lower = better · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.third_allowed, color: TEAM_COLORS[r.def] || PALETTE.ok }))} height={360} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title="Situational defense detail" span={12}><QueryState q={q} height={360}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'third_allowed', dir: 'asc' }} />}</QueryState></Tile>
    </div>
  )
}

function DataTab() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, count(*) plays, round(avg(epa),3) epa,
      round(sum(success)*100.0/count(*),1) sr,
      round(avg(epa) FILTER(WHERE pass_attempt=1),3) pass_epa,
      round(avg(epa) FILTER(WHERE rush_attempt=1),3) rush_epa,
      sum(sack)::int sacks, sum(interception)::int ints,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third_pct
    FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 HAVING count(*)>${slicers.weeks.length ? 1 : 50} ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Def' }, { key: 'plays', label: 'Plays', numeric: true }, { key: 'epa', label: 'EPA', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'sr', label: 'Succ%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'pass_epa', label: 'PassEPA', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'rush_epa', label: 'RushEPA', numeric: true, format: v => fmt.signed(v, 3) },
    { key: 'sacks', label: 'Sk', numeric: true }, { key: 'ints', label: 'INT', numeric: true }, { key: 'third_pct', label: '3rd%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
  ]
  return (
    <Tile title="Every defense — packed metrics" subtitle={`${sliceLabel(slicers)} · honors all rail filters · scroll horizontally`} span={12}>
      <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} dense />}</QueryState>
    </Tile>
  )
}
