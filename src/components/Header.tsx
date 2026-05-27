import { useState, useRef, useEffect } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const DECKS: { to: string; label: string; group: string }[] = [
  { to: '/decks/single-player',     label: 'Single Player',       group: 'Player' },
  { to: '/decks/league-production', label: 'League Production',    group: 'League' },
  { to: '/decks/league-defense',    label: 'League Defense',       group: 'League' },
  { to: '/decks/team-qb',           label: 'Team — Quarterback',   group: 'Team' },
  { to: '/decks/team-rb',           label: 'Team — Running Backs', group: 'Team' },
  { to: '/decks/team-wr',           label: 'Team — Wide Receivers',group: 'Team' },
  { to: '/decks/team-te',           label: 'Team — Tight Ends',    group: 'Team' },
  { to: '/decks/team-defense',      label: 'Team Defense',         group: 'Team' },
  { to: '/decks/team-tendencies',   label: 'Team Tendencies',      group: 'Team' },
]

export default function Header() {
  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="QueryBall">
          <img src="/logo.png" alt="QueryBall" className="h-9 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <DecksMenu />
          <NavItem to="/articles">Articles</NavItem>
          <NavItem to="/projections">Projections</NavItem>
        </nav>
        <Link to="/decks/single-player"
          className="hidden md:inline-flex items-center px-4 py-2 bg-accent2 text-paper text-sm rounded-full hover:bg-accent transition-colors">
          Open a deck →
        </Link>
      </div>
    </header>
  )
}

function DecksMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])
  const groups = ['Player', 'League', 'Team']
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-muted hover:text-ink transition-colors">
        Decks <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-60 rounded-xl border border-line bg-paper shadow-xl py-2 z-50">
          {groups.map(g => (
            <div key={g}>
              <p className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-muted2">{g}</p>
              {DECKS.filter(d => d.group === g).map(d => (
                <NavLink key={d.to} to={d.to} onClick={() => setOpen(false)}
                  className={({ isActive }) => clsx(
                    'block px-4 py-1.5 text-sm transition-colors',
                    isActive ? 'text-accent2 font-medium bg-cream' : 'text-ink hover:bg-cream'
                  )}>
                  {d.label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink to={to} className={({ isActive }) =>
      clsx('transition-colors', isActive ? 'text-ink font-medium' : 'text-muted hover:text-ink')}>
      {children}
    </NavLink>
  )
}
