import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../useStore'
import { buildContext, executeTool } from '../../lib/coachTools'
import { toISODate } from '../../lib/dates'

const s = () => useStore.getState()
const today = () => toISODate(new Date())

beforeEach(() => {
  useStore.setState({
    log: [],
    planned: [],
    trainingPlan: null,
    weighIns: [],
    strengthCategories: [],
    coachMemory: [],
    garminDaily: [],
    calendarBusy: [],
  })
})

describe('log_workout', () => {
  it('logs a workout the watch never saw', () => {
    const out = executeTool('log_workout', {
      date: '2026-08-18',
      category: 'aerobic',
      sport: 'run',
      distance: 8,
      durationMin: 44,
      rpe: 6,
      note: 'הרגיש טוב',
    })
    expect(out).toContain('נרשם')
    expect(s().log).toHaveLength(1)
    expect(s().log[0]).toMatchObject({ sport: 'run', distance: 8, rpe: 6 })
  })

  it('defaults to today when no date is given', () => {
    executeTool('log_workout', { category: 'strength', strengthName: 'רגליים' })
    expect(s().log[0].date).toBe(today())
  })

  it('refuses to double-log over a workout already synced from Garmin', () => {
    s().addEntry({
      date: '2026-08-18',
      category: 'aerobic',
      sport: 'run',
      distance: 8,
      source: 'garmin',
    })
    const out = executeTool('log_workout', {
      date: '2026-08-18',
      category: 'aerobic',
      sport: 'run',
      distance: 8,
    })
    expect(out).toContain('כבר רשום')
    expect(out).toContain('set_workout_debrief')
    expect(s().log).toHaveLength(1)
  })

  it('rejects an aerobic entry with no sport, and a bad date', () => {
    expect(executeTool('log_workout', { category: 'aerobic' })).toContain('sport')
    expect(
      executeTool('log_workout', { category: 'other', date: '18/08/2026' }),
    ).toContain('yyyy-mm-dd')
    expect(s().log).toHaveLength(0)
  })
})

describe('set_workout_debrief', () => {
  it('fills in the feel a Garmin import cannot know', () => {
    s().addEntry({
      date: '2026-08-18',
      category: 'aerobic',
      sport: 'bike',
      source: 'garmin',
    })
    const id = s().log[0].id
    executeTool('set_workout_debrief', { id, rpe: 8, note: 'רוח נגדית' })
    expect(s().log[0]).toMatchObject({ rpe: 8, note: 'רוח נגדית' })
  })

  it('explains itself instead of throwing on an unknown id', () => {
    expect(executeTool('set_workout_debrief', { id: 'nope', rpe: 5 })).toContain(
      'לא נמצא',
    )
  })

  it('refuses an RPE outside 1–10', () => {
    s().addEntry({ date: '2026-08-18', category: 'other' })
    const id = s().log[0].id
    expect(executeTool('set_workout_debrief', { id, rpe: 42 })).toContain('1')
    expect(s().log[0].rpe).toBeUndefined()
  })
})

describe('log_weight', () => {
  it('records a weigh-in', () => {
    executeTool('log_weight', { weightKg: 74.5, date: '2026-08-18' })
    expect(s().weighIns.at(-1)).toMatchObject({ date: '2026-08-18', weight: 74.5 })
  })

  it('rejects a nonsense weight', () => {
    expect(executeTool('log_weight', { weightKg: 0 })).toContain('סביר')
    expect(s().weighIns).toHaveLength(0)
  })
})

