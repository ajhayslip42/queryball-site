/**
 * DeckShell — the multi-tab report framework.
 *
 * Each deck declares its tabs (each tab = one "report"), an optional
 * fantasy-flagged tab, and the slicer groups it cares about.
 *
 * Iteration 3 styling:
 *  - Bold pill-shaped tab strip with active-color fills and numbered chips
 *  - "N REPORTS · IN THIS DECK → SWITCH TABS BELOW" banner above the tabs
 *  - Fantasy tab gets a distinct navy "FF" badge
 *  - Filter rail in its own visually-distinct .filter-rail container
 */

import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import SlicerPanel, { ActiveSlicerBadges } from '@/components/SlicerPanel'

export type DeckTab = {
  id: string
  label: string
  fantasy?: boolean   // marks the dedicated fantasy tab
  render: () => ReactNode
}

export type SlicerGroup = Parameters<typeof SlicerPanel>[0]['groups'][number]

export default function DeckShell({
  title, intro, tabs, slicerGroups, deckIndex,
  currentSubject,
}: {
  title: string
  intro: ReactNode
  tabs: DeckTab[]
  slicerGroups: SlicerGroup[]
  deckIndex: number
  currentSubject?: { label: string; sub?: string }
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id)
  const active = tabs.find(t => t.id === activeId) ?? tabs[0]

  return (
    <section className="bg-paper">
      <div className="max-w-[1400px] mx-auto px-6 py-12">

        {/* Deck header */}
        <div className="mb-8 flex items-end justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">Deck {String(deckIndex).padStart(2, '0')}</p>
            <h1 className="font-display text-4xl md:text-5xl mt-2 tracking-tight">{title}</h1>
            <div className="mt-3 text-sm text-muted max-w-2xl leading-relaxed">{intro}</div>
          </div>
          {currentSubject && (
            <div className="text-right">
              <p className="eyebrow">Currently viewing</p>
              <p className="font-display text-2xl text-accent2">{currentSubject.label}</p>
              {currentSubject.sub && <p className="text-xs text-muted">{currentSubject.sub}</p>}
            </div>
          )}
        </div>

        {/* Report-count banner */}
        <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
          <div className="deck-banner">
            <span className="deck-banner-count">{tabs.length} reports</span>
            <span>in this deck</span>
            <span className="deck-banner-arrow">→</span>
            <span className="text-muted2">switch tabs below</span>
          </div>
        </div>

        {/* Tab strip — iteration 3 pill design */}
        <div className="mb-7 overflow-x-auto no-scrollbar">
          <div className="tab-strip" role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === activeId}
                onClick={() => setActiveId(t.id)}
                className={clsx('tab-pill', t.fantasy && 'fantasy', t.id === activeId && 'active')}
              >
                <span className="tab-num">{String(i + 1).padStart(2, '0')}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout: filter rail + content */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3">
            <div className="sticky top-20">
              <SlicerPanel groups={slicerGroups} />
            </div>
          </div>
          <div className="col-span-12 lg:col-span-9 min-w-0">
            <ActiveSlicerBadges />
            <div key={active.id} className="fade-in">
              {active.render()}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* -------------------- helper components used inside tabs -------------------- */

export function Tile({ title, subtitle, children, span = 1, className = '' }: {
  title?: string; subtitle?: string; children: ReactNode; span?: 1 | 2 | 3 | 4 | 6 | 12; className?: string
}) {
  return (
    <div className={clsx(
      'qcard p-5 col-span-12',
      span === 1 ? 'lg:col-span-3' :
      span === 2 ? 'lg:col-span-4' :
      span === 3 ? 'lg:col-span-6' :
      span === 4 ? 'lg:col-span-8' :
      span === 6 ? 'lg:col-span-9' : 'lg:col-span-12',
      className,
    )}>
      {title && (
        <header className="mb-3">
          <h4 className="font-display text-xl leading-tight">{title}</h4>
          {subtitle && <p className="text-[11px] text-muted mt-0.5">{subtitle}</p>}
        </header>
      )}
      {children}
    </div>
  )
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-12 gap-4 mb-4">{children}</div>
}

export function StatBlock({ label, value, trend, sub }: {
  label: string; value: string | number; trend?: { dir: 'up' | 'down'; value: string }; sub?: string
}) {
  return (
    <div className="qcard p-5">
      <p className="stat-label">{label}</p>
      <p className="stat-num num">
        {value}
        {trend && <span className={clsx('stat-trend ml-1', trend.dir)}>{trend.dir === 'up' ? '↑' : '↓'}{trend.value}</span>}
      </p>
      {sub && <p className="text-xs text-muted mt-2">{sub}</p>}
    </div>
  )
}

export function ComingSoon({ deck, note }: { deck: string; note?: string }) {
  return (
    <div className="qcard p-10 text-center">
      <p className="font-display text-3xl mb-2">{deck}</p>
      <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
        {note ?? 'Framework is wired up. The visualizations follow the Single Player Productivity template — copy that tab structure to fill this in.'}
      </p>
    </div>
  )
}
