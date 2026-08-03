import { describe, expect, it } from 'vitest'
import type { CalendarBusy } from '../../store/useStore'
import { conflictsFor } from '../scheduling'

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

  it('catches an event fully inside the workout', () => {
    expect(conflictsFor('18:00', 120, [ev('18:30', '19:00')])).toHaveLength(1)
  })

  it('treats an all-day event as blocking', () => {
    const allDay: CalendarBusy = { date: '2026-08-05', title: 'חופש' }
    expect(conflictsFor('09:00', 60, [allDay])).toHaveLength(1)
  })
})
