import { useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useStore } from '../store/useStore'
import { todayProgress } from '../lib/habitMath'
import type { Category, GlobalFreeze, Habit } from '../lib/types'
import HabitRow from './HabitRow'

/** A collapsible category with its habits and an inline "add habit" field. */
export default function CategorySection({
  category,
  habits,
  freezes,
  today,
  canMoveUp,
  canMoveDown,
}: {
  category: Category
  habits: Habit[]
  freezes: GlobalFreeze[]
  today: string
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const toggleCategory = useStore((s) => s.toggleCategory)
  const moveCategory = useStore((s) => s.moveCategory)
  const addHabit = useStore((s) => s.addHabit)
  const removeCategory = useStore((s) => s.removeCategory)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')

  const mine = habits
    .filter((h) => h.categoryId === category.id && !h.archivedAt)
    .sort((a, b) => a.order - b.order)
  const prog = todayProgress(mine, freezes, today)

  const submit = () => {
    if (name.trim()) addHabit(category.id, name.trim())
    setName('')
    setAdding(false)
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-1 px-2 py-2">
        {/* reorder without needing to delete and re-add categories */}
        <div className="flex flex-col shrink-0">
          <button
            onClick={() => moveCategory(category.id, -1)}
            disabled={!canMoveUp}
            className="text-muted hover:text-accent disabled:opacity-25 disabled:hover:text-muted leading-none px-1.5 text-xs"
            aria-label="הזז קטגוריה למעלה"
            title="הזז למעלה"
          >
            ▲
          </button>
          <button
            onClick={() => moveCategory(category.id, 1)}
            disabled={!canMoveDown}
            className="text-muted hover:text-accent disabled:opacity-25 disabled:hover:text-muted leading-none px-1.5 text-xs"
            aria-label="הזז קטגוריה למטה"
            title="הזז למטה"
          >
            ▼
          </button>
        </div>

        <button
          onClick={() => toggleCategory(category.id)}
          className="flex-1 min-w-0 flex items-center gap-2 px-1 py-1 text-start"
        >
          <Icon
            name="chevronDown"
            className={`w-4 h-4 text-muted shrink-0 transition-transform ${category.collapsed ? '-rotate-90' : ''}`}
          />
          <span className="font-display text-lg font-bold flex-1 truncate">
            {category.name}
          </span>
          {mine.length > 0 && (
            <span className="text-sm text-muted font-semibold shrink-0">
              {prog.done}/{prog.total}
            </span>
          )}
        </button>

        {/* always available — an empty category is still a category to delete */}
        <button
          onClick={() => {
            if (
              mine.length === 0 ||
              window.confirm(`למחוק את "${category.name}" ואת ${mine.length} ההרגלים שבה?`)
            )
              removeCategory(category.id)
          }}
          className="shrink-0 text-muted hover:text-run w-8 h-8 grid place-items-center rounded-lg"
          aria-label="מחק קטגוריה"
          title="מחק קטגוריה"
        >
          <Icon name="trash" className="w-4 h-4" />
        </button>
      </div>

      {!category.collapsed && (
        <div className="px-3 pb-3 grid gap-2">
          {mine.length === 0 && !adding && (
            <p className="text-sm text-muted px-1 py-2">אין עדיין הרגלים בקטגוריה הזו.</p>
          )}

          {mine.map((h) => (
            <HabitRow key={h.id} habit={h} freezes={freezes} today={today} />
          ))}

          {adding ? (
            <div className="flex gap-2">
              <input
                autoFocus
                className="input flex-1"
                placeholder="שם ההרגל…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit()
                  if (e.key === 'Escape') {
                    setName('')
                    setAdding(false)
                  }
                }}
              />
              <button onClick={submit} className="btn-primary text-sm px-4">
                הוסף
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="text-sm text-accent font-semibold hover:bg-accent-soft rounded-lg px-2 py-1.5 inline-flex items-center gap-1.5 w-fit"
            >
              <Icon name="plus" className="w-4 h-4" /> הוסף הרגל
            </button>
          )}
        </div>
      )}
    </div>
  )
}
