import { useEffect, useRef, useState } from 'react'
import Modal from '../ui/Modal'
import Icon from '../ui/Icon'
import RestTimer, { type RestTimerHandle } from '../RestTimer'
import { useStore, type ID, type StrengthIntensity } from '../../store/useStore'
import {
  lastPerformance,
  parseWeightKg,
  personalBest,
  tonnage,
} from '../../lib/strength'

const INTENSITIES: { id: StrengthIntensity; label: string }[] = [
  { id: 'light', label: 'קל' },
  { id: 'medium', label: 'בינוני' },
  { id: 'heavy', label: 'כבד' },
]

function mmss(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

const setsLabel = (n: number) => (n === 1 ? 'סט אחד' : `${n} סטים`)

/** Draft weight/reps for the set about to be logged. */
interface Draft {
  w: string
  r: string
}

/**
 * Active workout mode: log each set as it happens.
 *
 * This is what turns the strength program from a template into a record. Every
 * field is prefilled with what you did last — the set before it in this session,
 * else the same exercise the last time you trained it, else the template — so
 * the common case ("same again") is one tap, and beating last week is visible
 * rather than remembered.
 */
export default function ActiveWorkout({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const session = useStore((s) => s.activeStrength)
  const categories = useStore((s) => s.strengthCategories)
  const log = useStore((s) => s.log)
  const logSet = useStore((s) => s.logStrengthSet)
  const undo = useStore((s) => s.undoLastStrengthSet)
  const cancel = useStore((s) => s.cancelStrengthSession)
  const finish = useStore((s) => s.finishStrengthSession)

  const [draft, setDraft] = useState<Record<ID, Draft>>({})
  const [finishing, setFinishing] = useState(false)
  const [rpe, setRpe] = useState(7)
  const [intensity, setIntensity] = useState<StrengthIntensity>('medium')
  const [note, setNote] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const timer = useRef<RestTimerHandle>(null)

  // a ticking clock, so the session header shows real elapsed time
  useEffect(() => {
    if (!open || !session) return
    const started = new Date(session.startedAt).getTime()
    const tick = () => setElapsed(Date.now() - started)
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [open, session])

  if (!session) return null
  const category = categories.find((c) => c.id === session.categoryId)
  const exercises = category?.exercises ?? []

  const fieldsFor = (exId: ID): Draft => {
    if (draft[exId]) return draft[exId]
    const ex = exercises.find((e) => e.id === exId)
    const mine = session.sets.filter((s) => s.exerciseId === exId)
    const prev = mine[mine.length - 1]
    if (prev) return { w: prev.weightKg?.toString() ?? '', r: String(prev.reps) }
    const last = ex ? lastPerformance(log, ex.id, ex.name) : null
    const ls = last?.sets[0]
    if (ls) return { w: ls.weightKg?.toString() ?? '', r: String(ls.reps) }
    return {
      w: parseWeightKg(ex?.weight)?.toString() ?? '',
      r: String(ex?.reps[0] ?? 10),
    }
  }

  const setField = (exId: ID, patch: Partial<Draft>) =>
    setDraft((d) => ({ ...d, [exId]: { ...fieldsFor(exId), ...patch } }))

  const doLog = (exId: ID) => {
    const ex = exercises.find((e) => e.id === exId)
    if (!ex) return
    const f = fieldsFor(exId)
    const reps = Number(f.r)
    if (!(reps > 0)) return
    const weightKg = f.w.trim() === '' ? undefined : Number(f.w)
    logSet({
      exerciseId: ex.id,
      exerciseName: ex.name,
      reps,
      weightKg: weightKg && weightKg > 0 ? weightKg : undefined,
      muscles: ex.muscles,
    })
    // drop the override so the next set re-derives from the one just logged
    setDraft((d) => {
      const next = { ...d }
      delete next[exId]
      return next
    })
    timer.current?.start()
  }

  const totalSets = session.sets.length
  const totalKg = tonnage(session.sets)

  const doFinish = () => {
    if (finish({ rpe, intensity, note: note.trim() || undefined })) {
      setDraft({})
      setFinishing(false)
      setNote('')
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={finishing ? 'סיום האימון' : session.categoryName}
      maxWidth="max-w-lg"
    >
      {finishing ? (
        <div>
          <div className="card p-4 mb-4 text-center">
            <div className="font-display text-3xl font-black">{totalSets}</div>
            <div className="text-sm text-muted">
              {totalSets === 1 ? 'סט' : 'סטים'} ·{' '}
              {totalKg.toLocaleString('he-IL')} ק״ג סה״כ · {mmss(elapsed)}
            </div>
          </div>

          <label className="label">עצימות</label>
          <div className="flex gap-2 mb-4">
            {INTENSITIES.map((i) => (
              <button
                key={i.id}
                onClick={() => setIntensity(i.id)}
                className={`seg-btn flex-1 ${
                  intensity === i.id ? 'seg-btn-active' : 'seg-btn-idle'
                }`}
              >
                {i.label}
              </button>
            ))}
          </div>

          <label className="label">
            תחושה (RPE) — <b>{rpe}</b>
          </label>
          <input
            type="range"
            min={1}
            max={10}
            value={rpe}
            onChange={(e) => setRpe(Number(e.target.value))}
            className="w-full mb-4 accent-[var(--accent)]"
          />

          <label className="label">הערה</label>
          <textarea
            className="input w-full min-h-[4.5rem]"
            placeholder="איך היה?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="flex gap-2 mt-5">
            <button onClick={() => setFinishing(false)} className="btn-ghost">
              חזרה
            </button>
            <button onClick={doFinish} className="btn-accent flex-1">
              שמור אימון
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* live session header */}
          <div className="flex items-center justify-between gap-3 mb-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted">
              <Icon name="clock" className="w-4 h-4" />
              <span className="tabular-nums" dir="ltr">
                {mmss(elapsed)}
              </span>
            </div>
            <div className="text-muted">
              {setsLabel(totalSets)} · {totalKg.toLocaleString('he-IL')} ק״ג
            </div>
          </div>

          <RestTimer ref={timer} compact />

          {exercises.length === 0 ? (
            <div className="card p-6 text-center text-muted">
              אין תרגילים באימון הזה.
            </div>
          ) : (
            <div className="grid gap-3">
              {exercises.map((ex) => {
                const mine = session.sets.filter((s) => s.exerciseId === ex.id)
                const f = fieldsFor(ex.id)
                const last = lastPerformance(log, ex.id, ex.name)
                const pb = personalBest(log, ex.id, ex.name)
                const target = ex.reps[mine.length]

                return (
                  <div key={ex.id} className="card p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold min-w-0 truncate">{ex.name}</div>
                      <div className="text-xs text-muted shrink-0">
                        {mine.length}/{ex.sets} סטים
                      </div>
                    </div>

                    {/* what you did last time — the number to beat */}
                    <div className="text-xs text-muted mt-1">
                      {last
                        ? `פעם שעברה: ${last.sets
                            .map(
                              (s) =>
                                `${s.reps}${s.weightKg ? `×${s.weightKg}` : ''}`,
                            )
                            .join(' · ')}`
                        : 'אין רישום קודם לתרגיל הזה'}
                      {pb && ` · שיא: ${pb.weightKg}×${pb.reps}`}
                    </div>

                    {/* sets already logged in this session */}
                    {mine.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {mine.map((s, i) => (
                          <span
                            key={i}
                            className="text-xs rounded-full bg-accent/12 text-accent px-2 py-0.5"
                            dir="ltr"
                          >
                            {s.weightKg ? `${s.weightKg} × ` : ''}
                            {s.reps}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-end gap-2 mt-3">
                      <div className="min-w-0">
                        <label className="label">ק״ג</label>
                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.5"
                          className="input w-20 text-center"
                          placeholder="גוף"
                          value={f.w}
                          onChange={(e) => setField(ex.id, { w: e.target.value })}
                        />
                      </div>
                      <div className="min-w-0">
                        <label className="label">
                          חזרות{target ? ` (יעד ${target})` : ''}
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          className="input w-20 text-center"
                          value={f.r}
                          onChange={(e) => setField(ex.id, { r: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={() => doLog(ex.id)}
                        className="btn-accent flex-1 py-2.5"
                      >
                        ✓ סט
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="flex gap-2 mt-5">
            <button
              onClick={undo}
              disabled={totalSets === 0}
              className="btn-ghost disabled:opacity-40"
            >
              <Icon name="undo" className="w-4 h-4" /> בטל סט
            </button>
            <button
              onClick={() => {
                if (confirm('לבטל את האימון? הסטים שנרשמו יימחקו.')) {
                  cancel()
                  setDraft({})
                  onClose()
                }
              }}
              className="btn-ghost text-run"
            >
              בטל אימון
            </button>
            <button
              onClick={() => setFinishing(true)}
              disabled={totalSets === 0}
              className="btn-accent flex-1 disabled:opacity-40"
            >
              סיים
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
