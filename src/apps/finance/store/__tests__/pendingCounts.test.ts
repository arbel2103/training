import { describe, expect, it } from 'vitest'
import type { Expense, MonthData } from '../../lib/types'
import {
  categoryBreakdown,
  creditTotal,
  effectiveAmount,
  monthTotalSpending,
} from '../selectors'

/**
 * A card statement carries rows the issuer has not finished processing —
 * "עסקה בקליטה". They have no charge amount yet, only the transaction amount.
 * The money is spent either way, so they count as expenses like any other; the
 * list marks them with a "בקליטה" badge rather than holding them back.
 */
const pending = (txnAmount: number, category = 'אחר'): Expense => ({
  id: `p${txnAmount}`,
  monthKey: '2026-08',
  card: '8806',
  date: '2026-08-30',
  merchant: 'עסקה בקליטה',
  rawCategory: '',
  category,
  txnAmount,
  chargeAmount: null, // the issuer has not settled it yet
  refund: 0,
  pending: true,
  isBit: false,
})

const settled = (chargeAmount: number, category = 'אחר'): Expense => ({
  ...pending(chargeAmount, category),
  id: `s${chargeAmount}`,
  merchant: 'עסקה רגילה',
  chargeAmount,
  pending: false,
})

const emptyMonth: MonthData = {
  imported: true,
  salary: 0,
  extraIncome: [],
  bankTransfers: [],
}

describe('a transaction still being processed', () => {
  it('is worth its transaction amount, not zero', () => {
    expect(effectiveAmount(pending(28))).toBe(28)
  })

  it('counts toward the month total', () => {
    expect(creditTotal([settled(100), pending(28)], '2026-08')).toBe(128)
  })

  it('counts toward total spending', () => {
    const total = monthTotalSpending([settled(100), pending(28)], emptyMonth, '2026-08')
    expect(total).toBe(128)
  })

  it('appears in the category breakdown', () => {
    const slices = categoryBreakdown(
      [settled(100, 'מסעדות'), pending(28, 'מסעדות')],
      '2026-08',
    )
    expect(slices.find((s) => s.category === 'מסעדות')?.value).toBe(128)
  })

  it('still nets off a refund against it', () => {
    expect(effectiveAmount({ ...pending(28), refund: 10 })).toBe(18)
  })

  it('is settled cleanly once the charge arrives in a later import', () => {
    // the same purchase, now with a charge amount — the value should not jump
    expect(effectiveAmount(settled(28))).toBe(effectiveAmount(pending(28)))
  })
})
