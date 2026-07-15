import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import {
  HEB_DAYS,
  addDays,
  formatDayMonth,
  startOfWeek,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { describeEntry } from '../../lib/describe'
import { compareToTargets } from '../../lib/analysis'
import { targetsForWeek, weekCompletion } from '../../lib/planMatch'
import WorkoutFormModal from './WorkoutFormModal'
import GoalFeedback from '../../components/GoalFeedback'
import Modal from '../../components/ui/Modal'
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
  const [formDate, setFormDate] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [quick, setQuick] = useState<{ session: PlanSession; date: string } | null>(
    null,
  )

  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])
  const isCurrentWeek = weekStart === toISODate(weekDays(new Date())[0])
  const weekEntries = log.filter((e) => e.date >= weekStart && e.date <= weekEnd)
  const results = compareToTargets(weekEntries, targetsForWeek(plan, weekStart))

  // planned-but-not-yet-done sessions of the displayed week, for quick-complete
  const planWeek = plan?.weeks.find((w) => w.weekStart === weekStart) ?? null
  const completion = planWeek ? weekCompletion(planWeek, log) : {}
  const pendingForDay = (dayIdx: number): PlanSession[] =>
    planWeek
      ? planWeek.sessions.filter(
          (s) => s.day === dayIdx && !completion[s.id]?.done,
        )
      : []

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekRef((d) => addDays(startOfWeek(d), -7))}
            className="btn-ghost"
          >
            ← שבוע קודם
          </button>
          <div className="text-center min-w-[150px]">
            <button
              onClick={() => setWeekRef(new Date())}
              className="font-semibold hover:text-accent"
              title="חזרה לשבוע הנוכחי"
            >
              {isCurrentWeek ? 'השבוע הנוכחי' : 'חזרה לשבוע הנוכחי'}
            </button>
            <div className="text-sm text-muted">
              {formatDayMonth(days[0])} – {formatDayMonth(days[6])}
            </div>
          </div>
          <button
            onClick={() => setWeekRef((d) => addDays(startOfWeek(d), 7))}
            className="btn-ghost"
          >
            שבוע הבא →
          </button>
        </div>
        <button onClick={() => setShowAnalysis(true)} className="btn-accent">
          ניתוח שבועי
        </button>
      </div>

      <div className="grid gap-3">
        {days.map((d) => {
          const iso = toISODate(d)
          const dayEntries = log.filter((e) => e.date === iso)
          const isToday = iso === toISODate(new Date())
          return (
            <div
              key={iso}
              className={`card p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                isToday ? 'ring-2 ring-accent/30' : ''
              }`}
            >
              <div className="sm:w-32 shrink-0">
                <div className="font-bold">{HEB_DAYS[d.getDay()]}</div>
                <div className="text-sm text-muted">{formatDayMonth(d)}</div>
              </div>

              <div className="flex-1 flex flex-wrap gap-2 min-w-0 items-center">
                {dayEntries.length === 0 && pendingForDay(d.getDay()).length === 0 ? (
                  <span className="text-muted text-sm">אין אימונים</span>
                ) : (
                  dayEntries.map((e) => {
                    const v = describeEntry(e)
                    return (
                      <span
                        key={e.id}
                        className="inline-flex items-center gap-2 rounded-full border border-line bg-bg px-3 py-1.5"
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: v.color }}
                        />
                        <span className="font-semibold text-sm">{v.title}</span>
                        <span className="text-xs text-muted">
                          {v.details.join(' · ')}
                        </span>
                        <button
                          onClick={() => removeEntry(e.id)}
                          className="text-muted hover:text-accent leading-none"
                          aria-label="מחק"
                        >
                          ×
                        </button>
                      </span>
                    )
                  })
                )}
                {pendingForDay(d.getDay()).map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-2 rounded-full border border-dashed border-accent/50 px-3 py-1.5"
                  >
                    <span className="text-sm">
                      {s.sport === 'strength'
                        ? '💪'
                        : s.sport === 'other'
                          ? '✨'
                          : sportIcon[s.sport]}
                    </span>
                    <span className="text-sm text-muted">
                      {s.sport === 'strength' || s.sport === 'other'
                        ? s.label || 'אימון'
                        : `${sportLabel[s.sport]}${s.distance ? ` ${s.distance} ${sportUnit(s.sport)}` : ''}`}
                      {' · מתוכנן'}
                    </span>
                    <button
                      onClick={() => setQuick({ session: s, date: iso })}
                      className="text-sm font-semibold text-accent hover:underline"
                    >
                      בצעתי ✓
                    </button>
                  </span>
                ))}
              </div>

              <button
                onClick={() => setFormDate(iso)}
                className="btn-ghost shrink-0"
              >
                + הוסף אימון
              </button>
            </div>
          )
        })}
      </div>

      <WorkoutFormModal
        open={formDate !== null}
        date={formDate ?? toISODate(new Date())}
        onClose={() => setFormDate(null)}
      />

      {quick && (
        <QuickCompleteModal
          session={quick.session}
          date={quick.date}
          onClose={() => setQuick(null)}
        />
      )}

      <Modal
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        title="ניתוח שבועי מול היעדים"
      >
        <p className="text-sm text-muted mb-4">
          השוואת המרחקים שביצעת בשבוע המוצג למול היעדים השבועיים שהגדרת.
        </p>
        <GoalFeedback results={results} />
      </Modal>
    </div>
  )
}
