/**
 * ContextBar — the sticky strip under the header on phones.
 *
 * Every active filter is readable in one glance and removable with ×. The
 * "Filters · N" button opens the sheet; the sparkle opens Ask. The season chip
 * is always shown (even at the default) so the context is never blank.
 */
import { SlidersHorizontal, X, Sparkles } from 'lucide-react'
import clsx from 'clsx'
import { useSlicers, countActive } from '@/lib/slicers'
import { useActiveBadges } from './useActiveBadges'

export default function ContextBar({ onOpenFilters, onOpenAsk }: {
  onOpenFilters: () => void
  onOpenAsk: () => void
}) {
  const { slicers } = useSlicers()
  const { badges } = useActiveBadges()
  const n = countActive(slicers)
  return (
    <div className="qb-contextbar">
      <img src="/logo.png" alt="" className="qb-minilogo" aria-hidden="true" />
      <button type="button" onClick={onOpenFilters} className="qb-filterbtn" aria-label="Open filters">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>Filters</span>
        <span className="qb-filterbtn-n num">{n}</span>
      </button>
      <div className="qb-chipscroll no-scrollbar">
        {badges.map(b => (
          <button key={b.key} type="button" onClick={b.clear}
            className={clsx('qb-ctxchip', b.kind === 'situation' && 'sit', b.kind === 'identity' && 'id')}
            title={b.kind === 'identity' && b.key === 'seasons' && b.label === String(slicers.seasons[0]) ? 'Season' : 'Remove'}>
            {b.label}
            {!(b.key === 'seasons' && b.label === String(slicers.seasons[0]) && slicers.seasons.length === 1) && <X className="h-3 w-3 opacity-60" />}
          </button>
        ))}
      </div>
      <button type="button" onClick={onOpenAsk} className="qb-askbtn" aria-label="Ask a question">
        <Sparkles className="h-4 w-4" />
      </button>
    </div>
  )
}
