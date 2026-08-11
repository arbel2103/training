import { beforeEach, describe, expect, it } from 'vitest'
import { useStore, type PlannedWorkout } from '../useStore'
import { weekCompletion } from '../../lib/planMatch'
import { executeTool } from '../../lib/coachTools'

/* Sun 2026-08-09 … Sat 2026-08-15. */
const WEEK = '2026-08-09'
const dayISO = (day: number) => `2026-08-${String(9 + day).padStart(2, '0')}`

const s = () => useStore.getState()
const board = () => s().planned
const week = () => s().trainingPlan?.weeks.find((w) => w.weekStart === WEEK)
/** The plan's sessions as "sport@weekday", the shape all three pages render. */
const planDays = () =>
  (week()?.sessions ?? []).map((x) => `${x.sport}@${x.day}`).sort()
/** What the "today" tile would show for a given weekday. */
const todayTile = (day: number) =>
  (week()?.sessions ?? []).filter((x) => x.day === day).map((x) => x.sport)

function reset() {
  useStore.setState({
    planned: [],
    trainingPlan: null,
    log: [],
    pendingCalendarDeletes: [],
  })
}

function seedBoard(rows: Partial<PlannedWorkout>[]): void {
  for (const r of rows) s().addPlanned({ category: 'aerobic', date: WEEK, ...r })
  s().syncPlanWeekWithBoard(WEEK)
}

beforeEach(reset)

describe('board → plan → today tile', () => {
  it('gives a workout added to the board a plan session on the same day', () => {
    seedBoard([{ date: dayISO(3), sport: 'run', distance: 8 }])

    expect(planDays()).toEqual(['run@3'])
    expect(todayTile(3)).toEqual(['run'])
  })

  it('moves the plan session when the board workout moves', () => {
    seedBoard([{ date: dayISO(3), sport: 'run' }])
    s().updatePlanned(board()[0].id, { date: dayISO(5) })
    s().syncPlanWeekWithBoard(WEEK)

    expect(planDays()).toEqual(['run@5'])
    expect(todayTile(3)).toEqual([])
    expect(todayTile(5)).toEqual(['run'])
  })

  it('drops the plan session when the board workout is deleted', () => {
    seedBoard([{ date: dayISO(3), sport: 'run' }])
    s().removePlanned(board()[0].id)
    s().syncPlanWeekWithBoard(WEEK)

    expect(planDays()).toEqual([])
    expect(todayTile(3)).toEqual([])
  })

  it('keeps a coach-prescribed session that was merely unscheduled', () => {
    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [{ day: 1, sport: 'swim', distance: 1500 }],
    })
    executeTool('add_planned_workout', {
      date: dayISO(4),
      category: 'aerobic',
      sport: 'bike',
    })
    s().removePlanned(board().find((p) => p.sport === 'bike')!.id)
    s().syncPlanWeekWithBoard(WEEK)

    // the ad-hoc bike is gone; the prescribed swim stays, just unscheduled
    expect(planDays()).toEqual(['swim@1'])
  })
})

describe('plan → board → calendar approval', () => {
  it('moves the scheduled workout when the coach moves the session', () => {
    seedBoard([{ date: dayISO(2), sport: 'run', distance: 10 }])
    const id = board()[0].id
    s().updatePlanned(id, { syncedEventId: 'evt-1', needsPush: false })

    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [{ day: 4, sport: 'run', distance: 10 }],
    })

    expect(board()).toHaveLength(1)
    expect(board()[0]).toMatchObject({
      id,
      date: dayISO(4),
      syncedEventId: 'evt-1',
      needsPush: true, // waits for the user to press "סנכרן ליומן"
    })
    expect(planDays()).toEqual(['run@4'])
    expect(todayTile(4)).toEqual(['run'])
  })

  it('schedules a session the coach added to an already-scheduled week', () => {
    seedBoard([{ date: dayISO(2), sport: 'run' }])

    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [
        { day: 2, sport: 'run' },
        { day: 5, sport: 'swim', distance: 2000 },
      ],
    })

    expect(board().map((p) => `${p.sport}@${p.date}`).sort()).toEqual([
      `run@${dayISO(2)}`,
      `swim@${dayISO(5)}`,
    ])
    expect(board().find((p) => p.sport === 'swim')).toMatchObject({
      needsPush: true,
      distance: 2000,
    })
  })

  it('unschedules a workout the coach dropped from the plan, and queues its calendar delete', () => {
    // both sessions are the plan's: the coach prescribed them and the board
    // picked the swim up automatically
    seedBoard([{ date: dayISO(2), sport: 'run' }])
    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [
        { day: 2, sport: 'run' },
        { day: 5, sport: 'swim' },
      ],
    })
    for (const p of board()) s().updatePlanned(p.id, { syncedEventId: `evt-${p.sport}` })

    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [{ day: 2, sport: 'run' }],
    })

    expect(board().map((p) => p.sport)).toEqual(['run'])
    expect(s().pendingCalendarDeletes).toEqual(['evt-swim'])
    expect(planDays()).toEqual(['run@2'])
  })

  it('needs an explicit removal to take a board-owned workout off the plan', () => {
    // the user put this swim on the board themselves, so a plan rewrite that
    // simply omits it is silence, not an instruction to delete
    seedBoard([{ date: dayISO(5), sport: 'swim' }])
    const id = board()[0].id

    executeTool('upsert_plan_week', { weekStart: WEEK, sessions: [] })
    expect(board()).toHaveLength(1)
    expect(planDays()).toEqual(['swim@5'])

    executeTool('remove_planned_workout', { id })
    expect(board()).toEqual([])
    expect(planDays()).toEqual([])
  })

  it('leaves an ad-hoc workout the user added by hand alone', () => {
    seedBoard([{ date: dayISO(2), sport: 'run' }])
    // the user added this one directly on the board, not from the plan
    s().addPlanned({ date: dayISO(6), category: 'other', otherName: 'יוגה' })
    // …and it has since been echoed into the plan, links and all
    s().syncPlanWeekWithBoard(WEEK)

    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [{ day: 2, sport: 'run' }],
    })

    // omitting it from a plan rewrite must not silently unschedule it
    expect(board().map((p) => p.otherName ?? p.sport).sort()).toEqual(['run', 'יוגה'])
    expect(planDays()).toEqual(['other@6', 'run@2'])
  })

  it('does not fill a week the user has not started scheduling', () => {
    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [{ day: 2, sport: 'run' }],
    })

    expect(board()).toEqual([])
    expect(planDays()).toEqual(['run@2']) // the plan and today tile still update
  })
})

