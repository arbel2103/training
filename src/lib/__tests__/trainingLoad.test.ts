import { describe, expect, it } from 'vitest'
import type { WorkoutEntry } from '../../store/useStore'
import { computeAcwr, effortOf, loadOf } from '../trainingLoad'
import { addDays, toISODate } from '../dates'

const run = (over: Partial<WorkoutEntry> = {}): WorkoutEntry => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-08-01',
  category: 'aerobic',
  sport: 'run',
  distance: 10,
  paceSec: 300, // 10km @ 5:00/km → 50 min
  ...over,
})

describe('effortOf', () => {
  it('prefers an explicit RPE', () => {
    expect(effortOf(run({ rpe: 9, aerobicIntensity: 'easy' }))).toBe(9)
  })
  it('falls back to the intensity label', () => {
    expect(effortOf(run({ aerobicIntensity: 'easy' }))).toBe(3)
    expect(effortOf(run({ aerobicIntensity: 'intense' }))).toBe(8)
  })
  it('uses heart rate when no label or RPE', () => {
    const easy = effortOf(run({ avgHr: 120 }), 190)
    const hard = effortOf(run({ avgHr: 175 }), 190)
    expect(hard).toBeGreaterThan(easy)
    expect(easy).toBeGreaterThanOrEqual(1)
    expect(hard).toBeLessThanOrEqual(10)
  })
  it('rates strength by its intensity', () => {
    expect(effortOf({ ...run(), category: 'strength', sport: undefined, intensity: 'heavy' })).toBe(8)
  })
})

describe('loadOf', () => {
  it('is duration times effort', () => {
    // 10km at 5:00/km = 50 min, easy (3) → 150
    expect(loadOf(run({ aerobicIntensity: 'easy' }))).toBe(150)
  })
  it('is zero without a usable duration', () => {
    expect(loadOf(run({ distance: undefined, paceSec: undefined }))).toBe(0)
  })
})

describe('computeAcwr', () => {
  const today = new Date('2026-08-15T12:00:00')
  const at = (daysAgo: number) => toISODate(addDays(today, -daysAgo))

  it('returns null without any chronic load', () => {
    expect(computeAcwr([], today)).toBeNull()
  })

  it('flags a steady load as optimal', () => {
    // the same workout once every day for 28 days → acute ≈ chronic
    const log = Array.from({ length: 28 }, (_, i) =>
      run({ date: at(i), aerobicIntensity: 'easy' }),
    )
    const acwr = computeAcwr(log, today)!
    expect(acwr.ratio).toBeGreaterThan(0.8)
    expect(acwr.ratio).toBeLessThanOrEqual(1.3)
    expect(acwr.zone).toBe('optimal')
  })

  it('flags a sudden spike as dangerous', () => {
    const base = Array.from({ length: 28 }, (_, i) =>
      i < 7 ? run({ date: at(i), aerobicIntensity: 'intense' }) : run({ date: at(i), aerobicIntensity: 'easy' }),
    )
    // last week is much harder than the preceding three
    const acwr = computeAcwr(base, today)!
    expect(acwr.ratio).toBeGreaterThan(1.3)
    expect(['high', 'danger']).toContain(acwr.zone)
  })
})
