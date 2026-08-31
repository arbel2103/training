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

/**
 * Two consecutive Isracard statements both contribute to the same month: the
 * July statement carries 1–20 July, the August one carries 20–31 July. No
 * single statement ever covers a whole month, so replacing by month wipes
 * whatever the previous statement contributed.
 */
describe('consecutive Isracard statements, cut on the 20th', () => {
  const julyStatement = [
    exp('j1', '2026-06-25', 50), // tail of June
    exp('j2', '2026-07-05', 80), // start of July
    exp('j3', '2026-07-18', 90),
  ]
  const augustStatement = [
    exp('a1', '2026-07-24', 70), // tail of July
    exp('a2', '2026-08-02', 120),
    exp('a3', '2026-08-19', 60),
  ]

  it('keeps the earlier statement’s share of July', () => {
    useStore.getState().commitImport('2026-07', ['8225'], julyStatement)
    useStore.getState().commitImport('2026-08', ['8225'], augustStatement)

    const ids = useStore.getState().expenses.map((e) => e.id).sort()
    expect(ids).toEqual(['a1', 'a2', 'a3', 'j1', 'j2', 'j3'])
  })

  it('leaves July holding both halves', () => {
    useStore.getState().commitImport('2026-07', ['8225'], julyStatement)
    useStore.getState().commitImport('2026-08', ['8225'], augustStatement)

    const julyIds = useStore
      .getState()
      .expenses.filter((e) => e.monthKey === '2026-07')
      .map((e) => e.id)
      .sort()
    expect(julyIds).toEqual(['a1', 'j2', 'j3'])
  })

  it('still replaces cleanly when the same statement is loaded twice', () => {
    useStore.getState().commitImport('2026-07', ['8225'], julyStatement)
    useStore.getState().commitImport('2026-08', ['8225'], augustStatement)
    useStore.getState().commitImport('2026-08', ['8225'], augustStatement)

    expect(useStore.getState().expenses).toHaveLength(6)
  })
})

/** A Cal statement covers one calendar month, so its range is that month. */
describe('a Cal statement covering a whole month', () => {
  it('replaces that month for the card and nothing around it', () => {
    const before = exp('old', '2026-07-30', 10)
    const after = exp('later', '2026-09-02', 15)
    useStore.setState({ expenses: [before, after] })

    useStore
      .getState()
      .commitImport('2026-08', ['8225'], [
        exp('n1', '2026-08-01', 100),
        exp('n2', '2026-08-31', 200),
      ])

    const ids = useStore.getState().expenses.map((e) => e.id).sort()
    expect(ids).toEqual(['later', 'n1', 'n2', 'old'])
  })

  it('does not duplicate on a second load of the same month', () => {
    const rows = [exp('n1', '2026-08-01', 100), exp('n2', '2026-08-31', 200)]
    useStore.getState().commitImport('2026-08', ['8225'], rows)
    useStore.getState().commitImport('2026-08', ['8225'], rows)
    expect(useStore.getState().expenses).toHaveLength(2)
  })
})
