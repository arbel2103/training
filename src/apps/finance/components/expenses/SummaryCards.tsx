import { StatCard } from '../ui/StatCard'
import type { Expense, MonthData, MonthKey } from '../../lib/types'
import {
  averageTransaction,
  bankTransfersTotal,
  cardBreakdown,
  monthTotalSpending,
  topCategory,
  transactionCount,
} from '../../store/selectors'
import { formatCard, formatCurrency, formatNumber } from '../../lib/format'
import { findCategoryDef } from '../../lib/categories'
import { useStore } from '../../store/useStore'

interface Props {
  expenses: Expense[]
  month: MonthData | undefined
  mk: MonthKey
}

export function SummaryCards({ expenses, month, mk }: Props) {
  const removeCard = useStore((s) => s.removeCard)
  const customCategories = useStore((s) => s.customCategories)
  const total = monthTotalSpending(expenses, month, mk)
  const count = transactionCount(expenses, mk)
  const top = topCategory(expenses, mk)
  const avg = averageTransaction(expenses, mk)

  const cards = cardBreakdown(expenses, mk)
  const transfers = bankTransfersTotal(month)
  // הצג פירוט כשיש לפחות כרטיס אחד (כדי לאפשר מחיקה) או העברה בנקאית
  const showBreakdown = cards.length >= 1 || transfers > 0

  const onDeleteCard = (card: string, label: string) => {
    if (
      window.confirm(
        `למחוק את כל ההוצאות של כרטיס ${label} לחודש זה? (הקובץ שטענת)`,
      )
    ) {
      removeCard(mk, card)
    }
  }

  const breakdown = showBreakdown ? (
    <div className="mt-2 space-y-1 border-t border-line pt-2">
      {cards.map((c) => (
        <div key={c.card} className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-muted">
            {c.card === 'ידני' ? '✍️' : '💳'} {formatCard(c.card)}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="font-medium text-ink num">
              {formatCurrency(c.value)}
            </span>
            <button
              onClick={() => onDeleteCard(c.card, formatCard(c.card))}
              className="text-ink-300 hover:text-red-500"
              title="מחיקת הוצאות הכרטיס לחודש זה"
            >
              ✕
            </button>
          </span>
        </div>
      ))}
      {transfers > 0 && (
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-muted">🏦 העברה בנקאית</span>
          <span className="font-medium text-ink num">
            {formatCurrency(transfers)}
          </span>
        </div>
      )}
    </div>
  ) : undefined

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-start">
      <StatCard
        label='סה"כ הוצאות (כל הכרטיסים)'
        value={formatCurrency(total)}
        sub={breakdown}
        icon="💸"
      />
      <StatCard label='סה"כ עסקאות' value={formatNumber(count)} icon="🧾" />
      <StatCard
        label="הקטגוריה המובילה"
        value={
          top ? (
            <span className="text-base font-semibold">{top.category}</span>
          ) : (
            '—'
          )
        }
        sub={top ? formatCurrency(top.value) : undefined}
        icon={top ? findCategoryDef(top.category, customCategories).icon : '🏆'}
      />
      <StatCard label="ממוצע לעסקה" value={formatCurrency(avg)} icon="📊" />
    </div>
  )
}
