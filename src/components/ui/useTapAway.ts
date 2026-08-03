import { useEffect } from 'react'

/**
 * While `active`, a click anywhere on the page dismisses. Chart hit areas call
 * `stopPropagation`, so taps inside the chart select a point instead of just
 * closing the tooltip.
 */
export function useTapAway(active: boolean, onDismiss: () => void): void {
  useEffect(() => {
    if (!active) return
    const handler = () => onDismiss()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [active, onDismiss])
}
