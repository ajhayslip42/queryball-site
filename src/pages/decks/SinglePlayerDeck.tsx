/**
 * SinglePlayerDeck — mounts the unified Single-Player view.
 *
 * The tab set now lives entirely in PlayerView (position-aware at render time).
 * Selecting a new player automatically re-shapes the reports.
 */

import DeckShell from '@/components/deck/DeckShell'
import { useSlicers } from '@/lib/slicers'
import { DEFAULT_PLAYER } from '@/lib/players'
import { usePlayerIndex } from '@/lib/usePlayerIndex'
import { buildPlayerTabs, PLAYER_SLICERS } from './single-player/PlayerView'

const POSITION_BLURB: Record<string, string> = {
  QB: 'One quarterback, sliced by every situation. Comp%, Y/A, depth × direction quadrant, red-zone splits.',
  RB: 'One running back, sliced by every situation. Gap distribution, third-down pass-catching role, red-zone workload.',
  WR: 'One wide receiver, sliced by every situation. Air-yards / YAC / air-yards-on-incompletes, catch % by depth.',
  TE: 'One tight end, sliced by every situation. Target share, depth splits, red-zone usage.',
}

export default function SinglePlayerDeck() {
  const { slicers } = useSlicers()
  const { byId } = usePlayerIndex()
  const playerId = slicers.playerIds[0]
  const player = (playerId && byId.get(playerId)) || DEFAULT_PLAYER

  return (
    <DeckShell
      key={player.gsis_id + player.position}
      title="Single Player"
      intro={POSITION_BLURB[player.position] ?? POSITION_BLURB.WR}
      tabs={buildPlayerTabs(player)}
      slicerGroups={[...PLAYER_SLICERS]}
      deckIndex={1}
      showPlayerPicker
      currentSubject={{
        label: player.name,
        sub: `${player.team} · ${player.position}${player.jersey != null ? ` · #${player.jersey}` : ''}`,
      }}
    />
  )
}
