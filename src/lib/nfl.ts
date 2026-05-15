/**
 * NFL helpers — team and position lists, formatters, color tokens.
 */

export const TEAMS = [
  'ARI','ATL','BAL','BUF','CAR','CHI','CIN','CLE',
  'DAL','DEN','DET','GB', 'HOU','IND','JAX','KC',
  'LAC','LAR','LV', 'MIA','MIN','NE', 'NO', 'NYG',
  'NYJ','PHI','PIT','SEA','SF', 'TB', 'TEN','WAS',
]

export const POSITIONS = ['QB', 'RB', 'WR', 'TE'] as const

export const TEAM_COLORS: Record<string, string> = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D',
  CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00',
  DAL: '#003594', DEN: '#FB4F14', DET: '#0076B6', GB:  '#203731',
  HOU: '#03202F', IND: '#002C5F', JAX: '#101820', KC:  '#E31837',
  LAC: '#0080C6', LAR: '#003594', LV:  '#000000', MIA: '#008E97',
  MIN: '#4F2683', NE:  '#002244', NO:  '#D3BC8D', NYG: '#0B2265',
  NYJ: '#125740', PHI: '#004C54', PIT: '#FFB612', SEA: '#002244',
  SF:  '#AA0000', TB:  '#D50A0A', TEN: '#0C2340', WAS: '#5A1414',
}

export const POSITION_COLORS: Record<string, string> = {
  QB: '#6191A5',  // logo steel
  RB: '#2A3B47',  // logo navy
  WR: '#3F8060',
  TE: '#7FA899',
}

export const fmt = {
  int: (n: number | null | undefined) =>
    n == null || isNaN(n) ? '–' : Math.round(n).toLocaleString(),
  num: (n: number | null | undefined, decimals = 1) =>
    n == null || isNaN(n) ? '–'
      : n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  pct: (n: number | null | undefined, decimals = 1) =>
    n == null || isNaN(n) ? '–' : `${(n * 100).toFixed(decimals)}%`,
  signed: (n: number | null | undefined, decimals = 2) => {
    if (n == null || isNaN(n)) return '–'
    const v = n.toFixed(decimals)
    return n >= 0 ? `+${v}` : v
  },
}

/** nflverse hosts player headshots; URL pattern is stable. */
export function headshotUrl(gsisId: string | null | undefined): string | undefined {
  if (!gsisId) return undefined
  return `https://static.www.nfl.com/image/private/f_auto,q_auto/league/api/headshots/${gsisId}`
}

/** Team logos hosted by nflverse. */
export function teamLogo(team: string | null | undefined): string | undefined {
  if (!team) return undefined
  return `https://raw.githubusercontent.com/nflverse/nflverse-pbp/master/wordmarks/${team.toLowerCase()}.png`
}

export function seasonLabel(seasons: number[]): string {
  if (!seasons.length) return 'all seasons'
  if (seasons.length === 1) return `${seasons[0]}`
  const min = Math.min(...seasons), max = Math.max(...seasons)
  if (max - min + 1 === seasons.length) return `${min}–${String(max).slice(-2)}`
  return seasons.sort((a, b) => a - b).join(', ')
}
