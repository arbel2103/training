import { useState } from 'react'
import { useStore, type WorkoutEntry } from '../store/useStore'
import { describeEntry } from '../lib/describe'
import { formatFullDate } from '../lib/dates'
import { toISODate } from '../lib/dates'
import { needsDebrief } from '../lib/nudges'
import Modal from './ui/Modal'
import RpeSelector from './ui/RpeSelector'
import PlanSessionPicker from './PlanSessionPicker'
import Icon from './ui/Icon'

/**
 * "How did it go?" for the workouts the watch brought in.
 *
 * A Garmin activity arrives complete except for the one thing a watch cannot
 * measure: how hard it felt. That gap matters — RPE against heart rate is what
 * separates a hard day from a day you were tired — and the old flow only
 * offered it while logging by hand, which is exactly what syncing removed.
 */
export default function DebriefPrompt() {
  const log = useStore((s) => s.log)
  const updateEntry = useStore((s) => s.updateEntry)
  const [editing, setEditing] = useState<WorkoutEntry | null>(null)
  const [rpe, setRpe] = useState<number | undefined>(undefined)
  const [note, setNote] = useState('')
  const [planSel, setPlanSel] = useState<string | undefined>(undefined)

  const pending = needsDebrief(log, toISODate(new Date()))
  if (!pending.length) return null

  const open = (e: WorkoutEntry) => {
    setEditing(e)
    setRpe(e.rpe)
    setNote(e.note ?? '')
    setPlanSel(e.planSessionId)
  }

  const save = () => {
    if (editing)
      updateEntry(editing.id, {
        rpe,
        note: note.trim() || undefined,
        planSessionId: planSel,
      })
    setEditing(null)
  }

  return (
    <>
      <div className="card p-3 mb-5">
        <div className="flex items-center gap-1.5 font-bold text-sm mb-2">
          <Icon name="chat" className="w-4 h-4 text-accent shrink-0" />
          איך היה?
          <span className="font-normal text-muted">
            · השעון מדד את המאמץ, לא את התחושה
          </span>
        </div>
        <div className="grid gap-1.5">
          {pending.slice(0, 3).map((e) => {
            const v = describeEntry(e)
            return (
              <button
                key={e.id}
                onClick={() => open(e)}
                className="rounded-xl border border-line px-2.5 py-2 flex items-center gap-2 text-start hover:border-accent transition"
              >
                <Icon name={v.iconName} className="w-4 h-4 shrink-0" />
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold text-sm truncate">{v.title}</span>
                  <span className="block text-xs text-muted truncate">
                    {v.details.join(' · ')}
                  </span>
                </span>
                <span className="text-xs text-muted shrink-0">דרג</span>
              </button>
            )
          })}
        </div>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? describeEntry(editing).title : ''}
      >
        <div className="grid gap-4">
          {editing && (
            <p className="text-sm text-muted">{formatFullDate(editing.date)}</p>
          )}
          <div>
            <span className="label">איך הרגיש? (RPE 1–10)</span>
            <RpeSelector value={rpe} onChange={setRpe} />
          </div>
          <label className="block">
            <span className="label">הערה (אופציונלי)</span>
            <textarea
              className="input"
              rows={2}
              placeholder="רגליים כבדות / רוח נגדית / הרגיש קל…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {editing && (
            <PlanSessionPicker
              entryId={editing.id}
              category={editing.category}
              sport={editing.sport}
              dateISO={editing.date}
              value={planSel}
              onChange={setPlanSel}
            />
          )}
          <button onClick={save} className="btn-primary justify-center">
            שמור
          </button>
        </div>
      </Modal>
    </>
  )
}
