/**
 * Ask a question → filter settings.
 *
 * Stage 1 (this file, runs in the browser, free): a phrase dictionary that
 * maps football English to slicer values. "Jefferson when trailing in the 4th
 * quarter" → player + score state + quarter. Anything it can't place is
 * returned as `unresolved`, some with suggested options ("late in the game"
 * → 4th quarter / two-minute drill) so the UI can ask instead of guessing.
 *
 * Stage 2 (optional, see worker/index.ts): if `/api/ask` is deployed, the UI
 * sends the unresolved remainder to a small model that can only choose from
 * the same menu. The dictionary runs first so most questions never leave the
 * phone.
 */
import type { Slicers, ScoreState, DistanceBucket, FieldZone, Quarter, PassDepth, RunDir } from './slicers'
import { SCORE_MACRO, DISTANCE_MACRO } from './slicers'
import type { Player } from './players'
import { TEAMS } from './nfl'

export type AskOption = { label: string; patch: Partial<Slicers> }
export type AskUnresolved = { text: string; options?: AskOption[] }
export type AskResult = {
  patch: Partial<Slicers>
  understood: string[]
  unresolved: AskUnresolved[]
  player?: Player
  playerCandidates?: Player[]
  /** Suggested deck for this question, e.g. '/decks/single-player'. */
  deck?: string
}

/* ---------------- team dictionary ---------------- */
const TEAM_WORDS: Record<string, string[]> = {
  ARI: ['cardinals', 'cards', 'arizona'], ATL: ['falcons', 'atlanta'], BAL: ['ravens', 'baltimore'],
  BUF: ['bills', 'buffalo'], CAR: ['panthers', 'carolina'], CHI: ['bears', 'chicago'],
  CIN: ['bengals', 'cincinnati', 'cincy'], CLE: ['browns', 'cleveland'], DAL: ['cowboys', 'dallas'],
  DEN: ['broncos', 'denver'], DET: ['lions', 'detroit'], GB: ['packers', 'green bay'],
  HOU: ['texans', 'houston'], IND: ['colts', 'indianapolis', 'indy'], JAX: ['jaguars', 'jags', 'jacksonville'],
  KC: ['chiefs', 'kansas city'], LAC: ['chargers', 'bolts'], LAR: ['rams'], LV: ['raiders', 'las vegas', 'vegas'],
  MIA: ['dolphins', 'fins', 'miami'], MIN: ['vikings', 'vikes', 'minnesota'], NE: ['patriots', 'pats', 'new england'],
  NO: ['saints', 'new orleans'], NYG: ['giants'], NYJ: ['jets'], PHI: ['eagles', 'philadelphia', 'philly'],
  PIT: ['steelers', 'pittsburgh'], SEA: ['seahawks', 'hawks', 'seattle'], SF: ['49ers', 'niners', 'san francisco'],
  TB: ['buccaneers', 'bucs', 'tampa bay', 'tampa'], TEN: ['titans', 'tennessee'], WAS: ['commanders', 'washington'],
}
// Abbreviations that are also English words — only accept them uppercased in the raw question.
const RISKY_ABBR = new Set(['NO', 'NE', 'LA', 'SF', 'TB', 'GB', 'KC', 'LV'])

const STOP = new Set(('a an the of for in on at to by with and or but is are was were be been how what which who ' +
  'show me his her their my our this that these those when while during as from into over it its does do did ' +
  'vs versus against stats stat numbers number production performance performed play plays games game season seasons ' +
  'look like usage week weeks wk').split(' '))

const uniq = <T,>(xs: T[]) => Array.from(new Set(xs))
const mergeList = <T,>(a: T[] | undefined, b: T[]) => uniq([...(a ?? []), ...b])

type Rule = {
  re: RegExp
  label: string | ((m: RegExpMatchArray) => string)
  patch: Partial<Slicers> | ((m: RegExpMatchArray) => Partial<Slicers>)
}

const ordinal = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : n === 3 ? '3rd' : '4th')
const downNum = (w: string) => ({ '1st': 1, first: 1, '2nd': 2, second: 2, '3rd': 3, third: 3, '4th': 4, fourth: 4 }[w] ?? 0)

