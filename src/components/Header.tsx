import { NavLink, Link } from 'react-router-dom'
import clsx from 'clsx'

export default function Header() {
  return (
    <header className="border-b border-line bg-paper/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-[1400px] mx-auto px-6 py-3.5 flex items-center justify-between">
        <Link to="/" className="flex items-center" aria-label="QueryBall">
          <img src="/logo.png" alt="QueryBall" className="h-9 w-auto" />
        </Link>
        <nav className="hidden md:flex items-center gap-7 text-sm">
          <NavItem to="/decks/single-player">Decks</NavItem>
          <NavItem to="/articles">Articles</NavItem>
          <NavItem to="/projections">Projections</NavItem>
        </nav>
        <Link
          to="/decks/single-player"
          className="hidden md:inline-flex items-center px-4 py-2 bg-accent2 text-paper text-sm rounded-full hover:bg-accent transition-colors"
        >
          Open a deck →
        </Link>
      </div>
    </header>
  )
}

function NavItem({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          'transition-colors',
          isActive ? 'text-ink font-medium' : 'text-muted hover:text-ink'
        )
      }
    >
      {children}
    </NavLink>
  )
}
