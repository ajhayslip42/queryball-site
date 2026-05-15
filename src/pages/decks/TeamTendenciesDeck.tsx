import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamTendenciesDeck() {
  const tabs: DeckTab[] = [
    { id: 'pass-run',     label: 'Pass / Run Rate',          render: () => <ComingSoon deck="Pass / Run Rate" /> },
    { id: 'personnel',    label: 'Personnel & Formation',    render: () => <ComingSoon deck="Personnel Distribution" /> },
    { id: 'tempo',        label: 'Tempo & No-Huddle',        render: () => <ComingSoon deck="Tempo & No-Huddle Rate" /> },
    { id: 'situational',  label: 'Situational Tendencies',   render: () => <ComingSoon deck="Situational Tendencies" note="3rd-and-short, red zone, 2-minute, late-game closing tendencies." /> },
    { id: 'fantasy',      label: 'Fantasy Implications',     fantasy: true, render: () => <ComingSoon deck="Fantasy Implications" note="How team tendencies translate to position-level fantasy expectations." /> },
  ]
  return (
    <DeckShell
      title="Team Situational Tendencies"
      intro="What an offense does, when. Pass and run rates, personnel groupings, tempo — all sliced by the game state that produced them."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','shotgun','playType','garbage']}
      deckIndex={5}
    />
  )
}
