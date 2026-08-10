// ===== Core nutrition types =====

/** How a portion is measured. Mess-hall units sit alongside plain grams. */
export type PortionUnit =
  | 'gram'
  | 'servingSpoon' // כף הגשה — the big spoon in a mess hall
  | 'ladle' // מצקת
  | 'spoon' // כף רגילה
  | 'cup' // כוס
  | 'plate' // צלחת
  | 'unit' // יחידה (פרוסה, ביצה, פרי)

/** Nutrients per 100 g of a food. */
export interface Nutrients {
  kcal: number
  carbs: number // g
  protein: number // g
  fat: number // g
  sodium?: number // mg
  fiber?: number // g
  sugar?: number // g
}

export type FoodGroup =
  | 'grain' // דגנים ופחמימות
  | 'protein' // בשר, דגים, ביצים
  | 'dairy' // חלב וגבינות
  | 'vegetable' // ירקות
  | 'fruit' // פירות
  | 'legume' // קטניות
  | 'fat' // שומנים ואגוזים
  | 'dish' // מנות מבושלות / חדר אוכל
  | 'sports' // ג'לים, משקאות איזוטוניים, אבקות
  | 'drink' // משקאות
  | 'snack' // חטיפים ומתוקים

export interface Food {
  id: string
  name: string // Hebrew display name
  group: FoodGroup
  /** nutrients per 100 g */
  per100g: Nutrients
  /** grams for one of each supported unit; 'gram' is implicit */
  portions?: Partial<Record<Exclude<PortionUnit, 'gram'>, number>>
  /** true for foods the user added (AI-estimated or manual) */
  custom?: boolean
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack']

export const mealSlotLabel: Record<MealSlot, string> = {
  breakfast: 'בוקר',
  lunch: 'צהריים',
  dinner: 'ערב',
  snack: 'נשנוש',
}

/** One logged item in the food diary. */
export interface MealEntry {
  id: string
  date: string // yyyy-mm-dd
  slot: MealSlot
  foodId: string
  /** snapshot of the name, so an edited/removed food doesn't break history */
  foodName: string
  qty: number
  unit: PortionUnit
  grams: number // resolved at log time
  nutrients: Nutrients // absolute totals for this entry (not per 100 g)
  /** the amount is an AI estimate from a description, not a measured portion */
  estimated?: boolean
  /** the original sentence, shared by every item parsed out of one description */
  describedAs?: string
}

/** foodId used by items that came from a free-text description, not the database. */
export const DESCRIBED_FOOD_ID = 'described'

/** Body/goal settings used for g/kg math. */
export interface NutritionProfile {
  weightKg?: number
  /** manual daily overrides; when unset, targets are derived from training load */
  kcalTarget?: number
  proteinTarget?: number
  carbsTarget?: number
  fatTarget?: number
}
