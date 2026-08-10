import { describe, expect, it } from 'vitest'
import { FOODS, allFoods, findFood, searchFoods } from '../foods'
import type { Food } from '../types'
import { toGrams, unitsFor } from '../portions'

const custom: Food = {
  id: 'my-dish',
  name: 'תבשיל של אמא',
  group: 'dish',
  per100g: { kcal: 150, carbs: 12, protein: 9, fat: 7 },
  custom: true,
}

describe('the bundled food database', () => {
  it('has unique ids', () => {
    const ids = FOODS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every food sane per-100g values', () => {
    for (const f of FOODS) {
      expect(f.name.length, f.id).toBeGreaterThan(0)
      expect(f.per100g.kcal, f.id).toBeGreaterThanOrEqual(0)
      // nothing is denser than pure fat (~900 kcal/100 g)
      expect(f.per100g.kcal, f.id).toBeLessThanOrEqual(900)
      for (const macro of ['carbs', 'protein', 'fat'] as const) {
        expect(f.per100g[macro], `${f.id}.${macro}`).toBeGreaterThanOrEqual(0)
        expect(f.per100g[macro], `${f.id}.${macro}`).toBeLessThanOrEqual(100)
      }
    }
  })

  it('declares only positive portion weights', () => {
    for (const f of FOODS) {
      for (const [unit, grams] of Object.entries(f.portions ?? {})) {
        expect(grams, `${f.id}.${unit}`).toBeGreaterThan(0)
        expect(grams, `${f.id}.${unit}`).toBeLessThan(1000)
      }
    }
  })

  it('gives mess-hall staples a serving-spoon weight', () => {
    for (const id of ['rice-white', 'pasta', 'chicken-breast', 'veg-cooked']) {
      const f = FOODS.find((x) => x.id === id)!
      expect(unitsFor(f), id).toContain('servingSpoon')
    }
  })
})

describe('searchFoods', () => {
  const foods = allFoods([custom])

  it('finds by substring', () => {
    expect(searchFoods(foods, 'אורז').map((f) => f.id)).toContain('rice-white')
  })

  it('ranks prefix matches ahead of mid-word matches', () => {
    const res = searchFoods(foods, 'עוף')
    expect(res.length).toBeGreaterThan(1)
    // "עוף" starts a name only in some entries; those must come first
    const firstStartsWith = res[0].name.startsWith('עוף')
    const anyStartsWith = res.some((f) => f.name.startsWith('עוף'))
    if (anyStartsWith) expect(firstStartsWith).toBe(true)
  })

  it('includes the user\'s custom foods', () => {
    expect(searchFoods(foods, 'אמא').map((f) => f.id)).toContain('my-dish')
  })

  it('returns nothing for an unknown food', () => {
    expect(searchFoods(foods, 'זזזזז')).toHaveLength(0)
  })

  it('lists foods when the query is empty', () => {
    expect(searchFoods(foods, '').length).toBeGreaterThan(0)
  })
})

describe('findFood', () => {
  it('resolves an id across bundled and custom foods', () => {
    const foods = allFoods([custom])
    expect(findFood(foods, 'my-dish')?.name).toBe('תבשיל של אמא')
    expect(findFood(foods, 'banana')?.name).toBe('בננה')
    expect(findFood(foods, 'nope')).toBeUndefined()
  })
})

describe('logging a real mess-hall plate', () => {
  it('resolves serving spoons of rice to grams and calories', () => {
    const rice = FOODS.find((f) => f.id === 'rice-white')!
    // two serving spoons of rice = 180 g = 234 kcal
    expect(toGrams(rice, 2, 'servingSpoon')).toBe(180)
    expect(Math.round((rice.per100g.kcal * 180) / 100)).toBe(234)
  })
})
