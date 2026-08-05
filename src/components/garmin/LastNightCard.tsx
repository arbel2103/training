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

interface TrendChip {
  label: string // e.g. "▲ 3 מהממוצע"
  good: boolean
}

/**
 * Compare last night's value to its recent average and describe the direction.
 * `higherBetter` flips which way counts as good (sleep/HRV up = good, RHR down =
 * good). Needs a little history so a single night doesn't invent a trend.
 */
function trendChip(
  latest: number | null,
  prior: number[],
  higherBetter: boolean,
): TrendChip | undefined {
  if (latest == null || prior.length < 2) return undefined
  const avg = prior.reduce((s, n) => s + n, 0) / prior.length
  const delta = Math.round(latest - avg)
  if (delta === 0) return { label: '≈ כמו הממוצע', good: true }
  const up = delta > 0
  return {
    label: `${up ? '▲' : '▼'} ${Math.abs(delta)} מהממוצע`,
    good: higherBetter ? up : !up,
  }
}

/** A single animated ring metric: value inside, label + optional sub/trend below. */
function RingStat({
  fraction,
  display,
  unit,
  color,
  label,
  sub,
  subClass,
  trend,
}: {
  fraction: number
  display: string | number
  unit?: string
  color: string
  label: string
  sub?: string
  subClass?: string
  trend?: TrendChip
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
        {trend && (
          <div
            className={`text-[11px] mt-0.5 font-semibold ${
              trend.good ? 'text-swim' : 'text-muted'
            }`}
          >
            {trend.label}
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
  const hrvLow = hrv?.hrvBaselineLow ?? null
  const hrvHigh = hrv?.hrvBaselineHigh ?? null
  const hrvBase = hrv?.hrvWeeklyAvg ?? null

  // show the personal baseline range (so you can see where tonight falls in it),
  // falling back to the weekly average when the range isn't available yet
  // U+2066…U+2069 isolate the range so it always reads low–high left-to-right,
  // even inside the RTL layout
  const hrvRangeSub =
    hrvLow != null && hrvHigh != null
      ? `בסיס ⁦${Math.round(hrvLow)}–${Math.round(hrvHigh)}⁩`
      : hrvBase != null
        ? `בסיס ~${Math.round(hrvBase)}`
        : undefined

  const rhrVal = rhr?.restingHr ?? null

  // 30-day average resting HR as a comparison baseline for last night's value
  const rhrRecent = rev
    .slice(0, 30)
    .map((d) => d.restingHr)
    .filter((v): v is number => v != null)
  const rhrAvg = rhrRecent.length
    ? Math.round(rhrRecent.reduce((s, n) => s + n, 0) / rhrRecent.length)
    : null
  const rhrAvgSub = rhrAvg != null ? `ממוצע ${rhrAvg}` : undefined

  // short-term trend vs the recent average (last night vs the prior nights)
  const sleepSeries = rev
    .map((d) => d.sleepScore)
    .filter((v): v is number => v != null)
  const rhrSeries = rev
    .map((d) => d.restingHr)
    .filter((v): v is number => v != null)
  const sleepTrend = trendChip(
    sleep?.sleepScore ?? null,
    sleepSeries.slice(1, 8),
    true,
  )
  const rhrTrend = trendChip(rhrVal, rhrSeries.slice(1, 31), false)

  const dateForLabel = sleep?.date ?? hrv?.date ?? rhr?.date

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
            trend={sleepTrend}
          />
        )}
        {hrvVal != null && (
          <RingStat
            fraction={hrvVal / 100}
            display={Math.round(hrvVal)}
            unit="ms"
            color={C_HRV}
            label="HRV"
            sub={hrvRangeSub}
          />
        )}
        {rhrVal != null && (
          <RingStat
            fraction={(90 - rhrVal) / 50}
            display={rhrVal}
            color={C_RHR}
            label="דופק מנוחה"
            sub={rhrAvgSub}
            trend={rhrTrend}
          />
        )}
      </div>
    </div>
  )
}
