/**
 * QB view — delegates to the shared, position-aware PlayerView on real data.
 * Kept as a named export so SinglePlayerDeck's imports stay stable.
 */
import { buildPlayerTabs, PLAYER_SLICERS } from './PlayerView'
import type { Player } from '@/lib/players'
import type { DeckTab } from '@/components/deck/DeckShell'

export function getQBTabs(player: Player): DeckTab[] { return buildPlayerTabs(player) }
export const QB_SLICERS = PLAYER_SLICERS
