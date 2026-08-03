import { describe, expect, it } from 'vitest'
import type { WorkoutEntry } from '../../../store/useStore'
import { classifyIntensity, maxHrReference } from '../autoTag'
import { planImport } from '../importer'
import type { GarminActivitySummary } from '../types'

const MAX = 190

describe('classifyIntensity', () => {
  it('tags a hard effort as intense', () => {
    expect(
      classifyIntensity({ sport: 'run', distance: 8, durationMin: 40, avgHr: 168 }, MAX),
    ).toBe('intense')
  })

  it('tags a long slow run as long, not intense', () => {
    expect(
      classifyIntensity({ sport: 'run', distance: 20, durationMin: 120, avgHr: 140 }, MAX),
    ).toBe('long')
  })

  it('tags a short low-HR run as easy', () => {
    expect(
      classifyIntensity({ sport: 'run', distance: 6, durationMin: 35, avgHr: 130 }, MAX),
    ).toBe('easy')
  })

  it('tags a short swim as technique', () => {
    expect(classifyIntensity({ sport: 'swim', distance: 600, durationMin: 25 }, MAX)).toBe(
      'technique',
    )
  })

  it('still tags by duration when heart rate is missing', () => {
    expect(classifyIntensity({ sport: 'bike', durationMin: 150 }, undefined)).toBe('long')
    expect(classifyIntensity({ sport: 'bike', durationMin: 40 }, undefined)).toBe('easy')
  })

  it('returns nothing without any signal', () => {
    expect(classifyIntensity({ sport: 'run' }, MAX)).toBeUndefined()
    expect(classifyIntensity({}, MAX)).toBeUndefined()
  })
})

describe('maxHrReference', () => {
  it('takes the highest recorded max, ignoring implausible values', () => {
    const log = [
      { id: '1', date: '2026-08-01', category: 'aerobic', maxHr: 175 },
      { id: '2', date: '2026-08-02', category: 'aerobic', maxHr: 188 },
    ] as WorkoutEntry[]
    expect(maxHrReference(log)).toBe(188)
    expect(maxHrReference([])).toBeUndefined()
  })
})

const hardRun: GarminActivitySummary = {
  activityId: 111,
  activityType: { typeKey: 'running' },
  startTimeLocal: '2026-08-01 06:30:00',
  distance: 8000,
  duration: 2400,
  averageHR: 170,
  maxHR: 188,
}

describe('auto-tagging through the importer', () => {
  it('tags new Garmin entries and marks them as auto', () => {
    const { creates } = planImport([hardRun], [])
    expect(creates[0].aerobicIntensity).toBe('intense')
    expect(creates[0].autoTagged).toBe(true)
  })

  it('re-tags an entry whose tag is still automatic', () => {
    const existing: WorkoutEntry[] = [
      {
        id: 'x',
        date: '2026-08-01',
        category: 'aerobic',
        sport: 'run',
        source: 'garmin',
        garminActivityId: 111,
        aerobicIntensity: 'easy',
        autoTagged: true,
      },
    ]
    const { updates } = planImport([hardRun], existing)
    expect(updates[0].patch.aerobicIntensity).toBe('intense')
  })

  it('never overwrites a tag the user edited', () => {
    const existing: WorkoutEntry[] = [
      {
        id: 'x',
        date: '2026-08-01',
        category: 'aerobic',
        sport: 'run',
        source: 'garmin',
        garminActivityId: 111,
        aerobicIntensity: 'technique',
        autoTagged: false, // user chose this
      },
    ]
    const { updates } = planImport([hardRun], existing)
    expect(updates[0].patch).not.toHaveProperty('aerobicIntensity')
    expect(updates[0].patch).not.toHaveProperty('autoTagged')
    // other metrics still refresh
    expect(updates[0].patch.avgHr).toBe(170)
  })

  it('keeps a manual entry’s own label when merging Garmin data into it', () => {
    const manual: WorkoutEntry[] = [
      {
        id: 'm',
        date: '2026-08-01',
        category: 'aerobic',
        sport: 'run',
        source: 'manual',
        aerobicIntensity: 'long',
      },
    ]
    const { updates } = planImport([hardRun], manual)
    expect(updates[0].patch).not.toHaveProperty('aerobicIntensity')
  })
})
