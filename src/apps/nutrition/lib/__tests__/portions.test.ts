import { describe, expect, it } from 'vitest'
import type { Food, Nutrients } from '../types'
import {
  describePortion,
  gramsPerUnit,
  nutrientsForGrams,
  sumNutrients,
  toGrams,
  unitsFor,
} from '../portions'

const rice: Food = {
  id: 'rice',
  name: 'אורז לבן מבושל',
  group: 'grain',
  per100g: { kcal: 130, carbs: 28, protein: 2.7, fat: 0.3, sodium: 1 },
  portions: { servingSpoon: 90, cup: 160 },
}

describe('toGrams', () => {
  it('uses the food-specific weight for a unit', () => {
    expect(toGrams(rice, 2, 'servingSpoon')).toBe(180)
    expect(toGrams(rice, 1, 'cup')).toBe(160)
  })

  it('passes grams through unchanged', () => {
    expect(toGrams(rice, 250, 'gram')).toBe(250)
  })

  it('falls back to a default when the food omits the unit', () => {
    // rice defines no ladle → default 150 g
    expect(toGrams(rice, 1, 'ladle')).toBe(150)
  })

  it('handles a missing food with the defaults', () => {
    expect(toGrams(undefined, 2, 'spoon')).toBe(30)
  })

  it('treats non-positive or invalid quantities as zero', () => {
    expect(toGrams(rice, 0, 'cup')).toBe(0)
    expect(toGrams(rice, -1, 'cup')).toBe(0)
    expect(toGrams(rice, NaN, 'cup')).toBe(0)
  })

  it('supports fractional portions', () => {
    expect(toGrams(rice, 0.5, 'cup')).toBe(80)
  })
})

describe('gramsPerUnit / unitsFor', () => {
  it('reports one gram per gram', () => {
    expect(gramsPerUnit(rice, 'gram')).toBe(1)
  })

  it('offers grams plus only the units the food defines', () => {
    expect(unitsFor(rice)).toEqual(['gram', 'servingSpoon', 'cup'])
  })

  it('offers just grams for a food with no portions', () => {
    expect(unitsFor({ ...rice, portions: undefined })).toEqual(['gram'])
  })
})

describe('nutrientsForGrams', () => {
  it('scales per-100g values to the logged amount', () => {
    const n = nutrientsForGrams(rice.per100g, 200)
    expect(n.kcal).toBe(260)
    expect(n.carbs).toBe(56)
    expect(n.protein).toBe(5.4)
    expect(n.sodium).toBe(2)
  })

  it('leaves optional nutrients undefined when the source has none', () => {
    const n = nutrientsForGrams({ kcal: 100, carbs: 10, protein: 5, fat: 2 }, 50)
    expect(n.kcal).toBe(50)
    expect(n.fiber).toBeUndefined()
    expect(n.sodium).toBeUndefined()
  })
})

describe('sumNutrients', () => {
  it('adds up several entries', () => {
    const a: Nutrients = { kcal: 260, carbs: 56, protein: 5.4, fat: 0.6, sodium: 2 }
    const b: Nutrients = { kcal: 165, carbs: 0, protein: 31, fat: 3.6, sodium: 74 }
    const t = sumNutrients([a, b])
    expect(t.kcal).toBe(425)
    expect(t.carbs).toBe(56)
    expect(t.protein).toBe(36.4)
    expect(t.sodium).toBe(76)
  })

  it('returns zeros for an empty list', () => {
    expect(sumNutrients([]).kcal).toBe(0)
  })
})

describe('describePortion', () => {
  it('describes grams plainly', () => {
    expect(describePortion(150, 'gram', 150)).toBe('150 גרם')
  })

  it('pluralizes mess-hall units and shows the gram weight', () => {
    expect(describePortion(2, 'servingSpoon', 180)).toBe('2 כפות הגשה · 180 ג׳')
    expect(describePortion(1, 'servingSpoon', 90)).toBe('1 כף הגשה · 90 ג׳')
  })
})
