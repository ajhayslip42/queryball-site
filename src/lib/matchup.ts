/**
 * Matchup — data layer for the fantasy matchup comparison page.
 *
 * Three queries do all the work:
 *   nextGamesSql()        every team's next unplayed game (schedule + Vegas line)
 *   playerWeeksSql(ids)   one row per player per game with every card metric,
 *                         plus the team totals needed for shares and snap %
 *   defenseSql(pos)       every defense's season and last-3 profile vs. a position
 * Windows (season / last week / last 3) are summed in JS from the weekly rows,
 * so changing the window never re-queries. Fantasy points follow lib/scoring.
 */
import { getScoring, type Scoring } from './scoring'
import { fantasyPoints } from './scoring'

export type Pos = 'QB' | 'RB' | 'WR' | 'TE'
export type PosSel = Pos | 'FLEX'
export type Win = 'season' | 'last' | 'last3'
export const WIN_LABEL: Record<Win, string> = { season: 'Season', last: 'Last week', last3: 'Last 3' }

const sq = (v: string) => `'${v.replace(/'/g, "''")}'`

/* ------------------------------------------------------------------ */
/* Schedule                                                            */
/* ------------------------------------------------------------------ */
export type NextGame = {
  team: string; opp: string; home: boolean; week: number; gameday: string; weekday: string; gametime: string
  spread: number | null; total: number | null; implied: number | null; roof: string | null; surface: string | null; oppQb: string | null
}
/** One row per team for the next unplayed week of the latest season in `games`. */
export function nextGamesSql(season: number): string {
  return `
    WITH nw AS (SELECT min(week) AS week FROM games WHERE season = ${season} AND home_score IS NULL),
    g AS (SELECT * FROM games WHERE season = ${season} AND week = (SELECT week FROM nw))
    SELECT home_team AS team, away_team AS opp, true AS home, week, gameday::varchar AS gameday, weekday, gametime,
      spread_line AS spread, total_line AS total, roof, surface, away_qb_name AS opp_qb FROM g
    UNION ALL
    SELECT away_team, home_team, false, week, gameday::varchar, weekday, gametime,
      -spread_line, total_line, roof, surface, home_qb_name FROM g`
}
export function toNextGame(r: any): NextGame {
  const spread = r.spread == null ? null : Number(r.spread)
  const total = r.total == null ? null : Number(r.total)
  return {
    team: r.team, opp: r.opp, home: !!r.home, week: Number(r.week), gameday: r.gameday, weekday: r.weekday, gametime: r.gametime,
    spread, total, implied: spread != null && total != null ? Math.round(((total + spread) / 2) * 10) / 10 : null,
    roof: r.roof, surface: r.surface, oppQb: r.opp_qb,
  }
}
/** The season the schedule is in (max season with any game). */
export const seasonSql = `SELECT max(season)::int AS season FROM games`

