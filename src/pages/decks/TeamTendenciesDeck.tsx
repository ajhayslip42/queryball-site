/**
 * Team Tendencies — REAL DATA, from play-by-play.
 *
 * Pass/run splits by down, formation tendencies (shotgun/no-huddle), and
 * situational rates. The patterns a coordinator would chart on Monday.
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { BarTile, PALETTE } from '@/components/charts/Charts'
import { QueryState } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function TeamTendenciesDeck() {
  const tabs: DeckTab[] = [
    { id: 'splits',    label: 'Pass / Run Splits', render: () => <Splits /> },
    { id: 'formation', label: 'Formation & Tempo',  render: () => <Formation /> },
    { id: 'thirddown', label: 'Third Down',         render: () => <ThirdDown /> },
  ]
  return (
    <DeckShell title="Team Tendencies" deckIndex={8}
      intro="What each offense does, from play-by-play. Pass/run balance, shotgun and no-huddle rates, and third-down behavior — sliceable by score, quarter, and field zone in the rail."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','shotgun','playType','garbage']} />
  )
}

function Splits() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const minN = slicers.weeks.length ? 1 : 50
  const sql = `
    SELECT posteam tm,
      round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1) pass_rt,
      sum(pass_attempt)::int pass, sum(rush_attempt)::int rush
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 HAVING sum(pass_attempt)+sum(rush_attempt) >= ${minN} ORDER BY pass_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' },
    { key: 'pass_rt', label: 'Pass%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'pass', label: 'Pass plays', numeric: true },
    { key: 'rush', label: 'Rush plays', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="from play-by-play" />
        <StatBlock label="Most pass-heavy" value={q.data?.[0]?.tm ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].pass_rt, 1)}% pass` : ''} />
        <StatBlock label="Most run-heavy" value={q.data?.[q.data.length - 1]?.tm ?? '–'} sub={q.data?.length ? `${fmt.num(q.data[q.data.length - 1].pass_rt, 1)}% pass` : ''} />
        <StatBlock label="Teams" value={q.data ? String(q.data.length) : '–'} sub="in slice" />
      </Grid>
      <Tile title="Pass rate by team" subtitle={`Adjust down/score/zone in the rail to see tendency shifts · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.tm, value: r.pass_rt, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={360} formatY={v => `${fmt.num(v, 0)}%`} />
        )}</QueryState>
      </Tile>
      <Tile title="Pass/run splits — full table" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'pass_rt', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

function Formation() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const minN = slicers.weeks.length ? 1 : 50
  const sql = `
    SELECT posteam tm,
      round(count(*) FILTER(WHERE shotgun=1)*100.0/nullif(count(*),0),1) sg_rt,
      round(count(*) FILTER(WHERE no_huddle=1)*100.0/nullif(count(*),0),1) nh_rt
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 HAVING count(*) >= ${minN} ORDER BY sg_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' },
    { key: 'sg_rt', label: 'Shotgun%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'nh_rt', label: 'No-huddle%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="formation tendencies" />
        <StatBlock label="Most shotgun" value={q.data?.[0]?.tm ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].sg_rt, 1)}%` : ''} />
        <StatBlock label="Metric" value="SG / NH" sub="snap formation rates" />
        <StatBlock label="Source" value="Play-by-play" sub="2023–2025" />
      </Grid>
      <Tile title="Shotgun rate by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={340}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.tm, value: r.sg_rt, color: TEAM_COLORS[r.tm] || PALETTE.accent2 }))} height={340} formatY={v => `${fmt.num(v, 0)}%`} />
        )}</QueryState>
      </Tile>
      <Tile title="Formation & tempo — full table" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'sg_rt', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}

function ThirdDown() {
  const { slicers } = useSlicers()
  const w = playsWhere(slicers)
  const minN = slicers.weeks.length ? 1 : 20
  const sql = `
    SELECT posteam tm,
      round(sum(first_down)*100.0/nullif(count(*),0),1) conv_rt,
      round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1) pass_rt,
      count(*) plays
    FROM plays WHERE posteam IS NOT NULL AND down=3 AND (pass_attempt=1 OR rush_attempt=1) ${w}
    GROUP BY 1 HAVING count(*) >= ${minN} ORDER BY conv_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' },
    { key: 'conv_rt', label: '3rd-down conv%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'pass_rt', label: 'Pass% on 3rd', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'plays', label: '3rd-down plays', numeric: true },
  ]
  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Slice" value={sliceLabel(slicers)} sub="third down only" />
        <StatBlock label="Best conversion" value={q.data?.[0]?.tm ?? '–'} sub={q.data?.[0] ? `${fmt.num(q.data[0].conv_rt, 1)}%` : ''} />
        <StatBlock label="Metric" value="Conv%" sub="3rd → 1st (or TD)" />
        <StatBlock label="Note" value="Real" sub="from play-by-play" />
      </Grid>
      <Tile title="Third-down conversion rate by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={360}>{rows => (
          <BarTile data={rows.map(r => ({ name: r.tm, value: r.conv_rt, color: TEAM_COLORS[r.tm] || PALETTE.ok }))} height={360} formatY={v => `${fmt.num(v, 0)}%`} />
        )}</QueryState>
      </Tile>
      <Tile title="Third-down behavior — full table" span={12}>
        <QueryState q={q} height={400}>{rows => (
          <DataTable rows={rows} columns={cols} defaultSort={{ key: 'conv_rt', dir: 'desc' }} />
        )}</QueryState>
      </Tile>
    </div>
  )
}
