/**
 * The week's training as a message you can paste to someone.
 *
 * Right after the calendar sync is when the schedule is settled and worth
 * sending on — to a coach, to a training partner, to whoever asks what you're
 * doing this week. Plain text with emoji rather than anything structured,
 * because the destination is WhatsApp.
 *
 * Pure, so it is unit tested rather than eyeballed.
 */
import type { PlannedWorkout } from '../store/useStore'
import { HEB_DAYS, formatDayMonth, fromISO } from './dates'
import { formatDuration, sportUnit } from './calc'
import { aerobicIntensityLabel, sportIcon, sportLabel } from './labels'

const STRENGTH_ICON = '🏋️'
const OTHER_ICON = '✨'

/** One workout as a single line, without its time. */
export function digestLine(p: PlannedWorkout): string {
  if (p.category === 'aerobic' && p.sport) {
    const bits = [sportLabel[p.sport]]
    if (p.distance) bits.push(`${p.distance} ${sportUnit(p.sport)}`)
    if (p.aerobicIntensity) bits.push(aerobicIntensityLabel[p.aerobicIntensity])
    if (p.durationMin) bits.push(formatDuration(p.durationMin))
    return `${sportIcon[p.sport]} ${bits.join(' · ')}`
  }
  if (p.category === 'strength') {
    const bits = [p.strengthName || 'כוח']
    if (p.durationMin) bits.push(formatDuration(p.durationMin))
    return `${STRENGTH_ICON} ${bits.join(' · ')}`
  }
  const bits = [p.otherName || 'אימון']
  if (p.durationMin) bits.push(formatDuration(p.durationMin))
  return `${OTHER_ICON} ${bits.join(' · ')}`
}

/**
 * The whole week, grouped by day.
 *
 * Only days that actually have something appear — a list padded with five
 * "rest day" lines buries the three that matter.
 */
export function weekDigest(
  planned: PlannedWorkout[],
  weekStart: string,
  weekEnd: string,
): string {
  const inWeek = planned
    .filter((p) => p.date >= weekStart && p.date <= weekEnd)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))

  const header = `אימונים ${formatDayMonth(fromISO(weekStart))}–${formatDayMonth(fromISO(weekEnd))}`
  if (!inWeek.length) return `${header}\n\nאין אימונים משובצים לשבוע הזה.`

  const lines: string[] = [header, '']
  let currentDate = ''
  for (const p of inWeek) {
    if (p.date !== currentDate) {
      currentDate = p.date
      const d = fromISO(p.date)
      lines.push(`יום ${HEB_DAYS[d.getDay()]} (${formatDayMonth(d)})`)
    }
    lines.push(`  ${p.time ? `${p.time} · ` : ''}${digestLine(p)}`)
  }

  lines.push('')
  lines.push(
    inWeek.length === 1 ? 'סה״כ אימון אחד.' : `סה״כ ${inWeek.length} אימונים.`,
  )
  return lines.join('\n')
}
