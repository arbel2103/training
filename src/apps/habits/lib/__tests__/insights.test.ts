import { describe, expect, it } from 'vitest'
import {
  MIN_GROUP,
  buildDayFacts,
  compare,
  coverage,
  dailyCompletion,
  findInsights,
  type DayFacts,
  type HealthDay,
} from '../insights'
import type { GlobalFreeze, Habit } from '../types'

const day = (n: number) => {
  const d = new Date(2026, 0, 1 + n)
  return `2026-01-${String(d.getDate()).padStart(2, '0')}`
}

function habit(over: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    categoryId: 'c1',
    name: 'שתיית מים',
    order: 0,
    createdDate: day(0),
    completions: {},
    frozenDays: {},
    ...over,
  }
}

/** n days of facts, alternating a condition, so groups are easy to size. */
function facts(n: number, f: (i: number) => Partial<DayFacts>): DayFacts[] {
  return Array.from({ length: n }, (_, i) => ({
    date: day(i),
    habitPct: null,
    trained: false,
    trainingMin: 0,
    ...f(i),
  }))
}

describe('compare', () => {
  it('reports the gap between the two groups', () => {
    const days = facts(20, (i) => ({ sleepScore: i % 2 === 0 ? 80 : 70 }))
    const c = compare(days, (d) => d.sleepScore === 80, (d) => d.sleepScore, { subject: 'x', metric: 'ציון שינה', unit: '', higherIsBetter: true, withLabel: 'כן', withoutLabel: 'לא' })

    expect(c).toMatchObject({ withAvg: 80, withoutAvg: 70, delta: 10, withN: 10, withoutN: 10 })
  })

  it('stays silent when one side is too small to mean anything', () => {
    // only 3 "yes" days — below the floor, so no finding at all
    const days = facts(20, (i) => ({ sleepScore: i < 3 ? 90 : 60 }))
    const c = compare(days, (d) => (d.sleepScore ?? 0) > 80, (d) => d.sleepScore, { subject: 'x', metric: 'ציון שינה', unit: '', higherIsBetter: true, withLabel: 'כן', withoutLabel: 'לא' })

    expect(c).toBeNull()
  })

  it('needs both sides, not just a big total', () => {
    const days = facts(50, () => ({ sleepScore: 70 }))
    expect(
      compare(days, () => true, (d) => d.sleepScore, { subject: 'x', metric: 'y', unit: '', higherIsBetter: true, withLabel: 'כן', withoutLabel: 'לא' }),
    ).toBeNull()
  })

  it('skips days the split marks as not applicable', () => {
    const days = facts(20, (i) => ({ sleepScore: i % 2 === 0 ? 80 : 70 }))
    // exclude the first 10 days entirely
    const c = compare(
      days,
      (d, ) => (d.date <= day(9) ? null : d.sleepScore === 80),
      (d) => d.sleepScore,
      { subject: 'x', metric: 'y', unit: '', higherIsBetter: true, withLabel: 'כן', withoutLabel: 'לא' },
    )
    expect(c!.withN + c!.withoutN).toBe(10)
  })

  it('ignores days where the measurement is missing', () => {
    const days = facts(20, (i) => ({ sleepScore: i < 10 ? 80 : undefined }))
    expect(
      compare(days, (d) => d.sleepScore != null, (d) => d.sleepScore, { subject: 'x', metric: 'y', unit: '', higherIsBetter: true, withLabel: 'כן', withoutLabel: 'לא' }),
    ).toBeNull() // every day with a value is on the same side
  })
})

describe('buildDayFacts', () => {
  const health: HealthDay[] = [
    { date: day(0), sleepScore: 80, sleepMin: 420, restingHr: 50, hrvLastNight: 60 },
    { date: day(1), sleepScore: 70 },
  ]

  it('lines habits up against the health day', () => {
    const h = habit({ completions: { [day(0)]: true } })
    const out = buildDayFacts([h], [], health, [], day(5))

    expect(out[0]).toMatchObject({ date: day(0), habitPct: 1, sleepScore: 80 })
    expect(out[1]).toMatchObject({ date: day(1), habitPct: 0 })
  })

  it('adds days that only have a workout', () => {
    const out = buildDayFacts([], [], [], [{ date: day(3), durationMin: 45 }], day(5))
    expect(out).toEqual([
      expect.objectContaining({ date: day(3), trained: true, trainingMin: 45 }),
    ])
  })

  it('sums several workouts in one day', () => {
    const out = buildDayFacts(
      [],
      [],
      [],
      [
        { date: day(3), durationMin: 45 },
        { date: day(3), durationMin: 30 },
      ],
      day(5),
    )
    expect(out[0].trainingMin).toBe(75)
  })

  it('leaves a frozen day out of the habit share', () => {
    const h = habit({ frozenDays: { [day(0)]: true } })
    const out = buildDayFacts([h], [], health, [], day(5))
    expect(out[0].habitPct).toBeNull() // excused, so not evidence either way
  })

  it('ignores a habit on days before it existed', () => {
    const h = habit({ createdDate: day(1) })
    const out = buildDayFacts([h], [], health, [], day(5))
    expect(out[0].habitPct).toBeNull()
    expect(out[1].habitPct).toBe(0)
  })

  it('never reports days in the future', () => {
    const out = buildDayFacts([], [], [{ date: day(9), sleepScore: 90 }], [], day(5))
    expect(out).toEqual([])
  })
})

