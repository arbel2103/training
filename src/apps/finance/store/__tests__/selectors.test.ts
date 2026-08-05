import { describe, it, expect } from 'vitest'
import type { Account, Expense } from '../../lib/types'
import { collectSavingLinks, accountEffectiveBalance } from '../selectors'

function expense(partial: Partial<Expense>): Expense {
  return {
    id: partial.id ?? 'e',
    monthKey: partial.monthKey ?? '2026-08',
    card: 'ידני',
    date: partial.date ?? '2026-08-01',
    merchant: 'x',
    rawCategory: '',
    category: 'אחר',
    txnAmount: partial.txnAmount ?? 0,
    chargeAmount: partial.chargeAmount ?? partial.txnAmount ?? 0,
    refund: partial.refund ?? 0,
    pending: false,
    isBit: false,
    savingsAccountId: partial.savingsAccountId,
    savingsGoalId: partial.savingsGoalId,
  }
}

const account = (updatedAt: string, balance: number): Account => ({
  id: 'a1',
  name: 'קרן כספית',
  group: 'קרן השתלמות',
  balance,
  updatedAt,
  goals: [],
})

describe('accountEffectiveBalance — one-time deduction of linked expenses', () => {
  it('ignores a linked expense that predates the last balance update', () => {
    const a = account('2026-08-05T10:00:00.000Z', 1300)
    const links = collectSavingLinks(
      [expense({ id: 'x1', date: '2026-07-05', chargeAmount: 3800, savingsAccountId: 'a1' })],
      {},
      [a],
    )
    // the 3800 was already reflected when the balance was set to 1300 → no minus
    expect(accountEffectiveBalance(a, links)).toBe(1300)
  })

  it('still projects expenses linked after the last balance update', () => {
    const a = account('2026-08-05T10:00:00.000Z', 1300)
    const links = collectSavingLinks(
      [
        expense({ id: 'x1', date: '2026-07-05', chargeAmount: 3800, savingsAccountId: 'a1' }),
        expense({ id: 'x2', date: '2026-08-06', chargeAmount: 200, savingsAccountId: 'a1' }),
      ],
      {},
      [a],
    )
    expect(accountEffectiveBalance(a, links)).toBe(1100)
  })
})
