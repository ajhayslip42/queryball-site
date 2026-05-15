import { Routes, Route } from 'react-router-dom'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Home from '@/pages/Home'
import Articles from '@/pages/Articles'
import Article from '@/pages/Article'
import Projections from '@/pages/Projections'
import NotFound from '@/pages/NotFound'

import SinglePlayerDeck from '@/pages/decks/SinglePlayerDeck'
import TeamPlayerDeck from '@/pages/decks/TeamPlayerDeck'
import LeagueProductionDeck from '@/pages/decks/LeagueProductionDeck'
import TeamDefenseDeck from '@/pages/decks/TeamDefenseDeck'
import TeamTendenciesDeck from '@/pages/decks/TeamTendenciesDeck'
import LeagueDefenseDeck from '@/pages/decks/LeagueDefenseDeck'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/decks/single-player"    element={<SinglePlayerDeck />} />
          <Route path="/decks/team-player"      element={<TeamPlayerDeck />} />
          <Route path="/decks/league-production"element={<LeagueProductionDeck />} />
          <Route path="/decks/team-defense"     element={<TeamDefenseDeck />} />
          <Route path="/decks/team-tendencies"  element={<TeamTendenciesDeck />} />
          <Route path="/decks/league-defense"   element={<LeagueDefenseDeck />} />
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