/* ------------------------------------------------------------------ */
/* Player weeks                                                        */
/* ------------------------------------------------------------------ */
export type PlayerWeek = {
  player_id: string; week: number; opp: string; team: string
  snaps: number | null; snap_pct: number | null
  // passing
  db: number; att: number; cmp: number; pyds: number; ptd: number; intc: number; sacks: number; hits: number; pay: number; deep_att: number
  // rushing
  car: number; ryds: number; rtd: number; rz_car: number; gl_car: number; exp10: number; stuffed: number
  // receiving
  tgt: number; rec: number; yds: number; td: number; ay: number; yac: number; rz_tgt: number; ez_tgt: number; deep_tgt: number; fd: number
  // team totals (for shares)
  tm_att: number; tm_ay: number; tm_car: number
  fum: number
}
export function playerWeeksSql(ids: string[], season: number): string {
  if (!ids.length) return 'SELECT 1 WHERE false'
  const L = ids.map(sq).join(',')
  return `
    WITH base AS (SELECT * FROM plays WHERE season = ${season} AND season_type = 'REG'),
    ev AS (
      SELECT passer_player_id pid, week, posteam team, defteam opp,
        1 db, pass_attempt att, complete_pass cmp, COALESCE(passing_yards,0) pyds, pass_touchdown ptd, interception intc, sack sacks, qb_hit hits,
        CASE WHEN pass_attempt=1 THEN COALESCE(air_yards,0) ELSE 0 END pay, CASE WHEN pass_attempt=1 AND air_yards >= 16 THEN 1 ELSE 0 END deep_att,
        0 car, 0 ryds, 0 rtd, 0 rz_car, 0 gl_car, 0 exp10, 0 stuffed,
        0 tgt, 0 rec, 0 yds, 0 td, 0 ay, 0 yac, 0 rz_tgt, 0 ez_tgt, 0 deep_tgt, 0 fd, fumble_lost fum
      FROM base WHERE (pass_attempt=1 OR sack=1) AND passer_player_id IN (${L})
      UNION ALL
      SELECT rusher_player_id, week, posteam, defteam,
        0,0,0,0,0,0,0,0,0,0,
        1, COALESCE(rushing_yards,0), rush_touchdown, (yardline_100<=20)::int, (yardline_100<=5)::int, (COALESCE(rushing_yards,0)>=10)::int, (COALESCE(rushing_yards,0)<=0)::int,
        0,0,0,0,0,0,0,0,0,0, fumble_lost
      FROM base WHERE rush_attempt=1 AND rusher_player_id IN (${L})
      UNION ALL
      SELECT receiver_player_id, week, posteam, defteam,
        0,0,0,0,0,0,0,0,0,0,
        0,0,0,0,0,0,0,
        1, complete_pass, COALESCE(receiving_yards,0), pass_touchdown, COALESCE(air_yards,0), COALESCE(yards_after_catch,0),
        (yardline_100<=20)::int, (air_yards >= yardline_100)::int, (air_yards>=16)::int, first_down, CASE WHEN complete_pass=1 THEN fumble_lost ELSE 0 END
      FROM base WHERE pass_attempt=1 AND receiver_player_id IN (${L})
    ),
    agg AS (
      SELECT pid player_id, week, max(team) team, max(opp) opp,
        sum(db) db, sum(att) att, sum(cmp) cmp, sum(pyds) pyds, sum(ptd) ptd, sum(intc) intc, sum(sacks) sacks, sum(hits) hits, sum(pay) pay, sum(deep_att) deep_att,
        sum(car) car, sum(ryds) ryds, sum(rtd) rtd, sum(rz_car) rz_car, sum(gl_car) gl_car, sum(exp10) exp10, sum(stuffed) stuffed,
        sum(tgt) tgt, sum(rec) rec, sum(yds) yds, sum(td) td, sum(ay) ay, sum(yac) yac, sum(rz_tgt) rz_tgt, sum(ez_tgt) ez_tgt, sum(deep_tgt) deep_tgt, sum(fd) fd, sum(fum) fum
      FROM ev GROUP BY pid, week
    ),
    tm AS (
      SELECT posteam team, week, sum(pass_attempt) tm_att, sum(CASE WHEN pass_attempt=1 THEN COALESCE(air_yards,0) ELSE 0 END) tm_ay, sum(rush_attempt) tm_car
      FROM base WHERE posteam IS NOT NULL GROUP BY posteam, week
    )
    SELECT a.*, tm.tm_att, tm.tm_ay, tm.tm_car,
      sn.offense_snaps AS snaps, round(sn.offense_pct * 100, 0) AS snap_pct
    FROM agg a
    LEFT JOIN tm ON tm.team = a.team AND tm.week = a.week
    LEFT JOIN players pl ON pl.gsis_id = a.player_id
    LEFT JOIN snaps sn ON sn.season = ${season} AND sn.week = a.week AND sn.team = a.team AND sn.player = pl.display_name
    ORDER BY a.player_id, a.week`
}

