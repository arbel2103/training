import { describe, expect, it } from 'vitest'
import {
  buildFuelPlan,
  carbsPerHour,
  dailyTargets,
  fluidMlPerHour,
  intraPlan,
  postPlan,
  preCarbsPerKg,
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
    expect(carbsPerHour(50, 'easy')).toBe(0)
    expect(carbsPerHour(50, 'hard')).toBe(30)
  })

  it('rises with intensity at every duration, not just with duration', () => {
    for (const min of [75, 120, 170, 240]) {
      const easy = carbsPerHour(min, 'easy')
      const moderate = carbsPerHour(min, 'moderate')
      const hard = carbsPerHour(min, 'hard')
      expect(easy, `${min}min`).toBeLessThan(moderate)
      expect(moderate, `${min}min`).toBeLessThanOrEqual(hard)
    }
  })

  it('rises with duration at a fixed intensity', () => {
    const at = (m: number) => carbsPerHour(m, 'moderate')
    expect(at(50)).toBeLessThan(at(75))
    expect(at(75)).toBeLessThan(at(120))
    expect(at(120)).toBeLessThan(at(170))
    expect(at(170)).toBeLessThan(at(240))
  })

  it('stays at or under 60 g/h up to about 2.5 h', () => {
    for (const min of [75, 120, 149]) {
      for (const i of ['easy', 'moderate', 'hard'] as const) {
        const v = carbsPerHour(min, i)
        expect(v, `${min}/${i}`).toBeGreaterThan(0)
        expect(v, `${min}/${i}`).toBeLessThanOrEqual(60)
      }
    }
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

  it('does not fuel a normal gym session like an endurance one', () => {
    // the bug the user spotted: strength got the same 30 g/h as aerobic work
    expect(carbsPerHour(60, 'moderate', 'strength')).toBe(0)
    expect(carbsPerHour(90, 'hard', 'strength')).toBe(0)
    expect(carbsPerHour(60, 'hard', 'run')).toBeGreaterThan(0)
  })

  it('allows some carbohydrate through a very long gym session', () => {
    expect(carbsPerHour(150, 'moderate', 'strength')).toBe(30)
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

describe('preCarbsPerKg', () => {
  it('scales with how long the session is', () => {
    const h = 3 // plenty of time to digest, so demand is what shows through
    const short = preCarbsPerKg(45, 'moderate', h)
    const hour = preCarbsPerKg(75, 'moderate', h)
    const twoHours = preCarbsPerKg(120, 'moderate', h)
    const long = preCarbsPerKg(240, 'moderate', h)
    expect(short).toBeLessThan(hour)
    expect(hour).toBeLessThan(twoHours)
    expect(twoHours).toBeLessThan(long)
  })

  it('asks for very little before a short easy session', () => {
    expect(preCarbsPerKg(45, 'easy', 3)).toBeLessThanOrEqual(0.5)
  })

  it('reaches the top of the 1–4 g/kg range only for a very long session', () => {
    expect(preCarbsPerKg(300, 'moderate', 4)).toBe(4)
  })

  it('caps the load by the digestion window, however long the session', () => {
    // a 4-hour ride starting in an hour still cannot take a 4 g/kg meal
    expect(preCarbsPerKg(240, 'moderate', 1)).toBe(1)
    expect(preCarbsPerKg(240, 'moderate', 2)).toBe(2)
    expect(preCarbsPerKg(240, 'moderate', 3)).toBe(3)
  })

  it('never exceeds the 4 g/kg ceiling', () => {
    for (const dur of [30, 60, 120, 240, 600]) {
      for (const i of ['easy', 'moderate', 'hard'] as const) {
        for (const h of [1, 2, 3, 6]) {
          expect(preCarbsPerKg(dur, i, h)).toBeLessThanOrEqual(4)
        }
      }
    }
  })

  it('asks for less before an easy session than a hard one of the same length', () => {
    expect(preCarbsPerKg(120, 'easy', 3)).toBeLessThan(preCarbsPerKg(120, 'hard', 3))
  })
})

describe('prePlan', () => {
  it('caps at about 1 g/kg when there is only an hour', () => {
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
    expect(p.carbsGrams).toBeLessThanOrEqual(35)
    expect(p.note).toContain('אין צורך בטעינה')
  })

  it('does not prescribe a long-ride breakfast before a 75-minute run', () => {
    // the bug this replaced: every session got ~1.5 g/kg regardless of length
    const run = prePlan({ durationMin: 75, intensity: 'hard', weightKg: 76, hoursUntil: 2 })
    const ride = prePlan({ durationMin: 240, intensity: 'moderate', weightKg: 76, hoursUntil: 2 })
    expect(run.carbsGrams).toBeLessThan(ride.carbsGrams)
    expect(run.carbsGrams).toBeLessThanOrEqual(80)
  })

  it('explains itself when the digestion window is what limits the amount', () => {
    const p = prePlan({ durationMin: 240, intensity: 'moderate', weightKg: 70, hoursUntil: 1 })
    expect(p.note).toContain('מעט זמן לעכל')
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

  it('keeps protein in the 1.8–2 g/kg daily band', () => {
    for (const min of [0, 60, 200]) {
      const t = dailyTargets(70, min)
      expect(t.protein / 70).toBeGreaterThanOrEqual(1.8)
      expect(t.protein / 70).toBeLessThanOrEqual(2)
    }
  })

  it('sits at the top of the protein band on a heavy training day', () => {
    expect(dailyTargets(70, 200).protein).toBeGreaterThan(dailyTargets(70, 0).protein)
    expect(dailyTargets(70, 200).protein / 70).toBe(2)
  })

  it('passes the measured burn through as the calorie target', () => {
    expect(dailyTargets(70, 60, 2847).kcal).toBe(2850)
  })
})
