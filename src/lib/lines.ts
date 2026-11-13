/**
 * Lines — data layer and arithmetic for the line evaluator (/lines).
 *
 * The page asks one question: how likely is this player (or team) to clear the
 * number a sportsbook posted? Everything here serves that:
 *
 *   MARKETS / TEAM_MARKETS   what the "line type" dropdown offers, by position
 *   playerGamesSql()         one row per game for a player + the game context
 *                            (home/away, spread, total, score, result)
 *   splitsSql()              where the production came from — score state,
 *                            half, quarter, down, field zone, depth, direction
 *   halvesSql()              per-game 1H / 2H production and the halftime margin
 *   oppAllowedSql()          what every defense allows per game to the position
 *   teamGamesSql() etc.      the team-market equivalents (margin, totals, 1H, props)
 *   summarize / read / ladder  the arithmetic, all visible on the page
 *
 * Conventions: spreads are shown sportsbook-style (negative = favored) and the
 * read is always P(over). Nothing here fetches odds — the user types the line.
 */

export type Pos = 'QB' | 'RB' | 'WR' | 'TE'
export type Dist = 'normal' | 'poisson'
export type Scope = 'season' | 'career'
export type Side = 'over' | 'under'

const sq = (v: string) => `'${v.replace(/'/g, "''")}'`

/* ------------------------------------------------------------------ */
/* Markets                                                             */
/* ------------------------------------------------------------------ */
export type Usage = { attempts: number; carries: number; targets: number; receptions: number }
export type Market = {
  key: string
  label: string
  /** which positions see it, and the usage test that confirms it applies to this player */
  pos: Pos[]
  applies?: (u: Usage) => boolean
  dist: Dist
  /** expression over player_week, or null for play-by-play markets */
  pw: string | null
  /** play-by-play definition: which role column, which rows, and the measure per game */
  pbp: { role: 'pass' | 'rush' | 'rec' | 'both'; where: string; measure: string; perGame?: string } | null
  /** ladder rungs around the user's line */
  steps: number[]
  /** market used for the opponent card (what the defense allows); defaults to itself */
  oppKey?: string
  /** multiplier on the league attempts-vs-spread slope for the game-script shift (0 = none) */
  scriptK: number
  /** integer-valued? (affects formatting and pushes) */
  int: boolean
  /** what the splits count: 'attempts', 'yards', ... */
  unit: string
}
const M = (key: string, label: string, pos: Pos[], dist: Dist, pw: string | null, pbp: Market['pbp'], steps: number[], extra: Partial<Market> = {}): Market =>
  ({ key, label, pos, dist, pw, pbp, steps, scriptK: 0, int: true, unit: UNITS[key] ?? 'plays', ...extra })