/** Sum a set of weekly rows into one window. Rates are recomputed from sums. */
export type WindowStats = ReturnType<typeof summarize>
export function summarize(rows: PlayerWeek[], pos: Pos, scoring: Scoring = getScoring()) {
  const n = (k: keyof PlayerWeek) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0)
  const games = rows.length
  const snapRows = rows.filter(r => r.snap_pct != null)
  const div = (a: number, b: number, d = 1) => (b ? Math.round((a / b) * 10 ** d) / 10 ** d : null)
  const fp = rows.reduce((s, r) => s + fantasyPoints({
    passing_yards: r.pyds, passing_tds: r.ptd, interceptions: r.intc, rushing_yards: r.ryds, rushing_tds: r.rtd,
    receptions: r.rec, receiving_yards: r.yds, receiving_tds: r.td, fumbles_lost: r.fum,
  }, scoring, pos), 0)
  return {
    games,
    snap_pct: snapRows.length ? Math.round(snapRows.reduce((s, r) => s + Number(r.snap_pct), 0) / snapRows.length) : null,
    snaps: snapRows.length ? Math.round(snapRows.reduce((s, r) => s + Number(r.snaps), 0) / snapRows.length) : null,
    fp: Math.round(fp * 10) / 10, fp_g: div(fp, games),
    // passing
    db: n('db'), att: n('att'), cmp: n('cmp'), cmp_pct: div(100 * n('cmp'), n('att')), pyds: n('pyds'), ypa: div(n('pyds'), n('att'), 2), ptd: n('ptd'), intc: n('intc'),
    sacks: n('sacks'), pressure_pct: div(100 * n('hits'), n('db')), adot_p: div(n('pay'), n('att')), deep_att: n('deep_att'),
    // rushing
    car: n('car'), ryds: n('ryds'), ypc: div(n('ryds'), n('car'), 2), rtd: n('rtd'), car_share: div(100 * n('car'), n('tm_car')),
    rz_car: n('rz_car'), gl_car: n('gl_car'), exp10: n('exp10'), stuff_pct: div(100 * n('stuffed'), n('car')),
    // receiving
    tgt: n('tgt'), tgt_share: div(100 * n('tgt'), n('tm_att')), ay_share: div(100 * n('ay'), n('tm_ay')), rec: n('rec'), yds: n('yds'),
    ypt: div(n('yds'), n('tgt'), 2), adot: div(n('ay'), n('tgt')), yac_rec: div(n('yac'), n('rec')), catch_pct: div(100 * n('rec'), n('tgt')),
    rz_tgt: n('rz_tgt'), ez_tgt: n('ez_tgt'), deep_tgt: n('deep_tgt'), td: n('td'), fd: n('fd'),
    // combined
    opps: n('car') + n('tgt'), touches: n('car') + n('rec'), scrim: n('ryds') + n('yds'), tot_td: n('rtd') + n('td'), rz_opps: n('rz_car') + n('rz_tgt'),
  }
}
export function pickWindow(rows: PlayerWeek[], win: Win): PlayerWeek[] {
  const sorted = [...rows].sort((a, b) => a.week - b.week)
  if (win === 'season') return sorted
  if (win === 'last') return sorted.slice(-1)
  return sorted.slice(-3)
}

/* ------------------------------------------------------------------ */
/* Metric rows per position                                            */
/* ------------------------------------------------------------------ */
export type Fmt = 'int' | 'd1' | 'd2' | 'pct'
export type MetricRow = { key: keyof WindowStats; label: string; fmt: Fmt; lowerBetter?: boolean; hint?: string }
const P = (key: keyof WindowStats, label: string, fmt: Fmt, extra: Partial<MetricRow> = {}): MetricRow => ({ key, label, fmt, ...extra })

