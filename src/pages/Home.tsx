import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, BarChart3 } from 'lucide-react'

const DECKS = [
  { idx: '01', slug: 'single-player',      title: 'Single Player Productivity', desc: 'The microscope. Pick a player, re-frame every number.' },
  { idx: '02', slug: 'team-player',        title: 'Team Player Usage',          desc: 'Each team\'s touch, target, and snap distribution.' },
  { idx: '03', slug: 'league-production',  title: 'League Productivity',        desc: 'Cross-league leaderboards, sliced honestly.' },
  { idx: '04', slug: 'team-defense',       title: 'Team Defense (Against)',     desc: 'What each defense allows by personnel and situation.' },
  { idx: '05', slug: 'team-tendencies',    title: 'Team Situational Tendencies',desc: 'Pass / run rates, personnel, tempo, by every game state.' },
  { idx: '06', slug: 'league-defense',     title: 'League Defense Rankings',    desc: 'Predictive rankings, not cumulative scorebook fiction.' },
]

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-20 lg:py-28 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5">Football stats with the context that matters</p>
            <h1 className="font-display text-6xl lg:text-7xl xl:text-8xl leading-[0.95] tracking-tight text-ink">
              Numbers are <em className="text-accent">bar trivia</em>.<br />
              Context makes them <em className="text-accent2">actionable</em>.
            </h1>
            <p className="mt-8 text-lg text-muted max-w-2xl leading-relaxed">
              QueryBall is built around one belief: a stat without its game state, field position,
              score, down, distance, and personnel is decoration. Slice every number through the
              situation that produced it, and the answer in your hand becomes the one you can
              actually act on.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Link to="/decks/single-player" className="px-5 py-3 bg-ink text-paper rounded-full text-sm font-medium hover:bg-accent transition-colors inline-flex items-center gap-2">
                Open the decks <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link to="/articles" className="px-5 py-3 border border-line rounded-full text-sm font-medium hover:border-ink transition-colors">
                Read the analysis
              </Link>
            </div>
          </div>
          <div className="lg:col-span-5 lg:pl-8">
            <div className="space-y-5">
              <ThesisCard step="Step 1" head={<>Outputs without context are <em>bar trivia.</em></>}
                sub="Cumulative season totals flatten the variance that decides every Sunday." />
              <ThesisCard step="Step 2" head={<>Context leads to <em>understanding.</em></>}
                sub="Down, distance, score, weather, formation — the variables that change what a number means." />
              <ThesisCard step="Step 3" head={<>Understanding leads to <em>action.</em></>}
                sub="A filterable read on the only stat that matters: the next one." />
            </div>
          </div>
        </div>
      </section>

      {/* Deck cards */}
      <section className="bg-cream border-b border-line">
        <div className="max-w-[1400px] mx-auto px-6 py-16">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <p className="eyebrow mb-3">Six rollup decks</p>
              <h2 className="font-display text-4xl md:text-5xl tracking-tight">The reports.</h2>
            </div>
            <p className="max-w-md text-sm text-muted">
              Each deck contains five reports under shared slicers. Click a deck to load the slicer
              panel and the full visual stack.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {DECKS.map(d => (
              <Link key={d.slug} to={`/decks/${d.slug}`} className="qcard p-6 hover-grow group">
                <p className="eyebrow">{d.idx}</p>
                <h3 className="font-display text-2xl mt-2">{d.title}</h3>
                <p className="text-sm text-muted mt-2 leading-relaxed">{d.desc}</p>
                <span className="inline-block mt-4 text-xs text-accent group-hover:underline">
                  5 reports · 50+ slicers →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Articles + Projections teaser */}
      <section className="bg-paper">
        <div className="max-w-[1400px] mx-auto px-6 py-16 grid md:grid-cols-2 gap-6">
          <Link to="/articles" className="qcard p-8 hover-grow block">
            <BookOpen className="h-5 w-5 text-accent" />
            <div className="mt-3 font-display text-3xl italic">Articles</div>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Short pieces anchored to a specific slicer view. Each one ends with a link back into the deck.
            </p>
          </Link>
          <Link to="/projections" className="qcard p-8 hover-grow block">
            <BarChart3 className="h-5 w-5 text-accent" />
            <div className="mt-3 font-display text-3xl italic">Projections</div>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              Weekly model output, refreshed alongside the data. Sortable, filterable, downloadable.
            </p>
          </Link>
        </div>
      </section>
    </>
  )
}

function ThesisCard({ step, head, sub }: { step: string; head: React.ReactNode; sub: string }) {
  return (
    <div className="qcard p-5">
      <p className="eyebrow">{step}</p>
      <p className="mt-2 font-display text-2xl leading-snug">{head}</p>
      <p className="mt-2 text-sm text-muted">{sub}</p>
    </div>
  )
}
