import { useMemo, useState } from 'react'
import Segmented from './Segmented'
import { addDays, toISODate } from '../../lib/dates'

export type Period = '7' | '30' | 'custom'

/**
 * Shared 7 / 30 / custom period control. Returns the current predicate for
 * filtering by date plus the ready-made control UI (segmented + date inputs).
 */
export function usePeriod(initial: Period = '30') {
  const [period, setPeriod] = useState<Period>(initial)
  const [from, setFrom] = useState(() => toISODate(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => toISODate(new Date()))

  const inPeriod = useMemo(() => {
    if (period === 'custom') {
      return (d: string) => (!from || d >= from) && (!to || d <= to)
    }
    const days = period === '7' ? 7 : 30
    const cutoff = toISODate(addDays(new Date(), -(days - 1)))
    return (d: string) => d >= cutoff
  }, [period, from, to])

  const controls = (
    <Segmented
      value={period}
      onChange={setPeriod}
      size="sm"
      options={[
        { value: '7', label: '7 ימים' },
        { value: '30', label: '30 ימים' },
        { value: 'custom', label: 'מותאם' },
      ]}
    />
  )

  const customInputs =
    period === 'custom' ? (
      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label">מתאריך</span>
          <input
            type="date"
            className="input text-sm"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label">עד תאריך</span>
          <input
            type="date"
            className="input text-sm"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
      </div>
    ) : null

  return { period, inPeriod, controls, customInputs }
}
