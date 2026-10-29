/**
 * Studio — the pivot builder's vocabulary and SQL.
 *
 * Users pick row dimensions and metrics; the slicers (same ones as every
 * deck) decide which plays are in scope. The query is built from the same
 * play-by-play reconstruction the decks use, so the Studio can't produce a
 * number a report couldn't.
 *
 * Adding a metric: add a MetricDef. `expr` is a SQL aggregate over the `ev`
 * event rows (one row per player-role per play: passer, rusher, receiver).
 * Counting metrics set `count: true` so "per game" can divide them.
 * Adding a dimension: add a DimDef with a SQL expression over the raw columns
 * carried through `ev` (see EV_COLS).
 */
import type { Slicers } from './slicers'
import { playsWhere } from './slicerSql'

export type DimKey =
  | 'player' | 'team' | 'position' | 'season' | 'week' | 'opponent'
  | 'down' | 'distance' | 'score' | 'zone' | 'quarter' | 'half' | 'depth' | 'rundir' | 'playtype' | 'venue' | 'roof'

export type DimDef = { key: DimKey; label: string; group: 'who' | 'when' | 'situation'; expr: string; order?: string; blurb: string }

export const DIMS: DimDef[] = [
  { key: 'player',   label: 'Player',    group: 'who',  expr: `coalesce(pl.display_name, ev.pid)`, blurb: 'One row per player' },
  { key: 'team',     label: 'Team',      group: 'who',  expr: `ev.team`, blurb: 'Offense in possession' },
  { key: 'position', label: 'Position',  group: 'who',  expr: `pl.position`, blurb: 'QB / RB / WR / TE' },
  { key: 'opponent', label: 'Opponent',  group: 'who',  expr: `ev.opp`, blurb: 'Defense faced' },
  { key: 'season',   label: 'Season',    group: 'when', expr: `ev.season`, blurb: 'By year' },
  { key: 'week',     label: 'Week',      group: 'when', expr: `ev.week`, order: 'ev.week', blurb: 'By week' },
  { key: 'down',     label: 'Down',      group: 'situation', expr: `ev.down`, order: 'ev.down', blurb: '1st–4th' },
  { key: 'distance', label: 'Distance',  group: 'situation',
    expr: `CASE WHEN ev.ydstogo<=3 THEN 'Short (1-3)' WHEN ev.ydstogo<=9 THEN 'Medium (4-9)' ELSE 'Long (10+)' END`,
    order: `CASE WHEN ev.ydstogo<=3 THEN 1 WHEN ev.ydstogo<=9 THEN 2 ELSE 3 END`, blurb: 'Short / medium / long' },
  { key: 'score',    label: 'Score state', group: 'situation',
    expr: `CASE WHEN ev.sd<=-9 THEN 'Trailing 9+' WHEN ev.sd<0 THEN 'Trailing 1-8' WHEN ev.sd=0 THEN 'Tied' WHEN ev.sd<=8 THEN 'Leading 1-8' ELSE 'Leading 9+' END`,
    order: `CASE WHEN ev.sd<=-9 THEN 1 WHEN ev.sd<0 THEN 2 WHEN ev.sd=0 THEN 3 WHEN ev.sd<=8 THEN 4 ELSE 5 END`, blurb: 'Trailing / tied / leading' },
  { key: 'zone',     label: 'Field zone', group: 'situation',
    expr: `CASE WHEN ev.yl>=80 THEN 'Own 1-20' WHEN ev.yl>=50 THEN 'Own 21-50' WHEN ev.yl>=21 THEN 'Opp 49-21' ELSE 'Red zone' END`,
    order: `CASE WHEN ev.yl>=80 THEN 1 WHEN ev.yl>=50 THEN 2 WHEN ev.yl>=21 THEN 3 ELSE 4 END`, blurb: 'Where on the field' },
  { key: 'quarter',  label: 'Quarter',   group: 'situation', expr: `CASE WHEN ev.qtr>=5 THEN 'OT' ELSE 'Q'||ev.qtr END`, order: 'ev.qtr', blurb: 'Q1–Q4, OT' },
  { key: 'half',     label: 'Half',      group: 'situation', expr: `CASE WHEN ev.qtr<=2 THEN '1st half' ELSE '2nd half' END`, order: 'CASE WHEN ev.qtr<=2 THEN 1 ELSE 2 END', blurb: 'First / second half' },
  { key: 'depth',    label: 'Pass depth', group: 'situation',
    expr: `CASE WHEN ev.ay IS NULL THEN 'n/a' WHEN ev.ay<=0 THEN 'Behind LOS' WHEN ev.ay<=5 THEN '1-5' WHEN ev.ay<=10 THEN '6-10' WHEN ev.ay<=15 THEN '11-15' WHEN ev.ay<=25 THEN '16-25' ELSE '26+' END`,
    order: `CASE WHEN ev.ay IS NULL THEN 9 WHEN ev.ay<=0 THEN 1 WHEN ev.ay<=5 THEN 2 WHEN ev.ay<=10 THEN 3 WHEN ev.ay<=15 THEN 4 WHEN ev.ay<=25 THEN 5 ELSE 6 END`, blurb: 'Air yards of the target' },
  { key: 'rundir',   label: 'Run direction', group: 'situation',
    expr: `CASE WHEN ev.rl IS NULL THEN 'n/a' WHEN ev.rl='middle' THEN 'Middle' ELSE upper(substr(ev.rl,1,1))||substr(ev.rl,2)||' '||coalesce(upper(substr(ev.rg,1,1))||substr(ev.rg,2),'') END`, blurb: 'Gap the carry hit' },
  { key: 'playtype', label: 'Play type', group: 'situation', expr: `CASE WHEN ev.ev_role='pass' OR ev.ev_role='rec' THEN 'Pass' ELSE 'Run' END`, blurb: 'Pass vs run' },
  { key: 'venue',    label: 'Home / away', group: 'situation', expr: `CASE WHEN ev.home THEN 'Home' ELSE 'Away' END`, blurb: 'Possession team at home?' },
  { key: 'roof',     label: 'Roof',      group: 'situation', expr: `coalesce(ev.roof,'n/a')`, blurb: 'Dome / outdoors' },
]
export const DIM_BY_KEY: Record<string, DimDef> = Object.fromEntries(DIMS.map(d => [d.key, d]))

