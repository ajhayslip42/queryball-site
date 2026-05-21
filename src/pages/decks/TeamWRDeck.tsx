import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamWRDeck() {
  const tabs: DeckTab[] = [
    { id: 'target-share',label: 'Target Share',         render: () => <ComingSoon deck="Target Share" note="Who eats. WR1 / WR2 / WR3 splits, by down, distance, and game state." /> },
    { id: 'alignment',   label: 'Alignment & Routes',   render: () => <ComingSoon deck="Alignment & Routes" note="X vs Z vs slot snaps per receiver. Route tree by player. Where the offense puts its best WR." /> },
    { id: 'situational', label: 'Situational Targets',  render: () => <ComingSoon deck="Situational Targets" note="3rd-down targets, RZ targets, 2-minute targets — who the QB looks for when it matters." /> },
    { id: 'production',  label: 'Production Detail',    render: () => <ComingSoon deck="Production Detail" note="aDOT, YAC per reception, catch rate, YPRR. The per-play efficiency view." /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <ComingSoon deck="Fantasy Implications" note="Team-level WR room outlook: target floor, ceiling, format-by-format scoring exposure." /> },
  ]
  return (
    <DeckShell
      title="Team — Wide Receivers"
      intro="How each offense feeds its receivers. Target share by alignment and situation, route concepts, who's getting the chances in the moments that matter."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={4}
    />
  )
}
