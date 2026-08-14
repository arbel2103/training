import { beforeEach, describe, expect, it, vi } from 'vitest'
import { healFreezes, useStore } from '../useStore'
import { isGloballyFrozen, todayProgress } from '../../lib/habitMath'
import { addDays, fromISO, toISODate } from '../../../../lib/dates'

const s = () => useStore.getState()

function reset() {
  useStore.setState({
    categories: [{ id: 'c1', name: 'יומי', order: 0, collapsed: false }],
    habits: [
      {
        id: 'h1',
        categoryId: 'c1',
        name: 'שתיית מים',
        order: 0,
        createdDate: '2026-01-01',
        completions: {},
        frozenDays: {},
      },
    ],
    freezes: [],
  })
}

beforeEach(() => {
  reset()
  vi.useRealTimers()
})

describe('ending a global freeze the same day it started', () => {
  it('leaves today unfrozen — the bug report: habits stayed frozen after unfreezing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T09:00:00'))

    s().startGlobalFreeze()
    expect(isGloballyFrozen('2026-08-15', s().freezes)).toBe(true)

    s().endGlobalFreeze()
    expect(isGloballyFrozen('2026-08-15', s().freezes)).toBe(false)

    const prog = todayProgress(s().habits, s().freezes, '2026-08-15')
    expect(prog.total).toBe(1) // the habit is trackable again, not excluded as frozen
  })
})

describe('ending a global freeze after several real days away', () => {
  it('keeps the days in between frozen but frees the day you came back', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-10T09:00:00'))
    s().startGlobalFreeze()

    vi.setSystemTime(new Date('2026-08-13T09:00:00')) // three days later
    s().endGlobalFreeze()

    expect(isGloballyFrozen('2026-08-10', s().freezes)).toBe(true)
    expect(isGloballyFrozen('2026-08-11', s().freezes)).toBe(true)
    expect(isGloballyFrozen('2026-08-12', s().freezes)).toBe(true)
    expect(isGloballyFrozen('2026-08-13', s().freezes)).toBe(false) // the return day
  })
})

describe('healing freezes saved by the version that closed them at today', () => {
  const day = (n: number) => toISODate(addDays(fromISO(toISODate(new Date())), n))
  const base = { categories: [], habits: [] }

  it('frees today — the reported stuck state, where every habit stayed frozen', () => {
    // exactly what the broken build wrote: freeze started and ended the same day
    const healed = healFreezes({
      ...base,
      freezes: [{ start: day(0), end: day(0) }],
    } as never)

    expect(isGloballyFrozen(day(0), healed.freezes)).toBe(false)
  })

  it('keeps the frozen days of a real multi-day break intact', () => {
    const healed = healFreezes({
      ...base,
      freezes: [{ start: day(-3), end: day(0) }],
    } as never)

    expect(isGloballyFrozen(day(-3), healed.freezes)).toBe(true)
    expect(isGloballyFrozen(day(-1), healed.freezes)).toBe(true)
    expect(isGloballyFrozen(day(0), healed.freezes)).toBe(false) // today is live again
  })

  it('never rewrites a freeze that already ended in the past', () => {
    const freezes = [{ start: day(-9), end: day(-5) }]
    expect(healFreezes({ ...base, freezes } as never).freezes).toEqual(freezes)
  })

  it('leaves an open freeze open — being frozen right now is legitimate', () => {
    const freezes = [{ start: day(-1), end: null }]
    const healed = healFreezes({ ...base, freezes } as never)

    expect(healed.freezes[0].end).toBeNull()
    expect(isGloballyFrozen(day(0), healed.freezes)).toBe(true)
  })

  it('copes with a store that has no freezes at all', () => {
    expect(healFreezes({ ...base, freezes: [] } as never).freezes).toEqual([])
  })
})

describe('starting a new freeze after ending one', () => {
  it('does not resurrect the closed freeze — a second freeze/unfreeze cycle behaves the same way', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T09:00:00'))
    s().startGlobalFreeze()
    s().endGlobalFreeze()

    vi.setSystemTime(new Date('2026-08-20T09:00:00'))
    s().startGlobalFreeze()
    expect(isGloballyFrozen('2026-08-20', s().freezes)).toBe(true)
    s().endGlobalFreeze()
    expect(isGloballyFrozen('2026-08-20', s().freezes)).toBe(false)
  })
})
