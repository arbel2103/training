import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import Icon from '../../../components/ui/Icon'
import { addDays, fromISO, HEB_DAYS_SHORT, toISODate } from '../../../lib/dates'
import { useStore } from '../store/useStore'
import { dayState, computeStats } from '../lib/habitMath'
import type { Habit } from '../lib/types'
import Heatmap, { HeatmapLegend, type HeatCell } from './Heatmap'

type Mode = 'check' | 'freeze'

/**
 * Editing surface for one habit: fix past days (backfill a tick or excuse a
 * day for a one-off constraint), rename, or delete. The 28-day grid is where
 * the per-day freeze the spec asks for lives — a global freeze is one tap on
 * the main page, but excusing a single day belongs to a single habit.
 */
export default function HabitDetailModal({
  habit,
  today,
  onClose,
}: {
  habit: Habit
  today: string
  onClose: () => void
}) {
  const freezes = useStore((s) => s.freezes)
  const toggleCompletion = useStore((s) => s.toggleCompletion)
  const toggleDayFreeze = useStore((s) => s.toggleDayFreeze)
  const updateHabit = useStore((s) => s.updateHabit)
  const removeHabit = useStore((s) => s.removeHabit)

  const [mode, setMode] = useState<Mode>('check')
  const [name, setName] = useState(habit.name)

  const stats = computeStats(habit, freezes, today)

  // last 28 days, newest-last, grouped into weeks of 7 (RTL rows read right→left)
  const days = Array.from({ length: 28 }, (_, i) =>
    toISODate(addDays(fromISO(today), i - 27)),
  )

  // half a year for the heat map, so weekday patterns have room to show
  const heatCells: HeatCell[] = Array.from({ length: 26 * 7 }, (_, i) => {
    const date = toISODate(addDays(fromISO(today), i - (26 * 7 - 1)))
    const st = dayState(habit, date, freezes, today)
    return {
      date,
      pct: st === 'done' ? 1 : st === 'missed' ? 0 : null,
      frozen: st === 'frozen',
    }
  })

  const onDayTap = (date: string) => {
    if (date < habit.createdDate || date > today) return
    if (mode === 'check') toggleCompletion(habit.id, date)
    else toggleDayFreeze(habit.id, date)
  }

  return (
    <Modal open onClose={onClose} title={habit.name}>
      <div className="grid gap-4 min-w-0">
        {/* headline stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <Stat label="רצף נוכחי" value={`${stats.currentStreak}`} />
          <Stat label="שיא" value={`${stats.bestStreak}`} />
          <Stat label="אחוז ביצוע" value={stats.rate == null ? '—' : `${stats.rate}%`} />
        </div>

        {/* The long view. min-w-0 is load-bearing: a grid item defaults to
            min-width:auto, so without it the 26-week strip sets the modal's
            width instead of scrolling inside it, and the whole body — stats,
            calendar and all — slides sideways off a phone screen. */}
        <div className="min-w-0">
          <span className="label">חצי שנה אחרונה</span>
          <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            <Heatmap cells={heatCells} today={today} weeks={26} />
          </div>
          <div className="mt-2">
            <HeatmapLegend />
          </div>
        </div>

        {/* what a tap on the grid does */}
        <div className="min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="label mb-0">עריכת יומן (חודש אחרון)</span>
            <div className="inline-flex rounded-lg border border-line overflow-hidden text-xs">
              <button
                onClick={() => setMode('check')}
                className={`px-2.5 py-1 font-semibold ${mode === 'check' ? 'bg-accent text-white' : 'text-muted'}`}
              >
                סימון ✓
              </button>
              <button
                onClick={() => setMode('freeze')}
                className={`px-2.5 py-1 font-semibold ${mode === 'freeze' ? 'bg-bike text-white' : 'text-muted'}`}
              >
                הקפאת יום ❄️
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5" dir="rtl">
            {HEB_DAYS_SHORT.map((d, i) => (
              <div key={i} className="text-[10px] text-muted text-center">
                {d}
              </div>
            ))}
            {days.map((date) => {
              const st = dayState(habit, date, freezes, today)
              const editable = date >= habit.createdDate && date <= today
              return (
                <button
                  key={date}
                  onClick={() => onDayTap(date)}
                  disabled={!editable}
                  title={`${date}${st === 'frozen' ? ' · מוקפא' : ''}`}
                  className={`relative aspect-square rounded-lg grid place-items-center text-[10px] font-semibold transition ${cellClass(st)} ${
                    editable ? 'active:scale-95' : 'opacity-40 cursor-default'
                  }`}
                >
                  {fromISO(date).getDate()}
                  {/* a tint alone was indistinguishable from a missed day, so a
                      frozen day says so with a mark rather than a shade */}
                  {st === 'frozen' && (
                    <span className="absolute -top-1 -right-1 text-[9px] leading-none">
                      ❄️
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-muted mt-2 leading-relaxed">
            {mode === 'check'
              ? 'הקש על יום כדי לסמן/לבטל ביצוע.'
              : 'הקש על יום כדי להקפיא אותו — יום מוקפא לא נספר באחוזים ולא שובר רצף.'}
          </p>
        </div>

        {/* rename */}
        <div>
          <label className="label">שם ההרגל</label>
          <div className="flex gap-2">
            <input
              className="input flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && updateHabit(habit.id, { name: name.trim() })}
            />
          </div>
          <p className="text-xs text-muted mt-1.5">
            נוצר בתאריך {habit.createdDate}
          </p>
        </div>

        <button
          onClick={() => {
            if (window.confirm(`למחוק את "${habit.name}"? כל ההיסטוריה שלו תימחק.`)) {
              removeHabit(habit.id)
              onClose()
            }
          }}
          className="btn-ghost text-run gap-1.5 justify-center"
        >
          <Icon name="trash" className="w-4 h-4" /> מחיקת ההרגל
        </button>
      </div>
    </Modal>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-bg border border-line py-2.5">
      <div className="font-display text-2xl font-black leading-none">{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  )
}

function cellClass(state: ReturnType<typeof dayState>): string {
  switch (state) {
    case 'done':
      return 'bg-accent text-white'
    case 'missed':
      return 'bg-run/15 text-run'
    case 'frozen':
      return 'bg-bike/25 text-bike ring-2 ring-inset ring-bike/70'
    case 'pending':
      return 'border border-dashed border-muted/50 text-muted'
    default:
      return 'bg-line/60 text-muted'
  }
}
