import { describe, expect, it } from 'vitest'
import {
  computeStats,
  dayState,
  freezeLengthDays,
  isFrozen,
  lastNDays,
  openFreeze,
  todayProgress,
} from '../habitMath'
import type { GlobalFreeze, Habit } from '../types'

/** Days relative to a fixed 'today' so the tests read like a calendar. */
const TODAY = '2026-08-20'
const day = (offsetFromToday: number) => {
  const d = new Date(2026, 7, 20)
  d.setDate(d.getDate() + offsetFromToday)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    categoryId: 'c1',
    name: 'שתיית מים',
    order: 0,
    createdDate: day(-9),
    completions: {},
    frozenDays: {},
    ...over,
  }
}

/** Tick a run of days; offsets are relative to today. */
const tick = (...offsets: number[]): Record<string, true> =>
  Object.fromEntries(offsets.map((o) => [day(o), true]))

describe('computeStats — the spec example', () => {
  it('7 in a row, miss one, then two more → streak 2, rate 90%', () => {
    // created 10 days ago (day -9 … today is day 0 → 10 elapsed days incl. today)
    const h = habit({
      createdDate: day(-9),
      // days -9..-3 done (7), day -2 missed, days -1 and 0 done (2)
      completions: tick(-9, -8, -7, -6, -5, -4, -3, -1, 0),
    })
    const s = computeStats(h, [], TODAY)

    expect(s.currentStreak).toBe(2)
    expect(s.bestStreak).toBe(7)
    expect(s.doneDays).toBe(9)
    expect(s.countedDays).toBe(10)
    expect(s.rate).toBe(90)
  })
})

describe('streak rules', () => {
  it('a ticked run counts up', () => {
    const h = habit({ createdDate: day(-4), completions: tick(-4, -3, -2, -1, 0) })
    expect(computeStats(h, [], TODAY).currentStreak).toBe(5)
  })

  it('a missed non-frozen day resets to 0', () => {
    const h = habit({ createdDate: day(-3), completions: tick(-3, -2, 0) }) // -1 missed
    expect(computeStats(h, [], TODAY).currentStreak).toBe(1)
  })

  it('today untouched keeps yesterday’s streak alive (pending, not missed)', () => {
    const h = habit({ createdDate: day(-3), completions: tick(-3, -2, -1) }) // today blank
    const s = computeStats(h, [], TODAY)
    expect(s.currentStreak).toBe(3)
    expect(s.countedDays).toBe(3) // today is not counted against the rate yet
    expect(s.rate).toBe(100)
  })

  it('bestStreak remembers a longer past run', () => {
    const h = habit({
      createdDate: day(-6),
      completions: tick(-6, -5, -4, -3, -1), // 4-run, miss, then 1
    })
    const s = computeStats(h, [], TODAY)
    expect(s.bestStreak).toBe(4)
    expect(s.currentStreak).toBe(1)
  })
})

describe('per-habit freeze', () => {
  it('a frozen day neither breaks nor extends the streak', () => {
    const h = habit({
      createdDate: day(-3),
      completions: tick(-3, -2, 0), // -1 not ticked…
      frozenDays: { [day(-1)]: true }, // …but excused
    })
    const s = computeStats(h, [], TODAY)
    expect(s.currentStreak).toBe(3) // -3,-2, (skip -1), 0
    expect(s.countedDays).toBe(3) // the frozen day leaves the denominator
    expect(s.rate).toBe(100)
  })
})

