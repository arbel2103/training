import { useState } from 'react'
import { useStore } from '../store/useStore'
import { saveFile } from '../lib/fileStore'
import { addMonths, formatFullDate, toISODate } from '../lib/dates'
import Modal from './ui/Modal'
import Icon from './ui/Icon'

/**
 * Logs that a checkup of an existing type was performed again: a new history
 * entry under the same type name, an optional new result file, and the due
 * date recalculated from the date entered here — which is what "resets" it.
 */
export default function RenewCheckupModal({
  type,
  lastValidMonths,
  onClose,
}: {
  type: string
  lastValidMonths: number
  onClose: () => void
}) {
  const addCheckup = useStore((s) => s.addCheckup)
  const today = toISODate(new Date())
  const [date, setDate] = useState(today)
  const [validMonths, setValidMonths] = useState(lastValidMonths)
  const [file, setFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const id = addCheckup({ type, date, validMonths })
      if (file) await saveFile(id, file)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title={`בדיקה חדשה · ${type}`}>
      <div className="grid gap-4">
        <p className="text-sm text-muted leading-relaxed">
          זה נרשם כבדיקה נוספת תחת <b>{type}</b> — היא תופיע בהיסטוריה, ותהיה
          העדכנית ביותר. התוקף מתחיל לרוץ מחדש מהתאריך הזה.
        </p>

        <div className="flex flex-wrap gap-4">
          <div className="w-44">
            <label className="label">תאריך הבדיקה</label>
            <input
              type="date"
              dir="ltr"
              className="input text-center"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="w-44">
            <label className="label">תוקף (חודשים)</label>
            <input
              type="number"
              min={1}
              className="input"
              value={validMonths}
              onChange={(e) => setValidMonths(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="text-sm text-muted">
          הבדיקה הבאה תהיה בערך ב־<b>{formatFullDate(addMonths(date, validMonths))}</b>.
        </div>

        <div>
          <label className="label">קובץ תוצאות (אופציונלי)</label>
          <label className="btn-ghost text-sm cursor-pointer gap-1.5 inline-flex">
            <Icon name="upload" className="w-4 h-4" />
            {file ? file.name : 'בחר קובץ'}
            <input
              type="file"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="btn-ghost">
            ביטול
          </button>
          <button onClick={() => void save()} disabled={saving} className="btn-primary">
            {saving ? 'שומר…' : 'שמירה'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
