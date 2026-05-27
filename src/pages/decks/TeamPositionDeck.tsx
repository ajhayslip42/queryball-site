/**
 * TeamPositionDeck — generic team-level view for a position group, REAL DATA.
 * 7 report tabs. Drives the four Team position decks.
 */
import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'

function pw(slicers: ReturnType<typeof useSlicers>['slicers']): string {
  const seasons = slicers.seasons.length ? slicers.seasons.join(',') : '2024'
  const st = slicers.seasonType === 'postseason' ? 'POST' : slicers.seasonType === 'all' ? null : 'REG'
  let w = ` AND season IN (${seasons})`
  if (st) w += ` AND season_type='${st}'`
  if (slicers.weeks.length) w += ` AND week IN (${slicers.weeks.join(',')})`
  return w
}
function stat(pos: Pos) {
  if (pos === 'QB') return { yd: 'passing_yards', td: 'passing_tds', vol: 'attempts', volL: 'Att', ydL: 'Pass yds' }
  if (pos === 'RB') return { yd: 'rushing_yards', td: 'rushing_tds', vol: 'carries', volL: 'Car', ydL: 'Rush yds' }
  return { yd: 'receiving_yards', td: 'receiving_tds', vol: 'targets', volL: 'Tgt', ydL: 'Rec yds' }
}
function roleId(pos: Pos) { return pos === 'QB' ? 'passer_player_id' : pos === 'RB' ? 'rusher_player_id' : 'receiver_player_id' }

export default function TeamPositionDeck({ position, title, intro, deckIndex }: {
  position: Pos; title: string; intro: string; deckIndex: number
}) {
  const tabs: DeckTab[] = [
    { id: 'byteam',   label: 'By Team',       render: () => <ByTeam pos={position} /> },
    { id: 'room',     label: 'Room Detail',   render: () => <Room pos={position} /> },
    { id: 'eff',      label: 'Efficiency',    render: () => <Eff pos={position} /> },
    { id: 'trends',   label: 'Weekly Trends', render: () => <Trends pos={position} /> },
    { id: 'depth',    label: position === 'RB' ? 'Run Direction' : 'Air Yards', render: () => <Depth pos={position} /> },
    { id: 'data',     label: 'Data Table',    render: () => <DataTab pos={position} /> },
    { id: 'fantasy',  label: 'Fantasy',       fantasy: true, render: () => <Fantasy pos={position} /> },
  ]
  return (
    <DeckShell title={title} intro={intro} tabs={tabs} deckIndex={deckIndex}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}

function ByTeam({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const s = stat(pos); const w = pw(slicers)
  const sql = `SELECT recent_team tm, sum(${s.yd})::int yds, sum(${s.td})::int td, sum(${s.vol})::int vol
    FROM player_week WHERE position='${pos}' ${w} GROUP BY 1 ORDER BY yds DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'yds', label: s.ydL, numeric: true }, { key: 'td', label: 'TD', numeric: true }, { key: 'vol', label: s.volL, numeric: true }]
  return (
    <div className="space-y-4">
      <Tile title={`${s.ydL} by team — ${pos}s`} subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={340}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.yds, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={340} />}</QueryState>
      </Tile>
      <Tile title={`Team ${pos} production — full table`} span={12}>
        <QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'yds', dir: 'desc' }} />}</QueryState>
      </Tile>
    </div>
  )
}

function Room({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const s = stat(pos); const team = slicers.teams[0] ?? 'KC'; const w = pw(slicers)
  const sql = `WITH tot AS (SELECT sum(${s.vol}) t FROM player_week WHERE position='${pos}' AND recent_team='${team}' ${w})
    SELECT player_display_name nm, sum(${s.vol})::int vol,
      round(sum(${s.vol})*100.0/nullif((SELECT t FROM tot),0),1) shr, sum(${s.yd})::int yds, sum(${s.td})::int td
    FROM player_week WHERE position='${pos}' AND recent_team='${team}' ${w}
    GROUP BY 1 HAVING sum(${s.vol}) > 0 ORDER BY vol DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'nm', label: 'Player' }, { key: 'vol', label: s.volL, numeric: true }, { key: 'shr', label: `${s.volL} Share%`, numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'yds', label: s.ydL, numeric: true }, { key: 'td', label: 'TD', numeric: true }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{team}'s {pos} room — {sliceLabel(slicers)}. Pick a different team in the rail to switch rooms.</p>
      <Tile title={`${team} — ${pos} ${s.volL.toLowerCase()} share`} subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={300}>{rows => <BarTile data={rows.slice(0, 8).map(r => ({ name: r.nm.split(' ').slice(-1)[0], value: r.shr }))} height={300} color={PALETTE.accent} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title={`${team} — ${pos} room detail`} span={12}><QueryState q={q} height={300}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'vol', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function Eff({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const w = pw(slicers)
  const sel = pos === 'QB'
    ? `round(sum(passing_yards)*1.0/nullif(sum(attempts),0),2) ya, round(sum(completions)*100.0/nullif(sum(attempts),0),1) cmp_pct, round(sum(passing_epa),1) epa`
    : pos === 'RB'
    ? `round(sum(rushing_yards)*1.0/nullif(sum(carries),0),2) ypc, round(sum(rushing_first_downs)*100.0/nullif(sum(carries),0),1) fd_pct, round(sum(rushing_epa),1) epa`
    : `round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1) adot, round(sum(receiving_yards_after_catch)*1.0/nullif(sum(receptions),0),1) yac, round(sum(receptions)*100.0/nullif(sum(targets),0),1) catch_pct, round(sum(receiving_epa),1) epa`
  const sql = `SELECT recent_team tm, ${sel} FROM player_week WHERE position='${pos}' ${w} GROUP BY 1 ORDER BY epa DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = pos === 'QB'
    ? [{ key: 'tm', label: 'Team' }, { key: 'ya', label: 'Y/A', numeric: true, format: v => fmt.num(v, 2) }, { key: 'cmp_pct', label: 'Comp%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'epa', label: 'Pass EPA', numeric: true, format: v => fmt.signed(v, 1) }]
    : pos === 'RB'
    ? [{ key: 'tm', label: 'Team' }, { key: 'ypc', label: 'YPC', numeric: true, format: v => fmt.num(v, 2) }, { key: 'fd_pct', label: '1stD%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'epa', label: 'Rush EPA', numeric: true, format: v => fmt.signed(v, 1) }]
    : [{ key: 'tm', label: 'Team' }, { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) }, { key: 'yac', label: 'YAC/R', numeric: true, format: v => fmt.num(v, 1) }, { key: 'catch_pct', label: 'Catch%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'epa', label: 'Rec EPA', numeric: true, format: v => fmt.signed(v, 1) }]
  return (
    <div className="space-y-4">
      <Tile title={`Team ${pos} efficiency`} subtitle={`Sorted by EPA · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'desc' }} />}</QueryState>
      </Tile>
    </div>
  )
}

