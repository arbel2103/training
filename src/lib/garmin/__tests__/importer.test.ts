import { describe, expect, it } from 'vitest'
import type { PlanWeek, WorkoutEntry } from '../../../store/useStore'
import { weekCompletion } from '../../planMatch'
import activitiesFixture from '../__fixtures__/activities.json'
import { planImport } from '../importer'
import type { GarminActivityMonth } from '../types'

const activities = activitiesFixture as unknown as GarminActivityMonth
const runAct = activities['9000000001'] // running, 2026-08-01

describe('planImport', () => {
  it('creates entries when the log is empty', () => {
    const { creates, updates } = planImport(Object.values(activities), [])
    expect(updates).toHaveLength(0)
    expect(creates).toHaveLength(4)
    expect(creates.every((e) => e.source === 'garmin')).toBe(true)
  })

  it('updates in place when the same activity was already imported', () => {
    const existing: WorkoutEntry[] = [
      {
        id: 'x1',
        date: '2026-08-01',
        category: 'aerobic',
        sport: 'run',
        source: 'garmin',
        garminActivityId: 9000000001,
        distance: 9.9,
        rpe: 7,
        note: 'הרגשתי מצוין',
      },
    ]
    const { creates, updates } = planImport([runAct], existing)
    expect(creates).toHaveLength(0)
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe('x1')
    expect(updates[0].patch.distance).toBeCloseTo(10.12, 2)
    // rpe/note are not in the patch → preserved by the store merge
    expect(updates[0].patch).not.toHaveProperty('rpe')
    expect(updates[0].patch).not.toHaveProperty('note')
  })

  it('merges into a manual entry on the same day + sport', () => {
    const manual: WorkoutEntry[] = [
      {
        id: 'm1',
        date: '2026-08-01',
        category: 'aerobic',
        sport: 'run',
        source: 'manual',
        rpe: 8,
        note: 'ריצה קשה',
        aerobicIntensity: 'intense',
      },
    ]
    const { creates, updates } = planImport([runAct], manual)
    expect(creates).toHaveLength(0)
    expect(updates).toHaveLength(1)
    expect(updates[0].id).toBe('m1')
    expect(updates[0].patch.source).toBe('garmin')
    expect(updates[0].patch.garminActivityId).toBe(9000000001)
    expect(updates[0].patch.distance).toBeCloseTo(10.12, 2)
    // user's subjective fields are not overwritten
    expect(updates[0].patch).not.toHaveProperty('rpe')
    expect(updates[0].patch).not.toHaveProperty('aerobicIntensity')
  })

  it('does not merge across different sports', () => {
    const manual: WorkoutEntry[] = [
      { id: 'm2', date: '2026-08-01', category: 'aerobic', sport: 'bike', source: 'manual' },
    ]
    const { creates, updates } = planImport([runAct], manual)
    expect(updates).toHaveLength(0)
    expect(creates).toHaveLength(1)
  })
})

describe('auto-completion via weekCompletion', () => {
  it('marks a planned run done from an imported Garmin entry', () => {
    // week starting Sunday 2026-07-26; planned run on Saturday (day 6 = 2026-08-01)
    const week: PlanWeek = {
      id: 'w1',
      weekStart: '2026-07-26',
      sessions: [
        { id: 's-run', day: 6, sport: 'run', label: 'ריצה 10 ק״מ', distance: 10 },
        { id: 's-bike', day: 3, sport: 'bike', label: 'רכיבה' },
      ],
    }
    const { creates } = planImport([runAct], [])
    const log: WorkoutEntry[] = creates.map((c, i) => ({ ...c, id: `g${i}` }))

    const result = weekCompletion(week, log)
    expect(result['s-run'].done).toBe(true)
    expect(result['s-run'].entry?.garminActivityId).toBe(9000000001)
    expect(result['s-bike'].done).toBe(false)
  })
})
