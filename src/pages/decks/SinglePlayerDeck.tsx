/**
 * SinglePlayerDeck — the position router.
 *
 * Reads the currently-selected player (from the URL via useSlicers), looks
 * up their position, and renders the position-shaped view:
 *
 *   QB → QBView   (passing-focused)
 *   RB → RBView   (rushing + pass-catching)
 *   WR → WRView   (targets, routes, YAC)
 *   TE → TEView   (alignment, blocking vs routes, RZ)
 *
 * The PlayerPicker mounts at the top of the filter rail. Selecting any
 * player re-renders the whole deck under their position's layout.
 */

import DeckShell from '@/components/deck/DeckShell'
import { useSlicers } from '@/lib/slicers'
import { DEFAULT_PLAYER } from '@/lib/players'
import { usePlayerIndex } from '@/lib/usePlayerIndex'

import { getQBTabs, QB_SLICERS } from './single-player/QBView'
import { getRBTabs, RB_SLICERS } from './single-player/RBView'
import { getWRTabs, WR_SLICERS } from './single-player/WRView'
import { getTETabs, TE_SLICERS } from './single-player/TEView'

const POSITION_BLURB: Record<string, string> = {
  QB: 'The microscope view, shaped for quarterbacks. Comp%, Y/A, pressure response, red-zone passing, and the EPA the pocket actually delivered.',
  RB: 'The microscope view, shaped for running backs. Yards before contact, broken tackles, goal-line carries, third-down pass-catching role.',
  WR: 'The microscope view, shaped for wide receivers. Target share, alignment, route tree, YAC over expected, contested-catch rate.',
  TE: 'The microscope view, shaped for tight ends. In-line vs flexed snaps, route share, target-per-route rate, red-zone usage.',
}

export default function SinglePlayerDeck() {
  const { slicers } = useSlicers()
  const { byId } = usePlayerIndex()
  const playerId = slicers.playerIds[0]
  const player = (playerId && byId.get(playerId)) || DEFAULT_PLAYER

  const tabs =
    player.position === 'QB' ? getQBTabs(player) :
    player.position === 'RB' ? getRBTabs(player) :
    player.position === 'WR' ? getWRTabs(player) :
                               getTETabs(player)

  const slicerGroups =
    player.position === 'QB' ? [...QB_SLICERS] :
    player.position === 'RB' ? [...RB_SLICERS] :
    player.position === 'WR' ? [...WR_SLICERS] :
                               [...TE_SLICERS]

  return (
    <DeckShell
      key={player.gsis_id + player.position}
      title="Single Player"
      intro={POSITION_BLURB[player.position]}
      tabs={tabs}
      slicerGroups={slicerGroups}
      deckIndex={1}
      showPlayerPicker
      currentSubject={{
        label: player.name,
        sub: `${player.team} · ${player.position}${player.jersey != null ? ` · #${player.jersey}` : ''}`,
      }}
    />
  )
}
