import { useState } from 'react'
import { useStore, type PlanSession } from '../../store/useStore'
import {
  HEB_DAYS,
  daysInRange,
  formatDayMonth,
  fromISO,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { weekCompletion } from '../../lib/planMatch'
import { sportIcon, sportLabel } from '../../lib/labels'
import { formatDuration, sportUnit } from '../../lib/calc'
import { lastBackupAt } from '../../lib/driveSync'
import QuickCompleteModal from '../../components/QuickCompleteModal'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'לילה טוב'
  if (h < 12) return 'בוקר טוב'
  if (h < 17) return 'צהריים טובים'
  return 'ערב טוב'
}

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

export default function HomePage() {
  const plan = useStore((s) => s.trainingPlan)
  const log = useStore((s) => s.log)
  const weighIns = useStore((s) => s.weighIns)

  const [quick, setQuick] = useState<PlanSession | null>(null)

  const now = new Date()
  const todayISO = toISODate(now)
  const week = weekDays(now)
  const weekStart = toISODate(week[0])

  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const completion = planWeek ? weekCompletion(planWeek, log) : {}
  const todaySessions = planWeek
    ? planWeek.sessions.filter((s) => s.day === now.getDay())
    : []
  const doneCount = planWeek
    ? planWeek.sessions.filter((s) => completion[s.id]?.done).length
    : 0
  const totalCount = planWeek?.sessions.length ?? 0

  // race countdown
  const daysToRace =
    plan?.raceDate && plan.raceDate >= todayISO
      ? daysInRange(todayISO, plan.raceDate) - 1
      : null

  // weight trend: last two weigh-ins
  const sortedWeighIns = [...weighIns].sort((a, b) => a.date.localeCompare(b.date))
  const lastW = sortedWeighIns[sortedWeighIns.length - 1]
  const prevW = sortedWeighIns[sortedWeighIns.length - 2]
  const weightDiff = lastW && prevW ? lastW.weight - prevW.weight : null

  // backup nudge (only when there's data worth protecting)
  const hasData = log.length > 0 || totalCount > 0 || weighIns.length > 0
  const backup = lastBackupAt()
  const backupStale =
    hasData &&
    (!backup || Date.now() - new Date(backup).getTime() > 7 * 86_400_000)

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-3xl md:text-4xl font-black tracking-tight">
          {greeting()} 👋
        </h1>
        <p className="text-muted mt-1">
          יום {HEB_DAYS[now.getDay()]} · {formatDayMonth(now)}
        </p>
      </div>

      {backupStale && (
        <div
          className="card p-3.5 mb-5 text-sm flex items-center gap-2 bg-accent-soft/40"
          style={{ borderInlineStart: '4px solid rgb(var(--accent))' }}
        >
          ☁️{' '}
          {backup
            ? 'עבר שבוע מהגיבוי האחרון — כדאי לגבות לענן (כפתור ☁️ למעלה).'
            : 'עוד לא גיבית לענן — כדאי לגבות (כפתור ☁️ למעלה).'}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {/* race countdown */}
        {daysToRace !== null && (
          <div className="card p-5 sm:col-span-2 flex items-center justify-between">
            <div>
              <div className="text-sm text-muted">🏁 {plan?.raceName || 'תחרות'}</div>
              <div className="font-display text-2xl font-bold mt-0.5">
                {daysToRace === 0
                  ? 'היום זה היום! בהצלחה! 🎉'
                  : `עוד ${daysToRace} ימים`}
              </div>
            </div>
            {plan?.raceDate && (
              <div className="text-sm text-muted">
                {formatDayMonth(fromISO(plan.raceDate))}
              </div>
            )}
          </div>
        )}

        {/* today's workout */}
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold mb-3">האימון של היום</h3>
          {!plan || plan.weeks.length === 0 ? (
            <p className="text-sm text-muted">
              אין תוכנית עדיין — פתח את <b>המאמן</b> (🏋️) כדי לבנות אחת.
            </p>
          ) : todaySessions.length === 0 ? (
            <p className="text-sm text-muted">יום מנוחה 😌 תן לגוף להתאושש.</p>
          ) : (
            <div className="grid gap-2">
              {todaySessions.map((s) => {
                const done = completion[s.id]?.done
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      done ? 'border-bike/40 bg-bike/5' : 'border-line'
                    }`}
                  >
                    <span className="text-xl">{sessionIcon(s)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{sessionTitle(s)}</div>
                      <div className="text-sm text-muted">
                        {s.sport !== 'strength' && s.sport !== 'other' && s.distance
                          ? `${s.distance} ${sportUnit(s.sport)}`
                          : ''}
                        {s.durationMin ? ` · ${formatDuration(s.durationMin)}` : ''}
                      </div>
                    </div>
                    {done ? (
                      <span className="text-bike font-bold shrink-0">בוצע ✓</span>
                    ) : (
                      <button
                        onClick={() => setQuick(s)}
                        className="btn-accent shrink-0 text-sm px-3 py-1.5"
                      >
                        בצעתי ✓
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* week progress */}
        <div className="card p-5">
          <h3 className="font-display text-lg font-bold mb-3">השבוע שלי</h3>
          {totalCount === 0 ? (
            <p className="text-sm text-muted">אין אימונים מתוכננים לשבוע הזה.</p>
          ) : (
            <>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="font-display text-3xl font-black">
                  {doneCount}/{totalCount}
                </span>
                <span className="text-sm text-muted">אימונים בוצעו</span>
              </div>
              <div className="h-2.5 rounded-full bg-line overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all"
                  style={{
                    width: `${totalCount ? Math.round((doneCount / totalCount) * 100) : 0}%`,
                  }}
                />
              </div>
              {doneCount === totalCount && (
                <p className="text-sm text-bike font-semibold mt-2">
                  כל הכבוד — השבוע הושלם! 🎉
                </p>
              )}
            </>
          )}
        </div>

        {/* weight */}
        <div className="card p-5 sm:col-span-2">
          <h3 className="font-display text-lg font-bold mb-2">משקל</h3>
          {!lastW ? (
            <p className="text-sm text-muted">
              אין שקילות עדיין — אפשר להוסיף בעמוד <b>מעקב בריאות</b>.
            </p>
          ) : (
            <div className="flex items-baseline gap-3">
              <span className="font-display text-3xl font-black">
                {lastW.weight} <span className="text-base font-normal">ק״ג</span>
              </span>
              {weightDiff !== null && weightDiff !== 0 && (
                <span
                  className={`text-sm font-semibold ${
                    weightDiff < 0 ? 'text-bike' : 'text-run'
                  }`}
                >
                  {weightDiff < 0 ? '↓' : '↑'}{' '}
                  {Math.abs(Math.round(weightDiff * 10) / 10)} ק״ג מהשקילה הקודמת
                </span>
              )}
              <span className="text-sm text-muted mr-auto">
                {formatDayMonth(fromISO(lastW.date))}
              </span>
            </div>
          )}
        </div>
      </div>

      {quick && (
        <QuickCompleteModal
          session={quick}
          date={todayISO}
          onClose={() => setQuick(null)}
        />
      )}
    </div>
  )
}
