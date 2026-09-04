// Legacy route wrapper: /decks/team-wr now points at the combined
// Pass Catchers deck, preloaded to the WR-only toggle. Bookmarks still work.
import TeamPassCatchersDeck from './TeamPassCatchersDeck'
export default function TeamWRDeck() {
  return <TeamPassCatchersDeck initialFilter="WR" />
}
