/**
 * useCollapsingHeader — hide the site header on scroll-down, bring it back on
 * scroll-up (phones and tablets only; desktop keeps its sticky header).
 *
 * Writes two things the CSS reads:
 *   html.qb-collapsed     — set while the header is hidden
 *   --qb-header-h         — the header's measured height, so the sticky
 *                           context bar can sit exactly beneath it (and at 0
 *                           when collapsed) in any orientation.
 */
import { useEffect } from 'react'

const BP = 1024
const THRESHOLD = 48   // px scrolled before we start hiding
const HYST = 6         // px of movement before we react (ignores jitter)

export function useCollapsingHeader() {
  useEffect(() => {
    const root = document.documentElement
    let last = window.scrollY
    let ticking = false

    const measure = () => {
      const h = document.querySelector<HTMLElement>('.site-header')
      root.style.setProperty('--qb-header-h', `${h ? h.offsetHeight : 0}px`)
    }
    const apply = () => {
      ticking = false
      const y = window.scrollY
      const mobile = window.innerWidth < BP
      if (!mobile || y <= THRESHOLD) {
        root.classList.remove('qb-collapsed')
      } else if (y > last + HYST) {
        root.classList.add('qb-collapsed')
      } else if (y < last - HYST) {
        root.classList.remove('qb-collapsed')
      }
      if (Math.abs(y - last) > HYST) last = y
    }
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(apply) } }
    const onResize = () => { measure(); apply() }

    measure(); apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    // Fonts/images loading can change header height after first paint.
    const t = window.setTimeout(measure, 600)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
      window.clearTimeout(t)
      root.classList.remove('qb-collapsed')
    }
  }, [])
}