describe('what the coach is shown about strength', () => {
  it('spells out the sets actually performed, collapsed into runs', () => {
    s().addEntry({
      date: today(),
      category: 'strength',
      strengthName: 'פלג גוף עליון',
      sets: [
        { exerciseId: 'e1', exerciseName: 'לחיצת חזה', reps: 8, weightKg: 55, muscles: ['chest'] },
        { exerciseId: 'e1', exerciseName: 'לחיצת חזה', reps: 8, weightKg: 55, muscles: ['chest'] },
        { exerciseId: 'e1', exerciseName: 'לחיצת חזה', reps: 6, weightKg: 55, muscles: ['chest'] },
        { exerciseId: 'e2', exerciseName: 'מתח', reps: 6, muscles: ['back'] },
      ],
    })
    const ctx = buildContext()
    expect(ctx).toContain('לחיצת חזה: 2×8 @55, 1×6 @55')
    expect(ctx).toContain('מתח: 1×6')
    expect(ctx).toContain('4 סטים')
  })

  it('reports volume per muscle against the landmarks', () => {
    s().addEntry({
      date: today(),
      category: 'strength',
      sets: Array.from({ length: 12 }, () => ({
        exerciseId: 'e1',
        exerciseName: 'סקוואט',
        reps: 8,
        weightKg: 60,
        muscles: ['quads' as const],
      })),
    })
    const ctx = buildContext()
    expect(ctx).toContain('נפח כוח מצטבר')
    expect(ctx).toContain('ארבע ראשי 12')
  })

  it('counts untagged sets separately instead of hiding them', () => {
    s().addEntry({
      date: today(),
      category: 'strength',
      sets: [{ exerciseId: 'e1', exerciseName: 'משהו', reps: 10 }],
    })
    expect(buildContext()).toContain('לא תויגו')
  })

  it('gives each logged workout an id the coach can debrief against', () => {
    s().addEntry({ date: today(), category: 'aerobic', sport: 'run', distance: 5 })
    expect(buildContext()).toContain(s().log[0].id)
  })
})

describe('finishStrengthSession — folding into a Garmin strength entry', () => {
  const startSession = () => {
    useStore.setState({
      strengthCategories: [
        {
          id: 'c1',
          name: 'רגליים',
          exercises: [
            { id: 'e1', name: 'סקוואט', sets: 2, reps: [8, 8], weight: '80', updatedAt: '' },
          ],
        },
      ],
    })
    useStore.getState().startStrengthSession('c1')
    useStore.getState().logStrengthSet('e1', { reps: 8, weightKg: 80 })
    useStore.getState().logStrengthSet('e1', { reps: 8, weightKg: 80 })
  }

  it('merges the sets into a same-day Garmin workout instead of duplicating', () => {
    const today = toISODate(new Date())
    useStore.setState({
      log: [
        {
          id: 'g1',
          date: today,
          category: 'strength',
          source: 'garmin',
          garminActivityId: 555,
          avgHr: 120,
          durationMin: 50,
          calories: 330,
        },
      ],
    })
    startSession()
    useStore.getState().finishStrengthSession({ rpe: 8, intensity: 'heavy' })

    const strength = s().log.filter((e) => e.category === 'strength')
    expect(strength).toHaveLength(1) // no duplicate
    const e = strength[0]
    expect(e.id).toBe('g1')
    expect(e.avgHr).toBe(120) // Garmin metrics kept
    expect(e.durationMin).toBe(50)
    expect(e.calories).toBe(330)
    expect(e.source).toBe('garmin')
    expect(e.sets).toHaveLength(2) // app set data added
    expect(e.strengthName).toBe('רגליים')
    expect(e.rpe).toBe(8)
  })

  it('creates its own entry when there is no Garmin workout that day', () => {
    useStore.setState({ log: [] })
    startSession()
    useStore.getState().finishStrengthSession({})
    const strength = s().log.filter((e) => e.category === 'strength')
    expect(strength).toHaveLength(1)
    expect(strength[0].source).toBe('manual')
    expect(strength[0].sets).toHaveLength(2)
  })

  it('does not fold into a Garmin entry that already carries sets', () => {
    const today = toISODate(new Date())
    useStore.setState({
      log: [
        {
          id: 'g1',
          date: today,
          category: 'strength',
          source: 'garmin',
          garminActivityId: 555,
          avgHr: 120,
          sets: [{ exerciseId: 'x', exerciseName: 'קיים', reps: 5 }],
        },
      ],
    })
    startSession()
    useStore.getState().finishStrengthSession({})
    // the occupied Garmin entry is left alone; a new one is created
    expect(s().log.filter((e) => e.category === 'strength')).toHaveLength(2)
  })
})
