import { useStore, type Sport } from '../store/useStore'
import { weekDays, toISODate } from '../lib/dates'
import Ring from './ui/Ring'
import Icon, { type IconName } from './ui/Icon'
import { sportLabel, sportColorVar, sportColorClass } from '../lib/labels'
import { sportUnit } from '../lib/calc'

interface RingData {
  key: string
  iconName: IconName
  colorVar: string // ring stroke color
  colorClass: string // icon text color
  label: string
  done: number
  target: number
  unit?: string // undefined for strength (measured by count)
}

/**
 * "השבוע שלי" progress — one ring per sport. Swim/bike/run fill by total
 * distance vs the week's planned distance; strength fills by workout count vs
 * the week's planned strength sessions. A sport shows only when it's planned
 * this week or something was logged for it.
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
      label: sportLabel[sport],
      done: round1(done),
      target: round1(target),
      unit: sportUnit(sport),
    })
  }

  // strength — measured by workout count, not distance
  const strengthTarget = planWeek
    ? planWeek.sessions.filter((s) => s.sport === 'strength').length
    : 0
  const strengthDone = weekLog.filter((e) => e.category === 'strength').length
  if (strengthTarget > 0 || strengthDone > 0) {
    rings.push({
      key: 'strength',
      iconName: 'strength',
      colorVar: 'rgb(var(--c-strength))',
      colorClass: sportColorClass.strength,
      label: 'כוח',
      done: strengthDone,
      target: strengthTarget,
    })
  }

  if (rings.length === 0) {
    return <p className="text-sm text-muted">אין אימונים מתוכננים לשבוע הזה.</p>
  }

  const allDone = rings.every((r) => r.target > 0 && r.done >= r.target)

  return (
    <div>
      <div className="flex items-start justify-around gap-3 flex-wrap">
        {rings.map((r) => {
          const frac = r.target > 0 ? r.done / r.target : r.done > 0 ? 1 : 0
          return (
            <div key={r.key} className="flex flex-col items-center gap-1.5">
              <Ring value={frac} max={1} size={74} color={r.colorVar}>
                <Icon name={r.iconName} className={`w-6 h-6 ${r.colorClass}`} />
              </Ring>
              <div className="text-center leading-tight">
                <div className="text-sm font-bold">
                  {r.done}
                  <span className="text-muted font-normal">
                    /{r.target}
                    {r.unit ? ` ${r.unit}` : ''}
                  </span>
                </div>
                <div className="text-xs text-muted">{r.label}</div>
              </div>
            </div>
          )
        })}
      </div>
      {allDone && (
        <p className="text-sm text-bike font-semibold mt-3 text-center">
          כל הכבוד — השבוע הושלם!
        </p>
      )}
    </div>
  )
}
