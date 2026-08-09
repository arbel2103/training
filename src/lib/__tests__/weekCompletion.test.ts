import { describe, expect, it } from 'vitest'
import type { PlanWeek, WorkoutEntry } from '../../store/useStore'
import { weekCompletion } from '../planMatch'

// week of 2026-08-02 (Sunday): 08-02=Sun(0) … 08-08=Sat(6)
const week: PlanWeek = {
  id: 'w',
  weekStart: '2026-08-02',
  sessions: [
    { id: 's-strength-sun', day: 0, sport: 'strength', label: 'רגליים' },
    { id: 's-strength-wed', day: 3, sport: 'strength', label: 'פלג עליון' },
    { id: 's-run', day: 1, sport: 'run', distance: 10 },
  ],
}

const entry = (over: Partial<WorkoutEntry>): WorkoutEntry => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-08-02',
  category: 'strength',
  durationMin: 45,
  ...over,
})

describe('weekCompletion', () => {
  it('credits a same-day workout to the session on that day, not another same-sport session', () => {
    // one strength workout, logged on Sunday — must complete the Sunday session,
    // even though the Wednesday strength session comes later in the array
    const c = weekCompletion(week, [entry({ date: '2026-08-02' })])
    expect(c['s-strength-sun'].done).toBe(true)
    expect(c['s-strength-wed'].done).toBe(false)
  })

  it('credits the Wednesday session when the workout is logged on Wednesday', () => {
    const c = weekCompletion(week, [entry({ date: '2026-08-05' })])
    expect(c['s-strength-wed'].done).toBe(true)
    expect(c['s-strength-sun'].done).toBe(false)
  })

  it('still matches by sport week-wide when no same-day entry exists', () => {
    // strength workout on Tuesday matches neither strength day exactly — falls back
    const c = weekCompletion(week, [entry({ date: '2026-08-04' })])
    const doneIds = Object.entries(c).filter(([, m]) => m.done).map(([id]) => id)
    expect(doneIds).toHaveLength(1)
    expect(doneIds[0]).toMatch(/^s-strength-/)
  })

  it('consumes each entry once, completing both same-sport days when both are logged', () => {
    const c = weekCompletion(week, [
      entry({ date: '2026-08-02' }),
      entry({ date: '2026-08-05' }),
    ])
    expect(c['s-strength-sun'].done).toBe(true)
    expect(c['s-strength-wed'].done).toBe(true)
    expect(c['s-run'].done).toBe(false)
  })

  it('prefers the Garmin activity over a manual placeholder on the same day', () => {
    const c = weekCompletion(week, [
      entry({ id: 'manual', date: '2026-08-05', source: 'manual' }),
      entry({ id: 'garmin', date: '2026-08-05', source: 'garmin' }),
    ])
    expect(c['s-strength-wed'].entry?.id).toBe('garmin')
  })
})
