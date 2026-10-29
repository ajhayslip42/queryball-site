/**
 * Situations — one-tap filter bundles.
 *
 * The thesis in a chip: a casual user doesn't know that "trailing" means four
 * score-differential buckets, or that "3rd & long" is a down plus three
 * distance buckets. A Situation names the football moment and applies the
 * slicers that define it. Every card states exactly which filters it sets so
 * Pro users can trust it (and tweak it afterwards in the rail).
 *
 * Adding a situation: append to SITUATIONS. `patch` is merged into the current
 * slicers (replacing the keys it names); `sets` is the plain-English statement
 * of what it does; `why` is the one-line reason it matters.
 */
import { DEFAULTS, type Slicers } from './slicers'

export type Situation = {
  id: string
  label: string
  group: 'score' | 'field' | 'downs' | 'clock' | 'passing' | 'rushing' | 'venue'
  sets: string
  why: string
  patch: Partial<Slicers>
}

export const SITUATIONS: Situation[] = [
  // ---- score state ----
  { id: 'trailing', label: 'Trailing', group: 'score',
    sets: 'Score state = behind, any margin.',
    why: 'Teams throw more when losing, so a receiver\'s targets can be an artifact of the scoreboard.',
    patch: { scoreStates: ['lose1to3', 'lose4to8', 'lose9to16', 'lose17'] } },
  { id: 'leading', label: 'Leading', group: 'score',
    sets: 'Score state = ahead, any margin.',
    why: 'Clock-killing mode — runs go up, deep shots go down.',
    patch: { scoreStates: ['win1to3', 'win4to8', 'win9to16', 'win17'] } },
  { id: 'close', label: 'Close game', group: 'score',
    sets: 'Score within 8 points either way, including tied.',
    why: 'Both teams are still running their real game plan.',
    patch: { scoreStates: ['lose4to8', 'lose1to3', 'tied', 'win1to3', 'win4to8'] } },
  { id: 'noblowout', label: 'Blowouts off', group: 'score',
    sets: 'Removes plays with a margin of 17+ either way.',
    why: 'Garbage time pads box scores. This trims the worst of it.',
    patch: { scoreStates: ['lose9to16', 'lose4to8', 'lose1to3', 'tied', 'win1to3', 'win4to8', 'win9to16'] } },
  { id: 'onescore4q', label: 'One-score 4th qtr', group: 'score',
    sets: '4th quarter, score within 8.',
    why: 'The plays that decide games. Who gets the ball when it matters?',
    patch: { quarters: ['4'], scoreStates: ['lose4to8', 'lose1to3', 'tied', 'win1to3', 'win4to8'] } },

  // ---- field position ----
  { id: 'redzone', label: 'Red zone', group: 'field',
    sets: 'Field position inside the opponent\'s 20.',
    why: 'The field shrinks and roles change — touchdown equity lives here.',
    patch: { zones: ['redzone'] } },
  { id: 'goalline', label: 'Goal line', group: 'field',
    sets: 'Inside the opponent\'s 5.',
    why: 'Who actually gets the carry or the fade when it\'s a yard or two.',
    patch: { zones: ['goalline'] } },
  { id: 'backedup', label: 'Backed up', group: 'field',
    sets: 'Own 1–20 yard line.',
    why: 'Conservative calls, short fields for the defense.',
    patch: { zones: ['own1to20'] } },

  // ---- down & distance ----
  { id: 'thirdlong', label: '3rd & long', group: 'downs',
    sets: '3rd down, 7 or more to go.',
    why: 'Everyone in the stadium knows a pass is coming.',
    patch: { downs: [3], distances: ['d7to9', 'd10', 'd11plus'] } },
  { id: 'thirdshort', label: '3rd & short', group: 'downs',
    sets: '3rd down, 1–3 to go.',
    why: 'The conversion down. Power runs, quick throws, trust.',
    patch: { downs: [3], distances: ['d1', 'd2to3'] } },
  { id: 'earlydowns', label: 'Early downs', group: 'downs',
    sets: '1st and 2nd down only.',
    why: 'Where play-callers show what they actually want to do.',
    patch: { downs: [1, 2] } },
  { id: 'fourth', label: '4th down', group: 'downs',
    sets: '4th down, any distance.',
    why: 'Aggression index. Who goes for it, and with whom.',
    patch: { downs: [4] } },

  // ---- clock ----
  { id: 'twomin', label: 'Two-minute drill', group: 'clock',
    sets: 'Under 2:00 in either half.',
    why: 'Tempo and sidelines take over; some players vanish, some appear.',
    patch: { twoMinute: 'yes' } },
  { id: 'q4', label: '4th quarter', group: 'clock',
    sets: 'Quarter = 4.',
    why: 'Fatigue, game script, and who the coach trusts late.',
    patch: { quarters: ['4'] } },
  { id: 'firsthalf', label: '1st half', group: 'clock',
    sets: 'Quarters 1 and 2.',
    why: 'Scripted plays — the first fifteen are rehearsed all week.',
    patch: { quarters: ['1', '2'] } },

  // ---- passing ----
  { id: 'deep', label: 'Deep shots', group: 'passing',
    sets: 'Pass plays with 16+ air yards.',
    why: 'Low volume, huge swing. Who gets the shot plays?',
    patch: { playTypes: ['pass'], passDepth: ['d16to25', 'd26plus'] } },
  { id: 'short', label: 'Short game', group: 'passing',
    sets: 'Pass plays at or behind 5 air yards.',
    why: 'Screens, flats and checkdowns — YAC territory.',
    patch: { playTypes: ['pass'], passDepth: ['behindLOS', 'd1to5'] } },
  { id: 'pressure', label: 'Under pressure', group: 'passing',
    sets: 'Pass plays where the QB was hit.',
    why: 'Who the quarterback looks for when the pocket breaks.',
    patch: { playTypes: ['pass'], pressure: 'yes' } },

  // ---- rushing ----
  { id: 'inside', label: 'Inside runs', group: 'rushing',
    sets: 'Run plays between the tackles.',
    why: 'Power vs. finesse. The back\'s "real" yards per carry.',
    patch: { playTypes: ['run'], runDir: ['left_guard', 'middle', 'right_guard'] } },
  { id: 'outside', label: 'Outside runs', group: 'rushing',
    sets: 'Run plays to either end.',
    why: 'Speed to the edge — a different skill than inside work.',
    patch: { playTypes: ['run'], runDir: ['left_end', 'right_end'] } },

  // ---- venue ----
  { id: 'home', label: 'Home games', group: 'venue',
    sets: 'Possession team is the home team.',
    why: 'Crowd noise changes cadence, tempo and the penalty count.',
    patch: { homeAway: 'home' } },
  { id: 'away', label: 'Road games', group: 'venue',
    sets: 'Possession team is the away team.',
    why: 'The split that separates stars from stat-padders.',
    patch: { homeAway: 'away' } },
]

