/**
 * What the coach would have brought up if it were watching.
 *
 * The coach only ever spoke when spoken to: proposals existed but nothing
 * triggered them, so a bad week or a run of poor recovery went unmentioned
 * unless the athlete happened to open the chat and ask. These rules run
 * locally on every load — no API call, no key needed — and each one carries
 * the question to hand the coach if the athlete wants it acted on.
 *
 * Pure and total: everything comes in as arguments so it is all unit tested.
 */
import type { PlanWeek, TrainingPlan, WorkoutEntry } from '../store/useStore'
import type { DailyHealth } from './garmin/types'
import { addDays, daysInRange, fromISO, toISODate } from './dates'
import { weekCompletion } from './planMatch'
import { isTaperWeek } from './taper'

export type NudgeTone = 'info' | 'warn' | 'good'

export interface Nudge {
  /** stable across days, so a dismissal can be remembered */
  id: string
  tone: NudgeTone
  title: string
  body: string
  /** the question to open the coach with, when there is something to decide */
  ask?: string
}

export interface NudgeInput {
  today: string
  log: WorkoutEntry[]
  plan: TrainingPlan | null
  garminDaily: DailyHealth[]
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2
}

const weekOf = (plan: TrainingPlan | null, weekStart: string): PlanWeek | undefined =>
  plan?.weeks.find((w) => w.weekStart === weekStart)

/**
 * Last week is worth reviewing once it is over — offered at the start of the
 * new week rather than the moment the last session ends, because a review on
 * Saturday night is about a week that still has hours left in it.
 */
function weeklyReview({ today, log, plan }: NudgeInput): Nudge | null {
  const dow = fromISO(today).getDay()
  if (dow > 2) return null // Sunday–Tuesday, while last week is still fresh
  const thisWeekStart = toISODate(addDays(fromISO(today), -dow))
  const lastWeekStart = toISODate(addDays(fromISO(thisWeekStart), -7))
  const week = weekOf(plan, lastWeekStart)
  if (!week?.sessions.length) return null

  const comp = weekCompletion(week, log)
  const done = week.sessions.filter((s) => comp[s.id]?.done).length
  return {
    id: `review-${lastWeekStart}`,
    tone: done === week.sessions.length ? 'good' : 'info',
    title: 'השבוע שעבר הסתיים',
    body: `בוצעו ${done} מתוך ${week.sessions.length} האימונים המתוכננים.`,
    ask: 'סכם לי את השבוע שעבר — מה הלך טוב, מה פספסתי, ומה כדאי להתאים לשבוע הקרוב.',
  }
}

/** Three nights of below-baseline HRV is a pattern, not a bad night. */
function recovery({ garminDaily }: NudgeInput): Nudge | null {
  const days = [...garminDaily].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14)
  const withHrv = days.filter((d) => d.hrvLastNight != null)
  if (withHrv.length < 7) return null

  const baseline = median(withHrv.map((d) => d.hrvLastNight!))
  const recent = withHrv.slice(0, 3)
  if (recent.length < 3) return null
  const allLow = recent.every((d) => d.hrvLastNight! < baseline * 0.9)
  if (!allLow) return null

  return {
    id: `recovery-${recent[0].date}`,
    tone: 'warn',
    title: 'ההתאוששות מפגרת',
    body: `שלושה לילות ברצף עם HRV מתחת לבסיס שלך (${Math.round(baseline)}). זה הזמן להוריד עומס, לא להוסיף.`,
    ask: 'ה-HRV שלי מתחת לבסיס כבר שלושה לילות. תעבור על העומס של השבוע ותציע התאמה.',
  }
}

/** Most of the week gone and most of it not done — while it can still be saved. */
function adherence({ today, log, plan }: NudgeInput): Nudge | null {
  const dow = fromISO(today).getDay()
  if (dow < 3 || dow > 5) return null // midweek, while there is still time to move things
  const weekStart = toISODate(addDays(fromISO(today), -dow))
  const week = weekOf(plan, weekStart)
  if (!week || week.sessions.length < 3) return null

  const comp = weekCompletion(week, log)
  const done = week.sessions.filter((s) => comp[s.id]?.done).length
  const elapsed = (dow + 1) / 7
  if (done / week.sessions.length >= elapsed * 0.6) return null

  return {
    id: `adherence-${weekStart}`,
    tone: 'warn',
    title: 'השבוע מפגר אחרי התוכנית',
    body: `בוצעו ${done} מתוך ${week.sessions.length}, ורוב השבוע כבר מאחורינו.`,
    ask: 'לא הספקתי את רוב האימונים השבוע. תסדר מחדש את מה שנשאר לימים שנותרו, בלי לדחוס הכל.',
  }
}

/** A race with no taper week in front of it is a plan with a hole in it. */
function missingTaper({ today, plan }: NudgeInput): Nudge | null {
  if (!plan?.raceDate || plan.raceDate < today) return null
  const away = daysInRange(today, plan.raceDate) - 1
  if (away > 21 || away < 3) return null
  const hasTaper = plan.weeks.some(
    (w) => isTaperWeek(w) && w.weekStart <= plan.raceDate! && w.weekStart >= today,
  )
  if (hasTaper) return null

  return {
    id: `taper-${plan.raceDate}`,
    tone: 'info',
    title: `${away} ימים למרוץ, בלי שבוע טייפר`,
    body: 'אין בתוכנית שבוע שמסומן כטייפר לפני התאריך של המרוץ.',
    ask: `המרוץ בעוד ${away} ימים ואין לי שבוע טייפר בתוכנית. תבנה לי אותו.`,
  }
}

/** A key session the watch measured but nobody said how it felt. */
export function needsDebrief(log: WorkoutEntry[], today: string): WorkoutEntry[] {
  const since = toISODate(addDays(fromISO(today), -4))
  return log
    .filter(
      (e) =>
        e.date >= since &&
        e.date <= today &&
        e.source === 'garmin' &&
        e.rpe == null &&
        !e.multisportId,
    )
    .sort((a, b) => b.date.localeCompare(a.date))
}

const RULES = [recovery, adherence, weeklyReview, missingTaper]

/** The nudges worth showing, most important first. */
export function buildNudges(input: NudgeInput): Nudge[] {
  return RULES.map((r) => r(input)).filter((n): n is Nudge => n !== null)
}
