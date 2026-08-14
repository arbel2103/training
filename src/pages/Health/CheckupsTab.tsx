import { useState } from 'react'
import { useStore, type Checkup } from '../../store/useStore'
import { addMonths, formatFullDate, toISODate } from '../../lib/dates'
import { deleteFile } from '../../lib/fileStore'
import TabBar from '../../components/ui/TabBar'
import Icon from '../../components/ui/Icon'
import CheckupFileModal from '../../components/CheckupFileModal'
import CheckupHistoryModal from '../../components/CheckupHistoryModal'
import RenewCheckupModal from '../../components/RenewCheckupModal'

type Sub = 'new' | 'history'

type CheckupStatus = 'ok' | 'soon' | 'overdue'

interface CheckupGroup {
  type: string
  /** newest first */
  entries: Checkup[]
}

/** Group entries by their (trimmed) type name — every add under the same
 *  name joins the same series, which is what lets "history" show one row
 *  per type instead of one row per test ever taken. */
function groupByType(checkups: Checkup[]): CheckupGroup[] {
  const map = new Map<string, Checkup[]>()
  for (const c of checkups) {
    const key = c.type.trim()
    const list = map.get(key)
    if (list) list.push(c)
    else map.set(key, [c])
  }
  return [...map.entries()]
    .map(([type, entries]) => ({
      type,
      entries: [...entries].sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.entries[0].date.localeCompare(a.entries[0].date))
}

/** next-due date + status; "soon" = within one month before due. */
function checkupStatus(c: Checkup): { nextDue: string; status: CheckupStatus } {
  const nextDue = addMonths(c.date, c.validMonths)
  const alertDate = addMonths(c.date, Math.max(0, c.validMonths - 1))
  const today = toISODate(new Date())
  const status: CheckupStatus =
    today >= nextDue ? 'overdue' : today >= alertDate ? 'soon' : 'ok'
  return { nextDue, status }
}

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
      <p className="text-sm text-muted mb-4 leading-relaxed">
        לבדיקה חוזרת מסוג קיים — אין צורך למלא כאן שוב; יש כפתור <b>בדיקה
        חדשה</b> ליד כל סוג בדיקה בטאב <b>היסטוריה</b>, שכבר יודע את השם
        והתוקף הקודם.
      </p>
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

function CheckupGroupRow({ group }: { group: CheckupGroup }) {
  const removeCheckup = useStore((s) => s.removeCheckup)
  const latest = group.entries[0]
  const { nextDue, status } = checkupStatus(latest)
  const [viewing, setViewing] = useState(false)
  const [history, setHistory] = useState(false)
  const [renewing, setRenewing] = useState(false)

  const removeLatest = async () => {
    if (
      !window.confirm(
        group.entries.length > 1
          ? `למחוק את הבדיקה מתאריך ${formatFullDate(latest.date)}? הבדיקה הקודמת תהפוך לעדכנית.`
          : `למחוק את "${group.type}"? כל ההיסטוריה שלה תימחק.`,
      )
    )
      return
    if (latest.fileName) await deleteFile(latest.id)
    removeCheckup(latest.id)
  }

  return (
    <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{group.type}</div>
        <div className="text-sm text-muted">בוצע: {formatFullDate(latest.date)}</div>
        <div
          className={`text-sm ${
            status === 'overdue'
              ? 'text-run font-semibold'
              : status === 'soon'
                ? 'text-accent font-semibold'
                : 'text-muted'
          }`}
        >
          הבא: {formatFullDate(nextDue)}
          {status === 'overdue' && ' · עבר התוקף'}
          {status === 'soon' && ' · מתקרב'}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 flex-wrap">
        <button onClick={() => setRenewing(true)} className="btn-soft text-sm gap-1.5">
          <Icon name="plus" className="w-4 h-4" /> בדיקה חדשה
        </button>
        <button
          onClick={() => setHistory(true)}
          className="btn-ghost text-sm gap-1.5"
          title="כל הבדיקות מהסוג הזה בעבר"
        >
          <Icon name="clock" className="w-4 h-4" /> היסטוריה
          {group.entries.length > 1 && (
            <span className="text-muted">({group.entries.length})</span>
          )}
        </button>
        {latest.fileName && (
          <button
            onClick={() => setViewing(true)}
            className="text-muted hover:text-accent"
            title={latest.fileName}
            aria-label="פתח קובץ"
          >
            <Icon name="attach" className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={() => void removeLatest()}
          className="text-muted hover:text-run px-1"
          aria-label="מחק בדיקה"
        >
          <Icon name="trash" className="w-4 h-4" />
        </button>
      </div>

      <CheckupFileModal
        checkupId={viewing ? latest.id : null}
        fileName={latest.fileName}
        fileType={latest.fileType}
        onClose={() => setViewing(false)}
      />
      {history && (
        <CheckupHistoryModal
          type={group.type}
          entries={group.entries}
          onClose={() => setHistory(false)}
        />
      )}
      {renewing && (
        <RenewCheckupModal
          type={group.type}
          lastValidMonths={latest.validMonths}
          onClose={() => setRenewing(false)}
        />
      )}
    </div>
  )
}

export default function CheckupsTab() {
  const checkups = useStore((s) => s.checkups)
  const [sub, setSub] = useState<Sub>('new')
  const [renewingType, setRenewingType] = useState<{
    type: string
    lastValidMonths: number
  } | null>(null)

  // one row per type, newest instance first
  const groups = groupByType(checkups)

  const attention = groups
    .map((g) => ({ g, ...checkupStatus(g.entries[0]) }))
    .filter((x) => x.status !== 'ok')
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue))

  return (
    <div>
      {attention.length > 0 && (
        <div
          className="card p-4 mb-5 bg-accent-soft/40"
          style={{ borderInlineStart: '4px solid rgb(var(--accent))' }}
        >
          <div className="font-semibold mb-2 flex items-center gap-1.5">
            <Icon name="bell" className="w-4 h-4" /> לקבוע תור
          </div>
          <ul className="grid gap-1.5 text-sm">
            {attention.map(({ g, status, nextDue }) => (
              <li key={g.type} className="flex items-center justify-between gap-2">
                <span className={status === 'overdue' ? 'text-run' : 'text-accent'}>
                  • <b>{g.type}</b> —{' '}
                  {status === 'overdue' ? 'עבר התוקף' : 'מתקרב לתוקף'} (
                  {formatFullDate(nextDue)})
                </span>
                <button
                  onClick={() =>
                    setRenewingType({ type: g.type, lastValidMonths: g.entries[0].validMonths })
                  }
                  className="btn-soft text-xs px-2.5 py-1 shrink-0 gap-1"
                >
                  <Icon name="plus" className="w-3.5 h-3.5" /> בדיקה חדשה
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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
      ) : groups.length === 0 ? (
        <div className="card p-10 text-center text-muted">
          עדיין לא נוספו בדיקות. עבור לטאב <b>בדיקה חדשה</b>.
        </div>
      ) : (
        <div className="grid gap-2">
          {groups.map((g) => (
            <CheckupGroupRow key={g.type} group={g} />
          ))}
        </div>
      )}

      {renewingType && (
        <RenewCheckupModal
          type={renewingType.type}
          lastValidMonths={renewingType.lastValidMonths}
          onClose={() => setRenewingType(null)}
        />
      )}
    </div>
  )
}
