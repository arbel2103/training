import { chartColor } from '../../../lib/chartPalette'
// ===== מערכת הקטגוריות הקנונית =====
import type { IconName } from '../../../components/ui/Icon'

/** Clean line-icon per canonical category (custom categories fall back). */
const CATEGORY_ICONS: Record<string, IconName> = {
  'מזון וסופר': 'cart',
  'מסעדות ואוכל בחוץ': 'utensils',
  'פנאי ובילוי': 'ticket',
  'קניות ואופנה': 'bag',
  'בית וריהוט': 'home',
  'בריאות וטיפוח': 'health',
  'דלק ותחבורה': 'fuel',
  'תקשורת וטכנולוגיה': 'laptop',
  'תיירות ונסיעות': 'plane',
  ילדים: 'gift',
  תרומות: 'heart',
  'חשבונות ושירותים': 'receipt',
  אחר: 'tag',
}

export function categoryIconName(name: string): IconName {
  return CATEGORY_ICONS[name] ?? 'tag'
}

export interface CategoryDef {
  name: string
  color: string
  icon: string // emoji לתצוגה
}

// סט קנוני חכם — "מזון וסופר" ו"מסעדות ואוכל בחוץ" נשארות נפרדות
export const CANONICAL_CATEGORIES: CategoryDef[] = [
  { name: 'מזון וסופר', color: chartColor(0), icon: '🛒' },
  { name: 'מסעדות ואוכל בחוץ', color: chartColor(4), icon: '🍽️' },
  { name: 'פנאי ובילוי', color: chartColor(2), icon: '🎭' },
  { name: 'קניות ואופנה', color: chartColor(5), icon: '🛍️' },
  { name: 'בית וריהוט', color: chartColor(1), icon: '🏠' },
  { name: 'בריאות וטיפוח', color: chartColor(6), icon: '⚕️' },
  { name: 'דלק ותחבורה', color: chartColor(3), icon: '⛽' },
  { name: 'תקשורת וטכנולוגיה', color: chartColor(7), icon: '💻' },
  { name: 'תיירות ונסיעות', color: chartColor(5), icon: '✈️' },
  { name: 'ילדים', color: chartColor(2), icon: '🧸' },
  { name: 'תרומות', color: chartColor(4), icon: '🤝' },
  { name: 'חשבונות ושירותים', color: chartColor(1), icon: '🧾' },
  { name: 'אחר', color: 'rgb(var(--muted))', icon: '📦' },
]

export const CATEGORY_NAMES = CANONICAL_CATEGORIES.map((c) => c.name)

const _byName: Record<string, CategoryDef> = Object.fromEntries(
  CANONICAL_CATEGORIES.map((c) => [c.name, c]),
)

/** A custom category joins the same sequence the canonical ones draw from. */
export function nextCustomColor(existingCount: number): string {
  return chartColor(existingCount)
}

const FALLBACK: CategoryDef = { name: 'אחר', color: 'rgb(var(--muted))', icon: '🏷️' }

// חיפוש הגדרת קטגוריה — קנונית או מותאמת אישית (מועברת מה-store, ריאקטיבי)
export function findCategoryDef(
  name: string,
  custom: CategoryDef[] = [],
): CategoryDef {
  return (
    _byName[name] ??
    custom.find((c) => c.name === name) ?? { ...FALLBACK, name }
  )
}

// מיפוי ברירת מחדל מ"ענף" של הבנק (כאל/ויזה) → קטגוריה קנונית
export const DEFAULT_CATEGORY_MAP: Record<string, string> = {
  // אוכל
  'מזון ומשקאות': 'מזון וסופר',
  'מזון וצריכה': 'מזון וסופר',
  סופרמרקט: 'מזון וסופר',
  מסעדות: 'מסעדות ואוכל בחוץ',
  'מסעדות, קפה וברים': 'מסעדות ואוכל בחוץ',
  'בתי קפה': 'מסעדות ואוכל בחוץ',
  'מזון מהיר': 'מסעדות ואוכל בחוץ',
  // פנאי
  'פנאי בילוי': 'פנאי ובילוי',
  'פנאי ובילוי': 'פנאי ובילוי',
  'פנאי, בידור וספורט': 'פנאי ובילוי',
  אירועים: 'פנאי ובילוי',
  בידור: 'פנאי ובילוי',
  ספורט: 'פנאי ובילוי',
  // קניות
  אופנה: 'קניות ואופנה',
  'הלבשה והנעלה': 'קניות ואופנה',
  // בית
  'ריהוט ובית': 'בית וריהוט',
  'כלי בית': 'בית וריהוט',
  'חשמל ואלקטרוניקה': 'בית וריהוט',
  // בריאות וטיפוח
  'רפואה ובריאות': 'בריאות וטיפוח',
  בריאות: 'בריאות וטיפוח',
  'בריאות ויופי': 'בריאות וטיפוח',
  'טיפוח ויופי': 'בריאות וטיפוח',
  'בתי מרקחת': 'בריאות וטיפוח',
  // תחבורה
  אנרגיה: 'דלק ותחבורה',
  דלק: 'דלק ותחבורה',
  תחבורה: 'דלק ותחבורה',
  'רכב ותחבורה': 'דלק ותחבורה',
  'דלק, חשמל וגז': 'דלק ותחבורה',
  חניה: 'דלק ותחבורה',
  // טכנולוגיה
  'תקשורת ומחשבים': 'תקשורת וטכנולוגיה',
  'מחשבים ותוכנה': 'תקשורת וטכנולוגיה',
  'חשמל ומחשבים': 'תקשורת וטכנולוגיה',
  // תיירות
  תיירות: 'תיירות ונסיעות',
  'נסיעות ותיירות': 'תיירות ונסיעות',
  טיסות: 'תיירות ונסיעות',
  'בתי מלון': 'תיירות ונסיעות',
  // ילדים
  ילדים: 'ילדים',
  צעצועים: 'ילדים',
  // תרומות
  'עמותות ותרומות': 'תרומות',
  // חשבונות ושירותים
  ביטוח: 'חשבונות ושירותים',
  חשבונות: 'חשבונות ושירותים',
  שירותים: 'חשבונות ושירותים',
  'ממשל ומיסים': 'חשבונות ושירותים',
  חינוך: 'חשבונות ושירותים',
  // אחר
  שונות: 'אחר',
}

// מיפוי ענף → קנונית, עם דריסות ידניות מה-store
export function mapCategory(
  rawCategory: string,
  userMap: Record<string, string>,
): string {
  const raw = (rawCategory || '').trim()
  if (!raw) return 'אחר' // קבצים ללא עמודת קטגוריה (דיינרס)
  return userMap[raw] ?? DEFAULT_CATEGORY_MAP[raw] ?? raw
}
