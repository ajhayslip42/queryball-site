/**
 * Panels — the dense report engine.
 *
 * MetricReport renders an optional mini summary table on top, then one or more
 * panels of "small multiples": a grid of compact charts, one per metric, sharing
 * a category axis. A single query with many metric columns becomes many visuals
 * on a single report page — the core of QueryBall's PowerBI-style dashboard feel.
 *
 * NEW in this iteration:
 *   - Metric.type supports pie / treemap / pctBar / waterfall in addition to
 *     bar / line / area / cbar / hbar.
 *   - Panel.custom lets bespoke reports drop in ANY React node, escaping the
 *     small-multiples grid entirely (used for quadrant heatmaps, room-share
 *     treemaps, waterfalls, or full-width comparisons).
 *   - Panel.cols overrides the grid density (default 3 wide).
 *   - Panel.full renders as a single full-width column when true.
 *   - Tighter card chrome — less bubble, more content.
 */
import type { ReactNode } from 'react'
import {
  BarTile, LineTile, AreaTile, ColoredBarTile, HBarTile,
  PieTile, TreemapTile, PctBarTile, WaterfallTile, PALETTE,
} from '@/components/charts/Charts'
import DataTable, { type Column } from '@/components/DataTable'
import { TileLoader, NoData } from '@/components/deck/Helpers'
import { fmt } from '@/lib/nfl'

/* Shared metric helpers used by every deck. */
export const F = {
  int: (v: number) => fmt.int(v), d1: (v: number) => fmt.num(v, 1), d2: (v: number) => fmt.num(v, 2),
  epa: (v: number) => fmt.signed(v, 3), pct: (v: number) => `${fmt.num(v, 1)}%`,
}
export type MDef = { key: string; label: string; expr: string; f: keyof typeof F }

/* Auto-assign a varied chart style per metric so each report grid is a mix of
 * bars, filled areas and lines rather than a wall of identical bars. Rate-style
 * metrics (%, EPA, ratios) read better as lines/areas; counting metrics as bars. */
const TYPE_ROT: NonNullable<Metric['type']>[] = ['bar', 'area', 'line']
export function autoType(f: MDef['f'], i: number): Metric['type'] {
  if (f === 'pct' || f === 'epa') return i % 2 === 0 ? 'line' : 'area'
  if (f === 'd2') return i % 2 === 0 ? 'area' : 'bar'
  return TYPE_ROT[i % TYPE_ROT.length]
}
export const metricsOf = (defs: MDef[]): Metric[] =>
  defs.map((d, i) => ({ key: d.key, label: d.label, fmt: F[d.f], type: autoType(d.f, i) }))
export const selOf = (defs: MDef[]): string => defs.map(d => `${d.expr} AS ${d.key}`).join(', ')
export const miniColsOf = (catLabel: string, defs: MDef[]): Column<any>[] =>
  [{ key: 'cat', label: catLabel }, ...defs.map(d => ({ key: d.key, label: d.label, numeric: true, format: F[d.f] }))]

export type Metric = {
  key: string
  label: string
  fmt?: (v: number) => string
  color?: string
  type?: 'bar' | 'line' | 'area' | 'cbar' | 'hbar' | 'pie' | 'treemap' | 'pctBar' | 'waterfall'
}
export type Panel = {
  heading?: string
  rows: any[]
  categoryKey: string
  /** Truncate long category labels to last token (e.g. surnames). */
  short?: boolean
  metrics: Metric[]
  /** Escape hatch: any React node rendered instead of the metric grid. */
  custom?: ReactNode
  /** Grid columns for the metric small-multiples (default 3 on lg). */
  cols?: 1 | 2 | 3 | 4
  /** Render this panel as a single full-width tile block. */
  full?: boolean
}

const RING = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, '#7FA899', '#6191A5', '#2A3B47', '#A0594B', '#3F8060', '#9AAEB8']
const CBAR = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, '#7FA899', '#9AAEB8', '#C98A3B']
const cn = (s: string) => (s.includes(' ') ? s.split(' ').slice(-1)[0] : s)

