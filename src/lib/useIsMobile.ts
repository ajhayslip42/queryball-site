import { useEffect, useState } from 'react'

/**
 * True when viewport width < 768px. Reacts to resize.
 * Used to switch the SlicerPanel between a side-rail and a bottom-sheet layout,
 * and to prune the primary-visible filter list on mobile.
 */
export function useIsMobile(bp = 768): boolean {
  const get = () => (typeof window !== 'undefined' ? window.innerWidth < bp : false)
  const [m, setM] = useState<boolean>(get)
  useEffect(() => {
    const on = () => setM(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [bp])
  return m
}
