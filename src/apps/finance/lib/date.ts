import type { MonthKey } from './types'

const HE_MONTHS = [
  'ינואר',
  'פברואר',
  'מרץ',
  'אפריל',
  'מאי',
  'יוני',
  'יולי',
  'אוגוסט',
  'ספטמבר',
  'אוקטובר',
  'נובמבר',
  'דצמבר',
]

// מספר סידורי של Excel → תאריך ISO (yyyy-mm-dd)
export function excelSerialToISO(serial: number): string {
  const ms = Date.UTC(1899, 11, 30) + serial * 86400000
  return new Date(ms).toISOString().slice(0, 10)
}

export function monthKey(year: number, month1to12: number): MonthKey {
  return `${year}-${String(month1to12).padStart(2, '0')}`
}

export function monthKeyFromISO(iso: string): MonthKey {
  return iso.slice(0, 7)
}

export function currentMonthKey(): MonthKey {
  const d = new Date()
  return monthKey(d.getFullYear(), d.getMonth() + 1)
}

// "2026-05" → { year, month }
export function parseMonthKey(mk: MonthKey): { year: number; month: number } {
  const [y, m] = mk.split('-').map(Number)
  return { year: y, month: m }
}

// "2026-05" → "מאי 2026"
export function monthLabel(mk: MonthKey): string {
  const { year, month } = parseMonthKey(mk)
  return `${HE_MONTHS[month - 1]} ${year}`
}

// "2026-05" → "מאי 26"
export function monthLabelShort(mk: MonthKey): string {
  const { year, month } = parseMonthKey(mk)
  return `${HE_MONTHS[month - 1]} ${String(year).slice(2)}`
}

// הזזת חודש (יכול להיות שלילי)
export function addMonths(mk: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(mk)
  const idx = year * 12 + (month - 1) + delta
  return monthKey(Math.floor(idx / 12), (idx % 12) + 1)
}

// רשימת חודשים אחרונים (כולל הנוכחי), מהישן לחדש
export function recentMonths(count: number, endMonth: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  for (let i = count - 1; i >= 0; i--) out.push(addMonths(endMonth, -i))
  return out
}

// טווח חודשים כולל גבולות (מהישן לחדש)
export function monthsInRange(from: MonthKey, to: MonthKey): MonthKey[] {
  const out: MonthKey[] = []
  let cur = from
  let guard = 0
  while (cur <= to && guard < 600) {
    out.push(cur)
    cur = addMonths(cur, 1)
    guard++
  }
  return out
}

// תאריך ISO → "27.06.2026"
export function formatDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getUTCFullYear()}`
}
