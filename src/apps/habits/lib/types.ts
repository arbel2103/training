/** A calendar day, local time, 'yyyy-mm-dd'. */
export type ISODate = string

export interface Category {
  id: string
  name: string
  order: number
  /** accordion state, persisted so the app reopens the way you left it */
  collapsed: boolean
}

export interface Habit {
  id: string
  categoryId: string
  name: string
  order: number
  /** the day counting starts from; editable, so a habit can be backdated */
  createdDate: ISODate
  icon?: string
  color?: string
  /** soft delete — drops off the list, keeps the history */
  archivedAt?: string

  /* The raw facts. Streaks, rates and history are all derived from these two
     maps plus the global freezes, never stored — that is what makes "carry on
     from exactly where you left off" fall out for free instead of needing a
     counter that could drift. */
  completions: Record<ISODate, true>
  /** days this one habit was excused, for an outside constraint */
  frozenDays: Record<ISODate, true>
}

/** A stretch where every habit is paused. `end: null` means still frozen. */
export interface GlobalFreeze {
  start: ISODate
  end: ISODate | null
}

/** How one day looked, for the mini history strip. */
export type DayState = 'done' | 'missed' | 'frozen' | 'pending' | 'before'

export interface DayCell {
  date: ISODate
  state: DayState
}

export interface HabitStats {
  currentStreak: number
  bestStreak: number
  /** 0–100, or null before there is any day to judge */
  rate: number | null
  /** days counted as done (excludes anything frozen) */
  doneDays: number
  /** the denominator — elapsed days minus frozen ones */
  countedDays: number
}
