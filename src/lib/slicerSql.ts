/**
 * Slicer → SQL.
 *
 * Turns the active Slicers into SQL WHERE fragments for two targets:
 *   - playerWeekWhere(s)  → weekly player-stats table
 *   - playsWhere(s)       → play-by-play (full situational set)
 * Each returns a string beginning with " AND ..." (or '').
 */

import type { Slicers, DistanceBucket, ScoreState, FieldZone, PassDepth, PassDir, RunDir, ThreshKey } from './slicers'
import { SCORE_LABELS, DISTANCE_LABELS, DEPTH_LABELS, PASSDIR_LABELS, RUNDIR_LABELS, ZONE_LABELS, THRESH_LABELS } from './slicers'

const list = (xs: (string | number)[]) =>
  xs.map(x => (typeof x === 'number' ? x : `'${String(x).replace(/'/g, "''")}'`)).join(',')

// nflverse spells the Rams "LA" in every table; the site's team list (and the
// URL) uses "LAR". Expand so either spelling matches. Add future aliases here.
export const TEAM_ALIASES: Record<string, string[]> = { LAR: ['LAR', 'LA'], LA: ['LA', 'LAR'] }
export const teamList = (xs: string[]) => list(Array.from(new Set(xs.flatMap(t => TEAM_ALIASES[t] ?? [t]))))

function seasonType(s: Slicers): string {
  if (s.seasonType === 'regular') return ` AND season_type = 'REG'`
  if (s.seasonType === 'postseason') return ` AND season_type = 'POST'`
  return ''
}
function common(s: Slicers): string {
  let w = ''
  if (s.seasons.length) w += ` AND season IN (${list(s.seasons)})`
  if (s.weeks.length) w += ` AND week IN (${list(s.weeks)})`
  w += seasonType(s)
  return w
}

export function playerWeekWhere(s: Slicers): string {
  let w = common(s)
  if (s.positions.length) w += ` AND position IN (${list(s.positions)})`
  if (s.teams.length) w += ` AND recent_team IN (${teamList(s.teams)})`
  if (s.opponents.length) w += ` AND opponent_team IN (${teamList(s.opponents)})`
  if (s.playerIds.length) w += ` AND player_id IN (${list(s.playerIds)})`
  // Home/away requires a games-table lookup (player_week has no flag).
  if (s.homeAway === 'home') w += ` AND (season, week, recent_team) IN (SELECT season, week, home_team FROM games)`
  else if (s.homeAway === 'away') w += ` AND (season, week, recent_team) IN (SELECT season, week, away_team FROM games)`
  return w
}

const DIST: Record<DistanceBucket, string> = {
  d1: 'ydstogo = 1',
  d2to3: 'ydstogo BETWEEN 2 AND 3',
  d4to6: 'ydstogo BETWEEN 4 AND 6',
  d7to9: 'ydstogo BETWEEN 7 AND 9',
  d10: 'ydstogo = 10',
  d11plus: 'ydstogo >= 11',
}
const SCORE: Record<ScoreState, string> = {
  lose17: 'score_differential <= -17',
  lose9to16: 'score_differential BETWEEN -16 AND -9',
  lose4to8: 'score_differential BETWEEN -8 AND -4',
  lose1to3: 'score_differential BETWEEN -3 AND -1',
  tied: 'score_differential = 0',
  win1to3: 'score_differential BETWEEN 1 AND 3',
  win4to8: 'score_differential BETWEEN 4 AND 8',
  win9to16: 'score_differential BETWEEN 9 AND 16',
  win17: 'score_differential >= 17',
}
const ZONE: Record<FieldZone, string> = {
  own1to20: 'yardline_100 BETWEEN 80 AND 99',
  own21to50: 'yardline_100 BETWEEN 50 AND 79',
  opp49to21: 'yardline_100 BETWEEN 21 AND 49',
  redzone: 'yardline_100 <= 20',
  goalline: 'yardline_100 <= 5',
}
const DEPTH: Record<PassDepth, string> = {
  behindLOS: 'air_yards <= 0',
  d1to5: 'air_yards BETWEEN 1 AND 5',
  d6to10: 'air_yards BETWEEN 6 AND 10',
  d11to15: 'air_yards BETWEEN 11 AND 15',
  d16to25: 'air_yards BETWEEN 16 AND 25',
  d26plus: 'air_yards >= 26',
}
// Run direction now combines run_location + run_gap into 7 buckets. Middle
// runs typically have run_gap NULL, so match on location only for that bucket.
const RUNDIR: Record<RunDir, string> = {
  left_end:     "(run_location = 'left' AND run_gap = 'end')",
  left_tackle:  "(run_location = 'left' AND run_gap = 'tackle')",
  left_guard:   "(run_location = 'left' AND run_gap = 'guard')",
  middle:       "(run_location = 'middle')",
  right_guard:  "(run_location = 'right' AND run_gap = 'guard')",
  right_tackle: "(run_location = 'right' AND run_gap = 'tackle')",
  right_end:    "(run_location = 'right' AND run_gap = 'end')",
}

