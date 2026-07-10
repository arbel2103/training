import { useStore, type PlanSport, type PlanWeek } from '../../store/useStore'
import { sportIcon, sportLabel } from '../../lib/labels'
import { formatDuration, sportUnit } from '../../lib/calc'
import {
  HEB_DAYS_SHORT,
  addDays,
  formatDayMonth,
  fromISO,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { weekCompletion } from '../../lib/planMatch'

const planSportMeta: Record<PlanSport, { icon: string; label: string }> = {
  run: { icon: sportIcon.run, label: sportLabel.run },
  bike: { icon: sportIcon.bike, label: sportLabel.bike },
  swim: { icon: sportIcon.swim, label: sportLabel.swim },
  strength: { icon: '💪', label: 'כוח' },
  other: { icon: '✨', label: 'אחר' },
}

function WeekCard({ week, isCurrent }: { week: PlanWeek; isCurrent: boolean }) {
  const log = useStore((s) => s.log)
  const completion = weekCompletion(week, log)
  const start = fromISO(week.weekStart)
  const sessions = [...week.sessions].sort((a, b) => a.day - b.day)

  return (
    <div className={`card p-4 ${isCurrent ? 'ring-2 ring-accent/40' : ''}`}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="font-display text-lg font-bold">
          {week.label || 'שבוע'}
          {isCurrent && (
            <span className="text-accent text-sm font-semibold mr-2">· השבוע</span>
          )}
        </h3>
        <span className="text-sm text-muted">
          {formatDayMonth(start)} – {formatDayMonth(addDays(start, 6))}
        </span>
      </div>
      {week.focus && <p className="text-sm text-muted mb-3">{week.focus}</p>}

      {sessions.length === 0 ? (
        <p className="text-sm text-muted">מנוחה / אין אימונים מתוכננים.</p>
      ) : (
        <div className="grid gap-2">
          {sessions.map((s) => {
            const m = completion[s.id]
            const meta = planSportMeta[s.sport]
            const unit = s.sport === 'run' || s.sport === 'bike' || s.sport === 'swim'
              ? sportUnit(s.sport)
              : ''
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  m?.done ? 'border-bike/40 bg-bike/5' : 'border-line'
                }`}
              >
                <span
                  className={`w-6 h-6 shrink-0 rounded-full grid place-items-center text-sm ${
                    m?.done ? 'bg-bike text-white' : 'border border-line text-muted'
                  }`}
                >
                  {m?.done ? '✓' : ''}
                </span>
                <span className="w-8 text-sm font-semibold text-muted shrink-0">
                  {HEB_DAYS_SHORT[s.day]}
                </span>
                <span className="text-lg shrink-0">{meta.icon}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold">{meta.label}</span>
                  {s.label && <span className="text-sm text-muted"> · {s.label}</span>}
                  <span className="text-sm text-muted">
                    {s.distance ? ` · ${s.distance} ${unit}` : ''}
                    {s.durationMin ? ` · ${formatDuration(s.durationMin)}` : ''}
                  </span>
                </div>
                {m?.done && m.entry?.distance != null && (
                  <span className="text-sm text-bike font-semibold shrink-0">
                    בוצע {m.entry.distance} {unit}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function AerobicProgram() {
  const plan = useStore((s) => s.trainingPlan)
  const currentWeekStart = toISODate(weekDays(new Date())[0])

  if (!plan || plan.weeks.length === 0) {
    return (
      <div className="card p-10 text-center">
        <div className="text-4xl mb-3">🏊🚴🏃</div>
        <h3 className="font-display text-xl font-bold mb-2">אין עדיין תוכנית</h3>
        <p className="text-muted text-sm max-w-md mx-auto">
          פתח את <b>המאמן</b> (הכפתור 🏋️ בפינה) ובקש לבנות תוכנית לקראת התחרות.
          התוכנית תופיע כאן מחולקת לשבועות, וכל אימון שתזין ב"מעקב אימונים" יסומן
          כאן ✓ אוטומטית.
        </p>
      </div>
    )
  }

  const weeks = [...plan.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart))

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="font-display text-2xl font-bold">
          התוכנית שלי
          {plan.raceName && (
            <span className="text-muted text-base font-normal"> · {plan.raceName}</span>
          )}
        </h2>
        {plan.raceDate && (
          <span className="text-sm text-muted">תחרות: {plan.raceDate}</span>
        )}
      </div>
      <div className="grid gap-3">
        {weeks.map((w) => (
          <WeekCard key={w.id} week={w} isCurrent={w.weekStart === currentWeekStart} />
        ))}
      </div>
    </div>
  )
}
