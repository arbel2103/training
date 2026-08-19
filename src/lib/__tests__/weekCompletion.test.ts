import { describe, expect, it } from 'vitest'
import type { PlanWeek, WorkoutEntry } from '../../store/useStore'
import { sessionIntensity, weekCompletion } from '../planMatch'

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

// the week from the report: two planned runs of very different length, and one
// short easy run logged on neither of their days
const runWeek: PlanWeek = {
  id: 'w2',
  weekStart: '2026-08-16',
  sessions: [
    // the long one first in the array — the order that used to decide it
    { id: 'run-10', day: 4, sport: 'run', distance: 10 },
    { id: 'run-4', day: 3, sport: 'run', distance: 4, label: 'קלה' },
  ],
}

const run = (over: Partial<WorkoutEntry>): WorkoutEntry => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-08-18',
  category: 'aerobic',
  sport: 'run',
  ...over,
})

describe('weekCompletion — matching by distance, not array order', () => {
  it('credits a 3 km run to the planned 4 km, not the planned 10 km', () => {
    const c = weekCompletion(runWeek, [run({ distance: 3 })])
    expect(c['run-4'].done).toBe(true)
    expect(c['run-10'].done).toBe(false)
  })

  it('credits a 9 km run to the planned 10 km', () => {
    const c = weekCompletion(runWeek, [run({ distance: 9 })])
    expect(c['run-10'].done).toBe(true)
    expect(c['run-4'].done).toBe(false)
  })

  it('assigns both runs to the session each one resembles', () => {
    const c = weekCompletion(runWeek, [
      run({ id: 'short', distance: 3 }),
      run({ id: 'long', distance: 11 }),
    ])
    expect(c['run-4'].entry?.id).toBe('short')
    expect(c['run-10'].entry?.id).toBe('long')
  })

  it('still matches when the log carries no distance at all', () => {
    const c = weekCompletion(runWeek, [run({})])
    const done = Object.values(c).filter((m) => m.done)
    expect(done).toHaveLength(1)
  })

  it('lets intensity break a tie between two equally-distant sessions', () => {
    const week: PlanWeek = {
      id: 'w3',
      weekStart: '2026-08-16',
      sessions: [
        { id: 'tempo', day: 2, sport: 'run', distance: 5, label: 'טמפו' },
        { id: 'easy', day: 4, sport: 'run', distance: 5, label: 'קלה' },
      ],
    }
    const c = weekCompletion(week, [
      run({ distance: 5, aerobicIntensity: 'easy', date: '2026-08-19' }),
    ])
    expect(c['easy'].done).toBe(true)
    expect(c['tempo'].done).toBe(false)
  })

  it('keeps distance in charge when intensity disagrees with it', () => {
    // planned 4 km tempo vs planned 10 km easy, and a 3 km easy run logged:
    // the short session is still the sensible home for it
    const week: PlanWeek = {
      id: 'w4',
      weekStart: '2026-08-16',
      sessions: [
        { id: 'short-hard', day: 2, sport: 'run', distance: 4, label: 'טמפו' },
        { id: 'long-easy', day: 4, sport: 'run', distance: 10, label: 'קלה' },
      ],
    }
    const c = weekCompletion(week, [
      run({ distance: 3, aerobicIntensity: 'easy', date: '2026-08-19' }),
    ])
    expect(c['short-hard'].done).toBe(true)
  })

  it('a same-day match still beats a better-sized one elsewhere in the week', () => {
    const c = weekCompletion(runWeek, [
      // logged on the 10 km session's own day (Thursday 2026-08-20)
      run({ id: 'onDay', distance: 3, date: '2026-08-20' }),
    ])
    expect(c['run-10'].entry?.id).toBe('onDay')
  })
})

describe('sessionIntensity', () => {
  it('reads the labels the coach actually writes', () => {
    expect(sessionIntensity('ארוכה')).toBe('long')
    expect(sessionIntensity('אינטרוולים')).toBe('intense')
    expect(sessionIntensity('טמפו')).toBe('intense')
    expect(sessionIntensity('ריצה קלה')).toBe('easy')
    expect(sessionIntensity('טכניקה')).toBe('technique')
  })

  it('has no opinion on a label it does not recognise', () => {
    expect(sessionIntensity('בריק')).toBeNull()
    expect(sessionIntensity('')).toBeNull()
    expect(sessionIntensity(undefined)).toBeNull()
  })
})
