/**
 * FilterSheet — the phone replacement for the slicer rail.
 *
 * Slides up over the report. Simple mode shows the big four (season, weeks,
 * position, team), the player picker where relevant, and the Situations
 * library. Pro mode shows every group as an accordion with an active-filter
 * count, using the football-shaped pickers. A live match count and a
 * "Show results" button sit at the bottom of both.
 *
 * Groups hide themselves when irrelevant: kickers have no targets, a defense
 * deck has no run-direction filter of its own, and so on — the `groups` prop
 * each deck already passes to SlicerPanel decides what appears here too.
 */
import { useEffect, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Check, RotateCcw, ChevronDown } from 'lucide-react'
import { useSlicers, countActive, DEFAULTS, thresholdsForPositions, THRESH_LABELS, type ThreshKey, type Threshold } from '@/lib/slicers'
import type { Group } from '@/components/SlicerPanel'
import { TEAMS, POSITIONS } from '@/lib/nfl'
import PlayerPicker from '@/components/PlayerPicker'
import { useMatchCount } from '@/lib/useMatchCount'
import SituationsPanel from './SituationsPanel'
import AskBox from './AskBox'
import ScoringPanel from '@/components/ScoringPanel'
import { useScoring, scoringLabel } from '@/lib/scoring'
import { FieldPicker, DownDistanceGrid, ScorePicker, ClockPicker, DepthPicker, RunDirPicker, TriRow, Why } from './Pickers'

const SEASONS = [2023, 2024, 2025, 2026]
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1)
const PLAYOFF: [number, string][] = [[19, 'WC'], [20, 'DV'], [21, 'CC'], [22, 'SB']]
const MODE_KEY = 'qb.filterMode'

