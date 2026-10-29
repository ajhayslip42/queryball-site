/**
 * useActiveBadges — the active-filter chips for the mobile context bar.
 *
 * Same information as <ActiveSlicerBadges/> in the rail, but situations that
 * are fully applied collapse into one dark chip (the user tapped "Trailing",
 * they should see "Trailing", not four score buckets).
 */
import { useSlicers, DISTANCE_LABELS, SCORE_LABELS, DEPTH_LABELS, PASSDIR_LABELS, RUNDIR_LABELS, ZONE_LABELS, THRESH_LABELS, DEFAULTS, type ThreshKey, type Slicers } from '@/lib/slicers'
import { activeSituations, clearSituation, type Situation } from '@/lib/situations'

export type Badge = { key: string; label: string; kind: 'identity' | 'situation' | 'filter'; clear: () => void }

export function useActiveBadges(): { badges: Badge[]; situations: Situation[] } {
  const { slicers, update } = useSlicers()
  const sits = activeSituations(slicers)
  const covered = new Set<keyof Slicers>()
  for (const s of sits) for (const k of Object.keys(s.patch) as (keyof Slicers)[]) covered.add(k)

  const badges: Badge[] = []
  const push = (key: keyof Slicers | string, label: string, kind: Badge['kind'], clear: () => void) => {
    if (covered.has(key as keyof Slicers)) return
    badges.push({ key: `${key}:${label}`, label, kind, clear })
  }

  // Identity
  if (slicers.seasons.length !== 1 || slicers.seasons[0] !== DEFAULTS.seasons[0]) {
    push('seasons', slicers.seasons.join('/'), 'identity', () => update({ seasons: DEFAULTS.seasons }))
  } else {
    badges.push({ key: 'seasons', label: String(slicers.seasons[0]), kind: 'identity', clear: () => {} })
  }
  if (slicers.weeks.length) {
    const w = [...slicers.weeks].sort((a, b) => a - b)
    const contiguous = w.every((v, i) => i === 0 || v === w[i - 1] + 1)
    push('weeks', contiguous && w.length > 1 ? `Wk ${w[0]}–${w[w.length - 1]}` : `Wk ${w.join(',')}`, 'identity', () => update({ weeks: [] }))
  }
  if (slicers.seasonType !== 'regular') push('seasonType', slicers.seasonType === 'postseason' ? 'Playoffs' : 'REG+POST', 'identity', () => update({ seasonType: 'regular' }))
  for (const p of slicers.positions) push('positions', p, 'identity', () => update({ positions: slicers.positions.filter(v => v !== p) }))
  for (const t of slicers.teams) push('teams', t, 'identity', () => update({ teams: slicers.teams.filter(v => v !== t) }))
  for (const o of slicers.opponents) push('opponents', `vs ${o}`, 'identity', () => update({ opponents: slicers.opponents.filter(v => v !== o) }))

  // Situations (one chip each)
  for (const s of sits) badges.push({ key: `sit:${s.id}`, label: s.label, kind: 'situation', clear: () => update(clearSituation(s)) })

  // Remaining filters
  if (slicers.homeAway !== 'all') push('homeAway', slicers.homeAway === 'home' ? 'Home' : 'Away', 'filter', () => update({ homeAway: 'all' }))
  for (const d of slicers.downs) push('downs', `${d}${d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} down`, 'filter', () => update({ downs: slicers.downs.filter(v => v !== d) }))
  for (const d of slicers.distances) push('distances', `${DISTANCE_LABELS[d]} to go`, 'filter', () => update({ distances: slicers.distances.filter(v => v !== d) }))
  for (const s of slicers.scoreStates) push('scoreStates', SCORE_LABELS[s], 'filter', () => update({ scoreStates: slicers.scoreStates.filter(v => v !== s) }))
  for (const z of slicers.zones) push('zones', ZONE_LABELS[z], 'filter', () => update({ zones: slicers.zones.filter(v => v !== z) }))
  for (const q of slicers.quarters) push('quarters', q === 'OT' ? 'OT' : `Q${q}`, 'filter', () => update({ quarters: slicers.quarters.filter(v => v !== q) }))
  if (slicers.twoMinute !== 'all') push('twoMinute', slicers.twoMinute === 'yes' ? '2-minute' : 'Outside 2-min', 'filter', () => update({ twoMinute: 'all' }))
  for (const d of slicers.passDepth) push('passDepth', `${DEPTH_LABELS[d]} air yds`, 'filter', () => update({ passDepth: slicers.passDepth.filter(v => v !== d) }))
  for (const d of slicers.passDir) push('passDir', `${PASSDIR_LABELS[d]} pass`, 'filter', () => update({ passDir: slicers.passDir.filter(v => v !== d) }))
  for (const d of slicers.runDir) push('runDir', `${RUNDIR_LABELS[d]} run`, 'filter', () => update({ runDir: slicers.runDir.filter(v => v !== d) }))
  if (slicers.pressure !== 'all') push('pressure', slicers.pressure === 'yes' ? 'Under pressure' : 'Clean pocket', 'filter', () => update({ pressure: 'all' }))
  for (const t of slicers.playTypes) push('playTypes', t === 'pass' ? 'Pass plays' : t === 'run' ? 'Run plays' : 'Special teams', 'filter', () => update({ playTypes: slicers.playTypes.filter(v => v !== t) }))
  if (slicers.shotgun !== 'all') push('shotgun', slicers.shotgun === 'yes' ? 'Shotgun' : 'Under center', 'filter', () => update({ shotgun: 'all' }))
  if (slicers.noHuddle !== 'all') push('noHuddle', slicers.noHuddle === 'yes' ? 'No-huddle' : 'Huddle', 'filter', () => update({ noHuddle: 'all' }))
  ;(['passAtt', 'targets', 'rushAtt', 'rec'] as ThreshKey[]).forEach(k => {
    const [mn, mx] = slicers.thresholds[k]
    if (mn != null || mx != null) {
      const lbl = mn != null && mx != null ? `${mn}–${mx} ${THRESH_LABELS[k]}` : mn != null ? `${mn}+ ${THRESH_LABELS[k]}` : `≤${mx} ${THRESH_LABELS[k]}`
      badges.push({ key: `th:${k}`, label: lbl, kind: 'filter', clear: () => update({ thresholds: { ...slicers.thresholds, [k]: [null, null] } }) })
    }
  })
  for (const r of slicers.roof) push('roof', r, 'filter', () => update({ roof: slicers.roof.filter(v => v !== r) }))
  for (const s of slicers.surface) push('surface', s, 'filter', () => update({ surface: slicers.surface.filter(v => v !== s) }))

  return { badges, situations: sits }
}