const UNITS: Record<string, string> = { pass_att: 'attempts', pass_cmp: 'completions', pass_yds: 'yards', pass_td: 'TDs', int: 'INTs', pass_long: 'completions', qb_rush_yds: 'yards', pass_rush_yds: 'yards', rush_att: 'carries', rush_yds: 'yards', rush_td: 'TDs', rush_long: 'carries', tgt: 'targets', rec: 'catches', rec_yds: 'yards', rec_td: 'TDs', rec_long: 'catches', rush_rec_yds: 'yards', any_td: 'TDs' }
const PASS = (w = '') => ({ where: `pass_attempt=1 AND sack=0 ${w}` })
export const MARKETS: Market[] = [
  M('pass_att', 'Pass attempts', ['QB'], 'normal', 'attempts', { role: 'pass', ...PASS(), measure: 'count(*)' }, [-6, -4, -2, 0, 2, 4, 6], { scriptK: 1 }),
  M('pass_cmp', 'Completions', ['QB'], 'normal', 'completions', { role: 'pass', ...PASS(), measure: 'sum(complete_pass)' }, [-4, -2, -1, 0, 1, 2, 4], { scriptK: 0.65 }),
  M('pass_yds', 'Passing yards', ['QB'], 'normal', 'passing_yards', { role: 'pass', ...PASS(), measure: 'sum(COALESCE(passing_yards,0))' }, [-40, -25, -10, 0, 10, 25, 40], { scriptK: 7.5 }),
  M('pass_td', 'Passing TDs', ['QB'], 'poisson', 'passing_tds', { role: 'pass', ...PASS(), measure: 'sum(pass_touchdown)' }, [-1, 0, 1, 2]),
  M('int', 'Interceptions', ['QB'], 'poisson', 'interceptions', { role: 'pass', ...PASS(), measure: 'sum(interception)' }, [0, 1]),
  M('pass_long', 'Longest completion', ['QB'], 'normal', null, { role: 'pass', where: 'complete_pass=1', measure: 'count(*)', perGame: 'max(COALESCE(passing_yards,0))' }, [-10, -5, 0, 5, 10, 15], { oppKey: 'pass_yds' }),
  M('qb_rush_yds', 'Rushing yards', ['QB'], 'normal', 'rushing_yards', { role: 'rush', where: 'rush_attempt=1', measure: 'sum(COALESCE(rushing_yards,0))' }, [-20, -10, -5, 0, 5, 10, 20], { applies: u => u.carries >= 10 }),
  M('pass_rush_yds', 'Pass + rush yards', ['QB'], 'normal', '(passing_yards + rushing_yards)', { role: 'both', where: '(pass_attempt=1 AND sack=0) OR rush_attempt=1', measure: 'sum(COALESCE(passing_yards,0) + COALESCE(rushing_yards,0))' }, [-40, -25, -10, 0, 10, 25, 40], { oppKey: 'pass_yds', scriptK: 7.5 }),

  M('rush_att', 'Rush attempts', ['RB', 'WR', 'TE'], 'normal', 'carries', { role: 'rush', where: 'rush_attempt=1', measure: 'count(*)' }, [-4, -2, -1, 0, 1, 2, 4], { applies: u => u.carries >= 5 }),
  M('rush_yds', 'Rushing yards', ['RB', 'WR', 'TE'], 'normal', 'rushing_yards', { role: 'rush', where: 'rush_attempt=1', measure: 'sum(COALESCE(rushing_yards,0))' }, [-30, -20, -10, 0, 10, 20, 30], { applies: u => u.carries >= 5 }),
  M('rush_td', 'Rushing TDs', ['RB'], 'poisson', 'rushing_tds', { role: 'rush', where: 'rush_attempt=1', measure: 'sum(rush_touchdown)' }, [0, 1]),
  M('rush_long', 'Longest rush', ['RB', 'WR'], 'normal', null, { role: 'rush', where: 'rush_attempt=1', measure: 'count(*)', perGame: 'max(COALESCE(rushing_yards,0))' }, [-10, -5, 0, 5, 10, 15], { oppKey: 'rush_yds', applies: u => u.carries >= 5 }),

  M('tgt', 'Targets', ['RB', 'WR', 'TE'], 'normal', 'targets', { role: 'rec', where: 'pass_attempt=1', measure: 'count(*)' }, [-3, -2, -1, 0, 1, 2, 3], { applies: u => u.targets >= 5, scriptK: 0.25 }),
  M('rec', 'Receptions', ['RB', 'WR', 'TE'], 'poisson', 'receptions', { role: 'rec', where: 'pass_attempt=1', measure: 'sum(complete_pass)' }, [-2, -1, 0, 1, 2], { applies: u => u.targets >= 5, scriptK: 0.17 }),
  M('rec_yds', 'Receiving yards', ['RB', 'WR', 'TE'], 'normal', 'receiving_yards', { role: 'rec', where: 'pass_attempt=1', measure: 'sum(COALESCE(receiving_yards,0))' }, [-30, -20, -10, 0, 10, 20, 30], { applies: u => u.targets >= 5 }),
  M('rec_td', 'Receiving TDs', ['WR', 'TE'], 'poisson', 'receiving_tds', { role: 'rec', where: 'pass_attempt=1', measure: 'sum(pass_touchdown)' }, [0, 1]),
  M('rec_long', 'Longest reception', ['RB', 'WR', 'TE'], 'normal', null, { role: 'rec', where: 'complete_pass=1', measure: 'count(*)', perGame: 'max(COALESCE(receiving_yards,0))' }, [-10, -5, 0, 5, 10, 15], { oppKey: 'rec_yds', applies: u => u.targets >= 5 }),
  M('rush_rec_yds', 'Rush + rec yards', ['RB', 'WR', 'TE'], 'normal', '(rushing_yards + receiving_yards)', { role: 'both', where: 'rush_attempt=1 OR pass_attempt=1', measure: 'sum(COALESCE(rushing_yards,0) + COALESCE(receiving_yards,0))' }, [-30, -20, -10, 0, 10, 20, 30], { oppKey: 'rec_yds' }),
  M('any_td', 'Anytime TD', ['QB', 'RB', 'WR', 'TE'], 'poisson', '(rushing_tds + receiving_tds)', { role: 'both', where: 'rush_attempt=1 OR pass_attempt=1', measure: 'sum(CASE WHEN rusher_player_id = __PID__ THEN rush_touchdown ELSE 0 END) + sum(CASE WHEN receiver_player_id = __PID__ THEN pass_touchdown ELSE 0 END)' }, [0]),
]
export const marketByKey = (k: string | null | undefined) => MARKETS.find(m => m.key === k) ?? null
/** The dropdown contents for one player: position first, then actual usage this season. */
export function marketsFor(pos: Pos, usage: Usage | null): Market[] {
  return MARKETS.filter(m => m.pos.includes(pos) && (!usage || !m.applies || m.applies(usage)))
}
/** Anytime TD for a QB means a rushing TD. */
export function marketLabel(m: Market, pos: Pos) { return m.key === 'any_td' && pos === 'QB' ? 'Anytime TD (rushing)' : m.label }

export type TeamMarket = { key: string; label: string; dist: Dist; steps: number[]; kind: 'game' | 'prop'; help: string }
export const TEAM_MARKETS: TeamMarket[] = [
  { key: 'spread', label: 'Spread', dist: 'normal', steps: [-6, -3, 0, 3, 6], kind: 'game', help: 'Type the spread as your book shows it for this team (e.g. +10.5 or -3.5). The read is P(this team covers).' },
  { key: 'ml', label: 'Moneyline', dist: 'normal', steps: [0], kind: 'game', help: 'Type this team\'s moneyline (e.g. +455 or -625). The read is P(this team wins).' },
  { key: 'total', label: 'Game total', dist: 'normal', steps: [-6, -3, 0, 3, 6], kind: 'game', help: 'Both teams\' points combined.' },
  { key: 'team_total', label: 'Team total', dist: 'normal', steps: [-6, -3, 0, 3, 6], kind: 'game', help: 'This team\'s points.' },
  { key: 'h1_total', label: '1st-half total', dist: 'normal', steps: [-6, -3, 0, 3, 6], kind: 'game', help: 'Both teams\' first-half points, from the play-by-play.' },
  { key: 'h1_team_total', label: '1st-half team total', dist: 'normal', steps: [-3, 0, 3], kind: 'game', help: 'This team\'s first-half points.' },
  { key: 'sacks_made', label: 'Team sacks (defense)', dist: 'poisson', steps: [-1, 0, 1, 2], kind: 'prop', help: 'Sacks by this team\'s defense.' },
  { key: 'rush_yds', label: 'Team rushing yards', dist: 'normal', steps: [-30, -15, 0, 15, 30], kind: 'prop', help: 'This offense\'s rushing yards.' },
  { key: 'pass_yds', label: 'Team passing yards', dist: 'normal', steps: [-40, -20, 0, 20, 40], kind: 'prop', help: 'This offense\'s passing yards (net of nothing — gross, as books post it).' },
  { key: 'plays', label: 'Offensive plays', dist: 'normal', steps: [-6, -3, 0, 3, 6], kind: 'prop', help: 'Pass + run plays, penalties excluded.' },
]
export const teamMarketByKey = (k: string | null | undefined) => TEAM_MARKETS.find(m => m.key === k) ?? null

