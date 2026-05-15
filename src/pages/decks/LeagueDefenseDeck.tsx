import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function LeagueDefenseDeck() {
  const tabs: DeckTab[] = [
    { id: 'rankings',    label: 'Predictive Rankings',   render: () => <ComingSoon deck="Predictive Defense Rankings" /> },
    { id: 'pass',        label: 'Pass Defense',          render: () => <ComingSoon deck="Pass Defense Rankings" /> },
    { id: 'run',         label: 'Run Defense',           render: () => <ComingSoon deck="Run Defense Rankings" /> },
    { id: 'matchup',     label: 'Matchup Grid',          render: () => <ComingSoon deck="Matchup Grid" note="Each defense vs each opposing position group, ranked." /> },
    { id: 'fantasy',     label: 'FP Allowed Leaderboard',fantasy: true, render: () => <ComingSoon deck="Fantasy Points Allowed Leaderboard" note="League-wide ranking of FP allowed, by position and scoring format." /> },
  ]
  return (
    <DeckShell
      title="League Defense Rankings"
      intro="Predictive rankings rather than cumulative scorebook fiction. What each defense actually does against opposing offenses, sliced by context."
      tabs={tabs}
      slicerGroups={['season','week','team','homeAway','down','distance','score','zone','qtr','playType','garbage']}
      deckIndex={6}
    />
  )
}
