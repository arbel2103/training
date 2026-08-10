import { beforeEach, describe, expect, it } from 'vitest'
import type { PlanWeek, PlannedWorkout } from '../../store/useStore'
import { boardDaysForWeek, reconcilePlanWeek, unscheduledSessions } from '../planMatch'

const week: PlanWeek = {
  id: 'w',
  weekStart: '2026-08-02',
  sessions: [
    { id: 's-run1', day: 1, sport: 'run', distance: 10 },
    { id: 's-run2', day: 4, sport: 'run', distance: 6 },
    { id: 's-swim', day: 2, sport: 'swim', distance: 2000 },
    { id: 's-strength', day: 3, sport: 'strength', label: 'רגליים' },
  ],
}

const plan = (over: Partial<PlannedWorkout>): PlannedWorkout => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-08-03',
  category: 'aerobic',
  ...over,
})

describe('unscheduledSessions', () => {
  it('shows every session when nothing is on the board (next week)', () => {
    expect(unscheduledSessions(week, [])).toHaveLength(4)
  })

  it('shows nothing once the whole week is scheduled', () => {
    // scheduled by the coach — no planSessionId link at all
    const planned = [
      plan({ sport: 'run' }),
      plan({ sport: 'run' }),
      plan({ sport: 'swim' }),
      plan({ category: 'strength', strengthName: 'רגליים' }),
    ]
    expect(unscheduledSessions(week, planned)).toHaveLength(0)
  })

  it('consumes each planned workout once, so duplicates still show', () => {
    // only one run scheduled — the second run session is still outstanding
    const left = unscheduledSessions(week, [plan({ sport: 'run' })])
    expect(left.map((s) => s.id).sort()).toEqual(
      ['s-run2', 's-strength', 's-swim'].sort(),
    )
  })

  it('matches regardless of which day the workout landed on', () => {
    const left = unscheduledSessions(week, [
      plan({ sport: 'swim', date: '2026-08-07' }), // planned for a different day
    ])
    expect(left.map((s) => s.id)).not.toContain('s-swim')
  })

  it('honours an explicit link before falling back to sport matching', () => {
    // the linked workout must be tied to run2, leaving run1 outstanding
    const left = unscheduledSessions(week, [
      plan({ sport: 'run', planSessionId: 's-run2' }),
    ])
    expect(left.map((s) => s.id)).toContain('s-run1')
    expect(left.map((s) => s.id)).not.toContain('s-run2')
  })

  it('does not match a different sport', () => {
    const left = unscheduledSessions(week, [plan({ sport: 'bike' })])
    expect(left).toHaveLength(4)
  })
})

// week of 2026-08-02 (Sunday): 08-02=Sun(0) … 08-08=Sat(6)
describe('boardDaysForWeek', () => {
  it('realigns each session to the day its workout was placed on', () => {
    const days = boardDaysForWeek(week, [
      plan({ sport: 'run', planSessionId: 's-run1', date: '2026-08-06' }), // Thu
      plan({ sport: 'swim', date: '2026-08-03' }), // Mon, by sport
      plan({ category: 'strength', strengthName: 'רגליים', date: '2026-08-07' }), // Fri
    ])
    expect(days['s-run1']).toBe(4)
    expect(days['s-swim']).toBe(1)
    expect(days['s-strength']).toBe(5)
  })

  it('leaves unscheduled sessions out of the map', () => {
    const days = boardDaysForWeek(week, [plan({ sport: 'swim', date: '2026-08-05' })])
    expect(days).toEqual({ 's-swim': 3 })
  })

  it('honours an explicit link over sport order', () => {
    const days = boardDaysForWeek(week, [
      plan({ sport: 'run', planSessionId: 's-run2', date: '2026-08-08' }), // Sat
    ])
    expect(days['s-run2']).toBe(6)
    expect(days['s-run1']).toBeUndefined()
  })

  it('prefers a matching label so same-sport days do not swap', () => {
    const twoStrength: PlanWeek = {
      id: 'w2',
      weekStart: '2026-08-02',
      sessions: [
        { id: 's-legs', day: 1, sport: 'strength', label: 'רגליים' },
        { id: 's-upper', day: 3, sport: 'strength', label: 'פלג עליון' },
      ],
    }
    const days = boardDaysForWeek(twoStrength, [
      plan({ category: 'strength', strengthName: 'פלג עליון', date: '2026-08-04' }), // Tue
      plan({ category: 'strength', strengthName: 'רגליים', date: '2026-08-06' }), // Thu
    ])
    expect(days['s-legs']).toBe(4)
    expect(days['s-upper']).toBe(2)
  })
})

