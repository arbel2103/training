import type {
  AerobicIntensity,
  Category,
  Sport,
  StrengthIntensity,
  TimeOfDay,
} from '../store/useStore'

export const SPORTS: Sport[] = ['run', 'bike', 'swim']

export const sportLabel: Record<Sport, string> = {
  run: 'ריצה',
  bike: 'רכיבה',
  swim: 'שחייה',
}
export const sportIcon: Record<Sport, string> = {
  run: '🏃',
  bike: '🚴',
  swim: '🏊',
}
export const sportColorVar: Record<Sport, string> = {
  run: 'rgb(var(--c-run))',
  bike: 'rgb(var(--c-bike))',
  swim: 'rgb(var(--c-swim))',
}

export const categoryLabel: Record<Category, string> = {
  strength: 'כוח',
  aerobic: 'אירובי',
  other: 'אחר',
}
export const categoryColorVar: Record<Category, string> = {
  strength: 'rgb(var(--c-strength))',
  aerobic: 'rgb(var(--c-swim))',
  other: 'rgb(var(--c-other))',
}

export const strengthIntensityLabel: Record<StrengthIntensity, string> = {
  light: 'קל',
  medium: 'בינוני',
  heavy: 'כבד',
}
export const STRENGTH_INTENSITIES: StrengthIntensity[] = ['light', 'medium', 'heavy']

export const timeOfDayLabel: Record<TimeOfDay, string> = {
  morning: 'בוקר',
  noon: 'צהריים',
  evening: 'ערב',
}
export const TIMES_OF_DAY: TimeOfDay[] = ['morning', 'noon', 'evening']

export const aerobicIntensityLabel: Record<AerobicIntensity, string> = {
  easy: 'קלה',
  long: 'ארוכה',
  intense: 'עצימה',
  technique: 'טכניקה',
}
/** intensity options per sport — swim adds "technique". */
export function aerobicIntensitiesFor(sport: Sport): AerobicIntensity[] {
  const base: AerobicIntensity[] = ['easy', 'long', 'intense']
  return sport === 'swim' ? [...base, 'technique'] : base
}
