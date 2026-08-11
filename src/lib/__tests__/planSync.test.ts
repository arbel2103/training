import { describe, expect, it } from 'vitest'
import {
  boardWorkoutsForPlan,
  carryOverSessionIds,
  reconcilePlanWeek,
} from '../planMatch'
import type { PlanSession, PlanWeek, PlannedWorkout } from '../../store/useStore'

/* The week of Sun 2026-08-09 … Sat 2026-08-15. */
const WEEK_START = '2026-08-09'
const dayISO = (day: number) => `2026-08-${String(9 + day).padStart(2, '0')}`

let n = 0
const newId = () => `gen-${++n}`

function week(sessions: PlanSession[]): PlanWeek {
  return { id: 'w1', weekStart: WEEK_START, sessions }
}

function planned(p: Partial<PlannedWorkout> & { id: string; date: string }): PlannedWorkout {
  return { category: 'aerobic', sport: 'run', ...p }
}

describe('carryOverSessionIds', () => {
  it('keeps the id of a session the coach only moved to another day', () => {
    const prev: PlanSession[] = [{ id: 'run-1', day: 2, sport: 'run', distance: 10 }]
    const next: PlanSession[] = [{ id: 'fresh', day: 4, sport: 'run', distance: 10 }]

    const out = carryOverSessionIds(prev, next)

    expect(out).toEqual([{ id: 'run-1', day: 4, sport: 'run', distance: 10 }])
  })

  it('prefers the same label when several sessions share a sport', () => {
    const prev: PlanSession[] = [
      { id: 'legs', day: 1, sport: 'strength', label: 'רגליים' },
      { id: 'upper', day: 3, sport: 'strength', label: 'פלג גוף עליון' },
    ]
    const next: PlanSession[] = [
      { id: 'a', day: 2, sport: 'strength', label: 'פלג גוף עליון' },
      { id: 'b', day: 5, sport: 'strength', label: 'רגליים' },
    ]

    expect(carryOverSessionIds(prev, next).map((s) => s.id)).toEqual(['upper', 'legs'])
  })

  it('gives a genuinely new session a fresh id', () => {
    const prev: PlanSession[] = [{ id: 'run-1', day: 2, sport: 'run' }]
    const next: PlanSession[] = [
      { id: 'keep', day: 2, sport: 'run' },
      { id: 'brand-new', day: 4, sport: 'swim' },
    ]

    expect(carryOverSessionIds(prev, next).map((s) => s.id)).toEqual([
      'run-1',
      'brand-new',
    ])
  })
})

describe('reconcilePlanWeek — board wins', () => {
  it('moves a plan session to the day its board workout sits on', () => {
    const w = week([{ id: 's1', day: 2, sport: 'run' }])
    const board = [planned({ id: 'p1', date: dayISO(4), planSessionId: 's1' })]

    expect(reconcilePlanWeek(w, board, newId).sessions).toEqual([
      { id: 's1', day: 4, sport: 'run' },
    ])
  })

  it('creates a session for a board workout the plan does not know about', () => {
    const w = week([])
    const board = [planned({ id: 'p1', date: dayISO(3), sport: 'swim', distance: 1500 })]

    const { sessions, links } = reconcilePlanWeek(w, board, newId)

    expect(sessions).toHaveLength(1)
    expect(sessions[0]).toMatchObject({ day: 3, sport: 'swim', distance: 1500, fromBoard: true })
    // and the board learns which session is its own, so the guess is made once
    expect(links).toEqual([{ id: 'p1', planSessionId: sessions[0].id }])
  })

  it('drops a board-derived session once its board workout is deleted', () => {
    const w = week([
      { id: 'coach', day: 1, sport: 'run' },
      { id: 'adhoc', day: 3, sport: 'swim', fromBoard: true },
    ])

    // the swim was removed from the board; the coach's run was never scheduled
    expect(reconcilePlanWeek(w, [], newId).sessions).toEqual([
      { id: 'coach', day: 1, sport: 'run' },
    ])
  })

  it('keeps a board-derived session that is still on the board', () => {
    const w = week([{ id: 'adhoc', day: 3, sport: 'swim', fromBoard: true }])
    const board = [planned({ id: 'p1', date: dayISO(3), sport: 'swim' })]

    expect(reconcilePlanWeek(w, board, newId).sessions).toEqual([
      { id: 'adhoc', day: 3, sport: 'swim', fromBoard: true },
    ])
  })
})

