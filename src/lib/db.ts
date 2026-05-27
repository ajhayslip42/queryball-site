/**
 * DuckDB-WASM data layer.
 *
 * Loads the parquet files shipped in /public/data/ and exposes them as SQL
 * views. Play-by-play is split into one file per season (plays_YYYY.parquet)
 * to stay under Cloudflare's 25 MiB per-asset limit; we read the manifest and
 * UNION the available seasons into a single `plays` view so queries don't have
 * to care how many seasons exist.
 *
 * Tables exposed:
 *   player_week  — weekly tidy player stats (the workhorse)
 *   players      — roster metadata (gsis_id, position, headshot, ...)
 *   games        — schedules, scores, weather, spreads
 *   plays        — play-by-play, recent seasons, slimmed columns
 *
 * To refresh: run scripts/refresh-data.py, drop the new parquet into
 * public/data/, and redeploy.
 */

let _dbPromise: Promise<any> | null = null

async function fetchSeasons(): Promise<number[]> {
  try {
    const res = await fetch('/data/plays_manifest.json')
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json.seasons) ? json.seasons : []
  } catch {
    return []
  }
}

async function getDb(): Promise<any> {
  if (_dbPromise) return _dbPromise
  _dbPromise = (async () => {
    try {
      const duckdb: any = await import('@duckdb/duckdb-wasm')
      const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles())
      const worker_url = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
      )
      const worker = new Worker(worker_url)
      const logger = new duckdb.ConsoleLogger()
      const db = new duckdb.AsyncDuckDB(logger, worker)
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
      URL.revokeObjectURL(worker_url)

      const seasons = await fetchSeasons()
      const conn = await db.connect()
      try {
        // Core tables — always present.
        await conn.query(`
          CREATE VIEW IF NOT EXISTS player_week AS
            SELECT * FROM read_parquet('${location.origin}/data/player_week.parquet');
          CREATE VIEW IF NOT EXISTS players AS
            SELECT * FROM read_parquet('${location.origin}/data/players.parquet');
          CREATE VIEW IF NOT EXISTS games AS
            SELECT * FROM read_parquet('${location.origin}/data/games.parquet');
        `)
        // Play-by-play — union whatever seasons the manifest lists.
        if (seasons.length) {
          const union = seasons
            .map(y => `SELECT * FROM read_parquet('${location.origin}/data/plays_${y}.parquet')`)
            .join(' UNION ALL ')
          await conn.query(`CREATE VIEW IF NOT EXISTS plays AS ${union};`)
        }
      } catch (e) {
        console.warn('Some data views could not be created — is public/data/ populated?', e)
      } finally {
        await conn.close()
      }
      return db
    } catch (err) {
      console.warn('DuckDB-WASM not available.', err)
      return null
    }
  })()
  return _dbPromise
}

export async function query<T = any>(sql: string): Promise<T[]> {
  const db = await getDb()
  if (!db) return []
  const conn = await db.connect()
  try {
    const result = await conn.query(sql)
    return result.toArray().map((r: any) =>
      Object.fromEntries(Object.keys(r).map(k => {
        const v = r[k]
        // DuckDB returns BigInt for 64-bit ints; coerce to Number for charts.
        return [k, typeof v === 'bigint' ? Number(v) : v]
      }))
    ) as T[]
  } finally {
    await conn.close()
  }
}

/** SQL string literal helper — escape single quotes. */
export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** SQL list helper — for IN (…) clauses. */
export function sqlList(values: (string | number)[]): string {
  if (!values.length) return 'NULL'
  return values.map(v => (typeof v === 'number' ? String(v) : sqlString(v))).join(',')
}
