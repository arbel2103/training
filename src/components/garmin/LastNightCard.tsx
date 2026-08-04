import { useStore } from '../../store/useStore'
import { hasGarminSetup } from '../../lib/garmin/pat'
import Icon from '../ui/Icon'
import Ring from '../ui/Ring'

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

/** A single animated ring metric: value inside, label + optional sub below. */
function RingStat({
  fraction,
  display,
  unit,
  color,
  label,
  sub,
  subClass,
}: {
  fraction: number
  display: string | number
  unit?: string
  color: string
  label: string
  sub?: string
  subClass?: string
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Ring value={fraction} max={1} color={color}>
        <div className="text-center leading-none">
          <span className="font-display text-2xl font-black">{display}</span>
          {unit && <span className="text-[11px] font-bold text-muted"> {unit}</span>}
        </div>
      </Ring>
      <div className="text-center">
        <div className="text-xs text-muted">{label}</div>
        {sub && (
          <div className={`text-xs mt-0.5 font-semibold ${subClass ?? 'text-muted'}`}>
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * "הלילה האחרון" — a compact recovery tile for the home dashboard: last
 * night's sleep, HRV vs the personal baseline, and resting HR, each shown as a
 * ring that fills on load. Rings are normalized so "fuller = better recovery":
 * sleep score /100, HRV /100ms (higher better), resting HR mapped 40–90bpm
 * inverted (lower better). Renders nothing until there's Garmin data to show.
 */
export default function LastNightCard() {
  const daily = useStore((s) => s.garminDaily)
  if (!hasGarminSetup()) return null

  const rev = [...daily].sort((a, b) => b.date.localeCompare(a.date))
  const sleep = rev.find((d) => d.sleepScore != null)
  const hrv = rev.find((d) => d.hrvLastNight != null)
  const rhr = rev.find((d) => d.restingHr != null)

  if (!sleep && !hrv && !rhr) return null

  const hrvVal = hrv?.hrvLastNight ?? null
  const hrvBase = hrv?.hrvWeeklyAvg ?? null
  const hrvAbove = hrvVal != null && hrvBase != null ? hrvVal >= hrvBase : null

  const rhrVal = rhr?.restingHr ?? null

  const dateForLabel = sleep?.date ?? hrv?.date ?? rhr?.date

  const hint =
    hrvAbove === true
      ? 'התאוששות טובה — הגוף מוכן לעומס'
      : hrvAbove === false
        ? 'HRV מתחת לבסיס — שקול יום קל יותר'
        : null

  // one cohesive cool family: each ring a neighbouring shade
  const C_SLEEP = 'rgb(var(--accent))'
  const C_HRV = 'rgb(var(--c-swim))'
  const C_RHR = 'rgb(var(--c-run))'

  return (
    <div className="card p-5 sm:col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <Icon name="moon" className="w-5 h-5 text-muted" /> הלילה האחרון
        </h3>
        {dateForLabel && (
          <span className="text-xs text-muted">{dayLabel(dateForLabel)}</span>
        )}
      </div>

      <div className="flex items-start justify-around gap-4 flex-wrap">
        {sleep?.sleepScore != null && (
          <RingStat
            fraction={sleep.sleepScore / 100}
            display={sleep.sleepScore}
            color={C_SLEEP}
            label="ציון שינה"
            sub={sleep.sleepMin ? `${hoursLabel(sleep.sleepMin)} שעות` : undefined}
          />
        )}
        {hrvVal != null && (
          <RingStat
            fraction={hrvVal / 100}
            display={Math.round(hrvVal)}
            unit="ms"
            color={C_HRV}
            label="HRV"
            sub={
              hrvAbove == null
                ? undefined
                : hrvAbove
                  ? '▲ מעל הבסיס'
                  : '▼ מתחת לבסיס'
            }
            subClass={hrvAbove ? 'text-swim' : 'text-muted'}
          />
        )}
        {rhrVal != null && (
          <RingStat
            fraction={(90 - rhrVal) / 50}
            display={rhrVal}
            color={C_RHR}
            label="דופק מנוחה"
          />
        )}
      </div>

      {hint && (
        <p
          className={`text-sm mt-4 rounded-xl px-3 py-2 ${
            hrvAbove ? 'bg-accent-soft/60 text-accent' : 'bg-ink/5 text-muted'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}
