import { useStore, type PlanSession } from '../../store/useStore'
import { toISODate, weekDays } from '../../lib/dates'
import { sportIcon, sportLabel } from '../../lib/labels'
import { computeReadiness } from '../../lib/readiness'

function sessionIcon(s: PlanSession): string {
  if (s.sport === 'strength') return '💪'
  if (s.sport === 'other') return '✨'
  return sportIcon[s.sport]
}
function sessionTitle(s: PlanSession): string {
  if (s.sport === 'strength') return s.label || 'אימון כוח'
  if (s.sport === 'other') return s.label || 'אימון'
  return `${sportLabel[s.sport]}${s.label ? ` · ${s.label}` : ''}`
}

/** Focus strip: recovery readiness + what's on for today. */
export default function TodayFocus() {
  const plan = useStore((s) => s.trainingPlan)
  const garminDaily = useStore((s) => s.garminDaily)

  const now = new Date()
  const weekStart = toISODate(weekDays(now)[0])
  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const todaySessions = planWeek
    ? planWeek.sessions.filter((s) => s.day === now.getDay())
    : []

  const readiness = computeReadiness(garminDaily)

  // without recovery data this card adds nothing over the day's workout card
  if (!readiness) return null

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-center gap-4">
        <div className="shrink-0 text-center">
          <div
            className="w-16 h-16 rounded-full grid place-items-center border-[3px]"
            style={{ borderColor: `rgb(${readiness.color})` }}
          >
            <span className="font-display text-xl font-black leading-none">
              {readiness.score}
            </span>
          </div>
          <div
            className="text-xs font-semibold mt-1.5"
            style={{ color: `rgb(${readiness.color})` }}
          >
            {readiness.label}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold mb-1">הפוקוס של היום</h3>

          {todaySessions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {todaySessions.map((s) => (
                <span key={s.id} className="chip text-sm">
                  <span>{sessionIcon(s)}</span>
                  {sessionTitle(s)}
                  {s.distance ? ` · ${s.distance}` : ''}
                </span>
              ))}
            </div>
          ) : planWeek ? (
            <p className="text-sm text-muted mb-1.5">יום מנוחה 😌</p>
          ) : null}

          {readiness.reasons.length > 0 && (
            <p className="text-xs text-muted">{readiness.reasons.join(' · ')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
