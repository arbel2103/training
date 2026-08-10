import { describe, expect, it } from 'vitest'
import { parseDescribedMeal, rescaleItem, type DescribedItem } from '../describeMeal'

const reply = (obj: unknown) => JSON.stringify(obj)

const MEATBALLS = {
  items: [
    { name: 'קציצות בקר', grams: 240, kcal: 528, carbs: 12, protein: 44, fat: 34, sodium: 900 },
    { name: 'רוטב עגבניות', grams: 80, kcal: 45, carbs: 7, protein: 1.2, fat: 1.5, sodium: 300 },
  ],
  assumptions: 'הנחתי קציצה קטנה ≈ 40 גרם',
}

describe('parseDescribedMeal', () => {
  it('splits a described meal into its items', () => {
    const meal = parseDescribedMeal(reply(MEATBALLS))
    expect(meal.items).toHaveLength(2)
    expect(meal.items[0].name).toBe('קציצות בקר')
    expect(meal.items[0].grams).toBe(240)
    expect(meal.items[0].nutrients.kcal).toBe(528)
    expect(meal.items[1].nutrients.sodium).toBe(300)
    expect(meal.assumptions).toBe('הנחתי קציצה קטנה ≈ 40 גרם')
  })

  it('handles a reply wrapped in a code fence', () => {
    const text = '```json\n' + reply(MEATBALLS) + '\n```'
    expect(parseDescribedMeal(text).items).toHaveLength(2)
  })

  it('handles prose around the JSON', () => {
    const text = `בטח, הנה ההערכה שלי:\n${reply(MEATBALLS)}\nבתיאבון!`
    expect(parseDescribedMeal(text).items).toHaveLength(2)
  })

  it('accepts numbers sent as strings', () => {
    const meal = parseDescribedMeal(
      reply({ items: [{ name: 'אורז', grams: '250', kcal: '325', carbs: '70', protein: '6.8', fat: '0.8' }] }),
    )
    expect(meal.items[0].grams).toBe(250)
    expect(meal.items[0].nutrients.carbs).toBe(70)
  })

  it('drops malformed items but keeps the good ones', () => {
    const meal = parseDescribedMeal(
      reply({
        items: [
          MEATBALLS.items[0],
          { name: '', grams: 100, kcal: 10, carbs: 1, protein: 1, fat: 1 }, // no name
          { name: 'בלי משקל', kcal: 10, carbs: 1, protein: 1, fat: 1 }, // no grams
          { name: 'בלי מאקרו', grams: 50 }, // no nutrients
          'not an object',
        ],
      }),
    )
    expect(meal.items).toHaveLength(1)
    expect(meal.items[0].name).toBe('קציצות בקר')
  })

  it('clamps absurd values so a bad reply cannot poison the diary', () => {
    const meal = parseDescribedMeal(
      reply({ items: [{ name: 'באג', grams: 999999, kcal: 999999, carbs: 99999, protein: -5, fat: 1 }] }),
    )
    const it0 = meal.items[0]
    expect(it0.grams).toBe(5000)
    expect(it0.nutrients.kcal).toBe(10000)
    expect(it0.nutrients.carbs).toBe(2000)
    expect(it0.nutrients.protein).toBe(0) // negatives floor at zero
  })

  it('leaves optional nutrients undefined when absent', () => {
    const meal = parseDescribedMeal(
      reply({ items: [{ name: 'לחם', grams: 60, kcal: 160, carbs: 30, protein: 5, fat: 2 }] }),
    )
    expect(meal.items[0].nutrients.sodium).toBeUndefined()
    expect(meal.items[0].nutrients.fiber).toBeUndefined()
  })

  it('omits assumptions when the model sent none', () => {
    const meal = parseDescribedMeal(reply({ items: [MEATBALLS.items[0]], assumptions: '  ' }))
    expect(meal.assumptions).toBeUndefined()
  })

  it('throws when there is no JSON at all', () => {
    expect(() => parseDescribedMeal('מצטער, לא הבנתי')).toThrow()
  })

  it('throws on malformed JSON', () => {
    expect(() => parseDescribedMeal('{"items": [oops}')).toThrow()
  })

  it('throws when no item survives validation', () => {
    expect(() => parseDescribedMeal(reply({ items: [{ name: 'רק שם' }] }))).toThrow()
    expect(() => parseDescribedMeal(reply({ items: [] }))).toThrow()
  })
})

describe('rescaleItem', () => {
  const item: DescribedItem = {
    name: 'קציצות בקר',
    grams: 240,
    nutrients: { kcal: 528, carbs: 12, protein: 44, fat: 34, sodium: 900, fiber: 2 },
  }

  it('scales nutrients proportionally when the weight is corrected up', () => {
    const bigger = rescaleItem(item, 360) // ×1.5
    expect(bigger.grams).toBe(360)
    expect(bigger.nutrients.kcal).toBe(792)
    expect(bigger.nutrients.protein).toBe(66)
    expect(bigger.nutrients.sodium).toBe(1350)
  })

  it('scales down too', () => {
    const smaller = rescaleItem(item, 120) // ×0.5
    expect(smaller.nutrients.kcal).toBe(264)
    expect(smaller.nutrients.fat).toBe(17)
  })

  it('keeps the name and is stable at the same weight', () => {
    const same = rescaleItem(item, 240)
    expect(same.name).toBe(item.name)
    expect(same.nutrients).toEqual(item.nutrients)
  })

  it('zeroes everything when the weight is cleared', () => {
    const zero = rescaleItem(item, 0)
    expect(zero.grams).toBe(0)
    expect(zero.nutrients.kcal).toBe(0)
    expect(zero.nutrients.protein).toBe(0)
  })

  it('treats a negative weight as zero', () => {
    expect(rescaleItem(item, -50).grams).toBe(0)
  })

  it('clamps an absurd correction', () => {
    expect(rescaleItem(item, 99999).grams).toBe(5000)
  })

  it('survives a zero-gram baseline without dividing by zero', () => {
    const broken: DescribedItem = { ...item, grams: 0 }
    const out = rescaleItem(broken, 100)
    expect(out.grams).toBe(100)
    expect(Number.isFinite(out.nutrients.kcal)).toBe(true)
  })
})
