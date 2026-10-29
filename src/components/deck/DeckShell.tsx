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

import { useEffect, useRef, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import SlicerPanel, { ActiveSlicerBadges } from '@/components/SlicerPanel'
import { useIsMobile } from '@/lib/useIsMobile'
import ContextBar from '@/components/mobile/ContextBar'
import FilterSheet from '@/components/mobile/FilterSheet'
import SituationsPanel from '@/components/mobile/SituationsPanel'
import { DeckContents, ReportPager } from '@/components/mobile/DeckContents'
import { ContextStamp, ShareButton } from '@/components/mobile/Share'

export type DeckTab = {
  id: string
  label: string
  fantasy?: boolean   // marks the dedicated fantasy tab
  render: () => ReactNode
}

export type SlicerGroup = Parameters<typeof SlicerPanel>[0]['groups'][number]

export default function DeckShell({
  title, intro, tabs, slicerGroups, deckIndex,
  currentSubject, showPlayerPicker = false, prefixContent,
}: {
  title: string
  intro: ReactNode
  tabs: DeckTab[]
  slicerGroups: SlicerGroup[]
  deckIndex: number
  currentSubject?: { label: string; sub?: string }
  showPlayerPicker?: boolean
  /** Optional content rendered directly above the tab strip. Used by decks
   * that need an in-deck toggle (e.g. WR/TE selector on Pass Catchers). */
  prefixContent?: ReactNode
}) {
  const [activeId, setActiveId] = useState(tabs[0]?.id)
  const active = tabs.find(t => t.id === activeId) ?? tabs[0]

  /* ------------------------------------------------------------------
   * Phone layout (below lg). The desktop layout below is untouched: the
   * rail, tab strip and report canvas render exactly as before at lg+.
   * ---------------------------------------------------------------- */
  const isMobile = useIsMobile(1024)
  const [view, setView] = useState<'contents' | 'report'>('contents')
  const [sheet, setSheet] = useState<null | 'filters' | 'ask' | 'situations'>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  useEffect(() => { if (isMobile && view === 'report') window.scrollTo({ top: 0 }) }, [activeId, view, isMobile])

  if (isMobile) {
    const openReport = (id: string) => { setActiveId(id); setView('report') }
    const header = (
      <div className="pt-4 pb-3">
        <p className="eyebrow">Deck {String(deckIndex).padStart(2, '0')}</p>
        <h1 className="font-display text-3xl mt-1 tracking-tight leading-tight">{title}</h1>
        {currentSubject && (
          <p className="mt-1 text-[13px]"><span className="text-muted">Viewing </span><span className="font-semibold text-accent2">{currentSubject.label}</span>{currentSubject.sub && <span className="text-muted"> · {currentSubject.sub}</span>}</p>
        )}
        <div className="mt-2 text-[12.5px] text-muted leading-relaxed">{intro}</div>
        {prefixContent && <div className="mt-3">{prefixContent}</div>}
        <p className="eyebrow mt-4 mb-2">{tabs.length} reports · tap one</p>
      </div>
    )
    return (
      <section className="bg-paper qb-mobile-deck">
        <ContextBar onOpenFilters={() => setSheet('filters')} onOpenAsk={() => setSheet('ask')} />
        {view === 'contents' ? (
          <DeckContents tabs={tabs} onOpen={openReport} header={header} />
        ) : (
          <ReportPager tabs={tabs} activeId={active.id} onChange={openReport} onContents={() => setView('contents')}>
            {prefixContent && <div className="px-3 mb-3">{prefixContent}</div>}
            <div className="px-3 pb-6">
              <div ref={canvasRef} className="qb-canvas">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-muted truncate">{currentSubject?.label ?? title}</span>
                  <ShareButton target={canvasRef} title={active.label} />
                </div>
                <div key={active.id} className="fade-in">
                  {active.render()}
                </div>
                <ContextStamp title={active.label} />
              </div>
            </div>
          </ReportPager>
        )}
        <FilterSheet open={sheet !== null} onClose={() => setSheet(null)} groups={slicerGroups}
          showPlayerPicker={showPlayerPicker} initialTab={sheet ?? 'filters'} />
      </section>
    )
  }

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

        {/* Prefix content (in-deck toggles, subject selectors, etc.) */}
        {prefixContent}

        {/* Reports label — the tab bar itself carries the visual weight; no counter banner. */}
        <p className="eyebrow mb-2">Reports</p>

        {/* Tab strip — dramatically more prominent than before; no numeric prefixes. */}
        <div className="mb-6 overflow-x-auto no-scrollbar">
          <div className="tab-strip" role="tablist">
            {tabs.map(t => (
              <button
                key={t.id}
                role="tab"
                aria-selected={t.id === activeId}
                onClick={() => setActiveId(t.id)}
                className={clsx('tab-pill', t.fantasy && 'fantasy', t.id === activeId && 'active')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Layout: filter rail + content. Flex so the content column expands
         *   naturally when the rail collapses to its skinny state. */}
        <div className="flex flex-col lg:flex-row gap-5">
          <div className="lg:sticky lg:top-20 lg:self-start lg:flex-shrink-0">
            <SlicerPanel groups={slicerGroups} showPlayerPicker={showPlayerPicker} />
          </div>
          <div className="flex-1 min-w-0">
            {/* Situations — one-tap filter bundles. Additive: the rail still
             * holds every individual slicer; these just apply several at once. */}
            <details className="qb-situations-desktop mb-4">
              <summary className="eyebrow cursor-pointer select-none inline-flex items-center gap-2">Situations <span className="normal-case tracking-normal text-muted2">one tap, several filters</span></summary>
              <div className="mt-2"><SituationsPanel mode="compact" /></div>
            </details>
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
