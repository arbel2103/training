import { useState } from 'react'
import type { ReactNode } from 'react'
import type { Expense } from '../../lib/types'
import { useStore } from '../../store/useStore'
import { effectiveAmount } from '../../store/selectors'
import { findCategoryDef, categoryIconName } from '../../lib/categories'
import Icon from '../../../../components/ui/Icon'
import { formatCurrency } from '../../lib/format'
import { formatDate } from '../../lib/date'
import { CategorySelect } from '../CategorySelect'
import { SavingsLinkSelect, useSavingLabel } from '../SavingsLinkSelect'
import { NumberInput } from '../ui/Input'
import { Button } from '../ui/Button'

interface Props {
  expenses: Expense[]
}

type EditMode = 'category' | 'refund' | 'goal'

export function ExpenseList({ expenses }: Props) {
  const customCategories = useStore((s) => s.customCategories)
  const updateExpenseCategory = useStore((s) => s.updateExpenseCategory)
  const setExpenseRefund = useStore((s) => s.setExpenseRefund)
  const setExpenseSaving = useStore((s) => s.setExpenseSaving)
  const removeExpense = useStore((s) => s.removeExpense)
  const savingLabel = useSavingLabel()

  const colorOf = (name: string) => findCategoryDef(name, customCategories).color

  const [editing, setEditing] = useState<{ id: string; mode: EditMode } | null>(
    null,
  )

  const toggle = (id: string, mode: EditMode) =>
    setEditing((cur) => (cur && cur.id === id && cur.mode === mode ? null : { id, mode }))

  if (!expenses.length) {
    return (
      <div className="py-10 text-center text-sm text-muted">
        אין הוצאות להצגה.
      </div>
    )
  }

  return (
    <div className="divide-y divide-line">
      {expenses.map((e) => {
        const isOpen = editing?.id === e.id
        return (
          <div key={e.id} className="py-2.5">
            <div className="flex items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: `${colorOf(e.category)}22`,
                  color: colorOf(e.category),
                }}
              >
                <Icon name={categoryIconName(e.category)} className="w-4 h-4" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-medium text-ink">
                    {e.merchant}
                  </span>
                  {e.pending && (
                    <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700">
                      בקליטה
                    </span>
                  )}
                  {e.isManual && (
                    <span className="shrink-0 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-700">
                      ידני
                    </span>
                  )}
                </div>
                <div className="truncate text-xs text-muted">
                  {formatDate(e.date)}
                  {' · '}
                  <span style={{ color: colorOf(e.category) }}>{e.category}</span>
                </div>
                {(e.refund > 0 || e.savingsAccountId || e.savingsGoalId) && (
                  <div className="truncate text-xs">
                    {e.refund > 0 && (
                      <span className="text-emerald-600">
                        הוחזר {formatCurrency(e.refund)}
                      </span>
                    )}
                    {e.refund > 0 && (e.savingsAccountId || e.savingsGoalId) && (
                      <span className="text-muted"> · </span>
                    )}
                    {(e.savingsAccountId || e.savingsGoalId) && (
                      <span className="text-accent">
                        ◎ {savingLabel(e.savingsAccountId, e.savingsGoalId)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="shrink-0 whitespace-nowrap ps-1 text-left">
                <div className="text-sm font-semibold num">
                  {formatCurrency(effectiveAmount(e), true)}
                </div>
                {e.refund > 0 && (
                  <div className="text-[11px] text-muted line-through num">
                    {formatCurrency(e.chargeAmount ?? e.txnAmount, true)}
                  </div>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-0.5">
                <IconBtn label="קטגוריה" active={isOpen && editing?.mode === 'category'} onClick={() => toggle(e.id, 'category')}>
                  <Icon name="tag" className="w-4 h-4" />
                </IconBtn>
                <IconBtn label="החזר" active={isOpen && editing?.mode === 'refund'} onClick={() => toggle(e.id, 'refund')}>
                  <Icon name="undo" className="w-4 h-4" />
                </IconBtn>
                <IconBtn
                  label="שיוך חיסכון"
                  active={isOpen && editing?.mode === 'goal'}
                  onClick={() => toggle(e.id, 'goal')}
                >
                  <Icon name="target" className="w-4 h-4" />
                </IconBtn>
                {e.isManual && (
                  <IconBtn
                    label="מחיקת הוצאה ידנית"
                    onClick={() => {
                      if (window.confirm(`למחוק את ההוצאה "${e.merchant}"?`))
                        removeExpense(e.id)
                    }}
                  >
                    <Icon name="trash" className="w-4 h-4" />
                  </IconBtn>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="mt-2 rounded-xl bg-bg p-3">
                {editing?.mode === 'category' && (
                  <div className="max-w-xs">
                    <CategorySelect
                      value={e.category}
                      onChange={(c) => {
                        updateExpenseCategory(e.id, c)
                        setEditing(null)
                      }}
                    />
                  </div>
                )}

                {editing?.mode === 'refund' && (
                  <RefundEditor
                    expense={e}
                    onSave={(v) => {
                      setExpenseRefund(e.id, v)
                      setEditing(null)
                    }}
                  />
                )}

                {editing?.mode === 'goal' && (
                  <div className="max-w-sm">
                    <SavingsLinkSelect
                      accountId={e.savingsAccountId}
                      goalId={e.savingsGoalId}
                      onChange={(acc, goal) => {
                        setExpenseSaving(e.id, acc, goal)
                        setEditing(null)
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function IconBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: ReactNode
  label: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      title={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
        active ? 'bg-accent-soft' : 'hover:bg-ink/5'
      }`}
    >
      {children}
    </button>
  )
}

function RefundEditor({
  expense,
  onSave,
}: {
  expense: Expense
  onSave: (refund: number) => void
}) {
  const [val, setVal] = useState(String(expense.refund || ''))
  const base = expense.chargeAmount ?? expense.txnAmount
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <span className="mb-1 block text-xs text-muted">
          סכום שחבר החזיר לי
        </span>
        <div className="w-40">
          <NumberInput
            autoFocus
            value={val}
            placeholder="0"
            onChange={(e) => setVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSave(Number(val) || 0)}
          />
        </div>
      </div>
      <div className="text-xs text-muted">
        הסכום החדש:{' '}
        <span className="font-medium text-ink num">
          {formatCurrency(Math.max(0, base - (Number(val) || 0)), true)}
        </span>
      </div>
      <Button size="sm" onClick={() => onSave(Number(val) || 0)}>
        שמירה
      </Button>
    </div>
  )
}
