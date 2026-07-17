/**
 * Chart wrappers built on Recharts.
 *
 * Every chart sits inside a fixed-height container with
 * <ResponsiveContainer width="100%" height={N}> — N is explicit (200/220/240).
 * This is what fixes the "unnaturally tall chart" artifact from prior previews.
 */

import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  ReferenceLine, ScatterChart, Scatter, ZAxis, Treemap,
} from 'recharts'

const AXIS = '#94A0AA'
const GRID = '#EDF0F2'
const LINE = '#E2E6EA'
const INK  = '#1F2D38'

export const PALETTE = {
  accent:  '#6191A5',  // logo steel
  accent2: '#2A3B47',  // logo navy
  cool:    '#7FA899',  // sage-teal complement
  ok:      '#3F8060',
  bad:     '#A0594B',
  cream:   '#EEF2F4',
  ink:     '#1F2D38',
  muted:   AXIS,
}

const tooltipStyle = {
  backgroundColor: '#1F2D38',
  border: '1px solid #2A3B47',
  borderRadius: 6,
  color: '#FFFFFF',
  fontSize: 12,
  padding: '6px 10px',
}

const axisProps = {
  tick: { fill: AXIS, fontSize: 10 },
  axisLine: { stroke: LINE },
  tickLine: { stroke: LINE },
}

