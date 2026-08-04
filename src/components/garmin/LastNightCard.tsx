import { useStore } from '../../store/useStore'
import { hasGarminSetup } from '../../lib/garmin/pat'

function hoursLabel(min?: number): string {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function dayLabel(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
  })
}

function Metric({
  value,
  unit,
  label,
  sub,
  subClass,
}: {
  value: string | number
  unit?: string
  label: string
  sub?: string
  subClass?: string
}) {
  return (
    <div>
      <div className="font-display text-3xl font-black leading-none">
        {value}
        {unit && <span className="text-base font-bold text-muted"> {unit}</span>}
      </div>
      <div className="text-xs text-muted mt-1">{label}</div>
      {sub && <div className={`text-xs mt-0.5 font-semibold ${subClass ?? 'text-muted'}`}>{sub}</div>}
    </div>
  )
}

/**
 * "הלילה האחרון" — a compact recovery tile for the home dashboard:
 * last night's sleep, HRV vs the personal baseline, and resting HR.
 * Renders nothing until Garmin is set up and there's data to show.
 */
export default function LastNightCard() {
  const daily = useStore((s) => s.garminDaily)
  if (!hasGarminSetup()) return null

  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  const rev = [...sorted].reverse()
  const sleep = rev.find((d) => d.sleepScore != null || d.sleepMin != null)
  const hrv = rev.find((d) => d.hrvLastNight != null)
  const rhr = rev.find((d) => d.restingHr != null)

  if (!sleep && !hrv && !rhr) return null

  // HRV vs the weekly baseline drives a light recovery read
  const hrvVal = hrv?.hrvLastNight ?? null
  const hrvBase = hrv?.hrvWeeklyAvg ?? null
  const hrvAbove = hrvVal != null && hrvBase != null ? hrvVal >= hrvBase : null

  const dateForLabel = sleep?.date ?? hrv?.date ?? rhr?.date

  const hint =
    hrvAbove === true
      ? 'התאוששות טובה — הגוף מוכן לעומס 💪'
      : hrvAbove === false
        ? 'HRV מתחת לבסיס — שקול יום קל יותר'
        : null

  return (
    <div className="card p-5 sm:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          🌙 הלילה האחרון
        </h3>
        {dateForLabel && (
          <span className="text-xs text-muted">{dayLabel(dateForLabel)}</span>
        )}
      </div>

      <div className="flex items-start gap-8 flex-wrap">
        {sleep && (
          <Metric
            value={sleep.sleepScore ?? '—'}
            label="ציון שינה"
            sub={sleep.sleepMin ? `${hoursLabel(sleep.sleepMin)} שעות` : undefined}
          />
        )}
        {hrvVal != null && (
          <Metric
            value={Math.round(hrvVal)}
            unit="ms"
            label="HRV"
            sub={
              hrvAbove == null
                ? undefined
                : hrvAbove
                  ? '▲ מעל הבסיס'
                  : '▼ מתחת לבסיס'
            }
            subClass={hrvAbove ? 'text-bike' : 'text-run'}
          />
        )}
        {rhr?.restingHr != null && (
          <Metric value={rhr.restingHr} label="דופק מנוחה" />
        )}
      </div>

      {hint && (
        <p
          className={`text-sm mt-4 rounded-xl px-3 py-2 ${
            hrvAbove ? 'bg-bike/10 text-bike' : 'bg-run/10 text-run'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
