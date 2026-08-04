import { useState } from 'react'
import { Card } from '../ui/Card'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import Icon from '../../../../components/ui/Icon'
import { NumberInput, TextInput, Field } from '../ui/Input'
import type { MonthData, MonthKey } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { formatCurrency } from '../../lib/format'
import { monthIncome } from '../../store/selectors'
import { SavingsLinkSelect, useSavingLabel } from '../SavingsLinkSelect'

interface Props {
  month: MonthData
  mk: MonthKey
}

export function IncomeRow({ month, mk }: Props) {
  const setSalary = useStore((s) => s.setSalary)
  const addExtraIncome = useStore((s) => s.addExtraIncome)
  const removeExtraIncome = useStore((s) => s.removeExtraIncome)
  const addBankTransfer = useStore((s) => s.addBankTransfer)
  const removeBankTransfer = useStore((s) => s.removeBankTransfer)
  const setBankTransferSaving = useStore((s) => s.setBankTransferSaving)
  const savingLabel = useSavingLabel()

  const [incomeOpen, setIncomeOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)

  const extraTotal = month.extraIncome.reduce((s, i) => s + i.amount, 0)
  const transferTotal = month.bankTransfers.reduce((s, i) => s + i.amount, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {/* משכורת + הכנסות נוספות */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink flex items-center gap-1.5">
            <Icon name="briefcase" className="w-4 h-4 text-muted" /> משכורת חודשית
          </span>
          <Button size="sm" variant="subtle" onClick={() => setIncomeOpen(true)}>
            + הכנסות נוספות
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <NumberInput
              value={month.salary || ''}
              placeholder="0"
              onChange={(e) => setSalary(mk, Number(e.target.value) || 0)}
              className="pl-8 text-lg font-semibold"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              ₪
            </span>
          </div>
        </div>
        <div className="text-xs text-muted">
          סך הכנסות החודש:{' '}
          <span className="font-medium text-ink num">
            {formatCurrency(monthIncome(month))}
          </span>
          {extraTotal > 0 && (
            <> · מתוכן {formatCurrency(extraTotal)} הכנסות נוספות</>
          )}
        </div>
      </Card>

      {/* העברה בנקאית — הוצאות גדולות ידניות */}
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-ink flex items-center gap-1.5">
            <Icon name="bank" className="w-4 h-4 text-muted" /> העברה בנקאית (הוצאות לא באשראי)
          </span>
          <Button size="sm" variant="subtle" onClick={() => setTransferOpen(true)}>
            + הוסף
          </Button>
        </div>
        {month.bankTransfers.length === 0 ? (
          <div className="text-xs text-muted">
            הזן כאן הוצאות גדולות שלא יורדות באשראי (שכ"ד, ביטוח וכו').
          </div>
        ) : (
          <div className="space-y-1.5">
            {month.bankTransfers.map((t) => (
              <div key={t.id} className="rounded-lg bg-bg px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-ink">{t.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium num">{formatCurrency(t.amount)}</span>
                    <button
                      onClick={() => removeBankTransfer(mk, t.id)}
                      className="text-muted hover:text-red-500"
                    >
                      <Icon name="x" className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] text-muted">
                    <Icon name="target" className="w-3 h-3" /> שיוך:
                  </span>
                  <SavingsLinkSelect
                    accountId={t.savingsAccountId}
                    goalId={t.savingsGoalId}
                    onChange={(acc, goal) => setBankTransferSaving(mk, t.id, acc, goal)}
                    className="py-1 text-xs"
                  />
                </div>
                {(t.savingsAccountId || t.savingsGoalId) && (
                  <div className="mt-1 text-[11px] text-accent">
                    יורד מהיתרה של {savingLabel(t.savingsAccountId, t.savingsGoalId)}
                  </div>
                )}
              </div>
            ))}
            <div className="pt-1 text-xs text-muted">
              סה"כ העברות:{' '}
              <span className="font-medium text-ink num">
                {formatCurrency(transferTotal)}
              </span>
            </div>
          </div>
        )}
      </Card>

      <AddItemModal
        open={incomeOpen}
        onClose={() => setIncomeOpen(false)}
        title="הכנסות נוספות"
        items={month.extraIncome}
        onAdd={(label, amount) => addExtraIncome(mk, label, amount)}
        onRemove={(id) => removeExtraIncome(mk, id)}
        placeholder="למשל: החזר מחבר, בונוס"
      />
      <AddItemModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="העברה בנקאית"
        items={month.bankTransfers}
        onAdd={(label, amount) => addBankTransfer(mk, label, amount)}
        onRemove={(id) => removeBankTransfer(mk, id)}
        placeholder="למשל: שכר דירה, ביטוח"
      />
    </div>
  )
}

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  title: string
  items: { id: string; label: string; amount: number }[]
  onAdd: (label: string, amount: number) => void
  onRemove: (id: string) => void
  placeholder: string
}

function AddItemModal({
  open,
  onClose,
  title,
  items,
  onAdd,
  onRemove,
  placeholder,
}: AddItemModalProps) {
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  const submit = () => {
    const amt = Number(amount)
    if (!label.trim() || !amt) return
    onAdd(label.trim(), amt)
    setLabel('')
    setAmount('')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={<Button onClick={onClose}>סגירה</Button>}
    >
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Field label="תיאור">
            <TextInput
              value={label}
              placeholder={placeholder}
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
        <Button onClick={submit}>הוסף</Button>
      </div>

      {items.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between rounded-lg bg-bg px-3 py-2 text-sm"
            >
              <span className="text-ink">{it.label}</span>
              <span className="flex items-center gap-3">
                <span className="font-medium num">{formatCurrency(it.amount)}</span>
                <button
                  onClick={() => onRemove(it.id)}
                  className="text-muted hover:text-red-500"
                >
                  <Icon name="x" className="w-3.5 h-3.5" />
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
