/**
 * League Defense — REAL DATA, EPA-driven. 7 report tabs.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function LeagueDefenseDeck() {
  const tabs: DeckTab[] = [
    { id: 'overall', label: 'Overall (EPA)', render: () => <Overall /> },
    { id: 'pass',    label: 'Pass Defense',  render: () => <PassDef /> },
    { id: 'run',     label: 'Run Defense',   render: () => <RunDef /> },
    { id: 'depth',   label: 'Pass D by Depth', render: () => <Depth /> },
    { id: 'pressure',label: 'Pressure & Takeaways', render: () => <Pressure /> },
    { id: 'data',    label: 'Data Table',    render: () => <DataTab /> },
    { id: 'dst',     label: 'Fantasy DST',   fantasy: true, render: () => <Dst /> },
  ]
  return (
    <DeckShell title="League Defense" deckIndex={9}
      intro="Predictive rankings, not scorebook fiction. Defenses by EPA per play allowed — overall, pass, run, and by depth of target — plus pressure, takeaways, and a fantasy DST view. Live from play-by-play."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}
const minP = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 50)

function rankTile(title: string, sub: string, q: any, color: string, fmtY: (v: number) => string, cols: Column<any>[], sortKey: string, dir: 'asc' | 'desc') {
  return (
    <>
      <Tile title={title} subtitle={sub} span={12}><QueryState q={q} height={360}>{(rows: any[]) => <BarTile data={rows.map(r => ({ name: r.def, value: r[sortKey], color: TEAM_COLORS[r.def] || color }))} height={360} formatY={fmtY} />}</QueryState></Tile>
      <Tile title="Full rankings" span={12}><QueryState q={q} height={400}>{(rows: any[]) => <DataTable rows={rows} columns={cols} defaultSort={{ key: sortKey, dir }} />}</QueryState></Tile>
    </>
  )
}

function Overall() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr, count(*) plays
    FROM plays WHERE defteam IS NOT NULL AND epa IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'epa', label: 'EPA/play allowed', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'sr', label: 'Succ% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'plays', label: 'Plays', numeric: true }]
  return <div className="space-y-4">{rankTile('EPA per play allowed', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}</div>
}

function PassDef() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, round(avg(epa),3) epa, round(sum(sack)*100.0/nullif(count(*) FILTER(WHERE qb_dropback=1),0),1) sack_rt, round(sum(passing_yards)/nullif(count(distinct game_id),0),1) ypg
    FROM plays WHERE defteam IS NOT NULL AND pass_attempt=1 AND epa IS NOT NULL ${w} GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'epa', label: 'EPA/pass allowed', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'sack_rt', label: 'Sack%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'ypg', label: 'Pass Y/G', numeric: true, format: v => fmt.num(v, 0) }]
  return <div className="space-y-4">{rankTile('EPA per pass allowed', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}</div>
}

function RunDef() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, round(avg(epa),3) epa, round(avg(rushing_yards),2) ypc, round(sum(CASE WHEN rushing_yards<=0 THEN 1 ELSE 0 END)*100.0/count(*),1) stuff_rt
    FROM plays WHERE defteam IS NOT NULL AND rush_attempt=1 AND epa IS NOT NULL ${w} GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'epa', label: 'EPA/rush allowed', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'ypc', label: 'YPC allowed', numeric: true, format: v => fmt.num(v, 1) }, { key: 'stuff_rt', label: 'Stuff%', numeric: true, format: v => `${fmt.num(v, 1)}%` }]
  return <div className="space-y-4">{rankTile('EPA per rush allowed', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}</div>
}

function Depth() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, round(avg(epa),3) epa, round(sum(complete_pass)*100.0/nullif(count(*),0),1) comp_pct, round(avg(air_yards),1) adot, count(*) att
    FROM plays WHERE defteam IS NOT NULL AND pass_attempt=1 AND air_yards IS NOT NULL ${w} GROUP BY 1 HAVING count(*) > ${slicers.weeks.length ? 1 : 30} ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'epa', label: 'EPA/pass allowed', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'comp_pct', label: 'Comp% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'adot', label: 'aDOT faced', numeric: true, format: v => fmt.num(v, 1) }, { key: 'att', label: 'Att', numeric: true }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Set the <strong>Pass depth &amp; direction</strong> filter in the rail (e.g. Deep 20+, Right) and this ranks every defense against exactly that throw. {sliceLabel(slicers)}.</p>
      {rankTile('EPA per pass allowed within depth filter', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}
    </div>
  )
}

function Pressure() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, sum(sack)::int sacks, round(sum(qb_hit)*100.0/nullif(count(*) FILTER(WHERE qb_dropback=1),0),1) hit_rt, sum(interception)::int ints, sum(fumble_lost)::int fum
    FROM plays WHERE defteam IS NOT NULL ${w} GROUP BY 1 ORDER BY sacks DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'sacks', label: 'Sacks', numeric: true }, { key: 'hit_rt', label: 'QB-hit%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'ints', label: 'INT', numeric: true }, { key: 'fum', label: 'FumRec', numeric: true }]
  return (
    <div className="space-y-4">
      <Tile title="Sacks by defense" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.sacks, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={360} />}</QueryState>
      </Tile>
      <Tile title="Pressure & takeaways — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'sacks', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function DataTab() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, count(*) plays, round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr,
      round(avg(epa) FILTER(WHERE pass_attempt=1),3) pass_epa, round(avg(epa) FILTER(WHERE rush_attempt=1),3) rush_epa,
      sum(sack)::int sacks, sum(interception)::int ints, round(avg(air_yards) FILTER(WHERE pass_attempt=1),1) adot
    FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING count(*) >= ${minP(slicers)} ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Def' }, { key: 'plays', label: 'Plays', numeric: true }, { key: 'epa', label: 'EPA', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'sr', label: 'Succ%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'pass_epa', label: 'PassEPA', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'rush_epa', label: 'RushEPA', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'adot', label: 'aDOTfc', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'sacks', label: 'Sk', numeric: true }, { key: 'ints', label: 'INT', numeric: true },
  ]
  return <Tile title="Every defense — packed metrics" subtitle={`${sliceLabel(slicers)} · honors all rail filters · scroll horizontally`} span={12}><QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} dense />}</QueryState></Tile>
}

function Dst() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT defteam def, sum(sack)::int sacks, sum(interception)::int ints, sum(fumble_lost)::int fum, (sum(sack)+sum(interception)*2+sum(fumble_lost)*2)::int dst_pts
    FROM plays WHERE defteam IS NOT NULL ${w} GROUP BY 1 ORDER BY dst_pts DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'def', label: 'Defense' }, { key: 'sacks', label: 'Sacks', numeric: true }, { key: 'ints', label: 'INT', numeric: true }, { key: 'fum', label: 'FumRec', numeric: true }, { key: 'dst_pts', label: 'Splash score', numeric: true }]
  return (
    <div className="space-y-4">
      <FantasyBanner label="Fantasy Defense · DST" headline="Sacks and takeaways drive DST scoring." body="A splash-play score (sacks + 2×INT + 2×fumble recoveries) as a quick proxy for big-play defenses. Stream by matchup." />
      <Tile title="Splash-play score by defense" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={340}>{rows => <BarTile data={rows.map(r => ({ name: r.def, value: r.dst_pts, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={340} />}</QueryState>
      </Tile>
      <Tile title="Fantasy DST — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'dst_pts', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}
