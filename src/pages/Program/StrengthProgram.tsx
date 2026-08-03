import { useState } from 'react'
import { useStore } from '../../store/useStore'
import Modal from '../../components/ui/Modal'
import RestTimer from '../../components/RestTimer'
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
  const [showTimer, setShowTimer] = useState(false)

  const active =
    categories.find((c) => c.id === activeId) ?? categories[0] ?? null
  const confirmCat = categories.find((c) => c.id === confirmId) ?? null

  const isEditingActive = !!active && editingId === active.id

  return (
    <div>
      {/* workout picker — a compact dropdown instead of a row of tabs */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {categories.length > 0 &&
          (isEditingActive ? (
            <input
              autoFocus
              defaultValue={active.name}
              className="input text-sm font-semibold max-w-[14rem]"
              onBlur={(e) => {
                renameCategory(active.id, e.target.value.trim() || active.name)
                setEditingId(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
            />
          ) : (
            <select
              className="input text-sm font-semibold max-w-[14rem] py-2"
              value={active?.id ?? ''}
              onChange={(e) => setActiveId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ))}

        {active && !isEditingActive && (
          <>
            <button
              onClick={() => setEditingId(active.id)}
              className="text-muted hover:text-ink px-1.5 py-1"
              title="שנה שם"
              aria-label="שנה שם"
            >
              ✎
            </button>
            <button
              onClick={() => setConfirmId(active.id)}
              className="text-muted hover:text-run px-1.5 py-1"
              title="הסר אימון"
              aria-label="הסר אימון"
            >
              ✕
            </button>
          </>
        )}

        <button
          onClick={() => addCategory('אימון חדש')}
          className="btn-ghost text-sm py-1.5 px-3"
        >
          + אימון
        </button>
      </div>

      {/* active category content */}
      {!active ? (
        <div className="card p-10 text-center text-muted">
          עדיין אין אימוני כוח. לחץ על <b>+ אימון</b> כדי ליצור את הראשון
          (למשל: חזה, גב, רגליים).
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => addExercise(active.id)}
              className="btn-accent text-sm py-1.5 px-3"
            >
              + תרגיל
            </button>
            <button
              onClick={() => setShowTimer((v) => !v)}
              className={`text-sm py-1.5 px-3 ${showTimer ? 'btn-soft' : 'btn-ghost'}`}
              title="טיימר מנוחה בין סטים"
            >
              ⏱️ טיימר
            </button>
            <span className="text-sm text-muted mr-auto">
              {active.exercises.length} תרגילים
            </span>
          </div>

          {showTimer && <RestTimer />}

          {active.exercises.length === 0 ? (
            <div className="card p-8 text-center text-muted">
              אין עדיין תרגילים באימון הזה.
            </div>
          ) : (
            <div className="grid gap-3">
              {active.exercises.map((ex, i) => (
                <ExerciseRow
                  key={ex.id}
                  categoryId={active.id}
                  ex={ex}
                  canMoveUp={i > 0}
                  canMoveDown={i < active.exercises.length - 1}
                />
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
