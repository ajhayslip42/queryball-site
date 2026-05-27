/**
 * Team Tendencies deck — what each offense does, not who they do it with.
 *
 * This is the team-as-a-whole view: the patterns a defensive coordinator
 * would diagram on Monday morning. Pass vs run by situation, personnel mix,
 * tempo, field position behavior. Position-agnostic on purpose.
 *
 * Tabs:
 *   01. Pass / Run Splits     — by down, distance, score
 *   02. Personnel Groupings   — 11/12/21 personnel and their tendencies
 *   03. Tempo & Snap Pace     — no-huddle, plays per game, seconds per play
 *   04. Field Position        — backed up, midfield, scoring territory
 *   05. Fantasy Implications  — what tendencies mean for player value
 */

import DeckShell, { Tile, Grid, StatBlock, type DeckTab } from '@/components/deck/DeckShell'
import DataTable, { type Column } from '@/components/DataTable'
import {
  BarTile, StackedBarTile, LineTile, DonutTile, PALETTE,
} from '@/components/charts/Charts'
import { FantasyBanner, FormatPicker } from '@/components/deck/Helpers'
import { fmt, TEAM_COLORS } from '@/lib/nfl'

export default function TeamTendenciesDeck() {
  const tabs: DeckTab[] = [
    { id: 'splits',      label: 'Pass / Run Splits',    render: () => <Splits /> },
    { id: 'personnel',   label: 'Personnel Groupings',  render: () => <Personnel /> },
    { id: 'tempo',       label: 'Tempo & Snap Pace',    render: () => <Tempo /> },
    { id: 'field-pos',   label: 'Field Position',       render: () => <FieldPos /> },
    { id: 'fantasy',     label: 'Fantasy Implications', fantasy: true, render: () => <Fantasy /> },
  ]
  return (
    <DeckShell
      title="Team Tendencies"
      intro="What each offense does, not who they do it with. Pass/run splits by down and score, personnel groupings, snap tempo, and field-position behavior — the patterns a defensive coordinator would diagram on Monday."
      tabs={tabs}
      slicerGroups={['season','week','team','opponent','homeAway','down','distance','score','zone','qtr','personnel','shotgun','playType','garbage']}
      deckIndex={8}
    />
  )
}

/* ============================================================
 * Tab 01 — Pass / Run Splits
 * ============================================================ */
