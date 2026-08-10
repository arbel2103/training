import { describe, expect, it } from 'vitest'
import type { MealEntry, MealSlot, Nutrients } from '../../lib/types'
import { dayTotals, energyBalance, macroSplit, slotTotals } from '../selectors'

let seq = 0
const meal = (
  date: string,
  slot: MealSlot,
  nutrients: Nutrients,
): MealEntry => ({
  id: `m${++seq}`,
  date,
  slot,
  foodId: 'f',
  foodName: 'מזון',
  qty: 1,
  unit: 'gram',
  grams: 100,
  nutrients,
})

const N = (kcal: number, carbs = 0, protein = 0, fat = 0, sodium = 0): Nutrients => ({
  kcal,
  carbs,
  protein,
  fat,
  sodium,
})

const meals: MealEntry[] = [
  meal('2026-08-10', 'breakfast', N(400, 50, 20, 12, 300)),
  meal('2026-08-10', 'lunch', N(700, 90, 40, 18, 800)),
  meal('2026-08-10', 'lunch', N(150, 5, 25, 3, 90)),
  meal('2026-08-09', 'dinner', N(600, 60, 30, 20, 500)),
]

describe('dayTotals', () => {
  it('sums only the requested date', () => {
    const t = dayTotals(meals, '2026-08-10')
    expect(t.kcal).toBe(1250)
    expect(t.carbs).toBe(145)
    expect(t.protein).toBe(85)
    expect(t.sodium).toBe(1190)
  })

  it('returns zeros for a day with nothing logged', () => {
    expect(dayTotals(meals, '2026-08-01').kcal).toBe(0)
  })
})

describe('slotTotals', () => {
  it('always returns all four slots in order', () => {
    const s = slotTotals(meals, '2026-08-10')
    expect(s.map((x) => x.slot)).toEqual(['breakfast', 'lunch', 'dinner', 'snack'])
  })

  it('groups entries into their slot and sums each', () => {
    const s = slotTotals(meals, '2026-08-10')
    const lunch = s.find((x) => x.slot === 'lunch')!
    expect(lunch.entries).toHaveLength(2)
    expect(lunch.totals.kcal).toBe(850)
    expect(s.find((x) => x.slot === 'dinner')!.totals.kcal).toBe(0)
  })
})

describe('energyBalance', () => {
  it('reports the surplus when more was eaten than burned', () => {
    const b = energyBalance(meals, '2026-08-10', 1000)
    expect(b.eaten).toBe(1250)
    expect(b.burned).toBe(1000)
    expect(b.net).toBe(250)
  })

  it('reports a deficit as a negative net', () => {
    expect(energyBalance(meals, '2026-08-10', 1800).net).toBe(-550)
  })

  it('leaves net undefined when Garmin has no burn for the day', () => {
    const b = energyBalance(meals, '2026-08-10')
    expect(b.eaten).toBe(1250)
    expect(b.net).toBeUndefined()
  })
})

describe('macroSplit', () => {
  it('splits calories across the macros', () => {
    // 50c/50p/0f → 200 + 200 kcal → 50% each
    expect(macroSplit(N(400, 50, 50, 0))).toEqual({ carbs: 50, protein: 50, fat: 0 })
  })

  it('weights fat at 9 kcal per gram', () => {
    // 10c(40) + 10p(40) + 10f(90) = 170
    const s = macroSplit(N(170, 10, 10, 10))
    expect(s.fat).toBe(53)
    expect(s.carbs).toBe(24)
  })

  it('returns zeros when nothing was eaten', () => {
    expect(macroSplit(N(0))).toEqual({ carbs: 0, protein: 0, fat: 0 })
  })
})
