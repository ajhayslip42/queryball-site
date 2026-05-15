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
  ReferenceLine, ScatterChart, Scatter, ZAxis,
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
