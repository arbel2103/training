// A simple daily "readiness to train" score from Garmin recovery signals.
// Pure — blends last night's sleep score, HRV vs baseline, and Body Battery.
import type { DailyHealth } from './garmin/types'

export type ReadinessLevel = 'high' | 'medium' | 'low'

export interface Readiness {
  level: ReadinessLevel
  score: number // 0–100
  label: string
  color: string // 'r g b'
  reasons: string[]
  date: string
}

const clamp = (n: number, lo = 0, hi = 100): number => Math.max(lo, Math.min(hi, n))

/** Compute readiness from the most recent day that has any recovery signal. */
export function computeReadiness(days: DailyHealth[]): Readiness | null {
  const sorted = [...days].sort((a, b) => b.date.localeCompare(a.date))
  const latest = sorted.find(
    (d) => d.sleepScore != null || d.hrvLastNight != null || d.bodyBatteryHigh != null,
  )
  if (!latest) return null

  const reasons: string[] = []
  const components: { value: number; weight: number }[] = []

  if (latest.sleepScore != null) {
    components.push({ value: latest.sleepScore, weight: 0.5 })
    if (latest.sleepScore >= 80) reasons.push(`שינה מצוינת (${latest.sleepScore})`)
    else if (latest.sleepScore < 60) reasons.push(`שינה נמוכה (${latest.sleepScore})`)
  }

  if (latest.hrvLastNight != null && latest.hrvWeeklyAvg != null && latest.hrvWeeklyAvg > 0) {
    const ratio = latest.hrvLastNight / latest.hrvWeeklyAvg // ~1 = at baseline
    const hrvScore = clamp(50 + (ratio - 1) * 250) // ±20% → ±50pts
    components.push({ value: hrvScore, weight: 0.3 })
    if (ratio < 0.85) reasons.push('HRV מתחת לבסיס')
    else if (ratio > 1.05) reasons.push('HRV מעל הבסיס')
  } else if (latest.hrvStatus === 'LOW') {
    components.push({ value: 35, weight: 0.3 })
    reasons.push('HRV נמוך')
  }

  if (latest.bodyBatteryHigh != null) {
    components.push({ value: latest.bodyBatteryHigh, weight: 0.2 })
    if (latest.bodyBatteryHigh < 50) reasons.push('סוללת גוף נמוכה')
  }

  if (latest.restingHr != null && reasons.length === 0) {
    reasons.push(`דופק מנוחה ${latest.restingHr}`)
  }

  const totalWeight = components.reduce((s, c) => s + c.weight, 0) || 1
  const score = Math.round(
    components.reduce((s, c) => s + c.value * c.weight, 0) / totalWeight,
  )

  const level: ReadinessLevel = score >= 70 ? 'high' : score >= 45 ? 'medium' : 'low'
  const label =
    level === 'high' ? 'מוכנות גבוהה' : level === 'medium' ? 'מוכנות בינונית' : 'מוכנות נמוכה'
  const color =
    level === 'high' ? 'var(--c-bike)' : level === 'medium' ? 'var(--accent)' : 'var(--c-run)'

  return { level, score: clamp(score), label, color, reasons, date: latest.date }
}
