import { useEffect, useState } from 'react'
import { query } from './db'

export function useQuery<T = any>(sql: string, deps: any[] = []): {
  data: T[] | null
  loading: boolean
  error: Error | null
} {
  const [data, setData] = useState<T[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    query<T>(sql).then(rows => {
      if (!cancelled) { setData(rows); setLoading(false) }
    }).catch(err => {
      if (!cancelled) { setError(err); setLoading(false) }
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error }
}
