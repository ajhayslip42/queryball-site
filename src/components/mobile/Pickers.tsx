/**
 * Pickers that look like football.
 *
 * A non-football person understands a picture of a field faster than
 * "yardline_100 <= 20". These controls write the same slicer values as the
 * desktop rail; they're just shaped like the thing they filter.
 */
import clsx from 'clsx'
import { useSlicers, type FieldZone, type ScoreState, type Quarter, type DistanceBucket, type PassDepth, type PassDir, type RunDir, type Tri } from '@/lib/slicers'
import { SCORE_MACRO, DISTANCE_MACRO, SCORE_LABELS, DEPTH_LABELS, DISTANCE_LABELS } from '@/lib/slicers'
import { playsWhere } from '@/lib/slicerSql'
import { useQuery } from '@/lib/useQuery'

const sameSet = (a: string[], b: string[]) => a.length === b.length && b.every(v => a.includes(v))

export function Why({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-muted leading-snug mt-1.5">{children}</p>
}

/* ---------------- Field position ---------------- */
const ZONES: { id: FieldZone; label: string; x: number; w: number }[] = [
  { id: 'own1to20',  label: 'Own 1–20',  x: 22,  w: 44 },
  { id: 'own21to50', label: 'Own 21–50', x: 66,  w: 62 },
  { id: 'opp49to21', label: 'Opp 49–21', x: 128, w: 62 },
  { id: 'redzone',   label: 'Red zone',  x: 190, w: 34 },
  { id: 'goalline',  label: 'Goal line', x: 224, w: 10 },
]
export function FieldPicker() {
  const { slicers, update } = useSlicers()
  const toggle = (z: FieldZone) => update({ zones: slicers.zones.includes(z) ? slicers.zones.filter(v => v !== z) : [...slicers.zones, z] })
  return (
    <div>
      <svg viewBox="0 0 256 92" className="w-full h-auto select-none" role="group" aria-label="Field position">
        <rect x="0" y="0" width="256" height="76" rx="6" fill="#DCE8E2" />
        <rect x="0" y="0" width="22" height="76" rx="6" fill="#2A3B47" />
        <rect x="234" y="0" width="22" height="76" rx="6" fill="#2A3B47" />
        {[43, 64, 85, 106, 128, 149, 170, 191, 212].map(x => (
          <line key={x} x1={x} y1="0" x2={x} y2="76" stroke="#fff" strokeWidth={x === 128 ? 2 : 1} opacity=".8" />
        ))}
        {ZONES.map(z => {
          const on = slicers.zones.includes(z.id)
          return (
            <g key={z.id} onClick={() => toggle(z.id)} style={{ cursor: 'pointer' }}>
              <rect x={z.x} y="0" width={z.w} height="76" fill={on ? '#2A3B47' : '#6191A5'} opacity={on ? 0.92 : 0.16} />
              {z.w > 20 && (
                <text x={z.x + z.w / 2} y="42" textAnchor="middle" fontSize="7.5" fontWeight="700"
                  fill={on ? '#fff' : '#2A3B47'} fontFamily="Inter, sans-serif">{z.label}</text>
              )}
            </g>
          )
        })}
        <text x="11" y="40" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" transform="rotate(-90 11 40)" fontFamily="Inter, sans-serif">OWN GOAL</text>
        <text x="245" y="40" textAnchor="middle" fontSize="6" fontWeight="700" fill="#fff" transform="rotate(90 245 40)" fontFamily="Inter, sans-serif">OPP GOAL</text>
        <g fontSize="6.5" fill="#5E6B75" textAnchor="middle" fontFamily="Inter, sans-serif">
          <text x="43" y="88">20</text><text x="85" y="88">40</text><text x="128" y="88">50</text><text x="170" y="88">40</text><text x="212" y="88">20</text><text x="229" y="88">5</text>
        </g>
      </svg>
      <div className="flex flex-wrap gap-1 mt-1">
        {ZONES.map(z => (
          <button key={z.id} type="button" onClick={() => toggle(z.id)} className={clsx('chip text-[11px]', slicers.zones.includes(z.id) && 'applied')}>{z.label}</button>
        ))}
      </div>
      <Why>Tap zones on the field to combine them. Red zone already includes the goal line.</Why>
    </div>
  )
}

/* ---------------- Down & distance ---------------- */
const BUCKETS: DistanceBucket[] = ['d1', 'd2to3', 'd4to6', 'd7to9', 'd10', 'd11plus']
const BUCKET_SQL: Record<DistanceBucket, string> = {
  d1: 'ydstogo = 1', d2to3: 'ydstogo BETWEEN 2 AND 3', d4to6: 'ydstogo BETWEEN 4 AND 6',
  d7to9: 'ydstogo BETWEEN 7 AND 9', d10: 'ydstogo = 10', d11plus: 'ydstogo >= 11',
}
export function DownDistanceGrid() {
  const { slicers, update } = useSlicers()
  // Distribution of plays by down × distance in the current slice, ignoring the
  // down/distance filters themselves so the grid reads as a tendency chart.
  const base = { ...slicers, downs: [], distances: [] as DistanceBucket[] }
  const sql = `SELECT down::int d, CASE ${BUCKETS.map(b => `WHEN ${BUCKET_SQL[b]} THEN '${b}'`).join(' ')} END b, count(*)::int c
    FROM plays WHERE play_type IN ('pass','run') AND down BETWEEN 1 AND 4 ${playsWhere(base)} GROUP BY 1, 2`
  const q = useQuery<{ d: number; b: DistanceBucket; c: number }>(sql, [sql])
  const total = (q.data ?? []).reduce((s, r) => s + r.c, 0) || 1
  const cell = (d: number, b: DistanceBucket) => (q.data ?? []).find(r => r.d === d && r.b === b)?.c ?? 0

  const toggleDown = (d: number) => update({ downs: slicers.downs.includes(d) ? slicers.downs.filter(v => v !== d) : [...slicers.downs, d] })
  const toggleDist = (b: DistanceBucket) => update({ distances: slicers.distances.includes(b) ? slicers.distances.filter(v => v !== b) : [...slicers.distances, b] })
  const setMacro = (k: keyof typeof DISTANCE_MACRO) => update({ distances: sameSet(slicers.distances, DISTANCE_MACRO[k]) ? [] : DISTANCE_MACRO[k] })

  return (
    <div>
      <div className="flex gap-1 mb-2">
        {(['short', 'medium', 'long'] as const).map(k => (
          <button key={k} type="button" onClick={() => setMacro(k)}
            className={clsx('chip flex-1 justify-center capitalize', sameSet(slicers.distances, DISTANCE_MACRO[k]) && 'applied')}>
            {k} <span className="text-muted text-[10px]">{k === 'short' ? '1–3' : k === 'medium' ? '4–9' : '10+'}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: '38px repeat(6, minmax(0,1fr))' }}>
        <div />
        {BUCKETS.map(b => (
          <button key={b} type="button" onClick={() => toggleDist(b)}
            className={clsx('text-[10px] font-semibold rounded py-1 border', slicers.distances.includes(b) ? 'bg-accent2 text-paper border-accent2' : 'bg-paper border-line text-muted')}>
            {DISTANCE_LABELS[b]}
          </button>
        ))}
        {[1, 2, 3, 4].map(d => (
          <div key={d} className="contents">
            <button type="button" onClick={() => toggleDown(d)}
              className={clsx('text-[11px] font-bold rounded border px-1', slicers.downs.includes(d) ? 'bg-accent2 text-paper border-accent2' : 'bg-paper border-line text-accent2')}>
              {d === 1 ? '1st' : d === 2 ? '2nd' : d === 3 ? '3rd' : '4th'}
            </button>
            {BUCKETS.map(b => {
              const on = (slicers.downs.length === 0 || slicers.downs.includes(d)) && (slicers.distances.length === 0 || slicers.distances.includes(b))
              const v = cell(d, b)
              return (
                <div key={b} className={clsx('text-[10px] text-center rounded py-1.5 num border',
                  on ? 'bg-paper border-line text-ink' : 'bg-chalk border-transparent text-muted2')}>
                  {q.loading ? '·' : `${Math.round((v / total) * 1000) / 10}%`}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <Why>Tap a down (row) or a distance (column) to filter. The cells show the share of plays in your current slice — the grid doubles as a tendency chart.</Why>
    </div>
  )
}

/* ---------------- Score ---------------- */
const SCORE_FINE: ScoreState[] = ['lose17', 'lose9to16', 'lose4to8', 'lose1to3', 'tied', 'win1to3', 'win4to8', 'win9to16', 'win17']
export function ScorePicker() {
  const { slicers, update } = useSlicers()
  const macros: { k: keyof typeof SCORE_MACRO | 'any'; label: string; why: string }[] = [
    { k: 'trailing', label: 'Trailing', why: 'Teams throw more when behind — targets can be an artifact of losing.' },
    { k: 'close',    label: 'Close game', why: 'Within 8 either way. Both teams still running the real plan.' },
    { k: 'leading',  label: 'Leading', why: 'Clock-killing mode: runs up, deep shots down.' },
    { k: 'any',      label: 'Any score', why: 'No score filter.' },
  ]
  const active = (k: typeof macros[number]['k']) => k === 'any' ? slicers.scoreStates.length === 0 : sameSet(slicers.scoreStates, SCORE_MACRO[k])
  return (
    <div>
      <div className="space-y-1.5">
        {macros.map(m => (
          <button key={m.k} type="button"
            onClick={() => update({ scoreStates: m.k === 'any' ? [] : SCORE_MACRO[m.k] })}
            className={clsx('w-full text-left rounded-lg border px-3 py-2 flex items-start gap-2.5 transition-colors',
              active(m.k) ? 'border-accent bg-[#F3F7F9]' : 'border-line bg-paper')}>
            <span className={clsx('mt-1 h-3 w-3 rounded-full border-2 flex-shrink-0', active(m.k) ? 'border-accent2 bg-accent2 shadow-[inset_0_0_0_2px_#fff]' : 'border-[#B9C5CE]')} />
            <span>
              <span className="block text-[12.5px] font-semibold text-accent2">{m.label}</span>
              <span className="block text-[11px] text-muted leading-snug">{m.why}</span>
            </span>
          </button>
        ))}
      </div>
      <details className="mt-2">
        <summary className="text-[11px] text-accent cursor-pointer select-none">Fine-tune by margin (Pro)</summary>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {SCORE_FINE.map(s => (
            <button key={s} type="button" onClick={() => update({ scoreStates: slicers.scoreStates.includes(s) ? slicers.scoreStates.filter(v => v !== s) : [...slicers.scoreStates, s] })}
              className={clsx('chip text-[11px]', slicers.scoreStates.includes(s) && 'applied')}>{SCORE_LABELS[s]}</button>
          ))}
        </div>
      </details>
    </div>
  )
}

/* ---------------- Clock ---------------- */
export function ClockPicker() {
  const { slicers, update } = useSlicers()
  const toggle = (q: Quarter) => update({ quarters: slicers.quarters.includes(q) ? slicers.quarters.filter(v => v !== q) : [...slicers.quarters, q] })
  return (
    <div>
      <div className="grid grid-cols-5 gap-1">
        {(['1', '2', '3', '4', 'OT'] as Quarter[]).map(q => (
          <button key={q} type="button" onClick={() => toggle(q)}
            className={clsx('rounded-lg border py-2 text-[12px] font-semibold', slicers.quarters.includes(q) ? 'bg-accent2 text-paper border-accent2' : 'bg-paper border-line text-accent2')}>
            {q === 'OT' ? 'OT' : `Q${q}`}
          </button>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5">
        <button type="button" onClick={() => update({ quarters: sameSet(slicers.quarters, ['1', '2']) ? [] : ['1', '2'] })} className={clsx('chip flex-1 justify-center', sameSet(slicers.quarters, ['1', '2']) && 'applied')}>1st half</button>
        <button type="button" onClick={() => update({ quarters: sameSet(slicers.quarters, ['3', '4']) ? [] : ['3', '4'] })} className={clsx('chip flex-1 justify-center', sameSet(slicers.quarters, ['3', '4']) && 'applied')}>2nd half</button>
        <button type="button" onClick={() => update({ twoMinute: slicers.twoMinute === 'yes' ? 'all' : 'yes' })} className={clsx('chip flex-1 justify-center', slicers.twoMinute === 'yes' && 'applied')}>Final 2:00</button>
      </div>
      <Why>"Final 2:00" means under two minutes in either half — the two-minute drill.</Why>
    </div>
  )
}

/* ---------------- Pass depth & direction ---------------- */
const DEPTH_PLAIN: Record<PassDepth, string> = {
  behindLOS: 'Screens', d1to5: 'Short', d6to10: 'Quick', d11to15: 'Intermediate', d16to25: 'Deep', d26plus: 'Bombs',
}
export function DepthPicker() {
  const { slicers, update } = useSlicers()
  const toggle = (d: PassDepth) => update({ passDepth: slicers.passDepth.includes(d) ? slicers.passDepth.filter(v => v !== d) : [...slicers.passDepth, d] })
  const toggleDir = (d: PassDir) => update({ passDir: slicers.passDir.includes(d) ? slicers.passDir.filter(v => v !== d) : [...slicers.passDir, d] })
  return (
    <div>
      <p className="text-[10.5px] text-muted mb-1">Depth of target (air yards)</p>
      <div className="grid grid-cols-6 gap-1">
        {(Object.keys(DEPTH_PLAIN) as PassDepth[]).map(d => (
          <button key={d} type="button" onClick={() => toggle(d)}
            className={clsx('rounded-lg border py-1.5 text-center', slicers.passDepth.includes(d) ? 'bg-accent2 text-paper border-accent2' : 'bg-paper border-line')}>
            <span className="block text-[10.5px] font-semibold">{DEPTH_PLAIN[d]}</span>
            <span className={clsx('block text-[9px]', slicers.passDepth.includes(d) ? 'text-paper/80' : 'text-muted')}>{DEPTH_LABELS[d]}</span>
          </button>
        ))}
      </div>
      <p className="text-[10.5px] text-muted mb-1 mt-2">Side of the field</p>
      <div className="grid grid-cols-3 gap-1">
        {(['left', 'middle', 'right'] as PassDir[]).map(d => (
          <button key={d} type="button" onClick={() => toggleDir(d)}
            className={clsx('rounded-lg border py-1.5 text-[11.5px] font-semibold capitalize', slicers.passDir.includes(d) ? 'bg-accent2 text-paper border-accent2' : 'bg-paper border-line text-accent2')}>{d}</button>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Run direction, laid out like the line ---------------- */
const GAPS: { id: RunDir; label: string }[] = [
  { id: 'left_end', label: 'L End' }, { id: 'left_tackle', label: 'L Tkl' }, { id: 'left_guard', label: 'L Grd' },
  { id: 'middle', label: 'Mid' },
  { id: 'right_guard', label: 'R Grd' }, { id: 'right_tackle', label: 'R Tkl' }, { id: 'right_end', label: 'R End' },
]
export function RunDirPicker() {
  const { slicers, update } = useSlicers()
  const toggle = (d: RunDir) => update({ runDir: slicers.runDir.includes(d) ? slicers.runDir.filter(v => v !== d) : [...slicers.runDir, d] })
  const inside: RunDir[] = ['left_guard', 'middle', 'right_guard'], outside: RunDir[] = ['left_end', 'right_end']
  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {GAPS.map(g => (
          <button key={g.id} type="button" onClick={() => toggle(g.id)}
            className={clsx('rounded-lg border py-2 text-[10px] font-semibold', slicers.runDir.includes(g.id) ? 'bg-accent2 text-paper border-accent2' : 'bg-paper border-line text-accent2')}>{g.label}</button>
        ))}
      </div>
      <div className="flex gap-1 mt-1.5">
        <button type="button" onClick={() => update({ runDir: sameSet(slicers.runDir, inside) ? [] : inside })} className={clsx('chip flex-1 justify-center', sameSet(slicers.runDir, inside) && 'applied')}>Inside</button>
        <button type="button" onClick={() => update({ runDir: sameSet(slicers.runDir, outside) ? [] : outside })} className={clsx('chip flex-1 justify-center', sameSet(slicers.runDir, outside) && 'applied')}>Outside</button>
      </div>
      <Why>Left to right as the offense sees it. A right-guard carry is a very different play from a right-end sweep.</Why>
    </div>
  )
}

/* ---------------- Generic tri-state rows ---------------- */
export function TriRow({ label, value, onChange, yes = 'Yes', no = 'No' }: {
  label: string; value: Tri; onChange: (v: Tri) => void; yes?: string; no?: string
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[12px] text-ink">{label}</span>
      <div className="flex rounded-md border border-line bg-paper p-0.5">
        {(['all', 'yes', 'no'] as Tri[]).map(v => (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={clsx('px-2.5 py-1 text-[11px] rounded transition-colors', value === v ? 'bg-accent2 text-paper' : 'text-muted')}>
            {v === 'all' ? 'Any' : v === 'yes' ? yes : no}
          </button>
        ))}
      </div>
    </div>
  )
}
