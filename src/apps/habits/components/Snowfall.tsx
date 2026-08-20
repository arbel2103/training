import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

const FLAKES = ['❄', '❅', '❆']

/** One flake's path, fixed at mount so re-renders don't restart the fall. */
interface Flake {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  drift: number
  opacity: number
  glyph: string
}

function makeFlakes(count: number): Flake[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 100,
    size: 8 + Math.random() * 18,
    duration: 3.5 + Math.random() * 3.5,
    // spread the start times across the first second so the screen fills from
    // the top rather than a single rank of flakes marching down together
    delay: Math.random() * 1.2,
    drift: 1.4 + Math.random() * 1.8,
    opacity: 0.45 + Math.random() * 0.5,
    glyph: FLAKES[id % FLAKES.length],
  }))
}

/**
 * A burst of snow across the whole screen, for freezing the habits.
 *
 * Purely decorative: it sits in a portal above everything with pointer events
 * off, so it can never swallow a tap, and it removes itself once the last
 * flake has landed rather than animating forever in the background.
 */
export default function Snowfall({
  count = 42,
  onDone,
}: {
  count?: number
  onDone?: () => void
}) {
  // asked not to animate: skip the whole thing rather than let the stylesheet
  // freeze the flakes, which would park them across the screen instead
  const [flakes] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? []
      : makeFlakes(count),
  )

  useEffect(() => {
    if (!flakes.length) {
      onDone?.()
      return
    }
    const longest = Math.max(...flakes.map((f) => f.duration + f.delay))
    const t = setTimeout(() => onDone?.(), longest * 1000)
    return () => clearTimeout(t)
  }, [flakes, onDone])

  if (!flakes.length) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] pointer-events-none overflow-hidden"
      aria-hidden
    >
      {flakes.map((f) => (
        <div
          key={f.id}
          className="snowflake"
          style={{
            left: `${f.left}%`,
            animationDuration: `${f.duration}s`,
            animationDelay: `${f.delay}s`,
          }}
        >
          <span
            style={{
              fontSize: `${f.size}px`,
              lineHeight: 1,
              color: 'rgb(var(--c-bike))',
              opacity: f.opacity,
              animationDuration: `${f.drift}s`,
            }}
          >
            {f.glyph}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  )
}
