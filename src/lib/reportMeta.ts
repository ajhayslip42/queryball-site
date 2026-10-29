/**
 * Report metadata — the plain-English question each report answers.
 *
 * The mobile deck "contents" screen lists every report with a question rather
 * than just a name, so a casual user knows what they'll get before they tap.
 * Keyed by the tab label used in each deck. Add a line here when you add a
 * report; anything missing falls back to a generic line.
 */

const QUESTIONS: Record<string, string> = {
  // Single Player
  'Overview':                'The headline numbers and the week-by-week shape of the season.',
  'Data Table':              'Every row, every column — the full game log for this slice.',
  'Weekly Production':       'How did they do each week, and what changed week over week?',
  'Down & Distance':         'Do they show up on 3rd down, or disappear?',
  'Game State':              'Garbage-time merchant, or real production when it matters?',
  'Pass Depth × Direction':  'Where the ball goes — depth and side of the field.',
  'Run Gap':                 'Which gaps the carries hit, and what each gap returns.',
  'Field & Quarter':         'Red-zone usage and late-game role.',
  'Fantasy':                 'Fantasy points by week and by situation — the start/sit view.',

  // Team position rooms
  'Room Overview':           'Who\'s in the room and how the volume is shared.',
  'Situational Splits':      'Who gets the ball on 3rd down, in the red zone, when trailing.',
  'Weekly Rotation':         'Who was actually playing, week by week.',
  'Efficiency H2H':          'Head-to-head efficiency inside the same room.',

  // League production
  'Position Leaderboard':    'The leaderboard, filtered by the situation you set.',
  'Efficiency Leaders':      'Who does the most with each touch or target.',
  'Volume & Usage':          'Who gets the opportunities, and what share of their team\'s.',
  'Emerging Producers':      'Who is heating up — last four weeks vs. season to date.',
  'Position × Team':         'How each team spreads the ball across positions.',
  'Fantasy Leaders':         'Fantasy points leaders in this slice.',

  // Defense decks
  'Allowed by Position':     'What each defense gives up to QBs, RBs, WRs and TEs.',
  'Overall Defense':         'The whole unit: yards, points, and plays allowed.',
  'Overall Rankings':        'Every defense ranked in the situation you set.',
  'Pass Defense':            'How each defense handles the pass.',
  'Pass D by Depth':         'Where defenses get beat — short, intermediate, deep.',
  'Pass D by Direction':     'Left, middle, right — the sideline that leaks.',
  'Run Defense':             'How each defense handles the run.',
  'Situational Defense':     'Defense on 3rd down, in the red zone, when protecting a lead.',
  'Fantasy DST':             'Sacks, takeaways and splash plays for DST scoring.',

  // Tendencies
  'Pass / Run & Tempo':      'How often they throw, and how fast they play.',
  'By Down':                 'Play-calling by down — where the tendencies hide.',
  'Air Yards':               'How far they throw it, and to whom.',
  'Situational':             'Tendencies by score, field position and quarter.',
  'Explosive & Scoring':     'Big plays and scoring drives.',
  'Efficiency':              'Yards per play and success in this slice.',
}

export function reportQuestion(label: string): string {
  return QUESTIONS[label] ?? 'A different lens on the same slice.'
}
