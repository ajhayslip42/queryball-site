import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Info, X } from 'lucide-react'
import { DATA_CREDIT } from '@/lib/nfl'

export default function Footer() {
  return (
    <footer className="border-t border-line bg-cream mt-12">
      <div className="max-w-[1400px] mx-auto px-6 py-12 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <img src="/logo.png" alt="QueryBall" className="h-8 w-auto" />
          <p className="mt-4 text-sm text-muted max-w-md leading-relaxed">
            NFL stats sliced through the situations that produced them. Built for people who
            want the number that comes next, not the one already on the broadcast.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Decks</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/decks/single-player" className="text-muted hover:text-ink">Single Player</Link></li>
            <li><Link to="/decks/team-qb" className="text-muted hover:text-ink">Team — QB</Link></li>
            <li><Link to="/decks/team-rb" className="text-muted hover:text-ink">Team — RB</Link></li>
            <li><Link to="/decks/team-passcatchers" className="text-muted hover:text-ink">Team — Pass Catchers</Link></li>
            <li><Link to="/decks/league-production" className="text-muted hover:text-ink">League Production</Link></li>
            <li><Link to="/decks/team-defense" className="text-muted hover:text-ink">Team Defense</Link></li>
            <li><Link to="/decks/team-tendencies" className="text-muted hover:text-ink">Team Tendencies</Link></li>
            <li><Link to="/decks/league-defense" className="text-muted hover:text-ink">League Defense</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">More</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/studio" className="text-muted hover:text-ink">Studio</Link></li>
            <li><Link to="/gallery" className="text-muted hover:text-ink">Query Gallery</Link></li>
            <li><Link to="/lines" className="text-muted hover:text-ink">Lines</Link></li>
            <li><Link to="/reports" className="text-muted hover:text-ink">Weekly Reports</Link></li>
            <li><Link to="/articles" className="text-muted hover:text-ink">Articles</Link></li>
            <li><Link to="/matchup" className="text-muted hover:text-ink">Matchup</Link></li>
            <li><Credits /></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex items-center justify-between gap-4 text-xs text-muted">
          <span>© {new Date().getFullYear()} QueryBall · All rights reserved. · Data: {DATA_CREDIT.nflverse.name} ({DATA_CREDIT.nflverse.licence}) · Not affiliated with the NFL.</span>
          <span className="shrink-0">@FF_AHayslip</span>
        </div>
      </div>
    </footer>
  )
}

/**
 * Credits & data sources — a small card that opens above the link. The
 * wording lives here and nowhere else; edit the paragraphs below.
 */
function Credits() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc); document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])
  const { nflverse, ftn } = DATA_CREDIT
  return (
    <div ref={ref} className="relative">
      {open && (
        <div role="dialog" aria-label="Credits and data sources" className="qb-credits">
          <button type="button" onClick={() => setOpen(false)} className="qb-iconbtn absolute top-2 right-2" aria-label="Close"><X className="h-4 w-4" /></button>
          <p className="eyebrow mb-2">Credits &amp; data sources</p>
          <p><b>Play-by-play, player stats, rosters, schedules and lines</b> come from the <a href={nflverse.url} target="_blank" rel="noopener">{nflverse.name}</a> project and are used under the <a href={nflverse.licenceUrl} target="_blank" rel="noopener">{nflverse.licence}</a> licence. QueryBall adds the situational filters, the reads and the rankings on top.</p>
          <p><b>Weekly Report PDFs</b> also use charting data from <b>{ftn.name}</b>, under <a href={ftn.licenceUrl} target="_blank" rel="noopener">{ftn.licence}</a>.</p>
          <p>QueryBall is an independent project. It is not affiliated with, endorsed by or sponsored by the National Football League or any of its teams. Team and player names appear for identification only.</p>
          <p><b>Lines</b> is for information only. The lines and odds shown are the ones you type; nothing is pulled from any sportsbook, and nothing here is a recommendation to wager. 21+. If gambling is a problem for you or someone you know, call 1-800-GAMBLER.</p>
        </div>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="inline-flex items-center gap-1.5 text-accent2 font-semibold border-b border-dashed border-accent hover:text-ink">
        <Info className="h-3.5 w-3.5" /> Credits &amp; data sources
      </button>
    </div>
  )
}
