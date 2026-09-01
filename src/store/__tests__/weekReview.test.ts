import { beforeEach, describe, expect, it } from 'vitest'
import { useStore, type TrainingPlan } from '../useStore'
import { buildContext } from '../../lib/coachTools'
import { sanitizePlanWeek } from '../../lib/planSanitize'

const s = () => useStore.getState()
const week = () => s().trainingPlan!.weeks[0]

const plan: TrainingPlan = {
  weeks: [
    {
      id: 'w1',
      weekStart: '2026-08-23',
      label: 'שבוע 4',
      sessions: [{ id: 's1', day: 2, sport: 'bike', distance: 40 }],
    },
  ],
}

beforeEach(() => {
  useStore.setState({
    trainingPlan: null,
    planHistory: [],
    planned: [],
    log: [],
    coachMemory: [],
    garminDaily: [],
    calendarBusy: [],
    strengthCategories: [],
    weighIns: [],
  })
  s().setTrainingPlan(structuredClone(plan))
})

describe('writing how a week went', () => {
  it('saves the note against the week, with a timestamp', () => {
    s().setWeekReview('2026-08-23', 'שבוע קשה, הרבה עומס בעבודה')
    expect(week().review).toBe('שבוע קשה, הרבה עומס בעבודה')
    expect(week().reviewedAt).toBeTruthy()
  })

  it('trims, and clears the note when emptied', () => {
    s().setWeekReview('2026-08-23', '  היה טוב  ')
    expect(week().review).toBe('היה טוב')
    s().setWeekReview('2026-08-23', '   ')
    expect(week().review).toBeUndefined()
    expect(week().reviewedAt).toBeUndefined()
  })

  it('leaves other weeks alone', () => {
    s().upsertPlanWeek({ id: 'w2', weekStart: '2026-08-30', sessions: [] })
    s().setWeekReview('2026-08-23', 'הערה')
    const other = s().trainingPlan!.weeks.find((w) => w.weekStart === '2026-08-30')
    expect(other?.review).toBeUndefined()
  })
})

describe('the note surviving everything that rewrites a plan', () => {
  /** The whitelist in the sanitiser is the only thing a save passes through. */
  it('survives sanitisation', () => {
    const clean = sanitizePlanWeek({
      id: 'w1',
      weekStart: '2026-08-23',
      sessions: [],
      review: 'נשמר',
      reviewedAt: '2026-08-30T00:00:00.000Z',
    })
    expect(clean?.review).toBe('נשמר')
    expect(clean?.reviewedAt).toBe('2026-08-30T00:00:00.000Z')
  })

  /** A coach edit never carries a review, and must not erase one. */
  it('is not wiped when the coach rewrites the week', () => {
    s().setWeekReview('2026-08-23', 'הברך כאבה')
    s().upsertPlanWeek({
      id: 'w1',
      weekStart: '2026-08-23',
      sessions: [{ id: 's9', day: 4, sport: 'run', distance: 10 }],
    })
    expect(week().review).toBe('הברך כאבה')
    expect(week().sessions.some((x) => x.sport === 'run')).toBe(true)
  })

  it('is not wiped when the whole plan is replaced', () => {
    s().setWeekReview('2026-08-23', 'הברך כאבה')
    s().setTrainingPlan(structuredClone(plan))
    expect(week().review).toBe('הברך כאבה')
  })
})

describe('what the coach is shown', () => {
  it('includes the note, in the athlete’s own words', () => {
    s().setWeekReview('2026-08-23', 'נפלתי מהאופניים, שריטות בלבד')
    const ctx = buildContext()
    expect(ctx).toContain('מה שהמשתמש כתב')
    expect(ctx).toContain('נפלתי מהאופניים, שריטות בלבד')
    expect(ctx).toContain('2026-08-23')
  })

  it('says nothing about reviews when none were written', () => {
    expect(buildContext()).not.toContain('מה שהמשתמש כתב')
  })
})
