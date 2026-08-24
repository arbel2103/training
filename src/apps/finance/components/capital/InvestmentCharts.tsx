import { AXIS_TICK, TOOLTIP_STYLE, chartColor } from '../../../../lib/chartPalette'
import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useStore } from '../../store/useStore'
import { Card } from '../ui/Card'
import { monthLabelShort } from '../../lib/date'
import { formatCurrency, formatPercent } from '../../lib/format'
import { monthIncome } from '../../store/selectors'
import { accountColor } from './investColors'
import { useChartDismiss } from '../../lib/useChartDismiss'
import InfoTip from '../../../../components/ui/InfoTip'

export function InvestmentCharts() {
  const { chartKey, containerProps } = useChartDismiss()
  const accounts = useStore((s) => s.accounts)
  const investments = useStore((s) => s.investments)
  const months = useStore((s) => s.months)

  const investMonths = useMemo(() => {
    const set = new Set<string>()
    investments.forEach((i) => set.add(i.monthKey))
    return [...set].sort()
  }, [investments])

  const colorByAccount = useMemo(() => {
    const map: Record<string, string> = {}
    accounts.forEach((a, i) => (map[a.id] = accountColor(i)))
    return map
  }, [accounts])

  // נתוני גרף ערימה — מפתח לכל חשבון
  const stackedData = useMemo(() => {
    return investMonths.map((mk) => {
      const row: Record<string, number | string> = { label: monthLabelShort(mk) }
      accounts.forEach((a) => {
        row[a.id] = investments
          .filter((inv) => inv.monthKey === mk && inv.accountId === a.id)
          .reduce((s, inv) => s + inv.amount, 0)
      })
      return row
    })
  }, [investMonths, accounts, investments])

  // נתוני אחוז מסך ההכנסות (משכורת + הכנסות נוספות)
  const percentData = useMemo(() => {
    return investMonths.map((mk) => {
      const total = investments
        .filter((inv) => inv.monthKey === mk)
        .reduce((s, inv) => s + inv.amount, 0)
      const income = monthIncome(months[mk])
      return {
        label: monthLabelShort(mk),
        value: income > 0 ? (total / income) * 100 : 0,
        hasSalary: income > 0,
      }
    })
  }, [investMonths, investments, months])

  if (investMonths.length === 0) {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-muted">
          עדיין לא תועדו השקעות. הוסף השקעה כדי לראות גרפים.
        </p>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-ink">
            השקעה חודשית לפי חשבון
          </h3>
          <InfoTip text="כמה הפקדת להשקעות בכל חודש, מפוצל לפי חשבון (כל צבע = חשבון אחר). גובה העמודה הוא סך ההפקדות של אותו חודש. הקש על עמודה לפירוט." />
        </div>
        <div {...containerProps}>
        <ResponsiveContainer key={chartKey} width="100%" height={240}>
          <BarChart
            data={stackedData}
            margin={{ top: 8, right: 4, left: 4, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(140,140,150,0.18)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: AXIS_TICK }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: AXIS_TICK }}
              axisLine={false}
              tickLine={false}
              width={52}
              orientation="right"
              tickFormatter={(v) => formatCurrency(v)}
            />
            <Tooltip
              formatter={(v, name) => [
                formatCurrency(Number(v), true),
                accounts.find((a) => a.id === name)?.name ?? String(name),
              ]}
              contentStyle={{
                ...TOOLTIP_STYLE,
                fontSize: 13,
              }}
            />
            <Legend
              formatter={(value) => accounts.find((a) => a.id === value)?.name ?? value}
              wrapperStyle={{ fontSize: 12 }}
            />
            {accounts.map((a) => (
              <Bar
                key={a.id}
                dataKey={a.id}
                stackId="invest"
                fill={colorByAccount[a.id]}
                radius={[3, 3, 0, 0]}
                maxBarSize={34}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-medium text-ink">
            השקעה כאחוז מסך ההכנסות
          </h3>
          <InfoTip text="איזה נתח מההכנסה החודשית (משכורת + הכנסות נוספות) הופנה להשקעות. אחוז גבוה יותר = שיעור חיסכון גבוה יותר. חודשים ללא הכנסה מוזנת מוצגים כ-0%." />
        </div>
        <div {...containerProps}>
        <ResponsiveContainer key={chartKey} width="100%" height={240}>
          <BarChart
            data={percentData}
            margin={{ top: 8, right: 4, left: 4, bottom: 4 }}
            barCategoryGap="22%"
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(140,140,150,0.18)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: AXIS_TICK }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: AXIS_TICK }}
              axisLine={false}
              tickLine={false}
              width={40}
              orientation="right"
              tickFormatter={(v) => `${Math.round(v)}%`}
            />
            <Tooltip
              formatter={(v) => [formatPercent(Number(v)), 'מסך ההכנסות']}
              contentStyle={{
                ...TOOLTIP_STYLE,
                fontSize: 13,
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={34}>
              {percentData.map((d, i) => (
                <Cell key={i} fill={d.hasSalary ? chartColor(2) : 'rgb(var(--muted))'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        </div>
        <p className="text-[11px] text-muted">
          האחוז מחושב מסך ההכנסות (משכורת + הכנסות נוספות) של אותו חודש. חודשים
          ללא הכנסה מוזנת מוצגים כ-0%. הזן הכנסות בדף ההוצאות.
        </p>
      </Card>
    </div>
  )
}
