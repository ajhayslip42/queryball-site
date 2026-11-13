/**
 * Small inline-SVG charts for the Lines page. All use a viewBox and scale to
 * their container, so the same component works in a desktop card and on a phone.
 */
import { Phi, poissonPmf } from '@/lib/lines'

const NAVY = '#2A3B47', STEEL = '#6191A5', OK = '#3F8060', BAD = '#A0594B', MUTED = '#5E6B75'

export type Bar = { val: number; label: string; sub?: string; good?: boolean }

/** Vertical bars with the line drawn through them; bars colored over / under. */
export function BarsWithLine({ bars, line, height = 150, fmt = (v: number) => String(v), colorByHit = true }: { bars: Bar[]; line: number; height?: number; fmt?: (v: number) => string; colorByHit?: boolean }) {
  if (!bars.length) return null
  const w = Math.max(320, Math.min(960, bars.length * 44 + 30)), h = height
  const vals = bars.map(b => b.val)
  const top = Math.max(Math.max(...vals), line, 1) * 1.18
  const padL = 26, padB = 26, padT = 10
  const cw = (w - padL) / bars.length, bw = Math.min(cw * 0.62, 34)
  const sy = (v: number) => padT + (h - padB - padT) * (1 - v / top)
  const y = sy(line)
  return (
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-auto" style={{ minWidth: bars.length > 12 ? bars.length * 26 : undefined }} role="img" aria-label="Results by game against the line">
      {bars.map((b, i) => {
        const x = padL + i * cw + (cw - bw) / 2
        const col = colorByHit ? (b.val > line ? OK : b.val < line ? BAD : MUTED) : (b.good === false ? BAD : b.good ? OK : STEEL)
        return (
          <g key={i}>
            <rect x={x} y={sy(b.val)} width={bw} height={Math.max(1, sy(0) - sy(b.val))} rx={2} fill={col} opacity={0.9} />
            <text x={x + bw / 2} y={sy(b.val) - 3} fontSize={9} textAnchor="middle" fill={NAVY} fontWeight={700}>{fmt(b.val)}</text>
            <text x={x + bw / 2} y={h - 14} fontSize={8.5} textAnchor="middle" fill={MUTED}>{b.label}</text>
            {b.sub && <text x={x + bw / 2} y={h - 4} fontSize={7.5} textAnchor="middle" fill={MUTED}>{b.sub}</text>}
          </g>
        )
      })}
      <line x1={padL - 4} y1={y} x2={w} y2={y} stroke={NAVY} strokeWidth={1.3} strokeDasharray="4 3" />
      <text x={padL - 6} y={y + 3} fontSize={9} textAnchor="end" fill={NAVY} fontWeight={800}>{line}</text>
    </svg></div>
  )
}

/** Bars above and below zero (margins), each with a dashed reference tick (the spread that day). */
export function Diverging({ bars, refs, height = 150, fmt = (v: number) => (v > 0 ? '+' : '') + v }: { bars: Bar[]; refs?: (number | null)[]; height?: number; fmt?: (v: number) => string }) {
  if (!bars.length) return null
  const w = Math.max(320, Math.min(960, bars.length * 44 + 30)), h = height
  const vals = bars.map(b => b.val), rv = (refs ?? []).filter((x): x is number => x != null)
  const lo = Math.min(Math.min(...vals), Math.min(...rv, 0), 0) * 1.25 - 2, hi = Math.max(Math.max(...vals), Math.max(...rv, 0), 0) * 1.25 + 2
  const padL = 26, padB = 26, padT = 10
  const cw = (w - padL) / bars.length, bw = Math.min(cw * 0.6, 34)
  const sy = (v: number) => padT + (h - padB - padT) * (1 - (v - lo) / (hi - lo))
  return (
    <div className="overflow-x-auto"><svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-auto" style={{ minWidth: bars.length > 12 ? bars.length * 26 : undefined }} role="img" aria-label="Margin by game">
      <line x1={padL - 4} y1={sy(0)} x2={w} y2={sy(0)} stroke={NAVY} strokeWidth={1.2} />
      <text x={padL - 6} y={sy(0) + 3} fontSize={9} textAnchor="end" fill={NAVY} fontWeight={800}>0</text>
      {bars.map((b, i) => {
        const x = padL + i * cw + (cw - bw) / 2, v = b.val
        const [y0, y1] = [sy(0), sy(v)].sort((a, c) => a - c)
        const r = refs?.[i]
        return (
          <g key={i}>
            <rect x={x} y={y0} width={bw} height={Math.max(1, y1 - y0)} rx={2} fill={b.good === false ? BAD : b.good ? OK : STEEL} opacity={0.9} />
            <text x={x + bw / 2} y={v >= 0 ? sy(v) - 3 : sy(v) + 10} fontSize={9} textAnchor="middle" fill={NAVY} fontWeight={700}>{fmt(v)}</text>
            {r != null && <line x1={x - 3} y1={sy(r)} x2={x + bw + 3} y2={sy(r)} stroke={STEEL} strokeWidth={2} strokeDasharray="3 2" />}
            <text x={x + bw / 2} y={h - 14} fontSize={8.5} textAnchor="middle" fill={MUTED}>{b.label}</text>
            {b.sub && <text x={x + bw / 2} y={h - 4} fontSize={7.5} textAnchor="middle" fill={MUTED}>{b.sub}</text>}
          </g>
        )
      })}
    </svg></div>
  )
}

