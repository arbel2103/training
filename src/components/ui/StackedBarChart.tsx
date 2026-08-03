import { useState } from 'react'
import ChartTooltip from './SvgTooltip'
import { useTapAway } from './useTapAway'

export interface StackSegment {
  value: number
  color: string // 'r g b'
}
export interface StackBar {
  label: string
  segments: StackSegment[]
}
export interface StackLegend {
  label: string
  color: string
}

/**
 * Vertically stacked bars — used for sleep stages. Bars share a common max
 * (their largest total) so both duration and composition read at a glance.
 */
export default function StackedBarChart({
  data,
  legend,
  format,
}: {
  data: StackBar[]
  legend?: StackLegend[]
  format?: (v: number) => string
}) {
  const [active, setActive] = useState<number | null>(null)
  useTapAway(active !== null, () => setActive(null))

  if (data.length === 0) {
    return <p className="text-sm text-muted">אין עדיין מספיק נתונים לגרף.</p>
  }
  const fmt = format ?? ((n: number) => String(Math.round(n)))

  const W = 640
  const H = 200
  const padL = 46
  const padR = 16
  const padT = 16
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const totals = data.map((b) => b.segments.reduce((s, x) => s + x.value, 0))
  const max = Math.max(...totals, 1)
  const step = plotW / data.length
  const barW = Math.min(step * 0.6, 44)
  const scale = (v: number) => (v / max) * plotH
  const labelStep = Math.max(1, Math.ceil(data.length / 8))

  return (
    <div>
      {legend && (
        <div className="flex flex-wrap gap-3 mb-1">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5 text-xs text-muted">
              <span
                className="inline-block w-3 h-3 rounded-sm"
                style={{ background: `rgb(${l.color})` }}
              />
              {l.label}
            </span>
          ))}
        </div>
      )}
      <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="select-none" role="img">
        {[max, max / 2, 0].map((v, i) => {
          const yy = padT + (1 - v / max) * plotH
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgb(var(--line))" strokeWidth={1} />
              <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="13" fill="rgb(var(--muted))">
                {fmt(v)}
              </text>
            </g>
          )
        })}
        {data.map((bar, i) => {
          const cx = padL + step * i + step / 2
          let cursor = padT + plotH
          return (
            <g key={i} style={{ cursor: 'pointer' }} onClick={(e) => {
            e.stopPropagation()
            setActive((c) => (c === i ? null : i))
          }}>
              <rect x={padL + step * i} y={padT} width={step} height={plotH} fill="transparent" />
              {bar.segments.map((seg, j) => {
                const h = scale(seg.value)
                cursor -= h
                return (
                  <rect
                    key={j}
                    x={cx - barW / 2}
                    y={cursor}
                    width={barW}
                    height={Math.max(0, h)}
                    fill={`rgb(${seg.color})`}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                )
              })}
              {(i % labelStep === 0 || i === data.length - 1) && (
                <text x={cx} y={H - 10} textAnchor="middle" fontSize="12" fill="rgb(var(--muted))">
                  {bar.label}
                </text>
              )}
            </g>
          )
        })}

      </svg>
        {active !== null && (
          <ChartTooltip
            xPct={((padL + step * active + step / 2) / W) * 100}
            yPct={
              ((padT + plotH - scale(data[active].segments.reduce((s, x) => s + x.value, 0))) / H) * 100
            }
            title={`${data[active].label} · ${fmt(data[active].segments.reduce((s, x) => s + x.value, 0))}`}
            lines={data[active].segments.map((seg, j) => ({
              text: `${legend?.[j]?.label ?? ''} ${fmt(seg.value)}`.trim(),
              color: seg.color,
            }))}
          />
        )}
      </div>
    </div>
  )
}
