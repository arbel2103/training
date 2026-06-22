import type { PlannedWorkout, WorkoutEntry } from '../store/useStore'
import { entryDuration, formatDuration, formatPace, sportUnit } from './calc'
import {
  aerobicIntensityLabel,
  sportColorVar,
  sportIcon,
  sportLabel,
  strengthIntensityLabel,
  timeOfDayLabel,
} from './labels'

export interface EntryView {
  icon: string
  title: string
  details: string[]
  color: string
}

export function describeEntry(e: WorkoutEntry): EntryView {
  if (e.category === 'strength') {
    const details: string[] = []
    if (e.intensity) details.push(`עצימות ${strengthIntensityLabel[e.intensity]}`)
    if (e.timeOfDay) details.push(timeOfDayLabel[e.timeOfDay])
    if (e.durationMin) details.push(formatDuration(e.durationMin))
    return {
      icon: '💪',
      title: e.strengthName || 'אימון כוח',
      details,
      color: 'rgb(var(--c-strength))',
    }
  }
  if (e.category === 'aerobic' && e.sport) {
    const details: string[] = []
    if (e.distance) details.push(`${e.distance} ${sportUnit(e.sport)}`)
    if (e.aerobicIntensity)
      details.push(aerobicIntensityLabel[e.aerobicIntensity])
    if (e.sport === 'bike' && e.speedKmh) details.push(`${e.speedKmh} קמ״ש`)
    if (e.sport !== 'bike' && e.paceSec)
      details.push(`${formatPace(e.paceSec)} ${e.sport === 'swim' ? 'ל-100מ׳' : 'לק״מ'}`)
    details.push(formatDuration(entryDuration(e)))
    return {
      icon: sportIcon[e.sport],
      title: sportLabel[e.sport],
      details,
      color: sportColorVar[e.sport],
    }
  }
  return {
    icon: '✨',
    title: e.otherName || 'אימון אחר',
    details: e.durationMin ? [formatDuration(e.durationMin)] : [],
    color: 'rgb(var(--c-other))',
  }
}

export function describePlanned(p: PlannedWorkout): EntryView {
  const details: string[] = []
  if (p.time) details.push(p.time)
  if (p.category === 'strength') {
    return {
      icon: '💪',
      title: p.strengthName || 'כוח',
      details,
      color: 'rgb(var(--c-strength))',
    }
  }
  if (p.category === 'aerobic' && p.sport) {
    if (p.distance) details.unshift(`${p.distance} ${sportUnit(p.sport)}`)
    if (p.aerobicIntensity) details.push(aerobicIntensityLabel[p.aerobicIntensity])
    return {
      icon: sportIcon[p.sport],
      title: sportLabel[p.sport],
      details,
      color: sportColorVar[p.sport],
    }
  }
  return {
    icon: '✨',
    title: p.otherName || 'אחר',
    details,
    color: 'rgb(var(--c-other))',
  }
}
