import { useState } from 'react'
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

// full class strings (not built dynamically) so Tailwind keeps them
const sportTint: Record<PlanSport, string> = {
  run: 'bg-run/10 text-run',
  bike: 'bg-bike/10 text-bike',
  swim: 'bg-swim/10 text-swim',
  strength: 'bg-strength/10 text-strength',
  other: 'bg-other/10 text-other',
}

// rightmost first (RTL): run, bike, swim, strength, other
const SPORT_ORDER: PlanSport[] = ['run', 'bike', 'swim', 'strength', 'other']

function unitFor(sport: PlanSport): string {
  return sport === 'run' || sport === 'bike' || sport === 'swim'
    ? sportUnit(sport)
    : ''
}

function WeekCard({
  week,
  isCurrent,
  isPast,
}: {
  week: PlanWeek
  isCurrent: boolean
  isPast: boolean
}) {
  const log = useStore((s) => s.log)
  const completion = weekCompletion(week, log)
  const start = fromISO(week.weekStart)
  // past weeks fold to a one-line summary; click the header to expand
  const [collapsed, setCollapsed] = useState(isPast)

  const doneCount = week.sessions.filter((s) => completion[s.id]?.done).length

  // one column per sport that actually has sessions this week
  const columns = SPORT_ORDER.map((sport) => ({
    sport,
    sessions: week.sessions
      .filter((s) => s.sport === sport)
      .sort((a, b) => a.day - b.day),
  })).filter((c) => c.sessions.length > 0)

  return (
    <div className={`card p-4 ${isCurrent ? 'ring-2 ring-accent/40' : ''}`}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-baseline justify-between gap-2 text-right"
        title={collapsed ? 'הרחב שבוע' : 'קפל שבוע'}
      >
        <h3 className="font-display text-lg font-bold flex items-center gap-2">
          <span className="text-muted text-sm">{collapsed ? '◂' : '▾'}</span>
          {week.label || 'שבוע'}
          {isCurrent && (
            <span className="text-accent text-sm font-semibold">· השבוע</span>
          )}
        </h3>
        <span className="flex items-center gap-2 shrink-0">
          {week.sessions.length > 0 && (
            <span
              className={`text-sm font-semibold ${
                doneCount === week.sessions.length ? 'text-bike' : 'text-muted'
              }`}
            >
              {doneCount}/{week.sessions.length} ✓
            </span>
          )}
          <span className="text-sm text-muted">
            {formatDayMonth(start)} – {formatDayMonth(addDays(start, 6))}
          </span>
        </span>
      </button>

      {collapsed ? null : (
        <div className="mt-3">
      {week.focus && <p className="text-sm text-muted mb-3">{week.focus}</p>}

      {columns.length === 0 ? (
        <p className="text-sm text-muted">מנוחה / אין אימונים מתוכננים.</p>
      ) : (
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          }}
        >
          {columns.map(({ sport, sessions }) => {
            const meta = planSportMeta[sport]
            const unit = unitFor(sport)
            return (
              <div
                key={sport}
                className="rounded-xl border border-line overflow-hidden flex flex-col"
              >
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 ${sportTint[sport]}`}
                >
                  <span className="text-base leading-none">{meta.icon}</span>
                  <span className="font-bold text-sm">{meta.label}</span>
                  <span className="text-xs font-semibold opacity-70 mr-auto">
                    {sessions.length}
                  </span>
                </div>
                <div className="p-1.5 grid gap-1.5">
                  {sessions.map((s) => {
                    const m = completion[s.id]
                    return (
                      <div
                        key={s.id}
                        className={`rounded-lg border px-2 py-1.5 ${
                          m?.done ? 'border-bike/40 bg-bike/5' : 'border-line'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-muted">
                            {HEB_DAYS_SHORT[s.day]}
                          </span>
                          {m?.done && (
                            <span className="w-4 h-4 rounded-full bg-bike text-white grid place-items-center text-[10px] leading-none">
                              ✓
                            </span>
                          )}
                        </div>
                        <div className="text-sm font-semibold leading-tight mt-0.5">
                          {s.distance ? `${s.distance} ${unit}` : meta.label}
                        </div>
                        {(s.label || s.durationMin) && (
                          <div className="text-xs text-muted leading-tight">
                            {[s.label, s.durationMin ? formatDuration(s.durationMin) : '']
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        )}
                        {m?.done && m.entry?.distance != null && (
                          <div className="text-xs text-bike font-semibold leading-tight mt-0.5">
                            בוצע {m.entry.distance} {unit}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
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
          <WeekCard
            key={w.id}
            week={w}
            isCurrent={w.weekStart === currentWeekStart}
            isPast={w.weekStart < currentWeekStart}
          />
        ))}
      </div>
    </div>
  )
}
