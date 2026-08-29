// Equipment wear tracking. Pure logic — the store holds the items, this decides
// what they have been through and when they are due.
import type { Sport, WorkoutEntry } from '../store/useStore'

/** What a piece of gear wears out by. */
export type GearMetric = 'km' | 'hours'

export interface GearPreset {
  id: string
  name: string
  metric: GearMetric
  /** which workouts add to it; empty means every workout (time-based gear) */
  sports: Sport[]
  /** a sane replacement point, editable per item */
  target: number
  hint?: string
}

/**
 * Presets for the gear a triathlete actually replaces on a schedule.
 *
 * The defaults are the middle of the usual manufacturer/coaching ranges — a
 * starting point to edit, not a rule. Anything measured in hours accrues from
 * every matching workout's duration; anything in km from its distance.
 */
export const GEAR_PRESETS: GearPreset[] = [
  // ריצה
  {
    id: 'run-shoes',
    name: 'נעלי ריצה',
    metric: 'km',
    sports: ['run'],
    target: 700,
    hint: 'בדרך כלל 600–800 ק״מ. החלף מוקדם יותר אם מרגישים כאבים חדשים.',
  },
  {
    id: 'race-shoes',
    name: 'נעלי מרוץ',
    metric: 'km',
    sports: ['run'],
    target: 350,
    hint: 'נעלי תחרות נשחקות מהר יותר — 300–400 ק״מ.',
  },
  // אופניים
  {
    id: 'bike-tires',
    name: 'צמיגי אופניים',
    metric: 'km',
    sports: ['bike'],
    target: 4000,
    hint: 'צמיג אחורי נשחק כפליים מהקדמי.',
  },
  {
    id: 'bike-chain',
    name: 'שרשרת',
    metric: 'km',
    sports: ['bike'],
    target: 2500,
    hint: 'החלפה בזמן מאריכה את חיי הקסטה והגלגלי שיניים.',
  },
  {
    id: 'bike-cassette',
    name: 'קסטה',
    metric: 'km',
    sports: ['bike'],
    target: 8000,
    hint: 'בערך כל 3 שרשראות.',
  },
  {
    id: 'brake-pads',
    name: 'רפידות בלם',
    metric: 'km',
    sports: ['bike'],
    target: 2000,
  },
  {
    id: 'bar-tape',
    name: 'סרט כידון',
    metric: 'km',
    sports: ['bike'],
    target: 5000,
  },
  {
    id: 'cleats',
    name: 'קליטים (פדלים)',
    metric: 'km',
    sports: ['bike'],
    target: 3000,
    hint: 'קליט שחוק משחרר את הרגל בלי אזהרה.',
  },
  {
    id: 'shift-cables',
    name: 'כבלי הילוכים',
    metric: 'km',
    sports: ['bike'],
    target: 5000,
  },
  // שחייה — נמדד בשעות, כי הכלור והשמש שוחקים לפי זמן ולא לפי מרחק
  {
    id: 'wetsuit',
    name: 'חליפת שחייה',
    metric: 'hours',
    sports: ['swim'],
    target: 100,
    hint: 'שטוף במים מתוקים אחרי ים — מלח מקצר את החיים שלה.',
  },
  {
    id: 'goggles',
    name: 'משקפת שחייה',
    metric: 'hours',
    sports: ['swim'],
    target: 80,
    hint: 'הציפוי נגד אדים נשחק לפני הגומי.',
  },
  {
    id: 'swimsuit',
    name: 'בגד ים',
    metric: 'hours',
    sports: ['swim'],
    target: 120,
    hint: 'כלור הורס את הגומי גם בלי שימוש כבד.',
  },
  // כללי
  {
    id: 'hr-strap',
    name: 'רצועת דופק',
    metric: 'hours',
    sports: [],
    target: 400,
    hint: 'בעיקר הסוללה והמגע — קריאות קופצניות הן הסימן.',
  },
  {
    id: 'trainer-tire',
    name: 'צמיג טריינר',
    metric: 'hours',
    sports: ['bike'],
    target: 300,
  },
]

