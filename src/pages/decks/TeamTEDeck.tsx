import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamTEDeck() {
  const tabs: DeckTab[] = [
    { id: 'usage',       label: 'TE Usage Profile',     render: () => <ComingSoon deck="TE Usage Profile" note="In-line vs flexed vs slot. Routes-vs-blocking ratio. 11 vs 12 personnel deployment." /> },
    { id: 'redzone',     label: 'Red-Zone & Goal-Line', render: () => <ComingSoon deck="Red-Zone & Goal-Line" note="Where TEs earn their fantasy points — RZ targets, EZ targets, goal-line routes." /> },
    { id: 'distribution',label: 'TE Room Distribution', render: () => <ComingSoon deck="TE Room Distribution" note="When multiple TEs are in, who gets the targets. TE1 / TE2 split." /> },
    { id: 'production',  label: 'Production Detail',    render: () => <ComingSoon deck="Production Detail" note="aDOT, target rate per route, YPRR by individual TE. Receiving role beyond the bulk numbers." /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <ComingSoon deck="Fantasy Implications" note="TE-premium vs PPR vs standard. Boom rate, floor, RZ involvement as the key signal." /> },
  ]
  return (
    <DeckShell
      title="Team — Tight Ends"
      intro="How each offense uses its tight ends. In-line vs flexed alignment, route share vs blocking duty, red-zone usage, and the multi-TE deployment that drives target distribution."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={5}
    />
  )
}
