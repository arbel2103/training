import { useStore, type Sport } from '../store/useStore'
import { weekDays, toISODate } from '../lib/dates'
import { weekCompletion } from '../lib/planMatch'
import Ring from './ui/Ring'
import ProgressBar from './ui/ProgressBar'
import Icon, { type IconName } from './ui/Icon'
import { sportColorVar, sportColorClass } from '../lib/labels'
import { sportUnit } from '../lib/calc'

interface RingData {
  key: string
  iconName: IconName
  colorVar: string // ring stroke color
  colorClass: string // icon text color
  done: number
  target: number
  unit: string
}

/**
 * "השבוע שלי" progress. One ring per aerobic sport (swim/bike/run) that fills by
 * total distance logged vs the week's planned distance — the icon says which
 * sport, so no text label. Below, a single counter + bar shows how many of the
 * week's workouts were completed (all sports, including strength and extras).
 */
export default function WeekProgressRings() {
  const plan = useStore((s) => s.trainingPlan)
  const log = useStore((s) => s.log)

  const week = weekDays(new Date())
  const weekStart = toISODate(week[0])
  const weekEnd = toISODate(week[6])
  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const weekLog = log.filter((e) => e.date >= weekStart && e.date <= weekEnd)

  const round1 = (n: number) => Math.round(n * 10) / 10
  const rings: RingData[] = []
  for (const sport of ['swim', 'bike', 'run'] as Sport[]) {
    const target = planWeek
      ? planWeek.sessions
          .filter((s) => s.sport === sport)
          .reduce((sum, s) => sum + (s.distance ?? 0), 0)
      : 0
    const done = weekLog
      .filter((e) => e.category === 'aerobic' && e.sport === sport)
      .reduce((sum, e) => sum + (e.distance ?? 0), 0)
    if (target <= 0 && done <= 0) continue
    rings.push({
      key: sport,
      iconName: sport,
      colorVar: sportColorVar[sport],
      colorClass: sportColorClass[sport],
      done: round1(done),
      target: round1(target),
      unit: sportUnit(sport),
    })
  }

  // workouts completed this week (every sport, incl. strength + unplanned) vs plan
  const totalCount = planWeek?.sessions.length ?? 0
  const completion = planWeek ? weekCompletion(planWeek, log) : {}
  const doneCount = planWeek
    ? planWeek.sessions.filter((s) => completion[s.id]?.done).length
    : 0
  const consumed = new Set(
    Object.values(completion)
      .map((m) => m.entry?.id)
      .filter((v): v is string => !!v),
  )
  const extra = weekLog.filter((e) => !consumed.has(e.id)).length
  const totalDone = doneCount + extra

  if (rings.length === 0 && totalCount === 0) {
    return <p className="text-sm text-muted">אין אימונים מתוכננים לשבוע הזה.</p>
  }

  return (
    <div>
      {rings.length > 0 && (
        <div className="flex items-start justify-around gap-3 flex-wrap mb-4">
          {rings.map((r) => {
            const frac = r.target > 0 ? r.done / r.target : r.done > 0 ? 1 : 0
            return (
              <div key={r.key} className="flex flex-col items-center gap-1.5">
                <Ring value={frac} max={1} size={76} color={r.colorVar}>
                  <Icon name={r.iconName} className={`w-6 h-6 ${r.colorClass}`} />
                </Ring>
                <div className="text-sm font-bold">
                  {r.done}
                  <span className="text-muted font-normal">
                    /{r.target} {r.unit}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalCount > 0 && (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="font-display text-2xl font-black">
              {totalDone}/{totalCount}
            </span>
            <span className="text-sm text-muted">אימונים בוצעו</span>
            {extra > 0 && (
              <span className="text-sm text-bike font-semibold">
                (+{extra} מעבר לתוכנית)
              </span>
            )}
          </div>
          <ProgressBar
            pct={
              totalCount
                ? Math.min(100, Math.round((totalDone / totalCount) * 100))
                : 0
            }
          />
          {doneCount === totalCount && (
            <p className="text-sm text-bike font-semibold mt-2">
              כל הכבוד — השבוע הושלם!
            </p>
          )}
        </>
      )}
    </div>
  )
}
