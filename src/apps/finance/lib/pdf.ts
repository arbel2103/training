// ייבוא דוח אשראי מ-PDF (פורמט ישראכרט / הבנק הבינלאומי).
//
// בניגוד לאקסל, ל-PDF אין עמודות — יש מילים עם קואורדינטות. הפרסור מרכיב מחדש
// שורות לפי גובה (y), וממיין כל שורה מימין לשמאל, וכך הטבלה חוזרת לצורתה.
// חילוץ טקסט "רגיל" מ-PDF עברי מערבב את הסדר ולא ניתן לפרסור.
import { mapCategory } from './categories'
import { monthKeyFromISO } from './date'
import type { Expense, MonthKey } from './types'
import { isBitRow, type ParseResult } from './excel'

/** תא בודד בשורה, אחרי מיון ימין→שמאל. */
export type PdfRow = string[]

const DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/

function toISO(s: string): string | null {
  const m = s.match(DATE)
  if (!m) return null
  const [, d, mo, y] = m
  const year = y.length === 2 ? 2000 + Number(y) : Number(y)
  const day = Number(d)
  const month = Number(mo)
  if (day < 1 || day > 31 || month < 1 || month > 12) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** "1,234.56" → 1234.56. מחזיר null לכל דבר שאינו מספר. */
function toNumber(s: string): number | null {
  const cleaned = s.replace(/[₪$,\s]/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

/**
 * שורות שנראות כמו עסקה אבל אינן.
 *
 * המלכודת המרכזית בדוח הזה: אחרי כל עסקה יש שורת "סה"כ חיוב לתאריך" שמכילה
 * גם תאריך וגם סכום — פרסור נאיבי היה סופר כל קנייה פעמיים.
 */
const SUMMARY = [
  'סה"כ',
  'סהכ',
  'סה״כ',
  'ריכוז',
  'יתרה',
  'סך הכל',
  'סך־הכל',
  'לתשלום',
  'תשלומים קודמים',
]

const isSummaryRow = (row: PdfRow) =>
  row.some((c) => SUMMARY.some((k) => c.includes(k)))

/** כותרות טבלה — מכילות "תאריך" כמילה בפני עצמה ולא תאריך ממשי. */
const isHeaderRow = (row: PdfRow) =>
  row.some((c) => c === 'תאריך' || c.includes('שם בית'))

/** מספר הכרטיס מתוך הכותרת של הדוח, ובגיבוי משם הקובץ. */
export function detectPdfCard(rows: PdfRow[], fileName: string): string {
  const flat = rows.map((r) => r.join(' ')).join('\n')
  let m = flat.match(/מסתיים\s*בספרות[:\s]*([0-9]{3,4})/)
  if (m) return m[1]
  m = flat.match(/מסתיים\s*ב[-\s]*([0-9]{3,4})/)
  if (m) return m[1]
  m = flat.match(/כרטיס[^\d\n]{0,40}?(\d{4})\b/)
  if (m) return m[1]
  m = fileName.match(/\b(\d{4})\b/)
  if (m) return m[1]
  return fileName.replace(/\.[^.]+$/, '').trim() || 'ישראכרט'
}

/**
 * שם בית העסק: התא הארוך ביותר שאינו תאריך, מספר, מטבע או קוד סוג עסקה
 * (אות בודדת כמו "ק"/"ל" בעמודת "סוג").
 */
function pickMerchant(cells: string[]): string {
  const candidates = cells.filter(
    (c) =>
      !DATE.test(c) &&
      toNumber(c) === null &&
      c.length > 1 &&
      !/^[₪$%]+$/.test(c),
  )
  if (!candidates.length) return ''
  return candidates.reduce((a, b) => (b.length > a.length ? b : a))
}

/**
 * המרת שורות ממוקמות לעסקאות.
 *
 * לוגיקה טהורה בכוונה — היא הפרסור האמיתי, ו-pdf.js רק מספק לה את השורות.
 * כך אפשר לבדוק אותה מול הדוח האמיתי בלי דפדפן.
 */
export function parseIsracardRows(
  rows: PdfRow[],
  card: string,
  userMap: Record<string, string>,
): Expense[] {
  const out: Expense[] = []
  let n = 0

  rows.forEach((row, i) => {
    if (isHeaderRow(row) || isSummaryRow(row)) return
    const iso = toISO(row[0] ?? '')
    if (!iso) return // שורה שאינה מתחילה בתאריך אינה עסקה

    const amounts = row.map(toNumber).filter((v): v is number => v !== null)
    if (!amounts.length) return
    // עמודת "סכום החיוב" היא האחרונה בשורה; הראשונה היא הסכום המקורי
    const charge = amounts[amounts.length - 1]
    const txn = amounts[0]

    let merchant = pickMerchant(row)
    // שם בית העסק נשבר לשתי שורות (עיר/סניף) — צרף את ההמשך אם הוא אינו עסקה
    const next = rows[i + 1]
    if (
      next &&
      !toISO(next[0] ?? '') &&
      !isSummaryRow(next) &&
      !isHeaderRow(next)
    ) {
      const extra = pickMerchant(next)
      if (extra && extra !== merchant) merchant = `${merchant} ${extra}`.trim()
    }
    if (!merchant) return

    out.push({
      id: `p${Date.now().toString(36)}${(n++).toString(36)}`,
      monthKey: monthKeyFromISO(iso),
      card,
      date: iso,
      merchant,
      rawCategory: '',
      // אין עמודת "ענף" ב-PDF, אז הכל נוחת ב"אחר" עד שהמשתמש מסווג —
      // בדיוק כמו קובץ אקסל של דיינרס
      category: mapCategory('', userMap),
      txnAmount: txn,
      chargeAmount: charge,
      refund: 0,
      pending: false,
      isBit: isBitRow('', merchant),
    })
  })

  return out
}

/** בונה ParseResult מלא מתוך שורות — משותף לבדיקות ולזרימה האמיתית. */
export function resultFromRows(
  rows: PdfRow[],
  userMap: Record<string, string>,
  fileName: string,
): ParseResult {
  const card = detectPdfCard(rows, fileName)
  const expenses = parseIsracardRows(rows, card, userMap)
  if (!expenses.length)
    throw new Error(
      'לא נמצאו עסקאות ב-PDF. ודא שזהו דוח ריכוז חיובים של ישראכרט.',
    )

  const monthKeys = [...new Set(expenses.map((e) => e.monthKey))].sort()
  // החודש שאליו קופצים — השכיח בדוח
  const counts = new Map<MonthKey, number>()
  for (const e of expenses) counts.set(e.monthKey, (counts.get(e.monthKey) ?? 0) + 1)
  let monthKey = monthKeys[0]
  let best = -1
  for (const [mk, c] of counts) {
    if (c > best || (c === best && mk > monthKey)) {
      monthKey = mk
      best = c
    }
  }

  const cards = [...new Set(expenses.map((e) => e.card))]
  return {
    expenses,
    total: expenses.reduce((s, e) => s + (e.chargeAmount ?? e.txnAmount), 0),
    bitCount: expenses.filter((e) => e.isBit).length,
    monthKey,
    monthKeys,
    card,
    cards,
  }
}

/** גובה שממנו והלאה שתי מילים נחשבות לאותה שורה. */
const ROW_TOLERANCE = 3

/**
 * חילוץ שורות ממוקמות מ-PDF באמצעות pdf.js.
 *
 * pdf.js נטען דינמית — הוא כבד, ורוב המשתמשים לעולם לא מייבאים PDF.
 */
export async function pdfToRows(buf: ArrayBuffer): Promise<PdfRow[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: buf }).promise
  const rows: PdfRow[] = []

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const byY = new Map<number, { x: number; s: string }[]>()

    for (const item of content.items) {
      if (!('str' in item)) continue
      const s = item.str.trim()
      if (!s) continue
      const [, , , , x, y] = item.transform as number[]
      // עיגול לפי הסבילות מאחד מילים שנכתבו בגובה מעט שונה לאותה שורה
      const key = Math.round(y / ROW_TOLERANCE) * ROW_TOLERANCE
      const bucket = byY.get(key) ?? []
      bucket.push({ x, s })
      byY.set(key, bucket)
    }

    // מלמעלה למטה, וכל שורה מימין לשמאל
    for (const y of [...byY.keys()].sort((a, b) => b - a)) {
      const cells = byY.get(y)!.sort((a, b) => b.x - a.x)
      rows.push(cells.map((c) => c.s))
    }
  }

  return rows
}

export async function parseExpensesFromPdf(
  buf: ArrayBuffer,
  userMap: Record<string, string>,
  fileName: string,
): Promise<ParseResult> {
  return resultFromRows(await pdfToRows(buf), userMap, fileName)
}
