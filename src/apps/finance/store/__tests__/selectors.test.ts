import { describe, it, expect } from 'vitest'
import type { Account, Expense } from '../../lib/types'
import type { MonthData } from '../../lib/types'
import {
  collectSavingLinks,
  accountEffectiveBalance,
  accountRemainingToGoals,
  effectiveChecking,
  goalFunding,
  goalRemaining,
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

describe('goalFunding — the account balance funds its goals', () => {
  const acct = (balance: number, goals: { id: string; name: string; targetAmount?: number }[]): Account => ({
    id: 'a1',
    name: 'קרן כספית',
    group: 'חיסכון',
    balance,
    updatedAt: '2026-08-01T00:00:00.000Z',
    goals,
  })

  it('counts the money already in the account toward a goal', () => {
    const a = acct(1000, [{ id: 'g1', name: 'טריינר', targetAmount: 2000 }])
    expect(goalFunding(a, [])['g1']).toBe(1000)
    expect(goalRemaining(a, a.goals[0], [])).toBe(1000)
  })

  it('marks a goal met once the balance reaches it', () => {
    const a = acct(2300, [{ id: 'g1', name: 'טריינר', targetAmount: 2300 }])
    expect(goalFunding(a, [])['g1']).toBe(2300)
    expect(goalRemaining(a, a.goals[0], [])).toBe(0)
  })

  it('never funds a goal beyond its target', () => {
    const a = acct(5000, [{ id: 'g1', name: 'טריינר', targetAmount: 2000 }])
    expect(goalFunding(a, [])['g1']).toBe(2000)
  })

  it('waterfalls the balance across goals in order', () => {
    const a = acct(2500, [
      { id: 'g1', name: 'א', targetAmount: 2000 },
      { id: 'g2', name: 'ב', targetAmount: 2000 },
    ])
    const f = goalFunding(a, [])
    expect(f['g1']).toBe(2000) // filled first
    expect(f['g2']).toBe(500) // the remainder
  })

  it('a goal with no target neither consumes nor shows funding', () => {
    const a = acct(1000, [
      { id: 'g0', name: 'ללא יעד' },
      { id: 'g1', name: 'טריינר', targetAmount: 2000 },
    ])
    const f = goalFunding(a, [])
    expect(f['g0']).toBe(0)
    expect(f['g1']).toBe(1000) // the no-target goal did not eat the balance
  })

  it('sums the remaining across all targeted goals', () => {
    const a = acct(1000, [
      { id: 'g1', name: 'א', targetAmount: 2000 },
      { id: 'g2', name: 'ב', targetAmount: 500 },
    ])
    // 1000 fills g1 to 1000 (remaining 1000), nothing left for g2 (remaining 500)
    expect(accountRemainingToGoals(a, [])).toBe(1500)
  })
})
