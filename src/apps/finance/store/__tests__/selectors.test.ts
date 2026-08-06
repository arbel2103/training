import { describe, it, expect } from 'vitest'
import type { Account, Expense } from '../../lib/types'
import type { MonthData } from '../../lib/types'
import {
  collectSavingLinks,
  accountEffectiveBalance,
  effectiveChecking,
} from '../selectors'

const month = (partial: Partial<MonthData>): MonthData => ({
  imported: true,
  salary: partial.salary ?? 0,
  extraIncome: partial.extraIncome ?? [],
  bankTransfers: partial.bankTransfers ?? [],
})

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

describe('effectiveChecking — live balance from opening + monthly flow', () => {
  it('stays the manual amount without a fromMonth (legacy)', () => {
    expect(effectiveChecking({ amount: 24000 }, {}, [])).toBe(24000)
  })

  it('adds income and subtracts spending from fromMonth onward', () => {
    const months = { '2026-08': month({ salary: 18000 }) }
    const expenses = [
      expense({ id: 'a', monthKey: '2026-08', date: '2026-08-03', chargeAmount: 5000 }),
      // earlier month is ignored
      expense({ id: 'b', monthKey: '2026-07', date: '2026-07-03', chargeAmount: 999 }),
    ]
    // 10000 opening + 18000 salary − 5000 spending = 23000
    expect(
      effectiveChecking({ amount: 10000, fromMonth: '2026-08' }, months, expenses),
    ).toBe(23000)
  })

  it('does not subtract spending that was funded from savings', () => {
    const expenses = [
      expense({ id: 'a', monthKey: '2026-08', date: '2026-08-03', chargeAmount: 5000, savingsAccountId: 'a1' }),
    ]
    // savings-funded expense leaves savings, not the checking account
    expect(
      effectiveChecking({ amount: 10000, fromMonth: '2026-08' }, {}, expenses),
    ).toBe(10000)
  })
})
