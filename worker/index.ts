/**
 * QueryBall Worker — OPTIONAL stage-2 for the Ask box.
 *
 * NOT WIRED BY DEFAULT. The site deploys as static assets with no Worker
 * code; the Ask box's phrase dictionary runs entirely in the browser. Enable
 * this only if you want questions the dictionary can't parse to be sent to a
 * small language model that can ONLY choose from the filter menu below.
 *
 * To enable (see the owner guide, "Ask box — turning on the model fallback"):
 *   1. In wrangler.jsonc add:   "main": "worker/index.ts",
 *      and inside "assets" add: "binding": "ASSETS"
 *   2. npx wrangler secret put ANTHROPIC_API_KEY
 *   3. Optional: a KV namespace bound as ASK_CACHE (caches identical questions
 *      and enforces a per-IP daily cap). Without it, the cap is per-isolate.
 *   4. Redeploy. The browser detects /api/ask automatically — no client change.
 *
 * Guard rails: the model receives the question and a menu of allowed values,
 * never any data; its reply is validated against the menu before use; one
 * question per request; small token budget; per-IP daily cap.
 */

export interface Env {
  ASSETS: Fetcher
  ANTHROPIC_API_KEY?: string
  ASK_MODEL?: string
  ASK_DAILY_CAP?: string
  ASK_CACHE?: KVNamespace
}

// The menu. Keys and values must match src/lib/slicers.ts.
const MENU = {
  positions: ['QB', 'RB', 'WR', 'TE'],
  teams: ['ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE','DAL','DEN','DET','GB','HOU','IND','JAX','KC','LAC','LAR','LV','MIA','MIN','NE','NO','NYG','NYJ','PHI','PIT','SEA','SF','TB','TEN','WAS'],
  downs: [1, 2, 3, 4],
  distances: ['d1', 'd2to3', 'd4to6', 'd7to9', 'd10', 'd11plus'],
  scoreStates: ['lose17', 'lose9to16', 'lose4to8', 'lose1to3', 'tied', 'win1to3', 'win4to8', 'win9to16', 'win17'],
  quarters: ['1', '2', '3', '4', 'OT'],
  twoMinute: ['yes', 'no'],
  zones: ['own1to20', 'own21to50', 'opp49to21', 'redzone', 'goalline'],
  shotgun: ['yes', 'no'],
  noHuddle: ['yes', 'no'],
  playTypes: ['pass', 'run'],
  passDepth: ['behindLOS', 'd1to5', 'd6to10', 'd11to15', 'd16to25', 'd26plus'],
  passDir: ['left', 'middle', 'right'],
  runDir: ['left_end', 'left_tackle', 'left_guard', 'middle', 'right_guard', 'right_tackle', 'right_end'],
  pressure: ['yes', 'no'],
  homeAway: ['home', 'away'],
  seasonType: ['regular', 'postseason', 'all'],
} as const
type MenuKey = keyof typeof MENU
const LIST_KEYS: MenuKey[] = ['positions', 'teams', 'downs', 'distances', 'scoreStates', 'quarters', 'zones', 'playTypes', 'passDepth', 'passDir', 'runDir']
const SCALAR_KEYS: MenuKey[] = ['twoMinute', 'shotgun', 'noHuddle', 'pressure', 'homeAway', 'seasonType']

const SYSTEM = `You translate NFL questions into filter settings for a stats site. Reply with JSON only, no prose.
Schema: {"patch": {<key>: <value>}, "understood": [short phrases you mapped], "unresolved": [phrases you could not map]}
Allowed keys and values (use ONLY these; omit a key rather than guessing):
${Object.entries(MENU).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}
Also allowed: "seasons": [years 2023-2026], "weeks": [1-22].
Score-state meanings: lose*/win* are point margins for the team with the ball (lose4to8 = trailing by 4-8). "Trailing" = all lose* values; "leading" = all win*; "close" = lose4to8,lose1to3,tied,win1to3,win4to8.
Distances: d1=1 yd, d2to3, d4to6, d7to9, d10, d11plus. "short" = d1,d2to3; "medium" = d4to6,d7to9; "long" = d10,d11plus.
Zones: redzone = inside opponent 20; goalline = inside 5. passDepth are air-yard buckets. Do not invent player names; players are matched elsewhere.`

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname === '/api/ask') return handleAsk(request, env)
    return env.ASSETS.fetch(request)
  },
}

async function handleAsk(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'POST only' }, 405)
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'ask fallback not configured' }, 501)
  let body: { question?: string } = {}
  try { body = await request.json() } catch { return json({ error: 'bad json' }, 400) }
  const question = String(body.question ?? '').trim().slice(0, 240)
  if (question.length < 3) return json({ error: 'empty question' }, 400)

  // Daily cap per IP (KV-backed when available).
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown'
  const cap = Number(env.ASK_DAILY_CAP ?? 60)
  const day = new Date().toISOString().slice(0, 10)
  if (env.ASK_CACHE) {
    const hitKey = `ip:${ip}:${day}`
    const n = Number((await env.ASK_CACHE.get(hitKey)) ?? 0)
    if (n >= cap) return json({ error: 'daily limit reached' }, 429)
    await env.ASK_CACHE.put(hitKey, String(n + 1), { expirationTtl: 86400 })
    const cached = await env.ASK_CACHE.get(`q:${question.toLowerCase()}`)
    if (cached) return new Response(cached, { headers: { 'content-type': 'application/json', 'x-ask-cache': 'hit' } })
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: env.ASK_MODEL ?? 'claude-haiku-5-5',
      max_tokens: 300,
      system: SYSTEM,
      messages: [{ role: 'user', content: question }],
    }),
  })
  if (!res.ok) return json({ error: `model error ${res.status}` }, 502)
  const data: any = await res.json()
  const text: string = data?.content?.[0]?.text ?? ''
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return json({ patch: {}, understood: [], unresolved: [question] })
  let parsed: any
  try { parsed = JSON.parse(m[0]) } catch { return json({ patch: {}, understood: [], unresolved: [question] }) }

  // Validate strictly against the menu.
  const patch: Record<string, unknown> = {}
  const raw = parsed?.patch ?? {}
  for (const k of LIST_KEYS) {
    if (!Array.isArray(raw[k])) continue
    const allowed = MENU[k] as readonly (string | number)[]
    const vals = raw[k].filter((v: unknown) => allowed.includes(v as string | number))
    if (vals.length) patch[k] = vals
  }
  for (const k of SCALAR_KEYS) {
    const allowed = MENU[k] as readonly string[]
    if (typeof raw[k] === 'string' && allowed.includes(raw[k])) patch[k] = raw[k]
  }
  if (Array.isArray(raw.seasons)) { const s = raw.seasons.map(Number).filter((y: number) => y >= 2023 && y <= 2026); if (s.length) patch.seasons = s }
  if (Array.isArray(raw.weeks)) { const w = raw.weeks.map(Number).filter((n: number) => n >= 1 && n <= 22); if (w.length) patch.weeks = w }

  const out = JSON.stringify({
    patch,
    understood: Array.isArray(parsed.understood) ? parsed.understood.slice(0, 8).map(String) : [],
    unresolved: Array.isArray(parsed.unresolved) ? parsed.unresolved.slice(0, 8).map(String) : [],
  })
  if (env.ASK_CACHE) await env.ASK_CACHE.put(`q:${question.toLowerCase()}`, out, { expirationTtl: 60 * 60 * 24 * 30 })
  return new Response(out, { headers: { 'content-type': 'application/json' } })
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } })
}
