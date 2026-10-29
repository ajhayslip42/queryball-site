/**
 * ContextStamp + ShareButton — screenshots that explain themselves.
 *
 * The stamp prints the active slice and the site name at the bottom of the
 * report canvas, so a screenshot carries its context. The share button
 * renders the canvas to a PNG (stamp included) and hands it to the phone's
 * share sheet, or downloads it where the share sheet isn't available.
 */
import { useState, type RefObject } from 'react'
import { Share2, Loader2, Check } from 'lucide-react'
import clsx from 'clsx'
import { useSlicers } from '@/lib/slicers'
import { sliceLabel } from '@/lib/slicerSql'

export function ContextStamp({ title }: { title?: string }) {
  const { slicers } = useSlicers()
  return (
    <div className="qb-stamp">
      <span className="truncate">{title ? `${title} · ` : ''}{sliceLabel(slicers)}</span>
      <span className="font-mono">queryball.com</span>
    </div>
  )
}

export function ShareButton({ target, title, className }: { target: RefObject<HTMLElement | null>; title: string; className?: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const share = async () => {
    const el = target.current
    if (!el || state === 'busy') return
    setState('busy')
    try {
      const { toBlob } = await import('html-to-image')
      const blob = await toBlob(el, {
        backgroundColor: '#FFFFFF', pixelRatio: 2, cacheBust: true,
        // Cross-origin images (headshots, logos) can't always be inlined; skip rather than fail.
        filter: (n: HTMLElement) => !(n.tagName === 'IMG' && /^https?:/.test((n as HTMLImageElement).src || '') && !(n as HTMLImageElement).src.startsWith(location.origin)),
      })
      if (!blob) throw new Error('render failed')
      const file = new File([blob], `queryball-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`, { type: 'image/png' })
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
      if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
        await nav.share({ files: [file], title: `QueryBall — ${title}`, text: 'Stats in context, from queryball.com' })
      } else {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url; a.download = file.name; a.click()
        setTimeout(() => URL.revokeObjectURL(url), 2000)
      }
      setState('done'); setTimeout(() => setState('idle'), 1500)
    } catch (e) {
      console.warn('share failed', e)
      setState('idle')
    }
  }
  return (
    <button type="button" onClick={share} className={clsx('qb-sharebtn', className)} aria-label="Share this report as an image">
      {state === 'busy' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : state === 'done' ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      <span>Share</span>
    </button>
  )
}
