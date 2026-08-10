import { describe, expect, it } from 'vitest'
import {
  buildFuelPlan,
  carbsPerHour,
  dailyTargets,
  fluidMlPerHour,
  intraPlan,
  postPlan,
  prePlan,
  sessionDurationMin,
  sessionIntensity,
  sodiumMgPerHour,
} from '../nutritionMath'
import type { FuelSession } from '../triLink'

describe('carbsPerHour', () => {
  it('needs nothing for a short session', () => {
    expect(carbsPerHour(30, 'hard')).toBe(0)
    expect(carbsPerHour(44, 'moderate')).toBe(0)
  })

  it('stays at zero for an easy hour but fuels a hard one', () => {
    expect(carbsPerHour(60, 'easy')).toBe(0)
    expect(carbsPerHour(60, 'hard')).toBe(30)
  })

  it('lands in the 30–60 g/h band for 1–2.5 h', () => {
    expect(carbsPerHour(90, 'moderate')).toBe(45)
    expect(carbsPerHour(90, 'hard')).toBe(60)
    expect(carbsPerHour(150, 'moderate')).toBe(60)
  })

  it('goes up to 90 g/h beyond three hours', () => {
    expect(carbsPerHour(240, 'moderate')).toBe(90)
    expect(carbsPerHour(240, 'easy')).toBe(75)
  })

  it('never exceeds the 90 g/h ceiling', () => {
    for (const min of [45, 60, 120, 180, 300, 600]) {
      for (const i of ['easy', 'moderate', 'hard'] as const) {
        expect(carbsPerHour(min, i)).toBeLessThanOrEqual(90)
      }
    }
  })
})

describe('fluid and sodium', () => {
  it('keeps fluid inside 400–900 ml/h', () => {
    for (const i of ['easy', 'moderate', 'hard'] as const) {
      for (const hot of [false, true]) {
        const v = fluidMlPerHour(i, hot)
        expect(v).toBeGreaterThanOrEqual(400)
        expect(v).toBeLessThanOrEqual(900)
      }
    }
  })

  it('raises fluid in the heat', () => {
    expect(fluidMlPerHour('moderate', true)).toBeGreaterThan(
      fluidMlPerHour('moderate', false),
    )
  })

  it('derives sodium from fluid at roughly 300–600 mg per litre', () => {
    const fluid = 600
    const s = sodiumMgPerHour(fluid, false)
    expect(s).toBeGreaterThanOrEqual(250)
    expect(s).toBeLessThanOrEqual(400)
    expect(sodiumMgPerHour(fluid, true)).toBeGreaterThan(s)
  })
})

describe('intraPlan', () => {
  it('is null for a session too short to fuel', () => {
    expect(intraPlan({ durationMin: 30, intensity: 'hard' })).toBeNull()
  })

  it('still prescribes fluid on an easy hour with no carbs', () => {
    const p = intraPlan({ durationMin: 60, intensity: 'easy' })!
    expect(p.carbsPerHour).toBe(0)
    expect(p.fluidMlPerHour).toBeGreaterThan(0)
  })

  it('scales totals by duration', () => {
    const p = intraPlan({ durationMin: 120, intensity: 'hard' })!
    expect(p.carbsPerHour).toBe(60)
    expect(p.carbsTotal).toBe(120)
  })

  it('flags multiple carb sources only above 60 g/h', () => {
    expect(intraPlan({ durationMin: 120, intensity: 'hard' })!.needsMultipleCarbSources).toBe(
      false,
    )
    expect(intraPlan({ durationMin: 240, intensity: 'hard' })!.needsMultipleCarbSources).toBe(
      true,
    )
  })
})

