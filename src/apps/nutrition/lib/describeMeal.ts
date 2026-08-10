// Turn a free-text Hebrew description of a meal ("6 קציצות קטנות עם רוטב")
// into individual diary items with estimated weights. The prompt lives here
// next to the parser; the parsing and rescaling are pure so they can be tested
// without touching the network.
import type { Nutrients } from './types'

export interface DescribedItem {
  name: string
  grams: number
  /** absolute nutrients for this item at `grams` (not per 100 g) */
  nutrients: Nutrients
}

export interface DescribedMeal {
  items: DescribedItem[]
  /** one short sentence on what the model assumed, shown to the user */
  assumptions?: string
}

export const DESCRIBE_SYSTEM = `אתה תזונאי שמעריך מה בדיוק אדם אכל מתוך תיאור חופשי בעברית, כולל מזון ישראלי ומנות של חדר אוכל צבאי/מוסדי.

המשתמש יתאר ארוחה במילים שלו, לרוב בלי לשקול כלום — למשל "6 קציצות יחסית קטנות של חדר אוכל עם רוטב" או "צלחת אורז עם חזה עוף וסלט".

התפקיד שלך:
1. לפרק את התיאור לפריטי מזון נפרדים (קציצות / רוטב / אורז / סלט — כל אחד בנפרד).
2. להעריך לכל פריט משקל ריאלי בגרמים לפי מה שתואר. אם נאמרה כמות ("6 קציצות") ותיאור גודל ("קטנות") — הכפל: קציצה קטנה של חדר אוכל ≈ 35–45 גרם, כלומר 6 ≈ 240 גרם. "צלחת" של תוספת ≈ 250 גרם. "מצקת" ≈ 150–200 גרם. "כף הגשה" ≈ 60–90 גרם.
3. לחשב לכל פריט את הערכים התזונתיים **הכוללים לכמות שתוארה** (לא ל-100 גרם).

החזר אך ורק JSON תקין, בלי טקסט נוסף ובלי markdown, במבנה:
{"items":[{"name":"שם קצר בעברית","grams":0,"kcal":0,"carbs":0,"protein":0,"fat":0,"sodium":0,"fiber":0}],"assumptions":"משפט אחד קצר על ההנחות שלך"}

כללים:
- name קצר וברור (למשל "קציצות בקר", "רוטב עגבניות").
- grams, kcal, carbs, protein, fat — חובה בכל פריט. sodium ו-fiber אופציונליים.
- היה ריאלי ושמרני. אל תמציא פריטים שלא הוזכרו ואל תפצל יתר על המידה.
- ב-assumptions ציין בקצרה מה הנחת (למשל "הנחתי קציצה קטנה ≈ 40 גרם").`

const num = (v: unknown): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  return typeof n === 'number' && isFinite(n) ? n : null
}

/** Clamp to a sane range so one bad reply can't poison the diary. */
const clamp = (v: number, hi: number): number => Math.max(0, Math.min(hi, v))

const round1 = (v: number) => Math.round(v * 10) / 10

function toItem(raw: unknown): DescribedItem | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const name = typeof r.name === 'string' ? r.name.trim() : ''
  const grams = num(r.grams)
  const kcal = num(r.kcal)
  const carbs = num(r.carbs)
  const protein = num(r.protein)
  const fat = num(r.fat)
  // a nameless or weightless item isn't loggable
  if (!name || grams == null || grams <= 0) return null
  if (kcal == null || carbs == null || protein == null || fat == null) return null

  const sodium = num(r.sodium)
  const fiber = num(r.fiber)
  return {
    name,
    // 5 kg of one food in a single meal is already absurd
    grams: Math.round(clamp(grams, 5000)),
    nutrients: {
      kcal: Math.round(clamp(kcal, 10000)),
      carbs: round1(clamp(carbs, 2000)),
      protein: round1(clamp(protein, 2000)),
      fat: round1(clamp(fat, 2000)),
      sodium: sodium == null ? undefined : Math.round(clamp(sodium, 50000)),
      fiber: fiber == null ? undefined : round1(clamp(fiber, 500)),
    },
  }
}

/**
 * Pull the meal out of a model reply. Tolerates prose or a ``` fence around the
 * JSON, drops items that are malformed, and clamps absurd numbers.
 * Throws only when nothing usable can be recovered.
 */
export function parseDescribedMeal(text: string): DescribedMeal {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('לא הצלחתי לפענח את התשובה')

  let raw: unknown
  try {
    raw = JSON.parse(match[0])
  } catch {
    throw new Error('לא הצלחתי לפענח את התשובה')
  }

  const obj = raw as Record<string, unknown>
  const list = Array.isArray(obj.items) ? obj.items : []
  const items = list.map(toItem).filter((i): i is DescribedItem => i !== null)
  if (items.length === 0) throw new Error('לא זוהו פריטי מזון בתיאור')

  const assumptions =
    typeof obj.assumptions === 'string' && obj.assumptions.trim()
      ? obj.assumptions.trim()
      : undefined

  return { items, assumptions }
}

/**
 * Rescale an item to a new weight, keeping the model's nutrient density.
 * Used when the user corrects an estimate ("that was more like 300 g").
 */
export function rescaleItem(item: DescribedItem, newGrams: number): DescribedItem {
  const g = Math.round(clamp(num(newGrams) ?? 0, 5000))
  if (g <= 0) {
    return {
      ...item,
      grams: 0,
      nutrients: { kcal: 0, carbs: 0, protein: 0, fat: 0, sodium: 0, fiber: 0 },
    }
  }
  // the original grams is the reference density; guard against a zero baseline
  if (item.grams <= 0) return { ...item, grams: g }

  const f = g / item.grams
  const n = item.nutrients
  return {
    ...item,
    grams: g,
    nutrients: {
      kcal: Math.round(n.kcal * f),
      carbs: round1(n.carbs * f),
      protein: round1(n.protein * f),
      fat: round1(n.fat * f),
      sodium: n.sodium == null ? undefined : Math.round(n.sodium * f),
      fiber: n.fiber == null ? undefined : round1(n.fiber * f),
    },
  }
}
