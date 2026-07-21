/**
 * Post-workout perceived-exertion (RPE) picker, 1–10. Optional: `undefined`
 * means "not rated". The coach reads RPE to gauge fatigue and adjust load.
 */
const LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

function descriptor(rpe: number): string {
  if (rpe <= 2) return 'קל מאוד'
  if (rpe <= 4) return 'קל'
  if (rpe <= 6) return 'בינוני'
  if (rpe <= 8) return 'קשה'
  return 'מקסימלי'
}

// green → amber → red across the scale
function color(rpe: number): string {
  const hue = Math.round(140 - ((rpe - 1) / 9) * 140) // 140=green … 0=red
  return `hsl(${hue} 70% 45%)`
}

export default function RpeSelector({
  value,
  onChange,
}: {
  value?: number
  onChange: (rpe: number | undefined) => void
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {LEVELS.map((n) => {
          const active = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(active ? undefined : n)}
              className={`w-8 h-8 rounded-lg text-sm font-bold border transition ${
                active
                  ? 'text-white border-transparent'
                  : 'bg-surface text-muted border-line hover:text-ink'
              }`}
              style={active ? { background: color(n) } : undefined}
            >
              {n}
            </button>
          )
        })}
      </div>
      <div className="text-sm text-muted mt-1.5 h-5">
        {value ? (
          <>
            <b style={{ color: color(value) }}>{value}</b> · {descriptor(value)}
          </>
        ) : (
          'לא דורג (אופציונלי)'
        )}
      </div>
    </div>
  )
}
