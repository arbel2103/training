import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from '../useStore'
import type { Expense } from '../../lib/types'

/**
 * A credit-card statement is cut on the 20th, so one file always straddles two
 * months. What matters is the date on each line, not the period on the cover.
 */
const exp = (id: string, date: string, amount: number, card = '8225'): Expense => ({
  id,
  date,
  monthKey: date.slice(0, 7),
  merchant: `עסק ${id}`,
  rawCategory: '',
  category: 'אחר',
  txnAmount: amount,
  chargeAmount: amount,
  refund: 0,
  pending: false,
  isBit: false,
  card,
})

const monthsOf = (card?: string) =>
  useStore
    .getState()
    .expenses.filter((e) => !card || e.card === card)
    .map((e) => e.monthKey)
    .sort()

beforeEach(() => {
  useStore.setState({ expenses: [], months: {} })
})

describe('an import spanning the 20th-to-20th cut', () => {
  const july = exp('a', '2026-07-28', 100)
  const august = exp('b', '2026-08-03', 250)

  it('files each expense under the month of its own date', () => {
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])
    const byId = Object.fromEntries(
      useStore.getState().expenses.map((e) => [e.id, e.monthKey]),
    )
    expect(byId.a).toBe('2026-07')
    expect(byId.b).toBe('2026-08')
  })

  it('marks every month the file touched as imported', () => {
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])
    expect(useStore.getState().months['2026-07']?.imported).toBe(true)
    expect(useStore.getState().months['2026-08']?.imported).toBe(true)
  })

  /** The bug a single-month replace would leave behind. */
  it('does not duplicate the earlier month when the file is loaded twice', () => {
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])
    expect(useStore.getState().expenses).toHaveLength(2)
    expect(monthsOf()).toEqual(['2026-07', '2026-08'])
  })

  it('leaves another card in those months alone', () => {
    const other = exp('c', '2026-07-15', 60, '1234')
    useStore.setState({ expenses: [other] })
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])

    expect(useStore.getState().expenses).toHaveLength(3)
    expect(useStore.getState().expenses.find((e) => e.id === 'c')).toBeTruthy()
  })

  it('leaves months the file never covered untouched', () => {
    const june = exp('d', '2026-06-10', 40)
    useStore.setState({ expenses: [june] })
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])

    expect(useStore.getState().expenses.find((e) => e.id === 'd')).toBeTruthy()
    expect(useStore.getState().months['2026-06']).toBeUndefined()
  })

  it('replaces the same card in a month on re-import rather than appending', () => {
    useStore.getState().commitImport('2026-08', ['8225'], [july, august])
    const corrected = { ...july, chargeAmount: 999 }
    useStore.getState().commitImport('2026-08', ['8225'], [corrected, august])

    const a = useStore.getState().expenses.filter((e) => e.id === 'a')
    expect(a).toHaveLength(1)
    expect(a[0].chargeAmount).toBe(999)
  })
})