export function playsWhere(s: Slicers): string {
  let w = common(s)
  if (s.teams.length) w += ` AND posteam IN (${teamList(s.teams)})`
  if (s.opponents.length) w += ` AND defteam IN (${teamList(s.opponents)})`
  if (s.downs.length) w += ` AND down IN (${list(s.downs)})`
  if (s.distances.length) w += ` AND (${s.distances.map(d => DIST[d]).join(' OR ')})`
  if (s.scoreStates.length) w += ` AND (${s.scoreStates.map(x => SCORE[x]).join(' OR ')})`
  if (s.zones.length) w += ` AND (${s.zones.map(z => ZONE[z]).join(' OR ')})`
  if (s.quarters.length) {
    const qs = s.quarters.map(q => (q === 'OT' ? 5 : Number(q)))
    w += ` AND qtr IN (${list(qs)})`
  }
  if (s.shotgun !== 'all') w += ` AND shotgun = ${s.shotgun === 'yes' ? 1 : 0}`
  if (s.noHuddle !== 'all') w += ` AND no_huddle = ${s.noHuddle === 'yes' ? 1 : 0}`
  if (s.pressure !== 'all') w += ` AND qb_hit = ${s.pressure === 'yes' ? 1 : 0}`
  if (s.playTypes.length) {
    const pts = s.playTypes.filter(p => p === 'pass' || p === 'run').map(p => `'${p}'`)
    if (pts.length) w += ` AND play_type IN (${pts.join(',')})`
  }
  if (s.passDepth.length) w += ` AND (${s.passDepth.map(d => DEPTH[d]).join(' OR ')})`
  if (s.passDir.length) w += ` AND pass_location IN (${list(s.passDir)})`
  if (s.runDir.length) w += ` AND (${s.runDir.map(d => RUNDIR[d]).join(' OR ')})`
  if (s.twoMinute === 'yes') w += ` AND half_seconds_remaining <= 120`
  if (s.twoMinute === 'no') w += ` AND half_seconds_remaining > 120`
  // Home/away — plays carry home_team/away_team directly.
  if (s.homeAway === 'home') w += ` AND posteam = home_team`
  else if (s.homeAway === 'away') w += ` AND posteam = away_team`
  return w
}

/** Player usage thresholds → HAVING fragment on the reconstructed game-log.
 * Applies to player-level aggregations only (leaderboards). Each bound that is
 * set is enforced against the player's season total in the current slice. */
const THRESH_COL: Record<ThreshKey, string> = {
  passAtt: 'attempts', targets: 'targets', rushAtt: 'carries', rec: 'receptions',
}
export function thresholdHaving(s: Slicers): string {
  const parts: string[] = []
  ;(Object.keys(THRESH_COL) as ThreshKey[]).forEach(k => {
    const [mn, mx] = s.thresholds[k]
    if (mn != null) parts.push(`sum(${THRESH_COL[k]}) >= ${mn}`)
    if (mx != null) parts.push(`sum(${THRESH_COL[k]}) <= ${mx}`)
  })
  return parts.length ? ' AND ' + parts.join(' AND ') : ''
}

/** Short human description of the active slice, for chart subtitles. */
export function sliceLabel(s: Slicers): string {
  const parts: string[] = []
  parts.push(s.seasons.length ? s.seasons.join(', ') : 'all seasons')
  if (s.weeks.length) parts.push(`wk ${s.weeks.join(',')}`)
  parts.push(s.seasonType === 'all' ? 'REG+POST' : s.seasonType === 'postseason' ? 'POST' : 'REG')
  if (s.positions.length) parts.push(s.positions.join('/'))
  if (s.teams.length) parts.push(s.teams.join('/'))
  if (s.opponents.length) parts.push(`vs ${s.opponents.join('/')}`)
  if (s.downs.length) parts.push(`${s.downs.join('/')} dn`)
  if (s.distances.length) parts.push(s.distances.map(d => DISTANCE_LABELS[d]).join('/') + ' to go')
  if (s.scoreStates.length) parts.push(s.scoreStates.map(x => SCORE_LABELS[x]).join('/'))
  if (s.zones.length) parts.push(s.zones.map(z => ZONE_LABELS[z]).join('/'))
  if (s.passDepth.length) parts.push(s.passDepth.map(d => DEPTH_LABELS[d]).join('/'))
  if (s.passDir.length) parts.push(s.passDir.map(d => PASSDIR_LABELS[d]).join('/') + ' pass')
  if (s.runDir.length) parts.push(s.runDir.map(d => RUNDIR_LABELS[d]).join('/') + ' run')
  if (s.pressure !== 'all') parts.push(s.pressure === 'yes' ? 'under pressure' : 'clean pocket')
  ;(['passAtt','targets','rushAtt','rec'] as ThreshKey[]).forEach(k => {
    const [mn, mx] = s.thresholds[k]
    if (mn != null && mx != null) parts.push(`${mn}–${mx} ${THRESH_LABELS[k]}`)
    else if (mn != null) parts.push(`${mn}+ ${THRESH_LABELS[k]}`)
    else if (mx != null) parts.push(`≤${mx} ${THRESH_LABELS[k]}`)
  })
  return parts.join(' · ')
}

