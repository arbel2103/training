import { describe, expect, it } from 'vitest'
import {
  SINGLE_TRANSPORTER_CEILING,
  carbsPerHour,
  fluidMlPerHour,
  intensityFromLabel,
  intensityFromPlanned,
  intraFuel,
  paceMinPerUnit,
  practicalCarbs,
  sessionDurationMin,
  sodiumMgPerHour,
} from '../fueling'
import type { PlanSession, WorkoutEntry } from '../../store/useStore'

const entry = (e: Partial<WorkoutEntry>): WorkoutEntry =>
  ({ id: Math.random().toString(), date: '2026-08-01', category: 'aerobic', ...e }) as WorkoutEntry

describe('carbsPerHour', () => {
  it('asks for nothing on a short easy session', () => {
    expect(carbsPerHour(40, 'easy')).toBe(0)
    expect(carbsPerHour(60, 'easy')).toBe(0)
    expect(carbsPerHour(70, 'moderate')).toBe(0)
  })

  it('fuels a short session only when it is hard', () => {
    expect(carbsPerHour(60, 'hard')).toBe(30)
    expect(carbsPerHour(40, 'hard')).toBe(0) // still too short to matter
  })

  it('lands inside the 30–60 g/h window for a 1–2.5 h session', () => {
    for (const intensity of ['easy', 'moderate', 'hard'] as const) {
      const v = carbsPerHour(120, intensity)
      expect(v).toBeGreaterThanOrEqual(30)
      expect(v).toBeLessThanOrEqual(60)
    }
  })

  it('separates easy from hard at the same duration', () => {
    expect(carbsPerHour(120, 'easy')).toBeLessThan(carbsPerHour(120, 'hard'))
    expect(carbsPerHour(200, 'easy')).toBeLessThan(carbsPerHour(200, 'hard'))
  })

  it('reaches but never exceeds 90 g/h on a long session', () => {
    expect(carbsPerHour(240, 'moderate')).toBe(90)
    expect(carbsPerHour(600, 'hard')).toBe(90)
  })

  it('rises monotonically with duration at a fixed intensity', () => {
    const series = [50, 80, 100, 160, 200, 300].map((m) => carbsPerHour(m, 'moderate'))
    expect(series).toEqual([...series].sort((a, b) => a - b))
  })

  it('leaves gym work unfuelled unless it runs very long', () => {
    expect(carbsPerHour(60, 'hard', false)).toBe(0)
    expect(carbsPerHour(90, 'hard', false)).toBe(0)
    expect(carbsPerHour(150, 'moderate', false)).toBe(30)
  })
})

describe('fluidMlPerHour', () => {
  it('stays inside what the gut can absorb', () => {
    for (const hot of [false, true]) {
      for (const i of ['easy', 'moderate', 'hard'] as const) {
        const r = fluidMlPerHour(i, hot)
        expect(r.low).toBeGreaterThanOrEqual(400)
        expect(r.high).toBeLessThanOrEqual(800)
        expect(r.low).toBeLessThan(r.high)
      }
    }
  })

  it('drinks more when it is hot and when the effort is harder', () => {
    expect(fluidMlPerHour('easy', true).high).toBeGreaterThan(fluidMlPerHour('easy').high)
    expect(fluidMlPerHour('hard').high).toBeGreaterThan(fluidMlPerHour('easy').high)
  })
})

describe('sodiumMgPerHour', () => {
  it('opens around the 500–600 mg/h starting point for a moderate session', () => {
    const r = sodiumMgPerHour(90, 'moderate')
    expect(r.low).toBeLessThanOrEqual(600)
    expect(r.high).toBeGreaterThanOrEqual(500)
  })

  it('is always a range, never a single fake-precise number', () => {
    const r = sodiumMgPerHour(120, 'hard', true)
    expect(r.high).toBeGreaterThan(r.low)
  })

  it('climbs with heat and with hours of sweating', () => {
    expect(sodiumMgPerHour(90, 'moderate', true).low).toBeGreaterThan(
      sodiumMgPerHour(90, 'moderate').low,
    )
    expect(sodiumMgPerHour(240, 'moderate').low).toBeGreaterThan(
      sodiumMgPerHour(90, 'moderate').low,
    )
  })

  it('reaches the salty-sweater-in-heat territory the research describes', () => {
    expect(sodiumMgPerHour(240, 'hard', true).high).toBeGreaterThanOrEqual(1000)
  })
})

