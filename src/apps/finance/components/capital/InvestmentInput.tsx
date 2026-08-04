import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { NumberInput, Select, Field } from '../ui/Input'
import { addMonths, currentMonthKey, monthLabel } from '../../lib/date'

export function InvestmentInput() {
  const accounts = useStore((s) => s.accounts)
  const selectedMonth = useStore((s) => s.selectedMonth)
  const addInvestment = useStore((s) => s.addInvestment)

  // ברירת מחדל: החודש הנוכחי (השקעה ב-1 לחודש)
  const nowMonth = currentMonthKey()
  const [month, setMonth] = useState(nowMonth)
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')

  const monthOptions = useMemo(() => {
    const set = new Set<string>()
    // 2 חודשים קדימה עד 18 חודשים אחורה מהחודש הנוכחי
    for (let i = 2; i >= -18; i--) set.add(addMonths(nowMonth, i))
    set.add(selectedMonth) // ודא שגם החודש הנבחר בדף ההוצאות זמין
    return [...set].sort().reverse()
  }, [nowMonth, selectedMonth])

  const submit = () => {
    const amt = Number(amount)
    const acc = accountId || accounts[0]?.id
    if (!amt || !acc) return
    addInvestment(month, amt, acc)
    setAmount('')
  }

  if (accounts.length === 0) {
    return (
      <Card>
        <p className="text-sm text-muted">
          כדי לתעד השקעות, צריך קודם להוסיף חשבון בטאב "מעקב הון".
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="mb-3 text-sm font-medium text-ink">תיעוד השקעה חדשה</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <Field label="חודש">
          <Select value={month} onChange={(e) => setMonth(e.target.value)}>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="סכום שהושקע">
          <NumberInput
            value={amount}
            placeholder="0"
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
        </Field>
        <Field label="חשבון יעד">
          <Select value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button onClick={submit}>הוסף השקעה</Button>
      </div>
    </Card>
  )
}
