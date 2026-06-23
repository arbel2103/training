interface Point {
  label: string
  value: number
}

/**
 * Minimal dependency-free SVG line chart, styled with the app's design tokens.
 * Scales to the container width via viewBox.
 */
export default function LineChart({
  data,
  unit = '',
}: {
  data: Point[]
  unit?: string
}) {
  if (data.length === 0) {
    return <p className="text-sm text-muted">אין עדיין מספיק נתונים לגרף.</p>
  }

  const W = 640
  const H = 220
  const padL = 46
  const padR = 16
  const padT = 16
  const padB = 30
  const plotW = W - padL - padR
  const plotH = H - padT - padB

  const values = data.map((d) => d.value)
  let min = Math.min(...values)
  let max = Math.max(...values)
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min

  const x = (i: number) =>
    data.length === 1 ? padL + plotW / 2 : padL + (i / (data.length - 1)) * plotW
  const y = (v: number) => padT + (1 - (v - min) / span) * plotH

  const pts = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const areaPts = `${padL},${padT + plotH} ${pts} ${x(data.length - 1)},${padT + plotH}`

  const round = (n: number) => Math.round(n * 10) / 10
  const labelStep = Math.max(1, Math.ceil(data.length / 6))

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className="select-none"
      role="img"
    >
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
              stroke="rgb(var(--line))"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={yy + 4}
              textAnchor="end"
              fontSize="13"
              fill="rgb(var(--muted))"
            >
              {round(v)}
            </text>
          </g>
        )
      })}

      {/* area + line */}
      <polygon points={areaPts} fill="rgb(var(--accent) / 0.10)" />
      <polyline
        points={pts}
        fill="none"
        stroke="rgb(var(--accent))"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* points + x labels */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(d.value)} r={3.5} fill="rgb(var(--accent))" />
          {(i % labelStep === 0 || i === data.length - 1) && (
            <text
              x={x(i)}
              y={H - 10}
              textAnchor="middle"
              fontSize="12"
              fill="rgb(var(--muted))"
            >
              {d.label}
            </text>
          )}
        </g>
      ))}

      {/* last value callout */}
      <text
        x={x(data.length - 1)}
        y={y(data[data.length - 1].value) - 10}
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        fill="rgb(var(--ink))"
      >
        {round(data[data.length - 1].value)}
        {unit}
      </text>
    </svg>
  )
}