describe('intraFuel', () => {
  it('explains why a short session needs nothing', () => {
    const out = intraFuel({ durationMin: 40, intensity: 'easy', endurance: true })
    expect(out.needed).toBe(false)
    expect(out).toMatchObject({ reason: expect.stringContaining('מים') })
  })

  it('explains why a gym session needs nothing', () => {
    const out = intraFuel({ durationMin: 60, intensity: 'hard', endurance: false })
    expect(out).toMatchObject({ needed: false, reason: expect.stringContaining('כוח') })
  })

  it('totals the carbohydrate across the session', () => {
    const out = intraFuel({ durationMin: 120, intensity: 'moderate', endurance: true })
    if (!out.needed) throw new Error('expected a plan')
    expect(out.carbsPerHour).toBe(50)
    expect(out.carbsTotal).toBe(100)
  })

  it('flags the two-carb-source requirement only above the transporter ceiling', () => {
    const long = intraFuel({ durationMin: 240, intensity: 'moderate', endurance: true })
    const mid = intraFuel({ durationMin: 120, intensity: 'moderate', endurance: true })
    if (!long.needed || !mid.needed) throw new Error('expected plans')

    expect(long.needsMixedCarbs).toBe(true)
    expect(long.notes.join(' ')).toContain('2:1')
    expect(mid.needsMixedCarbs).toBe(false)
    expect(mid.carbsPerHour).toBeLessThanOrEqual(SINGLE_TRANSPORTER_CEILING)
  })

  it('warns about gut training only when the target is genuinely high', () => {
    const big = intraFuel({ durationMin: 240, intensity: 'hard', endurance: true })
    const small = intraFuel({ durationMin: 90, intensity: 'moderate', endurance: true })
    if (!big.needed || !small.needed) throw new Error('expected plans')

    expect(big.notes.join(' ')).toContain('הרגלה')
    expect(small.notes.join(' ')).not.toContain('הרגלה')
  })

  it('always says the sodium figure is a starting point', () => {
    const out = intraFuel({ durationMin: 180, intensity: 'moderate', endurance: true })
    if (!out.needed) throw new Error('expected a plan')
    expect(out.notes.join(' ')).toContain('נקודת פתיחה')
  })

  it('offers the hot-weather figures alongside, since the app has no forecast', () => {
    const out = intraFuel({ durationMin: 180, intensity: 'moderate', endurance: true })
    if (!out.needed || !out.hotWeather) throw new Error('expected a hot column')

    expect(out.hotWeather.fluidMlPerHour.high).toBeGreaterThan(out.fluidMlPerHour.high)
    expect(out.hotWeather.sodiumMgPerHour.low).toBeGreaterThan(out.sodiumMgPerHour.low)
  })

  it('drops the hot column when the plan is already for heat', () => {
    const out = intraFuel({
      durationMin: 180,
      intensity: 'moderate',
      endurance: true,
      hot: true,
    })
    if (!out.needed) throw new Error('expected a plan')
    expect(out.hotWeather).toBeNull()
  })

  it('refuses to invent a plan with no duration', () => {
    expect(intraFuel({ durationMin: 0, intensity: 'hard', endurance: true }).needed).toBe(
      false,
    )
  })
})

describe('reading the intensity off a session', () => {
  it('trusts the board’s explicit intensity', () => {
    expect(intensityFromPlanned('intense')).toBe('hard')
    expect(intensityFromPlanned('easy')).toBe('easy')
    expect(intensityFromPlanned('technique')).toBe('easy')
    expect(intensityFromPlanned(undefined)).toBeNull()
  })

  it('reads the common Hebrew session labels', () => {
    expect(intensityFromLabel('אינטרוולים')).toBe('hard')
    expect(intensityFromLabel('ריצת סף')).toBe('hard')
    expect(intensityFromLabel('שחרור')).toBe('easy')
    expect(intensityFromLabel('ארוכה')).toBe('easy')
    expect(intensityFromLabel('בריכה')).toBeNull()
    expect(intensityFromLabel(undefined)).toBeNull()
  })
})

