import { useState } from 'react'
import { useStore } from '../store/useStore'
import Icon from './ui/Icon'
import PlanRecovery from './PlanRecovery'

/** "2 בספט׳, 14:30" — enough to recognise an edit you remember making. */
function when(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('he-IL', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const weeksLabel = (n: number) => (n === 1 ? 'שבוע אחד' : `${n} שבועות`)

/**
 * Undo for the training plan.
 *
 * The coach can rewrite the whole plan from one sentence, and until now that
 * was final — a vague request answered badly cost weeks of planning with no way
 * back. Every plan edit now leaves the previous version here, so restoring is a
 * tap rather than a rebuild.
 */
export default function PlanHistory() {
  const history = useStore((s) => s.planHistory)
  const restore = useStore((s) => s.restorePlanSnapshot)
  const [open, setOpen] = useState(false)
  const [recovering, setRecovering] = useState(false)

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-sm text-muted hover:text-accent flex items-center gap-1.5"
      >
        <Icon name="undo" className="w-4 h-4" />
        גרסאות קודמות של התוכנית
        {history?.length ? ` (${history.length})` : ''}
        <span className="text-xs">{open ? '▾' : '◂'}</span>
      </button>

      {open && (
        <div className="card p-3 mt-2 grid gap-1.5">
          <p className="text-xs text-muted leading-relaxed">
            כל שינוי בתוכנית שומר את הגרסה שקדמה לו. אם המאמן שינה משהו שלא
            רצית — בחר את הגרסה מלפני השינוי.
          </p>
          {history.map((h) => (
            <div
              key={h.id}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="truncate">{h.reason}</div>
                <div className="text-xs text-muted">
                  {when(h.at)} · {weeksLabel(h.plan?.weeks.length ?? 0)}
                </div>
              </div>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `לשחזר את התוכנית לגרסה מ-${when(h.at)}? הגרסה הנוכחית תישמר גם היא ברשימה.`,
                    )
                  )
                    restore(h.id)
                }}
                className="btn-ghost text-sm shrink-0"
              >
                שחזר
              </button>
            </div>
          ))}

          {!history?.length && (
            <p className="text-xs text-muted">
              עדיין לא נשמרו גרסאות במכשיר — הן נשמרות מכאן והלאה, בכל שינוי.
            </p>
          )}

          {/* the deeper net: for a change made before local history existed */}
          <button
            onClick={() => setRecovering(true)}
            className="btn-ghost text-sm justify-self-start mt-1"
          >
            חפש תוכנית בגיבויים של Google Drive
          </button>
        </div>
      )}

      <PlanRecovery open={recovering} onClose={() => setRecovering(false)} />
    </div>
  )
}
