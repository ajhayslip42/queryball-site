/**
 * useMatchCount — live "N plays match" for the current slice.
 *
 * Runs a single count(*) against the play-by-play with the full situational
 * WHERE. Cheap (DuckDB scans one season's parquet in milliseconds), and the
 * feedback is what tells a casual user that a filter actually did something —
 * or that they've sliced themselves down to nothing.
 */
import { useQuery } from './useQuery'
import { playsWhere } from './slicerSql'
import type { Slicers } from './slicers'

export function useMatchCount(s: Slicers): { count: number | null; loading: boolean } {
  const sql = `SELECT count(*)::int AS c FROM plays WHERE play_type IN ('pass','run') ${playsWhere(s)}`
  const q = useQuery<{ c: number }>(sql, [sql])
  return { count: q.data ? (q.data[0]?.c ?? 0) : null, loading: q.loading }
}
