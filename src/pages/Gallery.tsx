/**
 * Gallery — saved Studio queries.
 *
 * Two sources: the curated list in src/content/gallery.json (edit that file
 * to publish a query for everyone) and "Mine", saved in this browser from the
 * Studio's Save button. Every card carries the full query in its URL, so
 * "Run" opens it exactly as built and "Fork" is simply running it and
 * changing something.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Play, Trash2, Search } from 'lucide-react'
import clsx from 'clsx'
import seed from '@/content/gallery.json'
import { loadSaved, deleteSaved, studioFromParams, DIM_BY_KEY, METRIC_BY_KEY, type SavedQuery } from '@/lib/studio'

type Seed = { id: string; title: string; description: string; author: string; tags: string[]; params: string }

function describe(params: string): string {
  const st = studioFromParams(new URLSearchParams(params))
  const rows = st.rows.map(k => DIM_BY_KEY[k]?.label).filter(Boolean).join(', ') || 'total'
  const mets = st.metrics.map(k => METRIC_BY_KEY[k]?.label).filter(Boolean).join(', ')
  return `Rows: ${rows} · Metrics: ${mets}${st.perGame ? ' · per game' : ''}`
}

export default function Gallery() {
  const [tab, setTab] = useState<'curated' | 'mine'>('curated')
  const [mine, setMine] = useState<SavedQuery[]>([])
  const [q, setQ] = useState('')
  useEffect(() => { setMine(loadSaved()); document.title = 'Query Gallery — QueryBall' }, [])

  const curated = useMemo(() => (seed as Seed[]).filter(s => !q || `${s.title} ${s.description} ${s.tags.join(' ')}`.toLowerCase().includes(q.toLowerCase())), [q])
  const saved = useMemo(() => mine.filter(s => !q || s.title.toLowerCase().includes(q.toLowerCase())), [mine, q])

  return (
    <div className="bg-paper">
      <header className="border-b border-line bg-cream">
        <div className="max-w-[1100px] mx-auto px-4 lg:px-6 py-8 lg:py-14">
          <p className="eyebrow mb-2">Query gallery</p>
          <h1 className="font-display text-3xl lg:text-5xl tracking-tight">Queries worth running again.</h1>
          <p className="mt-3 max-w-2xl text-[13px] lg:text-base text-muted leading-relaxed">
            Built in the <Link to="/studio" className="text-accent underline underline-offset-2">Studio</Link>. Run one as-is, or run it and change a row, a metric or a filter — that's a fork.
          </p>
        </div>
      </header>
      <div className="max-w-[1100px] mx-auto px-4 lg:px-6 py-6 lg:py-10">
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="flex items-center gap-4 text-[13px] font-semibold">
            <button type="button" onClick={() => setTab('curated')} className={clsx('pb-1 border-b-2', tab === 'curated' ? 'text-accent2 border-accent2' : 'text-muted2 border-transparent')}>Curated</button>
            <button type="button" onClick={() => setTab('mine')} className={clsx('pb-1 border-b-2', tab === 'mine' ? 'text-accent2 border-accent2' : 'text-muted2 border-transparent')}>Mine <span className="text-muted font-normal">({mine.length})</span></button>
          </div>
          <label className="ml-auto flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] w-full sm:w-64">
            <Search className="h-3.5 w-3.5 text-muted" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder='"red zone", "3rd down", a position…' className="flex-1 min-w-0 bg-transparent outline-none" />
          </label>
        </div>

        {tab === 'curated' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {curated.map(s => (
              <div key={s.id} className="qcard p-4 flex flex-col gap-2">
                <div className="flex flex-wrap gap-1">{s.tags.map(t => <span key={t} className="chip text-[10px] py-0.5">{t}</span>)}</div>
                <h2 className="font-display text-xl leading-tight">{s.title}</h2>
                <p className="text-[12.5px] text-muted leading-relaxed">{s.description}</p>
                <p className="text-[11px] text-muted">{describe(s.params)}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <Link to={`/studio?${s.params}`} className="qb-cta inline-flex items-center gap-1.5 !py-1.5 !px-3.5"><Play className="h-3 w-3" /> Run</Link>
                  <span className="text-[11px] text-muted">{s.author}</span>
                </div>
              </div>
            ))}
            {!curated.length && <p className="text-sm text-muted py-10 text-center sm:col-span-2">Nothing matches.</p>}
          </div>
        )}

        {tab === 'mine' && (
          <div className="grid sm:grid-cols-2 gap-3">
            {saved.map(s => (
              <div key={s.id} className="qcard p-4 flex flex-col gap-2">
                <h2 className="font-display text-xl leading-tight">{s.title}</h2>
                <p className="text-[11px] text-muted">{describe(s.params)}</p>
                <p className="text-[11px] text-muted2 num">Saved {new Date(s.savedAt).toLocaleDateString()}</p>
                <div className="mt-auto flex items-center justify-between pt-1">
                  <Link to={`/studio?${s.params}`} className="qb-cta inline-flex items-center gap-1.5 !py-1.5 !px-3.5"><Play className="h-3 w-3" /> Run</Link>
                  <button type="button" onClick={() => setMine(deleteSaved(s.id))} className="text-[11px] text-muted inline-flex items-center gap-1 hover:text-bad"><Trash2 className="h-3 w-3" /> Delete</button>
                </div>
              </div>
            ))}
            {!saved.length && (
              <div className="sm:col-span-2 qcard p-8 text-center">
                <p className="font-display text-xl">Nothing saved yet</p>
                <p className="text-sm text-muted mt-1">Build a query in the Studio and tap <b>Save</b>. Saved queries live in this browser.</p>
                <Link to="/studio" className="qb-cta inline-flex mt-4">Open the Studio</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
