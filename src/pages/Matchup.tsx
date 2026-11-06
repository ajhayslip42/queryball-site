/**
 * Matchup — fantasy matchup comparison.
 *
 * Pick a position (or FLEX), pick three players, and get: a card per player
 * with this week's game (opponent, line, implied total, surface, opposing
 * QB), snap %, fantasy points by window; a metrics table in the window you
 * choose (Season / Last week / Last 3); and a position-specific read on the
 * defense each player faces, ranked against all 32. Fantasy numbers follow the
 * site-wide scoring setting. State lives in the URL: mpos, mp (ids), win.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import clsx from 'clsx'
import { useQuery } from '@/lib/useQuery'
import { usePlayerIndex } from '@/lib/usePlayerIndex'
import { useIsMobile } from '@/lib/useIsMobile'
import { useScoring, scoringLabel } from '@/lib/scoring'
import { TEAM_COLORS, headshotUrl } from '@/lib/nfl'
import type { Player } from '@/lib/players'
import {
  nextGamesSql, toNextGame, seasonSql, playerWeeksSql, defenseSql, defenseReads, defaultPlayersSql,
  summarize, pickWindow, CARD_ROWS, WIN_LABEL, fmtVal, ordinal,
  type Pos, type PosSel, type Win, type PlayerWeek, type NextGame, type WindowStats,
} from '@/lib/matchup'
import FilterSheet from '@/components/mobile/FilterSheet'
import ScoringPanel from '@/components/ScoringPanel'
import { ContextStamp, ShareButton } from '@/components/mobile/Share'

const POSITIONS: PosSel[] = ['QB', 'RB', 'WR', 'TE', 'FLEX']
const WINS: Win[] = ['season', 'last', 'last3']

export default function Matchup() {
  const [search, setSearch] = useSearchParams()
  const pos = (POSITIONS.includes(search.get('mpos') as PosSel) ? search.get('mpos') : 'WR') as PosSel
  const ids = (search.get('mp') ?? '').split(',').filter(Boolean).slice(0, 3)
  const win = (WINS.includes(search.get('win') as Win) ? search.get('win') : 'season') as Win
  const setParam = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(search)
    for (const [k, v] of Object.entries(patch)) v == null || v === '' ? p.delete(k) : p.set(k, v)
    setSearch(p, { replace: true })
  }
  const isMobile = useIsMobile(1024)
  const [scoring] = useScoring()
  const { players, byId, loading: rosterLoading } = usePlayerIndex()

  // Season + schedule
  const seasonQ = useQuery<{ season: number }>(seasonSql, [])
  const season = seasonQ.data?.[0]?.season ?? 2026
  const nextQ = useQuery<any>(nextGamesSql(season), [season])
  const nextByTeam = useMemo(() => new Map((nextQ.data ?? []).map(r => [r.team, toNextGame(r)])), [nextQ.data])
  const nextWeek = nextQ.data?.[0]?.week ? Number(nextQ.data[0].week) : null

  // Defaults: top three at the position among teams playing this week
  const defQ = useQuery<any>(ids.length ? 'SELECT 1 WHERE false' : defaultPlayersSql(pos, season), [pos, season, ids.length])
  useEffect(() => {
    if (!ids.length && defQ.data && defQ.data.length) setParam({ mp: defQ.data.map((r: any) => r.player_id).join(',') })
  }, [defQ.data, ids.length]) // eslint-disable-line react-hooks/exhaustive-deps

  const picked: Player[] = ids.map(id => byId.get(id)).filter(Boolean) as Player[]
  const allowed = (p: Player) => pos === 'FLEX' ? ['RB', 'WR', 'TE'].includes(p.position) : p.position === pos

  // Weekly rows for the picked players
  const weeksSql = playerWeeksSql(ids, season)
  const weeksQ = useQuery<PlayerWeek>(weeksSql, [weeksSql])
  const rowsFor = (id: string) => (weeksQ.data ?? []).filter(r => r.player_id === id)

  // Defense profiles for every position in play (FLEX may need up to three)
  const posSet = Array.from(new Set((pos === 'FLEX' ? picked.map(p => p.position) : [pos]) as Pos[]))
  const dq = {
    WR: useDef(posSet.includes('WR'), 'WR', season), TE: useDef(posSet.includes('TE'), 'TE', season),
    RB: useDef(posSet.includes('RB'), 'RB', season), QB: useDef(posSet.includes('QB'), 'QB', season),
  }

  const cards = picked.map(p => {
    const rows = rowsFor(p.gsis_id)
    const ppos = p.position as Pos
    const next = nextByTeam.get(p.team) ?? null
    const d = dq[ppos]
    const reads = next && d.season.data && d.last3.data ? defenseReads(ppos, next.opp, d.season.data, d.last3.data) : null
    return {
      player: p, pos: ppos, rows, next,
      stats: { season: summarize(pickWindow(rows, 'season'), ppos, scoring), last: summarize(pickWindow(rows, 'last'), ppos, scoring), last3: summarize(pickWindow(rows, 'last3'), ppos, scoring) },
      lastWeek: pickWindow(rows, 'last')[0]?.week ?? null, reads,
    }
  })
  const loading = weeksQ.loading || nextQ.loading || (ids.length === 0 && defQ.loading)
  const metricRows = CARD_ROWS[pos]
  const [sheet, setSheet] = useState<null | 'scoring'>(null)
  const [tab, setTab] = useState(0)
  const canvasRef = useRef<HTMLDivElement>(null)
  const touch = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => { document.title = 'Matchup — QueryBall' }, [])

  const controls = (
    <div className="qcard p-3 lg:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="group-label mr-1">Position</span>
        {POSITIONS.map(p => (
          <button key={p} type="button" onClick={() => setParam({ mpos: p, mp: null })}
            className={clsx('chip text-[12px] py-1.5', p === 'FLEX' && 'border-dashed', p === pos && 'applied')}>{p}</button>
        ))}
        <span className="ml-auto text-[11px] text-muted hidden sm:inline">{nextWeek ? `Week ${nextWeek} matchups` : ''}</span>
      </div>
      <div className="grid sm:grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <PlayerPick key={i} value={picked[i]} players={players.filter(allowed)} loading={rosterLoading}
            onChange={p => { const next = [...ids]; next[i] = p.gsis_id; setParam({ mp: next.filter(Boolean).join(',') }) }} />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="group-label mr-1">Window</span>
        {WINS.map(w => <button key={w} type="button" onClick={() => setParam({ win: w })} className={clsx('chip text-[12px] py-1.5', w === win && 'applied')}>{WIN_LABEL[w]}</button>)}
        <button type="button" onClick={() => setSheet('scoring')} className="qb-filterbtn ml-auto"><SlidersHorizontal className="h-3.5 w-3.5" /> Scoring · {scoringLabel(scoring).split(' · ')[0]}</button>
      </div>
    </div>
  )

  return (
    <div className="bg-paper qb-mobile-deck">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5 lg:py-10">
        <div className="mb-4 lg:mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="eyebrow">Matchup</p>
            <h1 className="font-display text-3xl lg:text-5xl mt-1 tracking-tight">Three players, one week, every angle.</h1>
            <p className="mt-2 text-[13px] lg:text-sm text-muted max-w-2xl leading-relaxed">
              Season, last week and last three; the game they're walking into; and the defense they face, read for their position and ranked against all 32. Numbers follow your scoring ({scoringLabel(scoring)}).
            </p>
          </div>
          <ShareButton target={canvasRef} title="Matchup" />
        </div>
        {controls}

        <div ref={canvasRef} className="mt-4 bg-paper">
          {loading && !cards.length ? <div className="animate-pulse rounded-lg bg-[#EEF2F4] h-64 mt-2" /> : null}
          {!loading && !cards.length && <p className="text-sm text-muted mt-4">Pick up to three players.</p>}

          {cards.length > 0 && (isMobile ? (
            <div onTouchStart={e => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
              onTouchEnd={e => {
                if (!touch.current) return
                const dx = e.changedTouches[0].clientX - touch.current.x, dy = e.changedTouches[0].clientY - touch.current.y
                touch.current = null
                if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) setTab(t => Math.max(0, Math.min(cards.length - 1, t + (dx < 0 ? 1 : -1))))
              }}>
              <div className="qb-ptabs">
                {cards.map((c, i) => <button key={c.player.gsis_id} type="button" onClick={() => setTab(i)} className={clsx(i === tab && 'on')}>{c.player.name.split(' ').slice(-1)[0]}</button>)}
              </div>
              {cards[Math.min(tab, cards.length - 1)] && (() => {
                const c = cards[Math.min(tab, cards.length - 1)]
                return (
                  <div className="space-y-3">
                    <PlayerCard c={c} win={win} />
                    <MobileMetrics c={c} rows={metricRows} />
                    <DefenseCard c={c} />
                  </div>
                )
              })()}
              <p className="text-center text-[11px] text-muted mt-2">← swipe or tap a name to switch players →</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">{cards.map(c => <PlayerCard key={c.player.gsis_id} c={c} win={win} />)}</div>
              <MetricsTable cards={cards} win={win} rows={metricRows} pos={pos} />
              <div className="grid grid-cols-3 gap-3 mt-4">{cards.map(c => <DefenseCard key={c.player.gsis_id} c={c} />)}</div>
            </>
          ))}
          <div className="qb-stamp"><span>Matchup · week {nextWeek ?? '–'} · {scoringLabel(scoring)}</span><span className="font-mono">queryball.com</span></div>
        </div>
      </div>

      {/* Scoring opens the shared filter sheet straight to the Scoring group (phone) or an inline panel (desktop). */}
      {isMobile ? (
        <FilterSheet open={sheet === 'scoring'} onClose={() => setSheet(null)} groups={[]} initialTab="filters" initialGroup="scoring" />
      ) : sheet === 'scoring' && (
        <>
          <div className="qb-sheet-scrim" onClick={() => setSheet(null)} />
          <div className="fixed right-6 top-24 z-[61] w-[380px] qcard p-4 shadow-pop">
            <div className="flex items-center justify-between mb-2"><p className="font-display text-xl">Scoring</p><button type="button" onClick={() => setSheet(null)} className="qb-iconbtn"><X className="h-4 w-4" /></button></div>
            <ScoringPanel />
          </div>
        </>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
function useDef(enabled: boolean, pos: Pos, season: number) {
  useScoring() // re-run when scoring changes (fantasy-allowed columns depend on it)
  const s = useQuery<any>(enabled ? defenseSql(pos, season) : 'SELECT 1 WHERE false', [enabled, pos, season, scoringKey()])
  const l3 = useQuery<any>(enabled ? defenseSql(pos, season, 3) : 'SELECT 1 WHERE false', [enabled, pos, season, scoringKey()])
  return { season: s, last3: l3 }
}
function scoringKey() { try { return localStorage.getItem('qb.scoring') ?? '' } catch { return '' } }

type Card = { player: Player; pos: Pos; rows: PlayerWeek[]; next: NextGame | null; stats: Record<Win, WindowStats>; lastWeek: number | null; reads: ReturnType<typeof defenseReads> }

function Avatar({ p, size = 44 }: { p: Player; size?: number }) {
  const col = TEAM_COLORS[p.team] ?? '#2A3B47'
  const [err, setErr] = useState(false)
  const src = p.headshot ?? headshotUrl(p.gsis_id)
  return src && !err
    ? <img src={src} alt="" onError={() => setErr(true)} className="rounded-full object-cover flex-shrink-0 border border-line bg-cream" style={{ width: size, height: size }} loading="lazy" />
    : <div className="rounded-full flex items-center justify-center font-extrabold flex-shrink-0" style={{ width: size, height: size, background: `${col}22`, color: col, fontSize: size * 0.36 }}>{p.name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
}

function PlayerPick({ value, players, loading, onChange }: { value?: Player; players: Player[]; loading: boolean; onChange: (p: Player) => void }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const on = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', on); return () => document.removeEventListener('mousedown', on)
  }, [])
  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (s ? players.filter(p => p.name.toLowerCase().includes(s) || p.team.toLowerCase() === s) : players).slice(0, 30)
  }, [q, players])
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 rounded-lg border border-line bg-paper px-2.5 py-2 text-left hover:border-accent">
        {value ? <Avatar p={value} size={24} /> : <Search className="h-4 w-4 text-muted" />}
        <span className="flex-1 min-w-0 truncate text-[13px] font-semibold text-accent2">{value ? value.name : loading ? 'Loading players…' : 'Pick a player'}</span>
        {value && <span className="text-[10px] text-muted">{value.position} · {value.team}</span>}
        <ChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 qcard shadow-pop p-2">
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search name or team…" className="w-full rounded border border-line px-2 py-1.5 text-[13px] mb-1" />
          <div className="max-h-64 overflow-y-auto">
            {hits.map(p => (
              <button key={p.gsis_id} type="button" onClick={() => { onChange(p); setOpen(false); setQ('') }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-cream text-left">
                <Avatar p={p} size={22} /><span className="text-[12.5px] text-ink">{p.name}</span><span className="ml-auto text-[10px] text-muted">{p.position} · {p.team}</span>
              </button>
            ))}
            {!hits.length && <p className="text-[12px] text-muted p-2">No matches.</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function PlayerCard({ c, win }: { c: Card; win: Win }) {
  const n = c.next, s = c.stats
  const col = TEAM_COLORS[c.player.team] ?? '#2A3B47'
  const weekly = [...c.rows].sort((a, b) => a.week - b.week)
  const fpByWeek = weekly.map(r => ({ week: r.week, fp: summarize([r], c.pos).fp }))
  const mx = Math.max(1, ...fpByWeek.map(x => x.fp))
  return (
    <div className="qcard p-3">
      <div className="flex items-center gap-3">
        <Avatar p={c.player} size={48} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-tight text-accent2 truncate">{c.player.name}</p>
          <p className="text-[11px] text-muted">{c.pos} · {c.player.team}{c.player.jersey != null ? ` · #${c.player.jersey}` : ''}</p>
        </div>
        <span className="text-[10px] font-extrabold text-paper rounded px-1.5 py-0.5" style={{ background: col }}>{c.pos}</span>
      </div>
      <div className="mt-3 rounded-lg bg-cream px-3 py-2">
        <p className="eyebrow">Week {n?.week ?? '–'}</p>
        {n ? (
          <>
            <p className="text-[14px] font-bold text-accent2">{n.home ? 'vs' : '@'} {n.opp} <span className="font-normal text-muted text-[11px]">· {n.weekday.slice(0, 3)} {n.gametime}</span></p>
            <p className="text-[11px] text-muted">Spread {n.spread == null ? '–' : (n.spread > 0 ? '+' : '') + n.spread.toFixed(1)} · O/U {n.total ?? '–'} · <b className="text-ink">Implied {n.implied ?? '–'}</b></p>
            <p className="text-[11px] text-muted">{n.roof || '—'} · {n.surface || '—'}{n.oppQb ? ` · opp QB ${n.oppQb}` : ''}</p>
          </>
        ) : <p className="text-[13px] font-bold text-accent2">Bye week</p>}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {([['Pts / g', fmtVal(s.season.fp_g, 'd1'), win === 'season'], [`Wk ${c.lastWeek ?? '–'}`, fmtVal(s.last.fp, 'd1'), win === 'last'], ['L3 / g', fmtVal(s.last3.fp_g, 'd1'), win === 'last3'], ['Snap %', fmtVal(s.season.snap_pct, 'pct'), false]] as [string, string, boolean][]).map(([k, v, on]) => (
          <div key={k} className={clsx('rounded-md border px-2 py-1.5', on ? 'border-accent bg-[#F3F7F9]' : 'border-line bg-paper')}>
            <p className="text-[8.5px] text-muted uppercase tracking-wider">{k}</p>
            <p className="text-[15px] font-bold text-accent2 num">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-end gap-1 h-10 relative">
        {fpByWeek.map(x => <div key={x.week} title={`Wk ${x.week}: ${x.fp}`} className="flex-1 rounded-t bg-accent" style={{ height: `${Math.max(8, 100 * x.fp / mx)}%` }} />)}
        <span className="absolute right-0 -top-3 text-[9px] text-muted">pts by week</span>
      </div>
    </div>
  )
}

function MetricsTable({ cards, win, rows, pos }: { cards: Card[]; win: Win; rows: typeof CARD_ROWS.WR; pos: PosSel }) {
  return (
    <div className="qcard p-3 mt-4 overflow-x-auto">
      <div className="flex items-baseline justify-between mb-2">
        <p className="font-display text-lg">{pos === 'FLEX' ? 'FLEX · position-neutral metrics' : `${pos} metrics`} · {WIN_LABEL[win]}</p>
        <p className="text-[11px] text-muted">best value per row in navy</p>
      </div>
      <table className="qb-table w-full">
        <thead><tr><th></th>{cards.map(c => <th key={c.player.gsis_id}><span className="inline-flex items-center gap-1.5 normal-case tracking-normal text-[12px] text-accent2"><Avatar p={c.player} size={20} />{c.player.name.split(' ').slice(-1)[0]}</span></th>)}</tr></thead>
        <tbody>
          {rows.map(m => {
            const vals = cards.map(c => c.stats[win][m.key] as number | null)
            const nums = vals.filter((v): v is number => typeof v === 'number')
            const best = nums.length ? (m.lowerBetter ? Math.min(...nums) : Math.max(...nums)) : null
            const mx = nums.length ? Math.max(...nums.map(Math.abs)) : 0
            return (
              <tr key={m.key}>
                <td className="text-muted text-[12px] whitespace-nowrap">{m.label}</td>
                {vals.map((v, i) => (
                  <td key={i} className={clsx('text-[12px] num', v != null && v === best && nums.length > 1 && 'font-bold text-accent2')}>
                    <span className="inline-block w-14">{fmtVal(v, m.fmt)}</span>
                    <span className="inline-block align-middle h-1.5 w-[calc(100%-4rem)] max-w-[160px] bg-chalk rounded overflow-hidden"><span className="block h-full rounded" style={{ width: `${mx ? Math.max(2, 100 * Math.abs(v ?? 0) / mx) : 0}%`, background: v != null && v === best && nums.length > 1 ? '#2A3B47' : '#6191A5' }} /></span>
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MobileMetrics({ c, rows }: { c: Card; rows: typeof CARD_ROWS.WR }) {
  return (
    <div className="qcard p-3">
      <div className="flex justify-between text-[10px] text-muted mb-1"><span>Metric</span><span>Season · Wk {c.lastWeek ?? '–'} · Last 3</span></div>
      {rows.map(m => (
        <div key={m.key} className="flex items-center justify-between py-1.5 border-b border-line last:border-0 text-[12px]">
          <span className="text-ink">{m.label}</span>
          <span className="num text-right"><b className="text-accent2">{fmtVal(c.stats.season[m.key] as number, m.fmt)}</b><span className="text-muted"> · {fmtVal(c.stats.last[m.key] as number, m.fmt)} · {fmtVal(c.stats.last3[m.key] as number, m.fmt)}</span></span>
        </div>
      ))}
    </div>
  )
}

function DefenseCard({ c }: { c: Card }) {
  const r = c.reads, n = c.next
  if (!n) return <div className="qcard p-4"><p className="font-display text-lg">Bye week</p><p className="text-[12px] text-muted">No opponent to read this week.</p></div>
  if (!r) return <div className="qcard p-4"><div className="animate-pulse rounded bg-[#EEF2F4] h-40" /></div>
  const vcls = r.verdict === 'Favorable' ? 'soft' : r.verdict === 'Difficult' ? 'tough' : 'mid'
  const ctx = r.reads.filter(x => ['pass_rate', 'plays_g', 'pressure_pct', 'rz_td_pct'].includes(x.key))
  return (
    <div className="qcard p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="eyebrow">{c.player.name.split(' ').slice(-1)[0]} faces</p>
          <p className="font-display text-lg leading-tight text-accent2">{n.opp} defense vs {c.pos}s</p>
          <p className="text-[10px] text-muted">{r.gms} games · season vs last 3 · 1st = allows the most</p>
        </div>
        <span className={clsx('qb-rk big', vcls)}>{r.verdict}</span>
      </div>
      <table className="w-full text-[11.5px]">
        <thead><tr className="text-[9px] uppercase tracking-wider text-muted"><th className="text-left font-medium pb-1">Metric</th><th className="text-right font-medium pb-1">Season</th><th className="text-right font-medium pb-1">Last 3</th><th className="text-right font-medium pb-1">Rank</th></tr></thead>
        <tbody>
          {r.reads.map(m => (
            <tr key={m.key} className="border-t border-line">
              <td className="py-1 text-ink">{m.label}</td>
              <td className="py-1 text-right num">{fmtVal(m.season, m.fmt)}</td>
              <td className="py-1 text-right num text-muted">{fmtVal(m.last3, m.fmt)}</td>
              <td className="py-1 text-right"><span className={clsx('qb-rk', m.verdict)} title={`${ordinal(m.rank)} of ${m.n} defenses — ${m.higherIsSofter ? 'allows the ' + (m.rank <= 16 ? 'most' : 'least') : 'generates the ' + (m.rank <= 16 ? 'least' : 'most')}`}>{ordinal(m.rank)}<small>/{m.n}</small></span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {ctx.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
          {ctx.map(x => <span key={x.key}>{x.label.replace(' faced', '').replace(' (pace)', '')} <b className="text-accent2">{fmtVal(x.season, x.fmt)}</b></span>)}
        </div>
      )}
      <p className="mt-2 text-[10px] text-muted">Verdict = green badges vs red badges. <Link to="/decks/team-defense" className="text-accent">Open the Team Defense deck →</Link></p>
    </div>
  )
}
