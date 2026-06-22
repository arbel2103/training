import type { Exercise, ID } from '../../store/useStore'
import { useStore } from '../../store/useStore'

export default function ExerciseRow({
  categoryId,
  ex,
}: {
  categoryId: ID
  ex: Exercise
}) {
  const update = useStore((s) => s.updateExercise)
  const remove = useStore((s) => s.removeExercise)

  const setRep = (i: number, val: number) => {
    const reps = [...ex.reps]
    reps[i] = val
    update(categoryId, ex.id, { reps })
  }

  const updated = new Date(ex.updatedAt).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  })

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3">
        <input
          className="input flex-1 font-semibold"
          placeholder="שם התרגיל"
          value={ex.name}
          onChange={(e) => update(categoryId, ex.id, { name: e.target.value })}
        />
        <button
          onClick={() => remove(categoryId, ex.id)}
          className="text-muted hover:text-accent text-xl px-1"
          aria-label="מחק תרגיל"
          title="מחק תרגיל"
        >
          🗑
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
        <div>
          <label className="label">סטים</label>
          <input
            type="number"
            min={1}
            max={20}
            className="input w-20 text-center"
            value={ex.sets}
            onChange={(e) =>
              update(categoryId, ex.id, {
                sets: Math.max(1, Math.min(20, Number(e.target.value) || 1)),
              })
            }
          />
        </div>

        <div>
          <label className="label">חזרות (תיבה לכל סט)</label>
          <div className="flex flex-wrap gap-1.5">
            {ex.reps.map((r, i) => (
              <input
                key={i}
                type="number"
                min={0}
                className="input w-14 text-center px-1"
                value={r}
                onChange={(e) => setRep(i, Number(e.target.value) || 0)}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="label">משקל</label>
          <input
            className="input w-28 text-center"
            placeholder='ק"ג'
            value={ex.weight}
            onChange={(e) => update(categoryId, ex.id, { weight: e.target.value })}
          />
        </div>
      </div>

      <div className="mt-3 text-xs text-muted">עודכן לאחרונה: {updated}</div>
    </div>
  )
}
