import { useStore } from '../store/useStore'
import { NOT_IN_PLAN, sessionOptionsForEntry } from '../lib/planMatch'
import { HEB_DAYS_SHORT, fromISO } from '../lib/dates'
import { sportUnit } from '../lib/calc'
import { sportLabel } from '../lib/labels'
import Icon from './ui/Icon'
import type { Category, Sport } from '../store/useStore'

/**
 * "Which planned session was this?" — shown while rating a workout.
 *
 * The plan matcher guesses by sport and distance, but only the athlete knows
 * whether today's ride was Tuesday's planned ride or an extra one on top. This
 * lists that week's sessions of the same sport to pick from, plus an explicit
 * "extra workout" choice, and writes the answer as `planSessionId` so the guess
 * is overridden. `value === undefined` means "let the app decide" (the default).
 */
export default function PlanSessionPicker({
  entryId,
  category,
  sport,
  dateISO,
  value,
  onChange,
}: {
  entryId: string
  category: Category
  sport?: Sport
  dateISO: string
  /** undefined = auto, NOT_IN_PLAN = extra, otherwise a session id */
  value: string | undefined
  onChange: (v: string | undefined) => void
}) {
  const plan = useStore((s) => s.trainingPlan)
  const log = useStore((s) => s.log)
  const options = sessionOptionsForEntry(
    plan,
    { id: entryId, category, sport },
    dateISO,
    log,
  )

  const available = options.filter((o) => !o.taken)

  // no plan sessions of this sport this week — nothing to link to, so don't
  // clutter the rating screen with an empty picker
  if (available.length === 0) return null

  const row = (selected: boolean) =>
    `w-full flex items-center gap-2 rounded-xl border px-3 py-2 text-sm text-start transition ${
      selected ? 'border-accent bg-accent-soft text-accent' : 'border-line hover:border-accent/40'
    }`

  return (
    <div>
      <label className="label">מול איזה אימון בתוכנית?</label>
      <div className="grid gap-1.5">
        {available.map(({ session, date }) => {
          const selected = value === session.id
          // strength/other sessions have no sport — the label is the whole
          // story; aerobic ones lead with distance and add the label if any
          const detail = sport
            ? [
                session.distance
                  ? `${session.distance} ${sportUnit(sport)}`
                  : sportLabel[sport],
                session.label,
              ]
                .filter(Boolean)
                .join(' · ')
            : session.label || 'אימון'
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onChange(selected ? undefined : session.id)}
              className={row(selected)}
            >
              <span
                className={`w-4 h-4 rounded-full border grid place-items-center shrink-0 ${
                  selected ? 'border-accent bg-accent text-white' : 'border-line'
                }`}
              >
                {selected && <Icon name="check" className="w-3 h-3" />}
              </span>
              <span className="font-semibold shrink-0">{HEB_DAYS_SHORT[fromISO(date).getDay()]}׳</span>
              <span className="flex-1 min-w-0 truncate text-muted">{detail}</span>
            </button>
          )
        })}

        {/* the extra-workout escape hatch */}
        <button
          type="button"
          onClick={() =>
            onChange(value === NOT_IN_PLAN ? undefined : NOT_IN_PLAN)
          }
          className={row(value === NOT_IN_PLAN)}
        >
          <span
            className={`w-4 h-4 rounded-full border grid place-items-center shrink-0 ${
              value === NOT_IN_PLAN ? 'border-accent bg-accent text-white' : 'border-line'
            }`}
          >
            {value === NOT_IN_PLAN && <Icon name="check" className="w-3 h-3" />}
          </span>
          <span className="flex-1 text-start">אימון נוסף (לא בתוכנית)</span>
        </button>
      </div>
      {value === undefined && (
        <p className="text-[11px] text-muted mt-1.5">
          בלי בחירה — האפליקציה משייכת לבד לפי הענף והמרחק.
        </p>
      )}
    </div>
  )
}
