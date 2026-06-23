import { useState } from 'react'
import { useStore, type Checkup } from '../../store/useStore'
import { addMonths, formatFullDate, toISODate } from '../../lib/dates'
import { deleteFile, getFile, saveFile } from '../../lib/fileStore'
import TabBar from '../../components/ui/TabBar'

type Sub = 'new' | 'history'

function NewCheckup({ onDone }: { onDone: () => void }) {
  const addCheckup = useStore((s) => s.addCheckup)
  const today = toISODate(new Date())
  const [type, setType] = useState('')
  const [date, setDate] = useState(today)
  const [validMonths, setValidMonths] = useState(6)

  const save = () => {
    if (!type.trim()) return
    addCheckup({ type: type.trim(), date, validMonths })
    setType('')
    setDate(today)
    setValidMonths(6)
    onDone()
  }

  return (
    <div className="card p-5 max-w-xl">
      <h3 className="font-display text-xl font-bold mb-4">בדיקה חדשה</h3>
      <div className="grid gap-4">
        <div>
          <label className="label">סוג הבדיקה</label>
          <input
            className="input"
            placeholder="לדוגמה: שיננית, בדיקות דם…"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </div>
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
          <button onClick={save} className="btn-primary">
            הוספה
          </button>
        </div>
      </div>
    </div>
  )
}

function CheckupRow({ c }: { c: Checkup }) {
  const updateCheckup = useStore((s) => s.updateCheckup)
  const removeCheckup = useStore((s) => s.removeCheckup)
  const nextDue = addMonths(c.date, c.validMonths)
  const overdue = nextDue < toISODate(new Date())

  const onUpload = async (file: File) => {
    await saveFile(c.id, file)
    updateCheckup(c.id, { fileName: file.name, fileType: file.type })
  }

  const openFile = async () => {
    const blob = await getFile(c.id)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const removeFile = async () => {
    await deleteFile(c.id)
    updateCheckup(c.id, { fileName: undefined, fileType: undefined })
  }

  const remove = async () => {
    if (c.fileName) await deleteFile(c.id)
    removeCheckup(c.id)
  }

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{c.type}</div>
        <div className="text-sm text-muted">
          בוצע: {formatFullDate(c.date)}
        </div>
        <div className={`text-sm ${overdue ? 'text-run font-semibold' : 'text-muted'}`}>
          הבא: {formatFullDate(nextDue)} {overdue && '· עבר התוקף!'}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {c.fileName ? (
          <>
            <button onClick={openFile} className="btn-soft text-sm" title={c.fileName}>
              📎 פתח קובץ
            </button>
            <button
              onClick={removeFile}
              className="text-muted hover:text-accent text-sm"
            >
              הסר קובץ
            </button>
          </>
        ) : (
          <label className="btn-ghost text-sm cursor-pointer">
            ⬆️ העלה קובץ
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f)
              }}
            />
          </label>
        )}
        <button
          onClick={remove}
          className="text-muted hover:text-accent px-1"
          aria-label="מחק בדיקה"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

export default function CheckupsTab() {
  const checkups = useStore((s) => s.checkups)
  const [sub, setSub] = useState<Sub>('new')

  const sorted = [...checkups].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div>
      <div className="mb-6">
        <TabBar
          variant="pill"
          value={sub}
          onChange={setSub}
          tabs={[
            { value: 'new', label: 'בדיקה חדשה' },
            { value: 'history', label: 'היסטוריה' },
          ]}
        />
      </div>

      {sub === 'new' ? (
        <NewCheckup onDone={() => setSub('history')} />
      ) : sorted.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          עדיין לא נוספו בדיקות. עבור לטאב <b>בדיקה חדשה</b>.
        </div>
      ) : (
        <div className="grid gap-2">
          {sorted.map((c) => (
            <CheckupRow key={c.id} c={c} />
          ))}
        </div>
      )}
    </div>
  )
}
