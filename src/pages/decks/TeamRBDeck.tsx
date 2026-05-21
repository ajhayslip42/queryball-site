import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamRBDeck() {
  const tabs: DeckTab[] = [
    { id: 'carries',     label: 'Carry Distribution',   render: () => <ComingSoon deck="Carry Distribution" note="Which back gets the work — by down, distance, score state. Who's the bell-cow, who's the change-of-pace." /> },
    { id: 'goalline',    label: 'Goal-Line & Red Zone', render: () => <ComingSoon deck="Goal-Line & Red Zone" note="Who gets the goal-line carries. RZ touch share. The high-leverage situations that decide fantasy weeks." /> },
    { id: 'passing-game',label: 'Pass-Catching Role',   render: () => <ComingSoon deck="Pass-Catching Role" note="Routes run, target share, 3rd-down receiving usage. Where the PPR floor lives." /> },
    { id: 'efficiency',  label: 'Backfield Efficiency', render: () => <ComingSoon deck="Backfield Efficiency" note="YPC, yards before/after contact, broken tackles, success rate — by individual RB." /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <ComingSoon deck="Fantasy Implications" note="Team-level RB fantasy: workload security, RB1 vs RB2 split, format-by-format." /> },
  ]
  return (
    <DeckShell
      title="Team — Running Backs"
      intro="How each team rations its backfield. Carry distribution, goal-line work, third-down pass-catching role, efficiency by gap, and where the high-leverage touches actually go."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={3}
    />
  )
}
