import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { HEB_DAYS, formatDayMonth, toISODate, weekDays } from '../../lib/dates'
import { describeEntry } from '../../lib/describe'
import { compareToTargets } from '../../lib/analysis'
import WorkoutFormModal from './WorkoutFormModal'
import GoalFeedback from '../../components/GoalFeedback'
import Modal from '../../components/ui/Modal'

export default function EntryTab() {
  const log = useStore((s) => s.log)
  const targets = useStore((s) => s.aerobicTargets)
  const removeEntry = useStore((s) => s.removeEntry)

  const days = useMemo(() => weekDays(new Date()), [])
  const [formDate, setFormDate] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)

  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])
  const weekEntries = log.filter((e) => e.date >= weekStart && e.date <= weekEnd)
  const results = compareToTargets(weekEntries, targets)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-2xl font-bold">השבוע הנוכחי</h2>
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

              <div className="flex-1 flex flex-wrap gap-2 min-w-0">
                {dayEntries.length === 0 ? (
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

      <Modal
        open={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        title="ניתוח שבועי מול היעדים"
      >
        <p className="text-sm text-muted mb-4">
          השוואת המרחקים שביצעת השבוע למול היעדים השבועיים שהגדרת.
        </p>
        <GoalFeedback results={results} />
      </Modal>
    </div>
  )
}
