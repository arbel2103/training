import { useMemo, useState } from 'react'
import { StatCard } from '../ui/StatCard'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { NumberInput, Field } from '../ui/Input'
import { useStore } from '../../store/useStore'
import { collectSavingLinks, totalByGroup, totalCapital } from '../../store/selectors'
import { formatCurrency } from '../../lib/format'
import { formatDate } from '../../lib/date'
import { accountGroups, groupIcon, CHECKING_KEY } from '../../lib/accountGroups'

export function CapitalSummary() {
  const accounts = useStore((s) => s.accounts)
  const expenses = useStore((s) => s.expenses)
  const months = useStore((s) => s.months)
  const checking = useStore((s) => s.checking)
  const setChecking = useStore((s) => s.setChecking)
  const excluded = useStore((s) => s.capitalExcluded)
  const toggleExcluded = useStore((s) => s.toggleCapitalExcluded)

  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')

  const links = useMemo(
    () => collectSavingLinks(expenses, months, accounts),
    [expenses, months, accounts],
  )
  const groups = accountGroups(accounts)
  const total = totalCapital(accounts, links, checking.amount, excluded)

  const openChecking = () => {
    setVal(checking.amount ? String(checking.amount) : '')
    setOpen(true)
  }
  const save = () => {
    setChecking(Number(val) || 0)
    setOpen(false)
  }

  const isExcluded = (key: string) => excluded.includes(key)

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
        {groups.map((g) => (
          <StatCard
            key={g}
            label={g}
            value={formatCurrency(totalByGroup(accounts, links, g))}
            icon={groupIcon(g)}
            sub={isExcluded(g) ? 'לא נספר בהון' : undefined}
          />
        ))}

        <StatCard
          label="עו״ש"
          value={formatCurrency(checking.amount)}
          sub={
            isExcluded(CHECKING_KEY)
              ? 'לא נספר בהון · לחץ לעדכון'
              : `עודכן ${formatDate(checking.updatedAt)} · לחץ לעדכון`
          }
          icon="✏️"
          onClick={openChecking}
        />

        <TotalCard
          total={total}
          groups={groups}
          excluded={excluded}
          onToggle={toggleExcluded}
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="עדכון יתרת עו״ש"
        footer={
          <>
            <Button onClick={save}>שמירה</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              ביטול
            </Button>
          </>
        }
      >
        <Field label="יתרה נוכחית בעו״ש">
          <NumberInput
            autoFocus
            value={val}
            placeholder="0"
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save()}
          />
        </Field>
      </Modal>
    </>
  )
}

// קלף "סה\"כ הון" הירוק — עם סינון מה נכלל בסכום
function TotalCard({
  total,
  groups,
  excluded,
  onToggle,
}: {
  total: number
  groups: string[]
  excluded: string[]
  onToggle: (key: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rows: { key: string; label: string; icon: string }[] = [
    ...groups.map((g) => ({ key: g, label: g, icon: groupIcon(g) })),
    { key: CHECKING_KEY, label: 'עו״ש', icon: '💳' },
  ]

  return (
    <div className="relative rounded-2xl p-4 border shadow-soft bg-accent border-accent text-white">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-white">סה״כ הון</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-white/90 hover:text-white"
          title={'בחר מה לכלול בסה"כ הון'}
        >
          ⚙️
        </button>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight num">
        {formatCurrency(total)}
      </div>
      {excluded.length > 0 && (
        <div className="mt-1 text-xs text-white/90">
          לא כולל: {excluded.map((k) => (k === CHECKING_KEY ? 'עו״ש' : k)).join(', ')}
        </div>
      )}

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute left-2 top-11 z-30 w-56 rounded-xl border border-line bg-surface p-2 text-ink shadow-card">
            <div className="px-2 py-1 text-[11px] text-muted">
              מה לכלול בסה״כ הון:
            </div>
            {rows.map((r) => {
              const included = !excluded.includes(r.key)
              return (
                <label
                  key={r.key}
                  className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bg"
                >
                  <input
                    type="checkbox"
                    checked={included}
                    onChange={() => onToggle(r.key)}
                    className="accent-accent"
                  />
                  <span>
                    {r.icon} {r.label}
                  </span>
                </label>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
