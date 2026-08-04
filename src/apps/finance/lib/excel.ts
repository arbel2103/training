import * as XLSX from 'xlsx'
import type { Expense, MonthKey } from './types'
import { excelSerialToISO, monthKeyFromISO } from './date'
import { mapCategory } from './categories'

// זיהוי שורת ביט / "שונות"
export function isBitRow(rawCategory: string, merchant: string): boolean {
  const m = (merchant || '').toUpperCase()
  return (
    rawCategory.trim() === 'שונות' ||
    m.includes('BIT') ||
    m.includes('ביט') ||
    m.includes('PAYBOX') ||
    m.includes('פייבוקס')
  )
}

function normalize(v: unknown): string {
  return String(v ?? '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v
  const cleaned = String(v).replace(/[₪$€,\s]/g, '')
  const n = Number(cleaned)
  return isNaN(n) ? null : n
}

function toISO(v: unknown): string | null {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return excelSerialToISO(v)
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  // פורמטים: dd/mm/yyyy · dd.mm.yyyy · dd-mm-yyyy
  const s = String(v).trim()
  const m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})$/)
  if (m) {
    const [, d, mo, y] = m
    const year = y.length === 2 ? 2000 + Number(y) : Number(y)
    return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (m2) return `${m2[1]}-${m2[2].padStart(2, '0')}-${m2[3].padStart(2, '0')}`
  return null
}

// מיפוי כותרות אפשריות (מספר פורמטים של בנקים) → שדה פנימי
const HEADER_ALIASES: Record<string, string> = {
  'תאריך עסקה': 'date',
  'שם בית עסק': 'merchant',
  'שם בית העסק': 'merchant',
  'סכום עסקה': 'txn',
  'סכום עסקה מקורי': 'txn',
  'סכום חיוב': 'charge',
  'סכום בש"ח': 'charge',
  סכום: 'charge',
  'סוג עסקה': 'type',
  ענף: 'category',
  קטגוריה: 'category',
  הערות: 'note',
  '4 ספרות אחרונות של כרטיס האשראי': 'card4',
}

export interface ParseResult {
  expenses: Expense[]
  total: number
  bitCount: number
  monthKey: MonthKey // החודש שזוהה אוטומטית מתאריכי העסקאות
  card: string // הכרטיס הראשי (השכיח) שזוהה
  cards: string[] // כל הכרטיסים שזוהו בקובץ
}

// זיהוי מזהה הכרטיס מתוך כותרת הדוח, ובגיבוי משם הקובץ
function detectCard(titleText: string, fileName: string): string {
  let m = titleText.match(/מסתיים\s*ב[-\s]*?(\d{3,4})/)
  if (m) return m[1]
  m = titleText.match(/כרטיס[^\d]{0,30}?(\d{4})\b/)
  if (m) return m[1]
  m = titleText.match(/\b(\d{4})\b/) // למשל "8547-לאומי ויזה"
  if (m) return m[1]
  m = fileName.match(/(?:ויזה|כרטיס|card|mastercard|visa)\D{0,10}(\d{4})/i)
  if (m) return m[1]
  m = fileName.match(/\b(\d{4})\b/)
  if (m) return m[1]
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  return base || 'כרטיס'
}

// קביעת חודש היעד מתוך תאריכי העסקאות — החודש השכיח ביותר (ובשוויון, המאוחר)
function detectMonth(isoDates: string[]): MonthKey {
  const counts = new Map<MonthKey, number>()
  for (const iso of isoDates) {
    const mk = monthKeyFromISO(iso)
    counts.set(mk, (counts.get(mk) || 0) + 1)
  }
  let best: MonthKey = isoDates.length ? monthKeyFromISO(isoDates[0]) : ''
  let bestCount = -1
  for (const [mk, c] of counts) {
    if (c > bestCount || (c === bestCount && mk > best)) {
      best = mk
      bestCount = c
    }
  }
  return best
}

function mostCommon(values: string[]): string {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) || 0) + 1)
  let best = values[0] ?? 'כרטיס'
  let bestCount = -1
  for (const [v, c] of counts) {
    if (c > bestCount) {
      best = v
      bestCount = c
    }
  }
  return best
}

let _seq = 0
function uid(prefix = 'e'): string {
  _seq += 1
  return `${prefix}_${Date.now().toString(36)}_${_seq}`
}

