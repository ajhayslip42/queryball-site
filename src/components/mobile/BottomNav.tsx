/**
 * BottomNav — the phone navigation bar (hidden at lg and up).
 *
 * The desktop header's "Decks" menu is hidden on phones, which left mobile
 * users with no way to find the other eight decks. Six tabs: Player, Team
 * (opens a chooser), Matchup, Lines, Studio, More (league decks and the rest).
 */
import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { User, Users, Swords, Target, Table2, Menu, X } from 'lucide-react'
import clsx from 'clsx'

type Item = { to: string; label: string; sub?: string }
const TEAM: Item[] = [
  { to: '/decks/team-qb', label: 'Quarterback', sub: 'The QB room' },
  { to: '/decks/team-rb', label: 'Running Backs', sub: 'Backfield share and gaps' },
  { to: '/decks/team-passcatchers', label: 'Pass Catchers', sub: 'WR + TE room' },
  { to: '/decks/team-defense', label: 'Team Defense', sub: 'Production allowed' },
  { to: '/decks/team-tendencies', label: 'Tendencies', sub: 'Play-calling by situation' },
]
const MORE: Item[] = [
  { to: '/', label: 'Home' },
  { to: '/decks/league-production', label: 'League Production', sub: 'Leaderboards by situation' },
  { to: '/decks/league-defense', label: 'League Defense', sub: 'Defensive rankings' },
  { to: '/articles', label: 'Articles' },
  { to: '/reports', label: 'Weekly Reports', sub: 'Team report PDFs' },
  { to: '/projections', label: 'Projections' },
  { to: '/gallery', label: 'Query Gallery', sub: 'Saved Studio queries' },
]

export default function BottomNav() {
  const loc = useLocation()
  const navigate = useNavigate()
  const [menu, setMenu] = useState<'team' | 'more' | null>(null)
  useEffect(() => { setMenu(null) }, [loc.pathname])

  const isTeam = /\/decks\/team-/.test(loc.pathname)
  const isPlayer = loc.pathname === '/decks/single-player'
  const isStudio = loc.pathname === '/studio'
  const items = menu === 'team' ? TEAM : menu === 'more' ? MORE : []

  // Keep the current query string when hopping between decks so the context
  // (season, team, situation) carries over.
  const go = (to: string) => navigate(to.startsWith('/decks/') && loc.pathname.startsWith('/decks/') ? `${to}${loc.search}` : to)

  return (
    <>
      {menu && (
        <>
          <div className="qb-sheet-scrim" style={{ zIndex: 70 }} onClick={() => setMenu(null)} />
          <div className="qb-navmenu">
            <div className="flex items-center justify-between mb-2">
              <p className="eyebrow">{menu === 'team' ? 'Team decks' : 'More'}</p>
              <button type="button" onClick={() => setMenu(null)} className="qb-iconbtn" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              {items.map(i => (
                <button key={i.to} type="button" onClick={() => go(i.to)}
                  className={clsx('w-full text-left rounded-lg border px-3 py-2.5', loc.pathname === i.to ? 'border-accent bg-[#F3F7F9]' : 'border-line bg-paper')}>
                  <span className="block text-[13px] font-semibold text-accent2">{i.label}</span>
                  {i.sub && <span className="block text-[11px] text-muted">{i.sub}</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      <nav className="qb-bottomnav" aria-label="Primary">
        <NavLink to={`/decks/single-player${loc.pathname.startsWith('/decks/') ? loc.search : ''}`} className={clsx('qb-navitem', isPlayer && 'on')}>
          <User className="h-5 w-5" /><span>Player</span>
        </NavLink>
        <button type="button" onClick={() => setMenu(m => m === 'team' ? null : 'team')} className={clsx('qb-navitem', (isTeam || menu === 'team') && 'on')}>
          <Users className="h-5 w-5" /><span>Team</span>
        </button>
        <NavLink to="/matchup" className={clsx('qb-navitem', loc.pathname === '/matchup' && 'on')}>
          <Swords className="h-5 w-5" /><span>Matchup</span>
        </NavLink>
        <NavLink to="/lines" className={clsx('qb-navitem', loc.pathname === '/lines' && 'on')}>
          <Target className="h-5 w-5" /><span>Lines</span>
        </NavLink>
        <NavLink to="/studio" className={clsx('qb-navitem', isStudio && 'on')}>
          <Table2 className="h-5 w-5" /><span>Studio</span>
        </NavLink>
        <button type="button" onClick={() => setMenu(m => m === 'more' ? null : 'more')} className={clsx('qb-navitem', menu === 'more' && 'on')}>
          <Menu className="h-5 w-5" /><span>More</span>
        </button>
      </nav>
    </>
  )
}