describe('the coach change that used to need saying twice', () => {
  it('survives the board→plan heal that runs on every app load', () => {
    seedBoard([{ date: dayISO(2), sport: 'run', distance: 10 }])

    executeTool('upsert_plan_week', {
      weekStart: WEEK,
      sessions: [{ day: 4, sport: 'run', distance: 10 }],
    })
    // App.tsx runs this on mount — it used to drag the session back to Tuesday
    s().syncPlanWeekWithBoard(WEEK)

    expect(planDays()).toEqual(['run@4'])
    expect(board()[0].date).toBe(dayISO(4))
    expect(todayTile(4)).toEqual(['run'])
  })

  it('keeps the board↔plan link alive across repeated coach edits', () => {
    seedBoard([{ date: dayISO(1), sport: 'bike', distance: 40 }])
    const id = board()[0].id

    for (const day of [3, 5, 2]) {
      executeTool('upsert_plan_week', {
        weekStart: WEEK,
        sessions: [{ day, sport: 'bike', distance: 40 }],
      })
      s().syncPlanWeekWithBoard(WEEK)
    }

    // the same workout moved three times — never duplicated, never orphaned
    expect(board()).toHaveLength(1)
    expect(board()[0].id).toBe(id)
    expect(board()[0].date).toBe(dayISO(2))
    expect(planDays()).toEqual(['bike@2'])
  })
})

describe('coach tools report failures instead of throwing', () => {
  it('rejects a malformed date without blowing up the turn', () => {
    expect(executeTool('add_planned_workout', { date: 'מחר', category: 'aerobic' }))
      .toMatch(/yyyy-mm-dd/)
    expect(board()).toEqual([])
  })

  it('tells the coach when a planned-workout id does not exist', () => {
    expect(executeTool('update_planned_workout', { id: 'nope', date: dayISO(1) }))
      .toMatch(/לא נמצא/)
    expect(executeTool('remove_planned_workout', { id: 'nope' })).toMatch(/לא נמצא/)
  })

  it('rejects a weekStart that is not a Sunday, naming the right one', () => {
    const out = executeTool('upsert_plan_week', {
      weekStart: dayISO(3),
      sessions: [{ day: 1, sport: 'run' }],
    })

    expect(out).toContain(WEEK)
    expect(s().trainingPlan).toBeNull()
  })

  it('moves a planned workout in one call, across a week boundary', () => {
    seedBoard([{ date: dayISO(5), sport: 'run' }])
    const id = board()[0].id

    const out = executeTool('update_planned_workout', { id, date: '2026-08-17' })

    expect(out).toMatch(/עודכן/)
    expect(board()[0].date).toBe('2026-08-17')
    expect(planDays()).toEqual([]) // left this week
    expect(
      s().trainingPlan?.weeks.find((w) => w.weekStart === '2026-08-16')?.sessions,
    ).toHaveLength(1) // and landed in the next one
  })
})

describe('a completed workout still ticks through all three views', () => {
  it('marks the session done wherever it is rendered', () => {
    seedBoard([{ date: dayISO(3), sport: 'run', distance: 8 }])
    s().addEntry({ date: dayISO(3), category: 'aerobic', sport: 'run', distance: 8.2 })

    const completion = weekCompletion(week()!, s().log)
    const session = week()!.sessions[0]

    expect(completion[session.id]?.done).toBe(true)
    expect(completion[session.id]?.entry?.distance).toBe(8.2)
  })
})
