/**
 * Shared deck helpers — small reusable pieces used by multiple decks.
 *
 * Centralizing these keeps the deck files focused on their actual content
 * (charts and data) and ensures visual consistency across the whole site.
 */

import type { ReactNode } from 'react'

/** A small stat cell — label above, value below, optional trend arrow. */
export function Cell({ label, value, trend, small = false }: {
  label: string
  value: string
  trend?: { dir: 'up' | 'down'; value: string }
  small?: boolean
}) {
  return (
    <div>
      <p className="stat-label">{label}</p>
      <p className={small ? 'stat-num-sm num' : 'stat-num num'}>
        {value}
        {trend && (
          <span className={`stat-trend ml-1 ${trend.dir}`}>
            {trend.dir === 'up' ? '↑' : '↓'}{trend.value}
          </span>
        )}
      </p>
    </div>
  )
}

/** The fantasy-tab intro banner. Sets the visual tone that this tab is different. */
export function FantasyBanner({ label, headline, body }: {
  label: string
  headline: string
  body: ReactNode
}) {
  return (
    <div
      className="qcard p-5"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FA 100%)',
        borderLeft: '3px solid #2A3B47',
      }}
    >
      <p className="eyebrow text-accent2">{label}</p>
      <h4 className="font-display text-3xl mt-1 leading-tight">{headline}</h4>
      <p className="text-sm text-muted mt-2 max-w-2xl leading-relaxed">{body}</p>
    </div>
  )
}

/** A row of clickable scoring-format pills. Visual only — wiring comes later. */
export function FormatPicker({ formats, active }: {
  formats: string[]
  active: string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="eyebrow">Scoring format</span>
      {formats.map(f => (
        <button key={f} className={`chip ${f === active ? 'applied' : ''}`}>{f}</button>
      ))}
    </div>
  )
}

/** Skeleton shown inside a Tile while a real query runs. */
export function TileLoader({ height = 240 }: { height?: number }) {
  return (
    <div className="animate-pulse rounded-lg bg-[#EEF2F4]" style={{ height }} />
  )
}

/** Shown when a query returns no rows for the current slice. */
export function NoData({ note }: { note?: string }) {
  return (
    <div className="qcard p-8 text-center">
      <p className="font-display text-xl mb-1">No data for this slice</p>
      <p className="text-sm text-muted max-w-md mx-auto">
        {note ?? 'Loosen the filters in the rail — this combination of slicers returned no rows.'}
      </p>
    </div>
  )
}

/** Wraps a query result: shows a loader, then a no-data state, then children. */
export function QueryState<T>({ q, height, children }: {
  q: { data: T[] | null; loading: boolean }
  height?: number
  children: (rows: T[]) => ReactNode
}) {
  if (q.loading || q.data == null) return <TileLoader height={height} />
  if (q.data.length === 0) return <NoData />
  return <>{children(q.data)}</>
}
