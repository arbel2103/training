import { useEffect, useState, type ReactNode } from 'react'

/**
 * A circular progress ring that animates from empty to `value/max` on mount.
 * The center is free for a number/label via `children`. Honors reduced-motion.
 */
export default function Ring({
  value,
  max = 100,
  size = 82,
  stroke = 7,
  color = 'rgb(var(--accent))',
  duration = 1200,
  children,
}: {
  value: number
  max?: number
  size?: number
  stroke?: number
  color?: string
  duration?: number
  children?: ReactNode
}) {
  const target = Math.max(0, Math.min(1, max ? value / max : 0))
  const [frac, setFrac] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setFrac(target)
      return
    }
    // start from 0, then flip to target on the next frame so the stroke transitions
    const id = requestAnimationFrame(() => setFrac(target))
    return () => cancelAnimationFrame(id)
  }, [target])

  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgb(var(--ink) / 0.1)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - frac)}
          style={{
            transition: `stroke-dashoffset ${duration}ms cubic-bezier(0.2, 0.7, 0.2, 1)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}
