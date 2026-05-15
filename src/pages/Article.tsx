import { useParams, Link } from 'react-router-dom'
import { getArticle, renderMarkdown } from '@/lib/articles'

export default function Article() {
  const { slug } = useParams<{ slug: string }>()
  const article = slug ? getArticle(slug) : undefined

  if (!article) {
    return (
      <div className="max-w-[800px] mx-auto px-6 py-24 text-center">
        <h1 className="font-display text-4xl">Article not found</h1>
        <p className="mt-4 text-muted">That slug doesn't match any published piece.</p>
        <Link to="/articles" className="mt-6 inline-block chip applied">Back to articles</Link>
      </div>
    )
  }

  return (
    <article className="bg-paper">
      <header className="border-b border-line bg-cream">
        <div className="max-w-[800px] mx-auto px-6 py-14">
          <div className="flex items-center gap-3 mb-3">
            <span className="chip applied text-[10px]">{article.tag}</span>
            <span className="text-xs text-muted num">{article.date}</span>
          </div>
          <h1 className="font-display text-5xl md:text-6xl tracking-tight leading-[1.05]">
            {article.title}
          </h1>
          <p className="mt-5 text-base text-muted leading-relaxed">{article.excerpt}</p>
          <p className="mt-6 text-xs text-muted">By {article.author}</p>
        </div>
      </header>
      <div className="max-w-[720px] mx-auto px-6 py-12">
        <div className="prose-article" dangerouslySetInnerHTML={{ __html: renderMarkdown(article.body) }} />
        <div className="mt-12 pt-8 border-t border-line">
          <Link to="/articles" className="text-sm text-accent hover:underline">← All articles</Link>
        </div>
      </div>
    </article>
  )
}
