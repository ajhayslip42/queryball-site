import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Table2, FileText, Swords, Target, LayoutGrid } from 'lucide-react'
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

// Everything that isn't a deck, in the same order as the header.
// `quick` is the short label on the hero button; `desc` is the card copy.
// Add a new tool here and it shows up in both places.
const TOOLS: { to: string; title: string; quick: string; icon: LucideIcon; desc: string }[] = [
  { to: '/studio',   title: 'Studio',         quick: 'Build your own table', icon: Table2,
    desc: 'Pick rows and metrics, get a table. Same filters as the decks. Save it, share it.' },
  { to: '/lines',    title: 'Lines',          quick: 'Check a line',         icon: Target,
    desc: 'Type the line your book posted and see the odds it hits, with the game log and splits behind it.' },
  { to: '/reports',  title: 'Weekly Reports', quick: 'Weekly team reports',  icon: FileText,
    desc: 'One PDF per team per week: season to date with league context, splits and personnel.' },
  { to: '/articles', title: 'Articles',       quick: 'Read the analysis',    icon: BookOpen,
    desc: 'Short pieces anchored to a specific slicer view, each linking back into the deck.' },
  { to: '/matchup',  title: 'Matchup',        quick: 'Compare a matchup',    icon: Swords,
    desc: 'Three players, this week\'s game, and the defense each one faces, ranked against all 32.' },
]

export default function Home() {
  return (
    <>
      {/* ============================== HERO ============================== */}
      <section className="border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-10 lg:py-14 grid lg:grid-cols-12 gap-8 items-end">
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
            </div>
            {/* Quick links: the decks first, then one button per tool. */}
            <div className="mt-5 grid grid-cols-2 sm:flex sm:flex-wrap items-stretch gap-2 sm:gap-2.5">
              <Link to="/decks/single-player" className="justify-center sm:justify-start px-3.5 sm:px-4 py-2 bg-ink text-paper rounded-full text-[13px] sm:text-sm font-medium whitespace-nowrap hover:bg-accent transition-colors inline-flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" /> Open the decks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              {TOOLS.map(t => (
                <Link key={t.to} to={t.to} className="px-3.5 py-2 border border-line bg-paper rounded-full text-[13px] sm:text-sm font-medium hover:border-ink transition-colors inline-flex items-center gap-1.5 whitespace-nowrap">
                  <t.icon className="h-3.5 w-3.5 text-accent shrink-0" /> {t.quick}
                </Link>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5 lg:pl-6">
            <div className="space-y-3">
              <ThesisCard head={<>Outputs without context are <em>decoration.</em></>}
                sub="Cumulative totals flatten the variance that decides every Sunday." />
              <ThesisCard head={<>Context leads to <em>understanding.</em></>}
                sub="Down, distance, score, weather, formation — the variables that change what a number means." />
              <ThesisCard head={<>Understanding leads to <em>action.</em></>}
                sub="A filterable read on the only stat that matters: the next one." />
            </div>
          </div>
        </div>
      </section>

      {/* ============================== SITUATIONS STRIP ============================== */}
      {/* One slim row between the hero and the reports. Wraps on desktop,
       * swipes sideways on phones so it never costs more than one line. */}
      <section className="border-b border-line bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 py-3 lg:flex lg:items-start lg:gap-4">
          <p className="eyebrow mb-2 lg:mb-0 lg:pt-[7px] shrink-0">Try a situation</p>
          <SituationsRow />
        </div>
      </section>

      {/* ============================== DECKS ============================== */}
      <section className="bg-cream border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-6 lg:py-7">
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

      {/* ============================== TOOLS ============================== */}
      <section className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 py-8 lg:py-10">
          <div className="mb-3 flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl md:text-2xl tracking-tight">The tools.</h2>
            <p className="hidden sm:block text-[12.5px] text-muted">Same data, pointed at a specific job.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {TOOLS.map(t => (
              <Link key={t.to} to={t.to} className="qcard p-4 hover-grow block">
                <div className="flex items-center gap-2">
                  <t.icon className="h-4 w-4 text-accent shrink-0" />
                  <span className="font-display text-lg italic leading-tight">{t.title}</span>
                </div>
                <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">{t.desc}</p>
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
  // already applied — the fastest way to see what a filter does.
  return (
    <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-6 px-6 lg:mx-0 lg:px-0 lg:flex-wrap lg:overflow-visible">
      {SITUATIONS.slice(0, 12).map(s => (
        <Link key={s.id} to={`/decks/league-production?${encodeSlicers({ ...DEFAULTS, ...s.patch }).toString()}`} className="qb-sitchip shrink-0 whitespace-nowrap" title={s.sets}>{s.label}</Link>
      ))}
      <Link to="/decks/league-production" className="qb-sitchip ghost shrink-0 whitespace-nowrap">all situations →</Link>
    </div>
  )
}

function ThesisCard({ head, sub }: { head: React.ReactNode; sub: string }) {
  return (
    <div className="qcard p-3.5">
      <p className="font-display text-lg leading-snug">{head}</p>
      <p className="mt-1 text-[12.5px] text-muted">{sub}</p>
    </div>
  )
}