function SmallChart({ m, rows, categoryKey, short, idx }: { m: Metric; rows: any[]; categoryKey: string; short?: boolean; idx: number }) {
  const data = rows.map(r => ({ name: short ? cn(String(r[categoryKey] ?? '')) : String(r[categoryKey] ?? ''), value: r[m.key] }))
  const color = m.color ?? RING[idx % RING.length]
  const chart =
    m.type === 'line'      ? <LineTile data={data} height={140} series={[{ key: 'value', label: m.label, color }]} formatY={m.fmt} />
    : m.type === 'area'    ? <AreaTile data={data} height={140} color={color} formatY={m.fmt} />
    : m.type === 'cbar'    ? <ColoredBarTile data={data} height={140} colors={CBAR} formatY={m.fmt} />
    : m.type === 'hbar'    ? <HBarTile data={data} height={140} color={color} formatX={m.fmt} />
    : m.type === 'pie'     ? <PieTile data={data} height={140} formatValue={m.fmt} />
    : m.type === 'treemap' ? <TreemapTile data={data} height={140} />
    : m.type === 'pctBar'  ? <PctBarTile data={data} />
    : m.type === 'waterfall' ? <WaterfallTile data={data} height={140} formatY={m.fmt} />
    : <BarTile data={data} height={140} color={color} formatY={m.fmt} />
  return (
    <div className="rounded border border-line p-2 bg-paper">
      <p className="text-[10.5px] font-semibold text-muted mb-1 truncate" title={m.label}>{m.label}</p>
      {chart}
      {m.type === 'cbar' && (
        <div className="mt-1 flex flex-wrap gap-x-2.5 gap-y-0.5">
          {data.map((d, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[9px] text-muted">
              <span className="inline-block h-1.5 w-1.5 rounded-sm" style={{ background: CBAR[i % CBAR.length] }} />{d.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function gridColsClass(cols: 1 | 2 | 3 | 4 = 3): string {
  if (cols === 1) return 'grid-cols-1'
  if (cols === 2) return 'grid-cols-1 lg:grid-cols-2'
  if (cols === 4) return 'grid-cols-2 lg:grid-cols-4'
  return 'grid-cols-2 lg:grid-cols-3'
}

export function MetricReport({ title, subtitle, loading, mini, panels }: {
  title?: string
  subtitle?: string
  loading?: boolean
  mini?: { rows: any[]; cols: Column<any>[]; sort?: { key: string; dir: 'asc' | 'desc' }; caption?: string; dense?: boolean; tight?: boolean } | null
  panels: Panel[]
}) {
  const anyRows = panels.some(p => p.rows.length > 0 || p.custom) || (mini?.rows.length ?? 0) > 0
  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div>
          {title && <h3 className="font-display text-lg tracking-tight leading-tight">{title}</h3>}
          {subtitle && <p className="text-[11.5px] text-muted mt-0.5">{subtitle}</p>}
        </div>
      )}
      {loading ? <TileLoader height={260} /> : !anyRows ? <NoData /> : (
        <>
          {mini && mini.rows.length > 0 && (
            <div className="rounded border border-line p-2 bg-paper overflow-x-auto">
              {mini.caption && <p className="eyebrow mb-1.5">{mini.caption}</p>}
              <DataTable rows={mini.rows} columns={mini.cols} defaultSort={mini.sort} dense={mini.dense ?? true} tight={mini.tight} zebra />
            </div>
          )}
          {panels.map((p, pi) => {
            const empty = !p.custom && p.rows.length === 0
            if (empty) return null
            return (
              <div key={pi} className="space-y-1.5">
                {p.heading && <p className="eyebrow pt-1">{p.heading}</p>}
                {p.custom ? (
                  <div className={p.full ? 'w-full' : ''}>{p.custom}</div>
                ) : (
                  <div className={`grid ${gridColsClass(p.cols)} gap-2.5`}>
                    {p.metrics.map((m, i) => {
                      // On split reports (few categories: by down/quarter/score/distance),
                      // render the leading tile as a colored-by-category bar with a legend.
                      const fewCats = p.rows.length > 0 && p.rows.length <= 8
                      const mm = fewCats && i === 0 && (!m.type || m.type === 'bar') ? { ...m, type: 'cbar' as const } : m
                      return <SmallChart key={m.key} m={mm} rows={p.rows} categoryKey={p.categoryKey} short={p.short} idx={i} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
