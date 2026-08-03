import { useState } from 'react'
import ChartTooltip from './SvgTooltip'
import { useTapAway } from './useTapAway'

export interface Series {
  name: string
  color: string // a CSS var name like 'var(--c-run)' or raw 'r g b'
  values: (number | null)[]
  dashed?: boolean // render as a dashed reference line (e.g. a baseline)
}

/**
 * Dependency-free multi-series line chart (2–3 series) with a legend. All
 * series share the same x labels; null values break the line.
 */
export default function MultiLineChart({
  labels,
  series,
  format,
}: {
  labels: string[]
  series: Series[]
  format?: (v: number) => string
}) {
  const [active, setActive] = useState<number | null>(null)
  useTapAway(active !== null, () => setActive(null))
  const allValues = series.flatMap((s) => s.values.filter((v): v is number => v != null))
  if (allValues.length === 0) {
    return <p className="text-sm text-muted">אין עדיין מספיק נתונים לגרף.</p>
  }
  const fmt = format ?? ((n: number) => String(Math.round(n * 10) / 10))

  const W = 640
  const H = 200
  const padL = 46
  const padR = 16
  const padT = 16
  const padB = 28
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  let min = Math.min(...allValues)
  let max = Math.max(...allValues)
  if (min === max) {
    min -= 1
    max += 1
  }
  const padV = (max - min) * 0.15
  min -= padV
  max += padV
  const span = max - min
  const n = labels.length

  const x = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW)
  const y = (v: number) => padT + (1 - (v - min) / span) * plotH
  const labelStep = Math.max(1, Math.ceil(n / 6))
  const colW = n > 1 ? plotW / (n - 1) : plotW

  function pathFor(values: (number | null)[]): string {
    let d = ''
    let pen = false
    values.forEach((v, i) => {
      if (v == null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i)},${y(v)} `
      pen = true
    })
    return d.trim()
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-1">
        {series.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span
              className="inline-block w-3 h-1.5 rounded-full"
              style={{ background: `rgb(${s.color})` }}
            />
            {s.name}
          </span>
        ))}
      </div>
      <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" className="select-none" role="img">
        {[max, (max + min) / 2, min].map((v, i) => {
          const yy = y(v)
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={yy} y2={yy} stroke="rgb(var(--line))" strokeWidth={1} />
              <text x={padL - 8} y={yy + 4} textAnchor="end" fontSize="13" fill="rgb(var(--muted))">
                {fmt(v)}
              </text>
            </g>
          )
        })}
        {series.map((s) => (
          <path
            key={s.name}
            d={pathFor(s.values)}
            fill="none"
            stroke={`rgb(${s.color})`}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dashed ? '6 5' : undefined}
          />
        ))}
        {labels.map((label, i) =>
          i % labelStep === 0 || i === n - 1 ? (
            <text key={i} x={x(i)} y={H - 10} textAnchor="middle" fontSize="12" fill="rgb(var(--muted))">
              {label}
            </text>
          ) : null,
        )}

        {/* selected marker + dots */}
        {active !== null && (
          <>
            <line x1={x(active)} x2={x(active)} y1={padT} y2={padT + plotH} stroke="rgb(var(--muted))" strokeWidth={1} strokeDasharray="3 3" />
            {series.map((s) => {
              const v = s.values[active]
              return v == null ? null : (
                <circle key={s.name} cx={x(active)} cy={y(v)} r={4.5} fill={`rgb(${s.color})`} />
              )
            })}
          </>
        )}

        {/* transparent per-column tap targets */}
        {labels.map((_, i) => (
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
            setActive((c) => (c === i ? null : i))
          }}
          />
        ))}

      </svg>
        {active !== null && (
          <ChartTooltip
            xPct={(x(active) / W) * 100}
            yPct={
              (Math.min(
                ...series
                  .map((s) => s.values[active])
                  .filter((v): v is number => v != null)
                  .map((v) => y(v)),
              ) /
                H) *
              100
            }
            title={labels[active]}
            lines={series
              .filter((s) => s.values[active] != null)
              .map((s) => ({ text: `${s.name}: ${fmt(s.values[active] as number)}`, color: s.color }))}
          />
        )}
      </div>
    </div>
  )
}
