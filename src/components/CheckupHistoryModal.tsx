import { useState } from 'react'
import { useStore, type Checkup } from '../store/useStore'
import { deleteFile } from '../lib/fileStore'
import { formatFullDate } from '../lib/dates'
import Modal from './ui/Modal'
import Icon from './ui/Icon'
import CheckupFileModal from './CheckupFileModal'

/**
 * All past instances of one checkup type, newest first. The main history tab
 * only ever shows the latest per type — this is where the rest of them live.
 */
export default function CheckupHistoryModal({
  type,
  entries,
  onClose,
}: {
  type: string
  entries: Checkup[]
  onClose: () => void
}) {
  const removeCheckup = useStore((s) => s.removeCheckup)
  const [viewingId, setViewingId] = useState<string | null>(null)

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const viewing = sorted.find((e) => e.id === viewingId)

  const remove = async (c: Checkup) => {
    if (!window.confirm(`למחוק את הבדיקה מתאריך ${formatFullDate(c.date)}?`)) return
    if (c.fileName) await deleteFile(c.id)
    removeCheckup(c.id)
  }

  return (
    <Modal open onClose={onClose} title={`היסטוריה · ${type}`}>
      <div className="grid gap-2">
        {sorted.map((c, i) => (
          <div
            key={c.id}
            className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5"
          >
            <div className="flex-1 min-w-0">
              <div className="font-semibold">{formatFullDate(c.date)}</div>
              {i === 0 && (
                <div className="text-xs text-accent font-semibold">העדכנית ביותר</div>
              )}
            </div>
            {c.fileName && (
              <button
                onClick={() => setViewingId(c.id)}
                className="text-muted hover:text-accent shrink-0"
                title={c.fileName}
                aria-label="פתח קובץ"
              >
                <Icon name="attach" className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => void remove(c)}
              className="text-muted hover:text-run shrink-0"
              aria-label="מחק בדיקה"
            >
              <Icon name="trash" className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <CheckupFileModal
        checkupId={viewing ? viewing.id : null}
        fileName={viewing?.fileName}
        fileType={viewing?.fileType}
        onClose={() => setViewingId(null)}
      />
    </Modal>
  )
}
