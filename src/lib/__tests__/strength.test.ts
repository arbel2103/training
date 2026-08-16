import { describe, expect, it } from 'vitest'
import {
  MEV,
  MRV,
  estimate1RM,
  lastPerformance,
  parseWeightKg,
  personalBest,
  tonnage,
  volumeByMuscle,
  volumeZone,
} from '../strength'
import type { LoggedSet, WorkoutEntry } from '../../store/useStore'

const set = (o: Partial<LoggedSet> = {}): LoggedSet => ({
  exerciseId: 'e1',
  exerciseName: 'לחיצת חזה',
  reps: 10,
  weightKg: 40,
  muscles: ['chest'],
  ...o,
})

const session = (date: string, sets: LoggedSet[]): WorkoutEntry =>
  ({ id: date, date, category: 'strength', strengthName: 'חזה', sets }) as WorkoutEntry

describe('parseWeightKg', () => {
  it('reads a plain number out of the template text', () => {
    expect(parseWeightKg('40 ק״ג')).toBe(40)
    expect(parseWeightKg('42.5')).toBe(42.5)
    expect(parseWeightKg('12,5 קג')).toBe(12.5)
  })

  it('gives up quietly on text that names no weight', () => {
    expect(parseWeightKg('משקל גוף')).toBeUndefined()
    expect(parseWeightKg('גומייה')).toBeUndefined()
    expect(parseWeightKg('')).toBeUndefined()
    expect(parseWeightKg(undefined)).toBeUndefined()
  })

  it('refuses zero and negatives rather than prefilling nonsense', () => {
    expect(parseWeightKg('0')).toBeUndefined()
    expect(parseWeightKg('-5')).toBeUndefined()
  })
})

describe('estimate1RM', () => {
  it('returns the weight itself for a single', () => {
    expect(estimate1RM(100, 1)).toBe(100)
  })

  it('scales up with reps, as Epley does', () => {
    expect(estimate1RM(100, 10)).toBeCloseTo(133.3, 1)
    expect(estimate1RM(60, 5)).toBeCloseTo(70, 1)
  })

  it('is zero for nonsense input instead of NaN', () => {
    expect(estimate1RM(0, 10)).toBe(0)
    expect(estimate1RM(50, 0)).toBe(0)
  })
})

describe('tonnage', () => {
  it('sums weight times reps', () => {
    expect(tonnage([{ weightKg: 40, reps: 10 }, { weightKg: 50, reps: 5 }])).toBe(650)
  })

  it('counts bodyweight sets as zero load rather than breaking', () => {
    expect(tonnage([{ reps: 12 }, { weightKg: 20, reps: 10 }])).toBe(200)
  })
})

describe('lastPerformance', () => {
  const log = [
    session('2026-08-01', [set({ weightKg: 35 })]),
    session('2026-08-08', [set({ weightKg: 40 }), set({ weightKg: 40, reps: 8 })]),
    session('2026-08-05', [set({ weightKg: 37.5 })]),
  ]

  it('finds the most recent session that included the exercise', () => {
    const last = lastPerformance(log, 'e1')
    expect(last).toMatchObject({ date: '2026-08-08' })
    expect(last!.sets).toEqual([
      { weightKg: 40, reps: 10 },
      { weightKg: 40, reps: 8 },
    ])
  })

  it('ignores sessions that did not include it', () => {
    const other = [...log, session('2026-08-20', [set({ exerciseId: 'zzz' })])]
    expect(lastPerformance(other, 'e1')!.date).toBe('2026-08-08')
  })

  it('matches on name too, so a recreated exercise keeps its history', () => {
    expect(lastPerformance(log, 'brand-new-id', 'לחיצת חזה')!.date).toBe('2026-08-08')
  })

  it('can look strictly before a date, for "the time before this one"', () => {
    expect(lastPerformance(log, 'e1', undefined, '2026-08-08')!.date).toBe('2026-08-05')
  })

  it('returns null when the exercise was never logged', () => {
    expect(lastPerformance(log, 'never')).toBeNull()
    expect(lastPerformance([], 'e1')).toBeNull()
  })

  it('ignores strength entries that carry no sets at all', () => {
    const legacy = [
      { id: 'x', date: '2026-08-30', category: 'strength' } as WorkoutEntry,
      ...log,
    ]
    expect(lastPerformance(legacy, 'e1')!.date).toBe('2026-08-08')
  })
})

describe('personalBest', () => {
  it('picks the set with the highest estimated 1RM, not the heaviest bar', () => {
    const log = [
      session('2026-08-01', [set({ weightKg: 60, reps: 3 })]), // e1RM 66
      session('2026-08-08', [set({ weightKg: 50, reps: 12 })]), // e1RM 70
    ]
    expect(personalBest(log, 'e1')).toMatchObject({
      weightKg: 50,
      reps: 12,
      date: '2026-08-08',
    })
  })

  it('skips bodyweight sets, which carry no load to compare', () => {
    const log = [session('2026-08-01', [set({ weightKg: undefined, reps: 30 })])]
    expect(personalBest(log, 'e1')).toBeNull()
  })

  it('returns null with no history', () => {
    expect(personalBest([], 'e1')).toBeNull()
  })
})

describe('volumeByMuscle', () => {
  it('counts one set per tagged muscle', () => {
    const log = [
      session('2026-08-10', [
        set({ muscles: ['chest'] }),
        set({ muscles: ['chest'] }),
        set({ muscles: ['back'] }),
      ]),
    ]
    const { byMuscle } = volumeByMuscle(log, '2026-08-01', '2026-08-31')

    expect(byMuscle.chest).toBe(2)
    expect(byMuscle.back).toBe(1)
    expect(byMuscle.quads).toBe(0)
  })

  it('credits every muscle a set is tagged with', () => {
    const log = [session('2026-08-10', [set({ muscles: ['chest', 'triceps'] })])]
    const { byMuscle } = volumeByMuscle(log, '2026-08-01', '2026-08-31')

    expect(byMuscle.chest).toBe(1)
    expect(byMuscle.triceps).toBe(1)
  })

  it('reports untagged sets separately instead of undercounting silently', () => {
    const log = [
      session('2026-08-10', [set({ muscles: [] }), set({ muscles: undefined })]),
    ]
    const out = volumeByMuscle(log, '2026-08-01', '2026-08-31')

    expect(out.untaggedSets).toBe(2)
    expect(Object.values(out.byMuscle).every((v) => v === 0)).toBe(true)
  })

  it('honours the date range on both ends', () => {
    const log = [
      session('2026-07-31', [set()]),
      session('2026-08-01', [set()]),
      session('2026-08-31', [set()]),
      session('2026-09-01', [set()]),
    ]
    expect(volumeByMuscle(log, '2026-08-01', '2026-08-31').byMuscle.chest).toBe(2)
  })

  it('ignores aerobic entries entirely', () => {
    const log = [
      { id: 'r', date: '2026-08-10', category: 'aerobic', sport: 'run' } as WorkoutEntry,
    ]
    expect(volumeByMuscle(log, '2026-08-01', '2026-08-31').byMuscle.chest).toBe(0)
  })
})

describe('volumeZone', () => {
  it('splits at the MEV and MRV landmarks', () => {
    expect(volumeZone(MEV - 1)).toBe('under')
    expect(volumeZone(MEV)).toBe('working')
    expect(volumeZone(MRV)).toBe('working')
    expect(volumeZone(MRV + 1)).toBe('over')
  })

  it('treats no training at all as under', () => {
    expect(volumeZone(0)).toBe('under')
  })
})
