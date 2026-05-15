import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamDefenseDeck() {
  const tabs: DeckTab[] = [
    { id: 'allowed',    label: 'Yards / TDs Allowed',     render: () => <ComingSoon deck="Yards / TDs Allowed" /> },
    { id: 'epa',        label: 'EPA Allowed',             render: () => <ComingSoon deck="EPA Allowed" /> },
    { id: 'red-zone',   label: 'Red-Zone Defense',        render: () => <ComingSoon deck="Red-Zone Defense" /> },
    { id: 'splits',     label: 'Down & Distance Splits',  render: () => <ComingSoon deck="Down & Distance Splits Allowed" /> },
    { id: 'fantasy',    label: 'Fantasy Points Allowed',  fantasy: true, render: () => <ComingSoon deck="Fantasy Points Allowed" note="FP allowed by position, broken down by scoring format and game state." /> },
  ]
  return (
    <DeckShell
      title="Team Defense (Against)"
      intro="What each defense allows to opposing positions. Bulk yards-allowed numbers are noise; sliced ones predict matchup output."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','playType','garbage']}
      deckIndex={4}
    />
  )
}
