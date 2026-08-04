import { useEffect, useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import {
  HEB_DAYS,
  HEB_DAYS_SHORT,
  addDays,
  formatDayMonth,
  startOfWeek,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { describeEntry } from '../../lib/describe'
import { weekCompletion } from '../../lib/planMatch'
import WorkoutFormModal from './WorkoutFormModal'
import QuickCompleteModal from '../../components/QuickCompleteModal'
import type { PlanSession } from '../../store/useStore'
import { sportIcon, sportLabel } from '../../lib/labels'
import { sportUnit } from '../../lib/calc'

export default function EntryTab() {
  const log = useStore((s) => s.log)
  const plan = useStore((s) => s.trainingPlan)
  const removeEntry = useStore((s) => s.removeEntry)

  const [weekRef, setWeekRef] = useState(() => new Date())
  const days = useMemo(() => weekDays(weekRef), [weekRef])
  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])
  const todayISO = toISODate(new Date())
  const isCurrentWeek = weekStart === toISODate(weekDays(new Date())[0])

  const [selectedDay, setSelectedDay] = useState(todayISO)
  const [formDate, setFormDate] = useState<string | null>(null)
  const [quick, setQuick] = useState<{ session: PlanSession; date: string } | null>(
    null,
  )

  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const completion = planWeek ? weekCompletion(planWeek, log) : {}
  const pendingForDay = (dayIdx: number): PlanSession[] =>
    planWeek
      ? planWeek.sessions.filter((s) => s.day === dayIdx && !completion[s.id]?.done)
      : []

  // keep the selected day inside the week that's currently displayed
  useEffect(() => {
    if (selectedDay < weekStart || selectedDay > weekEnd) {
      setSelectedDay(
        todayISO >= weekStart && todayISO <= weekEnd ? todayISO : weekStart,
      )
    }
  }, [weekStart, weekEnd, selectedDay, todayISO])

  const selDate = new Date(selectedDay + 'T00:00:00')
  const dayEntries = log.filter((e) => e.date === selectedDay)
  const dayPending = pendingForDay(selDate.getDay())

  return (
    <div>
      {/* week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekRef((d) => addDays(startOfWeek(d), -7))}
          className="btn-ghost text-sm py-1.5 px-3"
        >
          ← קודם
        </button>
        <button onClick={() => setWeekRef(new Date())} className="text-center">
          <div className="font-semibold hover:text-accent">
            {isCurrentWeek ? 'השבוע הנוכחי' : 'חזרה להשבוע'}
          </div>
          <div className="text-sm text-muted">
            {formatDayMonth(days[0])} – {formatDayMonth(days[6])}
          </div>
        </button>
        <button
          onClick={() => setWeekRef((d) => addDays(startOfWeek(d), 7))}
          className="btn-ghost text-sm py-1.5 px-3"
        >
          הבא →
        </button>
      </div>

      {/* day strip — pick a day, see just that day (no endless scrolling) */}
      <div className="flex gap-1.5 mb-4">
        {days.map((d, i) => {
          const iso = toISODate(d)
          const active = iso === selectedDay
          const doneCount = log.filter((e) => e.date === iso).length
          const pend = pendingForDay(d.getDay()).length
          return (
            <button
              key={iso}
              onClick={() => setSelectedDay(iso)}
              className={`flex-1 min-w-0 rounded-xl py-1.5 text-center transition border ${
                active
                  ? 'bg-ink text-bg border-ink'
                  : iso === todayISO
                    ? 'border-accent/40 text-ink'
                    : 'border-line text-muted'
              }`}
            >
              <div className="text-xs font-bold">{HEB_DAYS_SHORT[i]}</div>
              <div className="text-[11px] opacity-70">{d.getDate()}</div>
              {(doneCount > 0 || pend > 0) && (
                <div
                  className={`mx-auto mt-0.5 w-1.5 h-1.5 rounded-full ${
                    active ? 'bg-bg' : doneCount > 0 ? 'bg-bike' : 'bg-accent'
                  }`}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* selected day */}
      <div
        className={`card p-4 ${selectedDay === todayISO ? 'ring-2 ring-accent/30' : ''}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-bold">{HEB_DAYS[selDate.getDay()]}</div>
            <div className="text-sm text-muted">{formatDayMonth(selDate)}</div>
          </div>
          <button
            onClick={() => setFormDate(selectedDay)}
            className="btn-soft text-sm"
          >
            + הוסף אימון
          </button>
        </div>

        {dayEntries.length === 0 && dayPending.length === 0 ? (
          <p className="text-muted text-sm py-4 text-center">אין אימונים ביום זה.</p>
        ) : (
          <div className="grid gap-2">
            {dayEntries.map((e) => {
              const v = describeEntry(e)
              return (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: v.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{v.title}</div>
                    <div className="text-xs text-muted">{v.details.join(' · ')}</div>
                  </div>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="text-muted hover:text-run leading-none px-1"
                    aria-label="מחק"
                  >
                    ×
                  </button>
                </div>
              )
            })}
            {dayPending.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-accent/50 px-3 py-2.5"
              >
                <span className="text-lg shrink-0">
                  {s.sport === 'strength'
                    ? '💪'
                    : s.sport === 'other'
                      ? '✨'
                      : sportIcon[s.sport]}
                </span>
                <div className="flex-1 min-w-0 text-sm text-muted">
                  {s.sport === 'strength' || s.sport === 'other'
                    ? s.label || 'אימון'
                    : `${sportLabel[s.sport]}${s.distance ? ` ${s.distance} ${sportUnit(s.sport)}` : ''}`}
                  {' · מתוכנן'}
                </div>
                <button
                  onClick={() => setQuick({ session: s, date: selectedDay })}
                  className="text-sm font-semibold text-accent hover:underline shrink-0"
                >
                  בצעתי ✓
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <WorkoutFormModal
        open={formDate !== null}
        date={formDate ?? todayISO}
        onClose={() => setFormDate(null)}
      />

      {quick && (
        <QuickCompleteModal
          session={quick.session}
          date={quick.date}
          onClose={() => setQuick(null)}
        />
      )}
    </div>
  )
}
