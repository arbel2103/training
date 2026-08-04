import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { NumberInput, TextInput, Field } from '../ui/Input'
import { CategorySelect } from '../CategorySelect'
import { monthLabel } from '../../lib/date'

// כפתור קטן להוספת הוצאה ידנית (עם קטגוריה) לחודש הנבחר
export function ManualExpenseButton() {
  const selectedMonth = useStore((s) => s.selectedMonth)
  const addManualExpense = useStore((s) => s.addManualExpense)

  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('אחר')

  const submit = () => {
    const amt = Number(amount)
    if (!label.trim() || !amt) return
    addManualExpense(selectedMonth, label.trim(), amt, category)
    setLabel('')
    setAmount('')
    setCategory('אחר')
    setOpen(false)
  }

  return (
    <>
      <Button variant="subtle" onClick={() => setOpen(true)}>
        ＋ הוצאה
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`הוספת הוצאה ידנית — ${monthLabel(selectedMonth)}`}
        footer={
          <>
            <Button onClick={submit}>הוספה</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              סגירה
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="תיאור ההוצאה">
                <TextInput
                  autoFocus
                  value={label}
                  placeholder="למשל: תשלום במזומן, קנייה בלי קבלה"
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              </Field>
            </div>
            <div className="w-32">
              <Field label="סכום">
                <NumberInput
                  value={amount}
                  placeholder="0"
                  onChange={(e) => setAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                />
              </Field>
            </div>
          </div>
          <Field label="קטגוריה">
            <CategorySelect value={category} onChange={setCategory} />
          </Field>
        </div>
        <p className="mt-3 text-[11px] text-muted">
          ההוצאה תתווסף לרשימת ההוצאות ולעוגה של החודש, לפי הקטגוריה שבחרת.
        </p>
      </Modal>
    </>
  )
}