function Splits() {
  const splits = [
    { team: 'CIN', overall: 64.2, first: 56.4, second: 58.2, third_short: 38.4, third_long: 84.1, neutral: 61.8, trail: 72.4 },
    { team: 'KC',  overall: 62.1, first: 54.2, second: 56.8, third_short: 42.6, third_long: 82.4, neutral: 60.4, trail: 70.1 },
    { team: 'MIA', overall: 61.4, first: 53.8, second: 57.1, third_short: 41.2, third_long: 81.7, neutral: 59.6, trail: 69.4 },
    { team: 'DET', overall: 58.6, first: 52.1, second: 54.4, third_short: 36.8, third_long: 79.4, neutral: 56.8, trail: 68.2 },
    { team: 'BUF', overall: 58.2, first: 51.4, second: 55.6, third_short: 38.1, third_long: 78.6, neutral: 57.4, trail: 67.8 },
    { team: 'LAR', overall: 57.4, first: 50.6, second: 54.1, third_short: 34.2, third_long: 77.8, neutral: 56.1, trail: 66.4 },
    { team: 'GB',  overall: 56.8, first: 49.8, second: 53.4, third_short: 39.4, third_long: 76.2, neutral: 55.6, trail: 65.8 },
    { team: 'PHI', overall: 52.4, first: 46.2, second: 49.8, third_short: 31.6, third_long: 73.4, neutral: 51.8, trail: 62.4 },
    { team: 'BAL', overall: 49.6, first: 42.8, second: 47.4, third_short: 28.4, third_long: 71.2, neutral: 48.6, trail: 61.2 },
    { team: 'ATL', overall: 48.2, first: 41.4, second: 46.8, third_short: 32.1, third_long: 70.4, neutral: 47.2, trail: 60.8 },
  ]
  const cols: Column<typeof splits[0]>[] = [
    { key: 'team',        label: 'Team' },
    { key: 'overall',     label: 'Pass%',     numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'first',       label: '1st Down%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'second',      label: '2nd Down%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'third_short', label: '3rd & ≤3%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'third_long',  label: '3rd & 7+%', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'neutral',     label: 'Neutral%',  numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'trail',       label: 'Trailing%', numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const overallPass = splits.map(s => ({ name: s.team, value: s.overall, color: TEAM_COLORS[s.team] || PALETTE.accent }))
  const downBreakdown = splits.slice(0, 8).map(s => ({
    name: s.team,
    first: s.first,
    second: s.second,
    third: (s.third_short + s.third_long) / 2,
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg pass%"           value="56.2%" sub="in neutral game scripts" />
        <StatBlock label="Most pass-happy"        value="CIN · 64.2%" sub="overall pass rate" />
        <StatBlock label="Most run-leaning"       value="ATL · 51.8%" sub="lowest pass rate" />
        <StatBlock label="Lg avg 3rd & long pass" value="77.6%" sub="3rd & 7+ pass rate" />
      </Grid>
      <Tile title="Overall pass rate by team" subtitle="Top 10 — adjust filters via slicer rail" span={12}>
        <BarTile data={overallPass} height={280} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Pass rate by down — top 8 teams" subtitle="Tendencies sharpen as down progresses" span={12}>
        <StackedBarTile data={downBreakdown} xKey="name" height={260}
          series={[
            { key: 'first',  label: '1st down', color: PALETTE.accent  },
            { key: 'second', label: '2nd down', color: PALETTE.accent2 },
            { key: 'third',  label: '3rd down (avg)', color: PALETTE.cool },
          ]} />
      </Tile>
      <Tile title="Pass/run splits — full table" subtitle="Neutral = within 8 pts in Q1–Q3" span={12}>
        <DataTable rows={splits} columns={cols} defaultSort={{ key: 'overall', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 02 — Personnel Groupings
 * ============================================================ */
function Personnel() {
  const personnel = [
    { team: 'LAR', p11: 78.4, p12: 14.2, p21:  3.4, p22:  1.6, p13:  2.4, pass_rt_11: 64.2, pass_rt_12: 38.4 },
    { team: 'KC',  p11: 76.2, p12: 15.4, p21:  4.1, p22:  1.8, p13:  2.5, pass_rt_11: 68.1, pass_rt_12: 36.2 },
    { team: 'CIN', p11: 74.8, p12: 17.1, p21:  3.8, p22:  1.4, p13:  2.9, pass_rt_11: 69.4, pass_rt_12: 41.6 },
    { team: 'BUF', p11: 72.4, p12: 18.6, p21:  4.4, p22:  2.1, p13:  2.5, pass_rt_11: 64.8, pass_rt_12: 39.2 },
    { team: 'MIA', p11: 71.6, p12: 19.4, p21:  3.6, p22:  2.4, p13:  3.0, pass_rt_11: 66.2, pass_rt_12: 37.8 },
    { team: 'DET', p11: 64.2, p12: 22.4, p21:  6.8, p22:  3.4, p13:  3.2, pass_rt_11: 62.4, pass_rt_12: 41.6 },
    { team: 'BAL', p11: 58.4, p12: 24.6, p21:  8.4, p22:  4.2, p13:  4.4, pass_rt_11: 56.8, pass_rt_12: 36.1 },
    { team: 'PHI', p11: 56.2, p12: 26.4, p21:  9.1, p22:  4.8, p13:  3.5, pass_rt_11: 54.6, pass_rt_12: 32.4 },
    { team: 'SF',  p11: 48.6, p12: 28.4, p21: 11.4, p22:  6.2, p13:  5.4, pass_rt_11: 58.4, pass_rt_12: 31.8 },
    { team: 'ATL', p11: 46.8, p12: 31.2, p21: 10.6, p22:  6.8, p13:  4.6, pass_rt_11: 56.1, pass_rt_12: 34.2 },
  ]
  const cols: Column<typeof personnel[0]>[] = [
    { key: 'team',        label: 'Team' },
    { key: 'p11',         label: '11 pers%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'p12',         label: '12 pers%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'p21',         label: '21 pers%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'p22',         label: '22 pers%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'p13',         label: '13 pers%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'pass_rt_11',  label: 'Pass% in 11', numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'pass_rt_12',  label: 'Pass% in 12', numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const personnelMix = personnel.slice(0, 8).map(p => ({
    name: p.team, p11: p.p11, p12: p.p12, p21_plus: p.p21 + p.p22 + p.p13,
  }))
  const lgAvg = [
    { name: '11 personnel', value: 64.8, color: PALETTE.accent  },
    { name: '12 personnel', value: 21.4, color: PALETTE.accent2 },
    { name: '21 personnel', value:  6.4, color: PALETTE.cool    },
    { name: '22 personnel', value:  3.6, color: PALETTE.muted   },
    { name: '13 personnel', value:  3.2, color: PALETTE.bad     },
    { name: 'Other',        value:  0.6, color: '#C8CFD5'        },
  ]

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg 11 personnel" value="64.8%" sub="3 WR / 1 TE / 1 RB" />
        <StatBlock label="Lg avg 12 personnel" value="21.4%" sub="2 WR / 2 TE / 1 RB" />
        <StatBlock label="Most spread (11)"    value="LAR · 78.4%" sub="three-WR base" />
        <StatBlock label="Most heavy (21+)"    value="SF · 23.0%" sub="multi-TE / fullback" />
      </Grid>
      <Grid>
        <Tile title="League-wide personnel mix" span={2}>
          <DonutTile data={lgAvg} height={260} />
        </Tile>
        <Tile title="Personnel mix by team — top 8" span={4}>
          <StackedBarTile data={personnelMix} xKey="name" height={260}
            series={[
              { key: 'p11',       label: '11 pers',  color: PALETTE.accent  },
              { key: 'p12',       label: '12 pers',  color: PALETTE.accent2 },
              { key: 'p21_plus',  label: '21/22/13', color: PALETTE.muted   },
            ]} />
        </Tile>
      </Grid>
      <Tile title="Personnel tendencies — top 10 teams" subtitle="Pass rate within each grouping reveals scheme" span={12}>
        <DataTable rows={personnel} columns={cols} defaultSort={{ key: 'p11', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 03 — Tempo & Snap Pace
 * ============================================================ */
function Tempo() {
  const tempo = [
    { team: 'PHI', plays_g: 66.4, sec_play: 24.6, no_huddle: 14.2, hurry_up: 9.8, sec_play_lead: 26.4, sec_play_trail: 21.8 },
    { team: 'BAL', plays_g: 65.8, sec_play: 25.1, no_huddle:  7.1, hurry_up: 8.2, sec_play_lead: 27.1, sec_play_trail: 22.4 },
    { team: 'BUF', plays_g: 65.2, sec_play: 25.4, no_huddle: 12.4, hurry_up: 9.1, sec_play_lead: 26.8, sec_play_trail: 22.1 },
    { team: 'DET', plays_g: 64.6, sec_play: 25.8, no_huddle:  5.8, hurry_up: 7.4, sec_play_lead: 27.2, sec_play_trail: 22.8 },
    { team: 'CIN', plays_g: 64.1, sec_play: 26.2, no_huddle:  8.2, hurry_up: 8.4, sec_play_lead: 27.4, sec_play_trail: 23.1 },
    { team: 'KC',  plays_g: 63.8, sec_play: 26.4, no_huddle:  9.6, hurry_up: 8.6, sec_play_lead: 27.8, sec_play_trail: 23.2 },
    { team: 'MIA', plays_g: 63.4, sec_play: 26.8, no_huddle: 11.2, hurry_up: 9.4, sec_play_lead: 28.1, sec_play_trail: 23.4 },
    { team: 'SF',  plays_g: 62.4, sec_play: 27.4, no_huddle:  4.6, hurry_up: 6.8, sec_play_lead: 28.6, sec_play_trail: 24.1 },
    { team: 'LAR', plays_g: 62.1, sec_play: 27.6, no_huddle:  6.7, hurry_up: 7.2, sec_play_lead: 28.8, sec_play_trail: 24.4 },
    { team: 'GB',  plays_g: 61.8, sec_play: 27.8, no_huddle:  6.4, hurry_up: 7.8, sec_play_lead: 29.1, sec_play_trail: 24.6 },
  ]
  const cols: Column<typeof tempo[0]>[] = [
    { key: 'team',           label: 'Team' },
    { key: 'plays_g',        label: 'Plays/G', numeric: true, format: v => fmt.num(v, 1) },
    { key: 'sec_play',       label: 'Sec/Play',numeric: true, format: v => fmt.num(v, 1) },
    { key: 'no_huddle',      label: 'NH%',     numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'hurry_up',       label: 'Hurry%',  numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'sec_play_lead',  label: 'Sec/Play (lead)',  numeric: true, format: v => fmt.num(v, 1) },
    { key: 'sec_play_trail', label: 'Sec/Play (trail)', numeric: true, format: v => fmt.num(v, 1) },
  ]
  const playsPerGame = tempo.map(t => ({ name: t.team, value: t.plays_g, color: TEAM_COLORS[t.team] || PALETTE.accent }))
  const leadVsTrail = tempo.slice(0, 8).map(t => ({
    name: t.team, lead: t.sec_play_lead, trail: t.sec_play_trail,
  }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg plays/g"      value="62.4" sub="all situations" />
        <StatBlock label="Lg avg sec/play"     value="27.1" sub="huddle to snap" />
        <StatBlock label="Fastest tempo"       value="PHI · 24.6 s/p" sub="quickest huddle" />
        <StatBlock label="Most no-huddle"      value="PHI · 14.2%" sub="of all snaps" />
      </Grid>
      <Tile title="Plays per game by team — top 10" subtitle="Volume drives counting stats" span={12}>
        <BarTile data={playsPerGame} height={260} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Snap pace: leading vs trailing" subtitle="Most teams slow down when leading, speed up when trailing" span={12}>
        <StackedBarTile data={leadVsTrail} xKey="name" height={260}
          series={[
            { key: 'lead',  label: 'Sec/play (leading)',  color: PALETTE.accent  },
            { key: 'trail', label: 'Sec/play (trailing)', color: PALETTE.bad     },
          ]} />
      </Tile>
      <Tile title="Tempo & snap pace — top 10 teams" span={12}>
        <DataTable rows={tempo} columns={cols} defaultSort={{ key: 'plays_g', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 04 — Field Position
 * ============================================================ */
function FieldPos() {
  const fp = [
    { team: 'KC',  own_20: 38.4, midfield: 56.8, opp_red: 64.1, opp_gl: 71.2, td_rate: 68.4 },
    { team: 'BUF', own_20: 36.8, midfield: 58.2, opp_red: 62.4, opp_gl: 68.4, td_rate: 62.8 },
    { team: 'BAL', own_20: 42.6, midfield: 54.1, opp_red: 58.6, opp_gl: 74.6, td_rate: 64.1 },
    { team: 'CIN', own_20: 34.2, midfield: 61.4, opp_red: 60.2, opp_gl: 64.8, td_rate: 58.1 },
    { team: 'DET', own_20: 36.2, midfield: 57.8, opp_red: 64.8, opp_gl: 69.2, td_rate: 66.2 },
    { team: 'PHI', own_20: 38.8, midfield: 55.6, opp_red: 56.4, opp_gl: 71.4, td_rate: 59.7 },
    { team: 'SF',  own_20: 32.4, midfield: 58.4, opp_red: 62.6, opp_gl: 68.1, td_rate: 61.4 },
    { team: 'MIA', own_20: 30.8, midfield: 62.1, opp_red: 58.1, opp_gl: 62.4, td_rate: 54.8 },
    { team: 'HOU', own_20: 34.6, midfield: 56.2, opp_red: 56.8, opp_gl: 64.2, td_rate: 52.6 },
    { team: 'LAR', own_20: 32.1, midfield: 58.7, opp_red: 58.4, opp_gl: 66.8, td_rate: 57.2 },
  ]
  const cols: Column<typeof fp[0]>[] = [
    { key: 'team',     label: 'Team' },
    { key: 'own_20',   label: 'Own 1–20 pass%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'midfield', label: 'Midfield pass%',    numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'opp_red',  label: 'Opp RZ pass%',      numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'opp_gl',   label: 'Opp GL run%',       numeric: true, format: v => `${v.toFixed(1)}%` },
    { key: 'td_rate',  label: 'RZ TD%',            numeric: true, format: v => `${v.toFixed(1)}%` },
  ]
  const rzPass = fp.map(f => ({ name: f.team, value: f.opp_red, color: TEAM_COLORS[f.team] || PALETTE.accent }))
  const tdRate = fp.map(f => ({ name: f.team, value: f.td_rate }))

  return (
    <div className="space-y-4">
      <Grid>
        <StatBlock label="Lg avg own-20 pass%"   value="35.4%" sub="conservative when backed up" />
        <StatBlock label="Lg avg midfield pass%" value="57.8%" sub="open playbook" />
        <StatBlock label="Lg avg RZ pass%"       value="59.4%" sub="of RZ snaps" />
        <StatBlock label="Lg avg RZ TD%"         value="58.6%" sub="of trips to RZ" />
      </Grid>
      <Tile title="Red-zone pass rate by team" subtitle="High = aggressive scheme. Low = run-it-in offense." span={12}>
        <BarTile data={rzPass} height={260} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Red-zone TD conversion rate" subtitle="Where good RZ play actually matters" span={12}>
        <BarTile data={tdRate} height={260} color={PALETTE.ok} formatY={v => `${v.toFixed(1)}%`} />
      </Tile>
      <Tile title="Tendencies by field position — top 10" span={12}>
        <DataTable rows={fp} columns={cols} defaultSort={{ key: 'td_rate', dir: 'desc' }} />
      </Tile>
    </div>
  )
}

/* ============================================================
 * Tab 05 — Fantasy Implications
 * ============================================================ */
function Fantasy() {
  const implications = [
    { team: 'CIN', archetype: 'Pass-heavy', impact: 'WR upside', winners: 'Chase, Higgins', losers: 'RB volume', score: 9.2 },
    { team: 'KC',  archetype: 'Spread / quick', impact: 'TE + slot WR', winners: 'Kelce, Rice', losers: 'Deep WR1', score: 8.4 },
    { team: 'MIA', archetype: 'Tempo + motion', impact: 'WR ceiling', winners: 'Hill, Waddle', losers: 'RB pass-game', score: 8.1 },
    { team: 'BUF', archetype: 'Balanced (QB-driven)', impact: 'QB rushing', winners: 'Allen, Cook', losers: 'WR3', score: 8.6 },
    { team: 'PHI', archetype: 'Tush-push / RZ run', impact: 'RB TD-vulture', winners: 'Hurts, Barkley', losers: 'TE RZ', score: 7.8 },
    { team: 'DET', archetype: 'Heavy + RPO', impact: 'RB1 + WR1', winners: 'Gibbs, St. Brown', losers: 'WR2', score: 8.7 },
    { team: 'BAL', archetype: 'QB-run / 12 personnel', impact: 'QB + TE', winners: 'Jackson, Andrews', losers: 'WR depth', score: 8.9 },
    { team: 'SF',  archetype: '21 personnel / play-action', impact: 'WR1 + FB-adjacent TE', winners: 'McCaffrey, Kittle', losers: 'WR3', score: 8.2 },
    { team: 'ATL', archetype: 'Run-first', impact: 'RB volume', winners: 'Robinson', losers: 'WR ceiling', score: 7.4 },
    { team: 'LAR', archetype: 'Spread / quick', impact: 'WR floor', winners: 'Nacua, Kupp', losers: 'TE', score: 7.9 },
  ]
  const cols: Column<typeof implications[0]>[] = [
    { key: 'team',      label: 'Team' },
    { key: 'archetype', label: 'Archetype' },
    { key: 'impact',    label: 'Position boost' },
    { key: 'winners',   label: 'Fantasy winners' },
    { key: 'losers',    label: 'Fantasy losers' },
    { key: 'score',     label: 'Scheme rating', numeric: true, format: v => fmt.num(v, 1) },
  ]
  const ratingChart = implications.map(i => ({
    name: i.team, value: i.score, color: TEAM_COLORS[i.team] || PALETTE.accent,
  }))

  return (
    <div className="space-y-4">
      <FantasyBanner
        label="Fantasy Implications · Team Tendencies"
        headline="Scheme shapes fantasy outcomes more than talent."
        body="A WR1 on a pass-heavy team is worth more than a WR1 on a run-first team — even if their per-target efficiency is identical. The archetypes below summarize how each scheme creates or suppresses fantasy upside."
      />
      <Grid>
        <StatBlock label="Most fantasy-friendly" value="CIN · 9.2" sub="scheme rating" />
        <StatBlock label="Best for QB rush"      value="BAL · 8.9" sub="QB-run heavy" />
        <StatBlock label="Best for RB1 volume"   value="DET · 8.7" sub="commitment + tempo" />
        <StatBlock label="Worst for WR ceiling"  value="ATL · 7.4" sub="run-first cap" />
      </Grid>
      <FormatPicker formats={['Overall', 'QB', 'RB', 'WR', 'TE']} active="Overall" />
      <Tile title="Scheme fantasy rating by team — top 10" subtitle="Higher = more fantasy production created by the system" span={12}>
        <BarTile data={ratingChart} height={260} formatY={v => fmt.num(v, 1)} />
      </Tile>
      <Tile title="Tendencies → fantasy implications" subtitle="A scouting summary for each scheme" span={12}>
        <DataTable rows={implications} columns={cols} defaultSort={{ key: 'score', dir: 'desc' }} />
      </Tile>
    </div>
  )
}
