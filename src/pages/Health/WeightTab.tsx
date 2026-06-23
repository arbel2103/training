import { useMemo, useState } from 'react'
import { useStore } from '../../store/useStore'
import {
  formatDayMonth,
  fromISO,
  HEB_DAYS,
  startOfWeek,
  toISODate,
  weekDays,
} from '../../lib/dates'
import LineChart from '../../components/ui/LineChart'

export default function WeightTab() {
  const weighIns = useStore((s) => s.weighIns)
  const addWeighIn = useStore((s) => s.addWeighIn)
  const removeWeighIn = useStore((s) => s.removeWeighIn)

  const today = toISODate(new Date())
  const [date, setDate] = useState(today)
  const [weight, setWeight] = useState<number | ''>('')

  const days = useMemo(() => weekDays(new Date()), [])
  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])

  const weekWeighIns = weighIns
    .filter((w) => w.date >= weekStart && w.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date))

  // weekly averages over time
  const chartData = useMemo(() => {
    const byWeek = new Map<string, number[]>()
    for (const w of weighIns) {
      const key = toISODate(startOfWeek(fromISO(w.date)))
      const arr = byWeek.get(key) ?? []
      arr.push(w.weight)
      byWeek.set(key, arr)
    }
    return [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([weekIso, arr]) => ({
        label: formatDayMonth(fromISO(weekIso)),
        value: arr.reduce((s, x) => s + x, 0) / arr.length,
      }))
  }, [weighIns])

  const save = () => {
    if (typeof weight !== 'number' || weight <= 0) return
    addWeighIn(date, weight)
    setWeight('')
    setDate(today)
  }

  return (
    <div className="grid gap-6">
      {/* add weigh-in */}
      <div className="card p-5">
        <h3 className="font-display text-xl font-bold mb-4">שקילה יומית</h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-40">
            <label className="label">משקל (ק״ג)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              className="input"
              value={weight}
              onChange={(e) =>
                setWeight(e.target.value === '' ? '' : Number(e.target.value))
              }
            />
          </div>
          <div className="w-44">
            <label className="label">תאריך</label>
            <input
              type="date"
              dir="ltr"
              className="input text-center"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <button onClick={save} className="btn-primary">
            הוסף שקילה
          </button>
        </div>
      </div>

      {/* current-week history */}
      <div className="card p-5">
        <h3 className="font-display text-xl font-bold mb-3">
          שקילות השבוע הנוכחי
        </h3>
        {weekWeighIns.length === 0 ? (
          <p className="text-muted text-sm">לא נרשמו שקילות השבוע.</p>
        ) : (
          <div className="grid gap-2">
            {weekWeighIns.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between border-b border-line last:border-0 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold w-16">{w.weight} ק״ג</span>
                  <span className="text-sm text-muted">
                    יום {HEB_DAYS[fromISO(w.date).getDay()]} · {formatDayMonth(fromISO(w.date))}
                  </span>
                </div>
                <button
                  onClick={() => removeWeighIn(w.id)}
                  className="text-muted hover:text-accent px-1"
                  aria-label="מחק"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* weekly-average chart */}
      <div className="card p-5">
        <h3 className="font-display text-xl font-bold mb-1">
          ממוצע משקל שבועי
        </h3>
        <p className="text-sm text-muted mb-4">נקודה לכל שבוע (ממוצע השקילות).</p>
        <LineChart data={chartData} unit=" ק״ג" />
      </div>
    </div>
  )
}
