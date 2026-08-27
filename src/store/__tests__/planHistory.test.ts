import { beforeEach, describe, expect, it } from 'vitest'
import { useStore, type TrainingPlan } from '../useStore'

const s = () => useStore.getState()

const planWith = (distance: number): TrainingPlan => ({
  raceName: 'איש ברזל',
  weeks: [
    {
      id: 'w1',
      weekStart: '2026-08-23',
      sessions: [
        { id: 's1', day: 2, sport: 'bike', distance, label: 'אופניים' },
      ],
    },
  ],
})

beforeEach(() => {
  useStore.setState({ trainingPlan: null, planHistory: [], planned: [] })
})

describe('plan history', () => {
  it('keeps the plan a coach edit replaced', () => {
    s().setTrainingPlan(planWith(40))
    s().setTrainingPlan(planWith(90), 'המאמן החליף את התוכנית')

    expect(s().trainingPlan?.weeks[0].sessions[0].distance).toBe(90)
    expect(s().planHistory).toHaveLength(1)
    expect(s().planHistory[0].reason).toBe('המאמן החליף את התוכנית')
    expect(s().planHistory[0].plan?.weeks[0].sessions[0].distance).toBe(40)
  })

  it('does not record a snapshot for the very first plan', () => {
    s().setTrainingPlan(planWith(40))
    expect(s().planHistory).toHaveLength(0)
  })

  it('restores a previous version, and keeps the replaced one restorable too', () => {
    s().setTrainingPlan(planWith(40))
    s().setTrainingPlan(planWith(90))

    const target = s().planHistory[0].id
    expect(s().restorePlanSnapshot(target)).toBe(true)
    expect(s().trainingPlan?.weeks[0].sessions[0].distance).toBe(40)

    // undoing the undo has to stay possible
    expect(s().planHistory[0].reason).toBe('שוחזרה גרסה קודמת')
    expect(s().planHistory[0].plan?.weeks[0].sessions[0].distance).toBe(90)
  })

  it('reports an unknown snapshot instead of wiping the plan', () => {
    s().setTrainingPlan(planWith(40))
    expect(s().restorePlanSnapshot('nope')).toBe(false)
    expect(s().trainingPlan?.weeks[0].sessions[0].distance).toBe(40)
  })

  it('snapshots a single-week edit and a plan deletion', () => {
    s().setTrainingPlan(planWith(40))
    s().upsertPlanWeek(
      { id: 'w1', weekStart: '2026-08-23', sessions: [] },
      'המאמן עדכן את השבוע',
    )
    expect(s().planHistory[0].plan?.weeks[0].sessions).toHaveLength(1)

    s().clearPlan()
    expect(s().trainingPlan).toBeNull()
    expect(s().planHistory[0].reason).toBe('התוכנית נמחקה')
  })

  it('keeps the history bounded so it cannot grow forever', () => {
    s().setTrainingPlan(planWith(1))
    for (let i = 2; i < 40; i++) s().setTrainingPlan(planWith(i))
    expect(s().planHistory.length).toBeLessThanOrEqual(15)
    // newest first
    expect(s().planHistory[0].plan?.weeks[0].sessions[0].distance).toBe(38)
  })
})
