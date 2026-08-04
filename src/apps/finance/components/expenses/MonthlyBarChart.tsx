import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatCurrency } from '../../lib/format'
import { useChartDismiss } from '../../lib/useChartDismiss'

export interface BarPoint {
  label: string
  value: number
  highlight?: boolean
}

interface Props {
  data: BarPoint[]
  color?: string
  height?: number
}

export function MonthlyBarChart({ data, color = '#7C6FF2', height = 300 }: Props) {
  const { chartKey, containerProps } = useChartDismiss()
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        אין נתונים בטווח שנבחר.
      </div>
    )
  }
  return (
    <div {...containerProps}>
    <ResponsiveContainer key={chartKey} width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(140,140,150,0.18)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: '#6b6862' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#8f8c85' }}
          axisLine={false}
          tickLine={false}
          width={56}
          tickFormatter={(v) => formatCurrency(v)}
          orientation="right"
        />
        <Tooltip
          cursor={{ fill: 'rgba(124,111,242,0.10)' }}
          formatter={(v) => [formatCurrency(Number(v), true), 'סכום']}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgb(24 24 26 / 0.97)', color: '#ededf2',
            fontSize: 13,
          }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? '#5B4FDB' : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
    </div>
  )
}
