/**
 * AskBox — type a question, get a sentence you can edit.
 *
 * Runs the phrase dictionary (lib/ask.ts) on submit, shows what it understood
 * as chips, asks about anything vague, and applies the filters. On a deck it
 * applies in place; from Home it navigates to the deck the question implies.
 * If an `/api/ask` Worker is deployed, unresolved leftovers are sent there.
 */
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import clsx from 'clsx'
import { useSlicers, DEFAULTS, encodeSlicers, type Slicers } from '@/lib/slicers'
import { parseQuestion, askRemote, type AskResult, type AskOption } from '@/lib/ask'
import { usePlayerIndex } from '@/lib/usePlayerIndex'
import type { Player } from '@/lib/players'

const EXAMPLES = [
  'Jefferson when trailing in the 4th quarter',
  'Chiefs RBs on 3rd and short',
  'WR deep targets in close games',
  'Bills defense in the red zone',
]

const encodePatch = (p: Partial<Slicers>) => encodeSlicers({ ...DEFAULTS, ...p }).toString()

export default function AskBox({ onApplied, autoFocus = false, compact = false }: {
  onApplied?: () => void
  autoFocus?: boolean
  compact?: boolean
}) {
  const { slicers, update } = useSlicers()
  const { players, loading: rosterLoading } = usePlayerIndex()
  const navigate = useNavigate()
  const loc = useLocation()
  const onDeck = loc.pathname.startsWith('/decks/')
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<AskResult | null>(null)
  const [pending, setPending] = useState<Partial<Slicers> | null>(null)

  const applyPatch = (patch: Partial<Slicers>, deck?: string) => {
    if (onDeck && (!deck || deck === loc.pathname || !patch.playerIds)) {
      update(patch); onApplied?.()
    } else {
      const merged = onDeck ? { ...slicers, ...patch } : { ...DEFAULTS, ...patch }
      navigate(`${deck ?? '/decks/league-production'}?${encodePatch(merged)}`); onApplied?.()
    }
  }

  const run = async () => {
    if (!q.trim()) return
    setBusy(true)
    let r = parseQuestion(q, players)
    if (r.unresolved.some(u => !u.options) && Object.keys(r.patch).length === 0) {
      const remote = await askRemote(q, { understood: r.understood })
      if (remote) r = { ...r, patch: { ...r.patch, ...remote.patch }, understood: [...r.understood, ...remote.understood], unresolved: remote.unresolved }
    }
    setBusy(false)
    setRes(r)
    const needsChoice = r.playerCandidates || r.unresolved.some(u => u.options)
    if (!needsChoice) {
      if (Object.keys(r.patch).length) applyPatch(r.patch, r.deck)
    } else {
      setPending(r.patch)
    }
  }

  const choose = (opt: AskOption) => {
    const patch = { ...(pending ?? {}), ...opt.patch }
    setPending(patch)
    setRes(r => r ? { ...r, unresolved: r.unresolved.filter(u => !u.options), understood: [...r.understood, opt.label] } : r)
    if (!res?.playerCandidates) applyPatch(patch, res?.deck)
  }
  const choosePlayer = (p: Player) => {
    const patch = { ...(pending ?? {}), playerIds: [p.gsis_id] }
    setPending(patch)
    setRes(r => r ? { ...r, playerCandidates: undefined, player: p, understood: [p.name, ...r.understood] } : r)
    if (!res?.unresolved.some(u => u.options)) applyPatch(patch, '/decks/single-player')
  }

  return (
    <div className={clsx('qb-ask', compact && 'compact')}>
      <form onSubmit={e => { e.preventDefault(); run() }} className="qb-ask-row">
        <Sparkles className="h-4 w-4 text-accent flex-shrink-0" />
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus={autoFocus}
          placeholder={rosterLoading ? 'Loading players…' : 'Ask: "Jefferson when trailing late"'}
          className="qb-ask-input" aria-label="Ask a question" />
        <button type="submit" className="qb-ask-go" aria-label="Go" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        </button>
      </form>

      {!res && !compact && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map(e => (
            <button key={e} type="button" onClick={() => setQ(e)} className="chip text-[11px] text-muted">{e}</button>
          ))}
        </div>
      )}

      {res && (
        <div className="mt-2 space-y-2">
          {res.understood.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted">Understood:</span>
              {res.understood.map(u => <span key={u} className="qb-ctxchip sit">{u}</span>)}
            </div>
          )}
          {res.playerCandidates && (
            <div className="qb-ask-prompt">
              <p>Which one?</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {res.playerCandidates.map(p => (
                  <button key={p.gsis_id} type="button" onClick={() => choosePlayer(p)} className="chip">{p.name} <span className="text-muted text-[10px]">{p.position} · {p.team}</span></button>
                ))}
              </div>
            </div>
          )}
          {res.unresolved.filter(u => u.options).map(u => (
            <div key={u.text} className="qb-ask-prompt">
              <p>I wasn't sure about <b>“{u.text}”</b> — did you mean:</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {u.options!.map(o => <button key={o.label} type="button" onClick={() => choose(o)} className="chip">{o.label}</button>)}
              </div>
            </div>
          ))}
          {res.unresolved.filter(u => !u.options).length > 0 && (
            <p className="text-[11px] text-muted">
              Didn't use: {res.unresolved.filter(u => !u.options).map(u => `“${u.text}”`).join(', ')}. Set those in Filters.
            </p>
          )}
          {res.understood.length === 0 && !res.playerCandidates && (
            <p className="text-[11px] text-muted">Nothing I could map. Try a player, a team, a down, or a score state.</p>
          )}
        </div>
      )}
    </div>
  )
}
