import type { DayCell } from '../lib/types'
import { HEB_DAYS_SHORT } from '../../../lib/dates'
import { fromISO } from '../../../lib/dates'

/** The dot for each of the last 7 days: filled = done, ring = missed, etc. */
export default function MiniHistory({ cells }: { cells: DayCell[] }) {
  return (
    <div className="flex items-center gap-1.5">
      {cells.map((c) => (
        <span
          key={c.date}
          title={`${HEB_DAYS_SHORT[fromISO(c.date).getDay()]} · ${label[c.state]}`}
          className={`w-2.5 h-2.5 rounded-full ${dot[c.state]}`}
        />
      ))}
    </div>
  )
}

const dot: Record<DayCell['state'], string> = {
  done: 'bg-accent',
  missed: 'bg-run/25 ring-1 ring-inset ring-run/40',
  frozen: 'bg-bike/30 ring-1 ring-inset ring-bike/50',
  pending: 'border border-dashed border-muted/50',
  before: 'bg-line',
}

const label: Record<DayCell['state'], string> = {
  done: 'בוצע',
  missed: 'לא בוצע',
  frozen: 'מוקפא',
  pending: 'היום',
  before: 'לפני היצירה',
}
