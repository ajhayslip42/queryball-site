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
export type ScoreState = 'trail9plus' | 'trail18' | 'tied' | 'lead18' | 'lead9plus'
export type FieldZone = 'own1to20' | 'own21to50' | 'opp49to21' | 'redzone' | 'goalline'
export type Quarter = '1' | '2' | '3' | '4' | 'OT'
export type DistanceBucket = 'd1to3' | 'd4to6' | 'd7to9' | 'd10plus'

export type Slicers = {
  // Always-on
  seasons: number[]
  weeks: number[]
  seasonType: 'regular' | 'postseason' | 'all'

  // Player
  positions: string[]
  teams: string[]
  opponents: string[]
  playerIds: string[]

  // Location
  homeAway: 'home' | 'away' | 'all'

  // Down & distance
  downs: number[]
  distances: DistanceBucket[]

  // Score & game state
  scoreStates: ScoreState[]
  quarters: Quarter[]
  twoMinute: Tri
  garbageTime: Tri

  // Field position
  zones: FieldZone[]

  // Formation
  shotgun: Tri
  noHuddle: Tri
  personnel: string[]

  // Play type
  playTypes: ('pass' | 'run' | 'special')[]

  // Weather + stadium (advanced)
  roof: ('dome' | 'outdoors' | 'open' | 'closed')[]
  surface: ('grass' | 'turf')[]
  windRange: [number, number]
  tempRange: [number, number]
  precip: Tri

  // Pass detail
  pressure: Tri
  playAction: Tri
  airYards: ('behindLOS' | '0to9' | '10to19' | '20plus')[]

  // Run detail
  runGap: ('left_end' | 'left_tackle' | 'left_guard' | 'middle' | 'right_guard' | 'right_tackle' | 'right_end')[]

  // Vegas
  spreadRange: [number, number]
  totalRange: [number, number]
}

export const DEFAULTS: Slicers = {
  seasons: [new Date().getFullYear() - 1],
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
  garbageTime: 'no',  // exclude garbage time by default
  zones: [],
  shotgun: 'all',
  noHuddle: 'all',
  personnel: [],
  playTypes: [],
  roof: [],
  surface: [],
  windRange: [0, 40],
  tempRange: [-10, 110],
  precip: 'all',
  pressure: 'all',
  playAction: 'all',
  airYards: [],
  runGap: [],
  spreadRange: [-25, 25],
  totalRange: [30, 65],
}

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
  if (s.personnel.length) p.set('per', encList(s.personnel))
  if (s.playTypes.length) p.set('pt', encList(s.playTypes))
  if (s.roof.length)      p.set('rf', encList(s.roof))
  if (s.surface.length)   p.set('sf', encList(s.surface))
  if (s.precip !== 'all') p.set('pr', s.precip)
  if (s.pressure !== 'all') p.set('prs', s.pressure)
  if (s.playAction !== 'all') p.set('pa', s.playAction)
  if (s.airYards.length)  p.set('ay', encList(s.airYards))
  if (s.runGap.length)    p.set('rg', encList(s.runGap))
  return p
}

function decodeFromParams(p: URLSearchParams): Slicers {
  return {
    ...DEFAULTS,
    seasons: decList(p.get('seasons'), Number) as number[] || DEFAULTS.seasons,
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
    personnel: decList(p.get('per'), String),
    playTypes: decList(p.get('pt'), String) as Slicers['playTypes'],
    roof: decList(p.get('rf'), String) as Slicers['roof'],
    surface: decList(p.get('sf'), String) as Slicers['surface'],
    precip: (p.get('pr') as Tri) || 'all',
    pressure: (p.get('prs') as Tri) || 'all',
    playAction: (p.get('pa') as Tri) || 'all',
    airYards: decList(p.get('ay'), String) as Slicers['airYards'],
    runGap: decList(p.get('rg'), String) as Slicers['runGap'],
  }
}

// ---------------------------------------------------------------
// Hook
// ---------------------------------------------------------------

export function useSlicers() {
  const [search, setSearch] = useSearchParams()
  const slicers = useMemo(() => decodeFromParams(search), [search])

  const update = useCallback((patch: Partial<Slicers>) => {
    const next = { ...slicers, ...patch }
    setSearch(encodeToParams(next), { replace: true })
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
  if (s.personnel.length) n++
  if (s.playTypes.length) n++
  if (s.roof.length) n++
  if (s.surface.length) n++
  if (s.precip !== 'all') n++
  if (s.pressure !== 'all') n++
  if (s.playAction !== 'all') n++
  if (s.airYards.length) n++
  if (s.runGap.length) n++
  return n
}