describe('estimating how long the session will take', () => {
  const session = (s: Partial<PlanSession>): PlanSession =>
    ({ id: 's', day: 1, sport: 'run', ...s }) as PlanSession

  it('uses the planned duration when there is one', () => {
    expect(sessionDurationMin(session({ durationMin: 75, distance: 10 }), [])).toBe(75)
  })

  it('falls back to a default pace with too little history', () => {
    expect(sessionDurationMin(session({ distance: 10 }), [])).toBe(60)
  })

  it('uses the athlete’s own median pace once there is history', () => {
    const log = [
      entry({ sport: 'run', distance: 10, durationMin: 50 }),
      entry({ sport: 'run', distance: 10, durationMin: 51 }),
      entry({ sport: 'run', distance: 10, durationMin: 52 }),
    ]
    expect(paceMinPerUnit(log, 'run')).toBeCloseTo(5.1)
    expect(sessionDurationMin(session({ distance: 10 }), log)).toBe(51)
  })

  it('is not dragged around by one freak session', () => {
    const log = [
      entry({ sport: 'bike', distance: 30, durationMin: 60 }),
      entry({ sport: 'bike', distance: 30, durationMin: 62 }),
      entry({ sport: 'bike', distance: 30, durationMin: 61 }),
      entry({ sport: 'bike', distance: 5, durationMin: 90 }), // a ride with a puncture
    ]
    expect(paceMinPerUnit(log, 'bike')).toBeCloseTo(2.05, 1)
  })

  it('handles swim metres, not kilometres', () => {
    const log = [
      entry({ sport: 'swim', distance: 2000, durationMin: 40 }),
      entry({ sport: 'swim', distance: 1500, durationMin: 30 }),
      entry({ sport: 'swim', distance: 1000, durationMin: 20 }),
    ]
    expect(sessionDurationMin(session({ sport: 'swim', distance: 1500 }), log)).toBe(30)
  })

  it('gives no estimate for strength, which carries no distance', () => {
    expect(sessionDurationMin(session({ sport: 'strength' }), [])).toBeUndefined()
  })
})

describe('practicalCarbs', () => {
  it('says nothing when there is nothing to eat', () => {
    expect(practicalCarbs(0)).toBeNull()
  })

  it('turns a small target into one gel', () => {
    expect(practicalCarbs(20)).toContain('ג׳ל אחד')
  })

  it('covers a bottle-sized target with the bottle alone', () => {
    expect(practicalCarbs(30)).toBe('≈ בקבוק משקה איזוטוני (500 מ״ל) לשעה')
  })

  it('tops a bottle up with gels for the big targets', () => {
    expect(practicalCarbs(90)).toContain('2 ג׳לים')
  })

  it('counts a single gel in words, not "1 ג׳לים"', () => {
    expect(practicalCarbs(60)).toContain('+ ג׳ל לשעה')
  })

  it('never suggests a negative or zero number of gels', () => {
    for (let g = 1; g <= 120; g++) {
      const out = practicalCarbs(g)
      expect(out).not.toContain('-')
      expect(out).not.toMatch(/[-0]\s*ג׳ל/)
    }
  })
})

describe('the shape of the advice a real week produces', () => {
  const cases: [string, number, Parameters<typeof carbsPerHour>[1], number][] = [
    ['30 דק׳ שחרור', 30, 'easy', 0],
    ['שעה קלה', 60, 'easy', 0],
    ['שעה אינטרוולים', 60, 'hard', 30],
    ['שעתיים בינוני', 120, 'moderate', 50],
    ['רכיבה ארוכה 3 שעות', 180, 'easy', 75],
    ['חצי איירונמן ~5 שעות', 300, 'moderate', 90],
  ]

  it.each(cases)('%s → %i g/h', (_label, min, intensity, expected) => {
    expect(carbsPerHour(min, intensity)).toBe(expected)
  })
})
