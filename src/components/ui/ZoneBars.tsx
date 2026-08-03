export interface Zone {
  label: string
  value: number // seconds (or any unit); bar width is relative to the total
  color: string // 'r g b'
}

function mmss(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} דק׳`
  const h = Math.floor(m / 60)
  return `${h}:${String(m % 60).padStart(2, '0')} שע׳`
}

/** Horizontal HR-zone distribution bars with percentage + time labels. */
export default function ZoneBars({
  zones,
  showTime = true,
}: {
  zones: Zone[]
  showTime?: boolean
}) {
  const total = zones.reduce((s, z) => s + z.value, 0)
  if (total === 0) {
    return <p className="text-sm text-muted">אין נתוני אזורי דופק.</p>
  }
  return (
    <div className="grid gap-2">
      {zones.map((z) => {
        const pct = (z.value / total) * 100
        return (
          <div key={z.label} className="flex items-center gap-2 text-sm">
            <span className="w-16 shrink-0 text-muted">{z.label}</span>
            <div className="flex-1 h-4 rounded-full bg-ink/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: `rgb(${z.color})` }}
              />
            </div>
            <span className="w-10 shrink-0 text-left tabular-nums font-semibold">
              {Math.round(pct)}%
            </span>
            {showTime && (
              <span className="w-20 shrink-0 text-left tabular-nums text-muted text-xs">
                {mmss(z.value)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
