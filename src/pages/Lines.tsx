/**
 * Lines — evaluate a sportsbook line in context.
 *
 * Team → player (or team markets) → line type → the number your book posted.
 * The page answers with the odds of the over hitting and shows its work:
 * the game log against the line, the distribution, where the production came
 * from (score state, half, down, field zone, depth / direction), this week's
 * game script, the opponent ranked 1–32, the alt-line ladder, and the price
 * translated to an implied probability and an edge. Season by default,
 * career on a toggle. Saved lines live in the browser and grade themselves
 * once the result is in the data.
 *
 * URL: t=team  p=player_id|team  m=market  l=line  o=odds  s=over|under  sc=season|career
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Bookmark, BookmarkCheck, ChevronDown, Info, X } from 'lucide-react'
import clsx from 'clsx'
import { useQuery } from '@/lib/useQuery'
import { useIsMobile } from '@/lib/useIsMobile'
import { TEAM_COLORS, headshotUrl } from '@/lib/nfl'
import { ShareButton } from '@/components/mobile/Share'
import { BarsWithLine, Curve, Diverging, HBars, StackBar } from '@/components/lines/Charts'
import {
  MARKETS, TEAM_MARKETS, marketByKey, teamMarketByKey, marketsFor, marketLabel,
  seasonSql, teamsSql, rosterSql, nextGameSql, toNextGame, playerGamesSql, splitsSql, halvesSql, toHalves, oppAllowedSql, oppProfile,
  teamGamesSql, teamQuartersSql, teamPropsSql, mergeQuarters, teamValue,
  summarize, read, ladder, contextTable, impliedProb, fairOdds, fmtOdds, parseOdds, Phi, fmtNum, fmtSpread, ordinal, teamName, median,
  loadSaved, storeSaved, gradeSql, gradeLine,
  type Pos, type Scope, type Side, type Market, type TeamMarket, type RosterRow, type GameRow, type SplitRow, type OppRow, type TeamGame, type TeamPropRow, type NextGame, type Read, type Summary, type SavedLine,
} from '@/lib/lines'

const POS_ORDER: Pos[] = ['QB', 'RB', 'WR', 'TE']

export default function Lines() {
  const [search, setSearch] = useSearchParams()
  const team = search.get('t') ?? ''
  const pParam = search.get('p') ?? ''
  const isTeam = pParam === 'team'
  const pid = isTeam ? '' : pParam
  const mParam = search.get('m')
  const side: Side = search.get('s') === 'under' ? 'under' : 'over'
  const scope: Scope = search.get('sc') === 'career' ? 'career' : 'season'
  const oddsStr = search.get('o') ?? ''
  const setParam = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(search)
    for (const [k, v] of Object.entries(patch)) v == null || v === '' ? p.delete(k) : p.set(k, v)
    setSearch(p, { replace: true })
  }
  const isMobile = useIsMobile(1024)
  useEffect(() => { document.title = 'Lines — QueryBall' }, [])

  /* ---------------- season, teams, roster, next game ---------------- */
  const seasonQ = useQuery<{ season: number }>(seasonSql, [])
  const season = seasonQ.data?.[0]?.season ?? 2026
  const loQ = useQuery<{ lo: number }>('SELECT min(season)::int AS lo FROM plays', [])
  const pbpLo = loQ.data?.[0]?.lo ?? season - 3
  const teamsQ = useQuery<{ team: string }>(teamsSql(season), [season])
  const teams = (teamsQ.data ?? []).map(r => r.team)
  const rosterQ = useQuery<RosterRow>(team ? rosterSql(team, season) : 'SELECT 1 WHERE false', [team, season])
  const roster = rosterQ.data ?? []
  const nextQ = useQuery<any>(team ? nextGameSql(team, season) : 'SELECT 1 WHERE false', [team, season])
  const next: NextGame | null = useMemo(() => toNextGame(nextQ.data?.[0]), [nextQ.data])
  const player = roster.find(r => r.player_id === pid) ?? null

  // Season lists: box-score markets can go back to the start of player_week; play-by-play ones to the oldest plays file.
  const allSeasons = useMemo(() => Array.from({ length: Math.max(1, season - 2014) }, (_, i) => season - i), [season])
  const pbpSeasons = useMemo(() => Array.from({ length: Math.max(1, season - pbpLo + 1) }, (_, i) => season - i), [season, pbpLo])

  /* ---------------- player market ---------------- */
  const usage = player ? { attempts: player.attempts, carries: player.carries, targets: player.targets, receptions: player.receptions } : null
  const markets = player ? marketsFor(player.position, usage) : []
  const market: Market | null = player ? (markets.find(m => m.key === mParam) ?? markets[0] ?? null) : null
  const gameSeasons = market ? (scope === 'career' ? (market.pw ? allSeasons : pbpSeasons) : [season]) : [season]
  const splitSeasons = scope === 'career' ? pbpSeasons : [season]
  const gamesQ = useQuery<GameRow>(player && market ? playerGamesSql(pid, market, gameSeasons) : 'SELECT 1 WHERE false', [pid, market?.key, scope, season, pbpLo])
  const splitsQ = useQuery<SplitRow>(player && market ? splitsSql(pid, market, splitSeasons) : 'SELECT 1 WHERE false', [pid, market?.key, scope, season, pbpLo])
  const halvesQ = useQuery<any>(player && market && !market.pbp?.perGame ? halvesSql(pid, market, splitSeasons) : 'SELECT 1 WHERE false', [pid, market?.key, scope, season, pbpLo])
  const oppQ = useQuery<OppRow>(player && market ? oppAllowedSql(player.position, market, season) : 'SELECT 1 WHERE false', [player?.position, market?.oppKey ?? market?.key, season])

  /* ---------------- team market ---------------- */
  const tm: TeamMarket | null = isTeam ? (teamMarketByKey(mParam) ?? TEAM_MARKETS[0]) : null
  const teamSeasons = scope === 'career' ? pbpSeasons : [season]
  const tgQ = useQuery<any>(isTeam && team ? teamGamesSql(team, teamSeasons) : 'SELECT 1 WHERE false', [isTeam, team, scope, season, pbpLo])
  const tqQ = useQuery<any>(isTeam && team ? teamQuartersSql(team, teamSeasons) : 'SELECT 1 WHERE false', [isTeam, team, scope, season, pbpLo])
  const tpQ = useQuery<TeamPropRow>(isTeam && team ? teamPropsSql(team, teamSeasons) : 'SELECT 1 WHERE false', [isTeam, team, scope, season, pbpLo])
  const ogQ = useQuery<any>(isTeam && next ? teamGamesSql(next.opp, [season]) : 'SELECT 1 WHERE false', [isTeam, next?.opp, season])
  const oqQ = useQuery<any>(isTeam && next ? teamQuartersSql(next.opp, [season]) : 'SELECT 1 WHERE false', [isTeam, next?.opp, season])
  const opQ = useQuery<TeamPropRow>(isTeam && next ? teamPropsSql(next.opp, [season]) : 'SELECT 1 WHERE false', [isTeam, next?.opp, season])

  /* ---------------- the values the line is judged against ---------------- */
  const games: GameRow[] = useMemo(() => (gamesQ.data ?? []).map(g => ({ ...g, season: Number(g.season), week: Number(g.week), home: !!g.home, val: Number(g.val), spread: g.spread == null ? null : Number(g.spread), total: g.total == null ? null : Number(g.total), margin: g.margin == null ? null : Number(g.margin), pts: g.pts == null ? null : Number(g.pts), opp_pts: g.opp_pts == null ? null : Number(g.opp_pts) })), [gamesQ.data])
  const teamGames: TeamGame[] = useMemo(() => isTeam ? mergeQuarters(tgQ.data ?? [], tqQ.data ?? [], team) : [], [isTeam, tgQ.data, tqQ.data, team])
  const propsBy = useMemo(() => new Map((tpQ.data ?? []).map(p => [p.game_id, p])), [tpQ.data])
  const oppGames: TeamGame[] = useMemo(() => isTeam && next ? mergeQuarters(ogQ.data ?? [], oqQ.data ?? [], next.opp) : [], [isTeam, next, ogQ.data, oqQ.data])
  const oppPropsBy = useMemo(() => new Map((opQ.data ?? []).map(p => [p.game_id, p])), [opQ.data])

  // one list of {label, val, ...} rows regardless of market type
  type Row = { key: string; season: number; week: number; opp: string; home: boolean; spread: number | null; total: number | null; val: number; margin: number | null; pts: number | null; opp_pts: number | null; good?: boolean }
  const rows: Row[] = useMemo(() => {
    if (!isTeam) return games.map(g => ({ key: g.game_id, season: g.season, week: g.week, opp: g.opp, home: g.home, spread: g.spread, total: g.total, val: g.val, margin: g.margin, pts: g.pts, opp_pts: g.opp_pts }))
    return teamGames.map(g => ({ key: g.game_id, season: g.season, week: g.week, opp: g.opp, home: g.home, spread: g.spread, total: g.total, val: teamValue(tm!.key, g, propsBy.get(g.game_id)) as number, margin: g.margin, pts: g.pts, opp_pts: g.opp_pts })).filter(r => r.val != null && !isNaN(r.val))
  }, [isTeam, games, teamGames, tm, propsBy])
  const vals = rows.map(r => r.val)
  const dist = isTeam ? tm!.dist : (market?.dist ?? 'normal')
  const intMarket = isTeam ? ['sacks_made', 'plays'].includes(tm!.key) : (market?.int ?? true)

  /* ---------------- the line, odds, side ---------------- */
  // Spread and moneyline are entered as the team's number; everything else as an over/under line.
  const lineParam = search.get('l')
  const defaultLine = useMemo(() => {
    if (!vals.length) return null
    if (isTeam && tm!.key === 'spread') return next?.spread ?? 0
    if (isTeam && tm!.key === 'ml') return 0
    if (isTeam && tm!.key === 'total') return next?.total ?? Math.round(median(vals) * 2) / 2
    if (isTeam && tm!.key === 'team_total') return next?.implied ?? Math.round(median(vals) * 2) / 2
    const med = median(vals)
    return dist === 'poisson' ? Math.max(0.5, Math.floor(med) + 0.5) : (intMarket ? Math.floor(med) + 0.5 : Math.round(med * 2) / 2)
  }, [vals.length, isTeam, tm?.key, next, dist, intMarket]) // eslint-disable-line react-hooks/exhaustive-deps
  // What the user has typed, verbatim — including nothing. null = untouched, so the default fills in.
  // Kept separately from the URL so the box can sit empty while you retype (the URL drops empty values).
  const [lineText, setLineText] = useState<string | null>(null)
  useEffect(() => { setLineText(null) }, [pParam, mParam, team])
  const typed = lineText != null ? lineText : lineParam
  const line = typed != null && typed !== '' && !isNaN(Number(typed)) ? Number(typed) : typed === '' || (typed != null && isNaN(Number(typed))) ? null : defaultLine
  const lineBlank = lineText === '' || (lineText != null && isNaN(Number(lineText)))
  const odds = parseOdds(oddsStr) ?? -110
  const implied = impliedProb(odds)

  /* ---------------- the read ---------------- */
  const opp = useMemo(() => (!isTeam && next && oppQ.data) ? oppProfile(oppQ.data, next.opp) : null, [isTeam, next, oppQ.data])
  // For spread / moneyline the question is about the margin, so evaluate "margin > -line" / "margin > 0".
  const evalLine = line == null ? null : isTeam && tm!.key === 'spread' ? -line : isTeam && tm!.key === 'ml' ? 0 : line
  const summary: Summary | null = evalLine == null ? null : summarize(vals, evalLine)
  const last5: Summary | null = evalLine == null ? null : summarize(vals.slice(-5), evalLine)
  const rd: Read | null = useMemo(() => evalLine == null ? null : read(vals, rows.map(r => r.spread), evalLine, dist, {
    oppPerG: opp?.per_g ?? null, league: opp?.league ?? null, oppTeam: opp?.team ?? null, nextSpread: next?.spread ?? null, scriptK: market?.scriptK ?? 0,
  }), [vals.join(','), evalLine, dist, opp, next?.spread, market?.scriptK]) // eslint-disable-line react-hooks/exhaustive-deps
  const steps = isTeam ? tm!.steps : (market?.steps ?? [0])
  const rungs = useMemo(() => rd && evalLine != null ? ladder(vals, evalLine, rd, steps, intMarket) : [], [rd, evalLine, steps.join(','), intMarket]) // eslint-disable-line react-hooks/exhaustive-deps
  const pSide = rd ? (side === 'over' ? rd.p_final : 100 - rd.p_final) : null
  const edge = pSide == null ? null : pSide - 100 * implied

  const loading = !!team && (rosterQ.loading || nextQ.loading || (!isTeam && !!pid && gamesQ.loading) || (isTeam && (tgQ.loading || tqQ.loading)))
  const subjectLabel = isTeam ? `${teamName(team)} · ${tm?.label ?? ''}` : player ? `${player.name} · ${market ? marketLabel(market, player.position) : ''}` : ''
  const overWord = isTeam && tm!.key === 'spread' ? 'cover' : isTeam && tm!.key === 'ml' ? 'win' : 'over'

  /* ---------------- My Lines ---------------- */
  const [saved, setSaved] = useState<SavedLine[]>(() => loadSaved())
  const [drawer, setDrawer] = useState(false)
  const gradeQ = useQuery<{ id: string; val: number }>(drawer && saved.length ? gradeSql(saved) : 'SELECT 1 WHERE false', [drawer, saved.length])
  const grades = useMemo(() => new Map((gradeQ.data ?? []).map(r => [r.id, Number(r.val)])), [gradeQ.data])
  const currentKey = `${season}-${next?.week ?? 0}-${isTeam ? 'team' : pid}-${isTeam ? tm?.key : market?.key}-${line}-${side}`
  const alreadySaved = saved.some(s => s.id === currentKey)
  const saveLine = () => {
    if (!team || line == null || rd == null) return
    if (alreadySaved) { const nx = saved.filter(s => s.id !== currentKey); setSaved(nx); storeSaved(nx); return }
    const it: SavedLine = {
      id: currentKey, savedAt: new Date().toISOString(), season, week: next?.week ?? 0, team, opp: next?.opp ?? null,
      pid: isTeam ? null : pid, name: isTeam ? teamName(team) : player!.name, pos: isTeam ? null : player!.position,
      market: isTeam ? tm!.key : market!.key, marketLabel: isTeam ? tm!.label : marketLabel(market!, player!.position),
      line, odds, side, read: pSide ?? rd.p_final, url: `${location.pathname}${location.search}`,
    }
    const nx = [it, ...saved]; setSaved(nx); storeSaved(nx)
  }

  /* ---------------- render ---------------- */
  const canvasRef = useRef<HTMLDivElement>(null)
  const lineInputLabel = isTeam && tm!.key === 'spread' ? `${teamName(team)} spread` : isTeam && tm!.key === 'ml' ? `${teamName(team)} moneyline` : 'Your book\'s line'
  return (
    <div className="bg-paper qb-mobile-deck qb-lines">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-6 py-5 lg:py-10">
        <div className="mb-4 lg:mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="eyebrow">Lines</p>
            <h1 className="font-display text-3xl lg:text-5xl mt-1 tracking-tight">Type the line. See the odds it hits — and why.</h1>
            <p className="mt-2 text-[13px] lg:text-sm text-muted max-w-2xl leading-relaxed">
              Pick a team, a player or the team itself, the line type your book offers, and the number it posted. QueryBall answers from what actually happened — game by game, by score state, against this opponent — and shows every step.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDrawer(true)} className="qb-filterbtn"><Bookmark className="h-3.5 w-3.5" /> My Lines{saved.length ? <span className="qb-filterbtn-n">{saved.length}</span> : null}</button>
            <ShareButton target={canvasRef} title="Lines" />
          </div>
        </div>

        {/* ---------------- controls ---------------- */}
        <div className="qcard p-3 lg:p-4">
          <div className="grid grid-cols-2 lg:grid-cols-12 gap-2 lg:gap-3 items-end">
            <Field label="Team" className="lg:col-span-2">
              <Select value={team} onChange={v => setParam({ t: v, p: null, m: null, l: null })} placeholder="Pick a team">
                {teams.map(t => <option key={t} value={t}>{teamName(t)} ({t})</option>)}
              </Select>
            </Field>
            <Field label="Player — or the team" className="lg:col-span-3">
              <Select value={pParam} onChange={v => setParam({ p: v, m: null, l: null })} placeholder={team ? (rosterQ.loading ? 'Loading roster…' : 'Pick a player') : 'Pick a team first'} disabled={!team}>
                <option value="team">Team markets — {teamName(team)}</option>
                {POS_ORDER.map(pos => {
                  const list = roster.filter(r => r.position === pos)
                  return list.length ? <optgroup key={pos} label={pos}>{list.map(r => <option key={r.player_id} value={r.player_id}>{r.name} · {r.g} g</option>)}</optgroup> : null
                })}
              </Select>
            </Field>
            <Field label="Line type" className="lg:col-span-3">
              <Select value={isTeam ? (tm?.key ?? '') : (market?.key ?? '')} onChange={v => setParam({ m: v, l: null })} placeholder="Pick a player first" disabled={!team || !pParam}>
                {isTeam ? (
                  <>
                    <optgroup label="Game lines">{TEAM_MARKETS.filter(m => m.kind === 'game').map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</optgroup>
                    <optgroup label="Team props">{TEAM_MARKETS.filter(m => m.kind === 'prop').map(m => <option key={m.key} value={m.key}>{m.label}</option>)}</optgroup>
                  </>
                ) : markets.map(m => <option key={m.key} value={m.key}>{marketLabel(m, player!.position)}</option>)}
              </Select>
            </Field>
            <Field label={lineInputLabel} className="lg:col-span-2">
              <input type="number" inputMode="decimal" step={isTeam && tm!.key === 'ml' ? 5 : 0.5} value={lineText ?? lineParam ?? (line ?? '')} onChange={e => { setLineText(e.target.value); setParam({ l: e.target.value }) }}
                placeholder={defaultLine != null ? String(defaultLine) : '—'} disabled={!pParam}
                className="qb-lineinput" aria-label="Line" />
            </Field>
            <Field label="Odds" className="lg:col-span-1">
              <input type="text" inputMode="numeric" value={oddsStr} onChange={e => setParam({ o: e.target.value })} placeholder="-110" className="qb-lineinput text-[14px]" aria-label="Odds" />
            </Field>
            <div className="col-span-2 lg:col-span-1 flex lg:flex-col gap-2 lg:gap-1 lg:items-stretch">
              {!(isTeam && (tm!.key === 'spread' || tm!.key === 'ml')) && (
                <div className="flex rounded-full border border-line p-0.5 text-[11px] font-bold">
                  {(['over', 'under'] as Side[]).map(s => <button key={s} type="button" onClick={() => setParam({ s })} className={clsx('flex-1 rounded-full px-2 py-1 capitalize', s === side ? 'bg-accent2 text-paper' : 'text-muted')}>{s}</button>)}
                </div>
              )}
              <div className="flex rounded-full border border-line p-0.5 text-[11px] font-bold">
                {(['season', 'career'] as Scope[]).map(s => <button key={s} type="button" onClick={() => setParam({ sc: s })} className={clsx('flex-1 rounded-full px-2 py-1', s === scope ? 'bg-accent2 text-paper' : 'text-muted')}>{s === 'season' ? season : 'Career'}</button>)}
              </div>
            </div>
          </div>
          {tm && <p className="mt-2 text-[11px] text-muted flex items-start gap-1"><Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />{tm.help}</p>}
          {market && !market.pw && <p className="mt-2 text-[11px] text-muted flex items-start gap-1"><Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />A play-by-play market: the longest single play in each game, since {pbpLo}.</p>}
        </div>

        {/* ---------------- empty / loading states ---------------- */}
        {!team && <Intro teams={teams} onPick={t => setParam({ t, p: null, m: null, l: null })} />}
        {team && !pParam && !rosterQ.loading && (
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <button type="button" onClick={() => setParam({ p: 'team' })} className="qcard p-3 text-left hover:border-accent"><p className="eyebrow">Team markets</p><p className="font-display text-lg text-accent2">{teamName(team)}</p><p className="text-[11px] text-muted">Spread, moneyline, totals, first half, team props</p></button>
            {roster.slice(0, 7).map(r => (
              <button key={r.player_id} type="button" onClick={() => setParam({ p: r.player_id })} className="qcard p-3 text-left hover:border-accent flex items-center gap-3">
                <Avatar name={r.name} team={team} headshot={r.headshot} id={r.player_id} size={36} />
                <div className="min-w-0"><p className="font-semibold text-[13px] text-accent2 truncate">{r.name}</p><p className="text-[11px] text-muted">{r.position} · {r.g} games · {r.position === 'QB' ? `${r.attempts} att` : r.position === 'RB' ? `${r.carries} car · ${r.targets} tgt` : `${r.targets} tgt`}</p></div>
              </button>
            ))}
          </div>
        )}
        {team && pParam && loading && <div className="mt-4 animate-pulse rounded-lg bg-chalk h-64" />}
        {[seasonQ, rosterQ, nextQ, gamesQ, splitsQ, halvesQ, oppQ, tgQ, tqQ, tpQ].filter(q => q.error).slice(0, 1).map((q, i) => <p key={i} className="mt-3 text-[11.5px] text-[#A0594B] bg-[#F3E3DF] border border-[#E4C9C2] rounded px-3 py-2">One of the queries behind this page failed: {q.error!.message.split('\n')[0]}. Try again, or send this message to Andrew.</p>)}
        {team && pid && !rosterQ.loading && !player && <p className="mt-4 text-sm text-muted">That player isn't on the {teamName(team)} roster in the data this season — pick another player above.</p>}
        {team && pParam && (isTeam || player) && !loading && line == null && lineBlank && <p className="mt-4 text-sm text-muted">Type a line in the box above to evaluate it{defaultLine != null ? ` — the median here is ${defaultLine}` : ''}.</p>}
        {team && pParam && (isTeam || player) && !loading && line == null && !lineBlank && <p className="mt-4 text-sm text-muted">No games in the data for this pick{scope === 'season' ? ' this season — try Career' : ''}.</p>}

        {/* ---------------- the evaluation ---------------- */}
        {team && pParam && !loading && line != null && rd && summary && evalLine != null && (
          <div ref={canvasRef} className="mt-4 bg-paper space-y-3">
            <Verdict rd={rd} side={side} line={line} odds={odds} implied={implied} pSide={pSide!} edge={edge!} summary={summary} last5={last5} overWord={overWord} isSpreadOrMl={isTeam && (tm!.key === 'spread' || tm!.key === 'ml')} saved={alreadySaved} onSave={saveLine} />
            <Kpis summary={summary} last5={last5} rows={rows} evalLine={evalLine} scope={scope} season={season} overWord={overWord} isMargin={isTeam && (tm!.key === 'spread' || tm!.key === 'ml')} />

            <div className="grid lg:grid-cols-3 gap-3">
              <div className="qcard p-3 lg:col-span-2">
                <CardTitle title={isTeam && (tm!.key === 'spread' || tm!.key === 'ml') ? `${teamName(team)} margin by game` : `${subjectLabel.split(' · ')[1]} by game`} sub={isTeam && (tm!.key === 'spread' || tm!.key === 'ml') ? 'bars = final margin · dashed tick = the spread that day · green = covered' : `dashed = ${line} · green over · red under${rows.length > 34 ? ` · last 34 of ${rows.length} shown` : ''}`} />
                {isTeam && (tm!.key === 'spread' || tm!.key === 'ml') ? (
                  <Diverging bars={rows.slice(-34).map(r => ({ val: r.val, label: `${r.home ? 'vs' : '@'}${r.opp}`, sub: scope === 'career' ? `'${String(r.season).slice(2)} wk${r.week}` : `wk${r.week}`, good: tm!.key === 'ml' ? r.val > 0 : r.spread != null ? r.val + r.spread > 0 : undefined }))} refs={tm!.key === 'spread' ? rows.slice(-34).map(r => r.spread == null ? null : -r.spread) : undefined} />
                ) : (
                  <BarsWithLine bars={rows.slice(-34).map(r => ({ val: r.val, label: `${r.home ? 'vs' : '@'}${r.opp}`, sub: scope === 'career' ? `'${String(r.season).slice(2)} wk${r.week}` : `wk${r.week}` }))} line={line} fmt={v => fmtNum(v, 0)} />
                )}
              </div>
              <NextBox next={next} team={team} rows={rows} player={player} evalLine={evalLine} isTeam={isTeam} tmKey={tm?.key} />
            </div>

            <div className="grid lg:grid-cols-3 gap-3">
              <div className="qcard p-3">
                <CardTitle title="Distribution" sub={`mean ${summary.mean} · median ${summary.median} · σ ${summary.sd}${rd.skew ? ' · skewed — hit rate weighted up' : ''}`} />
                <Curve mean={rd.mu} sigma={rd.sigma} line={evalLine} vals={vals} dist={dist} median={summary.median} />
                {rd.skew && <p className="mt-1 text-[11px] text-[#8A6D1F] bg-[#FFF8EC] border border-[#E8D7B0] rounded px-2 py-1">Mean and median disagree by more than 15%: one or two big games are pulling the average. The read leans on the actual hit rate (60%) over the curve (40%).</p>}
              </div>
              <div className="qcard p-3">
                <CardTitle title="How the read was built" sub="every step, no hidden weights" />
                <ul className="text-[12px] divide-y divide-line">
                  {rd.components.map((c, i) => <li key={i} className="flex justify-between gap-2 py-1"><span className="text-muted">{c.label}</span><b className="num text-accent2">{c.value}</b></li>)}
                  <li className="flex justify-between py-1"><span className="text-muted">{dist === 'poisson' ? 'Poisson' : 'Normal'} P({overWord})</span><b className="num text-accent2">{rd.p_model}%</b></li>
                  <li className="flex justify-between py-1"><span className="text-muted">Actual {overWord} rate</span><b className="num text-accent2">{rd.p_emp}%</b></li>
                  <li className="flex justify-between py-1 font-bold"><span>QueryBall read ({rd.skew ? '40 / 60' : '60 / 40'} blend)</span><b className="num text-accent2">{rd.p_final}%</b></li>
                </ul>
                <p className="mt-2 text-[10.5px] text-muted leading-relaxed">Blend of a distribution around a recency-weighted, opponent- and script-adjusted expectation, and the plain hit rate. Edge under 3 points is inside the noise.</p>
              </div>
              <div className="qcard p-3">
                <CardTitle title="Alt-line ladder" sub="the read at each rung · fair price each way" />
                <table className="qb-table w-full text-[11.5px]">
                  <thead><tr><th>Line</th><th className="text-right">Hit</th><th className="text-right">Model</th><th className="text-right">Read</th><th className="text-right">Fair {overWord === 'over' ? 'O / U' : 'yes / no'}</th></tr></thead>
                  <tbody>{rungs.map(r => <tr key={r.line} className={clsx(r.isBook && 'font-bold bg-[#F3F7F9]')}><td>{isTeam && tm!.key === 'spread' ? fmtSpread(-r.line) : isTeam && tm!.key === 'ml' ? 'win' : r.line}</td><td className="text-right num">{r.emp}%</td><td className="text-right num">{r.model}%</td><td className="text-right num text-accent2">{r.final}%</td><td className="text-right num text-muted">{fmtOdds(r.over)} / {fmtOdds(r.under)}</td></tr>)}</tbody>
                </table>
              </div>
            </div>

            {!isTeam && market && (
              <>
                <Splits rows={splitsQ.data ?? []} market={market} pos={player!.position} halves={halvesQ.data ? toHalves(halvesQ.data) : []} games={games} evalLine={evalLine} scopeNote={scope === 'career' ? `${Math.min(...splitSeasons)}–${season}` : String(season)} />
                <div className="grid lg:grid-cols-3 gap-3">
                  <OppCard opp={opp} pos={player!.position} market={market} next={next} error={oppQ.error} loading={oppQ.loading} />
                  <ContextCard games={games} evalLine={evalLine} />
                  <div className="qcard p-3"><CardTitle title="Game log" sub="most recent first" /><GameLogTable rows={rows} evalLine={evalLine} scope={scope} isSpread={false} /></div>
                </div>
              </>
            )}
            {isTeam && tm && (
              <TeamExtras team={team} tm={tm} teamGames={teamGames} propsBy={propsBy} oppGames={oppGames} oppPropsBy={oppPropsBy} next={next} evalLine={evalLine} rows={rows} scope={scope} />
            )}

            <div className="qb-stamp"><span className="truncate">Lines · {subjectLabel} · {isTeam && tm!.key === 'spread' ? fmtSpread(line) : isTeam && tm!.key === 'ml' ? 'to win' : `${side} ${line}`} at {fmtOdds(odds)} · {scope === 'career' ? 'career' : season}</span><span className="font-mono">queryball.com</span></div>
          </div>
        )}

        <p className="mt-6 text-[10.5px] text-muted2 leading-relaxed max-w-3xl">For information only — a read on what has happened, not a prediction or a recommendation. Lines and odds are the ones you typed; QueryBall does not pull them from any sportsbook. If gambling is a problem for you or someone you know, call 1-800-GAMBLER.</p>
      </div>

      {drawer && <MyLines items={saved} grades={grades} loading={gradeQ.loading} onClose={() => setDrawer(false)} onRemove={id => { const nx = saved.filter(s => s.id !== id); setSaved(nx); storeSaved(nx) }} />}
    </div>
  )
}

