import { useState, type MouseEvent } from 'react'
import { useTapAway } from '../../../components/ui/useTapAway'

/**
 * Recharts keeps a tapped tooltip open on touch devices. This mirrors the
 * tap-away behaviour of TriLife's charts: a tap inside the chart shows the
 * value; a tap anywhere else remounts the chart (via a changing key), which
 * clears the tooltip.
 */
export function useChartDismiss() {
  const [chartKey, setChartKey] = useState(0)
  const [armed, setArmed] = useState(false)
  useTapAway(armed, () => {
    setChartKey((n) => n + 1)
    setArmed(false)
  })
  const containerProps = {
    onClick: (e: MouseEvent) => {
      e.stopPropagation()
      setArmed(true)
    },
  }
  return { chartKey, containerProps }
}
