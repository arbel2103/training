import { beforeEach, describe, expect, it } from 'vitest'
import { useStore, type TrainingPlan } from '../useStore'
import { executeTool } from '../../lib/coachTools'

const s = () => useStore.getState()
const week = () => s().trainingPlan!.weeks[0]

const plan: TrainingPlan = {
  weeks: [
    {
      id: 'w1',
      weekStart: '2026-08-23',
      sessions: [
        { id: 'a', day: 1, sport: 'run', distance: 10, label: 'ארוכה' },
        { id: 'b', day: 3, sport: 'strength', label: 'רגליים' },
        { id: 'c', day: 5, sport: 'bike', distance: 40 },
      ],
    },
  ],
}

beforeEach(() => {
  useStore.setState({ trainingPlan: null, planHistory: [], planned: [] })
  s().setTrainingPlan(structuredClone(plan))
})

describe('remove_plan_session', () => {
  it('removes exactly one session and leaves the rest untouched', () => {
    const out = executeTool('remove_plan_session', { sessionId: 'b' })
    expect(out).toContain('הוסר')
    expect(week().sessions.map((x) => x.id)).toEqual(['a', 'c'])
  })

  it('names the problem instead of wiping anything on a bad id', () => {
    const out = executeTool('remove_plan_session', { sessionId: 'nope' })
    expect(out).toContain('לא נמצא')
    expect(week().sessions).toHaveLength(3)
  })
})

describe('add_plan_session', () => {
  it('adds one session without disturbing the others', () => {
    const out = executeTool('add_plan_session', {
      weekStart: '2026-08-23',
      day: 2,
      sport: 'strength',
      label: 'פלג גוף עליון',
    })
    expect(out).toContain('נוסף')
    expect(week().sessions).toHaveLength(4)
    expect(week().sessions.map((x) => x.id)).toEqual(
      expect.arrayContaining(['a', 'b', 'c']),
    )
    expect(week().sessions.at(-1)).toMatchObject({
      day: 2,
      sport: 'strength',
      label: 'פלג גוף עליון',
    })
  })

  /** The exact request that used to take several tries. */
  it('adds two strength sessions across two calls', () => {
    executeTool('add_plan_session', {
      weekStart: '2026-08-23',
      day: 0,
      sport: 'strength',
      label: 'דחיפה',
    })
    executeTool('add_plan_session', {
      weekStart: '2026-08-23',
      day: 4,
      sport: 'strength',
      label: 'משיכה',
    })
    const strength = week().sessions.filter((x) => x.sport === 'strength')
    expect(strength).toHaveLength(3) // the original leg day plus the two new
    expect(week().sessions).toHaveLength(5)
  })

  it('refuses a day outside the week, and an unknown week', () => {
    expect(
      executeTool('add_plan_session', {
        weekStart: '2026-08-23',
        day: 9,
        sport: 'run',
      }),
    ).toContain('day')
    expect(
      executeTool('add_plan_session', {
        weekStart: '2026-09-27',
        day: 1,
        sport: 'run',
      }),
    ).toContain('אין שבוע')
    expect(week().sessions).toHaveLength(3)
  })
})

describe('update_plan_session', () => {
  it('changes only the fields it was given', () => {
    executeTool('update_plan_session', { sessionId: 'a', day: 4, distance: 15 })
    const a = week().sessions.find((x) => x.id === 'a')!
    expect(a).toMatchObject({ day: 4, distance: 15, sport: 'run', label: 'ארוכה' })
  })

  it('reports an unknown id rather than silently doing nothing', () => {
    expect(executeTool('update_plan_session', { sessionId: 'zz', day: 1 })).toContain(
      'לא נמצא',
    )
  })
})

describe('history', () => {
  it('leaves every session edit undoable', () => {
    executeTool('remove_plan_session', { sessionId: 'b' })
    expect(s().planHistory[0].plan?.weeks[0].sessions).toHaveLength(3)
    s().restorePlanSnapshot(s().planHistory[0].id)
    expect(week().sessions.map((x) => x.id)).toEqual(['a', 'b', 'c'])
  })
})