export type Fmt = 'int' | 'd1' | 'd2' | 'pct'
export type MetricDef = { key: string; label: string; group: 'passing' | 'rushing' | 'receiving' | 'combined'; expr: string; fmt: Fmt; count?: boolean; blurb?: string }

export const METRICS: MetricDef[] = [
  // Passing
  { key: 'att',     label: 'Pass att',   group: 'passing', expr: 'sum(p_att)', fmt: 'int', count: true },
  { key: 'cmp',     label: 'Comp',       group: 'passing', expr: 'sum(p_cmp)', fmt: 'int', count: true },
  { key: 'cmp_pct', label: 'Comp %',     group: 'passing', expr: '100.0*sum(p_cmp)/nullif(sum(p_att),0)', fmt: 'pct' },
  { key: 'pass_yds',label: 'Pass yds',   group: 'passing', expr: 'sum(p_yds)', fmt: 'int', count: true },
  { key: 'ypa',     label: 'Yds / att',  group: 'passing', expr: '1.0*sum(p_yds)/nullif(sum(p_att),0)', fmt: 'd2' },
  { key: 'pass_td', label: 'Pass TD',    group: 'passing', expr: 'sum(p_td)', fmt: 'int', count: true },
  { key: 'int',     label: 'INT',        group: 'passing', expr: 'sum(p_int)', fmt: 'int', count: true },
  { key: 'sacks',   label: 'Sacks',      group: 'passing', expr: 'sum(p_sack)', fmt: 'int', count: true },
  { key: 'pass_1d', label: 'Pass 1st downs', group: 'passing', expr: 'sum(p_fd)', fmt: 'int', count: true },
  { key: 'pass_ay', label: 'Pass air yds', group: 'passing', expr: 'sum(p_ay)', fmt: 'int', count: true },
  { key: 'pass_adot', label: 'aDOT (passer)', group: 'passing', expr: '1.0*sum(p_ay)/nullif(sum(p_att),0)', fmt: 'd1' },
  // Rushing
  { key: 'car',     label: 'Carries',    group: 'rushing', expr: 'sum(r_car)', fmt: 'int', count: true },
  { key: 'rush_yds',label: 'Rush yds',   group: 'rushing', expr: 'sum(r_yds)', fmt: 'int', count: true },
  { key: 'ypc',     label: 'Yds / carry',group: 'rushing', expr: '1.0*sum(r_yds)/nullif(sum(r_car),0)', fmt: 'd2' },
  { key: 'rush_td', label: 'Rush TD',    group: 'rushing', expr: 'sum(r_td)', fmt: 'int', count: true },
  { key: 'rush_1d', label: 'Rush 1st downs', group: 'rushing', expr: 'sum(r_fd)', fmt: 'int', count: true },
  { key: 'rush_10', label: 'Runs of 10+', group: 'rushing', expr: 'sum(r_exp)', fmt: 'int', count: true },
  // Receiving
  { key: 'tgt',     label: 'Targets',    group: 'receiving', expr: 'sum(c_tgt)', fmt: 'int', count: true },
  { key: 'rec',     label: 'Receptions', group: 'receiving', expr: 'sum(c_rec)', fmt: 'int', count: true },
  { key: 'catch_pct', label: 'Catch %',  group: 'receiving', expr: '100.0*sum(c_rec)/nullif(sum(c_tgt),0)', fmt: 'pct' },
  { key: 'rec_yds', label: 'Rec yds',    group: 'receiving', expr: 'sum(c_yds)', fmt: 'int', count: true },
  { key: 'ypt',     label: 'Yds / target', group: 'receiving', expr: '1.0*sum(c_yds)/nullif(sum(c_tgt),0)', fmt: 'd2' },
  { key: 'ypr',     label: 'Yds / rec',  group: 'receiving', expr: '1.0*sum(c_yds)/nullif(sum(c_rec),0)', fmt: 'd2' },
  { key: 'rec_td',  label: 'Rec TD',     group: 'receiving', expr: 'sum(c_td)', fmt: 'int', count: true },
  { key: 'adot',    label: 'aDOT',       group: 'receiving', expr: '1.0*sum(c_ay)/nullif(sum(c_tgt),0)', fmt: 'd1' },
  { key: 'rec_ay',  label: 'Air yds (rec)', group: 'receiving', expr: 'sum(c_ay)', fmt: 'int', count: true },
  { key: 'yac',     label: 'YAC',        group: 'receiving', expr: 'sum(c_yac)', fmt: 'int', count: true },
  { key: 'yac_pr',  label: 'YAC / rec',  group: 'receiving', expr: '1.0*sum(c_yac)/nullif(sum(c_rec),0)', fmt: 'd2' },
  { key: 'rec_1d',  label: 'Rec 1st downs', group: 'receiving', expr: 'sum(c_fd)', fmt: 'int', count: true },
  { key: 'rec_20',  label: 'Catches of 20+', group: 'receiving', expr: 'sum(c_exp)', fmt: 'int', count: true },
  // Combined
  { key: 'games',   label: 'Games',      group: 'combined', expr: 'count(DISTINCT ev.game_id)', fmt: 'int' },
  { key: 'plays',   label: 'Plays',      group: 'combined', expr: 'count(DISTINCT ev.game_id||\'-\'||ev.play_id)', fmt: 'int', count: true, blurb: 'Distinct plays involved' },
  { key: 'opps',    label: 'Opportunities', group: 'combined', expr: 'sum(c_tgt)+sum(r_car)', fmt: 'int', count: true, blurb: 'Targets + carries' },
  { key: 'touches', label: 'Touches',    group: 'combined', expr: 'sum(c_rec)+sum(r_car)', fmt: 'int', count: true },
  { key: 'tot_yds', label: 'Scrimmage yds', group: 'combined', expr: 'sum(c_yds)+sum(r_yds)', fmt: 'int', count: true },
  { key: 'tot_td',  label: 'Total TD',   group: 'combined', expr: 'sum(p_td)+sum(r_td)+sum(c_td)', fmt: 'int', count: true },
  { key: 'fp',      label: 'Fantasy (std)', group: 'combined', expr: 'sum(p_yds)*0.04+sum(p_td)*4-sum(p_int)*2+sum(r_yds)*0.1+sum(r_td)*6+sum(c_yds)*0.1+sum(c_td)*6', fmt: 'd1', count: true },
  { key: 'ppr',     label: 'Fantasy (PPR)', group: 'combined', expr: 'sum(p_yds)*0.04+sum(p_td)*4-sum(p_int)*2+sum(r_yds)*0.1+sum(r_td)*6+sum(c_yds)*0.1+sum(c_td)*6+sum(c_rec)', fmt: 'd1', count: true },
]
export const METRIC_BY_KEY: Record<string, MetricDef> = Object.fromEntries(METRICS.map(m => [m.key, m]))

