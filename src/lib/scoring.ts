/**
 * Fantasy scoring — one setting the whole site follows.
 *
 * The scoring config lives in a tiny external store (so SQL builders that are
 * plain functions can read it) and is persisted in localStorage and the URL
 * (`fs=` param) so a shared link carries the league's settings. Every fantasy
 * number on the site — the Fantasy tabs, Studio's fantasy metrics, the
 * Matchup page — is computed from `fantasySql()` / `fantasyPoints()` below.
 *
 * Presets: PPR (default), Half, Standard. Anything else is Custom.
 */
import { useSyncExternalStore } from 'react'

export type Scoring = {
  rec: number          // points per reception (0 / 0.5 / 1)
  passTd: number       // 4 or 6
  passYdPt: number     // yards per point (25 → 0.04/yd)
  rushRecYdPt: number  // yards per point (10 → 0.1/yd)
  tePrem: number       // extra per TE reception
  int: number          // per interception thrown (negative)
  fum: number          // per fumble lost (negative)
  bonus: boolean       // +3 for 100 rush/rec, +3 for 300 pass (per game)
}

export const PRESETS: Record<'ppr' | 'half' | 'std', Scoring> = {
  ppr:  { rec: 1,   passTd: 4, passYdPt: 25, rushRecYdPt: 10, tePrem: 0, int: -2, fum: -2, bonus: false },
  half: { rec: 0.5, passTd: 4, passYdPt: 25, rushRecYdPt: 10, tePrem: 0, int: -2, fum: -2, bonus: false },
  std:  { rec: 0,   passTd: 4, passYdPt: 25, rushRecYdPt: 10, tePrem: 0, int: -2, fum: -2, bonus: false },
}
export const DEFAULT_SCORING: Scoring = PRESETS.ppr
const KEY = 'qb.scoring'

export function presetName(s: Scoring): 'ppr' | 'half' | 'std' | 'custom' {
  for (const k of ['ppr', 'half', 'std'] as const) if (encode(PRESETS[k]) === encode(s)) return k
  return 'custom'
}
export function scoringLabel(s: Scoring): string {
  const p = presetName(s)
  const base = p === 'ppr' ? 'PPR' : p === 'half' ? 'Half PPR' : p === 'std' ? 'Standard' : `${s.rec} PPR`
  return `${base} · ${s.passTd}-pt pass TD${s.tePrem ? ` · TE +${s.tePrem}` : ''}${s.bonus ? ' · bonuses' : ''}`
}

/* ---------- URL / storage ---------- */
export function encode(s: Scoring): string {
  const p = (['ppr', 'half', 'std'] as const).find(k => {
    const q = PRESETS[k]; return q.rec === s.rec && q.passTd === s.passTd && q.passYdPt === s.passYdPt && q.rushRecYdPt === s.rushRecYdPt && q.tePrem === s.tePrem && q.int === s.int && q.fum === s.fum && q.bonus === s.bonus
  })
  return p ?? [s.rec, s.passTd, s.passYdPt, s.rushRecYdPt, s.tePrem, s.int, s.fum, s.bonus ? 1 : 0].join(',')
}
export function decode(v: string | null | undefined): Scoring | null {
  if (!v) return null
  if (v in PRESETS) return PRESETS[v as keyof typeof PRESETS]
  const n = v.split(',').map(Number)
  if (n.length !== 8 || n.some(isNaN)) return null
  return { rec: n[0], passTd: n[1], passYdPt: n[2], rushRecYdPt: n[3], tePrem: n[4], int: n[5], fum: n[6], bonus: n[7] === 1 }
}

/* ---------- store ---------- */
let current: Scoring = (() => {
  try {
    const fromUrl = decode(new URLSearchParams(location.search).get('fs'))
    if (fromUrl) return fromUrl
    return decode(localStorage.getItem(KEY)) ?? DEFAULT_SCORING
  } catch { return DEFAULT_SCORING }
})()
const subs = new Set<() => void>()
export function getScoring(): Scoring { return current }
export function setScoring(s: Scoring) {
  current = s
  try { localStorage.setItem(KEY, encode(s)) } catch { /* private mode */ }
  try {
    const u = new URL(location.href)
    if (presetName(s) === 'ppr') u.searchParams.delete('fs'); else u.searchParams.set('fs', encode(s))
    history.replaceState(history.state, '', u.toString())
  } catch { /* ignore */ }
  subs.forEach(fn => fn())
}
export function useScoring(): [Scoring, (s: Scoring) => void] {
  const s = useSyncExternalStore(fn => { subs.add(fn); return () => { subs.delete(fn) } }, getScoring, getScoring)
  return [s, setScoring]
}

/* ---------- SQL ---------- */
/** Fantasy points as a SQL expression over game-log columns
 * (passing_yards, passing_tds, interceptions, rushing_yards, rushing_tds,
 * receptions, receiving_yards, receiving_tds). `pos` applies the TE premium.
 * Pass `cols` to rename the columns if your query aliases them. */
export function fantasySql(s: Scoring = getScoring(), opts: { pos?: string; posCol?: string; fumCol?: string } = {}): string {
  const recPts = opts.pos ? (s.rec + (opts.pos === 'TE' ? s.tePrem : 0)) : s.rec
  const recExpr = opts.posCol ? `(${s.rec} + CASE WHEN ${opts.posCol} = 'TE' THEN ${s.tePrem} ELSE 0 END)` : String(recPts)
  const parts = [
    `COALESCE(passing_yards,0) * ${1 / s.passYdPt}`,
    `COALESCE(passing_tds,0) * ${s.passTd}`,
    `COALESCE(interceptions,0) * ${s.int}`,
    `(COALESCE(rushing_yards,0) + COALESCE(receiving_yards,0)) * ${1 / s.rushRecYdPt}`,
    `(COALESCE(rushing_tds,0) + COALESCE(receiving_tds,0)) * 6`,
    `COALESCE(receptions,0) * ${recExpr}`,
  ]
  if (opts.fumCol) parts.push(`COALESCE(${opts.fumCol},0) * ${s.fum}`)
  if (s.bonus) parts.push(`(CASE WHEN COALESCE(rushing_yards,0) >= 100 THEN 3 ELSE 0 END) + (CASE WHEN COALESCE(receiving_yards,0) >= 100 THEN 3 ELSE 0 END) + (CASE WHEN COALESCE(passing_yards,0) >= 300 THEN 3 ELSE 0 END)`)
  return `(${parts.join(' + ')})`
}

/** Same formula in JS, for rows already in memory. */
export function fantasyPoints(r: Record<string, any>, s: Scoring = getScoring(), pos?: string): number {
  const n = (k: string) => Number(r[k] ?? 0) || 0
  let pts = n('passing_yards') / s.passYdPt + n('passing_tds') * s.passTd + n('interceptions') * s.int
    + (n('rushing_yards') + n('receiving_yards')) / s.rushRecYdPt + (n('rushing_tds') + n('receiving_tds')) * 6
    + n('receptions') * (s.rec + (pos === 'TE' ? s.tePrem : 0)) + n('fumbles_lost') * s.fum
  if (s.bonus) pts += (n('rushing_yards') >= 100 ? 3 : 0) + (n('receiving_yards') >= 100 ? 3 : 0) + (n('passing_yards') >= 300 ? 3 : 0)
  return Math.round(pts * 10) / 10
}
