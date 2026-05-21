import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamQBDeck() {
  const tabs: DeckTab[] = [
    { id: 'usage',       label: 'QB Usage Profile',     render: () => <ComingSoon deck="QB Usage Profile" note="Dropbacks, scramble rate, play-action rate, shotgun rate, no-huddle usage — how the offense leverages its QB." /> },
    { id: 'distribution',label: 'Target Distribution',  render: () => <ComingSoon deck="Target Distribution" note="Who the QB throws to, by alignment, depth, and situation. Receiver-by-receiver share." /> },
    { id: 'pressure',    label: 'Pressure Response',    render: () => <ComingSoon deck="Pressure & Pocket" note="How the QB performs under pressure vs clean, sack rate, time-to-throw, scramble rate." /> },
    { id: 'situational', label: 'Situational',          render: () => <ComingSoon deck="Situational QB" note="3rd-down conversion, red-zone TD%, 2-minute drives, late-game closing performance." /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <ComingSoon deck="Fantasy Implications" note="Team-level QB fantasy outlook: FP/G, ceiling, floor, format-by-format." /> },
  ]
  return (
    <DeckShell
      title="Team — Quarterback"
      intro="How each team uses its QB. Dropback volume, target distribution, scramble rate, pressure response, and the situations where the QB is asked to win the game."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={2}
    />
  )
}