function Trends({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const s = stat(pos); const w = pw(slicers)
  const sql = `SELECT 'W'||week name, week, sum(${s.yd})::int value
    FROM player_week WHERE position='${pos}' ${w} GROUP BY week ORDER BY week`
  const q = useQuery<any>(sql, [sql])
  return (
    <Tile title={`League ${pos} ${s.ydL.toLowerCase()} by week`} subtitle={sliceLabel(slicers)} span={12}>
      <QueryState q={q} height={320}>{rows => <BarTile data={rows} height={320} color={PALETTE.accent} formatY={v => fmt.int(v)} />}</QueryState>
    </Tile>
  )
}

/* Air Yards (WR/TE/QB) or Run Direction (RB) — joins plays to players for position */
function Depth({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  if (pos === 'RB') {
    const sql = `SELECT posteam tm,
        round(count(*) FILTER(WHERE run_location='left')*100.0/nullif(count(*),0),1) lft,
        round(count(*) FILTER(WHERE run_location='middle')*100.0/nullif(count(*),0),1) mid,
        round(count(*) FILTER(WHERE run_location='right')*100.0/nullif(count(*),0),1) rgt
      FROM plays WHERE rush_attempt=1 AND posteam IS NOT NULL ${w} GROUP BY 1 HAVING count(*)>20 ORDER BY tm`
    const q = useQuery<any>(sql, [sql])
    const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'lft', label: 'Left%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'mid', label: 'Mid%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'rgt', label: 'Right%', numeric: true, format: v => `${fmt.num(v, 1)}%` }]
    return <Tile title="Rush direction split by team" subtitle={sliceLabel(slicers)} span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'mid', dir: 'desc' }} dense />}</QueryState></Tile>
  }
  const idc = pos === 'QB' ? 'passer_player_id' : 'receiver_player_id'
  // deep-target/pass rate by team
  const sql = `SELECT posteam tm, count(*) att,
      round(count(*) FILTER(WHERE air_yards>=20)*100.0/nullif(count(*),0),1) deep_pct,
      round(avg(air_yards),1) adot, sum(passing_yards)::int yds
    FROM plays WHERE pass_attempt=1 AND air_yards IS NOT NULL AND posteam IS NOT NULL ${w}
    ${pos === 'QB' ? '' : `AND ${idc} IN (SELECT gsis_id FROM players WHERE position='${pos}')`}
    GROUP BY 1 HAVING count(*)>20 ORDER BY deep_pct DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'att', label: 'Att', numeric: true }, { key: 'deep_pct', label: 'Deep% (20+)', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) }, { key: 'yds', label: 'Yds', numeric: true }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Depth-of-target profile{pos !== 'QB' ? ` for ${pos}s` : ''} by team. Use the Pass Depth & Direction filter in the rail to isolate (e.g.) deep right throws.</p>
      <Tile title={`Deep ${pos === 'QB' ? 'pass' : 'target'} rate (20+ air yards) by team`} subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={340}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.deep_pct, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={340} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title="Depth-of-target detail" span={12}><QueryState q={q} height={360}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'deep_pct', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function DataTab({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const w = pw(slicers)
  const sql = `SELECT player_display_name nm, recent_team tm, count(*) g,
      sum(attempts)::int att, sum(passing_yards)::int py, sum(passing_tds)::int ptd, sum(interceptions)::int intc,
      sum(carries)::int car, sum(rushing_yards)::int ry, sum(rushing_tds)::int rtd,
      sum(targets)::int tgt, sum(receptions)::int rec, sum(receiving_yards)::int recy, sum(receiving_tds)::int retd,
      round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1) adot,
      round(sum(receiving_yards_after_catch)*1.0/nullif(sum(receptions),0),1) yac,
      round(avg(target_share)*100,1) tgtsh, round(avg(wopr),2) wopr,
      round(sum(fantasy_points_ppr),1) ppr
    FROM player_week WHERE position='${pos}' ${w}
    GROUP BY 1,2 HAVING count(*)>0 ORDER BY ppr DESC LIMIT 80`
  const q = useQuery<any>(sql, [sql])
  const all: Column<any>[] = [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' }, { key: 'g', label: 'G', numeric: true },
    { key: 'att', label: 'Att', numeric: true }, { key: 'py', label: 'PaYd', numeric: true }, { key: 'ptd', label: 'PaTD', numeric: true }, { key: 'intc', label: 'INT', numeric: true },
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'RuYd', numeric: true }, { key: 'rtd', label: 'RuTD', numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true }, { key: 'recy', label: 'ReYd', numeric: true }, { key: 'retd', label: 'ReTD', numeric: true },
    { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) }, { key: 'yac', label: 'YAC', numeric: true, format: v => fmt.num(v, 1) }, { key: 'tgtsh', label: 'Tgt%', numeric: true, format: v => fmt.num(v, 0) }, { key: 'wopr', label: 'WOPR', numeric: true, format: v => fmt.num(v, 2) },
    { key: 'ppr', label: 'PPR', numeric: true, format: v => fmt.num(v, 1) },
  ]
  // trim columns irrelevant to the position to reduce clutter
  const drop = pos === 'QB' ? ['tgt', 'rec', 'recy', 'retd', 'adot', 'yac', 'tgtsh', 'wopr']
    : pos === 'RB' ? ['att', 'py', 'ptd', 'intc', 'adot', 'tgtsh', 'wopr']
    : ['att', 'py', 'ptd', 'intc', 'car', 'ry', 'rtd']
  const cols = all.filter(c => !drop.includes(String(c.key)))
  return (
    <Tile title={`Every ${pos} — packed metrics`} subtitle={`${sliceLabel(slicers)} · scroll horizontally`} span={12}>
      <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ppr', dir: 'desc' }} dense />}</QueryState>
    </Tile>
  )
}

function Fantasy({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const w = pw(slicers)
  const sql = `SELECT recent_team tm, round(sum(fantasy_points_ppr),1) total,
      round(sum(fantasy_points_ppr)/nullif(count(distinct season||'-'||week),0),1) ppg
    FROM player_week WHERE position='${pos}' ${w} GROUP BY 1 ORDER BY total DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'total', label: 'Total PPR', numeric: true, format: v => fmt.num(v, 1) }, { key: 'ppg', label: 'PPR/wk', numeric: true, format: v => fmt.num(v, 1) }]
  return (
    <div className="space-y-4">
      <FantasyBanner label={`Fantasy · Team ${pos}`} headline={`Which teams' ${pos}s score the most.`}
        body={`Total PPR produced by each team's ${pos} group across the slice — a proxy for where the ${pos} fantasy value lives.`} />
      <Tile title={`Team ${pos} fantasy production`} subtitle={`PPR · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={320}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.total, color: TEAM_COLORS[r.tm] || PALETTE.accent2 }))} height={320} formatY={v => fmt.int(v)} />}</QueryState>
      </Tile>
      <Tile title="Full table" span={12}><QueryState q={q} height={360}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'total', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}
