import type { MealEntry, MealSlot, Nutrients } from '../lib/types'
import { MEAL_SLOTS } from '../lib/types'
import { sumNutrients } from '../lib/portions'

/** Entries logged on a date. */
export function mealsOn(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter((m) => m.date === date)
}

/** Everything eaten on a date, summed. */
export function dayTotals(meals: MealEntry[], date: string): Nutrients {
  return sumNutrients(mealsOn(meals, date).map((m) => m.nutrients))
}

export interface SlotTotal {
  slot: MealSlot
  entries: MealEntry[]
  totals: Nutrients
}

/** Per-meal breakdown for a date, always in slot order. */
export function slotTotals(meals: MealEntry[], date: string): SlotTotal[] {
  const onDate = mealsOn(meals, date)
  return MEAL_SLOTS.map((slot) => {
    const entries = onDate.filter((m) => m.slot === slot)
    return { slot, entries, totals: sumNutrients(entries.map((e) => e.nutrients)) }
  })
}

export interface EnergyBalance {
  eaten: number
  burned?: number
  /** eaten − burned; positive = surplus, negative = deficit */
  net?: number
}

/** Calories in vs Garmin's calories out. */
export function energyBalance(
  meals: MealEntry[],
  date: string,
  burned?: number,
): EnergyBalance {
  const eaten = dayTotals(meals, date).kcal
  return { eaten, burned, net: burned == null ? undefined : eaten - burned }
}

/** Share of calories from each macro (percentages that sum to ~100). */
export function macroSplit(n: Nutrients): { carbs: number; protein: number; fat: number } {
  const kcal = n.carbs * 4 + n.protein * 4 + n.fat * 9
  if (kcal <= 0) return { carbs: 0, protein: 0, fat: 0 }
  return {
    carbs: Math.round(((n.carbs * 4) / kcal) * 100),
    protein: Math.round(((n.protein * 4) / kcal) * 100),
    fat: Math.round(((n.fat * 9) / kcal) * 100),
  }
}