/* ------------------------------------------------------------------ */
/* Season, teams, roster                                               */
/* ------------------------------------------------------------------ */
export const seasonSql = `SELECT max(season)::int AS season FROM games WHERE home_score IS NOT NULL`
export const teamsSql = (season: number) => `SELECT DISTINCT home_team AS team FROM games WHERE season = ${season} ORDER BY 1`

export type RosterRow = { player_id: string; name: string; position: Pos; g: number; attempts: number; carries: number; targets: number; receptions: number; fp: number; headshot: string | null; jersey: number | null }
/** Skill players on a team this season with their usage totals (drives the market menu). */
export function rosterSql(team: string, season: number): string {
  return `
    SELECT pw.player_id, max(pw.player_display_name) AS name, max(pw.position) AS position, count(*)::int AS g,
      sum(pw.attempts)::int AS attempts, sum(pw.carries)::int AS carries, sum(pw.targets)::int AS targets, sum(pw.receptions)::int AS receptions,
      round(sum(pw.fantasy_points_ppr),1) AS fp, max(pl.headshot) AS headshot, max(pl.jersey_number)::int AS jersey
    FROM player_week pw LEFT JOIN players pl ON pl.gsis_id = pw.player_id
    WHERE pw.season = ${season} AND pw.season_type = 'REG' AND pw.recent_team = ${sq(team)} AND pw.position IN ('QB','RB','WR','TE')
    GROUP BY pw.player_id ORDER BY fp DESC`
}

/* ------------------------------------------------------------------ */
/* Schedule: the team's next game, sportsbook-style                     */
/* ------------------------------------------------------------------ */
export type NextGame = { game_id: string; week: number; opp: string; home: boolean; spread: number | null; total: number | null; implied: number | null; ml: number | null; opp_ml: number | null; weekday: string; gametime: string; gameday: string; roof: string | null; surface: string | null; opp_qb: string | null }
export function nextGameSql(team: string, season: number): string {
  const T = sq(team)
  return `
    WITH nw AS (SELECT min(week) AS week FROM games WHERE season = ${season} AND home_score IS NULL)
    SELECT game_id, week, CASE WHEN home_team = ${T} THEN away_team ELSE home_team END AS opp, (home_team = ${T}) AS home,
      CASE WHEN home_team = ${T} THEN -spread_line ELSE spread_line END AS spread, total_line AS total,
      CASE WHEN home_team = ${T} THEN home_moneyline ELSE away_moneyline END AS ml, CASE WHEN home_team = ${T} THEN away_moneyline ELSE home_moneyline END AS opp_ml,
      weekday, gametime, gameday::varchar AS gameday, roof, surface, CASE WHEN home_team = ${T} THEN away_qb_name ELSE home_qb_name END AS opp_qb
    FROM games WHERE season = ${season} AND week = (SELECT week FROM nw) AND (home_team = ${T} OR away_team = ${T})`
}
export function toNextGame(r: any): NextGame | null {
  if (!r) return null
  const spread = r.spread == null ? null : Number(r.spread), total = r.total == null ? null : Number(r.total)
  return { game_id: r.game_id, week: Number(r.week), opp: r.opp, home: !!r.home, spread, total, implied: spread != null && total != null ? Math.round(((total - spread) / 2) * 10) / 10 : null,
    ml: r.ml == null ? null : Number(r.ml), opp_ml: r.opp_ml == null ? null : Number(r.opp_ml), weekday: r.weekday, gametime: r.gametime, gameday: r.gameday, roof: r.roof, surface: r.surface, opp_qb: r.opp_qb }
}

/** Team-game view: every played game from each team's perspective. Spread is sportsbook-style (negative = that team favored). */
const TG = `
  tg AS (
    SELECT game_id, season, week, home_team AS team, away_team AS opp, true AS home, -spread_line AS spread, total_line AS total, home_score AS pts, away_score AS opp_pts, result AS margin, roof
    FROM games WHERE home_score IS NOT NULL AND game_type = 'REG'
    UNION ALL
    SELECT game_id, season, week, away_team, home_team, false, spread_line, total_line, away_score, home_score, -result, roof
    FROM games WHERE home_score IS NOT NULL AND game_type = 'REG')`

