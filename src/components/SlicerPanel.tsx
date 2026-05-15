/**
 * SlicerPanel — the big filter UI.
 *
 * Iteration 3 styling: lives inside a .filter-rail container (cool-grey
 * background with a steel-blue-to-navy spine on the left edge), distinct
 * from the white report area beside it.
 *
 * The rail shows the always-useful groups (time, player, down & distance,
 * score, zone, quarter, formation, play type, home/away). A "More Filters"
 * drawer holds the less-used dimensions (weather, surface, pressure,
 * play-action, air-yards bucket, run gap, Vegas context).
 */

import { useState, type ReactNode } from 'react'
import { useSlicers, countActive, type Tri } from '@/lib/slicers'
import type {
  Slicers, DistanceBucket, ScoreState, FieldZone, Quarter,
} from '@/lib/slicers'
import { TEAMS, POSITIONS } from '@/lib/nfl'
import { ChevronDown, SlidersHorizontal, X, RotateCcw } from 'lucide-react'
import clsx from 'clsx'

type Group =
  | 'season' | 'week' | 'position' | 'team' | 'opponent' | 'homeAway'
  | 'down' | 'distance' | 'qtr' | 'score' | 'zone' | 'twoMin' | 'garbage'
  | 'shotgun' | 'noHuddle' | 'personnel' | 'playType'

const SEASONS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1)
const PLAYOFF_WEEKS = [19, 20, 21, 22]
const PERSONNEL = ['11', '12', '13', '21', '22', '23', 'Empty', 'Heavy']

const SCORE_LABEL: Record<ScoreState, string> = {
  trail9plus: 'Trail 9+', trail18: 'Trail 1–8', tied: 'Tied',
  lead18: 'Lead 1–8', lead9plus: 'Lead 9+',
}
const ZONE_LABEL: Record<FieldZone, string> = {
  own1to20: 'Own 1–20', own21to50: 'Own 21–50', opp49to21: 'Opp 49–21',
  redzone: 'Red zone', goalline: 'Goal line',
}
const DIST_LABEL: Record<DistanceBucket, string> = {
  d1to3: '1–3', d4to6: '4–6', d7to9: '7–9', d10plus: '10+',
}

/* -------------------- atoms -------------------- */

