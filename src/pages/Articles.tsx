import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { articles } from '@/lib/articles'
import clsx from 'clsx'

export default function Articles() {
  const [tag, setTag] = useState<string | null>(null)
  const tags = useMemo(() => Array.from(new Set(articles.map(a => a.tag))), [])
  const visible = tag ? articles.filter(a => a.tag === tag) : articles

  return (
    <div className="bg-paper">
      <header className="border-b border-line bg-cream">
        <div className="max-w-[1100px] mx-auto px-6 py-16">
          <p className="eyebrow mb-3">QueryBall · Writing</p>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight">
            The <em className="text-accent">articles</em>.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted leading-relaxed">
            Short pieces anchored to a specific slicer view. Each one starts from a question the decks
            couldn't answer in a glance.
          </p>
        </div>
      </header>

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        {tags.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            <button onClick={() => setTag(null)}
              className={clsx('chip', tag == null && 'applied')}>
              All
            </button>
            {tags.map(t => (
              <button key={t} onClick={() => setTag(t === tag ? null : t)}
                className={clsx('chip', t === tag && 'applied')}>
                {t}
              </button>
            ))}
          </div>
        )}

        <ul className="divide-y divide-line">
          {visible.map(a => (
            <li key={a.slug}>
              <Link to={`/articles/${a.slug}`} className="block py-6 group">
                <div className="flex items-baseline gap-3 mb-1">
                  <span className="chip applied text-[10px]">{a.tag}</span>
                  <span className="text-xs text-muted num">{a.date}</span>
                </div>
                <h2 className="font-display text-3xl text-ink group-hover:text-accent transition-colors">
                  {a.title}
                </h2>
                <p className="mt-2 text-sm text-muted max-w-2xl leading-relaxed">{a.excerpt}</p>
                <p className="mt-3 text-xs text-muted">By {a.author}</p>
              </Link>
            </li>
          ))}
        </ul>

        {visible.length === 0 && (
          <p className="text-sm text-muted py-12 text-center">No articles in this category yet.</p>
        )}
      </div>
    </div>
  )
}
