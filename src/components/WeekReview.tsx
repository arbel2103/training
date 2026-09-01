import { useState } from 'react'
import { useStore, type PlanWeek } from '../store/useStore'
import Icon from './ui/Icon'

/**
 * The athlete's own account of a finished week.
 *
 * Adherence counts say what got done; they never say why. A week where the
 * long ride fell to a work crisis and one where it fell to a sore knee look
 * identical in the numbers and call for opposite coaching. This is where that
 * difference gets written down, and the coach reads it when reviewing the week.
 *
 * Only offered on weeks that have ended — there is nothing to review yet in a
 * week still being trained.
 */
export default function WeekReview({ week }: { week: PlanWeek }) {
  const setWeekReview = useStore((s) => s.setWeekReview)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(week.review ?? '')

  const save = () => {
    setWeekReview(week.weekStart, draft)
    setEditing(false)
  }

  if (!editing) {
    return week.review ? (
      <div className="rounded-xl border border-line bg-bg px-3 py-2 mt-3">
        <div className="flex items-baseline gap-1.5 mb-1">
          <Icon name="clipboard" className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-xs font-semibold text-accent">איך היה השבוע</span>
          <button
            onClick={() => {
              setDraft(week.review ?? '')
              setEditing(true)
            }}
            className="text-xs text-muted hover:text-accent mr-auto"
          >
            ערוך
          </button>
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{week.review}</p>
      </div>
    ) : (
      <button
        onClick={() => {
          setDraft('')
          setEditing(true)
        }}
        className="mt-3 text-sm text-muted hover:text-accent flex items-center gap-1.5"
      >
        <Icon name="clipboard" className="w-4 h-4" />
        הוסף הערה — איך היה השבוע?
      </button>
    )
  }

  return (
    <div className="mt-3">
      <label className="label">איך היה השבוע?</label>
      <textarea
        className="input w-full min-h-[5rem]"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="הרגשה כללית, מה הלך טוב, מה הפריע, פציעות, עומס בעבודה…"
      />
      <p className="text-xs text-muted mt-1">
        המאמן יקרא את זה כשהוא מסכם את השבוע.
      </p>
      <div className="flex gap-2 mt-2">
        <button onClick={() => setEditing(false)} className="btn-ghost text-sm">
          ביטול
        </button>
        <button onClick={save} className="btn-accent text-sm flex-1">
          שמור
        </button>
      </div>
    </div>
  )
}