/* ================================================================== */
/* Pieces                                                              */
/* ================================================================== */
function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <label className={clsx('block min-w-0', className)}><span className="block text-[9.5px] font-bold uppercase tracking-wider text-muted mb-1">{label}</span>{children}</label>
}
function Select({ value, onChange, placeholder, disabled, children }: { value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <span className="relative block">
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="qb-select">
        <option value="" disabled>{placeholder}</option>
        {children}
      </select>
      <ChevronDown className="h-4 w-4 text-muted absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
    </span>
  )
}
function CardTitle({ title, sub }: { title: string; sub?: string }) {
  return <div className="mb-2"><p className="font-display text-lg leading-tight">{title}</p>{sub && <p className="text-[10.5px] text-muted">{sub}</p>}</div>
}
function Avatar({ name, team, headshot, id, size = 36 }: { name: string; team: string; headshot: string | null; id: string; size?: number }) {
  const col = TEAM_COLORS[team] ?? '#2A3B47'
  const [err, setErr] = useState(false)
  const src = headshot ?? headshotUrl(id)
  return src && !err
    ? <img src={src} alt="" onError={() => setErr(true)} className="rounded-full object-cover flex-shrink-0 border border-line bg-cream" style={{ width: size, height: size }} loading="lazy" />
    : <div className="rounded-full flex items-center justify-center font-extrabold flex-shrink-0" style={{ width: size, height: size, background: `${col}22`, color: col, fontSize: size * 0.36 }}>{name.split(' ').map(w => w[0]).join('').slice(0, 2)}</div>
}