export const gearPreset = (id: string) => GEAR_PRESETS.find((p) => p.id === id)

export interface GearItem {
  id: string
  /** the preset it came from, or 'custom' */
  kind: string
  name: string
  metric: GearMetric
  sports: Sport[]
  /** distance/hours already on it when it was added — 0 for something new */
  startValue: number
  /** replace at this total; 0 or undefined means "just count, never nag" */
  target?: number
  /** yyyy-mm-dd — workouts from this date on count toward it */
  addedOn: string
  /** set when replaced; stops the accrual and moves it to the history */
  retiredOn?: string
  note?: string
}

const hoursOf = (e: WorkoutEntry) => (e.durationMin ?? 0) / 60

/**
 * Distance in km.
 *
 * Swim distances are stored in metres while run and bike are in km, so a
 * naive sum would credit a 2 km swim with 2000. Swim gear is measured in hours
 * anyway; this only guards the case of someone pointing a km item at swimming.
 */
function kmOf(e: WorkoutEntry): number {
  const d = e.distance ?? 0
  if (!d) return 0
  return e.sport === 'swim' ? d / 1000 : d
}

/**
 * How much this item has been used: what it arrived with, plus every matching
 * workout since it was added (and before it was retired).
 */
export function gearUsage(item: GearItem, log: WorkoutEntry[]): number {
  const accrued = log.reduce((sum, e) => {
    if (e.date < item.addedOn) return sum
    if (item.retiredOn && e.date > item.retiredOn) return sum
    // an empty sports list means the item wears with any training
    if (item.sports.length) {
      if (!e.sport || !item.sports.includes(e.sport)) return sum
    }
    return sum + (item.metric === 'km' ? kmOf(e) : hoursOf(e))
  }, 0)
  return item.startValue + accrued
}

export type GearState = 'ok' | 'soon' | 'due'

export interface GearStatus {
  used: number
  target?: number
  /** 0–1 against the target, clamped; undefined when there is no target */
  progress?: number
  remaining?: number
  state: GearState
}

/** Warn while there is still time to order the replacement. */
const SOON_AT = 0.85

export function gearStatus(item: GearItem, log: WorkoutEntry[]): GearStatus {
  const used = gearUsage(item, log)
  if (!item.target || item.target <= 0) return { used, state: 'ok' }
  const ratio = used / item.target
  return {
    used,
    target: item.target,
    progress: Math.min(1, ratio),
    remaining: Math.max(0, item.target - used),
    state: ratio >= 1 ? 'due' : ratio >= SOON_AT ? 'soon' : 'ok',
  }
}

export const metricLabel = (m: GearMetric) => (m === 'km' ? 'ק״מ' : 'שעות')

/** Rounded the way each unit is actually read: whole km, one decimal of hours. */
export const formatUsage = (v: number, m: GearMetric) =>
  m === 'km' ? Math.round(v).toLocaleString('he-IL') : v.toFixed(1)

/** Items still in service, most worn first — the ones needing attention lead. */
export function activeGear(gear: GearItem[], log: WorkoutEntry[]): GearItem[] {
  return gear
    .filter((g) => !g.retiredOn)
    .sort((a, b) => {
      const pa = gearStatus(a, log).progress ?? -1
      const pb = gearStatus(b, log).progress ?? -1
      return pb - pa
    })
}

export const retiredGear = (gear: GearItem[]) =>
  gear
    .filter((g) => g.retiredOn)
    .sort((a, b) => (b.retiredOn ?? '').localeCompare(a.retiredOn ?? ''))

/** Anything at or past its target — what the summary line counts. */
export const gearDue = (gear: GearItem[], log: WorkoutEntry[]) =>
  activeGear(gear, log).filter((g) => gearStatus(g, log).state === 'due')
