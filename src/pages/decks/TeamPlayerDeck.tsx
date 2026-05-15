import DeckShell, { ComingSoon, type DeckTab } from '@/components/deck/DeckShell'

export default function TeamPlayerDeck() {
  const tabs: DeckTab[] = [
    { id: 'distribution', label: 'Touch / Target Distribution', render: () => <ComingSoon deck="Touch / Target Distribution" /> },
    { id: 'snap-share',   label: 'Snap Share',                  render: () => <ComingSoon deck="Snap Share" /> },
    { id: 'rz-gl',        label: 'Red Zone & Goal Line',        render: () => <ComingSoon deck="Red Zone & Goal Line Usage" /> },
    { id: 'route-tree',   label: 'Route Tree',                  render: () => <ComingSoon deck="Route Tree" note="Routes run per game, alignment by formation, target share by route concept." /> },
    { id: 'fantasy',      label: 'Fantasy Production',          fantasy: true, render: () => <ComingSoon deck="Fantasy Production (Team)" note="Team-level fantasy aggregates: roster construction, who scored when, scoring-format toggles." /> },
  ]
  return (
    <DeckShell
      title="Team Player Usage"
      intro="How an offense rations targets, carries, and red-zone work — sliced by every situational dimension."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={2}
    />
  )
}