function Intro({ teams, onPick }: { teams: string[]; onPick: (t: string) => void }) {
  return (
    <div className="mt-4 grid lg:grid-cols-3 gap-3">
      <div className="qcard p-4 lg:col-span-2">
        <p className="eyebrow mb-2">Start with a team</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {teams.map(t => <button key={t} type="button" onClick={() => onPick(t)} className="h-9 rounded-md text-paper text-[11px] font-extrabold hover:opacity-90" style={{ background: TEAM_COLORS[t] ?? '#2A3B47' }}>{t}</button>)}
        </div>
      </div>
      <div className="qcard p-4 bg-cream">
        <p className="eyebrow mb-1">How it works</p>
        <ol className="text-[12.5px] text-ink space-y-1.5 list-decimal pl-4 leading-relaxed">
          <li>Pick a team, then a player — or the team itself for spreads, totals and team props.</li>
          <li>Pick the line type. The menu follows the position and the player's actual usage: a receiver never sees pass attempts.</li>
          <li>Type the number your book posted and the odds. The read is the chance it hits, with the evidence underneath: game log, distribution, where the production came from, the opponent, the game script, the alt-line ladder.</li>
          <li>Save a line and it grades itself after the game.</li>
        </ol>
      </div>
    </div>
  )
}

function Verdict({ rd, side, line, odds, implied, pSide, edge, summary, last5, overWord, isSpreadOrMl, saved, onSave }: { rd: Read; side: Side; line: number; odds: number; implied: number; pSide: number; edge: number; summary: Summary; last5: Summary | null; overWord: string; isSpreadOrMl: boolean; saved: boolean; onSave: () => void }) {
  const lean = rd.p_final >= 55 ? 'OVER' : rd.p_final <= 45 ? 'UNDER' : 'NO EDGE'
  const leanWord = isSpreadOrMl ? (rd.p_final >= 55 ? overWord.toUpperCase() : rd.p_final <= 45 ? `NO ${overWord.toUpperCase()}` : 'TOSS-UP') : lean
  const cls = rd.p_final >= 55 ? 'over' : rd.p_final <= 45 ? 'under' : 'lean'
  const n = summary.n
  const conf = n >= 8 && summary.sd <= 0.35 * Math.max(1, Math.abs(summary.mean)) ? 'High' : n >= 6 ? 'Medium' : 'Low'
  const sideLabel = isSpreadOrMl ? overWord : side
  const fair = isSpreadOrMl ? (overWord === 'cover' ? `${fmtSpread(-rd.mu)} fair spread` : `${rd.mu > 0 ? '+' : ''}${rd.mu} exp. margin`) : rd.fair_line != null ? `${rd.fair_line}` : `${rd.mu} exp.`
  return (
    <div className="grid grid-cols-2 lg:grid-cols-[minmax(170px,1.2fr)_1fr_1fr_1fr] gap-2 lg:gap-3">
      <div className={clsx('qb-vbig', cls, 'col-span-2 lg:col-span-1')}>
        <small>QueryBall read</small>
        <b>{pSide}%</b>
        <span>chance the <strong>{sideLabel.toUpperCase()} {isSpreadOrMl ? fmtSpread(line).replace('PK', '') : line}</strong> hits · lean <strong>{leanWord}</strong></span>
        <button type="button" onClick={onSave} className="qb-savebtn">{saved ? <><BookmarkCheck className="h-3.5 w-3.5" /> Saved</> : <><Bookmark className="h-3.5 w-3.5" /> Save line</>}</button>
      </div>
      <div className="qb-vcard"><small>Your book says</small><b>{(100 * implied).toFixed(1)}%</b><span>implied by {fmtOdds(odds)} on the {sideLabel}</span><div className="mt-1 text-[12px]">Edge <span className={clsx('font-extrabold num', Math.abs(edge) < 3 ? 'text-muted' : edge > 0 ? 'text-ok' : 'text-[#A0594B]')}>{edge > 0 ? '+' : ''}{edge.toFixed(0)} pts</span>{Math.abs(edge) < 3 && <span className="text-muted"> · inside the noise</span>}</div></div>
      <div className="qb-vcard"><small>Fair line · fair odds</small><b>{fair}</b><span>model expectation · fair price on the {sideLabel}: {fmtOdds(side === 'over' || isSpreadOrMl ? rd.fair_over : rd.fair_under)}</span></div>
      <div className="qb-vcard"><small>Sample · consistency</small><b>{n} games <span className="text-[12px] text-muted font-semibold">σ {summary.sd}</span></b><span>{overWord} {summary.over}–{summary.under}{summary.push ? `–${summary.push}` : ''} · last 5: {last5 ? `${last5.over}–${last5.under}` : '–'} · confidence {conf}</span></div>
    </div>
  )
}

