import { beforeEach, describe, expect, it } from 'vitest'
import { useStore, type TrainingPlan } from '../useStore'
import { buildContext } from '../../lib/coachTools'
import { addDays, toISODate } from '../../lib/dates'

const s = () => useStore.getState()

/** Sunday of last week — the week the review nudge asks about. */
const lastWeekStart = () => {
  const now = new Date()
  const sunday = addDays(now, -now.getDay())
  return toISODate(addDays(sunday, -7))
}
const dayOfLastWeek = (n: number) =>
  toISODate(addDays(new Date(lastWeekStart()), n))

const planWith = (review?: string): TrainingPlan => ({
  weeks: [
    {
      id: 'w1',
      weekStart: lastWeekStart(),
      label: 'שבוע 4',
      review,
      sessions: [
        { id: 's1', day: 2, sport: 'bike', distance: 40 },
        { id: 's2', day: 4, sport: 'run', distance: 10 },
      ],
    },
  ],
})

beforeEach(() => {
  useStore.setState({
    trainingPlan: null,
    planHistory: [],
    log: [],
    planned: [],
    coachMemory: [],
    garminDaily: [],
    calendarBusy: [],
    strengthCategories: [],
    weighIns: [],
    gear: [],
  })
})

describe('what the coach sees when asked to summarise last week', () => {
  it('carries the notes written on the workouts themselves', () => {
    s().setTrainingPlan(planWith())
    s().addEntry({
      date: dayOfLastWeek(2),
      category: 'aerobic',
      sport: 'bike',
      distance: 40,
      rpe: 8,
      note: 'רוח נגדית קשה, הרגליים נגמרו בסוף',
    })
    const ctx = buildContext()
    expect(ctx).toContain('מה שנרשם על האימונים עצמם')
    expect(ctx).toContain('רוח נגדית קשה, הרגליים נגמרו בסוף')
    expect(ctx).toContain('RPE 8')
  })

  it('carries the note written on the week in the plan', () => {
    s().setTrainingPlan(planWith('שבוע עמוס בעבודה, בקושי ישנתי'))
    const ctx = buildContext()
    expect(ctx).toContain('מה שהמשתמש כתב על השבוע הזה')
    expect(ctx).toContain('שבוע עמוס בעבודה, בקושי ישנתי')
  })

  it('puts both alongside that week, not in some unrelated section', () => {
    s().setTrainingPlan(planWith('הברך הציקה'))
    s().addEntry({
      date: dayOfLastWeek(4),
      category: 'aerobic',
      sport: 'run',
      distance: 10,
      rpe: 9,
      note: 'כאב בברך מקילומטר 6',
    })
    const ctx = buildContext()
    const block = ctx.slice(ctx.indexOf('סיכום השבוע'))
    expect(block).toContain('כאב בברך מקילומטר 6')
    expect(block).toContain('הברך הציקה')
  })

  it('names a strength session by its own name', () => {
    s().setTrainingPlan(planWith())
    s().addEntry({
      date: dayOfLastWeek(1),
      category: 'strength',
      strengthName: 'רגליים',
      rpe: 7,
      note: 'הסקוואט עלה יפה',
    })
    expect(buildContext()).toContain('רגליים: RPE 7 — הסקוואט עלה יפה')
  })

  it('leaves out workouts from other weeks', () => {
    s().setTrainingPlan(planWith())
    s().addEntry({
      date: toISODate(addDays(new Date(lastWeekStart()), -3)), // the week before
      category: 'aerobic',
      sport: 'run',
      distance: 5,
      note: 'שייך לשבוע אחר',
    })
    const ctx = buildContext()
    const block = ctx.slice(ctx.indexOf('סיכום השבוע'))
    expect(block).not.toContain('שייך לשבוע אחר')
  })

  it('says nothing about notes when none were written', () => {
    s().setTrainingPlan(planWith())
    s().addEntry({
      date: dayOfLastWeek(2),
      category: 'aerobic',
      sport: 'bike',
      distance: 40,
    })
    const ctx = buildContext()
    expect(ctx).not.toContain('מה שנרשם על האימונים עצמם')
    expect(ctx).not.toContain('מה שהמשתמש כתב על השבוע הזה')
  })
})
