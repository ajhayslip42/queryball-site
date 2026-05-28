/**
 * usePlayerIndex — loads the full searchable player roster from the real data.
 *
 * Replaces the old static curated PLAYERS list: every player who has a row in
 * player_week (1,600+ skill players) is now findable in the picker, using their
 * most recent team and position. One small cached query at mount.
 */
import { useMemo } from 'react'
import { useQuery } from './useQuery'
import type { Player, Position } from './players'

// Latest team/position for each skill player who has weekly stats.
const INDEX_SQL = `
  SELECT gsis_id, name, position, team FROM (
    SELECT player_id AS gsis_id, player_display_name AS name, position,
      recent_team AS team,
      row_number() OVER (PARTITION BY player_id ORDER BY season DESC, week DESC) AS rn
    FROM player_week
    WHERE position IN ('QB','RB','WR','TE') AND player_display_name IS NOT NULL
  ) WHERE rn = 1
  ORDER BY name
`

type Row = { gsis_id: string; name: string; position: string; team: string }

export function usePlayerIndex() {
  const { data, loading } = useQuery<Row>(INDEX_SQL, [])
  const players = useMemo<Player[]>(
    () => (data ?? []).map(r => ({ gsis_id: r.gsis_id, name: r.name, position: r.position as Position, team: r.team })),
    [data],
  )
  const byId = useMemo(() => new Map(players.map(p => [p.gsis_id, p])), [players])

  function search(query: string, limit = 20): Player[] {
    const q = query.trim().toLowerCase()
    if (!q) return players.slice(0, limit)
    // name match first, then team match, dedup by id
    const seen = new Set<string>()
    const out: Player[] = []
    for (const p of players) {
      if (p.name.toLowerCase().includes(q) && !seen.has(p.gsis_id)) { seen.add(p.gsis_id); out.push(p) }
      if (out.length >= limit) break
    }
    if (out.length < limit) {
      for (const p of players) {
        if (p.team.toLowerCase() === q && !seen.has(p.gsis_id)) { seen.add(p.gsis_id); out.push(p) }
        if (out.length >= limit) break
      }
    }
    return out
  }

  return { players, byId, search, loading }
}
