import { Routes, Route } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import Articles from '@/pages/Articles'
import Article from '@/pages/Article'
import Projections from '@/pages/Projections'
import NotFound from '@/pages/NotFound'

import SinglePlayerDeck    from '@/pages/decks/SinglePlayerDeck'
import TeamQBDeck          from '@/pages/decks/TeamQBDeck'
import TeamRBDeck          from '@/pages/decks/TeamRBDeck'
import TeamWRDeck          from '@/pages/decks/TeamWRDeck'
import TeamTEDeck          from '@/pages/decks/TeamTEDeck'
import LeagueProductionDeck from '@/pages/decks/LeagueProductionDeck'
import TeamDefenseDeck     from '@/pages/decks/TeamDefenseDeck'
import TeamTendenciesDeck  from '@/pages/decks/TeamTendenciesDeck'
import LeagueDefenseDeck   from '@/pages/decks/LeagueDefenseDeck'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/decks/single-player"     element={<SinglePlayerDeck />} />
          <Route path="/decks/team-qb"           element={<TeamQBDeck />} />
          <Route path="/decks/team-rb"           element={<TeamRBDeck />} />
          <Route path="/decks/team-wr"           element={<TeamWRDeck />} />
          <Route path="/decks/team-te"           element={<TeamTEDeck />} />
          <Route path="/decks/league-production" element={<LeagueProductionDeck />} />
          <Route path="/decks/team-defense"      element={<TeamDefenseDeck />} />
          <Route path="/decks/team-tendencies"   element={<TeamTendenciesDeck />} />
          <Route path="/decks/league-defense"    element={<LeagueDefenseDeck />} />
          <Route path="/articles" element={<Articles />} />
          <Route path="/articles/:slug" element={<Article />} />
          <Route path="/projections" element={<Projections />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