/* ------------------------------------------------------------------ */
/* Player games                                                        */
/* ------------------------------------------------------------------ */
export type GameRow = { game_id: string; season: number; week: number; team: string; opp: string; home: boolean; spread: number | null; total: number | null; pts: number | null; opp_pts: number | null; margin: number | null; roof: string | null; val: number }
export function playerGamesSql(pid: string, m: Market, seasons: number[]): string {
  const S = seasons.join(',') || '0'
  if (m.pw) {
    return `
      WITH ${TG}
      SELECT w.game_id, w.season, w.week, w.recent_team AS team, w.opponent_team AS opp, t.home, t.spread, t.total, t.pts, t.opp_pts, t.margin, t.roof, COALESCE(${m.pw}, 0) AS val
      FROM player_week w LEFT JOIN tg t ON t.game_id = w.game_id AND t.team = w.recent_team
      WHERE w.player_id = ${sq(pid)} AND w.season IN (${S}) AND w.season_type = 'REG'
      ORDER BY w.season, w.week`
  }
  // play-by-play market (longest play): one row per game the player appeared in
  const col = m.pbp!.role === 'rush' ? 'rusher_player_id' : m.pbp!.role === 'pass' ? 'passer_player_id' : 'receiver_player_id'
  return `
    WITH ${TG},
    g AS (SELECT game_id, max(season) AS season, max(week) AS week, max(posteam) AS team, max(defteam) AS opp, ${m.pbp!.perGame} AS val
          FROM plays WHERE ${col} = ${sq(pid)} AND season IN (${S}) AND season_type = 'REG' AND play_type IN ('pass','run') GROUP BY game_id)
    SELECT g.*, t.home, t.spread, t.total, t.pts, t.opp_pts, t.margin, t.roof FROM g LEFT JOIN tg t ON t.game_id = g.game_id AND t.team = g.team ORDER BY g.season, g.week`
}

/* ------------------------------------------------------------------ */
/* Splits — where the production came from                             */
/* ------------------------------------------------------------------ */
export type SplitRow = { grp: string; k: string; ord: number; n: number; v: number }
const measureFor = (m: Market, pid: string) => m.pbp!.measure.replace(/__PID__/g, sq(pid))
function pbpBase(pid: string, m: Market, seasons: number[]): string {
  const S = seasons.join(',') || '0', P = sq(pid), r = m.pbp!.role
  const who = r === 'pass' ? `passer_player_id = ${P}` : r === 'rush' ? `rusher_player_id = ${P}` : r === 'rec' ? `receiver_player_id = ${P}`
    : `(rusher_player_id = ${P} OR receiver_player_id = ${P} OR passer_player_id = ${P})`
  return `plays WHERE ${who} AND season IN (${S}) AND season_type = 'REG' AND play_type IN ('pass','run') AND (${m.pbp!.where})`
}
/** One result set, several groupings: grp ∈ score | half | qtr | down | zone | depth | dir. n = plays, v = the market's measure. */
export function splitsSql(pid: string, m: Market, seasons: number[]): string {
  if (!m.pbp) return 'SELECT 1 WHERE false'
  const meas = measureFor(m, pid)
  const sel = (grp: string, k: string, ord: string, extra = '') => `SELECT '${grp}' AS grp, ${k} AS k, ${ord} AS ord, count(*)::int AS n, (${meas})::double AS v FROM b ${extra} GROUP BY 2, 3`
  const parts = [
    sel('score', `CASE WHEN score_differential <= -9 THEN 'Trailing 9+' WHEN score_differential < 0 THEN 'Trailing 1–8' WHEN score_differential = 0 THEN 'Tied' WHEN score_differential <= 8 THEN 'Leading 1–8' ELSE 'Leading 9+' END`,
      `CASE WHEN score_differential <= -9 THEN 1 WHEN score_differential < 0 THEN 2 WHEN score_differential = 0 THEN 3 WHEN score_differential <= 8 THEN 4 ELSE 5 END`, 'WHERE score_differential IS NOT NULL'),
    sel('half', `CASE WHEN qtr <= 2 THEN '1st half' ELSE '2nd half' END`, `CASE WHEN qtr <= 2 THEN 1 ELSE 2 END`),
    sel('qtr', `CASE WHEN qtr >= 5 THEN 'OT' ELSE 'Q' || qtr::int::varchar END`, `LEAST(qtr, 5)::int`),
    sel('down', `down::int::varchar`, `down::int`, 'WHERE down IS NOT NULL'),
    sel('zone', `CASE WHEN yardline_100 <= 20 THEN 'Red zone' WHEN yardline_100 <= 50 THEN 'Opp half' WHEN yardline_100 <= 80 THEN 'Own 20–50' ELSE 'Backed up' END`,
      `CASE WHEN yardline_100 <= 20 THEN 4 WHEN yardline_100 <= 50 THEN 3 WHEN yardline_100 <= 80 THEN 2 ELSE 1 END`, 'WHERE yardline_100 IS NOT NULL'),
    sel('two_min', `CASE WHEN half_seconds_remaining <= 120 THEN 'Final 2:00 of a half' ELSE 'Rest of game' END`, `CASE WHEN half_seconds_remaining <= 120 THEN 1 ELSE 2 END`, 'WHERE half_seconds_remaining IS NOT NULL'),
  ]
  if (m.pbp.role === 'rec' || m.pbp.role === 'pass') parts.push(sel('depth', `CASE WHEN air_yards >= 20 THEN 'Deep (20+)' WHEN air_yards >= 10 THEN 'Intermediate (10–19)' WHEN air_yards >= 0 THEN 'Short (0–9)' ELSE 'Behind the line' END`,
    `CASE WHEN air_yards >= 20 THEN 4 WHEN air_yards >= 10 THEN 3 WHEN air_yards >= 0 THEN 2 ELSE 1 END`, 'WHERE air_yards IS NOT NULL AND pass_attempt = 1'))
  if (m.pbp.role === 'rush') parts.push(sel('dir', `COALESCE(run_location, 'unknown')`, `CASE run_location WHEN 'left' THEN 1 WHEN 'middle' THEN 2 WHEN 'right' THEN 3 ELSE 4 END`, 'WHERE rush_attempt = 1'))
  return `WITH b AS (SELECT * FROM ${pbpBase(pid, m, seasons)}) ${parts.join(' UNION ALL ')} ORDER BY grp, ord`
}
/** Per game and half: halftime margin (team perspective) and the measure in that half. Two rows per game (h1 true/false); pivot with toHalves(). */
export type HalfRow = { game_id: string; season: number; week: number; hd: number | null; h1: boolean; v: number }
export function halvesSql(pid: string, m: Market, seasons: number[]): string {
  if (!m.pbp) return 'SELECT 1 WHERE false'
  const S = seasons.join(',') || '0', P = sq(pid)
  const r = m.pbp.role
  const who = r === 'pass' ? `passer_player_id = ${P}` : r === 'rush' ? `rusher_player_id = ${P}` : r === 'rec' ? `receiver_player_id = ${P}` : `(rusher_player_id = ${P} OR receiver_player_id = ${P} OR passer_player_id = ${P})`
  return `
    WITH mine AS (SELECT game_id, max(posteam) AS team FROM plays WHERE ${who} AND season IN (${S}) AND season_type='REG' GROUP BY game_id),
    h AS (SELECT p.game_id, arg_min(CASE WHEN p.posteam = m.team THEN p.score_differential ELSE -p.score_differential END, p.play_id) FILTER (WHERE p.qtr >= 3) AS hd
          FROM plays p JOIN mine m ON m.game_id = p.game_id WHERE p.season IN (${S}) AND p.posteam IS NOT NULL AND p.score_differential IS NOT NULL GROUP BY p.game_id),
    b AS (SELECT * FROM ${pbpBase(pid, m, seasons)}),
    a AS (SELECT game_id, max(season) AS season, max(week) AS week, (qtr <= 2) AS h1, (${measureFor(m, pid)})::double AS v FROM b GROUP BY game_id, (qtr <= 2))
    SELECT a.game_id, a.season, a.week, h.hd, a.h1, a.v FROM a LEFT JOIN h USING (game_id) ORDER BY a.season, a.week, a.h1 DESC`
}
export type HalfGame = { game_id: string; season: number; week: number; hd: number | null; v1: number; v2: number }
export function toHalves(rows: HalfRow[]): HalfGame[] {
  const by = new Map<string, HalfGame>()
  for (const r of rows) {
    const g = by.get(r.game_id) ?? { game_id: r.game_id, season: Number(r.season), week: Number(r.week), hd: r.hd == null ? null : Number(r.hd), v1: 0, v2: 0 }
    if (r.h1) g.v1 += Number(r.v); else g.v2 += Number(r.v)
    by.set(r.game_id, g)
  }
  return [...by.values()].sort((a, b) => a.season - b.season || a.week - b.week)
}