describe('global freeze', () => {
  const freezes: GlobalFreeze[] = [{ start: day(-4), end: day(-2) }] // 3 days paused

  it('paused days drop out of the rate and preserve the streak', () => {
    const h = habit({
      createdDate: day(-6),
      completions: tick(-6, -5, -1, 0), // nothing during the freeze
    })
    const s = computeStats(h, freezes, TODAY)
    // counted: -6,-5,-1,0 (the 3 frozen days excluded) = 4, all done
    expect(s.countedDays).toBe(4)
    expect(s.rate).toBe(100)
    // streak: -6,-5, (freeze -4..-2 skipped), -1, 0 → 4
    expect(s.currentStreak).toBe(4)
  })

  it('an open freeze (end: null) runs through today', () => {
    const open: GlobalFreeze[] = [{ start: day(-1), end: null }]
    const h = habit({ createdDate: day(-3), completions: tick(-3, -2) })
    const s = computeStats(h, open, TODAY)
    // -1 and today are frozen → not missed, streak stays at 2
    expect(s.currentStreak).toBe(2)
    expect(dayState(h, TODAY, open, TODAY)).toBe('frozen')
  })

  it('isFrozen sees both a global range and a per-habit day', () => {
    const h = habit({ frozenDays: { [day(-5)]: true } })
    expect(isFrozen(day(-3), h, freezes)).toBe(true) // inside global range
    expect(isFrozen(day(-5), h, freezes)).toBe(true) // per-habit
    expect(isFrozen(day(-1), h, freezes)).toBe(false)
  })
})

describe('the freeze round-trip the user described', () => {
  it('resumes at exactly the same numbers after a multi-day freeze', () => {
    const before = habit({ createdDate: day(-5), completions: tick(-5, -4, -3) })
    const baseline = computeStats(before, [], day(-3)) // as of the day it froze
    expect(baseline.currentStreak).toBe(3)
    expect(baseline.rate).toBe(100)

    // gone for two days, then unfreeze — those days were globally frozen
    const freezes: GlobalFreeze[] = [{ start: day(-2), end: day(-1) }]
    const resumed = computeStats(before, freezes, TODAY)
    // no ticks were added and today is pending, so nothing changed
    expect(resumed.currentStreak).toBe(3)
    expect(resumed.rate).toBe(100)
    expect(resumed.countedDays).toBe(3) // the two frozen days never entered
  })
})

describe('lastNDays', () => {
  it('labels each of the 7 cells and ends on today', () => {
    const h = habit({
      createdDate: day(-3),
      completions: tick(-3, -1),
      frozenDays: { [day(-2)]: true },
    })
    const cells = lastNDays(h, [], TODAY, 7)
    expect(cells).toHaveLength(7)
    expect(cells[6].date).toBe(TODAY)
    expect(cells.map((c) => c.state)).toEqual([
      'before', // -6
      'before', // -5
      'before', // -4
      'done', // -3
      'frozen', // -2
      'done', // -1
      'pending', // today
    ])
  })
})

describe('todayProgress', () => {
  const freezes: GlobalFreeze[] = []
  it('counts ticked-today out of the live habits', () => {
    const habits = [
      habit({ id: 'a', completions: tick(0) }),
      habit({ id: 'b' }),
      habit({ id: 'c', completions: tick(0) }),
    ]
    expect(todayProgress(habits, freezes, TODAY)).toEqual({ done: 2, total: 3, pct: 67 })
  })

  it('excludes a habit frozen today from the denominator', () => {
    const habits = [
      habit({ id: 'a', completions: tick(0) }),
      habit({ id: 'b', frozenDays: { [TODAY]: true } }),
    ]
    expect(todayProgress(habits, freezes, TODAY)).toEqual({ done: 1, total: 1, pct: 100 })
  })

  it('excludes an archived or not-yet-created habit', () => {
    const habits = [
      habit({ id: 'a', completions: tick(0) }),
      habit({ id: 'b', archivedAt: '2026-08-01' }),
      habit({ id: 'c', createdDate: day(3) }), // starts in the future
    ]
    expect(todayProgress(habits, freezes, TODAY)).toEqual({ done: 1, total: 1, pct: 100 })
  })
})

describe('freeze helpers', () => {
  it('openFreeze finds the range still running', () => {
    const list: GlobalFreeze[] = [
      { start: day(-9), end: day(-8) },
      { start: day(-2), end: null },
    ]
    expect(openFreeze(list)?.start).toBe(day(-2))
    expect(openFreeze([{ start: day(-9), end: day(-8) }])).toBeUndefined()
  })

  it('freezeLengthDays counts inclusively and an open range runs to today', () => {
    expect(freezeLengthDays({ start: day(-2), end: day(-1) }, TODAY)).toBe(2)
    expect(freezeLengthDays({ start: day(-3), end: null }, TODAY)).toBe(4)
    expect(freezeLengthDays({ start: TODAY, end: null }, TODAY)).toBe(1)
  })
})
