import { useState } from 'react'
import Icon from '../../../components/ui/Icon'
import { useStore } from '../store/useStore'
import { computeStats, isFrozen, lastNDays } from '../lib/habitMath'
import type { GlobalFreeze, Habit } from '../lib/types'
import MiniHistory from './MiniHistory'
import HabitDetailModal from './HabitDetailModal'

/** One habit: today's checkbox, streak/best/rate, and the 7-day dot strip. */
export default function HabitRow({
  habit,
  freezes,
  today,
}: {
  habit: Habit
  freezes: GlobalFreeze[]
  today: string
}) {
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const [detail, setDetail] = useState(false)

  const stats = computeStats(habit, freezes, today)
  const cells = lastNDays(habit, freezes, today, 7)
  const doneToday = habit.completions[today] === true
  const frozenToday = isFrozen(today, habit, freezes)

  return (
    /* one line, never wrapping and never wider than the card: the edit button
       is the only way into delete, so it must survive any name length on any
       phone — overflow-hidden plus a shrinkable middle guarantees that */
    <div
      data-habit-row
      className="rounded-xl border border-line bg-surface px-2.5 py-1.5 overflow-hidden"
    >
      <div className="flex items-center gap-2">
        {/* today's checkbox */}
        <button
          onClick={() => !frozenToday && toggleCompletion(habit.id, today)}
          disabled={frozenToday}
          aria-pressed={doneToday}
          aria-label={doneToday ? 'בטל ביצוע היום' : 'סמן שבוצע היום'}
          className={`shrink-0 w-8 h-8 rounded-lg grid place-items-center border-2 transition active:scale-90 ${
            doneToday
              ? 'bg-accent border-accent text-white'
              : frozenToday
                ? 'border-bike/40 bg-bike/10 text-bike cursor-default'
                : 'border-line text-transparent hover:border-accent'
          }`}
        >
          {frozenToday && !doneToday ? (
            <span className="text-xs">❄️</span>
          ) : (
            <Icon name="check" className="w-4 h-4" />
          )}
        </button>

        {/* name + streak line — the only part allowed to shrink */}
        <button
          onClick={() => setDetail(true)}
          className="flex-1 min-w-0 text-start py-0.5"
        >
          <div className="font-semibold text-sm truncate leading-tight">{habit.name}</div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted leading-tight truncate">
            <span className="inline-flex items-center gap-0.5 text-accent font-semibold">
              🔥{stats.currentStreak}
            </span>
            <span className="text-muted/70">שיא {stats.bestStreak}</span>
            {stats.rate != null && <span className="text-muted/70">· {stats.rate}%</span>}
          </div>
        </button>

        <div className="shrink-0">
          <MiniHistory cells={cells} />
        </div>

        <button
          onClick={() => setDetail(true)}
          className="shrink-0 text-muted hover:text-ink w-7 h-7 grid place-items-center rounded-lg"
          aria-label="פרטים ועריכה"
        >
          <Icon name="edit" className="w-4 h-4" />
        </button>
      </div>

      {detail && (
        <HabitDetailModal habit={habit} today={today} onClose={() => setDetail(false)} />
      )}
    </div>
  )
}
