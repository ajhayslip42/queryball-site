/**
 * SlicerPanel — the big filter UI.
 *
 * Main rail holds all the high-value football dimensions: time, player,
 * down & distance, score, zone, quarter, pass depth & direction, run
 * direction, pressure, formation, play type. The "More filters" drawer holds
 * only weather and stadium/surface.
 */

import { useState, type ReactNode } from 'react'
import { useSlicers, countActive, type Tri } from '@/lib/slicers'
import type {
  Slicers, DistanceBucket, ScoreState, FieldZone, Quarter, PassDepth, PassDir, RunDir, Threshold, ThreshKey,
} from '@/lib/slicers'
import { DISTANCE_LABELS, SCORE_LABELS, DEPTH_LABELS, PASSDIR_LABELS, RUNDIR_LABELS, ZONE_LABELS, THRESH_LABELS, thresholdsForPositions } from '@/lib/slicers'
import { TEAMS, POSITIONS } from '@/lib/nfl'
import PlayerPicker from '@/components/PlayerPicker'
import { useIsMobile } from '@/lib/useIsMobile'
import { ChevronDown, SlidersHorizontal, X, RotateCcw, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import clsx from 'clsx'

export type Group =
  | 'season' | 'week' | 'position' | 'team' | 'opponent' | 'homeAway'
  | 'down' | 'distance' | 'qtr' | 'score' | 'zone'
  | 'shotgun' | 'noHuddle' | 'playType' | 'passDepth' | 'runDir' | 'pressure' | 'threshold'

const SEASONS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1)
const PLAYOFF_WEEKS = [19, 20, 21, 22]

/* -------------------- atoms -------------------- */
function GroupSection({ title, defaultOpen = true, priority = false, children }:
  { title: string; defaultOpen?: boolean; priority?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={priority ? 'group-priority' : undefined}>
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left mb-2">
        <span className="group-label">{title}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className={priority ? '' : 'mb-5'}>{children}</div>}
    </div>
  )
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} className={clsx('chip', active && 'applied')}>{children}</button>
}
function TriToggle({ value, onChange, label }: { value: Tri; onChange: (v: Tri) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="group-label">{label}</span>
      <div className="flex rounded-md border border-railedge bg-paper p-0.5">
        {(['all', 'yes', 'no'] as Tri[]).map(v => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={clsx('px-2 py-0.5 text-[11px] rounded transition-colors',
              value === v ? 'bg-accent text-paper' : 'text-muted hover:text-ink')}>{v}</button>
        ))}
      </div>
    </div>
  )
}
function ThreshRow({ label, value, onChange }: { label: string; value: Threshold; onChange: (v: Threshold) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 mb-1.5">
      <span className="text-[11px] text-muted flex-1">{label}</span>
      <input type="number" min={0} placeholder="min" value={value[0] ?? ''} aria-label={`${label} minimum`}
        onChange={e => onChange([e.target.value === '' ? null : Number(e.target.value), value[1]])}
        className="w-14 rounded border border-railedge bg-paper px-1.5 py-0.5 text-[11px] num" />
      <input type="number" min={0} placeholder="max" value={value[1] ?? ''} aria-label={`${label} maximum`}
        onChange={e => onChange([value[0], e.target.value === '' ? null : Number(e.target.value)])}
        className="w-14 rounded border border-railedge bg-paper px-1.5 py-0.5 text-[11px] num" />
    </div>
  )
}

