import { describe, expect, it } from 'vitest'
import activitiesFixture from '../__fixtures__/activities.json'
import dailyFixture from '../__fixtures__/daily.json'
import type { GarminActivityMonth, GarminDailyMonth } from '../types'
import {
  activityToEntry,
  splitStartLocal,
  sportFromTypeKey,
  toDailyHealth,
} from '../normalize'

const activities = activitiesFixture as unknown as GarminActivityMonth
const daily = dailyFixture as unknown as GarminDailyMonth

describe('sportFromTypeKey', () => {
  it('maps known run/bike/swim/strength keys', () => {
    expect(sportFromTypeKey('running')).toEqual({ category: 'aerobic', sport: 'run' })
    expect(sportFromTypeKey('road_biking')).toEqual({ category: 'aerobic', sport: 'bike' })
    expect(sportFromTypeKey('lap_swimming')).toEqual({ category: 'aerobic', sport: 'swim' })
    expect(sportFromTypeKey('strength_training')).toEqual({ category: 'strength' })
  })

  it('falls back on substrings and then other', () => {
    expect(sportFromTypeKey('ultra_run').sport).toBe('run')
    expect(sportFromTypeKey('mountain_biking').sport).toBe('bike')
    expect(sportFromTypeKey('yoga')).toEqual({ category: 'other' })
  })
})

describe('splitStartLocal', () => {
  it('splits date and time', () => {
    expect(splitStartLocal('2026-08-01 06:30:00')).toEqual({
      date: '2026-08-01',
      time: '06:30',
    })
  })
  it('handles missing input', () => {
    expect(splitStartLocal(undefined)).toEqual({})
  })
})

describe('activityToEntry', () => {
  it('converts a run: km distance + sec/km pace', () => {
    const e = activityToEntry(activities['9000000001'])
    expect(e.category).toBe('aerobic')
    expect(e.sport).toBe('run')
    expect(e.source).toBe('garmin')
    expect(e.garminActivityId).toBe(9000000001)
    expect(e.date).toBe('2026-08-01')
    expect(e.startTime).toBe('06:30')
    expect(e.distance).toBeCloseTo(10.12, 2)
    // 3012s / 10.1205km ≈ 297.6 sec/km
    expect(e.paceSec).toBe(Math.round(3012 / (10120.5 / 1000)))
    expect(e.cadence).toBe(176)
    expect(e.avgHr).toBe(152)
  })

  it('converts a bike: km distance + speedKmh', () => {
    const e = activityToEntry(activities['9000000002'])
    expect(e.sport).toBe('bike')
    expect(e.distance).toBeCloseTo(42, 2)
    // 42km / 1.5h = 28 km/h
    expect(e.speedKmh).toBeCloseTo(28, 1)
    expect(e.paceSec).toBeUndefined()
    expect(e.cadence).toBe(86)
  })

  it('converts a swim: meters distance + sec/100m pace', () => {
    const e = activityToEntry(activities['9000000003'])
    expect(e.sport).toBe('swim')
    expect(e.distance).toBe(2000)
    // 2400s / (2000/100) = 120 sec/100m
    expect(e.paceSec).toBe(120)
  })

  it('maps strength activities to a named strength entry', () => {
    const e = activityToEntry(activities['9000000004'])
    expect(e.category).toBe('strength')
    expect(e.strengthName).toBe('אימון כוח')
    expect(e.distance).toBeUndefined()
  })
})

describe('toDailyHealth', () => {
  it('extracts steps, sleep minutes, hrv and body battery', () => {
    const d = toDailyHealth('2026-08-01', daily['2026-08-01'])
    expect(d.steps).toBe(12450)
    expect(d.restingHr).toBe(48)
    expect(d.sleepScore).toBe(82)
    expect(d.sleepMin).toBe(440) // 26400s → 440min
    expect(d.deepMin).toBe(80)
    expect(d.remMin).toBe(100)
    expect(d.hrvLastNight).toBe(62)
    expect(d.hrvStatus).toBe('BALANCED')
    expect(d.bodyBatteryHigh).toBe(92)
    expect(d.bodyBatteryLow).toBe(18)
    expect(d.vo2max).toBe(52)
  })
})
