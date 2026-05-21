import { Link } from 'react-router-dom'

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
            <li><Link to="/decks/team-wr" className="text-muted hover:text-ink">Team — WR</Link></li>
            <li><Link to="/decks/team-te" className="text-muted hover:text-ink">Team — TE</Link></li>
            <li><Link to="/decks/league-production" className="text-muted hover:text-ink">League Production</Link></li>
            <li><Link to="/decks/team-defense" className="text-muted hover:text-ink">Team Defense</Link></li>
            <li><Link to="/decks/team-tendencies" className="text-muted hover:text-ink">Team Tendencies</Link></li>
            <li><Link to="/decks/league-defense" className="text-muted hover:text-ink">League Defense</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">More</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/articles" className="text-muted hover:text-ink">Articles</Link></li>
            <li><Link to="/projections" className="text-muted hover:text-ink">Projections</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-6 flex items-center justify-between text-xs text-muted">
          <span>© {new Date().getFullYear()} QueryBall · All rights reserved.</span>
          <span>@FF_AHayslip</span>
        </div>
      </div>
    </footer>
  )
}
