import type { LayoutPrefs } from '../../store/useStore'
import Modal from './Modal'
import Icon from './Icon'

/** Keep known ids, in the saved order, appending any that are missing. */
export function orderedIds(layout: LayoutPrefs, all: string[]): string[] {
  const ordered = layout.order.filter((id) => all.includes(id))
  for (const id of all) if (!ordered.includes(id)) ordered.push(id)
  return ordered
}

/**
 * A reusable reorder + show/hide sheet for a list of labelled sections.
 * The parent owns the LayoutPrefs (order + hidden) and its setter.
 */
export default function LayoutCustomizer({
  open,
  onClose,
  title,
  labels,
  layout,
  setLayout,
  onReset,
}: {
  open: boolean
  onClose: () => void
  title: string
  labels: Record<string, string>
  layout: LayoutPrefs
  setLayout: (l: LayoutPrefs) => void
  onReset?: () => void
}) {
  const ids = orderedIds(layout, Object.keys(labels))

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    setLayout({ ...layout, order: next })
  }

  const toggle = (id: string) => {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id]
    setLayout({ ...layout, order: ids, hidden })
  }

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm text-muted mb-3">
        קבע את הסדר והסתר את מה שלא רלוונטי לך.
      </p>
      <div className="grid gap-2">
        {ids.map((id, i) => {
          const hidden = layout.hidden.includes(id)
          return (
            <div
              key={id}
              className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5"
            >
              <div className="flex flex-col">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="הזז למעלה"
                  className="text-muted hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevronDown" className="w-4 h-4 rotate-180" />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === ids.length - 1}
                  aria-label="הזז למטה"
                  className="text-muted hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevronDown" className="w-4 h-4" />
                </button>
              </div>
              <span className={`flex-1 font-medium ${hidden ? 'text-muted line-through' : ''}`}>
                {labels[id]}
              </span>
              <button
                onClick={() => toggle(id)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  hidden ? 'text-muted hover:bg-ink/5' : 'text-accent bg-accent-soft'
                }`}
              >
                {hidden ? 'מוסתר' : 'מוצג'}
              </button>
            </div>
          )
        })}
      </div>
      {onReset && (
        <button onClick={onReset} className="btn-ghost text-sm py-1.5 mt-4">
          איפוס לברירת מחדל
        </button>
      )}
    </Modal>
  )
}
