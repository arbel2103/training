import { useId, useState } from 'react'
import ChartTooltip from './SvgTooltip'
import { useTapAway } from './useTapAway'

interface Bar {
  label: string
  value: number
}

/**
 * Dependency-free SVG bar chart from a zero baseline, styled with the app's
 * tokens. Matches LineChart's viewBox conventions.
 */
export default function BarChart({
  data,
  format,
  color = 'var(--accent)',
}: {
  data: Bar[]
  format?: (v: number) => string
  color?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  useTapAway(active !== null, () => setActive(null))
  const gid = useId()

  if (data.length === 0) {
    return <p className="text-sm text-muted">אין עדיין מספיק נתונים לגרף.</p>
  }
  const fmt = format ?? ((n: number) => String(Math.round(n)))

  const W = 640
  const H = 190
  const padL = 46
  const padR = 16
  const padT = 18
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const max = Math.max(...data.map((d) => d.value), 1)
  const step = plotW / data.length
  const barW = Math.min(step * 0.62, 48)
  const y = (v: number) => padT + (1 - v / max) * plotH
  const labelStep = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div className="relative">
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="select-none" role="img">
      <defs>
        <linearGradient id={`bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`rgb(${color})`} stopOpacity="1" />
          <stop offset="100%" stopColor={`rgb(${color})`} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[max, max / 2, 0].map((v, i) => {
        const yy = y(v)
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgb(var(--ink) / 0.06)" strokeWidth={1} />
            <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="13" fill="rgb(var(--muted))">
              {fmt(v)}
            </text>
          </g>
        )
      })}
      {data.map((d, i) => {
        const cx = padL + step * i + step / 2
        const yy = y(d.value)
        const on = active === i
        return (
          <g key={i} style={{ cursor: 'pointer' }} onClick={(e) => {
            e.stopPropagation()
            setActive((c) => (c === i ? null : i))
          }}>
            {/* full-column transparent hit target */}
            <rect x={padL + step * i} y={padT} width={step} height={plotH} fill="transparent" />
            {/* faint track behind each bar */}
            <rect
              x={cx - barW / 2}
              y={padT}
              width={barW}
              height={plotH}
              rx={5}
              fill="rgb(var(--ink) / 0.045)"
            />
            <rect
              x={cx - barW / 2}
              y={yy}
              width={barW}
              height={padT + plotH - yy}
              rx={5}
              fill={`url(#bar-${gid})`}
              opacity={active !== null && !on ? 0.5 : 1}
            />
            {(i % labelStep === 0 || i === data.length - 1) && (
              <text x={cx} y={H - 10} textAnchor="middle" fontSize="12" fill="rgb(var(--muted))">
                {d.label}
              </text>
            )}
          </g>
        )
      })}

    </svg>
      {active !== null && (
        <ChartTooltip
          xPct={((padL + step * active + step / 2) / W) * 100}
          yPct={(y(data[active].value) / H) * 100}
          title={data[active].label}
          lines={[{ text: fmt(data[active].value) }]}
        />
      )}
    </div>
  )
}
