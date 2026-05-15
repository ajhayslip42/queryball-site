/**
 * Article loader. Articles are Markdown files in src/content/articles/.
 * Vite's import.meta.glob bundles them at build time so adding a new article
 * is just dropping a new .md file in that directory.
 */

export type Article = {
  slug: string
  title: string
  date: string
  excerpt: string
  author: string
  tag: string
  body: string
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!m) return { meta: {}, body: raw }
  const meta: Record<string, string> = {}
  for (const line of m[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    meta[key] = val
  }
  return { meta, body: m[2] }
}

const modules = import.meta.glob('../content/articles/*.md', {
  eager: true, query: '?raw', import: 'default',
}) as Record<string, string>

export const articles: Article[] = Object.entries(modules)
  .map(([path, raw]) => {
    const slug = path.split('/').pop()!.replace(/\.md$/, '')
    const { meta, body } = parseFrontmatter(raw)
    return {
      slug,
      title: meta.title || slug,
      date: meta.date || '',
      excerpt: meta.excerpt || '',
      author: meta.author || 'Andrew Hayslip',
      tag: meta.tag || 'Analysis',
      body,
    }
  })
  .sort((a, b) => (a.date > b.date ? -1 : 1))

export function getArticle(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug)
}

/**
 * Minimal Markdown-to-HTML renderer (intentionally limited).
 * Supports: h2, h3, p, ul/ol, strong/em/code, blockquote, links.
 */
export function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inUl = false, inOl = false, inBq = false, inP = false

  const closeAll = () => {
    if (inUl) { out.push('</ul>'); inUl = false }
    if (inOl) { out.push('</ol>'); inOl = false }
    if (inBq) { out.push('</blockquote>'); inBq = false }
    if (inP)  { out.push('</p>'); inP = false }
  }

  const inline = (s: string) => s
    .replace(/`([^`]+)`/g, '<code class="bg-chalk px-1 rounded text-[0.95em]">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  for (const ln of lines) {
    if (ln.startsWith('## ')) {
      closeAll()
      out.push(`<h2>${inline(ln.slice(3))}</h2>`)
    } else if (ln.startsWith('### ')) {
      closeAll()
      out.push(`<h3>${inline(ln.slice(4))}</h3>`)
    } else if (ln.startsWith('> ')) {
      if (!inBq) { closeAll(); out.push('<blockquote>'); inBq = true }
      out.push(`<p>${inline(ln.slice(2))}</p>`)
    } else if (/^- /.test(ln)) {
      if (!inUl) { closeAll(); out.push('<ul>'); inUl = true }
      out.push(`<li>${inline(ln.slice(2))}</li>`)
    } else if (/^\d+\. /.test(ln)) {
      if (!inOl) { closeAll(); out.push('<ol>'); inOl = true }
      out.push(`<li>${inline(ln.replace(/^\d+\.\s*/, ''))}</li>`)
    } else if (ln.trim() === '') {
      closeAll()
    } else {
      if (!inP) { closeAll(); out.push('<p>'); inP = true }
      out.push(inline(ln) + ' ')
    }
  }
  closeAll()
  return out.join('\n')
}
