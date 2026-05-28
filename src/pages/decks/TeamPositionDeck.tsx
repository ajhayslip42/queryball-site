/**
 * TeamPositionDeck — generic team-level position view. REAL DATA.
 * 7 reports, 10+ visuals each, packed table at #2. Drives the 4 Team decks.
 */
import DeckShell, { Tile, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import { MetricReport, metricsOf, selOf, miniColsOf, F, type MDef } from '@/components/deck/Panels'
import { QueryState, FantasyBanner } from '@/components/deck/Helpers'
import { useQuery } from '@/lib/useQuery'
import { useSlicers } from '@/lib/slicers'
import { playsWhere, sliceLabel } from '@/lib/slicerSql'
import { playerGameLog } from '@/lib/playerGameSql'

type Pos = 'QB' | 'RB' | 'WR' | 'TE'
// Position-locked deck: clear any global position slicer so wrappers don't cross-pollute.
const minN = (s: ReturnType<typeof useSlicers>['slicers']) => (s.weeks.length ? 1 : 30)

export default function TeamPositionDeck({ position, title, intro, deckIndex }: {
  position: Pos; title: string; intro: string; deckIndex: number
}) {
  const tabs: DeckTab[] = [
    { id: 'byteam',  label: 'By Team',          render: () => <ByTeam pos={position} /> },
    { id: 'data',    label: 'Data Table',       render: () => <DataTab pos={position} /> },
    { id: 'room',    label: 'Room Detail',      render: () => <Room pos={position} /> },
    { id: 'eff',     label: 'Efficiency',       render: () => <Eff pos={position} /> },
    { id: 'depth',   label: position === 'RB' ? 'Run Direction' : 'Air Yards', render: () => <Depth pos={position} /> },
    { id: 'sit',     label: 'Situational',      render: () => <Situational pos={position} /> },
    { id: 'fantasy', label: 'Fantasy',          fantasy: true, render: () => <Fantasy pos={position} /> },
  ]
  return (
    <DeckShell title={title} intro={intro} tabs={tabs} deckIndex={deckIndex}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','passDepth','runDir','pressure','shotgun','playType','garbage']} />
  )
}

/* metric sets (player_week aggregates grouped by team) */
function prodDefs(pos: Pos): MDef[] {
  if (pos === 'QB') return [
    { key: 'py', label: 'Pass Yds', expr: 'sum(passing_yards)', f: 'int' }, { key: 'ptd', label: 'Pass TD', expr: 'sum(passing_tds)', f: 'int' },
    { key: 'att', label: 'Attempts', expr: 'sum(attempts)', f: 'int' }, { key: 'cmp', label: 'Completions', expr: 'sum(completions)', f: 'int' },
    { key: 'intc', label: 'INT', expr: 'sum(interceptions)', f: 'int' }, { key: 'fd', label: 'Pass 1st Downs', expr: 'sum(passing_first_downs)', f: 'int' },
    { key: 'ay', label: 'Air Yards', expr: 'sum(passing_air_yards)', f: 'int' }, { key: 'sk', label: 'Sacks', expr: 'sum(sacks)', f: 'int' },
    { key: 'ry', label: 'Rush Yds', expr: 'sum(rushing_yards)', f: 'int' }, { key: 'ppr', label: 'PPR Pts', expr: 'sum(fantasy_points_ppr)', f: 'd1' },
  ]
  if (pos === 'RB') return [
    { key: 'ry', label: 'Rush Yds', expr: 'sum(rushing_yards)', f: 'int' }, { key: 'car', label: 'Carries', expr: 'sum(carries)', f: 'int' },
    { key: 'rtd', label: 'Rush TD', expr: 'sum(rushing_tds)', f: 'int' }, { key: 'rfd', label: 'Rush 1st Downs', expr: 'sum(rushing_first_downs)', f: 'int' },
    { key: 'tgt', label: 'Targets', expr: 'sum(targets)', f: 'int' }, { key: 'rec', label: 'Receptions', expr: 'sum(receptions)', f: 'int' },
    { key: 'recy', label: 'Rec Yds', expr: 'sum(receiving_yards)', f: 'int' }, { key: 'recfd', label: 'Rec 1st Downs', expr: 'sum(receiving_first_downs)', f: 'int' },
    { key: 'scrim', label: 'Scrimmage Yds', expr: 'sum(rushing_yards+receiving_yards)', f: 'int' }, { key: 'ppr', label: 'PPR Pts', expr: 'sum(fantasy_points_ppr)', f: 'd1' },
  ]
  return [
    { key: 'recy', label: 'Rec Yds', expr: 'sum(receiving_yards)', f: 'int' }, { key: 'tgt', label: 'Targets', expr: 'sum(targets)', f: 'int' },
    { key: 'rec', label: 'Receptions', expr: 'sum(receptions)', f: 'int' }, { key: 'rtd', label: 'Rec TD', expr: 'sum(receiving_tds)', f: 'int' },
    { key: 'fd', label: 'Rec 1st Downs', expr: 'sum(receiving_first_downs)', f: 'int' }, { key: 'ay', label: 'Air Yards', expr: 'sum(receiving_air_yards)', f: 'int' },
    { key: 'yac', label: 'YAC', expr: 'sum(receiving_yards_after_catch)', f: 'int' }, { key: 'epa', label: 'Rec EPA', expr: 'round(sum(receiving_epa),1)', f: 'd1' },
    { key: 'fdpct', label: '1st Down / Tgt %', expr: 'round(sum(receiving_first_downs)*100.0/nullif(sum(targets),0),1)', f: 'pct' }, { key: 'ppr', label: 'PPR Pts', expr: 'sum(fantasy_points_ppr)', f: 'd1' },
  ]
}
function rateDefs(pos: Pos): MDef[] {
  if (pos === 'QB') return [
    { key: 'cmppct', label: 'Comp %', expr: 'round(sum(completions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' }, { key: 'ya', label: 'Yards / Att', expr: 'round(sum(passing_yards)*1.0/nullif(sum(attempts),0),2)', f: 'd2' },
    { key: 'tdpct', label: 'TD %', expr: 'round(sum(passing_tds)*100.0/nullif(sum(attempts),0),1)', f: 'pct' }, { key: 'intpct', label: 'INT %', expr: 'round(sum(interceptions)*100.0/nullif(sum(attempts),0),1)', f: 'pct' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(passing_first_downs)*100.0/nullif(sum(attempts),0),1)', f: 'pct' }, { key: 'adot', label: 'aDOT', expr: 'round(sum(passing_air_yards)*1.0/nullif(sum(attempts),0),1)', f: 'd1' },
    { key: 'epa', label: 'Pass EPA', expr: 'round(sum(passing_epa),1)', f: 'd1' }, { key: 'skpct', label: 'Sack %', expr: 'round(sum(sacks)*100.0/nullif(sum(attempts)+sum(sacks),0),1)', f: 'pct' },
    { key: 'ypg', label: 'Pass Y / Gm', expr: 'round(sum(passing_yards)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' }, { key: 'ppg', label: 'PPR / Gm', expr: 'round(sum(fantasy_points_ppr)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' },
  ]
  if (pos === 'RB') return [
    { key: 'ypc', label: 'Yards / Carry', expr: 'round(sum(rushing_yards)*1.0/nullif(sum(carries),0),2)', f: 'd2' }, { key: 'fdpct', label: 'Rush 1st Down %', expr: 'round(sum(rushing_first_downs)*100.0/nullif(sum(carries),0),1)', f: 'pct' },
    { key: 'repa', label: 'Rush EPA', expr: 'round(sum(rushing_epa),1)', f: 'd1' }, { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'ypr', label: 'Yards / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' }, { key: 'recepa', label: 'Rec EPA', expr: 'round(sum(receiving_epa),1)', f: 'd1' },
    { key: 'scrimg', label: 'Scrim / Gm', expr: 'round(sum(rushing_yards+receiving_yards)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' }, { key: 'touchg', label: 'Touch / Gm', expr: 'round(sum(carries+receptions)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' },
    { key: 'totfd', label: 'Total 1st Downs', expr: 'sum(rushing_first_downs+receiving_first_downs)', f: 'int' }, { key: 'ppg', label: 'PPR / Gm', expr: 'round(sum(fantasy_points_ppr)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' },
  ]
  return [
    { key: 'catch', label: 'Catch %', expr: 'round(sum(receptions)*100.0/nullif(sum(targets),0),1)', f: 'pct' }, { key: 'ypr', label: 'Yards / Rec', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(receptions),0),1)', f: 'd1' },
    { key: 'ypt', label: 'Yards / Tgt', expr: 'round(sum(receiving_yards)*1.0/nullif(sum(targets),0),2)', f: 'd2' }, { key: 'adot', label: 'aDOT', expr: 'round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1)', f: 'd1' },
    { key: 'yacr', label: 'YAC / Rec', expr: 'round(sum(receiving_yards_after_catch)*1.0/nullif(sum(receptions),0),1)', f: 'd1' }, { key: 'fdpct', label: '1st Down / Tgt %', expr: 'round(sum(receiving_first_downs)*100.0/nullif(sum(targets),0),1)', f: 'pct' },
    { key: 'epa', label: 'Rec EPA', expr: 'round(sum(receiving_epa),1)', f: 'd1' }, { key: 'ypg', label: 'Rec Y / Gm', expr: 'round(sum(receiving_yards)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' },
    { key: 'totfd', label: 'Total 1st Downs', expr: 'sum(receiving_first_downs)', f: 'int' }, { key: 'ppg', label: 'PPR / Gm', expr: 'round(sum(fantasy_points_ppr)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' },
  ]
}

