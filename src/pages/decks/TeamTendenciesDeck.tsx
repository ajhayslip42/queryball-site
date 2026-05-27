/**
 * Team Tendencies — REAL DATA from play-by-play. 7 report tabs.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
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
    { id: 'bydown',    label: 'Tendency by Down',  render: () => <ByDown /> },
    { id: 'formation', label: 'Formation & Tempo', render: () => <Formation /> },
    { id: 'thirddown', label: 'Third Down',        render: () => <ThirdDown /> },
    { id: 'airyards',  label: 'Air Yards',         render: () => <AirYards /> },
    { id: 'explosive', label: 'Explosive Plays',   render: () => <Explosive /> },
    { id: 'data',      label: 'Data Table',        render: () => <DataTab /> },
  ]
  return (
    <DeckShell title="Team Tendencies" deckIndex={8}
      intro="What each offense does, from play-by-play. Pass/run balance, tendencies by down, tempo, depth of target, and explosive-play rates — all sliceable by score, quarter, field zone, and pass depth in the rail."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}
const minP = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 50)

function Splits() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm, round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1) pass_rt, sum(pass_attempt)::int pass, sum(rush_attempt)::int rush
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING sum(pass_attempt)+sum(rush_attempt) >= ${minP(slicers)} ORDER BY pass_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'pass_rt', label: 'Pass%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'pass', label: 'Pass', numeric: true }, { key: 'rush', label: 'Rush', numeric: true }]
  return (
    <div className="space-y-4">
      <Tile title="Pass rate by team" subtitle={`Adjust down/score/zone in the rail to see tendency shifts · ${sliceLabel(slicers)}`} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.pass_rt, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={360} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title="Pass/run splits — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'pass_rt', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function ByDown() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm,
      round(sum(pass_attempt) FILTER(WHERE down=1)*100.0/nullif(count(*) FILTER(WHERE down=1),0),1) d1,
      round(sum(pass_attempt) FILTER(WHERE down=2)*100.0/nullif(count(*) FILTER(WHERE down=2),0),1) d2,
      round(sum(pass_attempt) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) d3
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING count(*) >= ${minP(slicers)} ORDER BY tm`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'd1', label: '1st-down Pass%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'd2', label: '2nd-down Pass%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'd3', label: '3rd-down Pass%', numeric: true, format: v => `${fmt.num(v, 1)}%` }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Pass rate on each down — the spread between first- and third-down pass rate is a quick read on predictability. {sliceLabel(slicers)}.</p>
      <Tile title="First-down pass rate by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={320}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.d1, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={320} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title="Pass rate by down — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'd1', dir: 'desc' }} dense />}</QueryState></Tile>
    </div>
  )
}

function Formation() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm, round(count(*) FILTER(WHERE shotgun=1)*100.0/nullif(count(*),0),1) sg_rt, round(count(*) FILTER(WHERE no_huddle=1)*100.0/nullif(count(*),0),1) nh_rt
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING count(*) >= ${minP(slicers)} ORDER BY sg_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'sg_rt', label: 'Shotgun%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'nh_rt', label: 'No-huddle%', numeric: true, format: v => `${fmt.num(v, 1)}%` }]
  return (
    <div className="space-y-4">
      <Tile title="Shotgun rate by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={340}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.sg_rt, color: TEAM_COLORS[r.tm] || PALETTE.accent2 }))} height={340} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title="Formation & tempo — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'sg_rt', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function ThirdDown() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm, round(sum(first_down)*100.0/nullif(count(*),0),1) conv_rt, round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1) pass_rt, count(*) plays
    FROM plays WHERE posteam IS NOT NULL AND down=3 AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING count(*) >= ${slicers.weeks.length ? 1 : 20} ORDER BY conv_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'conv_rt', label: '3rd conv%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'pass_rt', label: 'Pass% on 3rd', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'plays', label: 'Plays', numeric: true }]
  return (
    <div className="space-y-4">
      <Tile title="Third-down conversion rate by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.conv_rt, color: TEAM_COLORS[r.tm] || PALETTE.ok }))} height={360} formatY={v => `${fmt.num(v, 0)}%`} />}</QueryState>
      </Tile>
      <Tile title="Third-down behavior — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'conv_rt', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function AirYards() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm, round(avg(air_yards),1) adot, round(count(*) FILTER(WHERE air_yards>=20)*100.0/nullif(count(*),0),1) deep_rt, count(*) att
    FROM plays WHERE posteam IS NOT NULL AND pass_attempt=1 AND air_yards IS NOT NULL ${w} GROUP BY 1 HAVING count(*) >= ${slicers.weeks.length ? 1 : 30} ORDER BY adot DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) }, { key: 'deep_rt', label: 'Deep% (20+)', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'att', label: 'Att', numeric: true }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Average depth of target (aDOT) and deep-shot rate by offense. Filter pass depth/direction in the rail to narrow further. {sliceLabel(slicers)}.</p>
      <Tile title="Average depth of target by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.adot, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={360} formatY={v => fmt.num(v, 1)} />}</QueryState>
      </Tile>
      <Tile title="Air yards detail" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'adot', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function Explosive() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm,
      round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/nullif(count(*),0),1) expl_rt,
      count(*) FILTER(WHERE pass_attempt=1 AND passing_yards>=20)::int pass20, count(*) FILTER(WHERE rush_attempt=1 AND rushing_yards>=15)::int rush15
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING count(*) >= ${minP(slicers)} ORDER BY expl_rt DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [{ key: 'tm', label: 'Team' }, { key: 'expl_rt', label: 'Explosive%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'pass20', label: 'Pass 20+', numeric: true }, { key: 'rush15', label: 'Rush 15+', numeric: true }]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">Explosive plays = passes of 20+ yards or runs of 15+ yards. {sliceLabel(slicers)}.</p>
      <Tile title="Explosive-play rate by team" subtitle={sliceLabel(slicers)} span={12}>
        <QueryState q={q} height={360}>{rows => <BarTile data={rows.map(r => ({ name: r.tm, value: r.expl_rt, color: TEAM_COLORS[r.tm] || PALETTE.accent }))} height={360} formatY={v => `${fmt.num(v, 1)}%`} />}</QueryState>
      </Tile>
      <Tile title="Explosive plays — full table" span={12}><QueryState q={q} height={400}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'expl_rt', dir: 'desc' }} />}</QueryState></Tile>
    </div>
  )
}

function DataTab() {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const sql = `SELECT posteam tm, count(*) plays,
      round(sum(pass_attempt)*100.0/nullif(sum(pass_attempt)+sum(rush_attempt),0),1) pass_rt,
      round(count(*) FILTER(WHERE shotgun=1)*100.0/nullif(count(*),0),1) sg_rt,
      round(avg(air_yards),1) adot, round(avg(epa),3) epa,
      round(sum(success)*100.0/count(*),1) sr,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third_rt
    FROM plays WHERE posteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${w} GROUP BY 1 HAVING count(*) >= ${minP(slicers)} ORDER BY epa DESC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Team' }, { key: 'plays', label: 'Plays', numeric: true }, { key: 'pass_rt', label: 'Pass%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'sg_rt', label: 'SG%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
    { key: 'adot', label: 'aDOT', numeric: true, format: v => fmt.num(v, 1) }, { key: 'epa', label: 'EPA', numeric: true, format: v => fmt.signed(v, 3) }, { key: 'sr', label: 'Succ%', numeric: true, format: v => `${fmt.num(v, 1)}%` }, { key: 'third_rt', label: '3rd%', numeric: true, format: v => `${fmt.num(v, 1)}%` },
  ]
  return (
    <Tile title="Every offense — packed tendencies" subtitle={`${sliceLabel(slicers)} · honors all rail filters · scroll horizontally`} span={12}>
      <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'desc' }} dense />}</QueryState>
    </Tile>
  )
}
