import { useEffect, useRef, useState } from 'react'
import { useStore, type PlanSession } from '../../store/useStore'
import { toISODate, weekDays } from '../../lib/dates'
import { sportIcon, sportLabel } from '../../lib/labels'
import { computeReadiness } from '../../lib/readiness'
import { hasApiKey } from '../../lib/apiKey'
import { generateMorningBrief } from '../../lib/coachActions'

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

export default function TodayFocus() {
  const plan = useStore((s) => s.trainingPlan)
  const garminDaily = useStore((s) => s.garminDaily)
  const brief = useStore((s) => s.morningBrief)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const tried = useRef(false)

  const now = new Date()
  const todayISO = toISODate(now)
  const weekStart = toISODate(weekDays(now)[0])
  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const todaySessions = planWeek
    ? planWeek.sessions.filter((s) => s.day === now.getDay())
    : []

  const readiness = computeReadiness(garminDaily)
  const briefForToday = brief && brief.date === todayISO ? brief : null

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      await generateMorningBrief()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // auto-generate the brief once per day when the coach is connected
  useEffect(() => {
    if (tried.current) return
    tried.current = true
    if (hasApiKey() && !briefForToday) void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // nothing worth showing yet
  if (!readiness && todaySessions.length === 0 && !briefForToday && !hasApiKey()) {
    return null
  }

  return (
    <div className="card p-5 mb-5">
      <div className="flex items-start gap-4">
        {readiness && (
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
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-display text-lg font-bold mb-1">הפוקוס של היום</h3>

          {todaySessions.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {todaySessions.map((s) => (
                <span key={s.id} className="chip text-sm">
                  <span>{sessionIcon(s)}</span>
                  {sessionTitle(s)}
                  {s.distance ? ` · ${s.distance}` : ''}
                </span>
              ))}
            </div>
          ) : planWeek ? (
            <p className="text-sm text-muted mb-2">יום מנוחה 😌</p>
          ) : null}

          {readiness && readiness.reasons.length > 0 && (
            <p className="text-xs text-muted mb-2">{readiness.reasons.join(' · ')}</p>
          )}

          {/* morning brief */}
          {loading ? (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="ml-1">המאמן כותב תדריך…</span>
            </div>
          ) : briefForToday ? (
            <div className="text-sm leading-relaxed rounded-xl bg-accent-soft/50 px-3 py-2">
              <span className="font-semibold">☀️ תדריך בוקר · </span>
              {briefForToday.text}
              <button
                onClick={() => void generate()}
                className="text-accent text-xs font-semibold hover:underline mr-2"
              >
                רענן
              </button>
            </div>
          ) : hasApiKey() ? (
            <button onClick={() => void generate()} className="btn-soft text-sm">
              ☀️ צור תדריך בוקר
            </button>
          ) : (
            <p className="text-xs text-muted">
              חבר את המאמן (🏋️) לקבלת תדריך בוקר יומי מותאם.
            </p>
          )}
          {error && <p className="text-run text-xs mt-1">{error}</p>}
        </div>
      </div>
    </div>
  )
}
