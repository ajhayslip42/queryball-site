/**
 * playerGameLog — the heart of QueryBall's "stats in context" thesis.
 *
 * Reconstructs a player_week-equivalent game log directly FROM play-by-play, so
 * that EVERY situational slicer (down, distance, score, field zone, quarter,
 * pass depth/direction, pressure, ...) actually changes the numbers. The
 * pre-aggregated player_week table is game-level and cannot do this; this can,
 * because the filtering (playsWhere) happens on the underlying plays.
 *
 * Returns a parenthesized subquery producing one row per player per game with
 * player_week-compatible column names. Use it as a report's FROM source:
 *
 *   FROM ${playerGameLog(slicers)} g WHERE "position"='WR' GROUP BY ...
 *
 * Validated to match player_week exactly on full-season slices (Mahomes 3928
 * pass yds, Chase 1708 rec yds / 17 TD / 75 first downs, Saquon 2005 rush yds).
 *
 * Caveats: fantasy points exclude fumble-lost penalties and 2-pt conversions
 * (play-by-play lacks per-player fumble attribution); share metrics (target
 * share, WOPR) are computed at the report level via window functions, not here.
 *
 * opts.playerId restricts to a single player (filters each role branch so the
 * single-player deck stays fast).
 */
import type { Slicers } from './slicers'
import { playsWhere } from './slicerSql'

const esc = (v: string) => v.replace(/'/g, "''")

export function playerGameLog(s: Slicers, opts?: { playerId?: string }): string {
  const W = playsWhere(s)
  const pid = opts?.playerId ? `'${esc(opts.playerId)}'` : null
  const pf = (role: string) => (pid ? ` AND ${role}_player_id = ${pid}` : '')
  return `(
    WITH ev AS (
      SELECT passer_player_id pid, game_id, season, week, season_type, posteam team, defteam opp,
        1 p_att, complete_pass::int p_cmp, COALESCE(passing_yards,0) p_yds, pass_touchdown::int p_td,
        interception::int p_int, sack::int p_sack, COALESCE(air_yards,0) p_ay, COALESCE(yards_after_catch,0) p_yac,
        first_down::int p_fd, COALESCE(epa,0) p_epa,
        0 r_car, 0 r_yds, 0 r_td, 0 r_fd, 0.0 r_epa,
        0 c_tgt, 0 c_rec, 0 c_yds, 0 c_td, 0 c_ay, 0 c_yac, 0 c_fd, 0.0 c_epa,
        0 c_ay_comp, 0 c_ay_inc, 0 c_inc
      FROM plays WHERE pass_attempt=1 AND passer_player_id IS NOT NULL${pf('passer')} ${W}
      UNION ALL
      SELECT rusher_player_id, game_id, season, week, season_type, posteam, defteam,
        0,0,0,0,0,0,0,0,0,0.0,
        1, COALESCE(rushing_yards,0), rush_touchdown::int, first_down::int, COALESCE(epa,0),
        0,0,0,0,0,0,0,0.0,
        0,0,0
      FROM plays WHERE rush_attempt=1 AND rusher_player_id IS NOT NULL${pf('rusher')} ${W}
      UNION ALL
      SELECT receiver_player_id, game_id, season, week, season_type, posteam, defteam,
        0,0,0,0,0,0,0,0,0,0.0,
        0,0,0,0,0.0,
        1, complete_pass::int, COALESCE(receiving_yards,0), pass_touchdown::int, COALESCE(air_yards,0), COALESCE(yards_after_catch,0), first_down::int, COALESCE(epa,0),
        (CASE WHEN complete_pass=1 THEN COALESCE(air_yards,0) ELSE 0 END) c_ay_comp,
        (CASE WHEN complete_pass=0 THEN COALESCE(air_yards,0) ELSE 0 END) c_ay_inc,
        (CASE WHEN complete_pass=0 THEN 1 ELSE 0 END) c_inc
      FROM plays WHERE pass_attempt=1 AND receiver_player_id IS NOT NULL${pf('receiver')} ${W}
    )
    SELECT ev.pid player_id, pl.display_name player_display_name, pl.position AS "position",
      ev.season, ev.week, ev.season_type, ev.team recent_team, max(ev.opp) opponent_team, ev.game_id,
      sum(p_att) attempts, sum(p_cmp) completions, sum(p_yds) passing_yards, sum(p_td) passing_tds,
      sum(p_int) interceptions, sum(p_sack) sacks, sum(p_ay) passing_air_yards, sum(p_yac) passing_yards_after_catch,
      sum(p_fd) passing_first_downs, sum(p_epa) passing_epa,
      sum(r_car) carries, sum(r_yds) rushing_yards, sum(r_td) rushing_tds, sum(r_fd) rushing_first_downs, sum(r_epa) rushing_epa,
      sum(c_tgt) targets, sum(c_rec) receptions, sum(c_yds) receiving_yards, sum(c_td) receiving_tds,
      sum(c_ay) receiving_air_yards, sum(c_yac) receiving_yards_after_catch, sum(c_fd) receiving_first_downs, sum(c_epa) receiving_epa,
      -- "What could have been": air yards on incomplete passes, plus the split of completed-vs-incomplete air yards.
      sum(COALESCE(c_ay_comp,0)) receiving_air_yards_completed,
      sum(COALESCE(c_ay_inc,0))  receiving_air_yards_incomplete,
      sum(COALESCE(c_inc,0))     incompletions,
      -- Opportunity = targets + carries (RB-critical, but computed for everyone).
      (sum(c_tgt)+sum(r_car)) opportunities,
      round(sum(p_yds)*0.04+sum(p_td)*4-sum(p_int)*2+sum(r_yds)*0.1+sum(r_td)*6+sum(c_yds)*0.1+sum(c_td)*6,2) fantasy_points,
      round(sum(p_yds)*0.04+sum(p_td)*4-sum(p_int)*2+sum(r_yds)*0.1+sum(r_td)*6+sum(c_yds)*0.1+sum(c_td)*6+sum(c_rec),2) fantasy_points_ppr
    FROM ev JOIN players pl ON pl.gsis_id = ev.pid
    GROUP BY ev.pid, pl.display_name, pl.position, ev.season, ev.week, ev.season_type, ev.team, ev.game_id
  )`
}
