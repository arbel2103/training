import { useState } from 'react'
import type { MonthKey } from '../../lib/types'
import { monthKey, monthLabel, parseMonthKey } from '../../lib/date'
import Icon from '../../../../components/ui/Icon'

const HE_MONTHS_SHORT = [
  'ינו',
  'פבר',
  'מרץ',
  'אפר',
  'מאי',
  'יונ',
  'יול',
  'אוג',
  'ספט',
  'אוק',
  'נוב',
  'דצמ',
]

interface Props {
  value: MonthKey
  onChange: (mk: MonthKey) => void
  importedMonths: Set<MonthKey>
}

export function MonthPicker({ value, onChange, importedMonths }: Props) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(parseMonthKey(value).year)
  const sel = parseMonthKey(value)

  return (
    <div className="relative">
      <button
        onClick={() => {
          setYear(parseMonthKey(value).year)
          setOpen((o) => !o)
        }}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium text-ink hover:bg-bg"
      >
        <Icon name="calendar" className="w-4 h-4 text-muted" />
        {monthLabel(value)}
        <Icon name="chevronDown" className="w-4 h-4 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute z-30 mt-2 w-72 rounded-2xl border border-line bg-surface p-3 shadow-card">
            <div className="mb-2 flex items-center justify-between">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="rounded-lg px-2 py-1 text-muted hover:bg-ink/5"
              >
                ‹
              </button>
              <span className="text-sm font-semibold">{year}</span>
              <button
                onClick={() => setYear((y) => y + 1)}
                className="rounded-lg px-2 py-1 text-muted hover:bg-ink/5"
              >
                ›
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {HE_MONTHS_SHORT.map((m, i) => {
                const mk = monthKey(year, i + 1)
                const isSel = sel.year === year && sel.month === i + 1
                const imported = importedMonths.has(mk)
                return (
                  <button
                    key={m}
                    onClick={() => {
                      onChange(mk)
                      setOpen(false)
                    }}
                    className={`relative rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                      isSel
                        ? 'bg-accent text-white'
                        : 'text-ink hover:bg-ink/5'
                    }`}
                  >
                    {m}
                    {imported && (
                      <span
                        className={`absolute top-1.5 left-1.5 h-2 w-2 rounded-full ${
                          isSel ? 'bg-surface' : 'bg-emerald-500'
                        }`}
                        title="נטענו נתונים"
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <div className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-muted">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              חודש שכבר נטענו אליו נתונים
            </div>
          </div>
        </>
      )}
    </div>
  )
}