function Kpis({ summary, last5, rows, evalLine, scope, season, overWord, isMargin }: { summary: Summary; last5: Summary | null; rows: { val: number; season: number }[]; evalLine: number; scope: Scope; season: number; overWord: string; isMargin: boolean }) {
  const thisSeason = rows.filter(r => r.season === season).map(r => r.val)
  const ts = summarize(thisSeason, evalLine)
  const items: [string, string, string][] = [
    [`${scope === 'career' ? 'Career' : 'Season'} avg${isMargin ? ' margin' : ''}`, `${summary.mean}`, `${summary.n} g`], ['Median', `${summary.median}`, ''], ['Last 5 avg', last5 ? `${last5.mean}` : '–', last5 ? `${last5.over}/${last5.n} ${overWord}` : ''],
    ['Best · worst', `${summary.max} · ${summary.min}`, ''], [`${overWord} rate`, `${summary.over_pct}%`, `${summary.over}/${summary.n}`],
    scope === 'career' ? [`${season} ${overWord} rate`, ts ? `${ts.over_pct}%` : '–', ts ? `${ts.over}/${ts.n}` : ''] : ['Pushes', `${summary.push}`, 'on this number'],
  ]
  return (
    <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
      {items.map(([k, v, s]) => <div key={k} className="qcard px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-muted font-bold">{k}</p><p className="text-[15px] font-bold text-accent2 num leading-tight">{v} <span className="text-[10px] text-muted font-medium">{s}</span></p></div>)}
    </div>
  )
}