export default function FilterSheet({ open, onClose, groups, showPlayerPicker = false, initialTab = 'filters', initialGroup }: {
  open: boolean
  onClose: () => void
  groups: readonly Group[]
  showPlayerPicker?: boolean
  initialTab?: 'filters' | 'ask' | 'situations'
  /** Open straight to a Pro group, e.g. 'scoring' (used by the Matchup page). */
  initialGroup?: 'scoring'
}) {
  const { slicers, update, reset } = useSlicers()
  const [scoring] = useScoring()
  const [mode, setMode] = useState<'simple' | 'pro'>(() => {
    try { return (localStorage.getItem(MODE_KEY) as 'simple' | 'pro') || 'simple' } catch { return 'simple' }
  })
  const [tab, setTab] = useState<'filters' | 'ask' | 'situations'>(initialTab)
  useEffect(() => { if (open) { setTab(initialTab); if (initialGroup) setMode('pro') } }, [open, initialTab, initialGroup])
  useEffect(() => { try { localStorage.setItem(MODE_KEY, mode) } catch { /* private mode */ } }, [mode])
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const { count, loading } = useMatchCount(slicers)
  const has = (g: Group) => groups.includes(g)
  const toggle = (field: 'seasons' | 'weeks' | 'positions' | 'teams' | 'opponents' | 'playTypes', value: any) => {
    const arr = (slicers[field] as any[]) ?? []
    update({ [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] } as any)
  }

  if (!open) return null
  return (
    <>
      <div className="qb-sheet-scrim" onClick={onClose} />
      <div className="qb-sheet" role="dialog" aria-label="Filters">
        <div className="qb-sheet-handle" />
        {/* Header: tabs on the left, Apply pinned top-right. Apply is always in
         * view no matter how far the body scrolls, and closes the sheet (filters
         * apply live as you tap them). */}
        <div className="qb-sheet-head">
          <div className="flex items-center gap-2 min-w-0">
            {(['filters', 'situations', 'ask'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)} className={clsx('qb-sheet-tab', tab === t && 'on')}>
                {t === 'filters' ? 'Filters' : t === 'situations' ? 'Situations' : 'Ask'}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} className="qb-apply" aria-label="Apply filters and close">
            <Check className="h-3.5 w-3.5" /> Apply{countActive(slicers) ? ` · ${countActive(slicers)}` : ''}
          </button>
        </div>
        {tab === 'filters' && (
          <div className="qb-sheet-sub">
            <span className="text-[11.5px] text-muted num">
              {loading || count == null ? '…' : <><b className="text-accent2">{count.toLocaleString()}</b> plays match</>}
              {count != null && count > 0 && count < 40 && <span className="text-bad"> · thin slice</span>}
              {count === 0 && <span className="text-bad"> · nothing matches</span>}
            </span>
            <div className="qb-seg">
              <button type="button" className={clsx(mode === 'simple' && 'on')} onClick={() => setMode('simple')}>Simple</button>
              <button type="button" className={clsx(mode === 'pro' && 'on')} onClick={() => setMode('pro')}>Pro</button>
            </div>
          </div>
        )}

        <div className="qb-sheet-body">
          {tab === 'ask' && (
            <div className="space-y-3">
              <p className="text-[12px] text-muted leading-snug">Type the situation in football English. I'll turn it into filters and show you what I understood.</p>
              <AskBox autoFocus onApplied={() => setTab('filters')} />
            </div>
          )}

          {tab === 'situations' && (
            <div className="space-y-3">
              <p className="text-[12px] text-muted leading-snug">One tap sets several filters at once. Each card says exactly what it changes and why it matters.</p>
              <SituationsPanel mode="cards" />
            </div>
          )}

          {tab === 'filters' && mode === 'simple' && (
            <div className="space-y-4">
              {showPlayerPicker && <div className="qb-sheet-card"><PlayerPicker /></div>}
              {has('season') && (
                <Row label="Season">
                  <div className="flex gap-1">
                    {SEASONS.map(s => <Chip key={s} on={slicers.seasons.includes(s)} onClick={() => toggle('seasons', s)}>{s}</Chip>)}
                  </div>
                </Row>
              )}
              {has('week') && (
                <Row label="Weeks" hint={slicers.weeks.length ? `${slicers.weeks.length} selected` : 'All weeks'}>
                  <WeekGrid weeks={slicers.weeks} onToggle={w => toggle('weeks', w)} onClear={() => update({ weeks: [] })} />
                </Row>
              )}
              {has('position') && (
                <Row label="Position">
                  <div className="grid grid-cols-4 gap-1">
                    {POSITIONS.map(p => <Chip key={p} on={slicers.positions.includes(p)} onClick={() => toggle('positions', p)} block>{p}</Chip>)}
                  </div>
                </Row>
              )}
              {has('team') && (
                <Row label="Team" hint={slicers.teams.length ? slicers.teams.join(', ') : 'All teams'}>
                  <TeamGrid selected={slicers.teams} onToggle={t => toggle('teams', t)} />
                </Row>
              )}
              <Row label="Situations" hint="one tap, several filters">
                <SituationsPanel mode="compact" />
              </Row>
              <Row label="Scoring" hint={scoringLabel(scoring)}>
                <ScoringPanel compact />
              </Row>
              <button type="button" onClick={() => setMode('pro')}
                className="w-full rounded-lg border border-dashed border-accent px-3 py-2.5 text-[12.5px] font-semibold text-accent2">
                Build your own situation →
              </button>
            </div>
          )}

          {tab === 'filters' && mode === 'pro' && (
            <div className="space-y-1">
              {showPlayerPicker && <div className="qb-sheet-card mb-2"><PlayerPicker /></div>}
              <Acc title="Who" count={slicers.positions.length + slicers.teams.length + slicers.opponents.length}>
                {has('position') && (
                  <Sub label="Position"><div className="grid grid-cols-4 gap-1">{POSITIONS.map(p => <Chip key={p} on={slicers.positions.includes(p)} onClick={() => toggle('positions', p)} block>{p}</Chip>)}</div></Sub>
                )}
                {has('team') && <Sub label="Team"><TeamGrid selected={slicers.teams} onToggle={t => toggle('teams', t)} /></Sub>}
                {has('opponent') && <Sub label="Opponent"><TeamGrid selected={slicers.opponents} onToggle={t => toggle('opponents', t)} /></Sub>}
              </Acc>
              <Acc title="When" count={(slicers.seasons.length !== 1 || slicers.seasons[0] !== DEFAULTS.seasons[0] ? 1 : 0) + (slicers.weeks.length ? 1 : 0) + (slicers.seasonType !== 'regular' ? 1 : 0)}>
                {has('season') && <Sub label="Season"><div className="flex gap-1">{SEASONS.map(s => <Chip key={s} on={slicers.seasons.includes(s)} onClick={() => toggle('seasons', s)}>{s}</Chip>)}</div></Sub>}
                {has('week') && <Sub label="Weeks"><WeekGrid weeks={slicers.weeks} onToggle={w => toggle('weeks', w)} onClear={() => update({ weeks: [] })} /></Sub>}
                <Sub label="Season type">
                  <div className="grid grid-cols-3 gap-1">
                    {(['regular', 'postseason', 'all'] as const).map(v => <Chip key={v} on={slicers.seasonType === v} onClick={() => update({ seasonType: v })} block>{v === 'regular' ? 'Regular' : v === 'postseason' ? 'Playoffs' : 'Both'}</Chip>)}
                  </div>
                </Sub>
              </Acc>
              {(has('down') || has('distance')) && (
                <Acc title="Down & distance" count={(slicers.downs.length ? 1 : 0) + (slicers.distances.length ? 1 : 0)}>
                  <DownDistanceGrid />
                </Acc>
              )}
              {has('score') && (
                <Acc title="Score" count={slicers.scoreStates.length ? 1 : 0}><ScorePicker /></Acc>
              )}
              {has('zone') && (
                <Acc title="Field position" count={slicers.zones.length ? 1 : 0}><FieldPicker /></Acc>
              )}
              {has('qtr') && (
                <Acc title="Clock" count={(slicers.quarters.length ? 1 : 0) + (slicers.twoMinute !== 'all' ? 1 : 0)}><ClockPicker /></Acc>
              )}
              {(has('passDepth') || has('pressure') || has('playType')) && (
                <Acc title="Passing" count={(slicers.passDepth.length ? 1 : 0) + (slicers.passDir.length ? 1 : 0) + (slicers.pressure !== 'all' ? 1 : 0)}>
                  {has('passDepth') && <DepthPicker />}
                  {has('pressure') && <div className="mt-2"><TriRow label="QB hit on the play" value={slicers.pressure} onChange={v => update({ pressure: v })} yes="Hit" no="Clean" /></div>}
                </Acc>
              )}
              {has('runDir') && (
                <Acc title="Rushing" count={slicers.runDir.length ? 1 : 0}><RunDirPicker /></Acc>
              )}
              {(has('playType') || has('shotgun') || has('homeAway')) && (
                <Acc title="Play type & formation" count={(slicers.playTypes.length ? 1 : 0) + (slicers.shotgun !== 'all' ? 1 : 0) + (slicers.noHuddle !== 'all' ? 1 : 0) + (slicers.homeAway !== 'all' ? 1 : 0)}>
                  {has('playType') && (
                    <Sub label="Play type">
                      <div className="grid grid-cols-3 gap-1">
                        {(['pass', 'run', 'special'] as const).map(t => <Chip key={t} on={slicers.playTypes.includes(t)} onClick={() => toggle('playTypes', t)} block>{t === 'pass' ? 'Pass' : t === 'run' ? 'Run' : 'Special'}</Chip>)}
                      </div>
                    </Sub>
                  )}
                  {has('shotgun') && (<>
                    <TriRow label="Shotgun" value={slicers.shotgun} onChange={v => update({ shotgun: v })} yes="Shotgun" no="Under center" />
                    <TriRow label="No-huddle" value={slicers.noHuddle} onChange={v => update({ noHuddle: v })} yes="No-huddle" no="Huddle" />
                  </>)}
                  {has('homeAway') && (
                    <Sub label="Venue">
                      <div className="grid grid-cols-3 gap-1">
                        {(['home', 'away', 'all'] as const).map(v => <Chip key={v} on={slicers.homeAway === v} onClick={() => update({ homeAway: v })} block>{v === 'all' ? 'Any' : v === 'home' ? 'Home' : 'Away'}</Chip>)}
                      </div>
                    </Sub>
                  )}
                </Acc>
              )}
              {has('threshold') && (
                <Acc title="Usage thresholds" count={(['passAtt', 'targets', 'rushAtt', 'rec'] as ThreshKey[]).filter(k => slicers.thresholds[k][0] != null || slicers.thresholds[k][1] != null).length}>
                  {thresholdsForPositions(slicers.positions).map(k => (
                    <ThreshRow key={k} label={THRESH_LABELS[k]} value={slicers.thresholds[k]} onChange={v => update({ thresholds: { ...slicers.thresholds, [k]: v } })} />
                  ))}
                  <Why>Keeps only players whose season total in this slice falls in range — e.g. receivers with 40+ targets.</Why>
                </Acc>
              )}
              <Acc title="Scoring" count={scoringLabel(scoring) === 'PPR · 4-pt pass TD' ? 0 : 1} open={initialGroup === 'scoring'}>
                <ScoringPanel compact />
              </Acc>
              <Acc title="Weather & venue" count={slicers.roof.length + slicers.surface.length}>
                <Sub label="Roof">
                  <div className="grid grid-cols-4 gap-1">
                    {(['dome', 'outdoors', 'open', 'closed'] as const).map(r => <Chip key={r} on={slicers.roof.includes(r)} onClick={() => update({ roof: slicers.roof.includes(r) ? slicers.roof.filter(v => v !== r) : [...slicers.roof, r] })} block>{r}</Chip>)}
                  </div>
                </Sub>
                <Sub label="Surface">
                  <div className="grid grid-cols-2 gap-1">
                    {(['grass', 'turf'] as const).map(s => <Chip key={s} on={slicers.surface.includes(s)} onClick={() => update({ surface: slicers.surface.includes(s) ? slicers.surface.filter(v => v !== s) : [...slicers.surface, s] })} block>{s}</Chip>)}
                  </div>
                </Sub>
              </Acc>
            </div>
          )}
        </div>

        <div className="qb-sheet-foot">
          <button type="button" onClick={reset} className="inline-flex items-center gap-1 text-[11.5px] text-muted"><RotateCcw className="h-3 w-3" /> Reset all</button>
          <span className="text-[11.5px] text-muted num">
            {loading || count == null ? '…' : <><b className="text-accent2">{count.toLocaleString()}</b> plays match</>}
          </span>
          <button type="button" onClick={onClose} className="qb-cta">Show results</button>
        </div>
      </div>
    </>
  )
}