export const CARD_ROWS: Record<Pos | 'FLEX', MetricRow[]> = {
  QB: [P('snap_pct', 'Snap %', 'pct'), P('db', 'Dropbacks', 'int'), P('att', 'Attempts', 'int'), P('cmp_pct', 'Comp %', 'pct'), P('pyds', 'Pass yds', 'int'), P('ypa', 'Yds / att', 'd2'),
       P('ptd', 'Pass TD', 'int'), P('intc', 'INT', 'int', { lowerBetter: true }), P('sacks', 'Sacks taken', 'int', { lowerBetter: true }), P('pressure_pct', 'Pressure rate faced', 'pct', { lowerBetter: true }),
       P('adot_p', 'aDOT', 'd1'), P('deep_att', 'Deep attempts (16+)', 'int'), P('car', 'Rush att', 'int'), P('ryds', 'Rush yds', 'int'), P('rtd', 'Rush TD', 'int'), P('fp_g', 'Fantasy pts / g', 'd1')],
  RB: [P('snap_pct', 'Snap %', 'pct'), P('car', 'Carries', 'int'), P('car_share', 'Carry share', 'pct'), P('ryds', 'Rush yds', 'int'), P('ypc', 'Yds / carry', 'd2'), P('rtd', 'Rush TD', 'int'),
       P('rz_car', 'Red-zone carries', 'int'), P('gl_car', 'Goal-line carries (≤5)', 'int'), P('exp10', 'Runs of 10+', 'int'), P('stuff_pct', 'Stuffed %', 'pct', { lowerBetter: true }),
       P('tgt', 'Targets', 'int'), P('rec', 'Receptions', 'int'), P('yds', 'Rec yds', 'int'), P('opps', 'Opportunities', 'int'), P('fp_g', 'Fantasy pts / g', 'd1')],
  WR: [P('snap_pct', 'Snap %', 'pct'), P('tgt', 'Targets', 'int'), P('tgt_share', 'Target share', 'pct'), P('ay_share', 'Air-yards share', 'pct'), P('rec', 'Receptions', 'int'), P('yds', 'Rec yds', 'int'),
       P('ypt', 'Yds / target', 'd2'), P('adot', 'aDOT', 'd1'), P('yac_rec', 'YAC / rec', 'd1'), P('catch_pct', 'Catch %', 'pct'), P('rz_tgt', 'Red-zone targets', 'int'), P('ez_tgt', 'End-zone targets', 'int'),
       P('deep_tgt', 'Deep targets (16+)', 'int'), P('td', 'TD', 'int'), P('fp_g', 'Fantasy pts / g', 'd1')],
  TE: [], // filled below (same as WR)
  FLEX: [P('snap_pct', 'Snap %', 'pct'), P('opps', 'Opportunities (tgt + car)', 'int'), P('touches', 'Touches', 'int'), P('scrim', 'Scrimmage yds', 'int'), P('tot_td', 'TD', 'int'),
         P('rz_opps', 'Red-zone opportunities', 'int'), P('fp_g', 'Fantasy pts / g', 'd1')],
}
CARD_ROWS.TE = CARD_ROWS.WR

