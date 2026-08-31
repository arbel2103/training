import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { parseExpensesFromBuffer } from '../excel'

/**
 * Cal's export, reproduced from a real file: the header cells carry a hard line
 * break inside them ("תאריך\r\nעסקה"), dates arrive as Excel serials rather
 * than strings, there is an "ענף" column to map categories from, and a pending
 * row leaves "סכום חיוב" empty. Content is synthetic; the shape is not.
 */
// 46023 is 2026-01-01, so these land on 31/07, 01/08 and 30/08
const D_31_07 = 46234
const D_01_08 = 46235
const D_30_08 = 46264

function calSheet(): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet([
    ['פירוט עסקאות לחשבון בינלאומי הראשון 8-000000 לכרטיס ויזה בינלאומי המסתיים ב-8806'],
    [],
    ['עסקאות לחיוב ב-02/09/2026: 268.00 ₪'],
    ['עסקאות בתהליך קליטה 10.00 ₪'],
    [
      'תאריך\r\nעסקה',
      'שם בית עסק',
      'סכום\r\nעסקה',
      'סכום\r\nחיוב',
      'סוג\r\nעסקה',
      'ענף',
      'הערות',
    ],
    [D_30_08, 'חנות בקליטה', 10, '', 'רכישה רגילה', 'פיננסים', 'עסקה בקליטה'],
    [D_30_08, 'מסעדה', 120, 120, 'רגילה', 'מסעדות', ''],
    [D_01_08, 'תחנת דלק', 120, 120, 'רגילה', 'אנרגיה', ''],
    [D_31_07, 'BIT', 28, 28, 'רגילה', 'שונות', ''],
  ])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'בינלאומי הראשון 8-000000')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

const parse = () => parseExpensesFromBuffer(calSheet(), {}, 'cal 8806 31.08.26.xlsx')

describe('a Cal statement', () => {
  it('reads headers that contain a line break', () => {
    // if "תאריך\r\nעסקה" fails to match the alias table the sheet yields
    // nothing at all, so any row at all proves the normalisation works
    expect(parse().expenses.length).toBe(4)
  })

  it('turns Excel serial dates into real dates', () => {
    const dates = parse().expenses.map((e) => e.date).sort()
    expect(dates[0]).toBe('2026-07-31')
    expect(dates[dates.length - 1]).toBe('2026-08-30')
  })

  it('takes the card number out of the title line', () => {
    expect(parse().cards).toEqual(['8806'])
  })

  it('maps categories from the ענף column', () => {
    const cats = parse().expenses.map((e) => e.category)
    expect(cats).not.toEqual(['אחר', 'אחר', 'אחר', 'אחר'])
  })

  it('marks a row still being processed as pending, with no charge', () => {
    const pending = parse().expenses.filter((e) => e.pending)
    expect(pending).toHaveLength(1)
    expect(pending[0].chargeAmount).toBeNull()
  })

  it('flags BIT transfers for the categorisation prompt', () => {
    expect(parse().bitCount).toBeGreaterThanOrEqual(1)
  })

  /**
   * The billing cycle ends near the end of the month but catches stragglers
   * from the previous one — this is why loading an "August" file asks about
   * July. The single 31/07 purchase belongs to July, where it was spent.
   */
  it('files a last-day-of-July purchase under July, not August', () => {
    const res = parse()
    expect(res.monthKeys).toEqual(['2026-07', '2026-08'])
    expect(res.monthKey).toBe('2026-08') // still lands the view on August
    const july = res.expenses.filter((e) => e.monthKey === '2026-07')
    expect(july).toHaveLength(1)
    expect(july[0].merchant).toBe('BIT')
  })

  /**
   * Cal prints the two figures separately — "עסקאות לחיוב" and
   * "עסקאות בתהליך קליטה" — and the charged figure is the one that has to
   * reconcile. Checked against a real file, where summing the charged rows
   * matched the statement's stated total to the agora.
   */
  it('reconciles the charged rows against the statement total', () => {
    const charged = parse()
      .expenses.filter((e) => e.chargeAmount !== null)
      .reduce((a, e) => a + (e.chargeAmount ?? 0), 0)
    expect(charged).toBe(268)
  })

  it('counts a pending row at its transaction amount in the file total', () => {
    // not yet charged, but already spent — it is carried, not dropped
    expect(parse().total).toBe(278)
  })
})
