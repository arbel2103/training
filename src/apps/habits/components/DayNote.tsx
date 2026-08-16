import { useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useStore } from '../store/useStore'

/**
 * The note for one day — why it went the way it did.
 *
 * Offered when the day was not a clean sweep, because that is when there is
 * something to explain; a day you finished needs no excuse. Editing is opt-in
 * (tap to open) so the main page stays a checklist rather than a form.
 */
export default function DayNote({
  date,
  incomplete,
}: {
  date: string
  /** the day has habits left undone — the case the note exists for */
  incomplete: boolean
}) {
  const note = useStore((s) => s.dayNotes[date])
  const setDayNote = useStore((s) => s.setDayNote)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note ?? '')

  const save = () => {
    setDayNote(date, draft)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="card p-3 mb-4">
        <label className="label">מה קרה היום?</label>
        <textarea
          autoFocus
          rows={2}
          className="input resize-none"
          placeholder="למשל: הייתי בשמירה, חזרתי מאוחר…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setDraft(note ?? '')
              setEditing(false)
            }
          }}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button
            onClick={() => {
              setDraft(note ?? '')
              setEditing(false)
            }}
            className="btn-ghost text-sm"
          >
            ביטול
          </button>
          <button onClick={save} className="btn-primary text-sm">
            שמירה
          </button>
        </div>
      </div>
    )
  }

  if (note) {
    return (
      <button
        onClick={() => {
          setDraft(note)
          setEditing(true)
        }}
        className="card p-3 mb-4 w-full text-start flex items-start gap-2 hover:bg-ink/5 transition"
      >
        <Icon name="edit" className="w-4 h-4 text-muted shrink-0 mt-0.5" />
        <span className="text-sm leading-relaxed flex-1 min-w-0">{note}</span>
      </button>
    )
  }

  if (!incomplete) return null

  return (
    <button
      onClick={() => {
        setDraft('')
        setEditing(true)
      }}
      className="text-sm text-muted hover:text-accent inline-flex items-center gap-1.5 mb-4"
    >
      <Icon name="edit" className="w-4 h-4" /> הוסף הערה ליום
    </button>
  )
}
