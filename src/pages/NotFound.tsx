import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-[800px] mx-auto px-6 py-32 text-center">
      <p className="eyebrow mb-4">404</p>
      <h1 className="font-display text-6xl">Page not found.</h1>
      <p className="mt-4 text-muted max-w-md mx-auto">
        That URL doesn't match anything on QueryBall. The slicers and decks are over here:
      </p>
      <Link to="/" className="mt-8 inline-flex items-center px-5 py-3 bg-ink text-paper rounded-full text-sm font-medium hover:bg-accent transition-colors">
        Back to home →
      </Link>
    </div>
  )
}
