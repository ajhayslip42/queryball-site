/**
 * PlayerPicker — the primary slicer on the Single Player deck.
 *
 * Visually distinct from the rest of the filter rail: this is the headline
 * control. Searchable across all positions; when a player is selected, the
 * URL updates (`?pid=<gsis_id>`) and the Single Player deck routes to the
 * view for that player's position (QB / RB / WR / TE).
 *
 * Once parquet data is wired, swap the static PLAYERS list in lib/players.ts
 * for a useQuery() against the players table — type stays the same.
 */

import { useState, useRef, useEffect } from 'react'
import { useSlicers } from '@/lib/slicers'
import { DEFAULT_PLAYER, type Player } from '@/lib/players'
import { usePlayerIndex } from '@/lib/usePlayerIndex'
import { Search, X, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const POSITION_COLOR: Record<Player['position'], string> = {
  QB: '#6191A5',  // steel blue
  RB: '#2A3B47',  // navy
  WR: '#3F8060',  // sage green
  TE: '#A0594B',  // terracotta
}

export default function PlayerPicker({ onPlayerChange }: {
  onPlayerChange?: (player: Player) => void
}) {
  const { slicers, update } = useSlicers()
  const { byId, search, loading } = usePlayerIndex()
  const currentId = slicers.playerIds[0]
  const player = (currentId ? byId.get(currentId) : undefined) ?? DEFAULT_PLAYER

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = search(query, 20)

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Focus the input when the dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  function select(p: Player) {
    update({ playerIds: [p.gsis_id] })
    onPlayerChange?.(p)
    setOpen(false)
    setQuery('')
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation()
    update({ playerIds: [DEFAULT_PLAYER.gsis_id] })
    onPlayerChange?.(DEFAULT_PLAYER)
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Eyebrow label — makes it unmistakable */}
      <p className="group-label mb-2 flex items-center gap-2">
        <span className="text-accent2 font-bold">Selected Player</span>
        <span className="text-muted2">·</span>
        <span className="text-muted">primary slicer</span>
      </p>

      {/* The big button */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-3 px-3 py-3 rounded-lg border-2 transition-all',
          'bg-paper border-railedge hover:border-accent text-left',
          open && 'border-accent shadow-pop'
        )}
      >
        {/* Position badge */}
        <span
          className="flex-shrink-0 w-10 h-10 rounded-md flex items-center justify-center text-paper font-bold text-sm"
          style={{ backgroundColor: POSITION_COLOR[player.position] }}
        >
          {player.position}
        </span>

        {/* Name + team */}
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg leading-tight truncate">{player.name}</p>
          <p className="text-[11px] text-muted mt-0.5">
            {player.team}
            {player.jersey != null && ` · #${player.jersey}`}
          </p>
        </div>

        {/* Caret */}
        <ChevronDown className={clsx('h-4 w-4 text-muted transition-transform flex-shrink-0', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-2 w-full max-w-md bg-paper border border-line rounded-lg shadow-pop overflow-hidden fade-in">
          {/* Search input */}
          <div className="relative border-b border-line">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search any QB, RB, WR, or TE…"
              className="w-full pl-10 pr-10 py-3 text-sm focus:outline-none bg-paper"
            />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Results */}
          <div className="max-h-80 overflow-y-auto">
            {results.length === 0 && (
              <p className="px-4 py-6 text-sm text-muted text-center">{loading ? 'Loading players…' : `No players matching "${query}".`}</p>
            )}
            {results.map(p => (
              <button
                key={p.gsis_id + p.name}
                type="button"
                onClick={() => select(p)}
                className={clsx(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-cream transition-colors',
                  p.gsis_id === player.gsis_id && 'bg-chalk'
                )}
              >
                <span
                  className="flex-shrink-0 w-8 h-8 rounded-md flex items-center justify-center text-paper font-bold text-[11px]"
                  style={{ backgroundColor: POSITION_COLOR[p.position] }}
                >
                  {p.position}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.name}</p>
                  <p className="text-[11px] text-muted">{p.team}{p.jersey != null && ` · #${p.jersey}`}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Footer hint */}
          <div className="border-t border-line bg-cream px-3 py-2">
            <p className="text-[11px] text-muted">
              Selecting a player automatically loads the view shaped for their position.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
