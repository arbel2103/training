import { Card } from '../ui/Card'
import Icon from '../../../../components/ui/Icon'
import InfoTip from '../../../../components/ui/InfoTip'
import type { Expense, MonthData, MonthKey } from '../../lib/types'
import { monthIncome, monthTotalSpending } from '../../store/selectors'
import { formatCurrency } from '../../lib/format'

/** Income − spending for the month: are you in the black or the red? */
export function CashflowCard({
  expenses,
  month,
  mk,
}: {
  expenses: Expense[]
  month: MonthData | undefined
  mk: MonthKey
}) {
  const income = monthIncome(month)
  const spending = monthTotalSpending(expenses, month, mk)
  const net = income - spending
  const positive = net >= 0
  const rate = income > 0 ? Math.round((net / income) * 100) : null

  // relative bar widths (larger side = 100%)
  const max = Math.max(income, spending, 1)

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
          תזרים החודש
          <InfoTip text="ההכנסות פחות ההוצאות של החודש. ירוק = נשאר לך כסף (עודף); אדום = הוצאת יותר ממה שנכנס. אחוז החיסכון הוא כמה מההכנסה נשאר." />
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
      </div>

      {rate != null && (
        <div className="text-xs text-muted">
          {positive ? (
            <>
              שיעור חיסכון החודש:{' '}
              <span className="font-semibold text-emerald-500">{rate}%</span>
            </>
          ) : (
            <span className="text-run font-medium">
              חריגה מהתקציב — ההוצאות עלו על ההכנסות
            </span>
          )}
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
  icon: 'trendUp' | 'trendDown'
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
