import { describe, expect, it } from 'vitest'
import type { CalendarBusy } from '../../store/useStore'
import { conflictsFor, findFreeSlot } from '../scheduling'

const ev = (start: string, end: string, title = 'פגישה'): CalendarBusy => ({
  date: '2026-08-05',
  start,
  end,
  title,
})

describe('conflictsFor', () => {
  it('finds an overlapping event', () => {
    const clashes = conflictsFor('18:00', 60, [ev('18:30', '19:30', 'ישיבה')])
    expect(clashes).toHaveLength(1)
    expect(clashes[0].title).toBe('ישיבה')
  })

  it('ignores events that only touch the edges', () => {
    expect(conflictsFor('18:00', 60, [ev('19:00', '20:00')])).toHaveLength(0)
    expect(conflictsFor('18:00', 60, [ev('17:00', '18:00')])).toHaveLength(0)
  })

  it('treats an all-day event as blocking', () => {
    const allDay: CalendarBusy = { date: '2026-08-05', title: 'חופש' }
    expect(conflictsFor('09:00', 60, [allDay])).toHaveLength(1)
  })
})

describe('findFreeSlot', () => {
  it('keeps the preferred time when it is free', () => {
    expect(findFreeSlot([], 60, '18:00')).toBe('18:00')
  })

  it('moves to the nearest free window around a conflict', () => {
    const slot = findFreeSlot([ev('17:00', '19:00')], 60, '18:00')
    expect(slot).not.toBeNull()
    expect(conflictsFor(slot!, 60, [ev('17:00', '19:00')])).toHaveLength(0)
  })

  it('honours the requested duration', () => {
    // free only between 08:00 and 09:00
    const busy = [ev('05:00', '08:00'), ev('09:00', '22:00')]
    expect(findFreeSlot(busy, 60, '18:00')).toBe('08:00')
    expect(findFreeSlot(busy, 90, '18:00')).toBeNull()
  })

  it('returns null when the whole day is taken', () => {
    expect(findFreeSlot([ev('05:00', '22:00')], 45, '18:00')).toBeNull()
  })
})
