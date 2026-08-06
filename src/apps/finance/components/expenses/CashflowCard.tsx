import { Card } from '../ui/Card'
import Icon, { type IconName } from '../../../../components/ui/Icon'
import InfoTip from '../../../../components/ui/InfoTip'
import type { Expense, MonthData, MonthKey } from '../../lib/types'
import { useStore } from '../../store/useStore'
import {
  monthIncome,
  monthTotalSpending,
  investmentMonthTotal,
} from '../../store/selectors'
import { formatCurrency } from '../../lib/format'

/** Income − spending − investments for the month: the real plus/minus. */
export function CashflowCard({
  expenses,
  month,
  mk,
}: {
  expenses: Expense[]
  month: MonthData | undefined
  mk: MonthKey
}) {
  const investments = useStore((s) => s.investments)
  const income = monthIncome(month)
  const spending = monthTotalSpending(expenses, month, mk)
  const invested = investmentMonthTotal(investments, mk)
  const net = income - spending - invested
  const positive = net >= 0

  // relative bar widths (larger side = 100%)
  const max = Math.max(income, spending, invested, 1)

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
          תזרים החודש
          <InfoTip text="הכנסות פחות הוצאות פחות מה שהשקעת החודש = הפלוס/מינוס האמיתי שנשאר בעו״ש. ירוק = נשאר עודף; אדום = יצא יותר ממה שנכנס. סכום ההשקעה נלקח מ'מעקב השקעה'." />
        </h3>
        <span
          className={`num text-2xl font-semibold ${positive ? 'text-emerald-500' : 'text-run'}`}
        >
          {positive ? '+' : ''}
          {formatCurrency(net)}
        </span>
      </div>

      <div className="space-y-2">
        <Row
          label="הכנסות"
          value={income}
          pct={(income / max) * 100}
          color="rgb(16 185 129)"
          icon="trendUp"
        />
        <Row
          label="הוצאות"
          value={spending}
          pct={(spending / max) * 100}
          color="rgb(var(--c-run))"
          icon="trendDown"
        />
        <Row
          label="השקעות"
          value={invested}
          pct={(invested / max) * 100}
          color="rgb(var(--accent))"
          icon="coins"
        />
      </div>

      {!positive && (
        <div className="text-xs text-run font-medium">
          חריגה — יצא יותר ממה שנכנס החודש
        </div>
      )}
    </Card>
  )
}

function Row({
  label,
  value,
  pct,
  color,
  icon,
}: {
  label: string
  value: number
  pct: number
  color: string
  icon: IconName
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex w-16 shrink-0 items-center gap-1 text-xs text-muted">
        <Icon name={icon} className="w-3.5 h-3.5" /> {label}
      </span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(2, pct)}%`, background: color }}
        />
      </div>
      <span className="num w-24 shrink-0 text-left text-sm font-medium text-ink">
        {formatCurrency(value)}
      </span>
    </div>
  )
}
