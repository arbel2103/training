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
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
      <div className="flex items-center gap-3">
        {/* today's checkbox */}
        <button
          onClick={() => !frozenToday && toggleCompletion(habit.id, today)}
          disabled={frozenToday}
          aria-pressed={doneToday}
          aria-label={doneToday ? 'בטל ביצוע היום' : 'סמן שבוצע היום'}
          className={`shrink-0 w-9 h-9 rounded-xl grid place-items-center border-2 transition active:scale-90 ${
            doneToday
              ? 'bg-accent border-accent text-white'
              : frozenToday
                ? 'border-bike/40 bg-bike/10 text-bike cursor-default'
                : 'border-line text-transparent hover:border-accent'
          }`}
        >
          {frozenToday && !doneToday ? (
            <span className="text-sm">❄️</span>
          ) : (
            <Icon name="check" className="w-5 h-5" />
          )}
        </button>

        {/* name + streak line */}
        <button onClick={() => setDetail(true)} className="flex-1 min-w-0 text-start">
          <div className="font-semibold truncate">{habit.name}</div>
          <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
            <span className="inline-flex items-center gap-1 text-accent font-semibold">
              <span>🔥</span>
              {stats.currentStreak}
            </span>
            <span className="text-muted/70">שיא {stats.bestStreak}</span>
            {stats.rate != null && <span className="text-muted/70">· {stats.rate}%</span>}
          </div>
        </button>

        {/* 7-day history — hidden on the narrowest phones, shown below instead */}
        <div className="shrink-0 hidden min-[380px]:block">
          <MiniHistory cells={cells} />
        </div>

        <button
          onClick={() => setDetail(true)}
          className="shrink-0 text-muted hover:text-ink w-8 h-8 grid place-items-center rounded-lg"
          aria-label="פרטים ועריכה"
        >
          <Icon name="edit" className="w-4 h-4" />
        </button>
      </div>

      {/* on very narrow screens the dots move to their own line so nothing clips */}
      <div className="min-[380px]:hidden ps-12 mt-2">
        <MiniHistory cells={cells} />
      </div>

      {detail && (
        <HabitDetailModal habit={habit} today={today} onClose={() => setDetail(false)} />
      )}
    </div>
  )
}
