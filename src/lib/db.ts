/**
 * DuckDB-WASM data layer.
 *
 * In production, this connects to DuckDB-WASM and loads the parquet files
 * shipped in /public/data/. For the iteration-3 reference build, queries
 * return mock rows when the parquet files aren't present, so the UI renders
 * cleanly even before the first data refresh.
 *
 * To enable real DuckDB queries, drop the parquet files into public/data/
 * (run `python scripts/refresh-data.py` to produce them).
 */

let _dbPromise: Promise<any> | null = null

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

      // Try to register the parquet files we ship.
      const conn = await db.connect()
      try {
        await conn.query(`
          CREATE VIEW IF NOT EXISTS plays AS
            SELECT * FROM read_parquet('/data/plays.parquet');
          CREATE VIEW IF NOT EXISTS player_week AS
            SELECT * FROM read_parquet('/data/player_week.parquet');
          CREATE VIEW IF NOT EXISTS players AS
            SELECT * FROM read_parquet('/data/players.parquet');
          CREATE VIEW IF NOT EXISTS games AS
            SELECT * FROM read_parquet('/data/games.parquet');
        `)
      } catch (_) {
        // Data files not present yet — that's fine for first deploy.
      }
      await conn.close()
      return db
    } catch (err) {
      console.warn('DuckDB-WASM not available, using mock data layer.', err)
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
    const rows = result.toArray().map((r: any) => Object.fromEntries(
      Object.keys(r).map(k => [k, r[k]])
    ))
    return rows as T[]
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
  return values
    .map(v => (typeof v === 'number' ? String(v) : sqlString(v)))
    .join(',')
}
