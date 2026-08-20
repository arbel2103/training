import { describe, expect, it } from 'vitest'
import { buildNudges, needsDebrief, type NudgeInput } from '../nudges'
import type { PlanWeek, TrainingPlan, WorkoutEntry } from '../../store/useStore'
import type { DailyHealth } from '../garmin/types'

/* 2026-08-16 is a Sunday, so 08-16…08-22 is one plan week. */
const LAST_WEEK = '2026-08-09'
const THIS_WEEK = '2026-08-16'

const runWeek = (weekStart: string, n: number, label = 'שבוע'): PlanWeek => ({
  id: weekStart,
  weekStart,
  label,
  sessions: Array.from({ length: n }, (_, i) => ({
    id: `${weekStart}-${i}`,
    day: i,
    sport: 'run' as const,
    distance: 8,
  })),
})

const base = (over: Partial<NudgeInput> = {}): NudgeInput => ({
  today: THIS_WEEK, // a Sunday
  log: [],
  plan: null,
  garminDaily: [],
  ...over,
})

const ids = (input: NudgeInput) => buildNudges(input).map((n) => n.id)

const hrvDays = (values: number[]): DailyHealth[] =>
  values.map((hrvLastNight, i) => ({
    date: `2026-08-${String(15 - i).padStart(2, '0')}`,
    hrvLastNight,
  })) as DailyHealth[]

describe('weekly review', () => {
  const plan: TrainingPlan = { weeks: [runWeek(LAST_WEEK, 4)] }

  it('offers a review at the start of the week', () => {
    const n = buildNudges(base({ plan }))
    expect(n.map((x) => x.id)).toContain(`review-${LAST_WEEK}`)
    expect(n[0].ask).toContain('סכם')
  })

  it('says nothing mid-week, when last week is no longer the question', () => {
    // 2026-08-20 is a Thursday
    expect(ids(base({ plan, today: '2026-08-20' }))).not.toContain(
      `review-${LAST_WEEK}`,
    )
  })

  it('says nothing when last week had no plan', () => {
    expect(ids(base({ plan: { weeks: [] } }))).toEqual([])
  })

  it('reads as good news when the week was completed', () => {
    const log: WorkoutEntry[] = Array.from({ length: 4 }, (_, i) => ({
      id: `l${i}`,
      date: `2026-08-${String(9 + i).padStart(2, '0')}`,
      category: 'aerobic',
      sport: 'run',
      distance: 8,
    }))
    const n = buildNudges(base({ plan, log }))
    expect(n.find((x) => x.id.startsWith('review'))?.tone).toBe('good')
  })
})

describe('recovery', () => {
  it('speaks up after three nights below baseline, not one', () => {
    const low = hrvDays([40, 41, 42, 70, 72, 68, 71, 69, 70, 73])
    expect(ids(base({ garminDaily: low })).some((i) => i.startsWith('recovery'))).toBe(
      true,
    )
    const oneBad = hrvDays([40, 70, 72, 70, 68, 71, 69, 70, 73, 70])
    expect(
      ids(base({ garminDaily: oneBad })).some((i) => i.startsWith('recovery')),
    ).toBe(false)
  })

  it('stays quiet without enough nights to have a baseline', () => {
    expect(
      ids(base({ garminDaily: hrvDays([40, 41, 42]) })).some((i) =>
        i.startsWith('recovery'),
      ),
    ).toBe(false)
  })
})

describe('adherence', () => {
  const plan: TrainingPlan = { weeks: [runWeek(THIS_WEEK, 5)] }

  it('flags a week that is mostly gone and mostly undone', () => {
    // Thursday of the plan week, nothing logged
    expect(ids(base({ plan, today: '2026-08-20' }))).toContain(
      `adherence-${THIS_WEEK}`,
    )
  })

  it('stays quiet when the week is on track', () => {
    const log: WorkoutEntry[] = Array.from({ length: 4 }, (_, i) => ({
      id: `l${i}`,
      date: `2026-08-${16 + i}`,
      category: 'aerobic',
      sport: 'run',
      distance: 8,
    }))
    expect(ids(base({ plan, log, today: '2026-08-20' }))).not.toContain(
      `adherence-${THIS_WEEK}`,
    )
  })

  it('does not nag on a Monday, when the week has barely started', () => {
    expect(ids(base({ plan, today: '2026-08-17' }))).not.toContain(
      `adherence-${THIS_WEEK}`,
    )
  })
})

describe('missing taper', () => {
  it('notices a race coming with no taper week planned', () => {
    const plan: TrainingPlan = {
      raceDate: '2026-08-30',
      weeks: [runWeek(THIS_WEEK, 4), runWeek('2026-08-23', 4)],
    }
    expect(ids(base({ plan }))).toContain('taper-2026-08-30')
  })

  it('is satisfied once a taper week exists', () => {
    const plan: TrainingPlan = {
      raceDate: '2026-08-30',
      weeks: [runWeek(THIS_WEEK, 4), runWeek('2026-08-23', 3, 'טייפר')],
    }
    expect(ids(base({ plan }))).not.toContain('taper-2026-08-30')
  })

  it('ignores a race that is still months away', () => {
    const plan: TrainingPlan = { raceDate: '2026-12-01', weeks: [runWeek(THIS_WEEK, 4)] }
    expect(ids(base({ plan })).some((i) => i.startsWith('taper-'))).toBe(false)
  })
})

describe('needsDebrief', () => {
  const g = (over: Partial<WorkoutEntry>): WorkoutEntry => ({
    id: Math.random().toString(36).slice(2),
    date: '2026-08-16',
    category: 'aerobic',
    sport: 'run',
    source: 'garmin',
    ...over,
  })

  it('picks up a synced workout with no feel recorded', () => {
    expect(needsDebrief([g({})], THIS_WEEK)).toHaveLength(1)
  })

  it('leaves alone anything already rated, manual, or a brick leg', () => {
    expect(needsDebrief([g({ rpe: 7 })], THIS_WEEK)).toHaveLength(0)
    expect(needsDebrief([g({ source: 'manual' })], THIS_WEEK)).toHaveLength(0)
    expect(needsDebrief([g({ multisportId: 5 })], THIS_WEEK)).toHaveLength(0)
  })

  it('stops asking about workouts from last week', () => {
    expect(needsDebrief([g({ date: '2026-08-01' })], THIS_WEEK)).toHaveLength(0)
  })
})
