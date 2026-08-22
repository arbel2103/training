import { describe, expect, it } from 'vitest'
import { digestLine, weekDigest } from '../weekDigest'
import type { PlannedWorkout } from '../../store/useStore'

const p = (over: Partial<PlannedWorkout>): PlannedWorkout => ({
  id: Math.random().toString(36).slice(2),
  date: '2026-08-17',
  category: 'aerobic',
  ...over,
})

/* Sun 2026-08-16 … Sat 2026-08-22 */
const START = '2026-08-16'
const END = '2026-08-22'

describe('digestLine', () => {
  it('writes an aerobic session with its distance and intensity', () => {
    expect(
      digestLine(p({ sport: 'run', distance: 10, aerobicIntensity: 'long' })),
    ).toBe('🏃 ריצה · 10 ק״מ · ארוכה')
  })

  it('uses metres for swimming', () => {
    expect(digestLine(p({ sport: 'swim', distance: 1500 }))).toContain('1500 מ׳')
  })

  it('names a strength workout, or falls back', () => {
    expect(digestLine(p({ category: 'strength', strengthName: 'רגליים' }))).toBe(
      '🏋️ רגליים',
    )
    expect(digestLine(p({ category: 'strength' }))).toBe('🏋️ כוח')
  })

  it('handles an "other" workout', () => {
    expect(digestLine(p({ category: 'other', otherName: 'יוגה' }))).toContain('יוגה')
  })
})

describe('weekDigest', () => {
  it('groups by day, in order, with the times', () => {
    const text = weekDigest(
      [
        p({ date: '2026-08-18', time: '18:00', sport: 'run', distance: 10 }),
        p({ date: '2026-08-16', time: '06:30', sport: 'swim', distance: 1500 }),
        p({ date: '2026-08-16', time: '19:00', category: 'strength', strengthName: 'גב' }),
      ],
      START,
      END,
    )
    const lines = text.split('\n').filter(Boolean)
    expect(lines[0]).toBe('אימונים 16.8–22.8')
    expect(lines[1]).toBe('יום ראשון (16.8)')
    expect(lines[2]).toContain('06:30')
    expect(lines[3]).toContain('19:00') // same day, later time, after it
    expect(lines[4]).toBe('יום שלישי (18.8)')
    expect(lines.at(-1)).toBe('סה״כ 3 אימונים.')
  })

  it('leaves out days with nothing on them', () => {
    const text = weekDigest([p({ date: '2026-08-18', sport: 'run' })], START, END)
    expect(text).not.toContain('יום ראשון')
    expect(text).toContain('יום שלישי')
  })

  it('ignores workouts outside the week', () => {
    const text = weekDigest(
      [
        p({ date: '2026-08-18', sport: 'run' }),
        p({ date: '2026-08-30', sport: 'bike' }),
      ],
      START,
      END,
    )
    expect(text).toContain('סה״כ אימון אחד.')
    expect(text).not.toContain('🚴')
  })

  it('says so when the week is empty', () => {
    expect(weekDigest([], START, END)).toContain('אין אימונים משובצים')
  })

  it('survives a workout with no time set', () => {
    const text = weekDigest([p({ date: '2026-08-18', sport: 'run' })], START, END)
    expect(text).toContain('🏃 ריצה')
    expect(text).not.toContain('undefined')
  })
})