describe('prePlan', () => {
  it('uses about 1 g/kg when there is only an hour', () => {
    const p = prePlan({ durationMin: 120, intensity: 'moderate', weightKg: 70, hoursUntil: 1 })
    expect(p.carbsPerKg).toBe(1)
    expect(p.carbsGrams).toBe(70)
  })

  it('loads more carbs when there is a longer window before a long session', () => {
    const p = prePlan({ durationMin: 180, intensity: 'moderate', weightKg: 70, hoursUntil: 4 })
    expect(p.carbsPerKg).toBe(3)
    expect(p.carbsGrams).toBe(210)
  })

  it('keeps the load small for a short easy session', () => {
    const p = prePlan({ durationMin: 45, intensity: 'easy', weightKg: 70, hoursUntil: 3 })
    expect(p.carbsPerKg).toBeLessThanOrEqual(1)
  })

  it('stays inside the 1–4 g/kg guideline', () => {
    for (const h of [0.5, 1, 2, 3, 5]) {
      for (const dur of [45, 90, 180]) {
        const p = prePlan({ durationMin: dur, intensity: 'moderate', weightKg: 70, hoursUntil: h })
        expect(p.carbsPerKg).toBeGreaterThanOrEqual(1)
        expect(p.carbsPerKg).toBeLessThanOrEqual(4)
      }
    }
  })

  it('adds sodium in the heat', () => {
    const cool = prePlan({ durationMin: 120, intensity: 'moderate', weightKg: 70 })
    const hot = prePlan({ durationMin: 120, intensity: 'moderate', weightKg: 70, hot: true })
    expect(hot.sodiumMg).toBeGreaterThan(cool.sodiumMg)
  })
})

describe('postPlan', () => {
  it('pushes carbs up when another session is coming soon', () => {
    const soon = postPlan({
      durationMin: 90,
      intensity: 'moderate',
      weightKg: 70,
      nextSessionSoon: true,
    })
    const relaxed = postPlan({ durationMin: 90, intensity: 'moderate', weightKg: 70 })
    expect(soon.carbsGrams).toBeGreaterThan(relaxed.carbsGrams)
  })

  it('keeps protein in the 0.25–0.4 g/kg per-meal band', () => {
    const p = postPlan({ durationMin: 120, intensity: 'hard', weightKg: 70 })
    expect(p.proteinGrams / 70).toBeGreaterThanOrEqual(0.25)
    expect(p.proteinGrams / 70).toBeLessThanOrEqual(0.4)
  })
})

describe('buildFuelPlan', () => {
  it('assembles all three phases for a long ride', () => {
    const plan = buildFuelPlan({ durationMin: 240, intensity: 'moderate', weightKg: 72 })
    expect(plan.pre.carbsGrams).toBeGreaterThan(0)
    expect(plan.intra!.carbsPerHour).toBe(90)
    expect(plan.post.proteinGrams).toBeGreaterThan(0)
  })

  it('skips the intra phase on a short easy run', () => {
    expect(buildFuelPlan({ durationMin: 35, intensity: 'easy' }).intra).toBeNull()
  })
})

describe('sessionIntensity / sessionDurationMin', () => {
  const s = (over: Partial<FuelSession>): FuelSession => ({
    id: 'x',
    date: '2026-08-10',
    sport: 'run',
    done: false,
    ...over,
  })

  it('maps the plan intensity through', () => {
    expect(sessionIntensity(s({ intensity: 'intense' }))).toBe('hard')
    expect(sessionIntensity(s({ intensity: 'easy' }))).toBe('easy')
    expect(sessionIntensity(s({ intensity: 'long' }))).toBe('moderate')
  })

  it('reads intensity hints out of a Hebrew label', () => {
    expect(sessionIntensity(s({ label: 'אינטרוולים' }))).toBe('hard')
    expect(sessionIntensity(s({ label: 'ריצה קלה' }))).toBe('easy')
  })

  it('prefers an explicit duration and estimates one otherwise', () => {
    expect(sessionDurationMin(s({ durationMin: 75 }))).toBe(75)
    expect(sessionDurationMin(s({ sport: 'run', distance: 10 }))).toBe(55)
    expect(sessionDurationMin(s({ sport: 'bike', distance: 60 }))).toBe(120)
    expect(sessionDurationMin(s({}))).toBe(60)
  })
})

describe('dailyTargets', () => {
  it('raises carbs with training volume', () => {
    const rest = dailyTargets(70, 0)
    const heavy = dailyTargets(70, 200)
    expect(heavy.carbs).toBeGreaterThan(rest.carbs)
  })

  it('keeps protein in the 1.6–2.2 g/kg daily range', () => {
    for (const min of [0, 60, 200]) {
      const t = dailyTargets(70, min)
      expect(t.protein / 70).toBeGreaterThanOrEqual(1.6)
      expect(t.protein / 70).toBeLessThanOrEqual(2.2)
    }
  })

  it('passes the measured burn through as the calorie target', () => {
    expect(dailyTargets(70, 60, 2847).kcal).toBe(2850)
  })
})
