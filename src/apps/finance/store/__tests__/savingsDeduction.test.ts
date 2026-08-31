import { describe, expect, it } from 'vitest'
import type { Account, Expense } from '../../lib/types'
import {
  accountEffectiveBalance,
  accountLinkedTotal,
  collectSavingLinks,
} from '../selectors'

const fund = (balance: number, updatedAt: string): Account => ({
  id: 'acc1',
  name: 'קרן כספית',
  balance,
  updatedAt,
  group: 'חיסכון',
  goals: [],
})

const expense = (p: Partial<Expense>): Expense => ({
  id: p.id ?? 'e1',
  monthKey: '2026-08',
  card: '8806',
  date: p.date ?? '2026-08-23',
  merchant: p.merchant ?? 'דקטלון',
  rawCategory: '',
  category: 'פנאי ובילוי',
  txnAmount: p.txnAmount ?? 2299.9,
  chargeAmount: p.chargeAmount ?? 2299.9,
  refund: p.refund ?? 0,
  pending: false,
  isBit: false,
  savingsAccountId: p.savingsAccountId,
  savingsLinkedAt: p.savingsLinkedAt,
})

const linksFor = (e: Expense, accounts: Account[]) =>
  collectSavingLinks([e], {}, accounts)

describe('linking an expense to a savings account', () => {
  /** The reported case: 2,300 in the fund, a 2,299.90 purchase linked to it. */
  it('takes the expense off the balance', () => {
    const acc = fund(2300, '2026-09-01T00:00:00.000Z')
    const e = expense({
      date: '2026-08-23', // older than the balance update
      savingsAccountId: 'acc1',
      savingsLinkedAt: '2026-09-05T10:00:00.000Z', // but linked afterwards
    })
    expect(accountEffectiveBalance(acc, linksFor(e, [acc]))).toBe(0)
  })

  /** Agorot against a whole-shekel balance would otherwise leave 0.10 behind. */
  it('does not leave a phantom remainder of small change', () => {
    const acc = fund(2300, '2026-09-01T00:00:00.000Z')
    const e = expense({
      savingsAccountId: 'acc1',
      savingsLinkedAt: '2026-09-05T10:00:00.000Z',
    })
    const balance = accountEffectiveBalance(acc, linksFor(e, [acc]))
    expect(balance).toBe(0)
    expect(Number.isInteger(balance)).toBe(true)
  })

  it('deducts a genuinely newer expense as before', () => {
    const acc = fund(5000, '2026-08-01T00:00:00.000Z')
    const e = expense({
      date: '2026-08-23',
      chargeAmount: 1000,
      savingsAccountId: 'acc1',
      savingsLinkedAt: '2026-08-24T00:00:00.000Z',
    })
    expect(accountEffectiveBalance(acc, linksFor(e, [acc]))).toBe(4000)
  })

  /**
   * Updating the balance by hand states the current truth, so a link made
   * before that update is already reflected and must not come off twice.
   */
  it('ignores a link that predates the balance update', () => {
    const acc = fund(2300, '2026-09-10T00:00:00.000Z')
    const e = expense({
      savingsAccountId: 'acc1',
      savingsLinkedAt: '2026-09-05T10:00:00.000Z',
    })
    expect(accountEffectiveBalance(acc, linksFor(e, [acc]))).toBe(2300)
  })

  it('nets a refund off the amount deducted', () => {
    const acc = fund(2300, '2026-09-01T00:00:00.000Z')
    const e = expense({
      chargeAmount: 1000,
      refund: 400,
      savingsAccountId: 'acc1',
      savingsLinkedAt: '2026-09-05T10:00:00.000Z',
    })
    expect(accountEffectiveBalance(acc, linksFor(e, [acc]))).toBe(1700)
  })

  it('leaves the balance alone when nothing is linked', () => {
    const acc = fund(2300, '2026-09-01T00:00:00.000Z')
    expect(accountEffectiveBalance(acc, linksFor(expense({}), [acc]))).toBe(2300)
  })

  it('does not touch a different account', () => {
    const acc = fund(2300, '2026-01-01T00:00:00.000Z')
    const other = { ...fund(900, '2026-01-01T00:00:00.000Z'), id: 'acc2' }
    const e = expense({
      savingsAccountId: 'acc2',
      savingsLinkedAt: '2026-09-05T10:00:00.000Z',
    })
    const links = collectSavingLinks([e], {}, [acc, other])
    expect(accountEffectiveBalance(acc, links)).toBe(2300)
    expect(accountLinkedTotal(acc, links)).toBe(0)
  })

  /** Links made before this field existed still fall back to the spend date. */
  it('still handles a link saved without a link time', () => {
    const acc = fund(5000, '2026-08-01T00:00:00.000Z')
    const older = expense({
      date: '2026-08-20',
      chargeAmount: 1000,
      savingsAccountId: 'acc1',
    })
    expect(accountEffectiveBalance(acc, linksFor(older, [acc]))).toBe(4000)
  })
})
