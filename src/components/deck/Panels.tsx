/**
 * Panels — the dense report engine.
 *
 * MetricReport renders an optional mini summary table (packed tight) on top,
 * then one or more panels of "small multiples": a grid of compact charts, one
 * per metric, sharing a category axis. One query with 10+ metric columns →
 * 10+ visuals on a single report page.
 */
import { BarTile, LineTile, PALETTE } from '@/components/charts/Charts'
import DataTable, { type Column } from '@/components/DataTable'
import { TileLoader, NoData } from '@/components/deck/Helpers'
import { fmt } from '@/lib/nfl'

/* Shared metric helpers used by every deck. */
export const F = {
  int: (v: number) => fmt.int(v), d1: (v: number) => fmt.num(v, 1), d2: (v: number) => fmt.num(v, 2),
  epa: (v: number) => fmt.signed(v, 3), pct: (v: number) => `${fmt.num(v, 1)}%`,
}
export type MDef = { key: string; label: string; expr: string; f: keyof typeof F }
export const metricsOf = (defs: MDef[]): Metric[] => defs.map(d => ({ key: d.key, label: d.label, fmt: F[d.f] }))
export const selOf = (defs: MDef[]): string => defs.map(d => `${d.expr} AS ${d.key}`).join(', ')
export const miniColsOf = (catLabel: string, defs: MDef[]): Column<any>[] =>
  [{ key: 'cat', label: catLabel }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]

export type Metric = {
  key: string
  label: string
  fmt?: (v: number) => string
  color?: string
  type?: 'bar' | 'line'
}
export type Panel = {
  heading?: string
  rows: any[]
  categoryKey: string
  /** truncate long category labels to last token (e.g. surnames) */
  short?: boolean
  metrics: Metric[]
}

const RING = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, '#7FA899', '#6191A5', '#2A3B47', '#A0594B', '#3F8060', '#9AAEB8']
const cn = (s: string) => (s.includes(' ') ? s.split(' ').slice(-1)[0] : s)

function SmallChart({ m, rows, categoryKey, short, idx }: { m: Metric; rows: any[]; categoryKey: string; short?: boolean; idx: number }) {
  const data = rows.map(r => ({ name: short ? cn(String(r[categoryKey] ?? '')) : String(r[categoryKey] ?? ''), value: r[m.key] }))
  const color = m.color ?? RING[idx % RING.length]
  return (
    <div className="qcard p-2.5">
      <p className="text-[11px] font-semibold text-muted mb-1 truncate" title={m.label}>{m.label}</p>
      {m.type === 'line'
        ? <LineTile data={data} height={140} series={[{ key: 'value', label: m.label, color }]} formatY={m.fmt} />
        : <BarTile data={data} height={140} color={color} formatY={m.fmt} />}
    </div>
  )
}

export function MetricReport({ title, subtitle, loading, mini, panels }: {
  title?: string
  subtitle?: string
  loading?: boolean
  mini?: { rows: any[]; cols: Column<any>[]; sort?: { key: string; dir: 'asc' | 'desc' }; caption?: string } | null
  panels: Panel[]
}) {
  const anyRows = panels.some(p => p.rows.length > 0) || (mini?.rows.length ?? 0) > 0
  return (
    <div className="space-y-4">
      {(title || subtitle) && (
        <div>
          {title && <h3 className="font-display text-xl tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      {loading ? <TileLoader height={260} /> : !anyRows ? <NoData /> : (
        <>
          {mini && mini.rows.length > 0 && (
            <div className="qcard p-3 overflow-x-auto">
              {mini.caption && <p className="eyebrow mb-2">{mini.caption}</p>}
              <DataTable rows={mini.rows} columns={mini.cols} defaultSort={mini.sort} dense />
            </div>
          )}
          {panels.map((p, pi) => (
            p.rows.length === 0 ? null : (
              <div key={pi} className="space-y-2">
                {p.heading && <p className="eyebrow pt-1">{p.heading}</p>}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {p.metrics.map((m, i) => (
                    <SmallChart key={m.key} m={m} rows={p.rows} categoryKey={p.categoryKey} short={p.short} idx={i} />
                  ))}
                </div>
              </div>
            )
          ))}
        </>
      )}
    </div>
  )
}
