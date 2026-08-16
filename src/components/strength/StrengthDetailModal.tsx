import Modal from '../ui/Modal'
import type { WorkoutEntry } from '../../store/useStore'
import { estimate1RM, muscleLabel, tonnage } from '../../lib/strength'
import { formatDuration } from '../../lib/calc'
import { formatFullDate } from '../../lib/dates'

/** The sets of one logged strength workout, grouped back into exercises. */
export default function StrengthDetailModal({
  entry,
  onClose,
}: {
  entry: WorkoutEntry | null
  onClose: () => void
}) {
  const sets = entry?.sets ?? []

  // preserve the order the exercises were actually worked in
  const order: string[] = []
  const byExercise = new Map<string, typeof sets>()
  for (const s of sets) {
    if (!byExercise.has(s.exerciseId)) {
      byExercise.set(s.exerciseId, [])
      order.push(s.exerciseId)
    }
    byExercise.get(s.exerciseId)!.push(s)
  }

  return (
    <Modal
      open={!!entry && sets.length > 0}
      onClose={onClose}
      title={entry?.strengthName || 'אימון כוח'}
      maxWidth="max-w-md"
    >
      {entry && (
        <>
          <div className="text-sm text-muted mb-4">
            {formatFullDate(entry.date)}
            {entry.durationMin ? ` · ${formatDuration(entry.durationMin)}` : ''} ·{' '}
            {tonnage(sets).toLocaleString('he-IL')} ק״ג סה״כ
          </div>

          <div className="grid gap-3">
            {order.map((exId) => {
              const mine = byExercise.get(exId)!
              const top = mine.reduce(
                (b, s) =>
                  estimate1RM(s.weightKg ?? 0, s.reps) > b ? estimate1RM(s.weightKg ?? 0, s.reps) : b,
                0,
              )
              return (
                <div key={exId} className="card p-3.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold min-w-0 truncate">
                      {mine[0].exerciseName}
                    </div>
                    {top > 0 && (
                      <div className="text-xs text-muted shrink-0">
                        1RM משוער {top}
                      </div>
                    )}
                  </div>
                  {mine[0].muscles?.length ? (
                    <div className="text-xs text-muted mt-0.5">
                      {mine[0].muscles.map((m) => muscleLabel[m]).join(' · ')}
                    </div>
                  ) : null}
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
                </div>
              )
            })}
          </div>

          {entry.note && (
            <p className="text-sm text-muted mt-4 border-t border-line pt-3">
              {entry.note}
            </p>
          )}
        </>
      )}
    </Modal>
  )
}