/* -------------------- main panel -------------------- */
export default function SlicerPanel({ groups, showPlayerPicker = false }: {
  groups: Group[]
  showPlayerPicker?: boolean
}) {
  const { slicers, update, reset } = useSlicers()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const active = countActive(slicers)

  const toggle = <K extends keyof Slicers>(field: K, value: any) => {
    const arr = (slicers[field] as any[]) ?? []
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    update({ [field]: next } as Partial<Slicers>)
  }
  const has = (g: Group) => groups.includes(g)
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  // On mobile: only these five stay visible up top; the rest are stuffed into the mobile "More".
  const MOBILE_PRIMARY: Group[] = ['position', 'team', 'down', 'distance', 'score']
  const isPrimary = (g: Group) => MOBILE_PRIMARY.includes(g)
  const showGroup = (g: Group) => has(g) && (!isMobile || isPrimary(g) || mobileMoreOpen)

  if (collapsed) {
    // Compact rail — a thin column with an expand button + active count.
    return (
      <aside className="filter-rail-collapsed">
        <button type="button" onClick={() => setCollapsed(false)}
          className="w-full h-full flex flex-col items-center gap-2 py-4 text-muted hover:text-accent2 transition-colors"
          title="Show filter panel">
          <PanelLeftOpen className="h-4 w-4" />
          <span className="[writing-mode:vertical-rl] rotate-180 text-[11px] tracking-widest uppercase">Filters</span>
          <span className="num text-[10px] bg-accent2 text-paper rounded-full px-1.5 py-0.5">{active}</span>
        </button>
      </aside>
    )
  }

  return (
    <>
      <aside className="filter-rail">
        <div className="filter-rail-head px-5 py-4 flex items-center justify-between">
          <div>
            <p className="group-label text-accent2">Filters</p>
            <p className="text-[11px] text-muted mt-0.5 num">{active} applied</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={reset}
              className="flex items-center gap-1 text-[11px] text-muted hover:text-accent2 transition-colors" title="Reset all filters">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            <button type="button" onClick={() => setCollapsed(true)}
              className="text-muted hover:text-accent2 transition-colors" title="Collapse filter panel">
              <PanelLeftClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {showPlayerPicker && (<><PlayerPicker /><div className="border-b border-railedge -mx-5" /></>)}

          {/* PROMOTED: Team filter is the most-used slicer on nearly every deck.
           * Rendered first with priority styling so it's immediately obvious. */}
          {showGroup('team') && (
            <GroupSection title="Team" defaultOpen priority>
              <div className="grid grid-cols-4 gap-1">
                {TEAMS.map(t => (
                  <button key={t} type="button" onClick={() => toggle('teams', t)}
                    className={clsx('chip justify-center text-[10px]', slicers.teams.includes(t) && 'applied')}>{t}</button>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('season') && (
            <GroupSection title="Season">
              <div className="flex flex-wrap gap-1">
                {SEASONS.slice(-6).map(s => (
                  <Chip key={s} active={slicers.seasons.includes(s)} onClick={() => toggle('seasons', s)}>{`'${String(s).slice(-2)}`}</Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('week') && (
            <GroupSection title="Week">
              <div className="grid grid-cols-6 gap-1">
                {WEEKS.map(w => (
                  <button key={w} type="button" onClick={() => toggle('weeks', w)}
                    className={clsx('chip justify-center', slicers.weeks.includes(w) && 'applied')}>{w}</button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {PLAYOFF_WEEKS.map(w => (
                  <button key={w} type="button" onClick={() => toggle('weeks', w)}
                    className={clsx('chip justify-center', slicers.weeks.includes(w) && 'applied')} title="Playoffs">
                    {w === 19 ? 'WC' : w === 20 ? 'DV' : w === 21 ? 'CC' : 'SB'}
                  </button>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('position') && (
            <GroupSection title="Position">
              <div className="flex flex-wrap gap-1">
                {POSITIONS.map(p => (
                  <Chip key={p} active={slicers.positions.includes(p)} onClick={() => toggle('positions', p)}>{p}</Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('opponent') && (
            <GroupSection title="Opponent" defaultOpen={false}>
              <div className="grid grid-cols-4 gap-1">
                {TEAMS.map(t => (
                  <button key={t} type="button" onClick={() => toggle('opponents', t)}
                    className={clsx('chip justify-center text-[10px]', slicers.opponents.includes(t) && 'applied')}>{t}</button>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('homeAway') && (
            <GroupSection title="Home / Away">
              <div className="flex gap-1">
                {(['home', 'away', 'all'] as const).map(v => (
                  <button key={v} type="button" onClick={() => update({ homeAway: v })}
                    className={clsx('chip flex-1 justify-center capitalize', slicers.homeAway === v && 'applied')}>{v}</button>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('down') && (
            <GroupSection title="Down">
              <div className="flex flex-wrap gap-1">
                {[1, 2, 3, 4].map(d => (
                  <Chip key={d} active={slicers.downs.includes(d)} onClick={() => toggle('downs', d)}>
                    {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : '4th'}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('distance') && (
            <GroupSection title="Distance to go">
              <div className="flex flex-wrap gap-1">
                {(['d1', 'd2to3', 'd4to6', 'd7to9', 'd10', 'd11plus'] as DistanceBucket[]).map(d => (
                  <Chip key={d} active={slicers.distances.includes(d)} onClick={() => toggle('distances', d)}>{DISTANCE_LABELS[d]}</Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('score') && (
            <GroupSection title="Score differential">
              <div className="flex flex-wrap gap-1">
                {(['lose17','lose9to16','lose4to8','lose1to3','tied','win1to3','win4to8','win9to16','win17'] as ScoreState[]).map(s => (
                  <Chip key={s} active={slicers.scoreStates.includes(s)} onClick={() => toggle('scoreStates', s)}>{SCORE_LABELS[s]}</Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {isMobile && !mobileMoreOpen && (
            <button type="button" onClick={() => setMobileMoreOpen(true)}
              className="w-full flex items-center justify-center gap-2 qcard px-3 py-2.5 text-xs font-medium hover:border-accent hover:text-accent2 transition-colors">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Show more filters
            </button>
          )}

          {showGroup('zone') && (
            <GroupSection title="Field zone">
              <div className="flex flex-wrap gap-1">
                {(['own1to20', 'own21to50', 'opp49to21', 'redzone', 'goalline'] as FieldZone[]).map(z => (
                  <Chip key={z} active={slicers.zones.includes(z)} onClick={() => toggle('zones', z)}>{ZONE_LABELS[z]}</Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('qtr') && (
            <GroupSection title="Quarter">
              <div className="flex flex-wrap gap-1">
                {(['1', '2', '3', '4', 'OT'] as Quarter[]).map(q => (
                  <Chip key={q} active={slicers.quarters.includes(q)} onClick={() => toggle('quarters', q)}>{q === 'OT' ? 'OT' : `Q${q}`}</Chip>
                ))}
                <Chip active={slicers.twoMinute === 'yes'} onClick={() => update({ twoMinute: slicers.twoMinute === 'yes' ? 'all' : 'yes' })}>2-min</Chip>
              </div>
            </GroupSection>
          )}

          {showGroup('passDepth') && (
            <GroupSection title="Pass depth & direction">
              <span className="text-[11px] text-muted block mb-1">Depth of target</span>
              <div className="flex flex-wrap gap-1 mb-2">
                {(['behindLOS', 'd1to5', 'd6to10', 'd11to15', 'd16to25', 'd26plus'] as PassDepth[]).map(d => (
                  <Chip key={d} active={slicers.passDepth.includes(d)} onClick={() => toggle('passDepth', d)}>{DEPTH_LABELS[d]}</Chip>
                ))}
              </div>
              <span className="text-[11px] text-muted block mb-1">Direction</span>
              <div className="flex flex-wrap gap-1">
                {(['left', 'middle', 'right'] as PassDir[]).map(d => (
                  <Chip key={d} active={slicers.passDir.includes(d)} onClick={() => toggle('passDir', d)}>{PASSDIR_LABELS[d]}</Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('runDir') && (
            <GroupSection title="Run direction (gap)">
              <div className="flex flex-wrap gap-1">
                {(['left_end', 'left_tackle', 'left_guard', 'middle', 'right_guard', 'right_tackle', 'right_end'] as RunDir[]).map(d => (
                  <Chip key={d} active={slicers.runDir.includes(d)} onClick={() => toggle('runDir', d)}>{RUNDIR_LABELS[d]}</Chip>
                ))}
              </div>
              <p className="text-[10px] text-muted mt-1.5 leading-snug">Combines <span className="font-mono">run_location</span> and <span className="font-mono">run_gap</span> — a Right-Guard carry is a very different play from a Right-End sweep.</p>
            </GroupSection>
          )}

          {showGroup('pressure') && (
            <GroupSection title="Pressure">
              <TriToggle label="QB hit on play" value={slicers.pressure} onChange={v => update({ pressure: v })} />
            </GroupSection>
          )}

          {showGroup('shotgun') && (
            <GroupSection title="Formation" defaultOpen={false}>
              <TriToggle label="Shotgun" value={slicers.shotgun} onChange={v => update({ shotgun: v })} />
              <div className="mt-2"><TriToggle label="No-huddle" value={slicers.noHuddle} onChange={v => update({ noHuddle: v })} /></div>
            </GroupSection>
          )}

          {showGroup('playType') && (
            <GroupSection title="Play type">
              <div className="flex flex-wrap gap-1">
                {(['pass', 'run', 'special'] as const).map(t => (
                  <Chip key={t} active={slicers.playTypes.includes(t)} onClick={() => toggle('playTypes', t)}>
                    {t === 'pass' ? 'Pass' : t === 'run' ? 'Run' : 'Special'}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {showGroup('threshold') && (
            <GroupSection title="Usage thresholds" defaultOpen={false}>
              <div className="flex items-center justify-end gap-2 mb-1">
                <span className="text-[10px] text-muted w-14 text-center">min</span>
                <span className="text-[10px] text-muted w-14 text-center">max</span>
              </div>
              {thresholdsForPositions(slicers.positions).map(k => (
                <ThreshRow key={k} label={THRESH_LABELS[k]} value={slicers.thresholds[k]}
                  onChange={v => update({ thresholds: { ...slicers.thresholds, [k]: v } })} />
              ))}
              <p className="text-[10px] text-muted mt-1.5 leading-snug">Keeps only players whose season total in the current slice falls in range — e.g. receivers with 40+ targets.</p>
            </GroupSection>
          )}

          <button type="button" onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center justify-center gap-2 qcard px-3 py-2.5 text-xs font-medium hover:border-accent hover:text-accent2 transition-colors">
            <SlidersHorizontal className="h-3.5 w-3.5" /> More filters (weather, stadium…)
          </button>
        </div>
      </aside>

      {drawerOpen && <MoreFiltersDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  )
}

/* -------------------- drawer: weather + stadium only -------------------- */
function MoreFiltersDrawer({ onClose }: { onClose: () => void }) {
  const { slicers, update } = useSlicers()
  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm qb-drawer-scrim" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[95vw] overflow-y-auto bg-paper shadow-2xl qb-drawer">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="font-display text-[22px] italic">More <span className="text-accent">filters</span></div>
            <div className="text-[11px] text-muted">Weather & stadium</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-line p-1.5 hover:border-accent hover:bg-cream"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5 px-5 py-6">
          <section>
            <p className="group-label mb-2">Weather</p>
            <div className="space-y-2">
              <RangeRow label="Wind (mph)" min={0} max={40} value={slicers.windRange} onChange={v => update({ windRange: v })} />
              <RangeRow label="Temp (°F)" min={-10} max={110} value={slicers.tempRange} onChange={v => update({ tempRange: v })} />
            </div>
          </section>
          <section>
            <p className="group-label mb-2">Stadium & Surface</p>
            <div className="space-y-2">
              <div>
                <span className="text-[11px] text-muted block mb-1">Roof</span>
                <div className="flex flex-wrap gap-1">
                  {(['dome', 'outdoors', 'open', 'closed'] as const).map(r => (
                    <button key={r} type="button"
                      onClick={() => update({ roof: slicers.roof.includes(r) ? slicers.roof.filter(v => v !== r) : [...slicers.roof, r] })}
                      className={clsx('chip', slicers.roof.includes(r) && 'applied')}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted block mb-1">Surface</span>
                <div className="flex gap-1">
                  {(['grass', 'turf'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => update({ surface: slicers.surface.includes(s) ? slicers.surface.filter(v => v !== s) : [...slicers.surface, s] })}
                      className={clsx('chip', slicers.surface.includes(s) && 'applied')}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function RangeRow({ label, min, max, value, onChange }: {
  label: string; min: number; max: number; value: [number, number]; onChange: (v: [number, number]) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] num text-ink">{value[0]} – {value[1]}</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} value={value[0]} onChange={e => onChange([Number(e.target.value), value[1]])} className="flex-1" />
        <input type="range" min={min} max={max} value={value[1]} onChange={e => onChange([value[0], Number(e.target.value)])} className="flex-1" />
      </div>
    </div>
  )
}

/* -------------------- Active filter badges -------------------- */
export function ActiveSlicerBadges() {
  const { slicers, update } = useSlicers()
  const badges: { label: string; clear: () => void }[] = []
  for (const s of slicers.seasons) badges.push({ label: String(s), clear: () => update({ seasons: slicers.seasons.filter(v => v !== s) }) })
  for (const w of slicers.weeks) badges.push({ label: `Wk ${w}`, clear: () => update({ weeks: slicers.weeks.filter(v => v !== w) }) })
  for (const p of slicers.positions) badges.push({ label: p, clear: () => update({ positions: slicers.positions.filter(v => v !== p) }) })
  for (const t of slicers.teams) badges.push({ label: t, clear: () => update({ teams: slicers.teams.filter(v => v !== t) }) })
  for (const o of slicers.opponents) badges.push({ label: `vs ${o}`, clear: () => update({ opponents: slicers.opponents.filter(v => v !== o) }) })
  if (slicers.homeAway !== 'all') badges.push({ label: slicers.homeAway, clear: () => update({ homeAway: 'all' }) })
  for (const d of slicers.downs) badges.push({ label: `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} down`, clear: () => update({ downs: slicers.downs.filter(v => v !== d) }) })
  for (const d of slicers.distances) badges.push({ label: `${DISTANCE_LABELS[d]} to go`, clear: () => update({ distances: slicers.distances.filter(v => v !== d) }) })
  for (const s of slicers.scoreStates) badges.push({ label: SCORE_LABELS[s], clear: () => update({ scoreStates: slicers.scoreStates.filter(v => v !== s) }) })
  for (const z of slicers.zones) badges.push({ label: ZONE_LABELS[z], clear: () => update({ zones: slicers.zones.filter(v => v !== z) }) })
  for (const q of slicers.quarters) badges.push({ label: q === 'OT' ? 'OT' : `Q${q}`, clear: () => update({ quarters: slicers.quarters.filter(v => v !== q) }) })
  if (slicers.twoMinute !== 'all') badges.push({ label: '2-minute', clear: () => update({ twoMinute: 'all' }) })
  for (const d of slicers.passDepth) badges.push({ label: DEPTH_LABELS[d], clear: () => update({ passDepth: slicers.passDepth.filter(v => v !== d) }) })
  for (const d of slicers.passDir) badges.push({ label: `${PASSDIR_LABELS[d]} pass`, clear: () => update({ passDir: slicers.passDir.filter(v => v !== d) }) })
  for (const d of slicers.runDir) badges.push({ label: `${RUNDIR_LABELS[d]} run`, clear: () => update({ runDir: slicers.runDir.filter(v => v !== d) }) })
  if (slicers.pressure !== 'all') badges.push({ label: slicers.pressure === 'yes' ? 'Under pressure' : 'Clean pocket', clear: () => update({ pressure: 'all' }) })
  for (const t of slicers.playTypes) badges.push({ label: t, clear: () => update({ playTypes: slicers.playTypes.filter(v => v !== t) }) })
  if (slicers.shotgun !== 'all') badges.push({ label: slicers.shotgun === 'yes' ? 'Shotgun' : 'Under center', clear: () => update({ shotgun: 'all' }) })
  ;(['passAtt', 'targets', 'rushAtt', 'rec'] as ThreshKey[]).forEach(k => {
    const [mn, mx] = slicers.thresholds[k]
    if (mn != null || mx != null) {
      const lbl = mn != null && mx != null ? `${mn}–${mx} ${THRESH_LABELS[k]}` : mn != null ? `${mn}+ ${THRESH_LABELS[k]}` : `≤${mx} ${THRESH_LABELS[k]}`
      badges.push({ label: lbl, clear: () => update({ thresholds: { ...slicers.thresholds, [k]: [null, null] } }) })
    }
  })

  if (!badges.length) return null
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <span className="eyebrow">Active filters</span>
      {badges.map((b, i) => (
        <button key={i} className="chip applied" onClick={b.clear} title="Remove filter">
          {b.label} <X className="h-3 w-3 ml-0.5 text-muted" />
        </button>
      ))}
    </div>
  )
}
