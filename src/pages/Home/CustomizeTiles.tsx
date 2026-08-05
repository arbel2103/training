import {
  useStore,
  type HomeTileId,
  type HomeLayout,
  DEFAULT_HOME_LAYOUT,
} from '../../store/useStore'
import Modal from '../../components/ui/Modal'
import Icon from '../../components/ui/Icon'

const TILE_LABELS: Record<HomeTileId, string> = {
  race: 'ספירה לתחרות',
  lastNight: 'הלילה האחרון',
  today: 'האימון של היום',
  week: 'השבוע שלי',
}

const ALL: HomeTileId[] = ['race', 'lastNight', 'today', 'week']

/** Normalize a stored layout: keep known ids, append any missing ones. */
export function orderedTiles(layout: HomeLayout): HomeTileId[] {
  const ordered = layout.order.filter((id) => ALL.includes(id))
  for (const id of ALL) if (!ordered.includes(id)) ordered.push(id)
  return ordered
}

export default function CustomizeTiles({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const layout = useStore((s) => s.homeLayout)
  const setLayout = useStore((s) => s.setHomeLayout)

  const order = orderedTiles(layout)

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= order.length) return
    const next = [...order]
    ;[next[i], next[j]] = [next[j], next[i]]
    setLayout({ ...layout, order: next })
  }

  const toggle = (id: HomeTileId) => {
    const hidden = layout.hidden.includes(id)
      ? layout.hidden.filter((h) => h !== id)
      : [...layout.hidden, id]
    setLayout({ ...layout, order, hidden })
  }

  return (
    <Modal open={open} onClose={onClose} title="התאמה אישית של דף הבית">
      <p className="text-sm text-muted mb-3">
        קבע את סדר האריחים והסתר את מה שלא רלוונטי לך.
      </p>
      <div className="grid gap-2">
        {order.map((id, i) => {
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
                  disabled={i === order.length - 1}
                  aria-label="הזז למטה"
                  className="text-muted hover:text-ink disabled:opacity-30"
                >
                  <Icon name="chevronDown" className="w-4 h-4" />
                </button>
              </div>
              <span className={`flex-1 font-medium ${hidden ? 'text-muted line-through' : ''}`}>
                {TILE_LABELS[id]}
              </span>
              <button
                onClick={() => toggle(id)}
                className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${
                  hidden
                    ? 'text-muted hover:bg-ink/5'
                    : 'text-accent bg-accent-soft'
                }`}
              >
                {hidden ? 'מוסתר' : 'מוצג'}
              </button>
            </div>
          )
        })}
      </div>
      <button
        onClick={() => setLayout(DEFAULT_HOME_LAYOUT)}
        className="btn-ghost text-sm py-1.5 mt-4"
      >
        איפוס לברירת מחדל
      </button>
    </Modal>
  )
}