// פרסור גיליון בודד
function parseSheet(
  rows: unknown[][],
  fileCard: string,
  userMap: Record<string, string>,
): Expense[] {
  // איתור שורת הכותרת (תומך "שם בית עסק" ו"שם בית העסק")
  let headerIdx = -1
  for (let i = 0; i < rows.length; i++) {
    const cells = (rows[i] || []).map(normalize)
    if (cells.some((c) => c.includes('שם בית'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return []

  const headerCells = (rows[headerIdx] || []).map(normalize)
  const col: Record<string, number> = {}
  headerCells.forEach((label, idx) => {
    const key = HEADER_ALIASES[label]
    if (key && col[key] === undefined) col[key] = idx
  })
  if (col.merchant === undefined || col.date === undefined) return []
  if (col.charge === undefined && col.txn === undefined) return []

  const out: Expense[] = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i] || []
    const merchant = normalize(row[col.merchant])
    const iso = toISO(row[col.date])
    if (!merchant || !iso) continue // footer / שורות ריקות

    const txn = col.txn !== undefined ? toNumber(row[col.txn]) : null
    const charge = col.charge !== undefined ? toNumber(row[col.charge]) : null
    if (txn === null && charge === null) continue

    const rawCategory =
      col.category !== undefined ? normalize(row[col.category]) : ''
    const note = col.note !== undefined ? normalize(row[col.note]) : ''
    const pending = note.includes('קליטה') || charge === null

    // כרטיס לפי עמודה ייעודית (Leumi/Max), אחרת כרטיס ברמת הקובץ
    const rowCard =
      col.card4 !== undefined ? normalize(row[col.card4]) : ''
    const card = /^\d{3,4}$/.test(rowCard) ? rowCard : fileCard

    const bit = isBitRow(rawCategory, merchant)

    out.push({
      id: uid(),
      monthKey: '',
      card,
      date: iso,
      merchant,
      rawCategory,
      category: mapCategory(rawCategory, userMap),
      txnAmount: txn ?? charge ?? 0,
      chargeAmount: charge,
      refund: 0,
      pending,
      isBit: bit,
    })
  }
  return out
}

/**
 * מפרסר קובץ אקסל של דוח אשראי לרשימת הוצאות.
 * תומך במספר פורמטים (כאל/ויזה, דיינרס/מאסטרקארד, לאומי/מקס) וריבוי גיליונות.
 * החודש והכרטיס נקבעים אוטומטית מתוך הקובץ.
 */
export function parseExpensesFromBuffer(
  buffer: ArrayBuffer,
  userMap: Record<string, string>,
  fileName = '',
): ParseResult {
  const wb = XLSX.read(buffer, { type: 'array' })

  // כרטיס ברמת הקובץ — מתוך הכותרת של הגיליון הראשון + שם הקובץ
  const firstRows = XLSX.utils.sheet_to_json<unknown[]>(
    wb.Sheets[wb.SheetNames[0]],
    { header: 1, raw: true, blankrows: false },
  )
  let titleHeaderIdx = firstRows.findIndex((r) =>
    (r || []).map(normalize).some((c) => c.includes('שם בית')),
  )
  if (titleHeaderIdx < 0) titleHeaderIdx = 0
  const titleText = firstRows
    .slice(0, titleHeaderIdx)
    .map((r) => (r || []).map(normalize).join(' '))
    .join(' ')
  const fileCard = detectCard(titleText, fileName)

  // פרסור כל הגיליונות ואיחוד (לאומי מפצל לחיובים/בקליטה/חו"ל)
  let expenses: Expense[] = []
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], {
      header: 1,
      raw: true,
      blankrows: false,
    })
    expenses = expenses.concat(parseSheet(rows, fileCard, userMap))
  }

  if (!expenses.length) {
    throw new Error('לא נמצאו עסקאות בקובץ. ודא שזהו דוח עסקאות אשראי.')
  }

  // זיהוי החודש מהתאריכים ושיוך כל ההוצאות לאותו חודש
  const monthKey = detectMonth(expenses.map((e) => e.date))
  for (const e of expenses) e.monthKey = monthKey

  const cardList = expenses.map((e) => e.card)
  const cards = [...new Set(cardList)]
  const card = mostCommon(cardList)
  const bitCount = expenses.filter((e) => e.isBit).length
  const total = expenses.reduce(
    (s, e) => s + (e.chargeAmount ?? e.txnAmount),
    0,
  )

  return { expenses, total, bitCount, monthKey, card, cards }
}
