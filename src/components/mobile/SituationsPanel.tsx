/**
 * SituationsPanel — one-tap filter bundles, with the explainer one tap away.
 *
 * Two modes:
 *   compact — a chip row (used in the filter sheet and above desktop reports)
 *   cards   — every situation as a card stating what it sets and why
 */
import { useState } from 'react'
import clsx from 'clsx'
import { Shuffle, ChevronDown } from 'lucide-react'
import { useSlicers } from '@/lib/slicers'
import { SITUATIONS, SITUATION_GROUPS, isSituationActive, applySituation, clearSituation, randomSituation, activeSituations, type Situation } from '@/lib/situations'

export function useSituationToggle() {
  const { slicers, update } = useSlicers()
  const toggle = (sit: Situation) => update(isSituationActive(slicers, sit) ? clearSituation(sit) : applySituation(sit))
  const surprise = (): Situation => {
    const sit = randomSituation(activeSituations(slicers).map(s => s.id))
    update(applySituation(sit))
    return sit
  }
  return { slicers, toggle, surprise }
}

export default function SituationsPanel({ mode = 'compact', onSurprise }: {
  mode?: 'compact' | 'cards'
  onSurprise?: (sit: Situation) => void
}) {
  const { slicers, toggle, surprise } = useSituationToggle()
  const [explain, setExplain] = useState(mode === 'cards')
  const [last, setLast] = useState<Situation | null>(null)

  const doSurprise = () => { const s = surprise(); setLast(s); onSurprise?.(s) }

  if (!explain) {
    return (
      <div>
        <div className="flex flex-wrap gap-1.5">
          {SITUATIONS.map(s => (
            <button key={s.id} type="button" onClick={() => toggle(s)} title={s.sets}
              className={clsx('qb-sitchip', isSituationActive(slicers, s) && 'on')}>{s.label}</button>
          ))}
          <button type="button" onClick={doSurprise} className="qb-sitchip ghost"><Shuffle className="h-3 w-3" /> Surprise me</button>
        </div>
        <div className="mt-1.5 flex items-center justify-between">
          <button type="button" onClick={() => setExplain(true)} className="text-[11px] text-accent inline-flex items-center gap-1">
            What do these set? <ChevronDown className="h-3 w-3" />
          </button>
          {last && <span className="text-[11px] text-muted">Applied: <b className="text-accent2">{last.label}</b></span>}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {SITUATION_GROUPS.map(g => {
        const items = SITUATIONS.filter(s => s.group === g.id)
        if (!items.length) return null
        return (
          <div key={g.id}>
            <p className="eyebrow mb-1.5">{g.label}</p>
            <div className="space-y-1.5">
              {items.map(s => {
                const on = isSituationActive(slicers, s)
                return (
                  <button key={s.id} type="button" onClick={() => toggle(s)}
                    className={clsx('w-full text-left rounded-lg border px-3 py-2 transition-colors', on ? 'border-accent bg-[#F3F7F9]' : 'border-line bg-paper')}>
                    <span className="flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold text-accent2">{s.label}</span>
                      <span className={clsx('text-[10px] font-mono rounded-full px-2 py-0.5', on ? 'bg-accent2 text-paper' : 'bg-chalk text-muted')}>{on ? 'applied' : 'tap to apply'}</span>
                    </span>
                    <span className="block text-[11px] text-ink mt-0.5"><span className="text-muted">Sets:</span> {s.sets}</span>
                    <span className="block text-[11px] text-muted leading-snug"><span className="text-muted">Why:</span> {s.why}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <button type="button" onClick={doSurprise}
        className="w-full rounded-lg border border-dashed border-accent px-3 py-2.5 text-[12.5px] font-semibold text-accent2 inline-flex items-center justify-center gap-2">
        <Shuffle className="h-3.5 w-3.5" /> Surprise me — pick a random situation
      </button>
      {mode === 'compact' && (
        <button type="button" onClick={() => setExplain(false)} className="text-[11px] text-accent">Back to chips</button>
      )}
    </div>
  )
}
