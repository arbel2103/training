import { useState } from 'react'
import ChartTooltip from './SvgTooltip'
import { useTapAway } from './useTapAway'

interface Point {
  label: string
  value: number
}

/** A gently smoothed cubic path through the points (Catmull-Rom style). */
export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return ''
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
  let d = `M ${pts[0].x} ${pts[0].y}`
  const t = 0.16
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) * t
    const c1y = p1.y + (p2.y - p0.y) * t
    const c2x = p2.x - (p3.x - p1.x) * t
    const c2y = p2.y - (p3.y - p1.y) * t
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`
  }
  return d
}

/**
 * Minimal dependency-free SVG line chart, styled with the app's design tokens.
 * Scales to the container width via viewBox. `format` controls how y-values
 * are shown (e.g. m:ss for pace); defaults to a rounded number.
 */
export default function LineChart({
  data,
  format,
}: {
  data: Point[]
  format?: (v: number) => string
}) {
  const [active, setActive] = useState<number | null>(null)
  useTapAway(active !== null, () => setActive(null))

  if (data.length === 0) {
    return <p className="text-sm text-muted">אין עדיין מספיק נתונים לגרף.</p>
  }

  const fmt = format ?? ((n: number) => String(Math.round(n * 10) / 10))

  const W = 640
  const H = 190
  const padL = 46
  const padR = 16
  const padT = 18
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const values = data.map((d) => d.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  // inset the value range so points don't sit on the top/bottom gridlines
  const padV = (max - min) * 0.18
  min -= padV
  max += padV
  const span = max - min

  const x = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const y = (v: number) => padT + (1 - (v - min) / span) * plotH

  const pts = data.map((d, i) => ({ x: x(i), y: y(d.value) }))
  const line = smoothPath(pts)
  const baseY = padT + plotH
  const area =
    data.length === 1
      ? ''
      : `${line} L ${pts[pts.length - 1].x} ${baseY} L ${pts[0].x} ${baseY} Z`

  const labelStep = Math.max(1, Math.ceil(data.length / 6))
  const colW = data.length > 1 ? plotW / (data.length - 1) : plotW

  return (
    <div className="relative">
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="select-none overflow-visible"
      role="img"
    >
      <defs>
        <linearGradient id="lc-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity="0.22" />
          <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* horizontal guide lines + y labels (min / mid / max) */}
      {[max, (max + min) / 2, min].map((v, i) => {
        const yy = y(v)
        return (
          <g key={i}>
            <line
              x1={padL}
              x2={W - padR}
              y1={yy}
              y2={yy}
              stroke="rgb(var(--ink) / 0.06)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={yy + 4}
              textAnchor="end"
              fontSize="13"
              fill="rgb(var(--muted))"
            >
              {fmt(v)}
            </text>
          </g>
        )
      })}

      {/* area + line */}
      {area && <path d={area} fill="url(#lc-area)" />}
      <path
        d={line}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* x labels */}
      {data.map((d, i) =>
        i % labelStep === 0 || i === data.length - 1 ? (
          <text
            key={`xl-${i}`}
            x={x(i)}
            y={H - 10}
            textAnchor="middle"
            fontSize="12"
            fill="rgb(var(--muted))"
          >
            {d.label}
          </text>
        ) : null,
      )}

      {/* glowing endpoint (or the active point) */}
      {(() => {
        const idx = active ?? data.length - 1
        return (
          <g>
            <circle cx={x(idx)} cy={y(data[idx].value)} r={9} fill="rgb(var(--accent) / 0.18)" />
            <circle cx={x(idx)} cy={y(data[idx].value)} r={active === idx ? 5 : 4} fill="rgb(var(--accent))" />
          </g>
        )
      })()}

      {/* last value callout (hidden while a point is selected) */}
      {active === null && (
        <text
          x={x(data.length - 1)}
          y={y(data[data.length - 1].value) - 10}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="rgb(var(--ink))"
        >
          {fmt(data[data.length - 1].value)}
        </text>
      )}

      {/* transparent per-column tap targets */}
      {data.map((_, i) => (
        <rect
          key={`hit-${i}`}
          x={x(i) - colW / 2}
          y={padT}
          width={colW}
          height={plotH}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation()
            setActive((cur) => (cur === i ? null : i))
          }}
        />
      ))}

    </svg>
      {active !== null && (
        <ChartTooltip
          xPct={(x(active) / W) * 100}
          yPct={(y(data[active].value) / H) * 100}
          title={data[active].label}
          lines={[{ text: fmt(data[active].value) }]}
        />
      )}
    </div>
  )
}