function GroupSection({ title, defaultOpen = true, children }:
  { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between text-left mb-2"
      >
        <span className="group-label">{title}</span>
        <ChevronDown className={clsx('h-3.5 w-3.5 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && <div className="mb-5">{children}</div>}
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx('chip', active && 'applied')}
    >
      {children}
    </button>
  )
}

function TriToggle({ value, onChange, label }: { value: Tri; onChange: (v: Tri) => void; label: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="group-label">{label}</span>
      <div className="flex rounded-md border border-railedge bg-paper p-0.5">
        {(['all', 'yes', 'no'] as Tri[]).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={clsx(
              'px-2 py-0.5 text-[11px] rounded transition-colors',
              value === v ? 'bg-accent text-paper' : 'text-muted hover:text-ink'
            )}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  )
}

/* -------------------- main panel -------------------- */

export default function SlicerPanel({ groups }: { groups: Group[] }) {
  const { slicers, update, reset } = useSlicers()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const active = countActive(slicers)

  const toggle = <K extends keyof Slicers>(field: K, value: any) => {
    const arr = (slicers[field] as any[]) ?? []
    const next = arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value]
    update({ [field]: next } as Partial<Slicers>)
  }

  return (
    <>
      <aside className="filter-rail">
        <div className="filter-rail-head px-5 py-4 flex items-center justify-between">
          <div>
            <p className="group-label text-accent2">Filters</p>
            <p className="text-[11px] text-muted mt-0.5 num">
              {active} applied · 47 available
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-1 text-[11px] text-muted hover:text-accent2 transition-colors"
            title="Reset all filters"
          >
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          {groups.includes('season') && (
            <GroupSection title="Season">
              <div className="flex flex-wrap gap-1">
                {SEASONS.slice(-6).map(s => (
                  <Chip key={s} active={slicers.seasons.includes(s)} onClick={() => toggle('seasons', s)}>
                    {`'${String(s).slice(-2)}`}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('week') && (
            <GroupSection title="Week">
              <div className="grid grid-cols-6 gap-1">
                {WEEKS.map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggle('weeks', w)}
                    className={clsx('chip justify-center', slicers.weeks.includes(w) && 'applied')}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                {PLAYOFF_WEEKS.map(w => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => toggle('weeks', w)}
                    className={clsx('chip justify-center', slicers.weeks.includes(w) && 'applied')}
                    title="Playoffs"
                  >
                    {w === 19 ? 'WC' : w === 20 ? 'DV' : w === 21 ? 'CC' : 'SB'}
                  </button>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('position') && (
            <GroupSection title="Position">
              <div className="flex flex-wrap gap-1">
                {POSITIONS.map(p => (
                  <Chip key={p} active={slicers.positions.includes(p)} onClick={() => toggle('positions', p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('team') && (
            <GroupSection title="Team" defaultOpen={false}>
              <div className="grid grid-cols-4 gap-1">
                {TEAMS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle('teams', t)}
                    className={clsx('chip justify-center text-[10px]', slicers.teams.includes(t) && 'applied')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('opponent') && (
            <GroupSection title="Opponent" defaultOpen={false}>
              <div className="grid grid-cols-4 gap-1">
                {TEAMS.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggle('opponents', t)}
                    className={clsx('chip justify-center text-[10px]', slicers.opponents.includes(t) && 'applied')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('homeAway') && (
            <GroupSection title="Home / Away">
              <div className="flex gap-1">
                {(['home', 'away', 'all'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => update({ homeAway: v })}
                    className={clsx('chip flex-1 justify-center capitalize', slicers.homeAway === v && 'applied')}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('down') && (
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

          {groups.includes('distance') && (
            <GroupSection title="Distance to go">
              <div className="flex flex-wrap gap-1">
                {(['d1to3', 'd4to6', 'd7to9', 'd10plus'] as DistanceBucket[]).map(d => (
                  <Chip key={d} active={slicers.distances.includes(d)} onClick={() => toggle('distances', d)}>
                    {DIST_LABEL[d]}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('score') && (
            <GroupSection title="Score state">
              <div className="flex flex-wrap gap-1">
                {(['trail9plus', 'trail18', 'tied', 'lead18', 'lead9plus'] as ScoreState[]).map(s => (
                  <Chip key={s} active={slicers.scoreStates.includes(s)} onClick={() => toggle('scoreStates', s)}>
                    {SCORE_LABEL[s]}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('zone') && (
            <GroupSection title="Field zone">
              <div className="flex flex-wrap gap-1">
                {(['own1to20', 'own21to50', 'opp49to21', 'redzone', 'goalline'] as FieldZone[]).map(z => (
                  <Chip key={z} active={slicers.zones.includes(z)} onClick={() => toggle('zones', z)}>
                    {ZONE_LABEL[z]}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('qtr') && (
            <GroupSection title="Quarter">
              <div className="flex flex-wrap gap-1">
                {(['1', '2', '3', '4', 'OT'] as Quarter[]).map(q => (
                  <Chip key={q} active={slicers.quarters.includes(q)} onClick={() => toggle('quarters', q)}>
                    {q === 'OT' ? 'OT' : `Q${q}`}
                  </Chip>
                ))}
                <Chip active={slicers.twoMinute === 'yes'} onClick={() =>
                  update({ twoMinute: slicers.twoMinute === 'yes' ? 'all' : 'yes' })}
                >
                  2-min
                </Chip>
              </div>
            </GroupSection>
          )}

          {groups.includes('personnel') && (
            <GroupSection title="Personnel" defaultOpen={false}>
              <div className="flex flex-wrap gap-1">
                {PERSONNEL.map(p => (
                  <Chip key={p} active={slicers.personnel.includes(p)} onClick={() => toggle('personnel', p)}>
                    {p}
                  </Chip>
                ))}
              </div>
            </GroupSection>
          )}

          {groups.includes('shotgun') && (
            <GroupSection title="Formation" defaultOpen={false}>
              <TriToggle label="Shotgun" value={slicers.shotgun} onChange={v => update({ shotgun: v })} />
              <div className="mt-2">
                <TriToggle label="No-huddle" value={slicers.noHuddle} onChange={v => update({ noHuddle: v })} />
              </div>
            </GroupSection>
          )}

          {groups.includes('playType') && (
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

          {groups.includes('garbage') && (
            <GroupSection title="Special situations" defaultOpen={false}>
              <TriToggle label="Exclude garbage time" value={slicers.garbageTime} onChange={v => update({ garbageTime: v })} />
            </GroupSection>
          )}

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="w-full flex items-center justify-center gap-2 qcard px-3 py-2.5 text-xs font-medium hover:border-accent hover:text-accent2 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            More filters (weather, drive, motion, Vegas…)
          </button>
        </div>
      </aside>

      {drawerOpen && <MoreFiltersDrawer onClose={() => setDrawerOpen(false)} />}
    </>
  )
}

/* -------------------- "More Filters" drawer -------------------- */

function MoreFiltersDrawer({ onClose }: { onClose: () => void }) {
  const { slicers, update } = useSlicers()

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 z-50 h-full w-[420px] max-w-[95vw] overflow-y-auto bg-paper shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="font-display text-[22px] italic">More <span className="text-accent">filters</span></div>
            <div className="text-[11px] text-muted">Less-used dimensions</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md border border-line p-1.5 hover:border-accent hover:bg-cream">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-6">
          <section>
            <p className="group-label mb-2">Weather</p>
            <div className="space-y-2">
              <TriToggle label="Precipitation" value={slicers.precip} onChange={v => update({ precip: v })} />
              <RangeRow
                label="Wind (mph)" min={0} max={40}
                value={slicers.windRange} onChange={v => update({ windRange: v })}
              />
              <RangeRow
                label="Temp (°F)" min={-10} max={110}
                value={slicers.tempRange} onChange={v => update({ tempRange: v })}
              />
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
                      onClick={() => {
                        const arr = slicers.roof.includes(r) ? slicers.roof.filter(v => v !== r) : [...slicers.roof, r]
                        update({ roof: arr })
                      }}
                      className={clsx('chip', slicers.roof.includes(r) && 'applied')}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-muted block mb-1">Surface</span>
                <div className="flex gap-1">
                  {(['grass', 'turf'] as const).map(s => (
                    <button key={s} type="button"
                      onClick={() => {
                        const arr = slicers.surface.includes(s) ? slicers.surface.filter(v => v !== s) : [...slicers.surface, s]
                        update({ surface: arr })
                      }}
                      className={clsx('chip', slicers.surface.includes(s) && 'applied')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="group-label mb-2">Pass detail</p>
            <div className="space-y-2">
              <TriToggle label="Under pressure" value={slicers.pressure} onChange={v => update({ pressure: v })} />
              <TriToggle label="Play action" value={slicers.playAction} onChange={v => update({ playAction: v })} />
              <div>
                <span className="text-[11px] text-muted block mb-1">Air yards bucket</span>
                <div className="flex flex-wrap gap-1">
                  {(['behindLOS', '0to9', '10to19', '20plus'] as const).map(b => (
                    <button key={b} type="button"
                      onClick={() => {
                        const arr = slicers.airYards.includes(b) ? slicers.airYards.filter(v => v !== b) : [...slicers.airYards, b]
                        update({ airYards: arr })
                      }}
                      className={clsx('chip', slicers.airYards.includes(b) && 'applied')}>
                      {b === 'behindLOS' ? 'Behind LOS' : b === '0to9' ? '0–9' : b === '10to19' ? '10–19' : '20+'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section>
            <p className="group-label mb-2">Run detail</p>
            <div>
              <span className="text-[11px] text-muted block mb-1">Run gap</span>
              <div className="flex flex-wrap gap-1">
                {(['left_end', 'left_tackle', 'left_guard', 'middle', 'right_guard', 'right_tackle', 'right_end'] as const).map(g => (
                  <button key={g} type="button"
                    onClick={() => {
                      const arr = slicers.runGap.includes(g) ? slicers.runGap.filter(v => v !== g) : [...slicers.runGap, g]
                      update({ runGap: arr })
                    }}
                    className={clsx('chip', slicers.runGap.includes(g) && 'applied')}>
                    {g.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  )
}

function RangeRow({ label, min, max, value, onChange }: {
  label: string; min: number; max: number;
  value: [number, number]; onChange: (v: [number, number]) => void
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-muted">{label}</span>
        <span className="text-[11px] num text-ink">{value[0]} – {value[1]}</span>
      </div>
      <div className="flex items-center gap-2">
        <input type="range" min={min} max={max} value={value[0]}
          onChange={e => onChange([Number(e.target.value), value[1]])}
          className="flex-1" />
        <input type="range" min={min} max={max} value={value[1]}
          onChange={e => onChange([value[0], Number(e.target.value)])}
          className="flex-1" />
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
  for (const s of slicers.scoreStates) badges.push({ label: SCORE_LABEL[s], clear: () => update({ scoreStates: slicers.scoreStates.filter(v => v !== s) }) })
  for (const z of slicers.zones) badges.push({ label: ZONE_LABEL[z], clear: () => update({ zones: slicers.zones.filter(v => v !== z) }) })
  if (slicers.twoMinute !== 'all') badges.push({ label: '2-minute', clear: () => update({ twoMinute: 'all' }) })

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
