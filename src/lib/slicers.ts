/**
 * Slicer state — the heart of QueryBall's thesis.
 *
 * Bulk stats are bar trivia. Slicing by context turns them into insight.
 * Each deck mounts <SlicerPanel/> and reads the current Slicers via useSlicers().
 * Slicers are URL-encoded so users can deep-link a filtered view.
 */

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type Tri = 'all' | 'yes' | 'no'
export type ScoreState =
  | 'lose17' | 'lose9to16' | 'lose4to8' | 'lose1to3' | 'tied'
  | 'win1to3' | 'win4to8' | 'win9to16' | 'win17'
export type FieldZone = 'own1to20' | 'own21to50' | 'opp49to21' | 'redzone' | 'goalline'
export type Quarter = '1' | '2' | '3' | '4' | 'OT'
export type DistanceBucket = 'd1to3' | 'd4to6' | 'd7to9' | 'd10' | 'd11plus'
export type PassDepth = 'behindLOS' | 'short' | 'intermediate' | 'deep'
export type Direction = 'left' | 'middle' | 'right'

export type Slicers = {
  seasons: number[]
  weeks: number[]
  seasonType: 'regular' | 'postseason' | 'all'

  positions: string[]
  teams: string[]
  opponents: string[]
  playerIds: string[]

  homeAway: 'home' | 'away' | 'all'

  downs: number[]
  distances: DistanceBucket[]

  scoreStates: ScoreState[]
  quarters: Quarter[]
  twoMinute: Tri
  garbageTime: Tri

  zones: FieldZone[]

  shotgun: Tri
  noHuddle: Tri
  playTypes: ('pass' | 'run' | 'special')[]

  // Pass depth + direction (applies to any plays-based view)
  passDepth: PassDepth[]
  passDir: Direction[]

  // Run direction
  runDir: Direction[]

  // Pass detail
  pressure: Tri

  // Weather + stadium
  roof: ('dome' | 'outdoors' | 'open' | 'closed')[]
  surface: ('grass' | 'turf')[]
  windRange: [number, number]
  tempRange: [number, number]
}

export const DEFAULTS: Slicers = {
  seasons: [2024],
  weeks: [],
  seasonType: 'regular',
  positions: [],
  teams: [],
  opponents: [],
  playerIds: [],
  homeAway: 'all',
  downs: [],
  distances: [],
  scoreStates: [],
  quarters: [],
  twoMinute: 'all',
  garbageTime: 'no',
  zones: [],
  shotgun: 'all',
  noHuddle: 'all',
  playTypes: [],
  passDepth: [],
  passDir: [],
  runDir: [],
  pressure: 'all',
  roof: [],
  surface: [],
  windRange: [0, 40],
  tempRange: [-10, 110],
}

// Display labels (used by SlicerPanel + badges)
export const DISTANCE_LABELS: Record<DistanceBucket, string> = {
  d1to3: '1–3', d4to6: '4–6', d7to9: '7–9', d10: '10', d11plus: '11+',
}
export const SCORE_LABELS: Record<ScoreState, string> = {
  lose17: 'Losing 17+', lose9to16: 'Losing 9–16', lose4to8: 'Losing 4–8', lose1to3: 'Losing 1–3',
  tied: 'Tied',
  win1to3: 'Winning 1–3', win4to8: 'Winning 4–8', win9to16: 'Winning 9–16', win17: 'Winning 17+',
}
export const DEPTH_LABELS: Record<PassDepth, string> = {
  behindLOS: 'Behind LOS', short: 'Short (0–9)', intermediate: 'Intermediate (10–19)', deep: 'Deep (20+)',
}
export const DIR_LABELS: Record<Direction, string> = { left: 'Left', middle: 'Middle', right: 'Right' }

// ---------------------------------------------------------------
// URL <-> Slicers serialization
// ---------------------------------------------------------------
function encList(arr: any[]): string { return arr.join(',') }
function decList<T>(s: string | null, parse: (v: string) => T): T[] {
  if (!s) return []
  return s.split(',').filter(Boolean).map(parse) as T[]
}
function encRange([lo, hi]: [number, number]): string { return `${lo}:${hi}` }
function decRange(s: string | null, fallback: [number, number]): [number, number] {
  if (!s) return fallback
  const [lo, hi] = s.split(':').map(Number)
  if (isNaN(lo) || isNaN(hi)) return fallback
  return [lo, hi]
}

