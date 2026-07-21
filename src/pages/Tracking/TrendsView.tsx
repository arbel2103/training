import { useMemo, useState } from 'react'
import { useStore, type Sport, type WorkoutEntry } from '../../store/useStore'
import { formatPace, sportUnit } from '../../lib/calc'
import { SPORTS, sportColorVar, sportIcon, sportLabel } from '../../lib/labels'
import { formatDayMonth, fromISO, startOfWeek, toISODate } from '../../lib/dates'
import Segmented from '../../components/ui/Segmented'
import LineChart from '../../components/ui/LineChart'

const round1 = (n: number) => Math.round(n * 10) / 10

/** A single highlighted record. */
function Pr({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-sm text-muted mb-1">{label}</div>
      <div className="font-display text-2xl font-black">{value}</div>
      {sub && <div className="text-xs text-muted mt-0.5">{sub}</div>}
    </div>
  )
}

function sportEntries(log: WorkoutEntry[], sport: Sport): WorkoutEntry[] {
  return log
    .filter((e) => e.category === 'aerobic' && e.sport === sport)
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Weekly distance buckets → chart points. */
function weeklyVolume(entries: WorkoutEntry[]): { label: string; value: number }[] {
  const byWeek = new Map<string, number>()
  for (const e of entries) {
    const wk = toISODate(startOfWeek(fromISO(e.date)))
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + (e.distance ?? 0))
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([wk, v]) => ({ label: formatDayMonth(fromISO(wk)), value: round1(v) }))
}

export default function TrendsView() {
  const log = useStore((s) => s.log)
  const [sport, setSport] = useState<Sport>('run')

  const entries = useMemo(() => sportEntries(log, sport), [log, sport])
  const unit = sportUnit(sport)

  const volume = useMemo(() => weeklyVolume(entries), [entries])

  // per-session speed/pace trend (last 12)
  const paceTrend = useMemo(() => {
    const withMetric = entries.filter((e) =>
      sport === 'bike' ? e.speedKmh != null : e.paceSec != null,
    )
    return withMetric.slice(-12).map((e) => ({
      label: formatDayMonth(fromISO(e.date)),
      value: sport === 'bike' ? (e.speedKmh as number) : (e.paceSec as number),
    }))
  }, [entries, sport])

  // personal records for the selected sport
  const prs = useMemo(() => {
    const dist = entries.filter((e) => (e.distance ?? 0) > 0)
    const longest = dist.reduce<WorkoutEntry | null>(
      (best, e) => (!best || (e.distance ?? 0) > (best.distance ?? 0) ? e : best),
      null,
    )
    let best: WorkoutEntry | null = null
    if (sport === 'bike') {
      best = entries
        .filter((e) => e.speedKmh != null)
        .reduce<WorkoutEntry | null>(
          (b, e) => (!b || (e.speedKmh as number) > (b.speedKmh as number) ? e : b),
          null,
        )
    } else {
      best = entries
        .filter((e) => e.paceSec != null)
        .reduce<WorkoutEntry | null>(
          (b, e) => (!b || (e.paceSec as number) < (b.paceSec as number) ? e : b),
          null,
        )
    }
    const totalDist = dist.reduce((s, e) => s + (e.distance ?? 0), 0)
    return { longest, best, totalDist, count: entries.length }
  }, [entries, sport])

  const paceUnit = sport === 'swim' ? 'ל-100מ׳' : 'לק״מ'

  return (
    <div>
      <div className="card p-4 mb-6">
        <Segmented
          value={sport}
          onChange={setSport}
          options={SPORTS.map((s) => ({
            value: s,
            label: `${sportIcon[s]} ${sportLabel[s]}`,
          }))}
        />
      </div>

      {prs.count === 0 ? (
        <div className="card p-8 text-center text-muted">
          עדיין אין אימוני {sportLabel[sport]} להצגת שיאים ומגמות. הזן אימונים
          ותראה כאן את ההתקדמות שלך.
        </div>
      ) : (
        <>
          {/* personal records */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <Pr
              label={sport === 'bike' ? 'המהירות הכי גבוהה' : 'הקצב הכי מהיר'}
              value={
                prs.best
                  ? sport === 'bike'
                    ? `${round1(prs.best.speedKmh as number)} קמ״ש`
                    : `${formatPace(prs.best.paceSec)} `
                  : '—'
              }
              sub={
                prs.best
                  ? `${sport === 'bike' ? '' : paceUnit + ' · '}${formatDayMonth(fromISO(prs.best.date))}`
                  : undefined
              }
            />
            <Pr
              label="המרחק הכי ארוך"
              value={prs.longest ? `${round1(prs.longest.distance as number)} ${unit}` : '—'}
              sub={prs.longest ? formatDayMonth(fromISO(prs.longest.date)) : undefined}
            />
            <Pr label='סה"כ מרחק' value={`${round1(prs.totalDist)} ${unit}`} />
            <Pr label='סה"כ אימונים' value={String(prs.count)} />
          </div>

          {/* weekly volume */}
          <div className="card p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📊</span>
              <h3 className="font-display text-lg font-bold" style={{ color: sportColorVar[sport] }}>
                נפח שבועי ({unit})
              </h3>
            </div>
            <LineChart data={volume} />
          </div>

          {/* pace / speed trend */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⏱️</span>
              <h3 className="font-display text-lg font-bold" style={{ color: sportColorVar[sport] }}>
                {sport === 'bike' ? 'מהירות (קמ״ש)' : `קצב (${paceUnit})`} לאורך זמן
              </h3>
            </div>
            <p className="text-xs text-muted mb-3">
              {sport === 'bike'
                ? 'גבוה יותר = מהיר יותר 📈'
                : 'נמוך יותר = מהיר יותר 📉'}
            </p>
            <LineChart
              data={paceTrend}
              format={sport === 'bike' ? undefined : (v) => formatPace(v)}
            />
          </div>
        </>
      )}
    </div>
  )
}
