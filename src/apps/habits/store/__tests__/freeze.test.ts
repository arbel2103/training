import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from '../useStore'
import { isGloballyFrozen, todayProgress } from '../../lib/habitMath'

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
