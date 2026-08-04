import { useEffect, useState } from 'react'

/** A horizontal progress bar that fills from 0 to `pct`% on mount. */
export default function ProgressBar({
  pct,
  color = 'rgb(var(--accent))',
  duration = 1100,
}: {
  pct: number
  color?: string
  duration?: number
}) {
  const [w, setW] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setW(pct)
      return
    }
    const id = requestAnimationFrame(() => setW(pct))
    return () => cancelAnimationFrame(id)
  }, [pct])

  return (
    <div className="h-2.5 rounded-full bg-line overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{
          width: `${w}%`,
          background: color,
          transition: `width ${duration}ms cubic-bezier(0.2, 0.7, 0.2, 1)`,
        }}
      />
    </div>
  )
}
