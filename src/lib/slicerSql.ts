/**
 * Slicer → SQL.
 *
 * Turns the active Slicers (from the filter rail / URL) into SQL WHERE
 * fragments. Two targets:
 *   - playerWeekWhere(s)  → filters the weekly player-stats table
 *   - playsWhere(s)       → filters play-by-play (the full situational set)
 *
 * Everything returns a string beginning with " AND ..." (or '') so it can be
 * appended to a base WHERE. This is the literal mechanism behind QueryBall's
 * thesis: the same stat, sliced into context.
 */

import type { Slicers, DistanceBucket, ScoreState, FieldZone } from './slicers'

const list = (xs: (string | number)[]) =>
  xs.map(x => (typeof x === 'number' ? x : `'${String(x).replace(/'/g, "''")}'`)).join(',')

function seasonType(s: Slicers): string {
  if (s.seasonType === 'regular') return ` AND season_type = 'REG'`
  if (s.seasonType === 'postseason') return ` AND season_type = 'POST'`
  return ''
}

/* ---- shared (apply to both tables; same column names) ---- */
function common(s: Slicers): string {
  let w = ''
  if (s.seasons.length) w += ` AND season IN (${list(s.seasons)})`
  if (s.weeks.length) w += ` AND week IN (${list(s.weeks)})`
  w += seasonType(s)
  return w
}

/* ---- player_week ---- */
export function playerWeekWhere(s: Slicers): string {
  let w = common(s)
  if (s.positions.length) w += ` AND position IN (${list(s.positions)})`
  if (s.teams.length) w += ` AND recent_team IN (${list(s.teams)})`
  if (s.opponents.length) w += ` AND opponent_team IN (${list(s.opponents)})`
  if (s.playerIds.length) w += ` AND player_id IN (${list(s.playerIds)})`
  return w
}

/* ---- plays (situational) ---- */
const DIST: Record<DistanceBucket, string> = {
  d1to3: 'ydstogo BETWEEN 1 AND 3',
  d4to6: 'ydstogo BETWEEN 4 AND 6',
  d7to9: 'ydstogo BETWEEN 7 AND 9',
  d10plus: 'ydstogo >= 10',
}
const SCORE: Record<ScoreState, string> = {
  trail9plus: 'score_differential <= -9',
  trail18: 'score_differential BETWEEN -18 AND -1',
  tied: 'score_differential = 0',
  lead18: 'score_differential BETWEEN 1 AND 18',
  lead9plus: 'score_differential >= 9',
}
const ZONE: Record<FieldZone, string> = {
  own1to20: 'yardline_100 BETWEEN 80 AND 99',
  own21to50: 'yardline_100 BETWEEN 50 AND 79',
  opp49to21: 'yardline_100 BETWEEN 21 AND 49',
  redzone: 'yardline_100 <= 20',
  goalline: 'yardline_100 <= 5',
}

export function playsWhere(s: Slicers): string {
  let w = common(s)
  if (s.teams.length) w += ` AND posteam IN (${list(s.teams)})`
  if (s.opponents.length) w += ` AND defteam IN (${list(s.opponents)})`
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
  if (s.playTypes.length) {
    const map: Record<string, string> = { pass: 'pass', run: 'run' }
    const pts = s.playTypes.filter(p => map[p]).map(p => `'${map[p]}'`)
    if (pts.length) w += ` AND play_type IN (${pts.join(',')})`
  }
  if (s.twoMinute === 'yes') w += ` AND half_seconds_remaining <= 120`
  if (s.twoMinute === 'no') w += ` AND half_seconds_remaining > 120`
  // garbage-time exclusion: blowout in Q4 (approximation without win-prob col)
  if (s.garbageTime === 'no') w += ` AND NOT (qtr >= 4 AND abs(score_differential) > 21)`
  if (s.garbageTime === 'yes') w += ` AND (qtr >= 4 AND abs(score_differential) > 21)`
  return w
}

/** A short human description of the active slice, for chart subtitles. */
export function sliceLabel(s: Slicers): string {
  const parts: string[] = []
  parts.push(s.seasons.length ? s.seasons.join(', ') : 'all seasons')
  if (s.weeks.length) parts.push(`wk ${s.weeks.join(',')}`)
  parts.push(s.seasonType === 'all' ? 'REG+POST' : s.seasonType === 'postseason' ? 'POST' : 'REG')
  if (s.positions.length) parts.push(s.positions.join('/'))
  if (s.teams.length) parts.push(s.teams.join('/'))
  return parts.join(' · ')
}