/* ------------------------------------------------------------------ */
/* Opponent: what each defense allows per game to the position         */
/* ------------------------------------------------------------------ */
export type OppRow = { def: string; game_id: string; week: number; team: string; v: number; def_pts: number | null; off_pts: number | null }
export function oppAllowedSql(pos: Pos, m: Market, season: number): string {
  const base = marketByKey(m.oppKey) ?? m
  const expr = base.pw ?? 'receiving_yards'
  return `
    WITH ${TG}
    SELECT w.opponent_team AS def, w.game_id, w.week, w.recent_team AS team, sum(COALESCE(${expr},0))::double AS v, max(t.opp_pts) AS def_pts, max(t.pts) AS off_pts
    FROM player_week w LEFT JOIN tg t ON t.game_id = w.game_id AND t.team = w.recent_team
    WHERE w.season = ${season} AND w.season_type = 'REG' AND w.position = ${sq(pos)}
    GROUP BY 1, 2, 3, 4 ORDER BY 1, 3`
}
export type OppProfile = { team: string; rank: number; n: number; per_g: number; league: number; games: number; last: OppRow[]; table: { def: string; per_g: number }[] }
export function oppProfile(rows: OppRow[], opp: string): OppProfile | null {
  const by = new Map<string, OppRow[]>()
  for (const r of rows) { if (!by.has(r.def)) by.set(r.def, []); by.get(r.def)!.push(r) }
  if (!by.has(opp)) return null
  const table = [...by.entries()].map(([def, rs]) => ({ def, per_g: Math.round(10 * rs.reduce((s, r) => s + r.v, 0) / rs.length) / 10 })).sort((a, b) => b.per_g - a.per_g)
  const rank = table.findIndex(t => t.def === opp) + 1
  const mine = by.get(opp)!.sort((a, b) => a.week - b.week)
  return { team: opp, rank, n: table.length, per_g: table[rank - 1].per_g, league: Math.round(10 * table.reduce((s, t) => s + t.per_g, 0) / table.length) / 10, games: mine.length, last: mine.slice(-6).reverse(), table }
}

