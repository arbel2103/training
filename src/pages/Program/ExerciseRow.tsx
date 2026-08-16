import { useState } from 'react'
import type { Exercise, ID } from '../../store/useStore'
import { useStore } from '../../store/useStore'
import Icon from '../../components/ui/Icon'
import { MUSCLE_GROUPS, muscleLabel, type MuscleGroup } from '../../lib/strength'

export default function ExerciseRow({
  categoryId,
  ex,
  canMoveUp = false,
  canMoveDown = false,
}: {
  categoryId: ID
  ex: Exercise
  canMoveUp?: boolean
  canMoveDown?: boolean
}) {
  const update = useStore((s) => s.updateExercise)
  const remove = useStore((s) => s.removeExercise)
  const move = useStore((s) => s.moveExercise)
  const [pickMuscles, setPickMuscles] = useState(false)

  const setRep = (i: number, val: number) => {
    const reps = [...ex.reps]
    reps[i] = val
    update(categoryId, ex.id, { reps })
  }

  const muscles = ex.muscles ?? []
  const toggleMuscle = (m: MuscleGroup) =>
    update(categoryId, ex.id, {
      muscles: muscles.includes(m)
        ? muscles.filter((x) => x !== m)
        : [...muscles, m],
    })

  const updated = new Date(ex.updatedAt).toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  })

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        {/* reorder without having to retype the whole workout */}
        <div className="flex flex-col shrink-0">
          <button
            onClick={() => move(categoryId, ex.id, -1)}
            disabled={!canMoveUp}
            className="text-muted hover:text-accent disabled:opacity-25 disabled:hover:text-muted leading-none px-1"
            aria-label="הזז למעלה"
            title="הזז למעלה"
          >
            ▲
          </button>
          <button
            onClick={() => move(categoryId, ex.id, 1)}
            disabled={!canMoveDown}
            className="text-muted hover:text-accent disabled:opacity-25 disabled:hover:text-muted leading-none px-1"
            aria-label="הזז למטה"
            title="הזז למטה"
          >
            ▼
          </button>
        </div>
        <input
          className="input flex-1 font-semibold"
          placeholder="שם התרגיל"
          value={ex.name}
          onChange={(e) => update(categoryId, ex.id, { name: e.target.value })}
        />
        <button
          onClick={() => remove(categoryId, ex.id)}
          className="text-muted hover:text-run px-1 shrink-0"
          aria-label="מחק תרגיל"
          title="מחק תרגיל"
        >
          <Icon name="trash" className="w-4 h-4" />
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

      {/* muscle tagging — what feeds the weekly volume view. Tag the muscles the
          exercise really drives, not every muscle involved. */}
      <div className="mt-3">
        <button
          onClick={() => setPickMuscles((v) => !v)}
          className="text-xs text-muted hover:text-ink flex items-center gap-1"
        >
          <Icon name="strength" className="w-3.5 h-3.5" />
          {muscles.length === 0
            ? 'שייך לקבוצת שריר'
            : muscles.map((m) => muscleLabel[m]).join(' · ')}
          <Icon
            name="chevronDown"
            className={`w-3 h-3 transition ${pickMuscles ? 'rotate-180' : ''}`}
          />
        </button>

        {pickMuscles && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {MUSCLE_GROUPS.map((m) => {
              const on = muscles.includes(m)
              return (
                <button
                  key={m}
                  onClick={() => toggleMuscle(m)}
                  className={`text-xs rounded-full px-2.5 py-1 border transition ${
                    on
                      ? 'bg-accent text-white border-accent'
                      : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  {muscleLabel[m]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-3 text-xs text-muted">עודכן לאחרונה: {updated}</div>
    </div>
  )
}
