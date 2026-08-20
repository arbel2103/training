import { describe, expect, it } from 'vitest'
import {
  carbLoad,
  daysToRace,
  isTaperWeek,
  recentPaces,
  taperRules,
  taperVolume,
  weekLoadMin,
} from '../taper'
import type { PlanWeek, WorkoutEntry } from '../../store/useStore'

const week = (weekStart: string, label: string, runs: number[]): PlanWeek => ({
  id: weekStart,
  weekStart,
  label,
  sessions: runs.map((distance, i) => ({
    id: `${weekStart}-${i}`,
    day: i,
    sport: 'run' as const,
    distance,
  })),
})

describe('isTaperWeek', () => {
  it('recognises how the coach labels a taper', () => {
    expect(isTaperWeek({ label: 'שבוע 8 — טייפר' })).toBe(true)
    expect(isTaperWeek({ label: 'Taper week' })).toBe(true)
    expect(isTaperWeek({ label: 'שבוע 3', focus: 'טייפר לקראת המרוץ' })).toBe(true)
  })

  it('leaves an ordinary week alone', () => {
    expect(isTaperWeek({ label: 'שבוע 2 — בסיס' })).toBe(false)
    expect(isTaperWeek({})).toBe(false)
  })
})

describe('taperVolume', () => {
  const build = [week('2026-08-02', 'בסיס', [10, 10]), week('2026-08-09', 'בנייה', [10, 10])]

  it('reports a proper 40–60% cut as on target', () => {
    const taper = week('2026-08-16', 'טייפר', [10]) // half the volume
    const v = taperVolume(taper, [...build, taper], [])
    expect(v?.onTarget).toBe(true)
    expect(v?.ratio).toBeCloseTo(0.5)
  })

  it('flags a taper that barely came down', () => {
    const taper = week('2026-08-16', 'טייפר', [10, 8])
    const v = taperVolume(taper, [...build, taper], [])
    expect(v?.tooHigh).toBe(true)
    expect(v?.onTarget).toBe(false)
  })

  it('ignores other taper weeks when working out the baseline', () => {
    const earlierTaper = week('2026-08-09', 'טייפר ביניים', [4])
    const taper = week('2026-08-16', 'טייפר', [10])
    const v = taperVolume(taper, [build[0], earlierTaper, taper], [])
    // baseline comes from the build week only, not the other taper
    expect(v?.baselineMin).toBe(weekLoadMin(build[0].sessions, []))
  })

  it('says nothing when there is no week to compare against', () => {
    const taper = week('2026-08-16', 'טייפר', [10])
    expect(taperVolume(taper, [taper], [])).toBeNull()
  })
})

describe('carbLoad', () => {
  it('loads hard only in the final window', () => {
    expect(carbLoad(70, true).perKg).toEqual({ low: 8, high: 10 })
    expect(carbLoad(70, false).perKg).toEqual({ low: 5, high: 7 })
  })

  it('converts to grams when a body weight is known', () => {
    expect(carbLoad(70, true).grams).toEqual({ low: 560, high: 700 })
  })

  it('stays in g/kg when no weigh-in exists', () => {
    expect(carbLoad(null, true).grams).toBeNull()
  })
})

describe('daysToRace', () => {
  it('counts the days left', () => {
    expect(daysToRace('2026-08-17', '2026-08-20')).toBe(3)
    expect(daysToRace('2026-08-20', '2026-08-20')).toBe(0)
  })

  it('is null with no race, or once it is behind you', () => {
    expect(daysToRace('2026-08-17', undefined)).toBeNull()
    expect(daysToRace('2026-08-21', '2026-08-20')).toBeNull()
  })
})

describe('recentPaces', () => {
  const log: WorkoutEntry[] = [
    { id: '1', date: '2026-08-10', category: 'aerobic', sport: 'run', distance: 10, durationMin: 55 },
    { id: '2', date: '2026-08-12', category: 'aerobic', sport: 'run', distance: 8, durationMin: 44 },
    { id: '3', date: '2026-08-14', category: 'aerobic', sport: 'run', distance: 5, durationMin: 27 },
    { id: '4', date: '2026-06-01', category: 'aerobic', sport: 'bike', distance: 40, durationMin: 80 },
  ]

  it('reports only sports actually trained in the window', () => {
    const paces = recentPaces(log, '2026-08-01')
    expect(paces.map((p) => p.sport)).toEqual(['run'])
    expect(paces[0].easyMinPerUnit).toBeCloseTo(5.5, 1)
  })

  it('returns nothing when the window is empty', () => {
    expect(recentPaces(log, '2026-09-01')).toEqual([])
  })
})

describe('taperRules', () => {
  it('always warns against trying something new on the day', () => {
    expect(taperRules(null).join(' ')).toContain('שום דבר חדש')
  })

  it('adds the race-morning rehearsal only in the last days', () => {
    expect(taperRules(10).join(' ')).not.toContain('שגרת הבוקר')
    expect(taperRules(2).join(' ')).toContain('שגרת הבוקר')
  })
})