/* ------------------------------------------------------------------ */
/* Team markets                                                        */
/* ------------------------------------------------------------------ */
export type TeamGame = { game_id: string; season: number; week: number; opp: string; home: boolean; spread: number | null; total: number | null; pts: number; opp_pts: number; margin: number; roof: string | null; h1_for: number | null; h1_against: number | null; q: Record<number, [number, number]> }
export function teamGamesSql(team: string, seasons: number[]): string {
  return `WITH ${TG} SELECT * FROM tg WHERE team = ${sq(team)} AND season IN (${seasons.join(',') || '0'}) ORDER BY season, week`
}
/** Points by quarter for every game a team played, recovered from the play-by-play score differential: each scoring play moves the margin by exactly the points scored, and the change shows up on the next play, so it is credited to the quarter of the play that scored (lag). */
export function teamQuartersSql(team: string, seasons: number[]): string {
  const T = sq(team)
  return `
    WITH x AS (
      SELECT game_id, play_id, qtr, home_team, CASE WHEN posteam = home_team THEN score_differential ELSE -score_differential END AS hm
      FROM plays WHERE season IN (${seasons.join(',') || '0'}) AND season_type = 'REG' AND (home_team = ${T} OR away_team = ${T}) AND posteam IS NOT NULL AND score_differential IS NOT NULL),
    y AS (SELECT *, hm - lag(hm) OVER (PARTITION BY game_id ORDER BY play_id) AS d, lag(qtr) OVER (PARTITION BY game_id ORDER BY play_id) AS sq FROM x)
    SELECT game_id, COALESCE(sq, qtr)::int AS qtr,
      sum(CASE WHEN d > 0 THEN d ELSE 0 END)::int AS home_pts, sum(CASE WHEN d < 0 THEN -d ELSE 0 END)::int AS away_pts, max(home_team) AS home_team
    FROM y GROUP BY game_id, COALESCE(sq, qtr) ORDER BY game_id, qtr`
}
export type TeamPropRow = { game_id: string; season: number; week: number; sacks_made: number; sacks_allowed: number; rush_yds: number; pass_yds: number; plays: number; opp_rush_yds: number; opp_pass_yds: number; opp_plays: number }
export function teamPropsSql(team: string, seasons: number[]): string {
  const T = sq(team)
  return `
    SELECT game_id, max(season) AS season, max(week) AS week,
      count(*) FILTER (WHERE defteam = ${T} AND sack = 1)::int AS sacks_made,
      count(*) FILTER (WHERE posteam = ${T} AND sack = 1)::int AS sacks_allowed,
      COALESCE(sum(rushing_yards) FILTER (WHERE posteam = ${T} AND play_type = 'run'), 0)::int AS rush_yds,
      COALESCE(sum(passing_yards) FILTER (WHERE posteam = ${T} AND play_type = 'pass'), 0)::int AS pass_yds,
      count(*) FILTER (WHERE posteam = ${T} AND play_type IN ('pass','run'))::int AS plays,
      COALESCE(sum(rushing_yards) FILTER (WHERE defteam = ${T} AND play_type = 'run'), 0)::int AS opp_rush_yds,
      COALESCE(sum(passing_yards) FILTER (WHERE defteam = ${T} AND play_type = 'pass'), 0)::int AS opp_pass_yds,
      count(*) FILTER (WHERE defteam = ${T} AND play_type IN ('pass','run'))::int AS opp_plays
    FROM plays WHERE season IN (${seasons.join(',') || '0'}) AND season_type = 'REG' AND (home_team = ${T} OR away_team = ${T})
    GROUP BY game_id ORDER BY season, week`
}
/** Merge quarters into team games (1H points for/against + per-quarter map). */
export function mergeQuarters(games: any[], quarters: any[], team: string): TeamGame[] {
  const q = new Map<string, Record<number, [number, number]>>()
  for (const r of quarters) {
    const isHome = r.home_team === team
    const d = q.get(r.game_id) ?? {}
    d[Number(r.qtr)] = [Number(isHome ? r.home_pts : r.away_pts), Number(isHome ? r.away_pts : r.home_pts)]
    q.set(r.game_id, d)
  }
  return games.map(g => {
    const d = q.get(g.game_id) ?? {}
    const has = d[1] || d[2]
    const h1f = has ? (d[1]?.[0] ?? 0) + (d[2]?.[0] ?? 0) : null, h1a = has ? (d[1]?.[1] ?? 0) + (d[2]?.[1] ?? 0) : null
    return { ...g, season: Number(g.season), week: Number(g.week), home: !!g.home, spread: g.spread == null ? null : Number(g.spread), total: g.total == null ? null : Number(g.total),
      pts: Number(g.pts), opp_pts: Number(g.opp_pts), margin: Number(g.margin), h1_for: h1f, h1_against: h1a, q: d }
  })
}
/** The value of a team market in one game (null if not computable). */
export function teamValue(key: string, g: TeamGame, p?: TeamPropRow): number | null {
  switch (key) {
    case 'spread': case 'ml': return g.margin
    case 'total': return g.pts + g.opp_pts
    case 'team_total': return g.pts
    case 'h1_total': return g.h1_for == null || g.h1_against == null ? null : g.h1_for + g.h1_against
    case 'h1_team_total': return g.h1_for
    default: return p ? (p as any)[key] ?? null : null
  }
}

/* ------------------------------------------------------------------ */
/* Arithmetic                                                          */
/* ------------------------------------------------------------------ */
export function Phi(z: number) { // standard normal CDF via erf (Abramowitz–Stegun 7.1.26, |error| < 1.5e-7)
  const x = Math.abs(z) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * x)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)
  return 0.5 * (1 + (z >= 0 ? erf : -erf))
}
export function poissonGe(lam: number, k: number) { // P(X >= k)
  if (k <= 0) return 1
  let p = Math.exp(-lam), s = p
  for (let i = 1; i < k; i++) { p *= lam / i; s += p }
  return Math.max(0, 1 - s)
}
export function poissonPmf(lam: number, k: number) { let p = Math.exp(-lam); for (let i = 1; i <= k; i++) p *= lam / i; return p }
export const median = (xs: number[]) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
export const mean = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0
export const sd = (xs: number[]) => { if (xs.length < 2) return 0; const m = mean(xs); return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / xs.length) }
export const r1 = (x: number) => Math.round(x * 10) / 10

export type Summary = { n: number; mean: number; median: number; sd: number; min: number; max: number; over: number; under: number; push: number; over_pct: number }
export function summarize(vals: number[], line: number): Summary | null {
  if (!vals.length) return null
  const over = vals.filter(v => v > line).length, under = vals.filter(v => v < line).length
  return { n: vals.length, mean: r1(mean(vals)), median: median(vals), sd: r1(sd(vals)), min: Math.min(...vals), max: Math.max(...vals), over, under, push: vals.length - over - under, over_pct: Math.round(100 * over / vals.length) }
}