/* ------------------------------------------------------------------ */
/* Defense profiles                                                    */
/* ------------------------------------------------------------------ */
export type DefMetric = { key: string; label: string; higherIsSofter: boolean; fmt: Fmt }
const D = (key: string, label: string, fmt: Fmt, higherIsSofter = true): DefMetric => ({ key, label, fmt, higherIsSofter })
export const DEF_METRICS: Record<Pos, DefMetric[]> = {
  WR: [D('p_tgt_g', 'Targets to WRs / g', 'd1'), D('p_yds_g', 'Rec yds to WRs / g', 'd1'), D('p_fp_g', 'Fantasy pts to WRs / g', 'd1'), D('p_ypt', 'Yds / target to WRs', 'd2'), D('p_td', 'TD to WRs', 'int'),
       D('p_yac', 'YAC / rec to WRs', 'd1'), D('pass_yds_g', 'Pass yds allowed / g', 'd1'), D('deep_cmp_pct', 'Deep (16+) comp % allowed', 'pct'), D('deep_yds_g', 'Deep yds allowed / g', 'd1'), D('expl_pct', 'Explosive pass % allowed', 'pct'),
       D('pressure_pct', 'Pressure rate', 'pct', false), D('sack_pct', 'Sack rate', 'pct', false), D('pass_rate', 'Pass rate faced', 'pct'), D('plays_g', 'Plays faced / g (pace)', 'd1'), D('rz_td_pct', 'Red-zone TD % allowed', 'pct')],
  TE: [D('p_tgt_g', 'Targets to TEs / g', 'd1'), D('p_yds_g', 'Rec yds to TEs / g', 'd1'), D('p_fp_g', 'Fantasy pts to TEs / g', 'd1'), D('p_ypt', 'Yds / target to TEs', 'd2'), D('p_td', 'TD to TEs', 'int'),
       D('p_yac', 'YAC / rec to TEs', 'd1'), D('pass_yds_g', 'Pass yds allowed / g', 'd1'), D('deep_cmp_pct', 'Deep (16+) comp % allowed', 'pct'), D('expl_pct', 'Explosive pass % allowed', 'pct'),
       D('pressure_pct', 'Pressure rate', 'pct', false), D('sack_pct', 'Sack rate', 'pct', false), D('pass_rate', 'Pass rate faced', 'pct'), D('plays_g', 'Plays faced / g (pace)', 'd1'), D('rz_td_pct', 'Red-zone TD % allowed', 'pct')],
  RB: [D('r_car_g', 'RB carries faced / g', 'd1'), D('r_yds_g', 'Rush yds to RBs / g', 'd1'), D('r_ypc', 'YPC allowed to RBs', 'd2'), D('r_td', 'Rush TD to RBs', 'int'), D('stuff_pct', 'Stuff rate (≤0 yds)', 'pct', false),
       D('exp_pct', 'Runs of 10+ % allowed', 'pct'), D('gl_td_pct', 'Goal-line rush TD % allowed', 'pct'), D('p_tgt_g', 'Targets to RBs / g', 'd1'), D('p_yds_g', 'Rec yds to RBs / g', 'd1'), D('r_fp_g', 'Fantasy pts to RBs / g', 'd1'),
       D('plays_g', 'Plays faced / g (pace)', 'd1'), D('rz_td_pct', 'Red-zone TD % allowed', 'pct')],
  QB: [D('pass_yds_g', 'Pass yds allowed / g', 'd1'), D('cmp_pct', 'Comp % allowed', 'pct'), D('ptd', 'Pass TD allowed', 'int'), D('intc', 'INT', 'int', false), D('sack_pct', 'Sack rate', 'pct', false), D('pressure_pct', 'Pressure rate', 'pct', false),
       D('deep_cmp_pct', 'Deep (16+) comp % allowed', 'pct'), D('expl_pct', 'Explosive pass % allowed', 'pct'), D('qb_fp_g', 'Fantasy pts to QBs / g', 'd1'), D('qb_ryds_g', 'Rush yds to QBs / g', 'd1'),
       D('pass_rate', 'Pass rate faced', 'pct'), D('plays_g', 'Plays faced / g (pace)', 'd1'), D('rz_td_pct', 'Red-zone TD % allowed', 'pct')],
}

