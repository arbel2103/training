import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { Card } from '../ui/Card'
import Icon from '../../../../components/ui/Icon'
import { monthLabel } from '../../lib/date'
import { formatCurrency } from '../../lib/format'

export function InvestmentHistory() {
  const investments = useStore((s) => s.investments)
  const accounts = useStore((s) => s.accounts)
  const removeInvestment = useStore((s) => s.removeInvestment)

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? 'חשבון שנמחק'

  // קיבוץ לפי חודש, מהחדש לישן
  const grouped = useMemo(() => {
    const byMonth: Record<string, typeof investments> = {}
    for (const inv of investments) {
      ;(byMonth[inv.monthKey] ??= []).push(inv)
    }
    return Object.entries(byMonth).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [investments])

  if (investments.length === 0) {
    return null
  }

  return (
    <Card padded={false}>
      <h3 className="px-5 py-4 text-sm font-medium text-ink">
        היסטוריית השקעות
      </h3>
      <div className="divide-y divide-line">
        {grouped.map(([mk, list]) => {
          const total = list.reduce((s, i) => s + i.amount, 0)
          return (
            <div key={mk} className="px-5 py-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-semibold text-ink-800">
                  {monthLabel(mk)}
                </span>
                <span className="text-sm text-muted num">
                  {formatCurrency(total)}
                </span>
              </div>
              <div className="space-y-1">
                {list.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg bg-bg px-3 py-1.5 text-sm"
                  >
                    <span className="text-ink">{accountName(inv.accountId)}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-medium num">
                        {formatCurrency(inv.amount)}
                      </span>
                      <button
                        onClick={() => removeInvestment(inv.id)}
                        className="text-ink-300 hover:text-red-500"
                        title="מחיקה"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
