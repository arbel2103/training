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

export function MonthlyBarChart({ data, color = '#5f7f5f', height = 300 }: Props) {
  if (!data.length || data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted">
        אין נתונים בטווח שנבחר.
      </div>
    )
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
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
          cursor={{ fill: 'rgba(95,127,95,0.06)' }}
          formatter={(v) => [formatCurrency(Number(v), true), 'סכום']}
          contentStyle={{
            borderRadius: 12,
            border: '1px solid #e9e5db',
            fontSize: 13,
          }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={64}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.highlight ? '#3c523c' : color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