/* ---------------------------------------------------------------------------
 * Sample-size floors that scale with the slice (Oct 2026).
 *
 * The decks used to hide any team with < 50 plays (or any player with < N
 * plays / < 3 games). That floor made sense for a bulk season view but emptied
 * every report the moment a user sliced by situation — 2nd-and-short over
 * seven weeks is ~30 plays per team, so all 32 teams vanished. These helpers
 * express the floor relative to what the slice actually contains.
 * ------------------------------------------------------------------------- */

/** Per-team floor: a fifth of the median team's play count in this slice, never
 * below 5. Keeps every team in any reasonable slice; drops only outliers such as
 * a team with one game inside a multi-week window. `base` is the report's own
 * play filter (e.g. `pass_attempt=1`), `teamCol` is posteam or defteam. */
export function teamMinPlays(teamCol: 'posteam' | 'defteam', base: string, s: Slicers): string {
  return `(SELECT greatest(5, 0.2 * quantile_cont(n, 0.5)) FROM (SELECT count(*) AS n FROM plays WHERE ${teamCol} IS NOT NULL AND ${base} ${playsWhere(s)} GROUP BY ${teamCol}))`
}

/** Per-player floor on play counts: 15% of the busiest player's count in this
 * slice, never below 2. Top-N ordering already does the real ranking; this only
 * keeps one-play players out when fewer than N qualify. */
export function playerMinPlays(playerCol: string, base: string, s: Slicers): string {
  return `(SELECT greatest(2, 0.15 * max(n)) FROM (SELECT count(*) AS n FROM plays WHERE ${playerCol} IS NOT NULL AND ${base} ${playsWhere(s)} GROUP BY ${playerCol}))`
}

/** Why a report might be empty, in plain words — shown under "No data for this
 * slice" so a casual user knows which chip to remove. */
export function emptyHint(s: Slicers): string | null {
  const hints: string[] = []
  const runOnly = s.playTypes.length === 1 && s.playTypes[0] === 'run'
  const passOnly = s.playTypes.length === 1 && s.playTypes[0] === 'pass'
  if (runOnly || s.runDir.length) hints.push('the slice is run plays only — passing reports have nothing to show')
  if (passOnly || s.passDepth.length || s.passDir.length || s.pressure !== 'all') hints.push('the slice is pass plays only — rushing reports have nothing to show')
  if (s.seasonType === 'postseason') hints.push('playoffs only — teams and players who missed the postseason have no rows')
  if (s.shotgun !== 'all' && s.noHuddle !== 'all') hints.push('shotgun × no-huddle is a very small sample for most teams')
  if (s.weeks.length && s.weeks.length <= 2) hints.push('one or two weeks is a thin sample; some reports need more games')
  if (s.playerIds.length && s.teams.length) hints.push('a player filter plus a team filter must agree — check the player is on that team')
  return hints.length ? hints.join('; ') + '.' : null
}

/* ---------------------------------------------------------------------------
 * Every team, always (Oct 2026).
 *
 * Team-level reports no longer apply any sample floor. There are only 32
 * teams, so a zero is information ("KC has run no shotgun/no-huddle plays")
 * and must not vanish. withEveryTeam() wraps a GROUP BY aggregate so teams
 * with no plays in the slice still come back as rows with 0 for counts and
 * NULL (shown as –) for rates.
 * ------------------------------------------------------------------------- */

/** The teams that belong in a team-level report: every team that played in
 * the selected season(s), narrowed by the Team chip (posteam) or Opponent
 * chip (defteam) when set. Weeks and situational filters do not shrink it. */
export function teamScopeWhere(s: Slicers, teamCol: 'posteam' | 'defteam'): string {
  let w = ''
  if (s.seasons.length) w += ` AND season IN (${list(s.seasons)})`
  w += seasonType(s)
  const pick = teamCol === 'posteam' ? s.teams : s.opponents
  if (pick.length) w += ` AND ${teamCol} IN (${teamList(pick)})`
  return w
}

/**
 * @param agg      a SELECT that groups by the team and aliases it as `alias`
 * @param cols     the metric column names the aggregate produces
 * @param intKeys  the count-style columns that should read 0 (not –) for a team with no plays
 */
export function withEveryTeam(agg: string, teamCol: 'posteam' | 'defteam', alias: string, s: Slicers,
  cols: string[], intKeys: string[] = [], orderBy = `t.${alias}`): string {
  const teams = `SELECT DISTINCT ${teamCol} AS ${alias} FROM plays WHERE ${teamCol} IS NOT NULL${teamScopeWhere(s, teamCol)}`
  const sel = cols.map(c => (intKeys.includes(c) ? `coalesce(a.${c}, 0) AS ${c}` : `a.${c}`)).join(', ')
  return `SELECT t.${alias} AS ${alias}, ${sel} FROM (${teams}) t LEFT JOIN (${agg}) a ON a.${alias} = t.${alias} ORDER BY ${orderBy} NULLS LAST`
}
