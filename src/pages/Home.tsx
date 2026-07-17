import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, BarChart3 } from 'lucide-react'

// Descriptors: drier / functional. One line each, no marketing garnish.
const DECKS = [
  { slug: 'single-player',     title: 'Single Player',          desc: 'One player, sliced by every situation. Position-aware.' },
  { slug: 'team-qb',           title: 'Team — Quarterback',     desc: 'The QB room: starter, backup, and any gadget snaps.' },
  { slug: 'team-rb',           title: 'Team — Running Backs',   desc: 'Backfield share, gap tendencies, third-down pass-catching.' },
  { slug: 'team-wr',           title: 'Team — Wide Receivers',  desc: 'Intra-room target and air-yards distribution by situation.' },
  { slug: 'team-te',           title: 'Team — Tight Ends',      desc: 'In-line vs flexed usage and route share within the room.' },
  { slug: 'league-production', title: 'League Production',      desc: 'Cross-league leaderboards, filtered by situation.' },
  { slug: 'team-defense',      title: 'Team Defense (Against)', desc: 'Production allowed by position, per defense.' },
  { slug: 'team-tendencies',   title: 'Team Situational Tendencies', desc: 'Pass/run rates, personnel, tempo, by game state.' },
  { slug: 'league-defense',    title: 'League Defense Rankings',desc: 'Cross-league defensive rankings.' },
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
            <div className="mt-6 flex flex-wrap items-center gap-2.5">
              <Link to="/decks/single-player" className="px-4 py-2 bg-ink text-paper rounded-full text-sm font-medium hover:bg-accent transition-colors inline-flex items-center gap-1.5">
                Open the decks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/articles" className="px-4 py-2 border border-line rounded-full text-sm font-medium hover:border-ink transition-colors">
                Read the analysis
              </Link>
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

      {/* ============================== DECKS ============================== */}
      <section className="bg-cream border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-10">
          <div className="mb-6">
            <h2 className="font-display text-2xl md:text-3xl tracking-tight">The reports.</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {DECKS.map(d => (
              <Link key={d.slug} to={`/decks/${d.slug}`}
                className="qcard px-4 py-3 hover-grow group flex flex-col gap-1">
                <h3 className="font-display text-lg leading-tight">{d.title}</h3>
                <p className="text-[12.5px] text-muted leading-snug">{d.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== ARTICLES / PROJECTIONS ============================== */}
      <section className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 py-10 grid md:grid-cols-2 gap-4">
          <Link to="/articles" className="qcard p-5 hover-grow block">
            <BookOpen className="h-4 w-4 text-accent" />
            <div className="mt-2 font-display text-xl italic">Articles</div>
            <p className="mt-1 text-[13px] text-muted leading-relaxed">
              Short pieces anchored to a specific slicer view. Each one ends with a link back into the deck.
            </p>
          </Link>
          <Link to="/projections" className="qcard p-5 hover-grow block">
            <BarChart3 className="h-4 w-4 text-accent" />
            <div className="mt-2 font-display text-xl italic">Projections</div>
            <p className="mt-1 text-[13px] text-muted leading-relaxed">
              Weekly model output, refreshed alongside the data. Sortable, filterable, downloadable.
            </p>
          </Link>
        </div>
      </section>
    </>
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
