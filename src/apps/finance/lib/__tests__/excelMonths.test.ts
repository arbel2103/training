import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExpensesFromBuffer } from '../excel'

/**
 * Build a statement the way the card companies do: a period cut on the 20th,
 * so the file carries the tail of one month and the head of the next.
 */
function statement(rows: [string, string, number][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['כרטיס מסתיים ב-8225'],
    [],
    ['תאריך עסקה', 'שם בית עסק', 'סכום חיוב'],
    ...rows,
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'עסקאות')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

const parse = (rows: [string, string, number][]) =>
  parseExpensesFromBuffer(statement(rows), {}, 'isracard-8225.xlsx')

const monthOf = (res: ReturnType<typeof parse>, merchant: string) =>
  res.expenses.find((e) => e.merchant === merchant)?.monthKey

describe('a 20th-to-20th statement', () => {
  const rows: [string, string, number][] = [
    ['28/07/26', 'סופר יולי', 100],
    ['31/07/26', 'דלק יולי', 200],
    ['01/08/26', 'אפל אוגוסט', 50],
    ['15/08/26', 'קפה אוגוסט', 30],
    ['18/08/26', 'ביטוח אוגוסט', 400],
  ]

  it('files July purchases in July and August purchases in August', () => {
    const res = parse(rows)
    expect(monthOf(res, 'סופר יולי')).toBe('2026-07')
    expect(monthOf(res, 'דלק יולי')).toBe('2026-07')
    expect(monthOf(res, 'אפל אוגוסט')).toBe('2026-08')
    expect(monthOf(res, 'קפה אוגוסט')).toBe('2026-08')
    expect(monthOf(res, 'ביטוח אוגוסט')).toBe('2026-08')
  })

  it('reports both months the file covers', () => {
    expect(parse(rows).monthKeys).toEqual(['2026-07', '2026-08'])
  })

  it('still names one primary month to jump to after loading', () => {
    // August has more rows here, so that is where the view lands
    expect(parse(rows).monthKey).toBe('2026-08')
  })

  it('does not sweep the minority month into the majority one', () => {
    const res = parse(rows)
    const july = res.expenses.filter((e) => e.monthKey === '2026-07')
    expect(july).toHaveLength(2)
    expect(july.reduce((s, e) => s + (e.chargeAmount ?? e.txnAmount), 0)).toBe(300)
  })

  it('handles a file that sits inside a single month', () => {
    const res = parse([
      ['03/08/26', 'א', 10],
      ['09/08/26', 'ב', 20],
    ])
    expect(res.monthKeys).toEqual(['2026-08'])
    expect(res.expenses.every((e) => e.monthKey === '2026-08')).toBe(true)
  })

  it('splits across a year boundary too', () => {
    const res = parse([
      ['28/12/26', 'דצמבר', 10],
      ['04/01/27', 'ינואר', 20],
    ])
    expect(res.monthKeys).toEqual(['2026-12', '2027-01'])
    expect(monthOf(res, 'דצמבר')).toBe('2026-12')
    expect(monthOf(res, 'ינואר')).toBe('2027-01')
  })
})
