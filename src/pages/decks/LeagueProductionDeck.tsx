import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function LeagueProductionDeck() {
  const tabs: DeckTab[] = [
    { id: 'leaderboard',  label: 'Leaderboard',            render: () => <ComingSoon deck="Position Leaderboards" /> },
    { id: 'volume-eff',   label: 'Volume vs Efficiency',   render: () => <ComingSoon deck="Volume vs Efficiency" /> },
    { id: 'percentiles',  label: 'Position Percentiles',   render: () => <ComingSoon deck="Position Percentiles" /> },
    { id: 'trend',        label: 'Trend & Movement',       render: () => <ComingSoon deck="Week-over-Week Movement" /> },
    { id: 'fantasy',      label: 'Fantasy Leaderboard',    fantasy: true, render: () => <ComingSoon deck="Fantasy Leaderboard" note="Position-by-position fantasy leaderboards across scoring formats." /> },
  ]
  return (
    <DeckShell
      title="League Productivity"
      intro="Cross-league leaderboards. Same numbers everyone else has — except sliced by the contexts that change what they actually mean."
      tabs={tabs}
      slicerGroups={['season','week','position','team','homeAway','down','distance','score','zone','qtr','shotgun','playType','garbage']}
      deckIndex={3}
    />
  )
}
