// Legacy route wrapper: /decks/team-te now points at the combined
// Pass Catchers deck, preloaded to the TE-only toggle. Bookmarks still work.
import TeamPassCatchersDeck from './TeamPassCatchersDeck'
export default function TeamTEDeck() {
  return <TeamPassCatchersDeck initialFilter="TE" />
}