/** Every defense's profile vs. `pos`, for the whole season and for the last 3 weeks (two result sets, same shape). */
export function defenseSql(pos: Pos, season: number, lastN?: number): string {
  const sc = getScoring()
  const W = lastN ? `AND week > (SELECT max(week) FROM plays WHERE season = ${season} AND season_type='REG') - ${lastN}` : ''
  const base = `plays WHERE season = ${season} AND season_type = 'REG' ${W}`
  const recPts = sc.rec + (pos === 'TE' ? sc.tePrem : 0)
  return `
    WITH g AS (SELECT defteam, count(DISTINCT game_id) gms FROM ${base} AND defteam IS NOT NULL GROUP BY 1),
    pas AS (
      SELECT defteam, count(*) db, sum(qb_hit) hits, sum(sack) sacks, sum(pass_attempt) att, sum(complete_pass) cmp, sum(COALESCE(passing_yards,0)) pyds, sum(pass_touchdown) ptd, sum(interception) intc,
        count(*) FILTER(WHERE pass_attempt=1 AND air_yards>=16) deep_att, sum(complete_pass) FILTER(WHERE air_yards>=16) deep_cmp, sum(COALESCE(passing_yards,0)) FILTER(WHERE air_yards>=16) deep_yds,
        count(*) FILTER(WHERE pass_attempt=1 AND passing_yards>=20) expl
      FROM ${base} AND (pass_attempt=1 OR sack=1) GROUP BY 1),
    tot AS (
      SELECT defteam, count(*) plays, sum(pass_attempt) patt, sum(rush_attempt) ratt,
        count(*) FILTER(WHERE yardline_100<=20) rz_plays, sum(touchdown) FILTER(WHERE yardline_100<=20) rz_td
      FROM ${base} AND (pass_attempt=1 OR rush_attempt=1) GROUP BY 1),
    rec AS (
      SELECT p.defteam, count(*) tgt, sum(p.complete_pass) rec, sum(COALESCE(p.receiving_yards,0)) yds, sum(p.pass_touchdown) td, sum(COALESCE(p.yards_after_catch,0)) yac
      FROM ${base.replace('plays WHERE', 'plays p WHERE')} AND p.pass_attempt=1 AND p.receiver_player_id IN (SELECT gsis_id FROM players WHERE position = '${pos === 'QB' ? 'WR' : pos}') GROUP BY 1),
    ru AS (
      SELECT p.defteam, count(*) car, sum(COALESCE(p.rushing_yards,0)) yds, sum(p.rush_touchdown) td,
        count(*) FILTER(WHERE p.rushing_yards<=0) stuffed, count(*) FILTER(WHERE p.rushing_yards>=10) exp10,
        count(*) FILTER(WHERE p.yardline_100<=5) gl_car, sum(p.rush_touchdown) FILTER(WHERE p.yardline_100<=5) gl_td
      FROM ${base.replace('plays WHERE', 'plays p WHERE')} AND p.rush_attempt=1 AND p.rusher_player_id IN (SELECT gsis_id FROM players WHERE position = '${pos === 'RB' ? 'RB' : 'QB'}') GROUP BY 1)
    SELECT g.defteam, g.gms,
      round(rec.tgt*1.0/g.gms,1) p_tgt_g, round(rec.yds*1.0/g.gms,1) p_yds_g, round(rec.yds*1.0/nullif(rec.tgt,0),2) p_ypt, rec.td p_td, round(rec.yac*1.0/nullif(rec.rec,0),1) p_yac,
      round((rec.yds*${1 / sc.rushRecYdPt} + rec.td*6 + rec.rec*${recPts})*1.0/g.gms,1) p_fp_g,
      round(pas.pyds*1.0/g.gms,1) pass_yds_g, round(pas.cmp*100.0/nullif(pas.att,0),1) cmp_pct, pas.ptd ptd, pas.intc intc,
      round(pas.hits*100.0/pas.db,1) pressure_pct, round(pas.sacks*100.0/pas.db,1) sack_pct,
      round(pas.deep_cmp*100.0/nullif(pas.deep_att,0),1) deep_cmp_pct, round(pas.deep_yds*1.0/g.gms,1) deep_yds_g, round(pas.expl*100.0/nullif(pas.att,0),1) expl_pct,
      round(tot.patt*100.0/nullif(tot.patt+tot.ratt,0),1) pass_rate, round(tot.plays*1.0/g.gms,1) plays_g, round(tot.rz_td*100.0/nullif(tot.rz_plays,0),1) rz_td_pct,
      round(ru.car*1.0/g.gms,1) r_car_g, round(ru.yds*1.0/g.gms,1) r_yds_g, round(ru.yds*1.0/nullif(ru.car,0),2) r_ypc, ru.td r_td,
      round(ru.stuffed*100.0/nullif(ru.car,0),1) stuff_pct, round(ru.exp10*100.0/nullif(ru.car,0),1) exp_pct, round(ru.gl_td*100.0/nullif(ru.gl_car,0),1) gl_td_pct,
      round((ru.yds*${1 / sc.rushRecYdPt} + ru.td*6 + COALESCE(rec.yds,0)*${1 / sc.rushRecYdPt} + COALESCE(rec.td,0)*6 + COALESCE(rec.rec,0)*${sc.rec})*1.0/g.gms,1) r_fp_g,
      round((pas.pyds*${1 / sc.passYdPt} + pas.ptd*${sc.passTd} + pas.intc*${sc.int} + COALESCE(ru.yds,0)*${1 / sc.rushRecYdPt} + COALESCE(ru.td,0)*6)*1.0/g.gms,1) qb_fp_g,
      round(COALESCE(ru.yds,0)*1.0/g.gms,1) qb_ryds_g
    FROM g LEFT JOIN pas USING (defteam) LEFT JOIN tot USING (defteam) LEFT JOIN rec USING (defteam) LEFT JOIN ru USING (defteam)`
}