describe('boardWorkoutsForPlan — plan wins', () => {
  it('moves the linked board workout to the day the plan now prescribes', () => {
    const w = week([{ id: 's1', day: 5, sport: 'run' }])
    const board = [planned({ id: 'p1', date: dayISO(2), planSessionId: 's1', time: '18:00' })]

    const { updates, creates, orphans } = boardWorkoutsForPlan(w, board)

    expect(updates).toEqual([{ id: 'p1', patch: { date: dayISO(5), needsPush: true } }])
    expect(creates).toEqual([])
    expect(orphans).toEqual([])
  })

  it('re-links a board workout matched only by sport, so the link survives', () => {
    const w = week([{ id: 'fresh-id', day: 5, sport: 'run' }])
    const board = [planned({ id: 'p1', date: dayISO(2), planSessionId: 'stale-id' })]

    const { updates } = boardWorkoutsForPlan(w, board)

    expect(updates).toEqual([
      { id: 'p1', patch: { date: dayISO(5), planSessionId: 'fresh-id', needsPush: true } },
    ])
  })

  it('leaves a board workout already on the right day alone', () => {
    const w = week([{ id: 's1', day: 2, sport: 'run' }])
    const board = [planned({ id: 'p1', date: dayISO(2), planSessionId: 's1' })]

    expect(boardWorkoutsForPlan(w, board)).toEqual({
      updates: [],
      creates: [],
      orphans: [],
    })
  })

  it('schedules a session the plan added, once the week is already being scheduled', () => {
    const w = week([
      { id: 's1', day: 2, sport: 'run' },
      { id: 's2', day: 4, sport: 'swim', distance: 1200 },
    ])
    const board = [planned({ id: 'p1', date: dayISO(2), planSessionId: 's1' })]

    const { creates } = boardWorkoutsForPlan(w, board)

    expect(creates).toHaveLength(1)
    expect(creates[0]).toMatchObject({
      date: dayISO(4),
      category: 'aerobic',
      sport: 'swim',
      distance: 1200,
      planSessionId: 's2',
      needsPush: true,
    })
  })

  it('does not populate a week the user has not started scheduling', () => {
    const w = week([{ id: 's1', day: 2, sport: 'run' }])

    expect(boardWorkoutsForPlan(w, [])).toEqual({
      updates: [],
      creates: [],
      orphans: [],
    })
  })

  it('does not resurrect a board-owned workout the user just deleted', () => {
    const w = week([
      { id: 's1', day: 2, sport: 'run' },
      { id: 'ghost', day: 6, sport: 'swim', fromBoard: true },
    ])
    const board = [planned({ id: 'p1', date: dayISO(2), planSessionId: 's1' })]

    expect(boardWorkoutsForPlan(w, board).creates).toEqual([])
  })

  it('reports a board workout the plan no longer prescribes instead of deleting it', () => {
    const w = week([{ id: 's1', day: 2, sport: 'run' }])
    const board = [
      planned({ id: 'p1', date: dayISO(2), planSessionId: 's1' }),
      planned({ id: 'p2', date: dayISO(6), sport: 'bike' }),
    ]

    const { orphans } = boardWorkoutsForPlan(w, board)

    expect(orphans).toEqual(['p2'])
  })
})

describe('the round trip that used to revert the coach', () => {
  it('keeps a coach-moved session on its new day after the board catches up', () => {
    // the coach moves Tuesday's run to Thursday: same session, new day
    const prev: PlanSession[] = [{ id: 's1', day: 2, sport: 'run', distance: 10 }]
    const fromCoach: PlanSession[] = [{ id: 'regenerated', day: 4, sport: 'run', distance: 10 }]
    const sessions = carryOverSessionIds(prev, fromCoach)
    const w = week(sessions)

    // the board still has it on Tuesday — plan wins, so the board moves
    const board = [planned({ id: 'p1', date: dayISO(2), planSessionId: 's1' })]
    const { updates } = boardWorkoutsForPlan(w, board)
    expect(updates[0].patch.date).toBe(dayISO(4))

    // and the load-time board→plan heal must not drag it back to Tuesday
    const movedBoard = [planned({ id: 'p1', date: dayISO(4), planSessionId: 's1' })]
    expect(reconcilePlanWeek(w, movedBoard, newId)).toEqual({
      sessions: [{ id: 's1', day: 4, sport: 'run', distance: 10 }],
      links: [],
    })
  })
})
