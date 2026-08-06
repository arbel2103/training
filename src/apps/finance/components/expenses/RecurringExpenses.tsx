import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Card } from '../ui/Card'
import Icon from '../../../../components/ui/Icon'
import InfoTip from '../../../../components/ui/InfoTip'
import { recurringExpenses } from '../../store/selectors'
import { categoryIconName, findCategoryDef } from '../../lib/categories'
import { formatCurrency } from '../../lib/format'
import { formatDate } from '../../lib/date'

export function RecurringExpenses() {
  const expenses = useStore((s) => s.expenses)
  const customCategories = useStore((s) => s.customCategories)
  const items = useMemo(() => recurringExpenses(expenses), [expenses])

  const monthlyTotal = items.reduce((s, i) => s + i.typicalAmount, 0)
  const colorOf = (name: string) => findCategoryDef(name, customCategories).color

  if (items.length === 0) {
    return (
      <Card>
        <div className="py-8 text-center text-sm text-muted">
          עדיין לא זוהו הוצאות קבועות. הן מזוהות אוטומטית כשאותו בית עסק חוזר
          בשלושה חודשים לפחות (מנויים, ביטוחים, חשבונות).
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
            סך קבוע מוערך לחודש
            <InfoTip text="סכום ההוצאות הקבועות שזוהו — בתי עסק שחוזרים כל חודש (מנויים, ביטוחים, חשבונות). זה הסכום ש'בורח' באופן קבוע עוד לפני ההוצאות המשתנות. הסכום לכל פריט הוא החציון של החיובים." />
          </h3>
          <p className="text-xs text-muted mt-0.5">{items.length} הוצאות קבועות</p>
        </div>
        <span className="num text-2xl font-semibold text-ink">
          {formatCurrency(monthlyTotal)}
        </span>
      </Card>

      <Card padded={false}>
        <div className="divide-y divide-line">
          {items.map((it) => (
            <div key={it.merchant} className="flex items-center gap-3 px-5 py-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ background: `${colorOf(it.category)}22`, color: colorOf(it.category) }}
              >
                <Icon name={categoryIconName(it.category)} className="w-4 h-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-ink">
                  {it.merchant}
                </div>
                <div className="truncate text-xs text-muted">
                  {it.category} · {it.monthsCount} חודשים · אחרון {formatDate(it.lastDate)}
                </div>
              </div>
              <span className="num shrink-0 text-left text-sm font-semibold text-ink">
                {formatCurrency(it.typicalAmount)}
                <span className="block text-[11px] font-normal text-muted">לחודש</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
