import { useMemo, useState } from 'react'
import { StatCard } from '../ui/StatCard'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { NumberInput, Field, Select } from '../ui/Input'
import { useStore } from '../../store/useStore'
import {
  collectSavingLinks,
  effectiveChecking,
  totalByGroup,
  totalCapital,
} from '../../store/selectors'
import { formatCurrency } from '../../lib/format'
import { formatDate, addMonths, currentMonthKey, monthLabel } from '../../lib/date'
import { accountGroups, groupIconName, CHECKING_KEY } from '../../lib/accountGroups'
import Icon from '../../../../components/ui/Icon'
import type { IconName } from '../../../../components/ui/Icon'

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
  const [live, setLive] = useState(true)
  const [fromMonth, setFromMonth] = useState(currentMonthKey())

  const links = useMemo(
    () => collectSavingLinks(expenses, months, accounts),
    [expenses, months, accounts],
  )
  const groups = accountGroups(accounts)
  const effChecking = effectiveChecking(checking, months, expenses)
  const total = totalCapital(accounts, links, effChecking, excluded)

  // months to offer as the "balance from" anchor: last 12 + any with data
  const monthOptions = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < 12; i++) set.add(addMonths(currentMonthKey(), -i))
    Object.keys(months).forEach((m) => set.add(m))
    expenses.forEach((e) => set.add(e.monthKey))
    return [...set].sort().reverse()
  }, [months, expenses])

  const openChecking = () => {
    setVal(checking.amount ? String(checking.amount) : '')
    setLive(checking.fromMonth != null)
    setFromMonth(checking.fromMonth ?? currentMonthKey())
    setOpen(true)
  }
  const save = () => {
    setChecking(Number(val) || 0, live ? fromMonth : undefined)
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
            icon={<Icon name={groupIconName(g)} className="w-5 h-5" />}
            sub={isExcluded(g) ? 'לא נספר בהון' : undefined}
          />
        ))}

        <StatCard
          label="עו״ש"
          value={formatCurrency(effChecking)}
          sub={
            isExcluded(CHECKING_KEY)
              ? 'לא נספר בהון · לחץ לעדכון'
              : checking.fromMonth
                ? `מתעדכן חי מ-${monthLabel(checking.fromMonth)} · לחץ לעדכון`
                : `עודכן ${formatDate(checking.updatedAt)} · לחץ לעדכון`
          }
          icon={<Icon name="edit" className="w-5 h-5" />}
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
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={live}
              onChange={(e) => setLive(e.target.checked)}
              className="accent-accent"
            />
            עדכון חי — משכורת והכנסות מתווספות, הוצאות יורדות אוטומטית
          </label>

          <Field label={live ? 'יתרת עו״ש בתחילת החודש שנבחר' : 'יתרה נוכחית בעו״ש'}>
            <NumberInput
              autoFocus
              value={val}
              placeholder="0"
              onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
          </Field>

          {live && (
            <>
              <Field label="מהחודש">
                <Select
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                >
                  {monthOptions.map((mk) => (
                    <option key={mk} value={mk}>
                      {monthLabel(mk)}
                    </option>
                  ))}
                </Select>
              </Field>
              <p className="text-xs text-muted leading-relaxed">
                הזן את היתרה שהייתה בעו״ש <b>בתחילת</b> החודש שבחרת. מהחודש הזה
                והלאה, כל משכורת/הכנסה שתזין תתווסף, וכל הוצאה שתיטען תרד — אוטומטית.
                הוצאות שמומנו מחיסכון לא יורדות מהעו״ש.
              </p>
            </>
          )}
        </div>
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
  const rows: { key: string; label: string; icon: IconName }[] = [
    ...groups.map((g) => ({ key: g, label: g, icon: groupIconName(g) })),
    { key: CHECKING_KEY, label: 'עו״ש', icon: 'wallet' as IconName },
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
          <Icon name="gear" className="w-4 h-4" />
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
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name={r.icon} className="w-4 h-4 text-muted" /> {r.label}
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