/* ----------------------------- Bar ----------------------------- */
export function BarTile({ data, xKey = 'name', yKey = 'value', height = 220, color = PALETTE.accent, formatY }: {
  data: any[]; xKey?: string; yKey?: string; height?: number; color?: string; formatY?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatY} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(97,145,165,0.08)' }} />
        <Bar dataKey={yKey} fill={color} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ----------------------------- Stacked Bar ----------------------------- */
export function StackedBarTile({ data, xKey, series, height = 220, formatY }: {
  data: any[]; xKey: string; series: { key: string; label: string; color: string }[];
  height?: number; formatY?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatY} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(97,145,165,0.08)' }} />
        <Legend wrapperStyle={{ fontSize: 11, color: INK }} iconSize={10} />
        {series.map((s, i) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} stackId="y"
            fill={s.color} radius={i === series.length - 1 ? [3, 3, 0, 0] : 0} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ----------------------------- Line ----------------------------- */
export function LineTile({ data, xKey = 'name', series, height = 220, formatY, refLine }: {
  data: any[]; xKey?: string;
  series: { key: string; label: string; color?: string }[];
  height?: number; formatY?: (v: number) => string;
  refLine?: { y: number; label?: string }
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatY} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#6191A5', strokeDasharray: '4 4' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 11, color: INK }} iconSize={10} />}
        {refLine !== undefined && (
          <ReferenceLine y={refLine.y} stroke={AXIS} strokeDasharray="4 4"
            label={{ value: refLine.label, position: 'right', fontSize: 10, fill: AXIS }} />
        )}
        {series.map(s => (
          <Line key={s.key} type="monotone" dataKey={s.key} name={s.label}
            stroke={s.color ?? PALETTE.accent} strokeWidth={2}
            dot={{ r: 3, fill: s.color ?? PALETTE.accent }} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/* ----------------------------- Area (filled trend) ----------------------------- */
export function AreaTile({ data, xKey = 'name', yKey = 'value', height = 220, color = PALETTE.accent, formatY }: {
  data: any[]; xKey?: string; yKey?: string; height?: number; color?: string; formatY?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={`area-${yKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatY} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#6191A5', strokeDasharray: '4 4' }} />
        <Area type="monotone" dataKey={yKey} stroke={color} strokeWidth={2}
          fill={`url(#area-${yKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/* ----------------------------- Donut ----------------------------- */
export function DonutTile({ data, height = 220 }: {
  data: { name: string; value: number; color: string }[]; height?: number
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%"
          stroke="#FFFFFF" strokeWidth={2}>
          {data.map(d => <Cell key={d.name} fill={d.color} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, color: INK }} iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  )
}

/* ----------------------------- Scatter (efficiency view) ----------------------------- */
export function ScatterTile({ data, xKey, yKey, zKey, height = 240, color = PALETTE.accent, formatX, formatY }: {
  data: any[]; xKey: string; yKey: string; zKey?: string; height?: number; color?: string;
  formatX?: (v: number) => string; formatY?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} />
        <XAxis dataKey={xKey} type="number" {...axisProps} tickFormatter={formatX} />
        <YAxis dataKey={yKey} type="number" {...axisProps} tickFormatter={formatY} />
        {zKey && <ZAxis dataKey={zKey} range={[40, 200]} />}
        <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '4 4', stroke: '#6191A5' }} />
        <Scatter data={data} fill={color} />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

const CBAR_RING = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, PALETTE.cool, '#9AAEB8', '#C98A3B']

/* ------- Colored Bar: one color per category, with a legend (e.g. by down) ------- */
export function ColoredBarTile({ data, xKey = 'name', yKey = 'value', height = 220, colors = CBAR_RING, formatY, showLegend = true }: {
  data: any[]; xKey?: string; yKey?: string; height?: number; colors?: string[]; formatY?: (v: number) => string; showLegend?: boolean
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatY} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(97,145,165,0.08)' }} />
        <Bar dataKey={yKey} radius={[3, 3, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
        </Bar>
      </BarChart>
      {/* legend rendered by caller when needed */}
    </ResponsiveContainer>
  )
}

/* ------- Horizontal Bar: good for ranked categories with long labels ------- */
export function HBarTile({ data, xKey = 'name', yKey = 'value', height = 220, color = PALETTE.accent2, formatX }: {
  data: any[]; xKey?: string; yKey?: string; height?: number; color?: string; formatX?: (v: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 6, right: 10, left: 6, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" {...axisProps} tickFormatter={formatX} />
        <YAxis type="category" dataKey={xKey} width={64} {...axisProps} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(97,145,165,0.08)' }} />
        <Bar dataKey={yKey} fill={color} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ============================================================================
 * PowerBI-style chart primitives — pie, treemap, percentage bar, quadrant grid,
 * small-multiples grid. Every one takes a { data, ... } object so they compose
 * uniformly inside the panels engine.
 * ========================================================================== */

const RING = [PALETTE.accent, PALETTE.accent2, PALETTE.ok, PALETTE.bad, PALETTE.cool, '#9AAEB8', '#C98A3B', '#4B698A']

/* ---- Pie (proper slice-by-category, with legend). Good for share splits like
 *      "carries by gap" or "targets by depth". */
export function PieTile({
  data, nameKey = 'name', valueKey = 'value', height = 220, colors = RING, formatValue,
}: {
  data: any[]; nameKey?: string; valueKey?: string; height?: number; colors?: string[];
  formatValue?: (v: number) => string
}) {
  const total = data.reduce((a, d) => a + (Number(d[valueKey]) || 0), 0)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius={0} outerRadius={height / 2 - 10} paddingAngle={1}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => (formatValue ? formatValue(Number(v)) : v)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="w-24 flex-shrink-0 space-y-0.5">
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0
          const pct = total ? (v / total * 100).toFixed(0) : '0'
          return (
            <div key={i} className="flex items-center gap-1.5 text-[9.5px]">
              <span className="inline-block h-2 w-2 rounded-sm flex-shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="truncate flex-1" title={String(d[nameKey])}>{String(d[nameKey])}</span>
              <span className="text-muted num">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ---- Treemap: proportional-area rectangles. Ideal for room-level "target share
 *      inside Cincinnati" — Chase big, Higgins medium, ... */
export function TreemapTile({
  data, valueKey = 'value', nameKey = 'name', height = 220, colors = RING,
}: {
  data: any[]; valueKey?: string; nameKey?: string; height?: number; colors?: string[]
}) {
  // Treemap needs `size` field
  const shaped = data.map((d, i) => ({ name: String(d[nameKey]), size: Number(d[valueKey]) || 0, _idx: i }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap data={shaped} dataKey="size" nameKey="name" stroke="#fff" content={<TmCell colors={colors} />} />
    </ResponsiveContainer>
  )
}
function TmCell(props: any) {
  const { x, y, width, height, name, _idx, colors, root } = props
  if (width < 6 || height < 6) return null
  const idx = props.index ?? _idx ?? 0
  const fill = colors[idx % colors.length]
  const total = (root?.children ?? []).reduce((a: number, c: any) => a + (c.size || 0), 0)
  const pct = total ? Math.round((props.size / total) * 100) : 0
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} />
      {width > 60 && height > 30 && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={11} fontWeight={600}>{name}</text>
          <text x={x + 6} y={y + 30} fill="rgba(255,255,255,0.85)" fontSize={10}>{pct}%</text>
        </>
      )}
    </g>
  )
}

/* ---- Percentage bar: single horizontal bar segmented by category (a compact
 *      "share of total"). Nice for "of all 3rd-down carries, who got what %?". */
export function PctBarTile({
  data, nameKey = 'name', valueKey = 'value', colors = RING, height = 34, showLegend = true,
}: {
  data: any[]; nameKey?: string; valueKey?: string; colors?: string[]; height?: number; showLegend?: boolean
}) {
  const total = data.reduce((a, d) => a + (Number(d[valueKey]) || 0), 0)
  return (
    <div className="space-y-1.5">
      <div className="flex w-full rounded overflow-hidden border border-line" style={{ height }}>
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0
          const pct = total ? (v / total) * 100 : 0
          return (
            <div key={i}
              className="flex items-center justify-center text-[9px] font-semibold text-white overflow-hidden"
              title={`${d[nameKey]}: ${v.toFixed(0)} (${pct.toFixed(1)}%)`}
              style={{ background: colors[i % colors.length], width: `${pct}%` }}>
              {pct >= 10 ? `${pct.toFixed(0)}%` : ''}
            </div>
          )
        })}
      </div>
      {showLegend && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {data.map((d, i) => (
            <span key={i} className="inline-flex items-center gap-1 text-[9.5px]">
              <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors[i % colors.length] }} />
              <span>{String(d[nameKey])}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---- Small-multiples grid: N tiny charts side-by-side, one per group (e.g. one
 *      mini-bar per down showing carry share). Renders a callback per group. */
export function SmallMultiplesTile<T>({
  groups, renderTile, cols = 4, gap = 8,
}: {
  groups: { key: string; label: string; data: T[] }[]
  renderTile: (g: { key: string; label: string; data: T[] }) => import('react').ReactNode
  cols?: number
  gap?: number
}) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap }}>
      {groups.map(g => (
        <div key={g.key} className="rounded border border-line p-1.5 bg-paper">
          <p className="text-[10px] font-semibold text-muted mb-1 text-center">{g.label}</p>
          {renderTile(g)}
        </div>
      ))}
    </div>
  )
}

/* ---- Quadrant heatmap: a labelled grid where cell color = value magnitude.
 *      Perfect for the QB "stat-pack by quadrant of field" (pass direction × depth). */
export function QuadrantHeatmap({
  rows, cols, cells, height = 240, formatCell,
}: {
  rows: string[]; cols: string[]; cells: (number | null)[][]; height?: number;
  formatCell?: (v: number | null, r: number, c: number) => string
}) {
  const flat = cells.flat().filter(v => typeof v === 'number') as number[]
  const min = flat.length ? Math.min(...flat) : 0
  const max = flat.length ? Math.max(...flat) : 1
  const norm = (v: number) => (max === min ? 0.5 : (v - min) / (max - min))
  const bg = (v: number | null) => {
    if (v == null) return '#F5F7F8'
    const t = norm(v)
    // steel blue gradient
    const r = Math.round(238 + (97 - 238) * t)
    const g = Math.round(242 + (145 - 242) * t)
    const b = Math.round(244 + (165 - 244) * t)
    return `rgb(${r},${g},${b})`
  }
  const cellW = `1fr`
  return (
    <div style={{ height }} className="w-full">
      <div className="grid gap-px" style={{ gridTemplateColumns: `72px repeat(${cols.length}, ${cellW})` }}>
        <div />
        {cols.map((c, i) => <div key={i} className="text-[10px] text-muted text-center py-1 truncate" title={c}>{c}</div>)}
        {rows.map((r, ri) => (
          <>
            <div key={`r${ri}`} className="text-[10px] text-muted flex items-center pr-1 truncate" title={r}>{r}</div>
            {cols.map((_, ci) => {
              const v = cells[ri]?.[ci] ?? null
              return (
                <div key={`c${ri}-${ci}`}
                  className="text-[10.5px] font-semibold text-ink flex items-center justify-center"
                  style={{ background: bg(v), minHeight: 32 }}
                  title={v == null ? '—' : (formatCell ? formatCell(v, ri, ci) : String(v))}>
                  {v == null ? '—' : (formatCell ? formatCell(v, ri, ci) : v.toFixed(0))}
                </div>
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}

/* ---- Waterfall: cumulative build-up, positive/negative contributions.
 *      Useful for "how did Player X get to their season yardage" broken by
 *      quarter, or "share change vs baseline". */
export function WaterfallTile({
  data, nameKey = 'name', valueKey = 'value', height = 220, formatY,
}: {
  data: any[]; nameKey?: string; valueKey?: string; height?: number; formatY?: (v: number) => string
}) {
  let running = 0
  const shaped = data.map(d => {
    const v = Number(d[valueKey]) || 0
    const base = running
    running += v
    return { name: String(d[nameKey]), base, delta: v, tot: running, pos: v >= 0 }
  })
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={shaped} margin={{ top: 6, right: 6, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" {...axisProps} />
        <YAxis {...axisProps} tickFormatter={formatY} />
        <Tooltip contentStyle={tooltipStyle}
          formatter={(_v: any, _k: any, p: any) => (formatY ? formatY(p.payload.delta) : p.payload.delta)}
          labelFormatter={l => `${l}`} />
        {/* invisible base to lift the visible bar */}
        <Bar dataKey="base" stackId="w" fill="transparent" />
        <Bar dataKey="delta" stackId="w" radius={[3, 3, 0, 0]}>
          {shaped.map((d, i) => <Cell key={i} fill={d.pos ? PALETTE.ok : PALETTE.bad} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
