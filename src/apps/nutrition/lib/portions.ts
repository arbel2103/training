import type { Food, Nutrients, PortionUnit } from './types'

export const PORTION_UNITS: PortionUnit[] = [
  'gram',
  'servingSpoon',
  'ladle',
  'spoon',
  'cup',
  'plate',
  'unit',
]

export const portionLabel: Record<PortionUnit, string> = {
  gram: 'גרם',
  servingSpoon: 'כף הגשה',
  ladle: 'מצקת',
  spoon: 'כף',
  cup: 'כוס',
  plate: 'צלחת',
  unit: 'יחידה',
}

/**
 * Fallback grams per unit when a food doesn't define its own. These are rough
 * mess-hall averages for a medium-density cooked food; every food that differs
 * meaningfully (rice vs soup vs salad) overrides them in its `portions`.
 */
const DEFAULT_GRAMS: Record<Exclude<PortionUnit, 'gram'>, number> = {
  servingSpoon: 60,
  ladle: 150,
  spoon: 15,
  cup: 200,
  plate: 300,
  unit: 100,
}

/** Grams for one unit of this food. */
export function gramsPerUnit(food: Food | undefined, unit: PortionUnit): number {
  if (unit === 'gram') return 1
  return food?.portions?.[unit] ?? DEFAULT_GRAMS[unit]
}

/** Total grams for `qty` of `unit` of this food. */
export function toGrams(
  food: Food | undefined,
  qty: number,
  unit: PortionUnit,
): number {
  if (!isFinite(qty) || qty <= 0) return 0
  return Math.round(qty * gramsPerUnit(food, unit))
}

/** The units that make sense for a food: grams plus whatever it defines. */
export function unitsFor(food: Food | undefined): PortionUnit[] {
  const defined = food?.portions
    ? (Object.keys(food.portions) as Exclude<PortionUnit, 'gram'>[]).filter(
        (u) => food.portions?.[u] != null,
      )
    : []
  return ['gram', ...defined]
}

const scale = (v: number | undefined, f: number): number | undefined =>
  v == null ? undefined : Math.round(v * f * 10) / 10

/** Scale a food's per-100 g nutrients to an absolute amount in grams. */
export function nutrientsForGrams(per100g: Nutrients, grams: number): Nutrients {
  const f = grams / 100
  return {
    kcal: Math.round(per100g.kcal * f),
    carbs: Math.round(per100g.carbs * f * 10) / 10,
    protein: Math.round(per100g.protein * f * 10) / 10,
    fat: Math.round(per100g.fat * f * 10) / 10,
    sodium: per100g.sodium == null ? undefined : Math.round(per100g.sodium * f),
    fiber: scale(per100g.fiber, f),
    sugar: scale(per100g.sugar, f),
  }
}

/** Sum a list of nutrient totals. */
export function sumNutrients(list: Nutrients[]): Nutrients {
  const out: Nutrients = { kcal: 0, carbs: 0, protein: 0, fat: 0, sodium: 0, fiber: 0, sugar: 0 }
  for (const n of list) {
    out.kcal += n.kcal
    out.carbs += n.carbs
    out.protein += n.protein
    out.fat += n.fat
    out.sodium = (out.sodium ?? 0) + (n.sodium ?? 0)
    out.fiber = (out.fiber ?? 0) + (n.fiber ?? 0)
    out.sugar = (out.sugar ?? 0) + (n.sugar ?? 0)
  }
  const r1 = (v: number) => Math.round(v * 10) / 10
  return {
    kcal: Math.round(out.kcal),
    carbs: r1(out.carbs),
    protein: r1(out.protein),
    fat: r1(out.fat),
    sodium: Math.round(out.sodium ?? 0),
    fiber: r1(out.fiber ?? 0),
    sugar: r1(out.sugar ?? 0),
  }
}

/** "2 כפות הגשה · 120 ג׳" — a compact description of a logged portion. */
export function describePortion(
  qty: number,
  unit: PortionUnit,
  grams: number,
): string {
  if (unit === 'gram') return `${Math.round(grams)} ${portionLabel.gram}`
  const label = qty === 1 ? portionLabel[unit] : pluralUnit(unit)
  return `${qty} ${label} · ${Math.round(grams)} ג׳`
}

function pluralUnit(unit: Exclude<PortionUnit, 'gram'> | PortionUnit): string {
  switch (unit) {
    case 'servingSpoon':
      return 'כפות הגשה'
    case 'ladle':
      return 'מצקות'
    case 'spoon':
      return 'כפות'
    case 'cup':
      return 'כוסות'
    case 'plate':
      return 'צלחות'
    case 'unit':
      return 'יחידות'
    default:
      return portionLabel[unit as PortionUnit]
  }
}