/** Normal curve (or Poisson bars) with the over-region shaded, a histogram of real games, mean / median / ±σ markers. */
export function Curve({ mean, sigma, line, vals, dist, median, height = 170 }: { mean: number; sigma: number; line: number; vals: number[]; dist: 'normal' | 'poisson'; median?: number; height?: number }) {
  const w = 480, h = height, padL = 8, padR = 8, padB = 24, padT = 14
  const hh = h - padB - padT
  if (dist === 'poisson') {
    const lam = Math.max(0.01, mean), kmax = Math.max(Math.ceil(line) + 3, Math.ceil(lam + 3 * Math.sqrt(lam)), ...vals.map(v => Math.round(v)))
    const ks = Array.from({ length: Math.min(kmax, 30) + 1 }, (_, k) => k)
    const pm = ks.map(k => poissonPmf(lam, k)), mxp = Math.max(...pm, 0.01)
    const cnt = ks.map(k => vals.filter(v => Math.round(v) === k).length), mxc = Math.max(...cnt, 1)
    const cw = (w - padL - padR) / ks.length
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-auto" role="img" aria-label="Poisson distribution">
        {ks.map((k, i) => {
          const x = padL + i * cw, over = k > line
          return (
            <g key={k}>
              {cnt[i] > 0 && <rect x={x + 2} y={padT + hh - hh * 0.55 * cnt[i] / mxc} width={Math.max(1, cw - 4)} height={hh * 0.55 * cnt[i] / mxc} fill={STEEL} opacity={0.25} rx={1.5} />}
              <rect x={x + cw * 0.25} y={padT + hh * (1 - pm[i] / mxp)} width={cw * 0.5} height={hh * pm[i] / mxp} fill={over ? OK : NAVY} opacity={over ? 0.75 : 0.5} rx={1.5} />
              <text x={x + cw / 2} y={h - 10} fontSize={8.5} textAnchor="middle" fill={MUTED}>{k}</text>
              {cnt[i] > 0 && <text x={x + cw / 2} y={padT + hh - hh * 0.55 * cnt[i] / mxc - 2} fontSize={7.5} textAnchor="middle" fill={STEEL}>{cnt[i]}</text>}
            </g>
          )
        })}
        <text x={padL + 2} y={padT - 2} fontSize={8.5} fill={NAVY} fontWeight={700}>λ = {mean.toFixed(2)} · green = over {line}</text>
      </svg>
    )
  }
  const sd = sigma > 0 ? sigma : Math.max(1, Math.abs(mean) * 0.3)
  const lo = Math.max(vals.length ? Math.min(0, ...vals) : 0, mean - 3.2 * sd), hi = Math.max(mean + 3.2 * sd, line + sd * 0.5, ...vals)
  const sx = (v: number) => padL + (w - padL - padR) * (v - lo) / (hi - lo)
  const pdf = (v: number) => Math.exp(-0.5 * ((v - mean) / sd) ** 2)
  const pts = Array.from({ length: 121 }, (_, i) => { const v = lo + (hi - lo) * i / 120; return [sx(v), padT + hh * (1 - pdf(v))] as const })
  const path = 'M' + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L')
  const over = pts.filter(p => p[0] >= sx(line))
  const shade = over.length ? `M${sx(line).toFixed(1)},${(padT + hh).toFixed(1)} L` + over.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L') + ` L${sx(hi).toFixed(1)},${(padT + hh).toFixed(1)} Z` : ''
  const nb = 12, bwid = (hi - lo) / nb, counts = Array(nb).fill(0) as number[]
  for (const v of vals) counts[Math.min(nb - 1, Math.max(0, Math.floor((v - lo) / bwid)))]++
  const mxc = Math.max(...counts, 1)
  const pOver = 1 - Phi((line - mean) / sd)
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="block w-full h-auto" role="img" aria-label="Distribution of results">
      {counts.map((c, i) => c ? (
        <g key={i}>
          <rect x={sx(lo + i * bwid) + 1} y={padT + hh - hh * 0.55 * c / mxc} width={Math.max(1, sx(lo + (i + 1) * bwid) - sx(lo + i * bwid) - 2)} height={hh * 0.55 * c / mxc} fill={STEEL} opacity={0.25} rx={1.5} />
          <text x={sx(lo + (i + 0.5) * bwid)} y={padT + hh - hh * 0.55 * c / mxc - 2} fontSize={7.5} textAnchor="middle" fill={STEEL}>{c}</text>
        </g>
      ) : null)}
      {shade && <path d={shade} fill={OK} opacity={0.22} />}
      <path d={path} fill="none" stroke={NAVY} strokeWidth={1.6} />
      {[-2, -1, 1, 2].map(k => { const v = mean + k * sd; return lo <= v && v <= hi ? (
        <g key={k}><line x1={sx(v)} y1={padT + hh - 4} x2={sx(v)} y2={padT + hh + 3} stroke={MUTED} /><text x={sx(v)} y={padT + hh + 12} fontSize={7.5} textAnchor="middle" fill={MUTED}>{k > 0 ? '+' : ''}{k}σ · {v.toFixed(0)}</text></g>) : null })}
      <line x1={sx(mean)} y1={padT} x2={sx(mean)} y2={padT + hh + 3} stroke={STEEL} strokeDasharray="2 2" />
      <text x={sx(mean)} y={padT + hh + 12} fontSize={7.5} textAnchor="middle" fill={STEEL} fontWeight={700}>mean {mean.toFixed(1)}</text>
      {median != null && Math.abs(median - mean) > (hi - lo) * 0.04 && (
        <g><line x1={sx(median)} y1={padT + hh * 0.3} x2={sx(median)} y2={padT + hh + 3} stroke={MUTED} strokeDasharray="1 2" /><text x={sx(median)} y={padT + hh * 0.3 - 2} fontSize={7.5} textAnchor="middle" fill={MUTED}>median {median}</text></g>
      )}
      <line x1={sx(line)} y1={padT - 6} x2={sx(line)} y2={padT + hh + 3} stroke={NAVY} strokeWidth={1.6} />
      <text x={sx(line) + 4} y={padT + 4} fontSize={9} fill={NAVY} fontWeight={800}>line {line}</text>
      <text x={sx(line) + 4} y={padT + 15} fontSize={8} fill={OK} fontWeight={700}>curve P(over) {(100 * pOver).toFixed(0)}%</text>
    </svg>
  )
}

