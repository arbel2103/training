import { describe, expect, it } from 'vitest'
import type { DailyHealth } from '../garmin/types'
import { sleepInsights } from '../sleepInsights'

function night(date: string, over: Partial<DailyHealth> = {}): DailyHealth {
  return {
    date,
    sleepMin: 460,
    deepMin: 80,
    remMin: 100,
    lightMin: 270,
    awakeMin: 10,
    sleepScore: 82,
    restingHr: 48,
    sleepStart: `${date}T23:15:00`,
    ...over,
  }
}

const dates = (n: number): string[] =>
  Array.from({ length: n }, (_, i) => `2026-07-${String(i + 1).padStart(2, '0')}`)

describe('sleepInsights', () => {
  it('asks for more data with fewer than 3 nights', () => {
    const out = sleepInsights([night('2026-07-01'), night('2026-07-02')])
    expect(out).toHaveLength(1)
    expect(out[0].severity).toBe('info')
  })

  it('warns on short average sleep', () => {
    const days = dates(7).map((d) => night(d, { sleepMin: 380 }))
    const out = sleepInsights(days)
    expect(out.some((i) => i.severity === 'warn' && i.text.includes('פחות מ-7'))).toBe(true)
  })

  it('flags an elevated resting heart rate vs baseline', () => {
    const base = dates(29).map((d) => night(d, { restingHr: 48 }))
    const spike = night('2026-07-30', { restingHr: 56 })
    const out = sleepInsights([...base, spike])
    expect(out.some((i) => i.text.includes('דופק המנוחה גבוה'))).toBe(true)
  })

  it('warns on low HRV status', () => {
    const days = dates(7).map((d) => night(d, { hrvStatus: 'LOW' }))
    const out = sleepInsights(days)
    expect(out.some((i) => i.text.includes('HRV'))).toBe(true)
  })

  it('gives positive feedback on healthy sleep', () => {
    const days = dates(10).map((d) => night(d))
    const out = sleepInsights(days)
    expect(out.some((i) => i.severity === 'good')).toBe(true)
  })

  it('does not throw when sleepStart is an epoch-ms number (real Garmin data)', () => {
    const days = dates(7).map((d, i) => ({
      ...night(d),
      // simulate the raw epoch-ms that slipped through before normalization
      sleepStart: (1785550425000 + i * 86_400_000) as unknown as string,
    }))
    expect(() => sleepInsights(days)).not.toThrow()
  })
})
