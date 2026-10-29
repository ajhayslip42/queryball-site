/**
 * DeckContents + ReportPager — finding the reports on a phone.
 *
 * Contents: one card per report with the question it answers. Pager: the
 * header inside a report with ‹ › arrows, a dot indicator, "3 of 7", the
 * neighbours' names, and swipe-to-move between reports.
 */
import { useRef, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronLeft, ChevronRight, LayoutList } from 'lucide-react'
import type { DeckTab } from '@/components/deck/DeckShell'
import { reportQuestion } from '@/lib/reportMeta'

/* Tiny inline thumbnails so each card has a visual hint. Keyed by report id. */
function Thumb({ id }: { id: string }) {
  const bars = (hs: number[], c = '#6191A5') => (
    <svg viewBox="0 0 44 26" className="w-11 h-6">{hs.map((h, i) => <rect key={i} x={2 + i * 7} y={26 - h} width="5" height={h} fill={i === hs.length - 2 ? '#2A3B47' : c} />)}</svg>
  )
  switch (id) {
    case 'weekly': case 'overview': return bars([12, 18, 10, 22, 16, 14])
    case 'downdist': case 'bydown': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><g fill="#D9E1E7"><rect x="4" y="3" width="10" height="6" /><rect x="17" y="3" width="10" height="6" /><rect x="30" y="3" width="10" height="6" /><rect x="4" y="11" width="10" height="6" /><rect x="17" y="11" width="10" height="6" /><rect x="4" y="19" width="10" height="6" /><rect x="17" y="19" width="10" height="6" /></g><g fill="#2A3B47"><rect x="30" y="11" width="10" height="6" /><rect x="30" y="19" width="10" height="6" /></g></svg>)
    case 'gamestate': case 'sit': case 'situational': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><rect x="3" y="6" width="18" height="14" fill="#6191A5" /><rect x="23" y="6" width="18" height="14" fill="#2A3B47" /><text x="12" y="16" fontSize="7" fill="#fff" textAnchor="middle" fontWeight="700">+</text><text x="32" y="16" fontSize="7" fill="#fff" textAnchor="middle" fontWeight="700">−</text></svg>)
    case 'field': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><rect x="2" y="5" width="40" height="16" fill="#DCE8E2" /><rect x="32" y="5" width="10" height="16" fill="#6191A5" /><line x1="22" y1="5" x2="22" y2="21" stroke="#fff" strokeWidth="1.5" /></svg>)
    case 'fantasy': case 'dst': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><polyline fill="none" stroke="#2A3B47" strokeWidth="2" points="3,20 11,12 19,16 27,6 35,10 42,4" /></svg>)
    case 'depthdir': case 'depth': case 'airyards': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><g fill="#6191A5"><circle cx="10" cy="8" r="3" /><circle cx="24" cy="18" r="3" /><circle cx="34" cy="7" r="3" /><circle cx="16" cy="20" r="3" /><circle cx="30" cy="13" r="3" fill="#2A3B47" /></g></svg>)
    case 'data': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><g fill="#D9E1E7"><rect x="3" y="3" width="38" height="4" /><rect x="3" y="9" width="38" height="4" /><rect x="3" y="15" width="38" height="4" /><rect x="3" y="21" width="38" height="3" /></g><rect x="3" y="3" width="12" height="21" fill="#6191A5" opacity=".5" /></svg>)
    case 'efficiency': case 'eff': return (
      <svg viewBox="0 0 44 26" className="w-11 h-6"><rect x="4" y="10" width="36" height="6" rx="3" fill="#D9E1E7" /><rect x="4" y="10" width="22" height="6" rx="3" fill="#2A3B47" /></svg>)
    default: return bars([8, 14, 20, 12, 18, 10], '#9AAEB8')
  }
}

export function DeckContents({ tabs, onOpen, header }: { tabs: DeckTab[]; onOpen: (id: string) => void; header?: ReactNode }) {
  return (
    <div className="px-4 pb-4">
      {header}
      <div className="space-y-2">
        {tabs.map((t, i) => (
          <button key={t.id} type="button" onClick={() => onOpen(t.id)} className="qb-reportcard">
            <div className="qb-reportthumb"><Thumb id={t.id} /></div>
            <div className="min-w-0 flex-1">
              <span className="block text-[13.5px] font-semibold text-accent2 leading-tight">
                {t.label}{t.fantasy && <span className="qb-ffbadge">FF</span>}
              </span>
              <span className="block text-[11.5px] text-muted leading-snug mt-0.5">{reportQuestion(t.label)}</span>
            </div>
            <span className="text-[10px] font-mono text-muted2">{i + 1}/{tabs.length}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function ReportPager({ tabs, activeId, onChange, onContents, children }: {
  tabs: DeckTab[]
  activeId: string
  onChange: (id: string) => void
  onContents: () => void
  children: ReactNode
}) {
  const idx = Math.max(0, tabs.findIndex(t => t.id === activeId))
  const prev = tabs[idx - 1], next = tabs[idx + 1]
  const touch = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = (e: React.TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!touch.current) return
    const dx = e.changedTouches[0].clientX - touch.current.x
    const dy = e.changedTouches[0].clientY - touch.current.y
    touch.current = null
    // Horizontal swipe, mostly horizontal, started away from the screen edge (avoid back-gesture clash).
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0 && next) onChange(next.id)
      if (dx > 0 && prev) onChange(prev.id)
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="qb-pager">
        <button type="button" onClick={() => prev && onChange(prev.id)} disabled={!prev} className="qb-pager-arrow" aria-label="Previous report"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={onContents} className="min-w-0 flex-1 text-center" title="All reports">
          <span className="block text-[14px] font-semibold text-accent2 truncate">{tabs[idx]?.label}{tabs[idx]?.fantasy && <span className="qb-ffbadge">FF</span>}</span>
          <span className="qb-dots">
            {tabs.map((t, i) => <i key={t.id} className={clsx(i === idx && 'on')} />)}
            <small className="num">{idx + 1} of {tabs.length}</small>
          </span>
        </button>
        <button type="button" onClick={() => next && onChange(next.id)} disabled={!next} className="qb-pager-arrow" aria-label="Next report"><ChevronRight className="h-5 w-5" /></button>
      </div>
      <div className="flex items-center justify-between px-4 text-[10.5px] text-muted mb-2">
        <span className="truncate">{prev ? `‹ ${prev.label}` : ''}</span>
        <button type="button" onClick={onContents} className="inline-flex items-center gap-1 text-accent whitespace-nowrap"><LayoutList className="h-3 w-3" /> All reports</button>
        <span className="truncate text-right">{next ? `${next.label} ›` : ''}</span>
      </div>
      {children}
    </div>
  )
}
