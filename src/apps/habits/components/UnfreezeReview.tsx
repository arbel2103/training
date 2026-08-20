import Modal from '../../../components/ui/Modal'
import { HEB_DAYS_SHORT, fromISO } from '../../../lib/dates'
import { useStore } from '../store/useStore'
import { freezeDays } from '../lib/habitMath'
import type { GlobalFreeze, Habit, ISODate } from '../lib/types'

/** A long freeze would produce an unusable wall of chips; show the tail of it. */
const MAX_DAYS = 31

/**
 * Coming back from a freeze, one habit at a time.
 *
 * A freeze is all-or-nothing while it runs, but life during it rarely is —
 * away from home you might keep reading every night and not touch the gym
 * once. Anything left alone stays frozen, which is the safe default: it
 * neither counts against the rate nor breaks a streak. Ticking a day here is
 * the same tick as any other, so a day you actually did rejoins the streak.
 */
export default function UnfreezeReview({
  freeze,
  today,
  onClose,
}: {
  freeze: GlobalFreeze
  today: ISODate
  onClose: () => void
}) {
  const habits = useStore((s) => s.habits)
  const toggleCompletion = useStore((s) => s.toggleCompletion)

  const all = freezeDays(freeze, today)
  const days = all.slice(-MAX_DAYS)
  const live = habits
    .filter((h) => !h.archivedAt && h.createdDate <= days[days.length - 1])
    .sort((a, b) => a.order - b.order)

  const daysFor = (h: Habit) => days.filter((d) => d >= h.createdDate)
  const doneCount = (h: Habit) => daysFor(h).filter((d) => h.completions[d]).length

  return (
    <Modal open onClose={onClose} title="חזרה מהקפאה">
      <div className="grid gap-4 min-w-0">
        <p className="text-sm text-muted leading-relaxed">
          ההקפאה נמשכה {all.length === 1 ? 'יום אחד' : `${all.length} ימים`}. סמן
          את הימים שכן הספקת — מה שתשאיר נקי נשאר <b>מוקפא</b>, לא נספר באחוזים
          ולא שובר רצף.
        </p>
        {all.length > days.length && (
          <p className="text-xs text-muted">
            מוצגים {days.length} הימים האחרונים של ההקפאה.
          </p>
        )}

        {live.length === 0 ? (
          <p className="text-sm text-muted">אין הרגלים לסמן בתקופה הזו.</p>
        ) : (
          live.map((h) => {
            const hDays = daysFor(h)
            const done = doneCount(h)
            return (
              <div key={h.id} className="rounded-xl border border-line p-3 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold text-sm truncate">{h.name}</span>
                  <span className="text-xs text-muted shrink-0">
                    {done}/{hDays.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5" dir="rtl">
                  {hDays.map((d) => {
                    const isDone = h.completions[d] === true
                    return (
                      <button
                        key={d}
                        onClick={() => toggleCompletion(h.id, d)}
                        title={d}
                        className={`min-w-11 px-2 py-1.5 rounded-lg text-[11px] font-semibold leading-tight transition active:scale-95 ${
                          isDone
                            ? 'bg-accent text-white'
                            : 'bg-bike/15 text-bike ring-1 ring-inset ring-bike/40'
                        }`}
                      >
                        <div>{HEB_DAYS_SHORT[fromISO(d).getDay()]}</div>
                        <div className="opacity-80">{fromISO(d).getDate()}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}

        <button onClick={onClose} className="btn-primary justify-center">
          סיום
        </button>
      </div>
    </Modal>
  )
}
