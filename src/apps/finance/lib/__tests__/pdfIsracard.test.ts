import { describe, expect, it } from 'vitest'
import { detectPdfCard, parseIsracardRows, resultFromRows, type PdfRow } from '../pdf'

/**
 * Row-for-row the shape pdf.js actually emits for an Isracard statement, down
 * to it splitting every Hebrew phrase into separate cells — the reconstruction
 * was checked against a real document and this mirrors it exactly. The content
 * is synthetic: a real statement carries a name, address and account number,
 * which do not belong in the repository.
 */
const REAL: PdfRow[] = [
  ['*', '8225', '*'],
  ['לוגו', 'קבוצת', 'ישראכרט', 'הבנק', 'הבינלאומי', '.', 'טלפון', '6272', '*'],
  ['לכבוד'],
  ['ישראל ישראלי'],
  ['www.isracard.co.il'],
  ['פרוט', 'פעולותיך', 'לתאריך:', '20/08/26'],
  ['מועד', 'החיוב', 'שבחרת', 'הינו', '20', 'לכל', 'חודש', '.'],
  // prettier-ignore
  ['סוג', 'כרטיס:', 'ויזה', 'דביט', '|', 'כרטיס', 'שמסתיים', 'בספרות:', '8225', '|', 'מספר', 'חשבון', 'לחיוב', 'במטבע', 'ישראלי:'],
  ['00-000-0000000/000'],
  ['רכישות', 'בחו"ל'],
  // prettier-ignore
  ['תאריך', 'סוג', 'שם', 'בית', 'העסק', 'סכום', 'מקורי', 'סכום', 'ב-$', 'תאריך', 'המרה', 'שער', 'סכום', 'עמלה', 'סכום', 'החיוב'],
  ['עיר', ')ללא', 'עמלת', 'ל-', '₪', 'המרה', 'נטו', 'לתשלום', 'ב-', '₪'],
  ['01/08/26', 'ק', 'EXAMPLE.COM/BILL', '39.90', '₪', '39.90'],
  ['STORE.COM'],
  ['סה"כ', 'חיוב', 'לתאריך', '02/08/26', '39.90'],
  ['13/08/26', 'ל', 'EXAMPLE.COM/BILL', '69.90', '₪', '69.90'],
  ['STORE.COM'],
  ['סה"כ', 'חיוב', 'לתאריך', '16/08/26', '69.90'],
  ['18/08/26', 'ל', 'SHOPSITE', '95.11', '₪', '95.11'],
  ['LUXEMBOURG'],
  ['סה"כ', 'חיוב', 'לתאריך', '20/08/26', '95.11'],
  ['מסגרת', 'הכרטיס', 'ותנאי', 'האשראי'],
  ['תשנ"ג-', '1993', 'לא', 'יעלה', 'על', 'שיעור', 'של', '18.500%', '.'],
]

const parse = (rows = REAL) => resultFromRows(rows, {}, 'isracard.pdf')

describe('a real Isracard statement', () => {
  it('finds exactly the three purchases', () => {
    expect(parse().expenses).toHaveLength(3)
  })

  /** The trap: every purchase is followed by a subtotal carrying date + amount. */
  it('does not count the "סה״כ חיוב לתאריך" subtotal rows as purchases', () => {
    const dates = parse().expenses.map((e) => e.date)
    expect(dates).toEqual(['2026-08-01', '2026-08-13', '2026-08-18'])
    // 02/08, 16/08 and 20/08 are subtotals, not transactions
    expect(dates).not.toContain('2026-08-02')
    expect(parse().total).toBe(39.9 + 69.9 + 95.11)
  })

  it('reads merchant, amount and date off each row', () => {
    const [first] = parse().expenses
    expect(first).toMatchObject({
      date: '2026-08-01',
      chargeAmount: 39.9,
      card: '8225',
    })
    expect(first.merchant).toContain('EXAMPLE.COM/BILL')
  })

  it('joins the continuation line into the merchant name', () => {
    expect(parse().expenses[2].merchant).toContain('SHOPSITE')
    expect(parse().expenses[2].merchant).toContain('LUXEMBOURG')
  })

  it('takes the card number from the statement header', () => {
    expect(detectPdfCard(REAL, 'whatever.pdf')).toBe('8225')
  })

  it('skips the header row and the legal boilerplate', () => {
    const merchants = parse().expenses.map((e) => e.merchant)
    expect(merchants.some((m) => m.includes('שם בית'))).toBe(false)
    expect(merchants.some((m) => m.includes('תשנ'))).toBe(false)
  })
})

describe('month assignment on a 20th-to-20th PDF', () => {
  /** The same cut as the Excel statements: one file, two months. */
  const spanning: PdfRow[] = [
    ['כרטיס שמסתיים בספרות:', '8225'],
    ['תאריך', 'שם בית העסק', 'סכום החיוב'],
    ['28/07/26', 'סופר יולי', '100.00'],
    ['סה"כ חיוב לתאריך', '29/07/26', '100.00'],
    ['03/08/26', 'קפה אוגוסט', '30.00'],
    ['15/08/26', 'דלק אוגוסט', '250.00'],
  ]

  it('files each purchase under its own month', () => {
    const res = resultFromRows(spanning, {}, 'x.pdf')
    const by = Object.fromEntries(res.expenses.map((e) => [e.merchant, e.monthKey]))
    expect(by['סופר יולי']).toBe('2026-07')
    expect(by['קפה אוגוסט']).toBe('2026-08')
    expect(by['דלק אוגוסט']).toBe('2026-08')
  })

  it('reports both months, and a primary one to jump to', () => {
    const res = resultFromRows(spanning, {}, 'x.pdf')
    expect(res.monthKeys).toEqual(['2026-07', '2026-08'])
    expect(res.monthKey).toBe('2026-08')
  })
})

describe('rejecting what is not a statement', () => {
  it('explains itself rather than returning nothing', () => {
    expect(() => resultFromRows([['שלום'], ['עולם']], {}, 'x.pdf')).toThrow(/ישראכרט/)
  })

  it('ignores a row with a date but no amount', () => {
    const rows: PdfRow[] = [
      ['תאריך', 'שם בית העסק', 'סכום החיוב'],
      ['01/08/26', 'בלי סכום'],
      ['02/08/26', 'עם סכום', '10.00'],
    ]
    expect(parseIsracardRows(rows, '1', {})).toHaveLength(1)
  })

  it('rejects an impossible date', () => {
    const rows: PdfRow[] = [['45/13/26', 'משהו', '10.00']]
    expect(parseIsracardRows(rows, '1', {})).toHaveLength(0)
  })

  it('parses an amount with a thousands separator', () => {
    const rows: PdfRow[] = [['01/08/26', 'ביטוח', '1,234.56']]
    expect(parseIsracardRows(rows, '1', {})[0].chargeAmount).toBe(1234.56)
  })
})