// week of 2026-08-02 (Sunday): 08-02=Sun(0) … 08-08=Sat(6)
describe('reconcilePlanWeek', () => {
  let n = 0
  const newId = () => `new${++n}`
  beforeEach(() => {
    n = 0
  })

  it('creates a plan session for a board workout that has none', () => {
    // the reported bug: the coach schedules a workout, the plan never hears
    const empty: PlanWeek = { id: 'w', weekStart: '2026-08-02', sessions: [] }
    const sessions = reconcilePlanWeek(
      empty,
      [plan({ sport: 'bike', date: '2026-08-05', distance: 40, durationMin: 90 })],
      newId,
    )
    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ day: 3, sport: 'bike', distance: 40 })
  })

  it('carries the name across for strength and other workouts', () => {
    const empty: PlanWeek = { id: 'w', weekStart: '2026-08-02', sessions: [] }
    const sessions = reconcilePlanWeek(
      empty,
      [
        plan({ category: 'strength', strengthName: 'רגליים', date: '2026-08-03' }),
        plan({ category: 'other', otherName: 'גלישה', date: '2026-08-04' }),
      ],
      newId,
    )
    expect(sessions).toEqual([
      expect.objectContaining({ day: 1, sport: 'strength', label: 'רגליים' }),
      expect.objectContaining({ day: 2, sport: 'other', label: 'גלישה' }),
    ])
  })

  it('moves an existing session instead of duplicating it', () => {
    const sessions = reconcilePlanWeek(
      week,
      [plan({ sport: 'swim', date: '2026-08-06' })], // Thu
      newId,
    )
    expect(sessions).toHaveLength(week.sessions.length)
    expect(sessions.find((s) => s.id === 's-swim')!.day).toBe(4)
  })

  it('keeps sessions that are not on the board yet', () => {
    const sessions = reconcilePlanWeek(week, [], newId)
    expect(sessions).toEqual(week.sessions)
  })

  it('both moves matched sessions and adds unmatched ones', () => {
    const sessions = reconcilePlanWeek(
      week,
      [
        plan({ sport: 'swim', date: '2026-08-06' }), // matches s-swim → Thu
        plan({ category: 'other', otherName: 'יוגה', date: '2026-08-08' }), // new
      ],
      newId,
    )
    expect(sessions).toHaveLength(week.sessions.length + 1)
    expect(sessions.find((s) => s.id === 's-swim')!.day).toBe(4)
    expect(sessions.at(-1)).toMatchObject({ day: 6, sport: 'other', label: 'יוגה' })
  })

  it('is idempotent — running it again changes nothing', () => {
    const board = [
      plan({ sport: 'bike', date: '2026-08-05' }),
      plan({ category: 'strength', strengthName: 'רגליים', date: '2026-08-07' }),
    ]
    const once = reconcilePlanWeek(week, board, newId)
    const twice = reconcilePlanWeek({ ...week, sessions: once }, board, newId)
    expect(twice).toHaveLength(once.length)
    expect(twice.map((s) => [s.sport, s.day])).toEqual(
      once.map((s) => [s.sport, s.day]),
    )
  })

  it('honours an explicit link rather than creating a duplicate', () => {
    const sessions = reconcilePlanWeek(
      week,
      [plan({ sport: 'run', planSessionId: 's-run2', date: '2026-08-08' })],
      newId,
    )
    expect(sessions).toHaveLength(week.sessions.length)
    expect(sessions.find((s) => s.id === 's-run2')!.day).toBe(6)
  })
})