function useTeam(pos: Pos, defs: MDef[]) {
  const { slicers } = useSlicers()
  const sql = `SELECT recent_team AS cat, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}' GROUP BY cat ORDER BY cat`
  return { q: useQuery<any>(sql, [sql]), slicers }
}

function ByTeam({ pos }: { pos: Pos }) {
  const defs = prodDefs(pos); const { q, slicers } = useTeam(pos, defs)
  return <MetricReport loading={q.loading} title={`Team ${pos} production`} subtitle={sliceLabel(slicers)}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Team', defs), sort: { key: defs[0].key, dir: 'desc' }, caption: 'Every team' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
}
function Eff({ pos }: { pos: Pos }) {
  const defs = rateDefs(pos); const { q, slicers } = useTeam(pos, defs)
  return <MetricReport loading={q.loading} title={`Team ${pos} efficiency & rates`} subtitle={sliceLabel(slicers)}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Team', defs), caption: 'Rate stats by team' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
}
function Fantasy({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const defs: MDef[] = [
    { key: 'ppr', label: 'PPR Pts', expr: 'sum(fantasy_points_ppr)', f: 'd1' }, { key: 'std', label: 'Standard Pts', expr: 'sum(fantasy_points)', f: 'd1' },
    { key: 'ppg', label: 'PPR / Gm', expr: 'round(sum(fantasy_points_ppr)*1.0/nullif(count(distinct season||week),0),1)', f: 'd1' },
    { key: 'passpt', label: 'Passing Pts', expr: 'round(sum(passing_yards*0.04+passing_tds*4-interceptions*2),1)', f: 'd1' },
    { key: 'rushpt', label: 'Rushing Pts', expr: 'round(sum(rushing_yards*0.1+rushing_tds*6),1)', f: 'd1' },
    { key: 'recpt', label: 'Receiving Pts', expr: 'round(sum(receiving_yards*0.1+receiving_tds*6+receptions),1)', f: 'd1' },
    { key: 'td', label: 'Total TD', expr: 'sum(passing_tds+rushing_tds+receiving_tds)', f: 'int' },
    { key: 'fd', label: 'Total 1st Downs', expr: 'sum(COALESCE(passing_first_downs,0)+COALESCE(rushing_first_downs,0)+COALESCE(receiving_first_downs,0))', f: 'int' },
    { key: 'yds', label: 'Total Yds', expr: 'sum(COALESCE(passing_yards,0)+COALESCE(rushing_yards,0)+COALESCE(receiving_yards,0))', f: 'int' },
    { key: 'players', label: 'Distinct Players', expr: 'count(distinct player_id)', f: 'int' },
  ]
  const sql = `SELECT recent_team AS cat, ${selOf(defs)} FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}' GROUP BY cat ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-4">
      <FantasyBanner label={`Fantasy · Team ${pos}`} headline={`Where the ${pos} fantasy points live.`}
        body={`Total and per-game PPR by team, with the scoring breakdown and total first downs.`} />
      <MetricReport loading={q.loading} mini={{ rows: q.data ?? [], cols: miniColsOf('Team', defs), sort: { key: 'ppr', dir: 'desc' }, caption: 'Team fantasy detail' }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
    </div>
  )
}

function Room({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const team = slicers.teams[0] ?? 'KC'
  const defs = prodDefs(pos)
  // Default the team in via a slicer override so all other filters still apply consistently.
  const teamS = slicers.teams.length ? slicers : { ...slicers, teams: [team] }
  const sql = `SELECT player_display_name AS cat, ${selOf(defs)} FROM ${playerGameLog(teamS)} g WHERE "position"='${pos}' GROUP BY cat HAVING ${defs[0].expr} > 0 ORDER BY ${defs[0].key} DESC`
  const q = useQuery<any>(sql, [sql])
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{team}'s {pos} room. Pick a team in the rail (Team filter) to switch rooms.</p>
      <MetricReport loading={q.loading} title={`${team} — ${pos} room`} subtitle={sliceLabel(slicers)}
        mini={{ rows: q.data ?? [], cols: miniColsOf('Player', defs), sort: { key: defs[0].key, dir: 'desc' }, caption: 'Players in this room' }}
        panels={[{ rows: q.data ?? [], categoryKey: 'cat', short: true, metrics: metricsOf(defs) }]} />
    </div>
  )
}

/* plays-based: Air Yards (QB/WR/TE) or Run Direction (RB), by team */
function Depth({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  if (pos === 'RB') {
    const defs: MDef[] = [
      { key: 'car', label: 'Carries', expr: 'count(*)', f: 'int' }, { key: 'yds', label: 'Rush Yds', expr: 'sum(rushing_yards)', f: 'int' },
      { key: 'ypc', label: 'Yards / Carry', expr: 'round(avg(rushing_yards),2)', f: 'd2' }, { key: 'epa', label: 'EPA / rush', expr: 'round(avg(epa),3)', f: 'epa' },
      { key: 'fd', label: '1st Downs', expr: 'sum(first_down)', f: 'int' }, { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
      { key: 'lft', label: 'Left %', expr: "round(count(*) FILTER(WHERE run_location='left')*100.0/count(*),1)", f: 'pct' },
      { key: 'mid', label: 'Middle %', expr: "round(count(*) FILTER(WHERE run_location='middle')*100.0/count(*),1)", f: 'pct' },
      { key: 'rgt', label: 'Right %', expr: "round(count(*) FILTER(WHERE run_location='right')*100.0/count(*),1)", f: 'pct' },
      { key: 'expl', label: 'Explosive (10+)', expr: 'count(*) FILTER(WHERE rushing_yards>=10)', f: 'int' },
    ]
    const sql = `SELECT posteam AS cat, ${selOf(defs)} FROM plays WHERE rush_attempt=1 AND posteam IS NOT NULL ${w} GROUP BY cat HAVING count(*)>${minN(slicers)} ORDER BY cat`
    const q = useQuery<any>(sql, [sql])
    return <MetricReport loading={q.loading} title="Rushing direction & efficiency by team" subtitle={sliceLabel(slicers)}
      mini={{ rows: q.data ?? [], cols: miniColsOf('Team', defs), caption: 'By team' }}
      panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
  }
  const idc = pos === 'QB' ? 'passer_player_id' : 'receiver_player_id'
  const where = pos === 'QB' ? w : `${w} AND ${idc} IN (SELECT gsis_id FROM players WHERE position='${pos}')`
  const defs: MDef[] = [
    { key: 'att', label: 'Attempts', expr: 'count(*)', f: 'int' }, { key: 'cmp', label: 'Completions', expr: 'sum(complete_pass)', f: 'int' },
    { key: 'yds', label: 'Yards', expr: 'sum(passing_yards)', f: 'int' }, { key: 'adot', label: 'aDOT', expr: 'round(avg(air_yards),1)', f: 'd1' },
    { key: 'deep', label: 'Deep % (20+)', expr: 'round(count(*) FILTER(WHERE air_yards>=20)*100.0/count(*),1)', f: 'pct' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' }, { key: 'fd', label: '1st Downs', expr: 'sum(first_down)', f: 'int' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'yac', label: 'YAC', expr: 'sum(yards_after_catch)', f: 'int' }, { key: 'td', label: 'TDs', expr: 'sum(touchdown)', f: 'int' },
  ]
  const sql = `SELECT posteam AS cat, ${selOf(defs)} FROM plays WHERE pass_attempt=1 AND air_yards IS NOT NULL AND posteam IS NOT NULL ${where} GROUP BY cat HAVING count(*)>${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return <MetricReport loading={q.loading} title={`${pos === 'QB' ? 'Team passing' : pos + ' targets'} by depth`} subtitle={sliceLabel(slicers)}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Team', defs), caption: 'Depth-of-target by team' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
}

function Situational({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers(); const w = playsWhere(slicers)
  const role = pos === 'RB' ? 'rush_attempt=1' : 'pass_attempt=1'
  const filt = pos === 'QB' || pos === 'RB' ? '' : `AND receiver_player_id IN (SELECT gsis_id FROM players WHERE position='${pos}')`
  const ydCol = pos === 'RB' ? 'rushing_yards' : pos === 'QB' ? 'passing_yards' : 'receiving_yards'
  const defs: MDef[] = [
    { key: 'n', label: 'Plays', expr: 'count(*)', f: 'int' },
    { key: 'fdpct', label: '1st Down %', expr: 'round(sum(first_down)*100.0/count(*),1)', f: 'pct' },
    { key: 'third', label: '3rd-Down Conv %', expr: 'round(sum(first_down) FILTER(WHERE down=3)*100.0/nullif(count(*) FILTER(WHERE down=3),0),1)', f: 'pct' },
    { key: 'rzn', label: 'Red-Zone Plays', expr: 'count(*) FILTER(WHERE yardline_100<=20)', f: 'int' },
    { key: 'rztd', label: 'RZ TD %', expr: 'round(sum(touchdown) FILTER(WHERE yardline_100<=20)*100.0/nullif(count(*) FILTER(WHERE yardline_100<=20),0),1)', f: 'pct' },
    { key: 'gl', label: 'Goal-Line Plays', expr: 'count(*) FILTER(WHERE yardline_100<=5)', f: 'int' },
    { key: 'epa', label: 'EPA / play', expr: 'round(avg(epa),3)', f: 'epa' },
    { key: 'sr', label: 'Success %', expr: 'round(sum(success)*100.0/count(*),1)', f: 'pct' },
    { key: 'yds', label: 'Yards', expr: `sum(${ydCol})`, f: 'int' },
    { key: 'td', label: 'TDs', expr: 'sum(touchdown)', f: 'int' },
  ]
  const sql = `SELECT posteam AS cat, ${selOf(defs)} FROM plays WHERE ${role} AND posteam IS NOT NULL ${filt} ${w} GROUP BY cat HAVING count(*)>${minN(slicers)} ORDER BY cat`
  const q = useQuery<any>(sql, [sql])
  return <MetricReport loading={q.loading} title={`Situational — ${pos}`} subtitle={`Third down, red zone, goal line · ${sliceLabel(slicers)}`}
    mini={{ rows: q.data ?? [], cols: miniColsOf('Team', defs), caption: 'Situational by team' }}
    panels={[{ rows: q.data ?? [], categoryKey: 'cat', metrics: metricsOf(defs) }]} />
}

/* Report #2 — packed per-player table */
function DataTab({ pos }: { pos: Pos }) {
  const { slicers } = useSlicers()
  const sql = `SELECT player_display_name nm, recent_team tm, count(distinct game_id) g,
      sum(attempts)::int att, sum(passing_yards)::int py, sum(passing_tds)::int ptd, sum(interceptions)::int intc, sum(passing_first_downs)::int pfd,
      sum(carries)::int car, sum(rushing_yards)::int ry, sum(rushing_tds)::int rtd, sum(rushing_first_downs)::int rfd,
      sum(targets)::int tgt, sum(receptions)::int rec, sum(receiving_yards)::int recy, sum(receiving_tds)::int retd, sum(receiving_first_downs)::int recfd,
      round(sum(receiving_air_yards)*1.0/nullif(sum(targets),0),1) adot, sum(receiving_yards_after_catch)::int yac,
      sum(receiving_air_yards)::int ay, round(sum(targets)*1.0/nullif(count(distinct game_id),0),1) tpg, round(sum(fantasy_points_ppr),1) ppr
    FROM ${playerGameLog(slicers)} g WHERE "position"='${pos}' GROUP BY 1,2 HAVING count(distinct game_id)>0 ORDER BY ppr DESC LIMIT 80`
  const q = useQuery<any>(sql, [sql])
  const all: Column<any>[] = [
    { key: 'nm', label: 'Player' }, { key: 'tm', label: 'Tm' }, { key: 'g', label: 'G', numeric: true },
    { key: 'att', label: 'Att', numeric: true }, { key: 'py', label: 'PaYd', numeric: true }, { key: 'ptd', label: 'PaTD', numeric: true }, { key: 'intc', label: 'INT', numeric: true }, { key: 'pfd', label: 'Pa1D', numeric: true },
    { key: 'car', label: 'Car', numeric: true }, { key: 'ry', label: 'RuYd', numeric: true }, { key: 'rtd', label: 'RuTD', numeric: true }, { key: 'rfd', label: 'Ru1D', numeric: true },
    { key: 'tgt', label: 'Tgt', numeric: true }, { key: 'rec', label: 'Rec', numeric: true }, { key: 'recy', label: 'ReYd', numeric: true }, { key: 'retd', label: 'ReTD', numeric: true }, { key: 'recfd', label: 'Re1D', numeric: true },
    { key: 'adot', label: 'aDOT', numeric: true, format: F.d1 }, { key: 'yac', label: 'YAC', numeric: true }, { key: 'ay', label: 'AirYd', numeric: true }, { key: 'tpg', label: 'Tgt/G', numeric: true, format: F.d1 }, { key: 'ppr', label: 'PPR', numeric: true, format: F.d1 },
  ]
  const drop = pos === 'QB' ? ['tgt', 'rec', 'recy', 'retd', 'recfd', 'adot', 'yac', 'ay', 'tpg'] : pos === 'RB' ? ['att', 'py', 'ptd', 'intc', 'pfd', 'adot'] : ['att', 'py', 'ptd', 'intc', 'pfd', 'car', 'ry', 'rtd', 'rfd']
  const cols = all.filter(c => !drop.includes(String(c.key)))
  return (
    <Tile title={`Every ${pos} — packed metrics`} subtitle={`${sliceLabel(slicers)} · scroll horizontally`} span={12}>
      <QueryState q={q} height={460}>{rows => <DataTable rows={rows} columns={cols} defaultSort={{ key: 'ppr', dir: 'desc' }} dense />}</QueryState>
    </Tile>
  )
}