/** Implied probability of an American price. */
export const impliedProb = (o: number) => o < 0 ? (-o) / (-o + 100) : 100 / (o + 100)
/** Fair American price for a probability. */
export function fairOdds(p: number) { p = Math.min(0.98, Math.max(0.02, p)); return p >= 0.5 ? Math.round(-100 * p / (1 - p)) : Math.round(100 * (1 - p) / p) }
export const fmtOdds = (o: number | null | undefined) => o == null || isNaN(o) ? '–' : `${o > 0 ? '+' : ''}${Math.round(o)}`
/** Parse what a user types into the odds box: "-115", "+140", "140", "1.91" (decimal). */
export function parseOdds(s: string): number | null {
  const t = s.trim().replace('−', '-'); if (!t) return null
  const n = Number(t); if (isNaN(n)) return null
  if (t.includes('.') && n > 1 && n < 50) return n >= 2 ? Math.round((n - 1) * 100) : Math.round(-100 / (n - 1)) // decimal odds
  if (Math.abs(n) < 100) return n > 0 ? 100 : -100
  return Math.round(n)
}

/** League slope of starting-QB attempts on the pregame spread (2023–26, 1,904 team-games): +0.044 attempts per point of being an underdog. Small on purpose; shown, not hidden. */
export const SLOPE_ATT = 0.044

export type Component = { label: string; value: number }
export type Read = { components: Component[]; mu: number; sigma: number; dist: Dist; p_model: number; p_emp: number; p_final: number; skew: boolean; fair_line: number | null; fair_over: number; fair_under: number }
/**
 * The QueryBall read, step by step (every component is printed on the page):
 *   1. mu = 65% season average + 35% last-5 average
 *   2. × opponent factor^0.5 (what that defense allows to the position ÷ league average, capped 0.8–1.2)
 *   3. + game-script shift (league slope × market multiplier × (this week's spread − the player's average spread)); volume markets only
 *   4. P(over) from a normal (own σ, floored at 30% of mu under 6 games) or a Poisson for count markets
 *   5. read = 60% distribution + 40% empirical hit rate — 40/60 when the sample is skewed (mean and median disagree by 15%+)
 */
export function read(vals: number[], spreads: (number | null)[], line: number, dist: Dist, opts: { oppPerG?: number | null; league?: number | null; oppTeam?: string | null; nextSpread?: number | null; scriptK?: number }): Read | null {
  const n = vals.length; if (!n) return null
  const season = mean(vals), last5 = mean(vals.slice(-5)), s = sd(vals)
  let mu = 0.65 * season + 0.35 * last5
  const components: Component[] = [{ label: 'Season average', value: r1(season) }, { label: 'Last-5 average', value: r1(last5) }, { label: 'Blend (65 / 35)', value: r1(mu) }]
  if (opts.oppPerG != null && opts.league) {
    const f = Math.min(1.2, Math.max(0.8, opts.oppPerG / opts.league)); const fs = Math.sqrt(f)
    mu *= fs; components.push({ label: `Opponent factor ×${fs.toFixed(2)} (${opts.oppTeam ?? 'opp'} allows ${r1(opts.oppPerG)} vs league ${r1(opts.league)})`, value: r1(mu) })
  }
  if (opts.scriptK && opts.nextSpread != null) {
    const sp = spreads.filter((x): x is number => x != null)
    if (sp.length) {
      const avg = mean(sp), adj = SLOPE_ATT * opts.scriptK * (opts.nextSpread - avg)
      mu += adj; components.push({ label: `Game script: spread ${opts.nextSpread > 0 ? '+' : ''}${opts.nextSpread.toFixed(1)} vs usual ${avg > 0 ? '+' : ''}${avg.toFixed(1)} → ${adj >= 0 ? '+' : ''}${adj.toFixed(1)}`, value: r1(mu) })
    }
  }
  const med = median(vals)
  const skew = season > 0 && Math.abs(season - med) / Math.max(1, season) > 0.15
  let pModel: number
  if (dist === 'poisson') pModel = poissonGe(Math.max(0.01, mu), Math.ceil(line))
  else { const sig = n >= 6 ? s : Math.max(s, 0.3 * Math.abs(mu)); pModel = sig > 0 ? 1 - Phi((line - mu) / sig) : (mu > line ? 1 : 0) }
  const pEmp = vals.filter(v => v > line).length / n
  const wModel = skew ? 0.4 : 0.6
  const pFinal = wModel * pModel + (1 - wModel) * pEmp
  return { components, mu: r1(mu), sigma: r1(s), dist, p_model: Math.round(100 * pModel), p_emp: Math.round(100 * pEmp), p_final: Math.round(100 * pFinal), skew,
    fair_line: dist === 'poisson' ? null : Math.round(mu * 2) / 2, fair_over: fairOdds(pFinal), fair_under: fairOdds(1 - pFinal) }
}
export type Rung = { line: number; emp: number; model: number; final: number; over: number; under: number; isBook: boolean }
export function ladder(vals: number[], line: number, rd: Read, steps: number[], intMarket: boolean): Rung[] {
  const n = vals.length; if (!n) return []
  const sig = rd.sigma > 0 ? rd.sigma : Math.max(1, 0.3 * rd.mu)
  const seen = new Set<number>()
  return steps.map(st => {
    let L = line + st
    if (intMarket && Number.isInteger(L)) L = L + 0.5 // keep rungs on halves for integer markets
    if (seen.has(L)) return null; seen.add(L)
    const emp = vals.filter(v => v > L).length / n
    const pm = rd.dist === 'poisson' ? poissonGe(Math.max(0.01, rd.mu), Math.ceil(L)) : 1 - Phi((L - rd.mu) / sig)
    const w = rd.skew ? 0.4 : 0.6, pf = w * pm + (1 - w) * emp
    return { line: L, emp: Math.round(100 * emp), model: Math.round(100 * pm), final: Math.round(100 * pf), over: fairOdds(pf), under: fairOdds(1 - pf), isBook: st === 0 }
  }).filter((x): x is Rung => !!x).sort((a, b) => a.line - b.line)
}
/** Per-game averages by context (favored/dog, home/away, win/loss, high/low total). */
export function contextTable(games: GameRow[]): { k: string; v: number | null; g: number }[] {
  const avg = (f: (g: GameRow) => boolean) => { const xs = games.filter(f).map(g => g.val); return { v: xs.length ? r1(mean(xs)) : null, g: xs.length } }
  return [
    { k: 'Favored', ...avg(g => g.spread != null && g.spread < 0) }, { k: 'Underdog', ...avg(g => g.spread != null && g.spread > 0) }, { k: 'Dog of 7+', ...avg(g => g.spread != null && g.spread >= 7) },
    { k: 'Home', ...avg(g => g.home) }, { k: 'Away', ...avg(g => !g.home) },
    { k: 'In a win', ...avg(g => g.margin != null && g.margin > 0) }, { k: 'In a loss', ...avg(g => g.margin != null && g.margin < 0) },
    { k: 'Total ≥ 45', ...avg(g => g.total != null && g.total >= 45) }, { k: 'Total < 45', ...avg(g => g.total != null && g.total < 45) },
    { k: 'Dome / closed', ...avg(g => !!g.roof && g.roof !== 'outdoors') }, { k: 'Outdoors', ...avg(g => g.roof === 'outdoors') },
  ]
}
export const ordinal = (n: number) => `${n}${11 <= n % 100 && n % 100 <= 13 ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th'}`
export const fmtNum = (v: number | null | undefined, d = 1) => v == null || isNaN(Number(v)) ? '–' : Number.isInteger(Number(v)) ? String(v) : Number(v).toFixed(d)
export const fmtSpread = (s: number | null | undefined) => s == null ? '–' : s === 0 ? 'PK' : `${s > 0 ? '+' : ''}${Number(s).toFixed(1).replace(/\.0$/, '')}`