function encodeToParams(s: Slicers): URLSearchParams {
  const p = new URLSearchParams()
  if (s.seasons.length)   p.set('seasons', encList(s.seasons))
  if (s.weeks.length)     p.set('weeks', encList(s.weeks))
  if (s.seasonType !== 'regular') p.set('st', s.seasonType)
  if (s.positions.length) p.set('pos', encList(s.positions))
  if (s.teams.length)     p.set('tm', encList(s.teams))
  if (s.opponents.length) p.set('opp', encList(s.opponents))
  if (s.playerIds.length) p.set('pid', encList(s.playerIds))
  if (s.homeAway !== 'all') p.set('ha', s.homeAway)
  if (s.downs.length)     p.set('dn', encList(s.downs))
  if (s.distances.length) p.set('dist', encList(s.distances))
  if (s.scoreStates.length) p.set('sc', encList(s.scoreStates))
  if (s.quarters.length)  p.set('qtr', encList(s.quarters))
  if (s.twoMinute !== 'all') p.set('tm2', s.twoMinute)
  if (s.garbageTime !== 'no') p.set('gt', s.garbageTime)
  if (s.zones.length)     p.set('zn', encList(s.zones))
  if (s.shotgun !== 'all') p.set('sg', s.shotgun)
  if (s.noHuddle !== 'all') p.set('nh', s.noHuddle)
  if (s.playTypes.length) p.set('pt', encList(s.playTypes))
  if (s.passDepth.length) p.set('pd', encList(s.passDepth))
  if (s.passDir.length)   p.set('pdir', encList(s.passDir))
  if (s.runDir.length)    p.set('rdir', encList(s.runDir))
  if (s.pressure !== 'all') p.set('prs', s.pressure)
  if (s.roof.length)      p.set('rf', encList(s.roof))
  if (s.surface.length)   p.set('sf', encList(s.surface))
  return p
}

function decodeFromParams(p: URLSearchParams): Slicers {
  return {
    ...DEFAULTS,
    seasons: (decList(p.get('seasons'), Number) as number[]).length ? decList(p.get('seasons'), Number) as number[] : DEFAULTS.seasons,
    weeks: decList(p.get('weeks'), Number) as number[],
    seasonType: (p.get('st') as Slicers['seasonType']) || 'regular',
    positions: decList(p.get('pos'), String),
    teams: decList(p.get('tm'), String),
    opponents: decList(p.get('opp'), String),
    playerIds: decList(p.get('pid'), String),
    homeAway: (p.get('ha') as Slicers['homeAway']) || 'all',
    downs: decList(p.get('dn'), Number) as number[],
    distances: decList(p.get('dist'), String) as DistanceBucket[],
    scoreStates: decList(p.get('sc'), String) as ScoreState[],
    quarters: decList(p.get('qtr'), String) as Quarter[],
    twoMinute: (p.get('tm2') as Tri) || 'all',
    garbageTime: (p.get('gt') as Tri) || 'no',
    zones: decList(p.get('zn'), String) as FieldZone[],
    shotgun: (p.get('sg') as Tri) || 'all',
    noHuddle: (p.get('nh') as Tri) || 'all',
    playTypes: decList(p.get('pt'), String) as Slicers['playTypes'],
    passDepth: decList(p.get('pd'), String) as PassDepth[],
    passDir: decList(p.get('pdir'), String) as Direction[],
    runDir: decList(p.get('rdir'), String) as Direction[],
    pressure: (p.get('prs') as Tri) || 'all',
    roof: decList(p.get('rf'), String) as Slicers['roof'],
    surface: decList(p.get('sf'), String) as Slicers['surface'],
  }
}

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------
export function useSlicers() {
  const [search, setSearch] = useSearchParams()
  const slicers = useMemo(() => decodeFromParams(search), [search])
  const update = useCallback((patch: Partial<Slicers>) => {
    setSearch(encodeToParams({ ...slicers, ...patch }), { replace: true })
  }, [slicers, setSearch])
  const reset = useCallback(() => {
    setSearch(encodeToParams(DEFAULTS), { replace: true })
  }, [setSearch])
  return { slicers, update, reset }
}

export function countActive(s: Slicers): number {
  let n = 0
  if (s.seasons.length !== 1 || s.seasons[0] !== DEFAULTS.seasons[0]) n++
  if (s.weeks.length) n++
  if (s.seasonType !== 'regular') n++
  if (s.positions.length) n++
  if (s.teams.length) n++
  if (s.opponents.length) n++
  if (s.playerIds.length) n++
  if (s.homeAway !== 'all') n++
  if (s.downs.length) n++
  if (s.distances.length) n++
  if (s.scoreStates.length) n++
  if (s.quarters.length) n++
  if (s.twoMinute !== 'all') n++
  if (s.garbageTime !== 'no') n++
  if (s.zones.length) n++
  if (s.shotgun !== 'all') n++
  if (s.noHuddle !== 'all') n++
  if (s.playTypes.length) n++
  if (s.passDepth.length) n++
  if (s.passDir.length) n++
  if (s.runDir.length) n++
  if (s.pressure !== 'all') n++
  if (s.roof.length) n++
  if (s.surface.length) n++
  return n
}
