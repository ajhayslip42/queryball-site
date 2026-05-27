/**
 * League Defense — REAL DATA, EPA-driven rankings.
 *
 * Predictive over scorebook: defenses ranked by EPA/play allowed, split into
 * pass and run defense, plus a fantasy DST view (sacks + takeaways).
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
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
    { id: 'dst',     label: 'Fantasy DST',   fantasy: true, render: () => <Dst /> },
  ]
  return (
    <DeckShell title="League Defense" deckIndex={9}
      intro="Predictive rankings, not scorebook fiction. Defenses ranked by EPA per play allowed — overall, against the pass, and against the run — plus a fantasy DST view. Live from play-by-play."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','shotgun','playType','garbage']} />
  )
}

function rankTile(title: string, sub: string, q: any, color: string, fmtY: (v: number) => string, cols: Column<any>[], sortKey: string, dir: 'asc' | 'desc') {
  return (
    <>
      <Tile title={title} subtitle={sub} span={12}>
        <QueryState q={q} height={360}>{(rows: any[]) => (
          <BarTile data={rows.map(r => ({ name: r.def, value: r[sortKey], color: TEAM_COLORS[r.def] || color }))} height={360} formatY={fmtY} />
        )}</QueryState>
      </Tile>
      <Tile title="Full rankings" span={12}>
        <QueryState q={q} height={400}>{(rows: any[]) => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: sortKey, dir }} />
        )}</QueryState>
      </Tile>
    </>
  )
}

function Overall() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const sql = `
    SELECT defteam def, round(avg(epa),3) epa,
      round(sum(success)*100.0/count(*),1) sr, count(*) plays
    FROM plays WHERE defteam IS NOT NULL AND epa IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'epa', label: 'EPA/play allowed', numeric: true, format: v => fmt.signed(v, 3) },
    { key: 'sr', label: 'Success% allowed', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'plays', label: 'Plays', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="#1 defense" value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${fmt.signed(q.data[0].epa, 3)} EPA/play` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="all plays" />
        <StatBlock label="Metric" value="EPA/play" sub="opponent-neutral" />
        <StatBlock label="Defenses" value={q.data ? String(q.data.length) : '–'} sub="ranked" />
      </Grid>
      {rankTile('EPA per play allowed', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}
    </div>
  )
}

function PassDef() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const sql = `
    SELECT defteam def, round(avg(epa),3) epa,
      round(sum(sack)*100.0/nullif(count(*) FILTER(WHERE qb_dropback=1),0),1) sack_rt,
      round(sum(passing_yards)/nullif(count(distinct game_id),0),1) ypg
    FROM plays WHERE defteam IS NOT NULL AND pass_attempt=1 AND epa IS NOT NULL ${w}
    GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'epa', label: 'EPA/pass allowed', numeric: true, format: v => fmt.signed(v, 3) },
    { key: 'sack_rt', label: 'Sack%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'ypg', label: 'Pass Y/G', numeric: true, format: v => fmt.num(v, 0) },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Best pass D" value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${fmt.signed(q.data[0].epa, 3)} EPA/pass` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="dropbacks" />
        <StatBlock label="Metric" value="EPA/pass" sub="+ sack rate" />
        <StatBlock label="Source" value="Play-by-play" sub="2023–2025" />
      </Grid>
      {rankTile('EPA per pass allowed', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}
    </div>
  )
}

function RunDef() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const sql = `
    SELECT defteam def, round(avg(epa),3) epa,
      round(avg(rushing_yards),2) ypc,
      round(sum(CASE WHEN rushing_yards<=0 THEN 1 ELSE 0 END)*100.0/count(*),1) stuff_rt
    FROM plays WHERE defteam IS NOT NULL AND rush_attempt=1 AND epa IS NOT NULL ${w}
    GROUP BY 1 ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'epa', label: 'EPA/rush allowed', numeric: true, format: v => fmt.signed(v, 3) },
    { key: 'ypc', label: 'YPC allowed', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'stuff_rt', label: 'Stuff%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Best run D" value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${fmt.signed(q.data[0].epa, 3)} EPA/rush` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="rush attempts" />
        <StatBlock label="Metric" value="EPA/rush" sub="+ YPC, stuff%" />
        <StatBlock label="Source" value="Play-by-play" sub="2023–2025" />
      </Grid>
      {rankTile('EPA per rush allowed', `Most negative = best · ${sliceLabel(slicers)}`, q, PALETTE.bad, v => fmt.signed(v, 2), cols, 'epa', 'asc')}
    </div>
  )
}

function Dst() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const sql = `
    SELECT defteam def, sum(sack)::int sacks, sum(interception)::int ints,
      sum(fumble_lost)::int fum, (sum(sack)+sum(interception)*2+sum(fumble_lost)*2)::int dst_pts
    FROM plays WHERE defteam IS NOT NULL ${w}
    GROUP BY 1 ORDER BY dst_pts DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'def', label: 'Defense' },
    { key: 'sacks', label: 'Sacks', numeric: true },
    { key: 'ints', label: 'INTs', numeric: true },
    { key: 'fum', label: 'FumRec', numeric: true },
    { key: 'dst_pts', label: 'Splash score', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <FantasyBanner label="Fantasy Defense · DST" headline="Sacks and takeaways drive DST scoring."
        body="A splash-play score (sacks + 2×interceptions + 2×fumble recoveries) as a quick proxy for big-play defenses. DST is best streamed by matchup — pair this with the matchup view." />
      <Grid>
        <StatBlock label="Top splash D" value={q.data?.[0]?.def ?? '–'} sub={q.data?.[0] ? `${q.data[0].sacks} sk · ${q.data[0].ints} int` : ''} />
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="takeaways + sacks" />
        <StatBlock label="Defenses" value={q.data ? String(q.data.length) : '–'} sub="ranked" />
        <StatBlock label="Source" value="Play-by-play" sub="2023–2025" />
      </Grid>
      <Tile title="Splash-play score by defense" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={340}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.def, value: r.dst_pts, color: TEAM_COLORS[r.def] || PALETTE.accent }))} height={340} />
        )}</QueryState>
      </Tile>
      <Tile title="Fantasy DST — full table" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'dst_pts', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}
