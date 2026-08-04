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
  { name: 'מזון וסופר', color: '#7C6FF2', icon: '🛒' },
  { name: 'מסעדות ואוכל בחוץ', color: '#22C1D6', icon: '🍽️' },
  { name: 'פנאי ובילוי', color: '#4F86F0', icon: '🎭' },
  { name: 'קניות ואופנה', color: '#E1657F', icon: '🛍️' },
  { name: 'בית וריהוט', color: '#9C8CF5', icon: '🏠' },
  { name: 'בריאות וטיפוח', color: '#3FB6A8', icon: '⚕️' },
  { name: 'דלק ותחבורה', color: '#C77DF0', icon: '⛽' },
  { name: 'תקשורת וטכנולוגיה', color: '#5AA0E8', icon: '💻' },
  { name: 'תיירות ונסיעות', color: '#6EC6C0', icon: '✈️' },
  { name: 'ילדים', color: '#8A93E8', icon: '🧸' },
  { name: 'תרומות', color: '#A78BFA', icon: '🤝' },
  { name: 'חשבונות ושירותים', color: '#4FB0C9', icon: '🧾' },
  { name: 'אחר', color: '#8f8c85', icon: '📦' },
]

export const CATEGORY_NAMES = CANONICAL_CATEGORIES.map((c) => c.name)

const _byName: Record<string, CategoryDef> = Object.fromEntries(
  CANONICAL_CATEGORIES.map((c) => [c.name, c]),
)

// פלטת צבעים לקטגוריות מותאמות אישית
const CUSTOM_PALETTE = [
  '#7C6FF2',
  '#22C1D6',
  '#4F86F0',
  '#E1657F',
  '#9C8CF5',
  '#3FB6A8',
  '#C77DF0',
  '#5AA0E8',
]

export function nextCustomColor(existingCount: number): string {
  return CUSTOM_PALETTE[existingCount % CUSTOM_PALETTE.length]
}

const FALLBACK: CategoryDef = { name: 'אחר', color: '#8f8c85', icon: '🏷️' }

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
