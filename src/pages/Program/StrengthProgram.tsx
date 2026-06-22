import { useState } from 'react'
import { useStore } from '../../store/useStore'
import Modal from '../../components/ui/Modal'
import ExerciseRow from './ExerciseRow'

export default function StrengthProgram() {
  const categories = useStore((s) => s.strengthCategories)
  const addCategory = useStore((s) => s.addCategory)
  const renameCategory = useStore((s) => s.renameCategory)
  const removeCategory = useStore((s) => s.removeCategory)
  const addExercise = useStore((s) => s.addExercise)

  const [activeId, setActiveId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const active =
    categories.find((c) => c.id === activeId) ?? categories[0] ?? null
  const confirmCat = categories.find((c) => c.id === confirmId) ?? null

  return (
    <div>
      {/* category tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-5">
        {categories.map((c) => {
          const isActive = active?.id === c.id
          const isEditing = editingId === c.id
          return (
            <div
              key={c.id}
              className={`flex items-center gap-1.5 rounded-xl border px-2 py-1.5 transition ${
                isActive
                  ? 'bg-ink text-white border-ink'
                  : 'bg-surface text-muted border-line hover:text-ink'
              }`}
            >
              {isEditing ? (
                <input
                  autoFocus
                  defaultValue={c.name}
                  className="bg-transparent outline-none w-28 px-1 text-white placeholder:text-white/60"
                  onBlur={(e) => {
                    renameCategory(c.id, e.target.value.trim() || c.name)
                    setEditingId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  }}
                />
              ) : (
                <button
                  onClick={() => setActiveId(c.id)}
                  className="px-2 font-semibold"
                >
                  {c.name}
                </button>
              )}

              {isActive && !isEditing && (
                <>
                  <button
                    onClick={() => setEditingId(c.id)}
                    className="opacity-80 hover:opacity-100 px-1"
                    title="ערוך שם"
                    aria-label="ערוך שם"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => setConfirmId(c.id)}
                    className="opacity-80 hover:opacity-100 px-1"
                    title="הסר אימון"
                    aria-label="הסר אימון"
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          )
        })}

        <button onClick={() => addCategory('אימון חדש')} className="btn-ghost">
          + הוסף אימון
        </button>
      </div>

      {/* active category content */}
      {!active ? (
        <div className="card p-10 text-center text-muted">
          עדיין אין אימוני כוח. לחץ על <b>הוסף אימון</b> כדי ליצור את הראשון
          (למשל: חזה, גב, רגליים).
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl font-bold">{active.name}</h2>
            <button onClick={() => addExercise(active.id)} className="btn-accent">
              + הוסף תרגיל
            </button>
          </div>

          {active.exercises.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              אין עדיין תרגילים באימון הזה.
            </div>
          ) : (
            <div className="grid gap-3">
              {active.exercises.map((ex) => (
                <ExerciseRow key={ex.id} categoryId={active.id} ex={ex} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* remove confirmation */}
      <Modal
        open={!!confirmCat}
        onClose={() => setConfirmId(null)}
        title="הסרת אימון"
        maxWidth="max-w-sm"
      >
        <p className="text-ink">
          להסיר את האימון <b>{confirmCat?.name}</b> וכל התרגילים שבו? פעולה זו
          אינה הפיכה.
        </p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setConfirmId(null)} className="btn-ghost">
            ביטול
          </button>
          <button
            onClick={() => {
              if (confirmId) removeCategory(confirmId)
              setConfirmId(null)
            }}
            className="btn-accent"
          >
            כן, הסר
          </button>
        </div>
      </Modal>
    </div>
  )
}
