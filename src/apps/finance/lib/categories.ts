// ===== מערכת הקטגוריות הקנונית =====

export interface CategoryDef {
  name: string
  color: string
  icon: string // emoji לתצוגה
}

// סט קנוני חכם — "מזון וסופר" ו"מסעדות ואוכל בחוץ" נשארות נפרדות
export const CANONICAL_CATEGORIES: CategoryDef[] = [
  { name: 'מזון וסופר', color: '#5f7f5f', icon: '🛒' },
  { name: 'מסעדות ואוכל בחוץ', color: '#d08a4f', icon: '🍽️' },
  { name: 'פנאי ובילוי', color: '#7b6bb0', icon: '🎭' },
  { name: 'קניות ואופנה', color: '#d489ad', icon: '🛍️' },
  { name: 'בית וריהוט', color: '#94965a', icon: '🏠' },
  { name: 'בריאות וטיפוח', color: '#cf5b6a', icon: '⚕️' },
  { name: 'דלק ותחבורה', color: '#4a8fb0', icon: '⛽' },
  { name: 'תקשורת וטכנולוגיה', color: '#36a0a0', icon: '💻' },
  { name: 'תיירות ונסיעות', color: '#e3b34d', icon: '✈️' },
  { name: 'ילדים', color: '#9b8ec9', icon: '🧸' },
  { name: 'תרומות', color: '#b08a3a', icon: '🤝' },
  { name: 'חשבונות ושירותים', color: '#6f8f86', icon: '🧾' },
  { name: 'אחר', color: '#8f8c85', icon: '📦' },
]

export const CATEGORY_NAMES = CANONICAL_CATEGORIES.map((c) => c.name)

const _byName: Record<string, CategoryDef> = Object.fromEntries(
  CANONICAL_CATEGORIES.map((c) => [c.name, c]),
)

// פלטת צבעים לקטגוריות מותאמות אישית
const CUSTOM_PALETTE = [
  '#9c6b4a',
  '#6b8fb0',
  '#a05c9c',
  '#5f9c7d',
  '#b0913a',
  '#c06a6a',
  '#7d7da0',
  '#4a9c9c',
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
