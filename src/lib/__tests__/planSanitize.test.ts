import { describe, expect, it } from 'vitest'
import { sanitizePlan, sanitizePlanWeek, weekStartOf } from '../planSanitize'
import { weekCompletion } from '../planMatch'
import type { PlanWeek } from '../../store/useStore'

describe('weekStartOf', () => {
  it('snaps a date to the Sunday of its week', () => {
    expect(weekStartOf('2026-08-23')).toBe('2026-08-23') // already a Sunday
    expect(weekStartOf('2026-08-26')).toBe('2026-08-23') // Wednesday
  })

  it('rejects anything that is not an ISO date', () => {
    for (const bad of [undefined, null, 42, '', '23.8', '2026-8-23', {}])
      expect(weekStartOf(bad)).toBeNull()
  })
})

describe('sanitizePlanWeek', () => {
  it('drops a week with no usable weekStart — the crash that started this', () => {
    expect(sanitizePlanWeek({ sessions: [] })).toBeNull()
    expect(sanitizePlanWeek({ weekStart: '23.8', sessions: [] })).toBeNull()
    expect(sanitizePlanWeek(null)).toBeNull()
  })

  it('snaps a mid-week start to its Sunday and keeps the sessions', () => {
    const w = sanitizePlanWeek({
      weekStart: '2026-08-26',
      label: 'שבוע 1',
      sessions: [{ day: 2, sport: 'run', distance: 8 }],
    })
    expect(w?.weekStart).toBe('2026-08-23')
    expect(w?.label).toBe('שבוע 1')
    expect(w?.sessions).toHaveLength(1)
  })

  it('mints ids for weeks and sessions that arrive without one', () => {
    const w = sanitizePlanWeek({
      weekStart: '2026-08-23',
      sessions: [{ day: 0, sport: 'swim' }],
    })
    expect(w?.id).toBeTruthy()
    expect(w?.sessions[0].id).toBeTruthy()
  })

  it('repairs the fields models get almost right', () => {
    const w = sanitizePlanWeek({
      weekStart: '2026-08-23',
      sessions: [
        { day: '3', sport: 'run', distance: '12', durationMin: '75' },
        { day: 9, sport: 'brick' }, // out of range day, unknown sport
        { day: 1, sport: 'bike', distance: 0, durationMin: -5 },
      ],
    })
    expect(w?.sessions[0]).toMatchObject({ day: 3, distance: 12, durationMin: 75 })
    expect(w?.sessions[1]).toMatchObject({ day: 6, sport: 'other' })
    // a zero/negative measurement is noise, not data
    expect(w?.sessions[2].distance).toBeUndefined()
    expect(w?.sessions[2].durationMin).toBeUndefined()
  })

  it('drops a session that cannot be placed on a day', () => {
    const w = sanitizePlanWeek({
      weekStart: '2026-08-23',
      sessions: [{ sport: 'run' }, { day: 'שני', sport: 'run' }, { day: 4, sport: 'run' }],
    })
    expect(w?.sessions).toHaveLength(1)
    expect(w?.sessions[0].day).toBe(4)
  })

  it('tolerates a missing sessions array', () => {
    expect(sanitizePlanWeek({ weekStart: '2026-08-23' })?.sessions).toEqual([])
  })
})

describe('sanitizePlan', () => {
  it('keeps the good weeks and drops only the broken one', () => {
    const plan = sanitizePlan({
      raceName: 'טריאתלון',
      raceDate: '2026-11-20',
      weeks: [
        { weekStart: '2026-08-23', sessions: [{ day: 0, sport: 'run' }] },
        { sessions: [{ day: 1, sport: 'bike' }] }, // no weekStart
        { weekStart: '2026-08-30', sessions: [{ day: 2, sport: 'swim' }] },
      ],
    })
    expect(plan?.weeks.map((w) => w.weekStart)).toEqual(['2026-08-23', '2026-08-30'])
    expect(plan?.raceName).toBe('טריאתלון')
  })

  it('merges two weeks that land on the same Sunday instead of losing one', () => {
    const plan = sanitizePlan({
      weeks: [
        { weekStart: '2026-08-23', sessions: [{ day: 0, sport: 'run' }] },
        { weekStart: '2026-08-25', sessions: [{ day: 3, sport: 'bike' }] },
      ],
    })
    expect(plan?.weeks).toHaveLength(1)
    expect(plan?.weeks[0].sessions).toHaveLength(2)
  })

  it('sorts weeks chronologically', () => {
    const plan = sanitizePlan({
      weeks: [
        { weekStart: '2026-09-06', sessions: [] },
        { weekStart: '2026-08-23', sessions: [] },
      ],
    })
    expect(plan?.weeks.map((w) => w.weekStart)).toEqual(['2026-08-23', '2026-09-06'])
  })

  it('returns null for a plan that is not an object', () => {
    expect(sanitizePlan(null)).toBeNull()
    expect(sanitizePlan(undefined)).toBeNull()
  })

  it('survives a plan with no weeks array at all', () => {
    expect(sanitizePlan({ raceName: 'x' })?.weeks).toEqual([])
  })
})

describe('weekCompletion on a malformed week', () => {
  it('reports everything undone instead of throwing', () => {
    const week = {
      id: 'w1',
      sessions: [{ id: 's1', day: 0, sport: 'run' }],
    } as unknown as PlanWeek
    expect(() => weekCompletion(week, [])).not.toThrow()
    expect(weekCompletion(week, [])).toEqual({ s1: { done: false } })
  })
})
