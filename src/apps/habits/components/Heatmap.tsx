import { HEB_DAYS_SHORT, addDays, fromISO, toISODate } from '../../../lib/dates'

export interface HeatCell {
  date: string
  /** 0–1 done share, or null for a day that does not count (frozen / pre-habit) */
  pct: number | null
  frozen?: boolean
}

/**
 * A calendar heat map: one column per week, one row per weekday.
 *
 * Columns run right-to-left so the newest week sits where an RTL reader starts,
 * and the grid is built from whole weeks so the weekday rows line up — a run of
 * misses on the same weekday is the pattern this is here to make visible, and
 * that only shows if the rows are honest.
 */
export default function Heatmap({
  cells,
  weeks = 13,
  today,
  onDayTap,
}: {
  cells: HeatCell[]
  weeks?: number
  today: string
  onDayTap?: (date: string) => void
}) {
  const byDate = new Map(cells.map((c) => [c.date, c]))

  // end on the Saturday of this week so the last column is a full week
  const end = addDays(fromISO(today), 6 - fromISO(today).getDay())
  const start = addDays(end, -(weeks * 7 - 1))

  // built oldest-first so the weekday rows line up, then rendered newest-first:
  // in RTL the row starts at the right, and the newest week is what you want to
  // land on before scrolling back through history
  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => toISODate(addDays(start, w * 7 + d))),
  ).reverse()

  return (
    <div className="flex gap-1" dir="rtl">
      {/* weekday labels sit at the right, where an RTL row begins */}
      <div className="flex flex-col gap-1 shrink-0">
        {HEB_DAYS_SHORT.map((d, i) => (
          <div
            key={i}
            className="h-3 text-[9px] leading-3 text-muted/70 text-center w-4"
          >
            {i % 2 === 0 ? d : ''}
          </div>
        ))}
      </div>

      {columns.map((week, i) => (
        <div key={i} className="flex flex-col gap-1 shrink-0">
          {week.map((date) => {
            const cell = byDate.get(date)
            const future = date > today
            return (
              <button
                key={date}
                disabled={future || !onDayTap}
                onClick={() => onDayTap?.(date)}
                title={`${date}${
                  cell?.pct == null
                    ? cell?.frozen
                      ? ' · מוקפא'
                      : ''
                    : ` · ${Math.round(cell.pct * 100)}%`
                }`}
                className={`w-3 h-3 rounded-[3px] grid place-items-center ${tone(
                  cell,
                  future,
                )} ${onDayTap && !future ? 'active:scale-90 transition' : ''}`}
              >
                {/* a frozen day is marked, not shaded: another tint in a grid
                    of tints is one more colour to decode, while a snowflake
                    says what it is at a glance */}
                {!future && cell?.pct == null && cell?.frozen && (
                  <span className="text-[8px] leading-none text-bike">❄</span>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Five steps of accent, plus distinct looks for frozen / empty / future. */
function tone(cell: HeatCell | undefined, future: boolean): string {
  if (future) return 'bg-transparent'
  if (!cell || cell.pct == null)
    // frozen days carry a snowflake instead of a fill, so the cell itself
    // stays clear and the mark is what reads
    return cell?.frozen ? 'bg-transparent' : 'bg-line/50'
  if (cell.pct === 0) return 'bg-run/20 ring-1 ring-inset ring-run/30'
  if (cell.pct < 0.34) return 'bg-accent/25'
  if (cell.pct < 0.67) return 'bg-accent/50'
  if (cell.pct < 1) return 'bg-accent/75'
  return 'bg-accent'
}

/** The shared key, so the colours are readable without guessing. */
export function HeatmapLegend() {
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted">
      <span>פחות</span>
      <span className="w-3 h-3 rounded-[3px] bg-run/20 ring-1 ring-inset ring-run/30" />
      <span className="w-3 h-3 rounded-[3px] bg-accent/25" />
      <span className="w-3 h-3 rounded-[3px] bg-accent/50" />
      <span className="w-3 h-3 rounded-[3px] bg-accent/75" />
      <span className="w-3 h-3 rounded-[3px] bg-accent" />
      <span>יותר</span>
      <span className="w-3 h-3 grid place-items-center ms-1.5 text-[9px] leading-none text-bike">
        ❄
      </span>
      <span>מוקפא</span>
    </div>
  )
}