export type StudioState = {
  rows: DimKey[]
  metrics: string[]
  perGame: boolean
  limit: number
  sort?: { key: string; dir: 'asc' | 'desc' }
}
export const STUDIO_DEFAULT: StudioState = { rows: ['player'], metrics: ['tgt', 'rec', 'rec_yds', 'ypt', 'rec_td'], perGame: false, limit: 100 }

const esc = (v: string) => v.replace(/'/g, "''")
const list = (xs: string[]) => xs.map(x => `'${esc(x)}'`).join(',')

/** The event rows: one per player-role per play, carrying the raw columns the
 * dimensions need. Same reconstruction logic as lib/playerGameSql.ts. */
function evCte(s: Slicers): string {
  const W = playsWhere(s)
  const base = `game_id, play_id, season, week, posteam team, defteam opp, down, ydstogo, score_differential sd, yardline_100 yl, qtr,
    air_yards ay, run_location rl, run_gap rg, (posteam = home_team) home, roof`
  return `ev AS (
    SELECT 'pass' ev_role, passer_player_id pid, ${base},
      1 p_att, complete_pass::int p_cmp, COALESCE(passing_yards,0) p_yds, pass_touchdown::int p_td, interception::int p_int, sack::int p_sack,
      COALESCE(air_yards,0) p_ay, first_down::int p_fd,
      0 r_car, 0 r_yds, 0 r_td, 0 r_fd, 0 r_exp,
      0 c_tgt, 0 c_rec, 0 c_yds, 0 c_td, 0 c_ay, 0 c_yac, 0 c_fd, 0 c_exp
    FROM plays WHERE pass_attempt=1 AND passer_player_id IS NOT NULL ${W}
    UNION ALL
    SELECT 'rush', rusher_player_id, ${base},
      0,0,0,0,0,0,0,0,
      1, COALESCE(rushing_yards,0), rush_touchdown::int, first_down::int, (COALESCE(rushing_yards,0)>=10)::int,
      0,0,0,0,0,0,0,0
    FROM plays WHERE rush_attempt=1 AND rusher_player_id IS NOT NULL ${W}
    UNION ALL
    SELECT 'rec', receiver_player_id, ${base},
      0,0,0,0,0,0,0,0,
      0,0,0,0,0,
      1, complete_pass::int, COALESCE(receiving_yards,0), pass_touchdown::int, COALESCE(air_yards,0), COALESCE(yards_after_catch,0), first_down::int, (COALESCE(receiving_yards,0)>=20)::int
    FROM plays WHERE pass_attempt=1 AND receiver_player_id IS NOT NULL ${W}
  )`
}

export function buildStudioSql(st: StudioState, s: Slicers): string {
  const dims = st.rows.map(k => DIM_BY_KEY[k]).filter(Boolean)
  const mets = st.metrics.map(k => METRIC_BY_KEY[k]).filter(Boolean)
  if (!mets.length) return 'SELECT 1 WHERE false'
  const dimSel = dims.map(d => `${d.expr} AS "${d.key}"`)
  const metSel = mets.map(m => {
    const e = st.perGame && m.count ? `(${m.expr})*1.0/nullif(count(DISTINCT ev.game_id),0)` : m.expr
    return `round(${e}, 2) AS "${m.key}"`
  })
  const where: string[] = []
  if (s.positions.length) where.push(`pl.position IN (${list(s.positions)})`)
  if (s.playerIds.length) where.push(`ev.pid IN (${list(s.playerIds)})`)
  // Play-type is applied in playsWhere, but the receiver/passer roles both carry pass plays;
  // when the user groups by nothing player-ish it's still fine because metrics are role-scoped.
  const groupBy = dims.length ? `GROUP BY ${dims.map((_, i) => i + 1).join(', ')}` : ''
  const sortKey = st.sort?.key && (mets.some(m => m.key === st.sort!.key) || dims.some(d => d.key === st.sort!.key)) ? st.sort.key : mets[0].key
  const sortDir = st.sort?.dir ?? 'desc'
  const orderBy = `ORDER BY "${sortKey}" ${sortDir} NULLS LAST${dims.length ? ', ' + dims.map(d => d.order ? `min(${d.order})` : `"${d.key}"`).join(', ') : ''}`
  return `WITH ${evCte(s)}
    SELECT ${[...dimSel, ...metSel].join(', ')}
    FROM ev LEFT JOIN players pl ON pl.gsis_id = ev.pid
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ${groupBy}
    ${orderBy}
    LIMIT ${Math.max(1, Math.min(1000, st.limit))}`
}

/* ---------- URL (de)serialization, kept alongside the slicer params ---------- */
export const STUDIO_PARAM_KEYS = ['r', 'm', 'pg', 'n', 'sort'] as const
export function studioToParams(st: StudioState, p: URLSearchParams = new URLSearchParams()): URLSearchParams {
  p.set('r', st.rows.join(','))
  p.set('m', st.metrics.join(','))
  if (st.perGame) p.set('pg', '1'); else p.delete('pg')
  if (st.limit !== STUDIO_DEFAULT.limit) p.set('n', String(st.limit)); else p.delete('n')
  if (st.sort) p.set('sort', `${st.sort.key}:${st.sort.dir}`); else p.delete('sort')
  return p
}
export function studioFromParams(p: URLSearchParams): StudioState {
  const rows = (p.get('r') ?? '').split(',').filter(k => DIM_BY_KEY[k]) as DimKey[]
  const metrics = (p.get('m') ?? '').split(',').filter(k => METRIC_BY_KEY[k])
  const sortRaw = p.get('sort')
  const sort = sortRaw ? { key: sortRaw.split(':')[0], dir: (sortRaw.split(':')[1] === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc' } : undefined
  return {
    rows: p.has('r') ? rows : STUDIO_DEFAULT.rows,
    metrics: p.has('m') ? metrics : STUDIO_DEFAULT.metrics,
    perGame: p.get('pg') === '1',
    limit: Number(p.get('n')) || STUDIO_DEFAULT.limit,
    sort,
  }
}

export function formatMetric(v: number | null | undefined, fmt: Fmt): string {
  if (v == null || isNaN(Number(v))) return '–'
  const n = Number(v)
  if (fmt === 'int') return Number.isInteger(n) ? n.toLocaleString() : n.toLocaleString(undefined, { maximumFractionDigits: 1 })
  if (fmt === 'pct') return `${n.toFixed(1)}%`
  if (fmt === 'd1') return n.toFixed(1)
  return n.toFixed(2)
}

/* ---------- Saved queries ("Mine") ---------- */
export type SavedQuery = { id: string; title: string; params: string; savedAt: string }
const SAVE_KEY = 'qb.studio.saved'
export function loadSaved(): SavedQuery[] {
  try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '[]') } catch { return [] }
}
export function saveQuery(q: Omit<SavedQuery, 'id' | 'savedAt'>): SavedQuery[] {
  const all = loadSaved()
  const entry: SavedQuery = { ...q, id: `${Date.now().toString(36)}`, savedAt: new Date().toISOString() }
  const next = [entry, ...all].slice(0, 100)
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  return next
}
export function deleteSaved(id: string): SavedQuery[] {
  const next = loadSaved().filter(q => q.id !== id)
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)) } catch { /* private mode */ }
  return next
}