/* ------------------------------------------------------------------ */
/* My Lines — saved evaluations, graded from the data after the game   */
/* ------------------------------------------------------------------ */
export type SavedLine = {
  id: string; savedAt: string; season: number; week: number; team: string; opp: string | null
  pid: string | null; name: string; pos: Pos | null; market: string; marketLabel: string
  line: number; odds: number | null; side: Side; read: number; url: string
}
const LS_KEY = 'qb.lines.saved'
export function loadSaved(): SavedLine[] { try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] } }
export function storeSaved(items: SavedLine[]) { try { localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 200))) } catch { /* private mode */ } }
/** One query that returns the actual result for every saved line we can grade (player box-score markets + team game markets). */
export function gradeSql(items: SavedLine[]): string {
  const parts: string[] = []
  for (const it of items) {
    const m = marketByKey(it.market)
    if (it.pid && m?.pw) parts.push(`SELECT ${sq(it.id)} AS id, COALESCE(${m.pw}, 0)::double AS val FROM player_week WHERE player_id = ${sq(it.pid)} AND season = ${it.season} AND week = ${it.week} AND season_type = 'REG'`)
    else if (!it.pid && ['spread', 'ml', 'total', 'team_total'].includes(it.market)) {
      const T = sq(it.team)
      const v = it.market === 'total' ? 'home_score + away_score' : it.market === 'team_total' ? `CASE WHEN home_team = ${T} THEN home_score ELSE away_score END` : `CASE WHEN home_team = ${T} THEN result ELSE -result END`
      parts.push(`SELECT ${sq(it.id)} AS id, (${v})::double AS val FROM games WHERE season = ${it.season} AND week = ${it.week} AND home_score IS NOT NULL AND (home_team = ${T} OR away_team = ${T})`)
    }
  }
  return parts.length ? parts.join(' UNION ALL ') : 'SELECT 1 WHERE false'
}
export function gradeLine(it: SavedLine, val: number | null | undefined): 'pending' | 'hit' | 'miss' | 'push' {
  if (val == null) return 'pending'
  // spread: the line is the team's number (+10.5 means they can lose by 10); cover = margin + line > 0. moneyline: win = margin > 0.
  if (it.market === 'spread') { const c = val + it.line; return c > 0 ? 'hit' : c < 0 ? 'miss' : 'push' }
  if (it.market === 'ml') return val > 0 ? 'hit' : val < 0 ? 'miss' : 'push'
  if (val === it.line) return 'push'
  const over = val > it.line
  return (it.side === 'over') === over ? 'hit' : 'miss'
}

export const TEAM_NAMES: Record<string, string> = {
  ARI: 'Cardinals', ATL: 'Falcons', BAL: 'Ravens', BUF: 'Bills', CAR: 'Panthers', CHI: 'Bears', CIN: 'Bengals', CLE: 'Browns', DAL: 'Cowboys', DEN: 'Broncos', DET: 'Lions', GB: 'Packers',
  HOU: 'Texans', IND: 'Colts', JAX: 'Jaguars', KC: 'Chiefs', LAC: 'Chargers', LA: 'Rams', LAR: 'Rams', LV: 'Raiders', MIA: 'Dolphins', MIN: 'Vikings', NE: 'Patriots', NO: 'Saints', NYG: 'Giants',
  NYJ: 'Jets', PHI: 'Eagles', PIT: 'Steelers', SEA: 'Seahawks', SF: '49ers', TB: 'Buccaneers', TEN: 'Titans', WAS: 'Commanders',
}
export const teamName = (t: string | null | undefined) => (t && TEAM_NAMES[t]) || t || '–'
