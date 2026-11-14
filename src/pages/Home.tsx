import { Link } from 'react-router-dom'
import { ArrowRight, Table2, FileText, Swords, Target, LayoutGrid } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AskBox from '@/components/mobile/AskBox'
import { SITUATIONS } from '@/lib/situations'
import { DEFAULTS, encodeSlicers } from '@/lib/slicers'

// Descriptors: drier / functional. One line each, no marketing garnish.
const DECKS = [
  { slug: 'single-player',     title: 'Single Player',          desc: 'One player, sliced by every situation. Position-aware.' },
  { slug: 'team-qb',           title: 'Team — Quarterback',     desc: 'The QB room: starter, backup, and any gadget snaps.' },
  { slug: 'team-rb',           title: 'Team — Running Backs',   desc: 'Backfield share, gap tendencies, third-down pass-catching.' },
  { slug: 'team-passcatchers', title: 'Team — Pass Catchers',   desc: 'WR + TE room combined. Toggle inside to isolate one position.' },
  { slug: 'league-production', title: 'League Production',      desc: 'Cross-league leaderboards, filtered by situation.' },
  { slug: 'team-defense',      title: 'Team Defense (Against)', desc: 'Production allowed by position, per defense.' },
  { slug: 'team-tendencies',   title: 'Team Situational Tendencies', desc: 'Pass/run rates, personnel, tempo, by game state.' },
  { slug: 'league-defense',    title: 'League Defense Rankings',desc: 'Cross-league defensive rankings.' },
]

// The tool directory in the hero: Decks first, then the tools in header order.
// Each line is written for someone who has never seen the site. Articles is
// deliberately not here — it lives in the header only.
const TOOLS: { to: string; title: string; go: string; icon: LucideIcon; desc: string; primary?: boolean }[] = [
  { to: '/decks/single-player', title: 'Decks', go: 'Open the decks', icon: LayoutGrid, primary: true,
    desc: 'Eight report decks — one player, a team room, the whole league — every page filtered by situation.' },
  { to: '/studio',  title: 'Studio',         go: 'Build a table',   icon: Table2,
    desc: 'Pick the rows and the metrics you want and get a table. Same filters as the decks. Save it, share it.' },
  { to: '/lines',   title: 'Lines',          go: 'Check a line',    icon: Target,
    desc: 'Type the line your sportsbook posted and see the odds it hits — with the game log, the splits and the opponent behind the number.' },
  { to: '/matchup', title: 'Matchup',        go: 'Compare players', icon: Swords,
    desc: 'Three players side by side for this week\'s game, and the defense each one faces, ranked against all 32.' },
  { to: '/reports', title: 'Weekly Reports', go: 'Open a report',   icon: FileText,
    desc: 'One PDF per team per week: season to date with league context, splits and personnel.' },
]

export default function Home() {
  return (
    <>
      {/* ============================== HERO ============================== */}
      <section className="border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-10 lg:py-14 grid lg:grid-cols-12 gap-8 lg:gap-10 lg:items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-3">Football stats with the context that matters</p>
            <h1 className="font-display text-4xl lg:text-5xl xl:text-6xl leading-[1.02] tracking-tight text-ink">
              Numbers are <em className="text-accent">bar trivia</em>.<br />
              Context makes them <em className="text-accent2">actionable</em>.
            </h1>
            <p className="mt-5 text-base text-muted max-w-2xl leading-relaxed">
              QueryBall is built around one belief: a stat without its game state, field position,
              score, down, distance and personnel is decoration. Slice every number through the
              situation that produced it, and the answer becomes one you can act on.
            </p>
            {/* Search-first entry: a player, a team, or a whole question. */}
            <div className="mt-6 max-w-xl">
              <p className="eyebrow mb-2">Start with a player, a team, or a question</p>
              <AskBox />
              <a href="#situations" className="mt-2 inline-block text-[12.5px] text-muted hover:text-ink">Or jump straight to a situation ↓</a>
            </div>
          </div>
          {/* The tool directory: one pill per thing you can do here. */}
          <div className="lg:col-span-5">
            <div className="flex flex-col gap-2 lg:gap-2.5">
              {TOOLS.map(t => (
                <Link key={t.to} to={t.to} className={`qb-toolpill hover-grow ${t.primary ? 'primary' : ''}`}>
                  <span className="qb-toolpill-i"><t.icon className="h-5 w-5" /></span>
                  <span className="min-w-0">
                    <span className="block font-display italic text-xl lg:text-[21px] leading-tight">{t.title}</span>
                    <span className="block text-[12px] leading-snug mt-0.5 qb-toolpill-d">{t.desc}</span>
                  </span>
                  <span className="qb-toolpill-go">{t.go} <ArrowRight className="h-3 w-3" /></span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================== TRY A SITUATION ============================== */}
      {/* The easiest way in: one tap opens the League Production deck with a
       * filter already applied. Kept to one short band: headline + one line
       * on the left, every preset as a chip on the right. */}
      <section id="situations" className="border-b border-line bg-cream">
        <div className="max-w-[1400px] mx-auto px-6 py-6 lg:py-7 grid lg:grid-cols-12 gap-4 lg:gap-8 lg:items-center">
          <div className="lg:col-span-3 min-w-0">
            <p className="eyebrow">The easiest way in</p>
            <h2 className="font-display text-2xl lg:text-3xl tracking-tight mt-1">Try a situation.</h2>
            <p className="mt-1.5 text-[13px] text-muted leading-relaxed">Tap one and a deck opens already filtered to it. Switch decks or players and the situation travels with you.</p>
          </div>
          <div className="lg:col-span-9 min-w-0">
            <SituationsRow />
          </div>
        </div>
      </section>

      {/* ============================== DECKS ============================== */}
      <section className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 py-6 lg:py-8">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl md:text-2xl tracking-tight">The reports.</h2>
            <p className="hidden sm:block text-[12.5px] text-muted">Eight decks. Every page filters by situation.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-2.5">
            {DECKS.map(d => (
              <Link key={d.slug} to={`/decks/${d.slug}`} title={d.desc}
                className="qcard px-3 py-2 lg:px-3.5 lg:py-2.5 hover-grow group flex items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="block font-display text-[14.5px] lg:text-base leading-tight">{d.title}</span>
                  <span className="hidden sm:block mt-0.5 text-[11.5px] text-muted leading-snug truncate">{d.desc}</span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted2 group-hover:text-accent transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

function SituationsRow() {
  // Each chip is a link into the League Production deck with that situation
  // already applied — the fastest way to see what a filter does. All presets
  // are shown; on phones they scroll sideways in two rows.
  return (
    <div className="qb-sitrow -mx-6 px-6 lg:mx-0 lg:px-0">
      {SITUATIONS.map(s => (
        <Link key={s.id} to={`/decks/league-production?${encodeSlicers({ ...DEFAULTS, ...s.patch }).toString()}`} className="qb-sitchip" title={s.sets}>{s.label}</Link>
      ))}
      <Link to="/decks/league-production" className="qb-sitchip ghost">no filter — open the deck →</Link>
    </div>
  )
}
