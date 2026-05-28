/**
 * Team Defense (Against) — REAL DATA. 7 reports, 10+ visuals each.
 * Report #2 packed table. Plays-based reports honor pass depth & direction.
 */
import { useState } from 'react'
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, metricsOf, selOf, miniColsOf, F, type MDef } from '@/components/deck/Panels'
import { QueryState } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'
import { POSITION_COLORS } from '@/lib/nfl'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
// Use the canonical helper so every slicer (team, opponent, home/away, ...) propagates.
const minN = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 50)

export default function TeamDefenseDeck() {
  const [pos, setPos] = useState<Pos>('WR')
  const tabs: DeckTab[] = [
    { id: 'allowed', label: 'Allowed by Position', render: () => <Allowed pos={pos} setPos={setPos} /> },
    { id: 'data',    label: 'Data Table',          render: () => <DataTab /> },
    { id: 'overall', label: 'Overall Defense',      render: () => <Report kind="overall" /> },
    { id: 'depth',   label: 'Pass D by Depth',      render: () => <Report kind="depth" /> },
    { id: 'dir',     label: 'Pass D by Direction',  render: () => <Report kind="dir" /> },
    { id: 'run',     label: 'Run Defense',          render: () => <Report kind="run" /> },
    { id: 'sit',     label: 'Situational Defense',  render: () => <Report kind="sit" /> },
  ]
  return (
    <DeckShell title="Team Defense (Against)" deckIndex={7}
      intro="What each defense allows. The toggle reshapes the allowed-by-position report; the play-by-play reports honor the whole rail — including pass depth and direction, so you can isolate deep throws to the right."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}

/* Report 1 — allowed by position (reconstructed from plays, grouped by opponent_team/defense) */
function allowedDefs(pos: Pos): MDef[] {
  const yd = pos === 'QB' ? 'passing_yards' : pos === 'RB' ? 'rushing_yards' : 'receiving_yards'
  const td = pos === 'QB' ? 'passing_tds' : pos === 'RB' ? 'rushing_tds' : 'receiving_tds'
  const fd = pos === 'QB' ? 'passing_first_downs' : pos === 'RB' ? 'rushing_first_downs' : 'receiving_first_downs'
  const g = 'nullif(count(distinct season||week),0)'
  return [
    { key: 'fppg', label: 'PPR / Gm Allowed', expr: `round(sum(fantasy_points_ppr)/${g},1)`, f: 'd1' },
    { key: 'ypg', label: 'Yds / Gm Allowed', expr: `round(sum(${yd})/${g},1)`, f: 'd1' },
    { key: 'tdg', label: 'TD / Gm Allowed', expr: `round(sum(${td})/${g},2)`, f: 'd2' },
    { key: 'fdg', label: '1st Downs / Gm', expr: `round(sum(${fd})/${g},1)`, f: 'd1' },
    { key: 'tot', label: 'Total Yds Allowed', expr: `sum(${yd})`, f: 'int' },
    { key: 'tottd', label: 'Total TD Allowed', expr: `sum(${td})`, f: 'int' },
    { key: 'totfd', label: 'Total 1st Downs', expr: `sum(${fd})`, f: 'int' },
    { key: 'tgtg', label: pos === 'QB' ? 'Att / Gm' : pos === 'RB' ? 'Car / Gm' : 'Tgt / Gm', expr: `round(sum(${pos === 'QB' ? 'attempts' : pos === 'RB' ? 'carries' : 'targets'})/${g},1)`, f: 'd1' },
    { key: 'fpts', label: 'Total PPR Allowed', expr: 'round(sum(fantasy_points_ppr),1)', f: 'd1' },
    { key: 'gms', label: 'Games', expr: 'count(distinct season||week)', f: 'int' },
  ]
}
function Allowed({ pos, setPos }: { pos: Pos; setPos: (p: Pos) => void }) {
  const { slicers } = useSlicers(); const defs = allowedDefs(pos)
  const sql = `SELECT opponent_team AS cat, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}' AND opponent_team IS NOT NULL GROUP BY cat ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-3">
      <div className="qcard p-4 flex items-center gap-3 flex-wrap" style={{ background: 'linear-gradient(180deg,#FFF 0%,#F7F9FA 100%)', borderLeft: '3px solid #6191A5' }}>
        <div><p className="eyebrow">Defense vs</p><p className="text-xs text-muted mt-0.5">Reshapes every chart below.</p></div>
        <div className="flex gap-2 ml-auto">
          {(['QB', 'RB', 'WR', 'TE'] as Pos[]).map(p => (
            <button key={p} onClick={() => setPos(p)} className="px-4 py-2 rounded-lg text-sm font-bold transition-all"
              style={{ backgroundColor: pos === p ? POSITION_COLORS[p] : '#F7F9FA', color: pos === p ? '#FFF' : '#5B7280', border: pos === p ? `2px solid ${POSITION_COLORS[p]}` : '2px solid #E5E9EC' }}>vs {p}</button>
          ))}
        </div>
      </div>
      <MetricReport loading={q.loading} title={`Allowed to ${pos}s`} subtitle={`Lower = tougher · ${sliceLabel(slicers)}`}
        mini={{ rows: q.data ?? [], cols: miniColsOf('Defense', defs), sort: { key: 'fppg', dir: 'asc' }, caption: `Per-game and totals allowed to ${pos}s` }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
    </div>
  )
}

const SETS: Record<string, { title: string; sub: string; base: string; defs: MDef[] }> = {
  overall: { title: 'Overall defense', sub: 'EPA & success allowed, by defense', base: '(pass_attempt=1 OR rush_attempt=1)', defs: [
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' }, { key: 'sr', label: 'Success % allowed', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'pepa', label: 'Pass EPA', expr: 'round(avg(epa) FILTER(WHERE pass_attempt=1),3)', f: 'epa' }, { key: 'repa', label: 'Rush EPA', expr: 'round(avg(epa) FILTER(WHERE rush_attempt=1),3)', f: 'epa' },
    { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' }, { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' },
    { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' }, { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' },
    { key: 'expl', label: 'Explosive % allowed', expr: 'round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1)', f: 'pct' }, { key: 'plays', label: 'Plays', expr: 'count(*)', f: 'int' },
  ] },
  depth: { title: 'Pass defense by depth', sub: 'set Pass depth/direction in the rail to isolate (e.g.) deep right', base: 'pass_attempt=1 AND air_yards IS NOT NULL', defs: [
    { key: 'epa', label: 'EPA / pass allowed', expr: 'round(avg(epa),3)', f: 'epa' }, { key: 'comp', label: 'Comp % allowed', expr: 'round(sum(complete_pass)*100.0/count(*),1)', f: 'pct' },
    { key: 'adot', label: 'aDOT faced', expr: 'round(avg(air_yards),1)', f: 'd1' }, { key: 'yds', label: 'Yards allowed', expr: 'sum(passing_yards)', f: 'int' },
    { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' }, { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'deep', label: 'Deep att faced (20+)', expr: 'count(*) FILTER(WHERE air_yards>=20)', f: 'int' }, { key: 'td', label: 'TDs allowed', expr: 'sum(touchdown)', f: 'int' },
    { key: 'ints', label: 'INTs', expr: 'sum(interception)', f: 'int' }, { key: 'att', label: 'Attempts faced', expr: 'count(*)', f: 'int' },
  ] },
  dir: { title: 'Pass defense by direction', sub: 'EPA & 1st downs allowed by side of field', base: 'pass_attempt=1 AND pass_location IS NOT NULL', defs: [
    { key: 'el', label: 'EPA Left', expr: "round(avg(epa) FILTER(WHERE pass_location='left'),3)", f: 'epa' }, { key: 'em', label: 'EPA Middle', expr: "round(avg(epa) FILTER(WHERE pass_location='middle'),3)", f: 'epa' }, { key: 'er', label: 'EPA Right', expr: "round(avg(epa) FILTER(WHERE pass_location='right'),3)", f: 'epa' },
    { key: 'cl', label: 'Comp% Left', expr: "round(sum(complete_pass) FILTER(WHERE pass_location='left')*100.0/nullif(count(*) FILTER(WHERE pass_location='left'),0),1)", f: 'pct' }, { key: 'cm', label: 'Comp% Middle', expr: "round(sum(complete_pass) FILTER(WHERE pass_location='middle')*100.0/nullif(count(*) FILTER(WHERE pass_location='middle'),0),1)", f: 'pct' }, { key: 'cr', label: 'Comp% Right', expr: "round(sum(complete_pass) FILTER(WHERE pass_location='right')*100.0/nullif(count(*) FILTER(WHERE pass_location='right'),0),1)", f: 'pct' },
    { key: 'fl', label: '1stD Left', expr: "sum(first_down) FILTER(WHERE pass_location='left')", f: 'int' }, { key: 'fm', label: '1stD Middle', expr: "sum(first_down) FILTER(WHERE pass_location='middle')", f: 'int' }, { key: 'fr', label: '1stD Right', expr: "sum(first_down) FILTER(WHERE pass_location='right')", f: 'int' },
    { key: 'att', label: 'Attempts faced', expr: 'count(*)', f: 'int' },
  ] },
  run: { title: 'Run defense', sub: 'EPA, YPC & stuffs allowed, by defense', base: 'rush_attempt=1', defs: [
    { key: 'epa', label: 'EPA / rush allowed', expr: 'round(avg(epa),3)', f: 'epa' }, { key: 'ypc', label: 'YPC allowed', expr: 'round(avg(rushing_yards),2)', f: 'd2' },
    { key: 'stuff', label: 'Stuff % (≤0)', expr: 'round(count(*) FILTER(WHERE rushing_yards<=0)*100.0/count(*),1)', f: 'pct' }, { key: 'expl', label: 'Explosive allowed (10+)', expr: 'count(*) FILTER(WHERE rushing_yards>=10)', f: 'int' },
    { key: 'fd', label: '1st Downs allowed', expr: 'sum(first_down)', f: 'int' }, { key: 'fdpct', label: '1st Down % allowed', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'sr', label: 'Success % allowed', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' }, { key: 'td', label: 'Rush TDs allowed', expr: 'sum(touchdown)', f: 'int' },
    { key: 'yds', label: 'Yards allowed', expr: 'sum(rushing_yards)', f: 'int' }, { key: 'car', label: 'Carries faced', expr: 'count(*)', f: 'int' },
  ] },
  sit: { title: 'Situational defense', sub: 'third down, red zone, goal line — allowed', base: '(pass_attempt=1 OR rush_attempt=1)', defs: [
    { key: 'third', label: '3rd-Down Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'rztd', label: 'RZ TD % allowed', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1)', f: 'pct' },
    { key: 'gltd', label: 'Goal-Line TD % allowed', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=5)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=5),0),1)', f: 'pct' },
    { key: 'fourth', label: '4th-Down Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE down=4)*100.0/nullif(count(*) FILTER(WHERE down=4),0),1)', f: 'pct' },
    { key: 'short', label: 'Short-Yd Conv % allowed', expr: 'round(sum(first_down) FILTER(WHERE ydstogo<=2)*100.0/nullif(count(*) FILTER(WHERE ydstogo<=2),0),1)', f: 'pct' },
    { key: 'e3', label: '3rd-Down EPA', expr: 'round(avg(epa) FILTER(WHERE down=3),3)', f: 'epa' },
    { key: 'rzn', label: 'RZ Plays faced', expr: 'count(*) FILTER(WHERE yardline_100<=20)', f: 'int' },
    { key: 'n3', label: '3rd-Down Plays', expr: 'count(*) FILTER(WHERE down=3)', f: 'int' },
    { key: 'sacks', label: 'Sacks', expr: 'sum(sack)', f: 'int' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
  ] },
}
function Report({ kind }: { kind: keyof typeof SETS }) {
  const { slicers } = useSlicers(); const set = SETS[kind]
  const sql = `SELECT defteam AS cat, ${selOf(set.defs)} FROM plays WHERE defteam IS NOT NULL AND ${set.base} ${playsWhere(slicers)} GROUP BY cat HAVING count(*) >= ${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return <MetricReport loading={q.loading} title={set.title} subtitle={`${set.sub} · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Defense', set.defs), sort: { key: set.defs[0].key, dir: 'asc' }, caption: 'Every defense' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(set.defs) }]} />
}

function DataTab() {
  const { slicers } = useSlicers()
  const sql = `SELECT defteam tm, count(*) plays, round(avg(epa),3) epa, round(sum(success)*100.0/count(*),1) sr,
      round(avg(epa) FILTER(WHERE pass_attempt=1),3) pepa, round(avg(epa) FILTER(WHERE rush_attempt=1),3) repa,
      round(avg(air_yards) FILTER(WHERE pass_attempt=1),1) adot, sum(first_down)::int fd, round(sum(first_down)*100.0/count(*),1) fdpct,
      round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1) third,
      round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1) rztd,
      sum(sack)::int sacks, sum(interception)::int ints,
      round(count(*) FILTER(WHERE (pass_attempt=1 AND passing_yards>=20) OR (rush_attempt=1 AND rushing_yards>=15))*100.0/count(*),1) expl
    FROM plays WHERE defteam IS NOT NULL AND (pass_attempt=1 OR rush_attempt=1) ${playsWhere(slicers)}
    GROUP BY 1 HAVING count(*) >= ${minN(slicers)} ORDER BY epa ASC`
  const q = useQuery<any>(sql, [sql])
  const cols: Column<any>[] = [
    { key: 'tm', label: 'Def' }, { key: 'plays', label: 'Plays', numeric: true }, { key: 'epa', label: 'EPA', numeric: true, format: F.epa }, { key: 'sr', label: 'Succ%', numeric: true, format: F.d1 },
    { key: 'pepa', label: 'PaEPA', numeric: true, format: F.epa }, { key: 'repa', label: 'RuEPA', numeric: true, format: F.epa }, { key: 'adot', label: 'aDOTfc', numeric: true, format: F.d1 },
    { key: 'fd', label: '1stD', numeric: true }, { key: 'fdpct', label: '1stD%', numeric: true, format: F.d1 }, { key: 'third', label: '3rd%', numeric: true, format: F.d1 }, { key: 'rztd', label: 'RZTD%', numeric: true, format: F.d1 },
    { key: 'sacks', label: 'Sk', numeric: true }, { key: 'ints', label: 'INT', numeric: true }, { key: 'expl', label: 'Expl%', numeric: true, format: F.d1 },
  ]
  return <Tile title="Every defense — packed metrics" subtitle={`${sliceLabel(slicers)} · honors all rail filters · scroll horizontally`} span={12}>
    <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'epa', dir: 'asc' }} dense />}</QueryState>
  </Tile>
}