function NextBox({ next, team, rows, player, evalLine, isTeam, tmKey }: { next: NextGame | null; team: string; rows: { opp: string; season: number; week: number; val: number }[]; player: RosterRow | null; evalLine: number; isTeam: boolean; tmKey?: string }) {
  const hist = next ? rows.filter(r => r.opp === next.opp) : []
  return (
    <div className="qcard p-3 bg-cream">
      {next ? (
        <>
          <CardTitle title={`Week ${next.week} · ${next.home ? 'vs' : '@'} ${teamName(next.opp)}`} sub={`${next.weekday?.slice(0, 3) ?? ''} ${next.gametime ?? ''} · ${next.roof || 'outdoors'}${next.surface ? ` · ${next.surface}` : ''}${next.opp_qb ? ` · proj. opp QB ${next.opp_qb}` : ''}`} />
          <div className="grid grid-cols-4 gap-1.5">
            {([['Spread', fmtSpread(next.spread)], ['O/U', fmtNum(next.total)], ['Implied', fmtNum(next.implied)], ['ML', fmtOdds(next.ml)]] as [string, string][]).map(([k, v]) => <div key={k} className="rounded-md bg-paper border border-line px-2 py-1.5"><p className="text-[8.5px] uppercase tracking-wider text-muted">{k}</p><p className="text-[14px] font-bold text-accent2 num">{v}</p></div>)}
          </div>
          <p className="mt-2 text-[11px] text-muted leading-relaxed">
            {next.spread != null && (next.spread > 0 ? `${teamName(team)} is a ${fmtSpread(next.spread)} underdog` : next.spread < 0 ? `${teamName(team)} is favored by ${Math.abs(next.spread)}` : 'Pick-em')}{next.implied != null ? ` · implied ${fmtNum(next.implied)} points` : ''}.
            {!isTeam && next.spread != null && next.spread >= 7 ? ' Big underdogs trail; trailing scripts mean more dropbacks and fewer carries.' : ''}
            {!isTeam && next.spread != null && next.spread <= -7 ? ' Big favorites lead; leading scripts mean more carries and fewer dropbacks late.' : ''}
          </p>
          {!isTeam && (
            <div className="mt-2">
              <p className="eyebrow">{player?.name.split(' ').slice(-1)[0]} vs {next.opp}{hist.length ? '' : ' · no prior meetings in the data'}</p>
              {hist.length > 0 && <p className="text-[12px]">{hist.map(h => <span key={`${h.season}${h.week}`} className="mr-2">'{String(h.season).slice(2)} wk{h.week}: <b className={h.val > evalLine ? 'text-ok' : 'text-[#A0594B]'}>{fmtNum(h.val, 0)}</b></span>)}</p>}
            </div>
          )}
          {isTeam && tmKey && (
            <div className="mt-2"><p className="eyebrow">{teamName(team)} vs {next.opp}, recent</p>{hist.length ? <p className="text-[12px]">{hist.slice(-4).map(h => <span key={`${h.season}${h.week}`} className="mr-2">'{String(h.season).slice(2)} wk{h.week}: <b className="text-accent2">{tmKey === 'spread' || tmKey === 'ml' ? (h.val > 0 ? '+' : '') + h.val : fmtNum(h.val, 0)}</b></span>)}</p> : <p className="text-[11px] text-muted">No meetings in the data at this scope.</p>}</div>
          )}
        </>
      ) : <><CardTitle title="Bye week" sub="no game to read this week" /><p className="text-[12px] text-muted">The evaluation still runs on the season's games; the opponent and game-script pieces come back next week.</p></>}
    </div>
  )
}

const SCORE_COLORS = ['#A0594B', '#C98B7F', '#C9D7E0', '#8FB3A3', '#3F8060']
function Splits({ rows, market, pos, halves, games, evalLine, scopeNote }: { rows: SplitRow[]; market: Market; pos: Pos; halves: ReturnType<typeof toHalves>; games: GameRow[]; evalLine: number; scopeNote: string }) {
  const grp = (g: string) => rows.filter(r => r.grp === g).sort((a, b) => Number(a.ord) - Number(b.ord)).map(r => ({ k: r.k, v: Number(r.v), n: Number(r.n) }))
  const score = grp('score'), half = grp('half'), qtr = grp('qtr'), down = grp('down'), zone = grp('zone'), two = grp('two_min'), depth = grp('depth'), dir = grp('dir')
  const unit = market.unit
  const total = score.reduce((s, r) => s + r.v, 0)
  if (!rows.length) return null
  const byWeek = new Map(games.map(g => [`${g.season}-${g.week}`, g]))
  const hv = halves.map(h => ({ ...h, g: byWeek.get(`${h.season}-${h.week}`) })).filter(h => h.g)
  const trail = hv.filter(h => h.hd != null && h.hd < 0), lead = hv.filter(h => h.hd != null && h.hd > 0), tied = hv.filter(h => h.hd === 0)
  const avg = (xs: number[]) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '–'
  const dLabel = `${unit} by game state`
  return (
    <div className="qcard p-3">
      <CardTitle title={`Where the ${unit} came from`} sub={`${scopeNote} · the QueryBall thesis: bulk ${unit} are trivia; ${unit} by situation are the question a line is asking`} />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <p className="text-[11px] font-bold text-accent2 mb-1">By score state <span className="text-muted font-normal">· share of {Number.isInteger(total) ? total : total.toFixed(0)} {unit}</span></p>
          <StackBar items={score} colors={SCORE_COLORS} />
          <table className="qb-table w-full text-[11px] mt-2"><tbody>{score.map(r => <tr key={r.k}><td className="text-muted">{r.k}</td><td className="text-right num">{fmtNum(r.v, 0)}</td><td className="text-right num text-muted">{total ? `${(100 * r.v / total).toFixed(0)}%` : ''}</td></tr>)}</tbody></table>
        </div>
        <div>
          <p className="text-[11px] font-bold text-accent2 mb-1">By half and quarter</p>
          <StackBar items={half} colors={['#2A3B47', '#6191A5']} height={14} />
          <div className="mt-2"><HBars rows={qtr.map(r => ({ k: r.k, v: r.v }))} fmt={v => fmtNum(v, 0)} /></div>
          {two.length > 0 && <div className="mt-2"><StackBar items={two} colors={['#6191A5', '#C9D7E0']} height={12} /></div>}
        </div>
        <div>
          <p className="text-[11px] font-bold text-accent2 mb-1">By down and field zone</p>
          <HBars rows={down.map(r => ({ k: `${r.k}${r.k === '1' ? 'st' : r.k === '2' ? 'nd' : r.k === '3' ? 'rd' : 'th'} down`, v: r.v }))} fmt={v => fmtNum(v, 0)} />
          <div className="mt-2"><HBars rows={zone.map(r => ({ k: r.k, v: r.v }))} fmt={v => fmtNum(v, 0)} color="#9DB9C7" /></div>
          {depth.length > 0 && <><p className="text-[11px] font-bold text-accent2 mt-3 mb-1">By depth of target</p><HBars rows={depth.map(r => ({ k: r.k, v: r.v, sub: `${r.n} tgt` }))} fmt={v => fmtNum(v, 0)} color="#8FB3A3" /></>}
          {dir.length > 0 && <><p className="text-[11px] font-bold text-accent2 mt-3 mb-1">By direction</p><HBars rows={dir.map(r => ({ k: r.k, v: r.v, sub: `${r.n} car` }))} fmt={v => fmtNum(v, 0)} color="#8FB3A3" /></>}
        </div>
        <div>
          {hv.length > 0 ? (
            <>
              <p className="text-[11px] font-bold text-accent2 mb-1">Game by game: halftime, 1H, 2H</p>
              <div className="max-h-56 overflow-y-auto">
                <table className="qb-table w-full text-[11px]"><thead><tr><th>Game</th><th className="text-right">Half</th><th className="text-right">1H</th><th className="text-right">2H</th><th className="text-right">Total</th></tr></thead>
                  <tbody>{[...hv].reverse().map(h => <tr key={h.game_id}><td className="whitespace-nowrap">{scopeNote.includes('–') ? `'${String(h.season).slice(2)} ` : ''}wk {h.week} {h.g!.home ? 'vs' : '@'} {h.g!.opp}</td><td className={clsx('text-right num', h.hd != null && h.hd < 0 ? 'text-[#A0594B]' : h.hd != null && h.hd > 0 ? 'text-ok' : '')}>{h.hd == null ? '–' : (h.hd > 0 ? '+' : '') + h.hd}</td><td className="text-right num">{fmtNum(h.v1, 0)}</td><td className="text-right num font-bold">{fmtNum(h.v2, 0)}</td><td className={clsx('text-right num font-bold', h.g!.val > evalLine ? 'text-ok' : h.g!.val < evalLine ? 'text-[#A0594B]' : '')}>{fmtNum(h.g!.val, 0)}</td></tr>)}</tbody></table>
              </div>
              <table className="qb-table w-full text-[11px] mt-2"><thead><tr><th>At the half</th><th className="text-right">G</th><th className="text-right">{unit} / g</th><th className="text-right">2H / g</th></tr></thead>
                <tbody>{[['Trailing', trail], ['Tied', tied], ['Leading', lead]].map(([k, xs]) => (xs as typeof hv).length ? <tr key={k as string}><td>{k as string}</td><td className="text-right num">{(xs as typeof hv).length}</td><td className="text-right num font-bold text-accent2">{avg((xs as typeof hv).map(h => h.g!.val))}</td><td className="text-right num">{avg((xs as typeof hv).map(h => h.v2))}</td></tr> : null)}</tbody></table>
              <p className="mt-1 text-[10px] text-muted">Halftime margin from the play-by-play score. This is the table a second-half live line needs.</p>
            </>
          ) : <p className="text-[11px] text-muted">{dLabel} needs the play-by-play; longest-play markets show the per-play splits only.</p>}
        </div>
      </div>
    </div>
  )
}

function ContextCard({ games, evalLine }: { games: GameRow[]; evalLine: number }) {
  const ctx = contextTable(games).filter(c => c.g > 0)
  return (
    <div className="qcard p-3">
      <CardTitle title="Per game, by context" sub="favored or dog, home or away, win or loss, total, roof" />
      <table className="qb-table w-full text-[11.5px]"><thead><tr><th>Context</th><th className="text-right">Avg</th><th className="text-right">Games</th><th className="text-right">Over</th></tr></thead>
        <tbody>{ctx.map(c => { const xs = games.filter(g => { const t = contextTable([g]).find(x => x.k === c.k); return t && t.g > 0 }); const ov = xs.filter(g => g.val > evalLine).length; return <tr key={c.k}><td className="text-muted">{c.k}</td><td className="text-right num font-bold text-accent2">{c.v}</td><td className="text-right num">{c.g}</td><td className="text-right num">{ov}/{xs.length}</td></tr> })}</tbody></table>
    </div>
  )
}

function OppCard({ opp, pos, market, next, error, loading }: { opp: ReturnType<typeof oppProfile>; pos: Pos; market: Market; next: NextGame | null; error: Error | null; loading: boolean }) {
  if (!next) return <div className="qcard p-3"><CardTitle title="Opponent" sub="bye week" /><p className="text-[12px] text-muted">No defense to read this week.</p></div>
  if (!opp && loading) return <div className="qcard p-3"><CardTitle title={`${teamName(next.opp)} vs ${pos}s`} sub="loading…" /><div className="animate-pulse rounded bg-chalk h-40" /></div>
  if (!opp) return <div className="qcard p-3"><CardTitle title={`${teamName(next.opp)} vs ${pos}s`} /><p className="text-[12px] text-[#A0594B]">{error ? `Couldn't load the opponent profile: ${error.message.split('\n')[0]}` : `No ${pos} games against ${teamName(next.opp)} in the data yet.`}</p></div>
  const base = marketByKey(market.oppKey) ?? market
  const cls = opp.rank <= 8 ? 'soft' : opp.rank >= opp.n - 7 ? 'tough' : 'mid'
  const top = opp.table[0]?.per_g || 1
  return (
    <div className="qcard p-3">
      <CardTitle title={`${teamName(next.opp)} defense vs ${pos}s`} sub={`${base.label.toLowerCase()} allowed per game · 1st = allows the most`} />
      <div className="flex items-center gap-3">
        <span className={clsx('qb-rk big', cls)}>{ordinal(opp.rank)}<small>/{opp.n}</small></span>
        <div className="text-[12px]"><b className="text-[16px] text-accent2 num">{opp.per_g}</b> per game <span className="text-muted">· league {opp.league} · {opp.games} games</span></div>
      </div>
      <div className="mt-2 flex items-end gap-[2px] h-8" title="all 32 defenses, most allowed on the left">
        {opp.table.map(t => <span key={t.def} className="flex-1 rounded-t" style={{ height: `${Math.max(6, 100 * t.per_g / top)}%`, background: t.def === opp.team ? '#2A3B47' : '#C9D7E0' }} title={`${t.def} ${t.per_g}`} />)}
      </div>
      <p className="eyebrow mt-3 mb-1">Last {opp.last.length} games · what the opposing {pos}s did</p>
      <table className="qb-table w-full text-[11.5px]"><thead><tr><th>Wk</th><th>Opp {pos}s' team</th><th className="text-right">{base.label}</th><th className="text-right">Score</th></tr></thead>
        <tbody>{opp.last.map(r => <tr key={r.game_id}><td>wk {r.week}</td><td>{r.team}</td><td className="text-right num font-bold text-accent2">{fmtNum(r.v, 0)}</td><td className="text-right num text-muted">{fmtNum(r.def_pts, 0)}–{fmtNum(r.off_pts, 0)}</td></tr>)}</tbody></table>
      <p className="mt-2 text-[10px] text-muted">More on this defense: <Link to={`/decks/team-defense?team=${next.opp}`} className="text-accent">Team Defense deck →</Link></p>
    </div>
  )
}

function GameLogTable({ rows, evalLine, scope, isSpread }: { rows: { key: string; season: number; week: number; opp: string; home: boolean; spread: number | null; val: number; margin: number | null; pts: number | null; opp_pts: number | null }[]; evalLine: number; scope: Scope; isSpread: boolean }) {
  return (
    <div className="max-h-[420px] overflow-y-auto">
      <table className="qb-table w-full text-[11.5px]"><thead><tr><th>Game</th><th className="text-right">Result</th><th>vs line</th><th className="text-right">Spread</th><th className="text-right">Score</th></tr></thead>
        <tbody>{[...rows].reverse().map(r => {
          const hit = isSpread ? (r.spread != null && r.val + r.spread > 0) : r.val > evalLine, push = !isSpread && r.val === evalLine
          return <tr key={r.key}><td className="whitespace-nowrap">{scope === 'career' ? `'${String(r.season).slice(2)} ` : ''}wk {r.week} {r.home ? 'vs' : '@'} {r.opp}</td><td className="text-right num font-bold">{isSpread ? (r.val > 0 ? '+' : '') + r.val : fmtNum(r.val, 0)}</td><td><span className={clsx('qb-tag', push ? 'push' : hit ? 'ov' : 'un')}>{push ? 'PUSH' : hit ? (isSpread ? 'COVER' : 'OVER') : (isSpread ? 'NO' : 'UNDER')}</span></td><td className="text-right num text-muted">{fmtSpread(r.spread)}</td><td className="text-right num text-muted">{r.pts != null ? `${(r.margin ?? 0) > 0 ? 'W' : (r.margin ?? 0) < 0 ? 'L' : 'T'} ${fmtNum(r.pts, 0)}–${fmtNum(r.opp_pts, 0)}` : '–'}</td></tr>
        })}</tbody></table>
    </div>
  )
}

function TeamExtras({ team, tm, teamGames, propsBy, oppGames, oppPropsBy, next, evalLine, rows, scope }: { team: string; tm: TeamMarket; teamGames: TeamGame[]; propsBy: Map<string, TeamPropRow>; oppGames: TeamGame[]; oppPropsBy: Map<string, TeamPropRow>; next: NextGame | null; evalLine: number; rows: any[]; scope: Scope }) {
  const recent = teamGames.slice(-17)
  const ats = teamGames.filter(g => g.spread != null), cover = ats.filter(g => g.margin + g.spread! > 0).length
  const ou = teamGames.filter(g => g.total != null), over = ou.filter(g => g.pts + g.opp_pts > g.total!).length
  const h1 = teamGames.filter(g => g.h1_for != null)
  const favPts = teamGames.filter(g => g.spread != null && g.spread < 0).map(g => g.pts), dogPts = teamGames.filter(g => g.spread != null && g.spread > 0).map(g => g.pts)
  const avg = (xs: number[]) => xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '–'
  // the opponent's mirror of this market
  const mirrorKey: Record<string, keyof TeamPropRow | 'pts' | 'opp_pts' | 'h1'> = { sacks_made: 'sacks_allowed', rush_yds: 'opp_rush_yds', pass_yds: 'opp_pass_yds', plays: 'opp_plays', team_total: 'opp_pts', total: 'pts', h1_team_total: 'h1' }
  const mk = mirrorKey[tm.key]
  const mirror = next && mk ? oppGames.map(g => ({ week: g.week, opp: g.opp, home: g.home, v: mk === 'opp_pts' ? g.opp_pts : mk === 'pts' ? g.pts + g.opp_pts : mk === 'h1' ? (g.h1_against ?? 0) : Number(oppPropsBy.get(g.game_id)?.[mk as keyof TeamPropRow] ?? 0) })) : []
  const mirrorLabel: Record<string, string> = { sacks_made: 'sacks allowed', rush_yds: 'rushing yards allowed', pass_yds: 'passing yards allowed', plays: 'plays faced', team_total: 'points allowed', total: 'game totals', h1_team_total: '1st-half points allowed' }
  return (
    <>
      <div className="grid lg:grid-cols-3 gap-3">
        <div className="qcard p-3">
          <CardTitle title={`${teamName(team)} · the season in numbers`} sub={scope === 'career' ? `${teamGames.length} games at this scope` : `${teamGames.length} games`} />
          <table className="qb-table w-full text-[11.5px]"><tbody>
            <tr><td className="text-muted">Record</td><td className="text-right num font-bold">{teamGames.filter(g => g.margin > 0).length}–{teamGames.filter(g => g.margin < 0).length}{teamGames.some(g => g.margin === 0) ? `–${teamGames.filter(g => g.margin === 0).length}` : ''}</td></tr>
            <tr><td className="text-muted">Against the spread</td><td className="text-right num font-bold">{cover}–{ats.length - cover}</td></tr>
            <tr><td className="text-muted">Over / under</td><td className="text-right num font-bold">{over}–{ou.length - over}</td></tr>
            <tr><td className="text-muted">Points for / against per game</td><td className="text-right num font-bold">{avg(teamGames.map(g => g.pts))} / {avg(teamGames.map(g => g.opp_pts))}</td></tr>
            <tr><td className="text-muted">Average margin</td><td className="text-right num font-bold">{avg(teamGames.map(g => g.margin))}</td></tr>
            <tr><td className="text-muted">1st-half points for / against</td><td className="text-right num font-bold">{avg(h1.map(g => g.h1_for!))} / {avg(h1.map(g => g.h1_against!))}</td></tr>
            <tr><td className="text-muted">Points as favorite / as underdog</td><td className="text-right num font-bold">{avg(favPts)} / {avg(dogPts)}</td></tr>
          </tbody></table>
        </div>
        <div className="qcard p-3">
          <CardTitle title="Points by quarter" sub="for–against · last 17 games" />
          <div className="max-h-72 overflow-y-auto">
            <table className="qb-table w-full text-[11px]"><thead><tr><th>Game</th><th className="text-center">Q1</th><th className="text-center">Q2</th><th className="text-center">Q3</th><th className="text-center">Q4</th><th className="text-right">1H</th><th className="text-right">Final</th></tr></thead>
              <tbody>{[...recent].reverse().map(g => <tr key={g.game_id}><td className="whitespace-nowrap">{scope === 'career' ? `'${String(g.season).slice(2)} ` : ''}wk {g.week} {g.home ? 'vs' : '@'} {g.opp}</td>{[1, 2, 3, 4].map(q => { const c = g.q[q]; return <td key={q} className={clsx('text-center num', c && c[0] > c[1] ? 'text-ok' : c && c[0] < c[1] ? 'text-[#A0594B]' : 'text-muted')}>{c ? `${c[0]}–${c[1]}` : '–'}</td> })}<td className="text-right num">{g.h1_for ?? '–'}–{g.h1_against ?? '–'}</td><td className="text-right num font-bold">{g.pts}–{g.opp_pts}</td></tr>)}</tbody></table>
          </div>
        </div>
        <div className="qcard p-3">
          {next && mk ? (
            <>
              <CardTitle title={`${teamName(next.opp)} · ${mirrorLabel[tm.key]}`} sub="the other side of this line, by game" />
              <HBars rows={mirror.map(m => ({ k: `wk ${m.week} ${m.home ? 'vs' : '@'} ${m.opp}`, v: m.v }))} fmt={v => fmtNum(v, 0)} />
              <p className="mt-2 text-[11px] text-muted">Average {avg(mirror.map(m => m.v))} per game.</p>
            </>
          ) : (
            <>
              <CardTitle title="Game log" sub="most recent first" />
              <GameLogTable rows={rows} evalLine={evalLine} scope={scope} isSpread={tm.key === 'spread'} />
            </>
          )}
        </div>
      </div>
      {next && mk && <div className="qcard p-3 lg:w-2/3"><CardTitle title="Game log" sub="most recent first" /><GameLogTable rows={rows} evalLine={evalLine} scope={scope} isSpread={tm.key === 'spread'} /></div>}
    </>
  )
}

function MyLines({ items, grades, loading, onClose, onRemove }: { items: SavedLine[]; grades: Map<string, number>; loading: boolean; onClose: () => void; onRemove: (id: string) => void }) {
  const graded = items.map(it => ({ it, val: grades.get(it.id), status: gradeLine(it, grades.get(it.id)) }))
  const hits = graded.filter(g => g.status === 'hit').length, misses = graded.filter(g => g.status === 'miss').length
  const settled = graded.filter(g => g.status === 'hit' || g.status === 'miss')
  const avgRead = settled.length ? settled.reduce((s, g) => s + g.it.read, 0) / settled.length : null
  return (
    <>
      <div className="qb-sheet-scrim" style={{ zIndex: 70 }} onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 z-[71] w-full max-w-[560px] bg-paper shadow-pop overflow-y-auto">
        <div className="sticky top-0 bg-paper border-b border-line px-4 py-3 flex items-center justify-between">
          <div><p className="eyebrow">My Lines</p><p className="font-display text-xl">{items.length} saved · {hits}–{misses} graded</p></div>
          <button type="button" onClick={onClose} className="qb-iconbtn" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3">
          {settled.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              <div className="qcard px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-muted font-bold">Record</p><p className="text-[16px] font-bold text-accent2">{hits}–{misses}</p></div>
              <div className="qcard px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-muted font-bold">Avg read at save</p><p className="text-[16px] font-bold text-accent2">{avgRead?.toFixed(0)}%</p></div>
              <div className="qcard px-3 py-2"><p className="text-[9px] uppercase tracking-wider text-muted font-bold">Actual hit rate</p><p className="text-[16px] font-bold text-accent2">{(100 * hits / settled.length).toFixed(0)}%</p></div>
            </div>
          )}
          {!items.length && <p className="text-sm text-muted">Nothing saved yet. Evaluate a line and tap <b>Save line</b> on the read. Saved lines stay in this browser and grade themselves once the game is in the data.</p>}
          {loading && items.length > 0 && <p className="text-[11px] text-muted">Checking results…</p>}
          {graded.map(({ it, val, status }) => (
            <div key={it.id} className="qcard p-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link to={it.url} onClick={onClose} className="font-semibold text-[13px] text-accent2 hover:underline">{it.name}</Link>
                <p className="text-[11.5px] text-ink">{it.marketLabel} · {it.market === 'spread' ? fmtSpread(it.line) : it.market === 'ml' ? 'to win' : `${it.side} ${it.line}`} at {fmtOdds(it.odds)}</p>
                <p className="text-[10.5px] text-muted">{it.season} week {it.week}{it.opp ? ` · ${it.team} ${it.pid ? '' : ''}vs ${it.opp}` : ''} · read {it.read}% · saved {new Date(it.savedAt).toLocaleDateString()}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={clsx('qb-tag', status === 'hit' ? 'ov' : status === 'miss' ? 'un' : 'push')}>{status.toUpperCase()}</span>
                <p className="text-[11px] num text-muted mt-1">{val == null ? (it.market === 'h1_total' || it.market === 'h1_team_total' || ['sacks_made', 'rush_yds', 'pass_yds', 'plays'].includes(it.market) ? 'manual' : 'pending') : `result ${it.market === 'spread' || it.market === 'ml' ? (val > 0 ? '+' : '') + val : val}`}</p>
                <button type="button" onClick={() => onRemove(it.id)} className="text-[10px] text-muted hover:text-ink mt-1">remove</button>
              </div>
            </div>
          ))}
          {items.length > 0 && <p className="text-[10px] text-muted">Grading uses the box score and final score in the data; first-half lines and team props grade by hand. Results arrive with the nightly refresh. Stored only in this browser.</p>}
        </div>
      </div>
    </>
  )
}

// keep the optional helpers referenced for tree-shaking clarity
void Phi; void fairOdds; void MARKETS