const RULES: Rule[] = [
  // ---- down & distance (checked before generic "down"/"long") ----
  { re: /\b(1st|2nd|3rd|4th|first|second|third|fourth)\s*(?:down)?\s*(?:&|and|n)\s*(short|medium|med|long)\b/,
    label: m => `${ordinal(downNum(m[1]))} & ${m[2]}`,
    patch: m => ({ downs: [downNum(m[1])], distances: DISTANCE_MACRO[m[2] === 'med' ? 'medium' : (m[2] as 'short' | 'medium' | 'long')] }) },
  { re: /\b(1st|2nd|3rd|4th|first|second|third|fourth)\s*(?:&|and|n)\s*(\d{1,2})\b/,
    label: m => `${ordinal(downNum(m[1]))} & ${m[2]}`,
    patch: m => ({ downs: [downNum(m[1])], distances: [bucketOf(Number(m[2]))] }) },
  { re: /\b(1st|2nd|3rd|4th|first|second|third|fourth)\s+downs?\b/,
    label: m => `${ordinal(downNum(m[1]))} down`, patch: m => ({ downs: [downNum(m[1])] }) },
  { re: /\bearly downs?\b/, label: 'early downs', patch: { downs: [1, 2] } },
  { re: /\bshort yardage\b/, label: 'short yardage', patch: { distances: DISTANCE_MACRO.short } },
  { re: /\blong yardage\b/, label: 'long yardage', patch: { distances: DISTANCE_MACRO.long } },

  // ---- score state ----
  { re: /\b(trailing|behind|losing|down)\s+by\s+(\d{1,2})\s*(\+|plus|or more)?/,
    label: m => `trailing by ${m[2]}${m[3] ? '+' : ''}`,
    patch: m => ({ scoreStates: marginBuckets('lose', Number(m[2]), !!m[3]) }) },
  { re: /\b(leading|ahead|winning|up)\s+by\s+(\d{1,2})\s*(\+|plus|or more)?/,
    label: m => `leading by ${m[2]}${m[3] ? '+' : ''}`,
    patch: m => ({ scoreStates: marginBuckets('win', Number(m[2]), !!m[3]) }) },
  { re: /\b(trailing|behind|losing|when (?:they(?:'re| are)?\s*)?down)\b/, label: 'trailing', patch: { scoreStates: SCORE_MACRO.trailing } },
  { re: /\b(leading|ahead|winning|with (?:a|the) lead|protecting (?:a|the) lead)\b/, label: 'leading', patch: { scoreStates: SCORE_MACRO.leading } },
  { re: /\b(tied|tie game)\b/, label: 'tied', patch: { scoreStates: SCORE_MACRO.tied } },
  { re: /\b(close games?|one[- ]score|within (?:7|8|one score)|tight games?)\b/, label: 'close game', patch: { scoreStates: SCORE_MACRO.close } },
  { re: /\b(blowouts?|garbage time)\b/, label: 'blowouts', patch: { scoreStates: ['lose17', 'win17'] } },
  { re: /\b(no|without|excluding|minus|remove)\s+(blowouts?|garbage time)\b/, label: 'blowouts off',
    patch: { scoreStates: ['lose9to16', 'lose4to8', 'lose1to3', 'tied', 'win1to3', 'win4to8', 'win9to16'] } },

  // ---- field ----
  { re: /\b(red ?zone|inside the 20)\b/, label: 'red zone', patch: { zones: ['redzone'] } },
  { re: /\b(goal ?line|inside the 5|at the goal)\b/, label: 'goal line', patch: { zones: ['goalline'] } },
  { re: /\b(backed up|own (?:end|territory)|deep in (?:their|his) own)\b/, label: 'backed up', patch: { zones: ['own1to20'] } },
  { re: /\b(midfield|between the 20s)\b/, label: 'midfield', patch: { zones: ['own21to50', 'opp49to21'] } },
  { re: /\b(plus territory|opponent'?s? (?:side|territory))\b/, label: 'opponent territory', patch: { zones: ['opp49to21', 'redzone'] } },

  // ---- clock ----
  { re: /\b(two[- ]minute|2[- ]minute|hurry[- ]up|final two minutes|last two minutes|under 2:00)\b/, label: 'two-minute drill', patch: { twoMinute: 'yes' } },
  { re: /\b(4th|fourth) quarter\b|\bq4\b/, label: '4th quarter', patch: { quarters: ['4'] } },
  { re: /\b(3rd|third) quarter\b|\bq3\b/, label: '3rd quarter', patch: { quarters: ['3'] } },
  { re: /\b(2nd|second) quarter\b|\bq2\b/, label: '2nd quarter', patch: { quarters: ['2'] } },
  { re: /\b(1st|first) quarter\b|\bq1\b/, label: '1st quarter', patch: { quarters: ['1'] } },
  { re: /\b(overtime|in ot)\b/, label: 'overtime', patch: { quarters: ['OT'] } },
  { re: /\b(first|1st) half\b/, label: '1st half', patch: { quarters: ['1', '2'] } },
  { re: /\b(second|2nd) half\b/, label: '2nd half', patch: { quarters: ['3', '4'] } },

  // ---- passing ----
  { re: /\b(deep (?:balls?|shots?|passes|targets)|downfield|go routes?|bombs?)\b/, label: 'deep targets', patch: { playTypes: ['pass'], passDepth: ['d16to25', 'd26plus'] } },
  { re: /\b(screens?|checkdowns?|short passes|short game|dump ?offs?)\b/, label: 'short passes', patch: { playTypes: ['pass'], passDepth: ['behindLOS', 'd1to5'] } },
  { re: /\bintermediate\b/, label: 'intermediate', patch: { playTypes: ['pass'], passDepth: ['d11to15'] } },
  { re: /\b(over the middle|middle of the field)\b/, label: 'over the middle', patch: { passDir: ['middle'] } },
  { re: /\b(to the left|left side)\b/, label: 'left side', patch: { passDir: ['left'] } },
  { re: /\b(to the right|right side)\b/, label: 'right side', patch: { passDir: ['right'] } },
  { re: /\b(under pressure|pressured|when hit|qb hits?)\b/, label: 'under pressure', patch: { playTypes: ['pass'], pressure: 'yes' } },
  { re: /\b(clean pocket|unpressured)\b/, label: 'clean pocket', patch: { playTypes: ['pass'], pressure: 'no' } },
  { re: /\bshotgun\b/, label: 'shotgun', patch: { shotgun: 'yes' } },
  { re: /\bunder center\b/, label: 'under center', patch: { shotgun: 'no' } },
  { re: /\bno[- ]huddle\b/, label: 'no-huddle', patch: { noHuddle: 'yes' } },
  { re: /\b(passing|pass plays|throws?|throwing|dropbacks?|targets?)\b/, label: 'pass plays', patch: { playTypes: ['pass'] } },

  // ---- rushing ----
  { re: /\b(outside runs?|to the edge|sweeps?|tosses?|outside zone)\b/, label: 'outside runs', patch: { playTypes: ['run'], runDir: ['left_end', 'right_end'] } },
  { re: /\b(inside runs?|between the tackles|up the middle|inside zone)\b/, label: 'inside runs', patch: { playTypes: ['run'], runDir: ['left_guard', 'middle', 'right_guard'] } },
  { re: /\b(rushing|run plays|runs|carries|rushes|on the ground)\b/, label: 'run plays', patch: { playTypes: ['run'] } },

  // ---- venue / season type ----
  { re: /\b(at home|home games?)\b/, label: 'home games', patch: { homeAway: 'home' } },
  { re: /\b(on the road|away games?|road games?)\b/, label: 'road games', patch: { homeAway: 'away' } },
  { re: /\b(playoffs?|postseason)\b/, label: 'playoffs', patch: { seasonType: 'postseason', weeks: [] } },
]

function bucketOf(n: number): DistanceBucket {
  if (n <= 1) return 'd1'
  if (n <= 3) return 'd2to3'
  if (n <= 6) return 'd4to6'
  if (n <= 9) return 'd7to9'
  if (n === 10) return 'd10'
  return 'd11plus'
}
function marginBuckets(side: 'lose' | 'win', n: number, orMore: boolean): ScoreState[] {
  const all: ScoreState[] = side === 'lose'
    ? ['lose1to3', 'lose4to8', 'lose9to16', 'lose17']
    : ['win1to3', 'win4to8', 'win9to16', 'win17']
  const idx = n <= 3 ? 0 : n <= 8 ? 1 : n <= 16 ? 2 : 3
  return orMore ? all.slice(idx) : [all[idx]]
}

/* ---------------- vague phrases → ask the user ---------------- */
const VAGUE: { re: RegExp; text: string; options: AskOption[] }[] = [
  { re: /\blate(?: in the game| in games)?\b/, text: 'late in the game', options: [
    { label: '4th quarter', patch: { quarters: ['4'] } },
    { label: 'Two-minute drill', patch: { twoMinute: 'yes' } },
    { label: 'One-score 4th quarter', patch: { quarters: ['4'], scoreStates: SCORE_MACRO.close } },
  ] },
  { re: /\bearly(?: in the game| in games)?\b/, text: 'early in the game', options: [
    { label: '1st quarter', patch: { quarters: ['1'] } },
    { label: '1st half', patch: { quarters: ['1', '2'] } },
  ] },
  { re: /\bwhen it matters\b|\bclutch\b|\bcrunch time\b/, text: 'when it matters', options: [
    { label: 'One-score 4th quarter', patch: { quarters: ['4'], scoreStates: SCORE_MACRO.close } },
    { label: '3rd down', patch: { downs: [3] } },
    { label: 'Red zone', patch: { zones: ['redzone'] } },
  ] },
  { re: /\bbig games?\b|\bprime ?time\b/, text: 'big games', options: [
    { label: 'Playoffs', patch: { seasonType: 'postseason', weeks: [] } },
    { label: 'Close games', patch: { scoreStates: SCORE_MACRO.close } },
  ] },
]

/* ---------------- main ---------------- */
export function parseQuestion(raw: string, players: Player[] = []): AskResult {
  const original = raw.trim()
  let q = ' ' + original.toLowerCase().replace(/[“”"]/g, '').replace(/[^\w\s'&:+\-]/g, ' ').replace(/\s+/g, ' ') + ' '
  const patch: Partial<Slicers> = {}
  const understood: string[] = []
  const unresolved: AskUnresolved[] = []
  const consume = (m: RegExpMatchArray) => { q = q.replace(m[0], ' ') }

  // Seasons & weeks first (numbers are easy to confuse with margins otherwise).
  for (const m of Array.from(q.matchAll(/\b(20[12]\d)\b/g))) {
    patch.seasons = mergeList(patch.seasons, [Number(m[1])]); understood.push(m[1])
  }
  q = q.replace(/\b20[12]\d\b/g, ' ')
  if (/\blast (?:season|year)\b/.test(q)) { patch.seasons = [2025]; understood.push('2025 season'); q = q.replace(/\blast (?:season|year)\b/, ' ') }
  if (/\bthis (?:season|year)\b/.test(q)) { patch.seasons = [2026]; understood.push('2026 season'); q = q.replace(/\bthis (?:season|year)\b/, ' ') }
  const wk = q.match(/\b(?:weeks?|wks?)\s*(\d{1,2})\s*(?:(?:-|–|to|through|thru)\s*(\d{1,2}))?/)
  if (wk) {
    const a = Number(wk[1]), b = wk[2] ? Number(wk[2]) : a
    const lo = Math.min(a, b), hi = Math.max(a, b)
    patch.weeks = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).filter(w => w >= 1 && w <= 22)
    understood.push(lo === hi ? `week ${lo}` : `weeks ${lo}–${hi}`); consume(wk)
  }
  const lastN = q.match(/\blast\s+(\d)\s+(?:weeks|games)\b/)
  if (lastN) { understood.push(`last ${lastN[1]} weeks (set weeks manually)`); consume(lastN) }

  // Positions.
  const POS: [RegExp, string][] = [
    [/\b(qbs?|quarterbacks?|passers?)\b/, 'QB'], [/\b(rbs?|running backs?|backs|rushers?)\b/, 'RB'],
    [/\b(wrs?|wide ?receivers?|receivers?|wideouts?)\b/, 'WR'], [/\b(tes?|tight ends?)\b/, 'TE'],
  ]
  for (const [re, pos] of POS) { const m = q.match(re); if (m) { patch.positions = mergeList(patch.positions, [pos]); understood.push(pos); consume(m) } }

  // Opponent phrasing ("vs the Chiefs", "against Buffalo") before team detection.
  const oppRe = /\b(?:vs|versus|against|facing)\s+(?:the\s+)?([a-z0-9 ]{3,20}?)(?=\s(?:in|on|when|while|during|at|this|last|$)|\s*$)/
  const om = q.match(oppRe)
  if (om) {
    const t = teamFrom(om[1])
    if (t) { patch.opponents = mergeList(patch.opponents, [t]); understood.push(`vs ${t}`); consume(om) }
  }
  // Teams.
  for (const [abbr, words] of Object.entries(TEAM_WORDS)) {
    for (const w of words) {
      const re = new RegExp(`\\b${w.replace(/\s/g, '\\s')}\\b`)
      const m = q.match(re)
      if (m) { patch.teams = mergeList(patch.teams, [abbr]); understood.push(abbr); consume(m); break }
    }
  }
  for (const abbr of TEAMS) {
    const re = new RegExp(`\\b${abbr.toLowerCase()}\\b`)
    const m = q.match(re)
    if (!m) continue
    if (RISKY_ABBR.has(abbr) && !new RegExp(`\\b${abbr}\\b`).test(original)) continue
    if (!patch.teams?.includes(abbr)) { patch.teams = mergeList(patch.teams, [abbr]); understood.push(abbr) }
    consume(m)
  }

  // Vague phrases → options (checked before rules so "late" doesn't fall to the floor).
  for (const v of VAGUE) {
    const m = q.match(v.re)
    if (m) { unresolved.push({ text: v.text, options: v.options }); consume(m) }
  }

  // Situational rules.
  for (const r of RULES) {
    const m = q.match(r.re)
    if (!m) continue
    const p = typeof r.patch === 'function' ? r.patch(m) : r.patch
    for (const [k, v] of Object.entries(p)) {
      const cur = (patch as any)[k]
      ;(patch as any)[k] = Array.isArray(v) && Array.isArray(cur) ? uniq([...cur, ...v]) : v
    }
    understood.push(typeof r.label === 'function' ? r.label(m) : r.label)
    consume(m)
  }

  // Players — match remaining words against the roster (full name, then unique surname).
  let player: Player | undefined
  let playerCandidates: Player[] | undefined
  if (players.length) {
    const rest = q.trim()
    const byFull = players.filter(p => rest.includes(' ' + p.name.toLowerCase() + ' ') || rest.startsWith(p.name.toLowerCase() + ' ') || rest.endsWith(' ' + p.name.toLowerCase()) || rest === p.name.toLowerCase())
    if (byFull.length) {
      player = byFull[0]
      q = q.replace(player.name.toLowerCase(), ' ')
    } else {
      const words = rest.split(' ').filter(w => w.length >= 3 && !STOP.has(w))
      for (const w of words) {
        const hits = players.filter(p => {
          const parts = p.name.toLowerCase().replace(/[.']/g, '').split(' ')
          return parts[parts.length - 1] === w.replace(/[.']/g, '')
        })
        if (hits.length === 1) { player = hits[0]; q = q.replace(new RegExp(`\\b${w}\\b`), ' '); break }
        if (hits.length > 1) { playerCandidates = hits.slice(0, 6); q = q.replace(new RegExp(`\\b${w}\\b`), ' '); break }
      }
    }
    if (player) { patch.playerIds = [player.gsis_id]; understood.unshift(player.name) }
  }

  // Whatever is left and meaningful is unresolved.
  const leftovers = q.split(' ').map(w => w.trim()).filter(w => w && !STOP.has(w) && !/^\d+$/.test(w) && w.length > 2)
  for (const w of uniq(leftovers)) unresolved.push({ text: w })

  // Deck suggestion.
  let deck: string | undefined
  if (player || playerCandidates) deck = '/decks/single-player'
  else if (/\bdefen[cs]e|allowed\b/.test(original.toLowerCase())) deck = patch.teams?.length ? '/decks/team-defense' : '/decks/league-defense'
  else if (/\btendenc|play[- ]?calling|pass rate|run rate\b/.test(original.toLowerCase())) deck = '/decks/team-tendencies'
  else if (patch.teams?.length && patch.positions?.length === 1) {
    const p = patch.positions[0]
    deck = p === 'QB' ? '/decks/team-qb' : p === 'RB' ? '/decks/team-rb' : '/decks/team-passcatchers'
  } else deck = '/decks/league-production'

  // Words that only steer the deck choice (not a filter) count as understood.
  const ROUTING = new Set(['defense', 'defence', 'defensive', 'allowed', 'tendencies', 'tendency', 'playcalling', 'leaderboard', 'leaders', 'rankings'])
  const routed = unresolved.filter(u => !u.options && ROUTING.has(u.text))
  const finalUnresolved = unresolved.filter(u => !(u.options == null && ROUTING.has(u.text)))
  if (routed.length && deck) understood.push(deck.includes('defense') ? 'defense' : deck.includes('tendencies') ? 'tendencies' : 'leaderboard')
  return { patch, understood: uniq(understood), unresolved: finalUnresolved, player, playerCandidates, deck }
}

function teamFrom(text: string): string | undefined {
  const t = text.trim().toLowerCase()
  for (const [abbr, words] of Object.entries(TEAM_WORDS)) if (words.some(w => t === w || t.startsWith(w + ' ') || t.endsWith(' ' + w))) return abbr
  const up = t.toUpperCase().split(' ')[0]
  if ((TEAMS as readonly string[]).includes(up)) return up
  return undefined
}

/** Optional stage 2 — only works when worker/index.ts is deployed as the site's Worker. */
export async function askRemote(question: string, context: { understood: string[] }): Promise<AskResult | null> {
  try {
    const res = await fetch('/api/ask', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, context }),
    })
    if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null
    const json = await res.json()
    if (!json || typeof json !== 'object' || !json.patch) return null
    return { patch: json.patch, understood: json.understood ?? [], unresolved: (json.unresolved ?? []).map((t: string) => ({ text: t })) }
  } catch { return null }
}

export type { ScoreState, FieldZone, Quarter, PassDepth, RunDir }