/** 100% stacked bar + legend (shares). */
export function StackBar({ items, colors, height = 18 }: { items: { k: string; v: number }[]; colors?: string[]; height?: number }) {
  const total = items.reduce((s, i) => s + i.v, 0) || 1
  const cols = colors ?? [BAD, '#C98B7F', '#C9D7E0', '#8FB3A3', OK]
  return (
    <div>
      <div className="flex rounded-md overflow-hidden" style={{ height }}>
        {items.map((it, i) => { const pct = 100 * it.v / total; return <span key={it.k} title={`${it.k}: ${it.v}`} className="flex items-center justify-center text-[9px] font-bold whitespace-nowrap overflow-hidden" style={{ width: `${pct}%`, background: cols[i % cols.length], color: i < 2 || i === cols.length - 1 ? '#fff' : NAVY }}>{pct >= 8 ? `${pct.toFixed(0)}%` : ''}</span> })}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted">
        {items.map((it, i) => <span key={it.k}><i className="inline-block w-2 h-2 rounded-sm mr-1 align-middle" style={{ background: cols[i % cols.length] }} />{it.k} <b className="text-ink">{Number.isInteger(it.v) ? it.v : it.v.toFixed(0)}</b></span>)}
      </div>
    </div>
  )
}

/** Horizontal bars with a label and a value. */
export function HBars({ rows, fmt = (v: number) => String(v), color = STEEL, max }: { rows: { k: string; v: number; sub?: string }[]; fmt?: (v: number) => string; color?: string; max?: number }) {
  const mx = max ?? Math.max(...rows.map(r => Math.abs(r.v)), 1)
  return (
    <div className="space-y-1">
      {rows.map(r => (
        <div key={r.k} className="flex items-center gap-2 text-[11px]">
          <span className="w-[38%] min-w-0 truncate text-muted" title={r.k}>{r.k}{r.sub && <span className="text-muted2"> · {r.sub}</span>}</span>
          <span className="flex-1 h-1.5 rounded bg-[#EEF2F4] overflow-hidden"><span className="block h-full rounded" style={{ width: `${Math.max(2, 100 * Math.abs(r.v) / mx)}%`, background: color }} /></span>
          <b className="w-12 text-right num text-accent2">{fmt(r.v)}</b>
        </div>
      ))}
    </div>
  )
}