/* ---------------- atoms ---------------- */
function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="group-label">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
function Sub({ label, children }: { label: string; children: ReactNode }) {
  return <div className="py-1.5"><p className="text-[10.5px] text-muted mb-1">{label}</p>{children}</div>
}
function Chip({ on, onClick, children, block = false }: { on: boolean; onClick: () => void; children: ReactNode; block?: boolean }) {
  return <button type="button" onClick={onClick} className={clsx('chip text-[12px] py-1.5', block && 'justify-center', on && 'applied')}>{children}</button>
}
function Acc({ title, count, open: initial = false, children }: { title: string; count: number; open?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(initial || count > 0)
  return (
    <div className="border-b border-line">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-2.5 text-left">
        <span className="text-[13px] font-semibold text-accent2 inline-flex items-center gap-2">
          {title}
          <span className={clsx('text-[10px] font-mono rounded-full px-1.5 py-0.5', count > 0 ? 'bg-[#E6EFF4] text-accent' : 'bg-chalk text-muted')}>{count}</span>
        </span>
        <ChevronDown className={clsx('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  )
}
function WeekGrid({ weeks, onToggle, onClear }: { weeks: number[]; onToggle: (w: number) => void; onClear: () => void }) {
  return (
    <div>
      <div className="grid grid-cols-9 gap-1">
        {WEEKS.map(w => <button key={w} type="button" onClick={() => onToggle(w)} className={clsx('chip justify-center text-[11px] px-0', weeks.includes(w) && 'applied')}>{w}</button>)}
      </div>
      <div className="grid grid-cols-4 gap-1 mt-1">
        {PLAYOFF.map(([w, l]) => <button key={w} type="button" onClick={() => onToggle(w)} className={clsx('chip justify-center text-[11px]', weeks.includes(w) && 'applied')} title="Playoffs">{l}</button>)}
        {weeks.length > 0 && <button type="button" onClick={onClear} className="col-span-4 text-[11px] text-accent mt-1">Clear weeks (all)</button>}
      </div>
    </div>
  )
}
function TeamGrid({ selected, onToggle }: { selected: string[]; onToggle: (t: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1">
      {TEAMS.map(t => <button key={t} type="button" onClick={() => onToggle(t)} className={clsx('chip justify-center text-[10px] px-0 py-1.5', selected.includes(t) && 'applied')}>{t}</button>)}
    </div>
  )
}
function ThreshRow({ label, value, onChange }: { label: string; value: Threshold; onChange: (v: Threshold) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[12px] text-ink flex-1">{label}</span>
      <input type="number" inputMode="numeric" min={0} placeholder="min" value={value[0] ?? ''} aria-label={`${label} minimum`}
        onChange={e => onChange([e.target.value === '' ? null : Number(e.target.value), value[1]])}
        className="w-16 rounded border border-line bg-paper px-2 py-1 text-[12px] num" />
      <input type="number" inputMode="numeric" min={0} placeholder="max" value={value[1] ?? ''} aria-label={`${label} maximum`}
        onChange={e => onChange([value[0], e.target.value === '' ? null : Number(e.target.value)])}
        className="w-16 rounded border border-line bg-paper px-2 py-1 text-[12px] num" />
    </div>
  )
}
