import { useEffect, useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { Search, Download, AlertCircle } from 'lucide-react'
import DataTable, { type Column } from '@/components/DataTable'
import clsx from 'clsx'

type Sheet = { name: string; rows: Record<string, any>[]; headers: string[] }

export default function Projections() {
  const [sheets, setSheets] = useState<Sheet[] | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [filter, setFilter] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/projections.xlsx')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.arrayBuffer()
      })
      .then(buf => {
        if (cancelled) return
        const wb = XLSX.read(buf, { type: 'array' })
        const out: Sheet[] = wb.SheetNames.map(name => {
          const ws = wb.Sheets[name]
          const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: null })
          const headers = rows[0] ? Object.keys(rows[0]) : []
          return { name, rows, headers }
        })
        setSheets(out)
      })
      .catch(err => {
        if (cancelled) return
        setError(`Couldn't load projections.xlsx — ${err.message}. Drop the file into /public/projections.xlsx to enable this page.`)
      })
    return () => { cancelled = true }
  }, [])

  const active = sheets?.[activeIdx]
  const filtered = useMemo(() => {
    if (!active) return []
    if (!filter.trim()) return active.rows
    const q = filter.toLowerCase()
    return active.rows.filter(r =>
      Object.values(r).some(v => v != null && String(v).toLowerCase().includes(q))
    )
  }, [active, filter])

  const columns: Column<any>[] = useMemo(() => {
    if (!active) return []
    return active.headers.map(h => {
      const sampleRow = active.rows.find(r => r[h] != null)
      const isNumeric = sampleRow && typeof sampleRow[h] === 'number'
      return {
        key: h,
        label: h,
        numeric: !!isNumeric,
        format: isNumeric
          ? (v: any) => v == null ? '–' : (Number.isInteger(v) ? v.toString() : Number(v).toFixed(2))
          : undefined,
      }
    })
  }, [active])

  return (
    <div className="bg-paper">
      <header className="border-b border-line bg-cream">
        <div className="max-w-[1400px] mx-auto px-6 py-14">
          <p className="eyebrow mb-3">QueryBall · Model</p>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight">
            Weekly <em className="text-accent">projections</em>.
          </h1>
          <p className="mt-4 max-w-2xl text-sm text-muted leading-relaxed">
            Refreshed alongside the data each Tuesday. Sortable, filterable, and downloadable as the
            original .xlsx so you can plug the numbers into your own tooling.
          </p>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {error && (
          <div className="qcard p-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-bad mt-0.5 flex-shrink-0" />
            <p className="text-sm text-muted">{error}</p>
          </div>
        )}

        {sheets && (
          <>
            {/* Sheet tabs */}
            <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-wrap gap-2">
                {sheets.map((s, i) => (
                  <button
                    key={s.name} onClick={() => setActiveIdx(i)}
                    className={clsx('chip', i === activeIdx && 'applied')}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <a href="/projections.xlsx" download
                className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
                <Download className="h-3.5 w-3.5" /> Download .xlsx
              </a>
            </div>

            {/* Filter */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
              <input
                type="text"
                value={filter}
                onChange={e => setFilter(e.target.value)}
                placeholder="Filter by player, team, anything…"
                className="w-full max-w-md pl-9 pr-3 py-2 rounded-md border border-line bg-paper text-sm focus:border-accent focus:outline-none"
              />
            </div>

            {/* Table */}
            <div className="qcard p-5">
              {active && <DataTable rows={filtered} columns={columns} />}
              <p className="text-xs text-muted mt-4">{filtered.length} rows</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