export const SITUATION_GROUPS: { id: Situation['group']; label: string }[] = [
  { id: 'score', label: 'Score' },
  { id: 'downs', label: 'Down & distance' },
  { id: 'field', label: 'Field position' },
  { id: 'clock', label: 'Clock' },
  { id: 'passing', label: 'Passing' },
  { id: 'rushing', label: 'Rushing' },
  { id: 'venue', label: 'Venue' },
]

const sameSet = (a: unknown, b: unknown) => {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    const sb = new Set(b.map(String))
    return a.every(v => sb.has(String(v)))
  }
  return a === b
}

/** True when every key the situation sets is currently set to exactly that value. */
export function isSituationActive(s: Slicers, sit: Situation): boolean {
  return (Object.keys(sit.patch) as (keyof Slicers)[]).every(k => sameSet(s[k], sit.patch[k]))
}

export function activeSituations(s: Slicers): Situation[] {
  return SITUATIONS.filter(sit => isSituationActive(s, sit))
}

/** Patch that applies the situation (replaces the keys it names). */
export function applySituation(sit: Situation): Partial<Slicers> {
  return { ...sit.patch }
}

/** Patch that resets the keys the situation set back to their defaults. */
export function clearSituation(sit: Situation): Partial<Slicers> {
  const out: Partial<Slicers> = {}
  for (const k of Object.keys(sit.patch) as (keyof Slicers)[]) (out as any)[k] = DEFAULTS[k]
  return out
}

export function getSituation(id: string): Situation | undefined {
  return SITUATIONS.find(s => s.id === id)
}

/** "Surprise me" — a random situation, avoiding the ones already applied. */
export function randomSituation(exclude: string[] = []): Situation {
  const pool = SITUATIONS.filter(s => !exclude.includes(s.id))
  return pool[Math.floor(Math.random() * pool.length)] ?? SITUATIONS[0]
}