describe('findInsights', () => {
  it('surfaces a habit whose days sleep better, with both sides sized', () => {
    const h = habit({
      completions: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [day(i * 2), true]),
      ),
    })
    const health: HealthDay[] = Array.from({ length: 20 }, (_, i) => ({
      date: day(i),
      sleepScore: i % 2 === 0 ? 85 : 70,
    }))

    const out = findInsights(buildDayFacts([h], [], health, [], day(25)), [h], [])
    const sleep = out.find((c) => c.subject === 'שתיית מים' && c.metric === 'ציון שינה')

    expect(sleep).toMatchObject({ withAvg: 85, withoutAvg: 70, delta: 15 })
    expect(sleep!.withN).toBeGreaterThanOrEqual(MIN_GROUP)
    expect(sleep!.withoutN).toBeGreaterThanOrEqual(MIN_GROUP)
  })

  it('says nothing at all when there is barely any data', () => {
    const h = habit({ completions: { [day(0)]: true } })
    const health: HealthDay[] = [{ date: day(0), sleepScore: 90 }]
    expect(findInsights(buildDayFacts([h], [], health, [], day(2)), [h], [])).toEqual([])
  })

  it('compares habit adherence on training days against rest days', () => {
    const h = habit({
      completions: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [day(i * 2), true]),
      ),
    })
    const health: HealthDay[] = Array.from({ length: 20 }, (_, i) => ({ date: day(i) }))
    const workouts = Array.from({ length: 10 }, (_, i) => ({
      date: day(i * 2),
      durationMin: 60,
    }))

    const out = findInsights(
      buildDayFacts([h], [], health, workouts, day(25)),
      [h],
      [],
    )
    const training = out.find((c) => c.subject === 'ימי אימון')

    expect(training).toMatchObject({ withAvg: 100, withoutAvg: 0, unit: '%' })
  })

  it('orders findings by how big the difference is', () => {
    const health: HealthDay[] = Array.from({ length: 20 }, (_, i) => ({
      date: day(i),
      sleepScore: i % 2 === 0 ? 90 : 60,
      restingHr: i % 2 === 0 ? 50 : 51,
    }))
    const h = habit({
      completions: Object.fromEntries(
        Array.from({ length: 10 }, (_, i) => [day(i * 2), true]),
      ),
    })

    const out = findInsights(buildDayFacts([h], [], health, [], day(25)), [h], [])
    const deltas = out.map((c) => Math.abs(c.delta))
    expect(deltas).toEqual([...deltas].sort((a, b) => b - a))
  })
})

describe('dailyCompletion', () => {
  it('gives a share per day across the range', () => {
    const a = habit({ id: 'a', completions: { [day(0)]: true } })
    const b = habit({ id: 'b', name: 'b' })
    const out = dailyCompletion([a, b], [], day(0), day(1))

    expect(out).toEqual([
      { date: day(0), pct: 0.5, frozen: false },
      { date: day(1), pct: 0, frozen: false },
    ])
  })

  it('marks globally frozen days so they can be drawn differently', () => {
    const freezes: GlobalFreeze[] = [{ start: day(1), end: day(1) }]
    const out = dailyCompletion([habit()], freezes, day(0), day(2))

    expect(out.map((d) => d.frozen)).toEqual([false, true, false])
    expect(out[1].pct).toBeNull() // excused, not a zero
  })

  it('returns null before any habit existed, so empty days are not failures', () => {
    const out = dailyCompletion([habit({ createdDate: day(5) })], [], day(0), day(1))
    expect(out.every((d) => d.pct === null)).toBe(true)
  })
})

describe('coverage', () => {
  it('counts what data is actually there, for the empty state', () => {
    const days = facts(10, (i) => ({
      habitPct: i < 6 ? 1 : null,
      sleepScore: i < 3 ? 80 : undefined,
    }))
    expect(coverage(days)).toEqual({ withHabits: 6, withSleep: 3 })
  })
})