export type DefRead = DefMetric & { season: number | null; last3: number | null; rank: number; n: number; verdict: 'soft' | 'mid' | 'tough' }
export function defenseReads(pos: Pos, team: string, season: any[], last3: any[]): { reads: DefRead[]; verdict: 'Favorable' | 'Neutral' | 'Difficult'; gms: number } | null {
  const row = season.find(r => r.defteam === team); if (!row) return null
  const r3 = last3.find(r => r.defteam === team) ?? {}
  const reads = DEF_METRICS[pos].map(m => {
    const vals = season.map(r => Number(r[m.key] ?? 0)).sort((a, b) => (m.higherIsSofter ? b - a : a - b))
    const v = Number(row[m.key] ?? 0)
    const rank = vals.indexOf(v) + 1
    return { ...m, season: row[m.key] == null ? null : Number(row[m.key]), last3: r3[m.key] == null ? null : Number(r3[m.key]), rank, n: vals.length,
      verdict: (rank <= 8 ? 'soft' : rank >= vals.length - 7 ? 'tough' : 'mid') as DefRead['verdict'] }
  })
  const soft = reads.filter(r => r.verdict === 'soft').length, tough = reads.filter(r => r.verdict === 'tough').length
  const verdict = soft > tough + 1 ? 'Favorable' : tough > soft + 1 ? 'Difficult' : 'Neutral'
  return { reads, verdict, gms: Number(row.gms) }
}

/* ------------------------------------------------------------------ */
/* Defaults: top three at the position (by fantasy) among teams playing */
/* ------------------------------------------------------------------ */
export function defaultPlayersSql(pos: PosSel, season: number): string {
  const posList = pos === 'FLEX' ? `('RB','WR','TE')` : `('${pos}')`
  return `
    WITH nw AS (SELECT min(week) AS week FROM games WHERE season = ${season} AND home_score IS NULL),
    playing AS (SELECT home_team t FROM games WHERE season = ${season} AND week = (SELECT week FROM nw) UNION SELECT away_team FROM games WHERE season = ${season} AND week = (SELECT week FROM nw)),
    latest AS (SELECT player_id, recent_team, position, player_display_name, row_number() OVER (PARTITION BY player_id ORDER BY week DESC) rn FROM player_week WHERE season = ${season})
    SELECT pw.player_id, l.player_display_name name, l.position, l.recent_team team, sum(pw.fantasy_points_ppr) fp
    FROM player_week pw JOIN latest l ON l.player_id = pw.player_id AND l.rn = 1
    WHERE pw.season = ${season} AND l.position IN ${posList} AND l.recent_team IN (SELECT t FROM playing)
    GROUP BY 1,2,3,4 ORDER BY fp DESC LIMIT ${pos === 'FLEX' ? 3 : 3}`
}

export function fmtVal(v: number | null | undefined, fmt: Fmt): string {
  if (v == null || isNaN(Number(v))) return '–'
  const n = Number(v)
  if (fmt === 'int') return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1)
  if (fmt === 'pct') return `${n.toFixed(n >= 10 ? 0 : 1)}%`
  if (fmt === 'd1') return n.toFixed(1)
  return n.toFixed(2)
}
export const ordinal = (n: number) => `${n}${11 <= n % 100 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
