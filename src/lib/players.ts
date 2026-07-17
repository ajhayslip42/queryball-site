/**
 * Player library — the searchable list behind PlayerPicker.
 *
 * This file ships with a curated set of well-known players so the picker
 * works out of the box in the reference build. When the parquet data
 * pipeline is wired (see scripts/refresh-data.py and src/lib/db.ts), the
 * `PlayerPicker` component will swap this static list for a query against
 * `players.parquet` that returns the live roster.
 *
 * The shape of `Player` matches what nflverse's players table provides,
 * so the swap is transparent — type stays identical.
 */

export type Position = 'QB' | 'RB' | 'WR' | 'TE'

export type Player = {
  gsis_id: string
  name: string
  position: Position
  team: string
  jersey?: number
  headshot?: string
}

/**
 * Curated demo roster. Replace with a query in production:
 *
 *   const { data } = useQuery<Player>(`
 *     SELECT gsis_id, full_name AS name, position, team_abbr AS team, jersey_number AS jersey
 *     FROM players
 *     WHERE position IN ('QB','RB','WR','TE') AND status = 'ACT'
 *     ORDER BY name
 *   `)
 */
export const PLAYERS: Player[] = [
  // QBs
  { gsis_id: '00-0033873', name: 'Patrick Mahomes',  position: 'QB', team: 'KC',  jersey: 15 },
  { gsis_id: '00-0036442', name: 'Joe Burrow',       position: 'QB', team: 'CIN', jersey: 9 },
  { gsis_id: '00-0034857', name: 'Josh Allen',       position: 'QB', team: 'BUF', jersey: 17 },
  { gsis_id: '00-0036389', name: 'Justin Herbert',   position: 'QB', team: 'LAC', jersey: 10 },
  { gsis_id: '00-0036971', name: 'Jalen Hurts',      position: 'QB', team: 'PHI', jersey: 1 },
  { gsis_id: '00-0037077', name: 'Trevor Lawrence',  position: 'QB', team: 'JAX', jersey: 16 },
  { gsis_id: '00-0034796', name: 'Lamar Jackson',    position: 'QB', team: 'BAL', jersey: 8 },
  { gsis_id: '00-0037834', name: 'Brock Purdy',      position: 'QB', team: 'SF',  jersey: 13 },
  { gsis_id: '00-0036945', name: 'Tua Tagovailoa',   position: 'QB', team: 'MIA', jersey: 1 },
  { gsis_id: '00-0038122', name: 'C.J. Stroud',      position: 'QB', team: 'HOU', jersey: 7 },
  { gsis_id: '00-0039163', name: 'Caleb Williams',   position: 'QB', team: 'CHI', jersey: 18 },
  { gsis_id: '00-0039164', name: 'Jayden Daniels',   position: 'QB', team: 'WAS', jersey: 5 },
  { gsis_id: '00-0033077', name: 'Dak Prescott',     position: 'QB', team: 'DAL', jersey: 4 },
  { gsis_id: '00-0031395', name: 'Jared Goff',       position: 'QB', team: 'DET', jersey: 16 },
  { gsis_id: '00-0034744', name: 'Kirk Cousins',     position: 'QB', team: 'ATL', jersey: 18 },
  { gsis_id: '00-0035704', name: 'Kyler Murray',     position: 'QB', team: 'ARI', jersey: 1 },
  { gsis_id: '00-0036442', name: 'Geno Smith',       position: 'QB', team: 'SEA', jersey: 7 },
  { gsis_id: '00-0038476', name: 'Bo Nix',           position: 'QB', team: 'DEN', jersey: 10 },

  // RBs
  { gsis_id: '00-0036223', name: 'Saquon Barkley',     position: 'RB', team: 'PHI', jersey: 26 },
  { gsis_id: '00-0036327', name: 'Christian McCaffrey',position: 'RB', team: 'SF',  jersey: 23 },
  { gsis_id: '00-0034791', name: 'Derrick Henry',      position: 'RB', team: 'BAL', jersey: 22 },
  { gsis_id: '00-0037240', name: 'Bijan Robinson',     position: 'RB', team: 'ATL', jersey: 7 },
  { gsis_id: '00-0037241', name: 'Jahmyr Gibbs',       position: 'RB', team: 'DET', jersey: 26 },
  { gsis_id: '00-0037270', name: 'Breece Hall',        position: 'RB', team: 'NYJ', jersey: 20 },
  { gsis_id: '00-0037271', name: 'Jonathan Taylor',    position: 'RB', team: 'IND', jersey: 28 },
  { gsis_id: '00-0036330', name: 'Josh Jacobs',        position: 'RB', team: 'GB',  jersey: 8 },
  { gsis_id: '00-0036937', name: "De'Von Achane",      position: 'RB', team: 'MIA', jersey: 28 },
  { gsis_id: '00-0036970', name: 'James Cook',         position: 'RB', team: 'BUF', jersey: 4 },
  { gsis_id: '00-0035715', name: 'Kyren Williams',     position: 'RB', team: 'LAR', jersey: 23 },
  { gsis_id: '00-0036223', name: 'Aaron Jones',        position: 'RB', team: 'MIN', jersey: 33 },
  { gsis_id: '00-0036226', name: 'Joe Mixon',          position: 'RB', team: 'HOU', jersey: 28 },
  { gsis_id: '00-0036228', name: 'Tony Pollard',       position: 'RB', team: 'TEN', jersey: 20 },
  { gsis_id: '00-0036229', name: 'Isiah Pacheco',      position: 'RB', team: 'KC',  jersey: 10 },
  { gsis_id: '00-0037272', name: 'Rachaad White',      position: 'RB', team: 'TB',  jersey: 1 },
  { gsis_id: '00-0037280', name: 'Najee Harris',       position: 'RB', team: 'PIT', jersey: 22 },
  { gsis_id: '00-0037281', name: 'Travis Etienne',     position: 'RB', team: 'JAX', jersey: 1 },

  // WRs
  { gsis_id: '00-0036322', name: 'Justin Jefferson',     position: 'WR', team: 'MIN', jersey: 18 },
  { gsis_id: '00-0034796', name: "Ja'Marr Chase",        position: 'WR', team: 'CIN', jersey: 1 },
  { gsis_id: '00-0035640', name: 'CeeDee Lamb',          position: 'WR', team: 'DAL', jersey: 88 },
  { gsis_id: '00-0036291', name: 'Tyreek Hill',          position: 'WR', team: 'MIA', jersey: 10 },
  { gsis_id: '00-0033040', name: 'A.J. Brown',           position: 'WR', team: 'PHI', jersey: 11 },
  { gsis_id: '00-0036915', name: 'Amon-Ra St. Brown',    position: 'WR', team: 'DET', jersey: 14 },
  { gsis_id: '00-0036900', name: 'Davante Adams',        position: 'WR', team: 'LV',  jersey: 17 },
  { gsis_id: '00-0034766', name: 'DeVonta Smith',        position: 'WR', team: 'PHI', jersey: 6 },
  { gsis_id: '00-0036970', name: 'Garrett Wilson',       position: 'WR', team: 'NYJ', jersey: 5 },
  { gsis_id: '00-0036971', name: 'Chris Olave',          position: 'WR', team: 'NO',  jersey: 12 },
  { gsis_id: '00-0036972', name: 'Drake London',         position: 'WR', team: 'ATL', jersey: 5 },
  { gsis_id: '00-0036973', name: 'Mike Evans',           position: 'WR', team: 'TB',  jersey: 13 },
  { gsis_id: '00-0036974', name: 'Stefon Diggs',         position: 'WR', team: 'HOU', jersey: 1 },
  { gsis_id: '00-0036975', name: 'DK Metcalf',           position: 'WR', team: 'SEA', jersey: 14 },
  { gsis_id: '00-0036976', name: 'Cooper Kupp',          position: 'WR', team: 'LAR', jersey: 10 },
  { gsis_id: '00-0036977', name: 'Puka Nacua',           position: 'WR', team: 'LAR', jersey: 17 },
  { gsis_id: '00-0036978', name: 'Nico Collins',         position: 'WR', team: 'HOU', jersey: 12 },
  { gsis_id: '00-0036979', name: 'Rashee Rice',          position: 'WR', team: 'KC',  jersey: 4 },
  { gsis_id: '00-0036980', name: 'Marvin Harrison Jr.',  position: 'WR', team: 'ARI', jersey: 18 },
  { gsis_id: '00-0036981', name: 'Malik Nabers',         position: 'WR', team: 'NYG', jersey: 1 },
  { gsis_id: '00-0036982', name: 'Brian Thomas Jr.',     position: 'WR', team: 'JAX', jersey: 7 },
  { gsis_id: '00-0036983', name: 'Ladd McConkey',        position: 'WR', team: 'LAC', jersey: 15 },
  { gsis_id: '00-0036984', name: 'Terry McLaurin',       position: 'WR', team: 'WAS', jersey: 17 },
  { gsis_id: '00-0036985', name: 'DJ Moore',             position: 'WR', team: 'CHI', jersey: 2 },
  { gsis_id: '00-0036986', name: 'Calvin Ridley',        position: 'WR', team: 'TEN', jersey: 0 },
  { gsis_id: '00-0036987', name: 'Brandon Aiyuk',        position: 'WR', team: 'SF',  jersey: 11 },
  { gsis_id: '00-0036988', name: 'Deebo Samuel',         position: 'WR', team: 'SF',  jersey: 19 },
  { gsis_id: '00-0036989', name: 'Jaylen Waddle',        position: 'WR', team: 'MIA', jersey: 17 },
  { gsis_id: '00-0036990', name: 'Tee Higgins',          position: 'WR', team: 'CIN', jersey: 5 },
  { gsis_id: '00-0036991', name: 'Xavier Worthy',        position: 'WR', team: 'KC',  jersey: 1 },
  { gsis_id: '00-0036992', name: 'Hollywood Brown',      position: 'WR', team: 'KC',  jersey: 5 },

  // TEs
  { gsis_id: '00-0030506', name: 'Travis Kelce',         position: 'TE', team: 'KC',  jersey: 87 },
  { gsis_id: '00-0034848', name: 'George Kittle',        position: 'TE', team: 'SF',  jersey: 85 },
  { gsis_id: '00-0036223', name: 'Mark Andrews',         position: 'TE', team: 'BAL', jersey: 89 },
  { gsis_id: '00-0036291', name: 'Sam LaPorta',          position: 'TE', team: 'DET', jersey: 87 },
  { gsis_id: '00-0036292', name: 'T.J. Hockenson',       position: 'TE', team: 'MIN', jersey: 87 },
  { gsis_id: '00-0036293', name: 'Trey McBride',         position: 'TE', team: 'ARI', jersey: 85 },
  { gsis_id: '00-0036294', name: 'Brock Bowers',         position: 'TE', team: 'LV',  jersey: 89 },
  { gsis_id: '00-0036295', name: 'Dallas Goedert',       position: 'TE', team: 'PHI', jersey: 88 },
  { gsis_id: '00-0036296', name: 'Evan Engram',          position: 'TE', team: 'JAX', jersey: 17 },
  { gsis_id: '00-0036297', name: 'David Njoku',          position: 'TE', team: 'CLE', jersey: 85 },
  { gsis_id: '00-0036298', name: 'Kyle Pitts',           position: 'TE', team: 'ATL', jersey: 8 },
  { gsis_id: '00-0036299', name: 'Jake Ferguson',        position: 'TE', team: 'DAL', jersey: 87 },
  { gsis_id: '00-0036300', name: 'Cole Kmet',            position: 'TE', team: 'CHI', jersey: 85 },
  { gsis_id: '00-0036301', name: 'Pat Freiermuth',       position: 'TE', team: 'PIT', jersey: 88 },
]

/**
 * Search players by name. Case-insensitive, matches anywhere in the name.
 */
export function searchPlayers(query: string, limit = 12): Player[] {
  if (!query.trim()) return PLAYERS.slice(0, limit)
  const q = query.toLowerCase()
  return PLAYERS
    .filter(p => p.name.toLowerCase().includes(q))
    .slice(0, limit)
}

/**
 * Find a player by their gsis_id (the canonical nflverse identifier).
 */
export function getPlayer(gsisId: string): Player | undefined {
  return PLAYERS.find(p => p.gsis_id === gsisId)
}

/**
 * Default player to show when nothing's selected — used for the initial
 * Single Player view so the deck has something to render.
 */
export const DEFAULT_PLAYER: Player = PLAYERS[0] // Patrick Mahomes
