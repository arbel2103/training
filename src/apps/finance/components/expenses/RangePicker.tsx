import type { MonthKey } from '../../lib/types'
import { monthLabel } from '../../lib/date'

export type RangePreset = 3 | 6 | 12 | 'custom'

export interface RangeValue {
  preset: RangePreset
  from: MonthKey
  to: MonthKey
}

interface Props {
  value: RangeValue
  onChange: (v: RangeValue) => void
  monthOptions: MonthKey[] // לבחירת טווח מותאם
}

const presets: { id: RangePreset; label: string }[] = [
  { id: 3, label: '3 חודשים' },
  { id: 6, label: 'חצי שנה' },
  { id: 12, label: 'שנה' },
  { id: 'custom', label: 'מותאם' },
]

export function RangePicker({ value, onChange, monthOptions }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-xl bg-ink/5 p-1 gap-1">
        {presets.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange({ ...value, preset: p.id })}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              value.preset === p.id
                ? 'bg-surface text-ink shadow-soft'
                : 'text-muted hover:text-ink'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {value.preset === 'custom' && (
        <div className="flex items-center gap-2 text-sm">
          <select
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
          <span className="text-muted">עד</span>
          <select
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm"
          >
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
