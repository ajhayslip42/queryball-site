/**
 * Weekly Reports — the per-team PDF report decks, by season and week.
 *
 * Reads /reports/manifest.json, which scripts/publish-reports.py writes when
 * you publish a folder of PDFs exported from the Report Base File. Nothing
 * here is hand-maintained: add PDFs, run the script, redeploy.
 */
import { useEffect, useMemo, useState } from 'react'
import { FileText, ExternalLink, Download } from 'lucide-react'
import clsx from 'clsx'
import { teamLogo, TEAM_COLORS } from '@/lib/nfl'

type Report = { team: string; name: string; file: string; bytes: number; pages?: number | null; updated?: string }
type Week = { week: number; reports: Report[] }
type Season = { season: number; weeks: Week[] }
type Manifest = { version: string; seasons: Season[] }

const mb = (b: number) => `${(b / 1048576).toFixed(1)} MB`
const weekLabel = (w: number) => w <= 18 ? `Week ${w}` : w === 19 ? 'Wild Card' : w === 20 ? 'Divisional' : w === 21 ? 'Conf. Champ.' : 'Super Bowl'

export default function WeeklyReports() {
  const [man, setMan] = useState<Manifest | null>(null)
  const [err, setErr] = useState(false)
  const [season, setSeason] = useState<number | null>(null)
  const [week, setWeek] = useState<number | null>(null)

  useEffect(() => {
    document.title = 'Weekly Reports — QueryBall'
    fetch('/reports/manifest.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((m: Manifest) => {
        setMan(m)
        const s = m.seasons[0]; setSeason(s?.season ?? null); setWeek(s?.weeks[0]?.week ?? null)
      })
      .catch(() => setErr(true))
  }, [])

  const cur = useMemo(() => man?.seasons.find(s => s.season === season), [man, season])
  const wk = useMemo(() => cur?.weeks.find(w => w.week === week), [cur, week])

  return (
    <div className="bg-paper">
      <header className="border-b border-line bg-cream">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-6 py-8 lg:py-14">
          <p className="eyebrow mb-2">Weekly reports</p>
          <h1 className="font-display text-3xl lg:text-5xl tracking-tight">The team report decks.</h1>
          <p className="mt-3 max-w-2xl text-[13px] lg:text-base text-muted leading-relaxed">
            One PDF per team per week: the season-to-date statistical summary with league context, down-by-down and situational
            splits, personnel, and a glossary. Built from the same play-by-play as the site.
          </p>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-4 lg:px-6 py-6 lg:py-10">
        {err && <p className="text-sm text-muted">No reports have been published yet.</p>}
        {man && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="eyebrow mr-1">Season</span>
              {man.seasons.map(s => (
                <button key={s.season} type="button" onClick={() => { setSeason(s.season); setWeek(s.weeks[0]?.week ?? null) }}
                  className={clsx('chip', s.season === season && 'applied')}>{s.season}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <span className="eyebrow mr-1">Week</span>
              {cur?.weeks.map(w => (
                <button key={w.week} type="button" onClick={() => setWeek(w.week)} className={clsx('chip', w.week === week && 'applied')}>
                  {weekLabel(w.week)} <span className="text-muted text-[10px]">· {w.reports.length}</span>
                </button>
              ))}
            </div>

            {wk && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {wk.reports.map(r => (
                  <a key={r.team} href={r.file} target="_blank" rel="noopener" className="qcard p-3 hover-grow flex flex-col gap-2 group" title={`Open ${r.name} — ${weekLabel(wk.week)}, ${cur?.season}`}>
                    <div className="flex items-center gap-2">
                      <div className="relative h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${TEAM_COLORS[r.team] ?? '#2A3B47'}14` }}>
                        <span className="text-[10px] font-bold" style={{ color: TEAM_COLORS[r.team] ?? '#2A3B47' }}>{r.team}</span>
                        <img src={teamLogo(r.team)} alt="" className="absolute inset-0 m-auto h-6 w-auto" loading="lazy" onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-accent2 leading-tight">{r.name}</p>
                        <p className="text-[10.5px] text-muted">{weekLabel(wk.week)} · {cur?.season}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted mt-auto">
                      <span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" />{r.pages ? `${r.pages} pp · ` : ''}{mb(r.bytes)}</span>
                      <span className="inline-flex items-center gap-1 text-accent group-hover:underline">Open <ExternalLink className="h-3 w-3" /></span>
                    </div>
                  </a>
                ))}
              </div>
            )}
            {wk && wk.reports.length < 32 && (
              <p className="mt-6 text-[12px] text-muted">
                Don't see your team? Only the teams published for this week are listed — all 32 arrive as the week's export finishes.
              </p>
            )}
            {wk && (
              <p className="mt-2 text-[11px] text-muted2 inline-flex items-center gap-1"><Download className="h-3 w-3" /> PDFs open in a new tab; use your browser's download button to save one.</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
