import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DailyHealth } from '../lib/garmin/types'
import type { MuscleGroup } from '../lib/strength'
import {
  boardWorkoutsForPlan,
  carryOverSessionIds,
  reconcilePlanWeek,
} from '../lib/planMatch'
import { addDays, fromISO, toISODate } from '../lib/dates'
import { sanitizePlan, sanitizePlanWeek } from '../lib/planSanitize'
import { type ID, uid } from '../lib/ids'
import type { GearItem } from '../lib/gear'

export { uid } from '../lib/ids'
export type { ID } from '../lib/ids'

/* ---------------- Program: Strength ---------------- */
export interface Exercise {
  id: ID
  name: string
  sets: number
  reps: number[] // length === sets, e.g. [10, 10, 12]
  /** free text on purpose — holds "משקל גוף" or "גומייה" as happily as "40 ק״ג" */
  weight: string
  /** which muscles this drives; drives the weekly volume view */
  muscles?: MuscleGroup[]
  updatedAt: string // ISO
}

/**
 * One set as it was actually performed.
 *
 * The exercise name and muscles are copied in rather than looked up, so a set
 * logged today still reads correctly after the template is renamed, retagged or
 * deleted — history should record what happened, not what the plan says now.
 */
export interface LoggedSet {
  exerciseId: ID
  exerciseName: string
  reps: number
  weightKg?: number // absent for bodyweight work
  muscles?: MuscleGroup[]
}

/** A strength workout in progress. Persisted so locking the phone mid-set
 *  (which is what phones do in a gym) never loses the session. */
export interface ActiveStrengthSession {
  categoryId: ID
  categoryName: string
  startedAt: string // ISO
  sets: LoggedSet[]
}
export interface StrengthCategory {
  id: ID
  name: string
  exercises: Exercise[]
}

/* ---------------- Program: Aerobic ---------------- */
/** A reorderable, hideable list of section ids. */
export interface LayoutPrefs {
  order: string[]
  hidden: string[]
}

export type HomeTileId = 'race' | 'lastNight' | 'today' | 'week'
export interface HomeLayout {
  order: HomeTileId[]
  hidden: HomeTileId[]
}
export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  order: ['race', 'lastNight', 'today', 'week'],
  hidden: [],
}

export const DEFAULT_DAILY_HEALTH_LAYOUT: LayoutPrefs = {
  order: ['steps', 'rhr', 'hrv', 'bodyBattery', 'stress', 'calories', 'vo2'],
  hidden: [],
}

export type Sport = 'run' | 'bike' | 'swim'
export interface WeeklyTarget {
  id: ID
  distance: number // km for run/bike, meters for swim
  note?: string
}
export type AerobicTargets = Record<Sport, WeeklyTarget[]>

/* ---------------- Workout log (tracking) ---------------- */
export type Category = 'strength' | 'aerobic' | 'other'
export type StrengthIntensity = 'light' | 'medium' | 'heavy'
export type TimeOfDay = 'morning' | 'noon' | 'evening'
export type AerobicIntensity = 'easy' | 'long' | 'intense' | 'technique'

export interface WorkoutEntry {
  id: ID
  date: string // yyyy-mm-dd
  category: Category
  // strength
  strengthName?: string
  intensity?: StrengthIntensity
  timeOfDay?: TimeOfDay
  /** the sets actually performed; present once logged through "אימון פעיל" */
  sets?: LoggedSet[]
  // aerobic
  sport?: Sport
  distance?: number
  aerobicIntensity?: AerobicIntensity
  paceSec?: number // run: sec/km ; swim: sec/100m
  speedKmh?: number // bike
  // other
  otherName?: string
  // common
  durationMin?: number // entered (strength/other) or computed (aerobic)
  rpe?: number // perceived exertion 1–10 (post-workout debrief)
  note?: string // how it felt / free note
  /**
   * Which planned session this workout fulfils, chosen by the user.
   * Absent → the plan matcher decides by sport/distance. Set to a session id →
   * this workout completes exactly that session. Set to NOT_IN_PLAN → the
   * workout is an extra, deliberately outside the plan, and never matched.
   */
  planSessionId?: string
  // Garmin-sourced metrics (optional; present when source === 'garmin')
  source?: 'manual' | 'garmin'
  garminActivityId?: number
  /** activity id of the multisport session this leg belongs to (triathlon/brick) */
  multisportId?: number
  /** true while aerobicIntensity is an automatic guess; false once the user edits it */
  autoTagged?: boolean
  startTime?: string // HH:MM local
  avgHr?: number
  maxHr?: number
  calories?: number
  elevationGain?: number // meters
  cadence?: number // run: spm, bike: rpm, swim: strokes/min
  // sport-specific dynamics (Garmin)
  gct?: number // ground contact time, ms (run)
  verticalOscillation?: number // cm (run)
  strideLength?: number // cm (run)
  power?: number // watts (bike)
  normPower?: number // watts (bike)
  swolf?: number // swim efficiency
}

/* ---------------- Planning ---------------- */
export interface PlannedWorkout {
  id: ID
  date: string // yyyy-mm-dd within planned week
  time?: string // HH:MM for the calendar event
  category: Category
  strengthName?: string
  sport?: Sport
  aerobicIntensity?: AerobicIntensity
  distance?: number
  otherName?: string
  durationMin?: number
  syncedEventId?: string
  /**
   * The calendar event is out of date — the workout changed after it was sent.
   * Set automatically on every edit to a synced workout, cleared once the push
   * succeeds, so "סנכרן ליומן" can say exactly what is waiting.
   */
  needsPush?: boolean
  /** links back to the coach-plan session it was imported from (dedup) */
  planSessionId?: string
}

/** A busy slot loaded from the user's calendar, shared with the coach. */
export interface CalendarBusy {
  date: string // yyyy-mm-dd
  start?: string // HH:MM
  end?: string // HH:MM
  title: string
}

/* ---------------- Health: weight & checkups ---------------- */
export interface WeighIn {
  id: ID
  date: string // yyyy-mm-dd
  weight: number
}
export interface Checkup {
  id: ID
  type: string
  date: string // yyyy-mm-dd performed
  validMonths: number // validity period; next due = date + validMonths
  fileName?: string
  fileType?: string
}

/* ---------------- AI Coach: profile & structured plan ---------------- */
export interface Race {
  name?: string
  type?: string // sprint | olympic | 70.3 | full …
  date?: string // yyyy-mm-dd
}
export interface CoachProfile {
  races?: Race[]
  goals?: string
  weeklyHours?: number
  availableDays?: string[]
  equipment?: string[]
  constraints?: string
  currentLevel?: string
  notes?: string
}
export type PlanSport = Sport | 'strength' | 'other'
export interface PlanSession {
  id: ID
  day: number // 0=Sun … 6=Sat
  sport: PlanSport
  label?: string // e.g. "ארוכה", "אינטרוולים"
  distance?: number
  durationMin?: number
  note?: string
  /**
   * The session exists only because the board has a workout there — it mirrors
   * an ad-hoc addition rather than something the plan prescribes, so deleting
   * that workout removes it again.
   */
  fromBoard?: boolean
}
export interface PlanWeek {
  id: ID
  weekStart: string // yyyy-mm-dd (Sunday)
  label?: string
  focus?: string
  sessions: PlanSession[]
  /**
   * How the week actually went, in the athlete's own words.
   *
   * The numbers say what was done; this says what it felt like — an illness, a
   * work week that ate the long ride, a run that finally clicked. The coach
   * reads it when reviewing the week, so its feedback answers the real story
   * rather than only the adherence count.
   */
  review?: string
  /** when the review was written (ISO) */
  reviewedAt?: string
}
export interface TrainingPlan {
  raceName?: string
  raceDate?: string
  weeks: PlanWeek[]
}
/**
 * The plan as it stood just before an edit.
 *
 * The coach rewrites the plan through tool calls, and a single vague request
 * ("change my bike distances") can replace weeks of work in one turn. Keeping
 * the previous state makes that reversible instead of final.
 */
export interface PlanSnapshot {
  id: ID
  /** when the edit that replaced this plan happened */
  at: string
  /** what caused it, in Hebrew — shown in the restore list */
  reason: string
  plan: TrainingPlan | null
}
export interface ChatMessage {
  id: ID
  role: 'user' | 'assistant'
  text: string
}

/** A durable fact the coach remembers about the athlete. */
export interface CoachMemory {
  id: ID
  text: string
  createdAt: string // ISO
}

/** A proposed change to a plan week, awaiting the user's approval. */
export interface PlanProposal {
  id: ID
  weekStart: string // yyyy-mm-dd (Sunday)
  label?: string
  focus?: string
  rationale: string // why the coach suggests this
  sessions: PlanSession[]
}

/* ---------------- Garmin integration ---------------- */
export interface GarminSettings {
  connected: boolean
  lastEmail?: string // password is never stored on the device
}
export type GarminSyncState = 'idle' | 'dispatching' | 'running' | 'error'
export interface GarminSyncStatus {
  state: GarminSyncState
  lastGarminSyncAt?: string // when the workflow last ran (from sync-status.json)
  lastFetchAt?: string // when the app last pulled data from the repo
  error?: string
  errorCode?: string
}

/** The board workouts that fall inside the week starting on `weekStart`. */
function weekSlice(planned: PlannedWorkout[], weekStart: string): PlannedWorkout[] {
  const weekEnd = toISODate(addDays(fromISO(weekStart), 6))
  return planned.filter((p) => p.date >= weekStart && p.date <= weekEnd)
}

/**
 * Fold a rewritten week into the plan without losing what the board owns.
 *
 * Re-uses the ids of the sessions it replaces so the board's links survive the
 * edit (see `carryOverSessionIds`), and carries over any `fromBoard` session the
 * rewrite didn't claim. The coach rewrites a whole week even when it only meant
 * to change one workout, and a session that exists because the user put a
 * workout on the board is not the coach's to delete by omission — deleting it
 * would take the workout off the board with it.
 */
/** How many previous plans to keep. Enough to walk back a bad coach session. */
const PLAN_HISTORY_LIMIT = 15

/**
 * Record the plan being replaced, newest first.
 *
 * A no-op when there was no plan to begin with: an empty "before" is not a
 * version worth offering to restore.
 */
function pushSnapshot(
  history: PlanSnapshot[],
  before: TrainingPlan | null,
  reason: string,
): PlanSnapshot[] {
  if (!before || !before.weeks.length) return history ?? []
  const snap: PlanSnapshot = {
    id: uid(),
    at: new Date().toISOString(),
    reason,
    plan: before,
  }
  return [snap, ...(history ?? [])].slice(0, PLAN_HISTORY_LIMIT)
}

function keepSessionIdentity(plan: TrainingPlan | null, week: PlanWeek): PlanWeek {
  const prev = plan?.weeks.find((w) => w.weekStart === week.weekStart)
  if (!prev) return week
  const sessions = carryOverSessionIds(prev.sessions, week.sessions)
  const kept = new Set(sessions.map((s) => s.id))
  const survivors = prev.sessions.filter((s) => s.fromBoard && !kept.has(s.id))
  return {
    ...week,
    id: prev.id,
    // the athlete's note about how the week went is theirs, not the coach's.
    // A rewrite of the week's sessions never carries one, so without this any
    // plan edit would quietly erase what they wrote.
    review: week.review ?? prev.review,
    reviewedAt: week.reviewedAt ?? prev.reviewedAt,
    sessions: [...sessions, ...survivors],
  }
}

/** Fields that appear in the Google Calendar event this workout produced. */
const CALENDAR_FIELDS = [
  'date',
  'time',
  'durationMin',
  'category',
  'sport',
  'distance',
  'strengthName',
  'otherName',
  'aerobicIntensity',
] as const

function adjustReps(reps: number[], sets: number): number[] {
  const next = reps.slice(0, sets)
  const fill = reps.length ? reps[reps.length - 1] : 10
  while (next.length < sets) next.push(fill)
  return next
}

interface State {
  strengthCategories: StrengthCategory[]
  aerobicTargets: AerobicTargets
  log: WorkoutEntry[]
  planned: PlannedWorkout[]
  weighIns: WeighIn[]
  checkups: Checkup[]
  coachProfile: CoachProfile | null
  /** tracked equipment — shoes, tyres, wetsuits — in service and retired */
  gear: GearItem[]
  trainingPlan: TrainingPlan | null
  /** the plan as it was before each of the last few edits, newest first */
  planHistory: PlanSnapshot[]
  coachMessages: ChatMessage[]
  coachMemory: CoachMemory[]
  planProposals: PlanProposal[]
  /** nudge id → dismissal date */
  dismissedNudges: Record<string, string>
  calendarQuery: string
  calendarBusy: CalendarBusy[]
  /**
   * Google event ids whose workout is already gone locally. The delete needs a
   * connected calendar, which the store has no access to, so the planning page
   * drains this the next time it is online.
   */
  pendingCalendarDeletes: string[]
  garminSettings: GarminSettings
  garminSyncStatus: GarminSyncStatus
  garminDaily: DailyHealth[]

  // home dashboard layout (tile order + hidden tiles)
  homeLayout: HomeLayout
  setHomeLayout: (layout: HomeLayout) => void

  // daily-health metrics layout (order + hidden)
  dailyHealthLayout: LayoutPrefs
  setDailyHealthLayout: (layout: LayoutPrefs) => void

  // strength categories
  addCategory: (name: string) => void
  renameCategory: (id: ID, name: string) => void
  removeCategory: (id: ID) => void

  // exercises
  addExercise: (categoryId: ID) => void
  updateExercise: (categoryId: ID, exerciseId: ID, patch: Partial<Exercise>) => void
  removeExercise: (categoryId: ID, exerciseId: ID) => void
  moveExercise: (categoryId: ID, exerciseId: ID, dir: -1 | 1) => void

  // an in-progress strength workout
  activeStrength: ActiveStrengthSession | null
  startStrengthSession: (categoryId: ID) => void
  logStrengthSet: (set: LoggedSet) => void
  undoLastStrengthSet: () => void
  cancelStrengthSession: () => void
  /** turns the session into a log entry; returns false if nothing was logged */
  finishStrengthSession: (extra?: {
    rpe?: number
    note?: string
    intensity?: StrengthIntensity
    planSessionId?: string
  }) => boolean

  // coach-built strength workout (create/replace a category by name, with exercises)
  upsertStrengthWorkout: (
    name: string,
    exercises: { name: string; sets?: number; reps?: number[]; weight?: string }[],
  ) => void
  removeStrengthWorkout: (name: string) => void

  // aerobic targets
  addTarget: (sport: Sport, distance: number) => void
  updateTarget: (sport: Sport, id: ID, patch: Partial<WeeklyTarget>) => void
  removeTarget: (sport: Sport, id: ID) => void

  // log
  addEntry: (entry: Omit<WorkoutEntry, 'id'>) => void
  updateEntry: (id: ID, patch: Partial<WorkoutEntry>) => void
  removeEntry: (id: ID) => void

  // planned
  addPlanned: (p: Omit<PlannedWorkout, 'id'>) => void
  updatePlanned: (id: ID, patch: Partial<PlannedWorkout>) => void
  removePlanned: (id: ID) => void

  // health: weight
  addWeighIn: (date: string, weight: number) => void
  removeWeighIn: (id: ID) => void

  // health: checkups
  /** returns the new checkup's id, so a caller can attach a file right after */
  addCheckup: (c: Omit<Checkup, 'id'>) => ID
  updateCheckup: (id: ID, patch: Partial<Checkup>) => void
  removeCheckup: (id: ID) => void

  // gear
  addGear: (g: Omit<GearItem, 'id'>) => ID
  updateGear: (id: ID, patch: Partial<Omit<GearItem, 'id'>>) => void
  removeGear: (id: ID) => void
  /**
   * Retire an item and put its successor in service the same day, so the pair
   * reads as one continuous history rather than two unrelated entries.
   */
  replaceGear: (id: ID, next: Partial<Omit<GearItem, 'id'>>) => ID | null

  // AI coach
  updateCoachProfile: (patch: Partial<CoachProfile>) => void
  setTrainingPlan: (plan: TrainingPlan, reason?: string) => void
  upsertPlanWeek: (week: PlanWeek, reason?: string) => void
  /** Put the plan back to one of the snapshots in `planHistory`. */
  restorePlanSnapshot: (id: ID) => boolean
  /** Write (or clear) the athlete's own note on how a week went. */
  setWeekReview: (weekStart: string, review: string) => void
  /**
   * Board → plan. Move matched sessions to the day they were placed on, create
   * a session for a board workout that has none, and drop a session that only
   * mirrored a workout the user has since deleted. Safe to call repeatedly.
   */
  syncPlanWeekWithBoard: (weekStart: string) => void
  /**
   * Plan → board. Move each scheduled workout to the day the plan now
   * prescribes, schedule a session that has no workout yet, and unschedule one
   * the plan dropped. Everything it touches is flagged `needsPush`, so the
   * calendar is only rewritten once the user approves. A week with nothing on
   * the board yet is left alone.
   */
  syncBoardWithPlanWeek: (weekStart: string) => void
  clearPendingCalendarDeletes: (eventIds: string[]) => void
  clearPlan: () => void
  addChatMessage: (role: 'user' | 'assistant', text: string) => void
  clearCoachChat: () => void

  // coach memory / brief / plan proposals
  addMemory: (text: string) => void
  removeMemory: (id: ID) => void
  /** nudge id → the date it was dismissed, so it can come back tomorrow */
  dismissNudge: (id: string) => void
  setPlanProposals: (proposals: PlanProposal[]) => void
  addPlanProposal: (proposal: Omit<PlanProposal, 'id'>) => void
  removePlanProposal: (id: ID) => void
  clearPlanProposals: () => void

  // calendar
  setCalendarQuery: (q: string) => void
  setCalendarBusy: (events: CalendarBusy[]) => void

  // garmin
  setGarminSettings: (patch: Partial<GarminSettings>) => void
  setGarminSyncStatus: (patch: Partial<GarminSyncStatus>) => void
  setGarminDaily: (days: DailyHealth[]) => void
  upsertGarminEntries: (
    creates: Omit<WorkoutEntry, 'id'>[],
    updates: { id: ID; patch: Partial<WorkoutEntry> }[],
    removes?: ID[],
  ) => void
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      strengthCategories: [],
      aerobicTargets: { run: [], bike: [], swim: [] },
      log: [],
      planned: [],
      weighIns: [],
      checkups: [],
      coachProfile: null,
      trainingPlan: null,
      planHistory: [],
      gear: [],
      coachMessages: [],
      coachMemory: [],
      planProposals: [],
      dismissedNudges: {},
      calendarQuery: 'אלבטרוס',
      calendarBusy: [],
      pendingCalendarDeletes: [],
      garminSettings: { connected: false },
      garminSyncStatus: { state: 'idle' },
      homeLayout: DEFAULT_HOME_LAYOUT,
      dailyHealthLayout: DEFAULT_DAILY_HEALTH_LAYOUT,
      garminDaily: [],

      addCategory: (name) =>
        set((s) => ({
          strengthCategories: [
            ...s.strengthCategories,
            { id: uid(), name: name.trim() || 'אימון חדש', exercises: [] },
          ],
        })),
      renameCategory: (id, name) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.map((c) =>
            c.id === id ? { ...c, name } : c,
          ),
        })),
      removeCategory: (id) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.filter((c) => c.id !== id),
        })),

      addExercise: (categoryId) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.map((c) =>
            c.id === categoryId
              ? {
                  ...c,
                  exercises: [
                    ...c.exercises,
                    {
                      id: uid(),
                      name: '',
                      sets: 3,
                      reps: [10, 10, 10],
                      weight: '',
                      updatedAt: new Date().toISOString(),
                    },
                  ],
                }
              : c,
          ),
        })),
      updateExercise: (categoryId, exerciseId, patch) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.map((c) => {
            if (c.id !== categoryId) return c
            return {
              ...c,
              exercises: c.exercises.map((ex) => {
                if (ex.id !== exerciseId) return ex
                const merged = { ...ex, ...patch }
                if (patch.sets !== undefined) {
                  merged.reps = adjustReps(ex.reps, patch.sets)
                }
                merged.updatedAt = new Date().toISOString()
                return merged
              }),
            }
          }),
        })),
      activeStrength: null,
      startStrengthSession: (categoryId) =>
        set((s) => {
          const cat = s.strengthCategories.find((c) => c.id === categoryId)
          if (!cat) return {}
          return {
            activeStrength: {
              categoryId,
              categoryName: cat.name,
              startedAt: new Date().toISOString(),
              sets: [],
            },
          }
        }),
      logStrengthSet: (logged) =>
        set((s) =>
          s.activeStrength
            ? {
                activeStrength: {
                  ...s.activeStrength,
                  sets: [...s.activeStrength.sets, logged],
                },
              }
            : {},
        ),
      undoLastStrengthSet: () =>
        set((s) =>
          s.activeStrength
            ? {
                activeStrength: {
                  ...s.activeStrength,
                  sets: s.activeStrength.sets.slice(0, -1),
                },
              }
            : {},
        ),
      cancelStrengthSession: () => set({ activeStrength: null }),
      finishStrengthSession: (extra) => {
        const s = useStore.getState()
        const session = s.activeStrength
        if (!session || session.sets.length === 0) return false
        const started = new Date(session.startedAt)
        const dateISO = toISODate(started)
        const durationMin = Math.max(
          1,
          Math.round((Date.now() - started.getTime()) / 60_000),
        )
        // what the app knows the watch never does: the sets, the feel, the name
        const logged = {
          strengthName: session.categoryName,
          sets: session.sets,
          ...extra,
        }
        // if the watch already logged this strength workout today, fold the
        // sets into that entry instead of creating a second one — the user
        // keeps Garmin's heart rate, measured time and calories, plus the
        // per-set data they marked here. Pick one that has no sets yet, so a
        // second strength session the same day isn't swallowed.
        const garmin = s.log.find(
          (e) =>
            e.category === 'strength' &&
            e.date === dateISO &&
            (e.source === 'garmin' || e.garminActivityId != null) &&
            !(e.sets && e.sets.length),
        )
        set((cur) => {
          if (garmin) {
            return {
              log: cur.log.map((e) =>
                e.id === garmin.id ? { ...e, ...logged } : e,
              ),
              activeStrength: null,
            }
          }
          return {
            log: [
              ...cur.log,
              {
                id: uid(),
                date: dateISO,
                category: 'strength' as Category,
                durationMin,
                startTime: `${String(started.getHours()).padStart(2, '0')}:${String(
                  started.getMinutes(),
                ).padStart(2, '0')}`,
                source: 'manual' as const,
                ...logged,
              },
            ],
            activeStrength: null,
          }
        })
        return true
      },

      upsertStrengthWorkout: (name, exercises) =>
        set((s) => {
          const built: Exercise[] = (exercises ?? []).map((e) => {
            const sets = e.sets ?? e.reps?.length ?? 3
            return {
              id: uid(),
              name: e.name ?? '',
              sets,
              reps: adjustReps(e.reps ?? [], sets),
              weight: e.weight ?? '',
              updatedAt: new Date().toISOString(),
            }
          })
          const exists = s.strengthCategories.some((c) => c.name === name)
          return {
            strengthCategories: exists
              ? s.strengthCategories.map((c) =>
                  c.name === name ? { ...c, exercises: built } : c,
                )
              : [...s.strengthCategories, { id: uid(), name, exercises: built }],
          }
        }),
      removeStrengthWorkout: (name) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.filter((c) => c.name !== name),
        })),
      removeExercise: (categoryId, exerciseId) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.map((c) =>
            c.id === categoryId
              ? { ...c, exercises: c.exercises.filter((ex) => ex.id !== exerciseId) }
              : c,
          ),
        })),
      moveExercise: (categoryId, exerciseId, dir) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.map((c) => {
            if (c.id !== categoryId) return c
            const i = c.exercises.findIndex((ex) => ex.id === exerciseId)
            const j = i + dir
            if (i < 0 || j < 0 || j >= c.exercises.length) return c
            const exercises = [...c.exercises]
            ;[exercises[i], exercises[j]] = [exercises[j], exercises[i]]
            return { ...c, exercises }
          }),
        })),

      addTarget: (sport, distance) =>
        set((s) => ({
          aerobicTargets: {
            ...s.aerobicTargets,
            [sport]: [...s.aerobicTargets[sport], { id: uid(), distance }],
          },
        })),
      updateTarget: (sport, id, patch) =>
        set((s) => ({
          aerobicTargets: {
            ...s.aerobicTargets,
            [sport]: s.aerobicTargets[sport].map((t) =>
              t.id === id ? { ...t, ...patch } : t,
            ),
          },
        })),
      removeTarget: (sport, id) =>
        set((s) => ({
          aerobicTargets: {
            ...s.aerobicTargets,
            [sport]: s.aerobicTargets[sport].filter((t) => t.id !== id),
          },
        })),

      addEntry: (entry) => set((s) => ({ log: [...s.log, { ...entry, id: uid() }] })),
      updateEntry: (id, patch) =>
        set((s) => ({
          log: s.log.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        })),
      removeEntry: (id) => set((s) => ({ log: s.log.filter((e) => e.id !== id) })),

      addPlanned: (p) => set((s) => ({ planned: [...s.planned, { ...p, id: uid() }] })),
      updatePlanned: (id, patch) =>
        set((s) => ({
          planned: s.planned.map((p) => {
            if (p.id !== id) return p
            const next = { ...p, ...patch }
            // an edit to a workout already in the calendar leaves that event
            // stale until it is pushed again — say so rather than showing "ביומן ✓"
            if (
              next.syncedEventId &&
              patch.needsPush === undefined &&
              CALENDAR_FIELDS.some((f) => f in patch && patch[f] !== p[f])
            )
              next.needsPush = true
            return next
          }),
        })),
      removePlanned: (id) =>
        set((s) => ({ planned: s.planned.filter((p) => p.id !== id) })),

      addWeighIn: (date, weight) =>
        set((s) => ({ weighIns: [...s.weighIns, { id: uid(), date, weight }] })),
      removeWeighIn: (id) =>
        set((s) => ({ weighIns: s.weighIns.filter((w) => w.id !== id) })),

      addCheckup: (c) => {
        const id = uid()
        set((s) => ({ checkups: [...s.checkups, { ...c, id }] }))
        return id
      },
      updateCheckup: (id, patch) =>
        set((s) => ({
          checkups: s.checkups.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCheckup: (id) =>
        set((s) => ({ checkups: s.checkups.filter((c) => c.id !== id) })),

      addGear: (g) => {
        const id = uid()
        set((s) => ({ gear: [...s.gear, { ...g, id }] }))
        return id
      },
      updateGear: (id, patch) =>
        set((s) => ({
          gear: s.gear.map((g) => (g.id === id ? { ...g, ...patch, id } : g)),
        })),
      removeGear: (id) => set((s) => ({ gear: s.gear.filter((g) => g.id !== id) })),
      replaceGear: (id, next) => {
        const old = get().gear.find((g) => g.id === id)
        if (!old) return null
        const today = toISODate(new Date())
        const newId = uid()
        set((s) => ({
          gear: [
            ...s.gear.map((g) => (g.id === id ? { ...g, retiredOn: today } : g)),
            {
              // the replacement inherits what it is and what it is measured by;
              // only the name and the numbers are worth asking about again
              kind: old.kind,
              name: old.name,
              metric: old.metric,
              sports: old.sports,
              target: old.target,
              startValue: 0,
              ...next,
              addedOn: next.addedOn ?? today,
              id: newId,
            },
          ],
        }))
        return newId
      },

      updateCoachProfile: (patch) =>
        set((s) => ({ coachProfile: { ...(s.coachProfile ?? {}), ...patch } })),
      // the plan comes from the AI coach, so it is sanitized on the way in
      // rather than trusted: a week the views can't render would take the whole
      // "תוכנית" page down, and it would do it again on every reload
      setTrainingPlan: (plan, reason = 'התוכנית הוחלפה') =>
        set((s) => {
          const clean = sanitizePlan(plan)
          if (!clean) return {}
          return {
            planHistory: pushSnapshot(s.planHistory, s.trainingPlan, reason),
            trainingPlan: {
              ...clean,
              weeks: clean.weeks.map((w) => keepSessionIdentity(s.trainingPlan, w)),
            },
          }
        }),
      upsertPlanWeek: (week, reason) =>
        set((s) => {
          const clean = sanitizePlanWeek(week)
          if (!clean) return {}
          const plan: TrainingPlan = s.trainingPlan ?? { weeks: [] }
          const next = keepSessionIdentity(plan, clean)
          const weeks = plan.weeks.some((w) => w.weekStart === clean.weekStart)
            ? plan.weeks.map((w) => (w.weekStart === clean.weekStart ? next : w))
            : [...plan.weeks, next]
          return {
            planHistory: pushSnapshot(
              s.planHistory,
              s.trainingPlan,
              reason ?? `עודכן השבוע של ${clean.weekStart}`,
            ),
            trainingPlan: { ...plan, weeks },
          }
        }),
      // deliberately not snapshotted into planHistory: the review is the
      // athlete's own text about a week that already happened, not a change to
      // what the plan prescribes, and restoring an older plan should not
      // silently revert it
      setWeekReview: (weekStart, review) =>
        set((s) => {
          if (!s.trainingPlan) return {}
          const text = review.trim()
          return {
            trainingPlan: {
              ...s.trainingPlan,
              weeks: s.trainingPlan.weeks.map((w) =>
                w.weekStart === weekStart
                  ? {
                      ...w,
                      review: text || undefined,
                      reviewedAt: text ? new Date().toISOString() : undefined,
                    }
                  : w,
              ),
            },
          }
        }),

      // the restore is itself an edit, so it goes on the stack too — undoing an
      // undo has to be possible, or "restore" becomes its own trap
      restorePlanSnapshot: (id) => {
        let ok = false
        set((s) => {
          const snap = s.planHistory.find((h) => h.id === id)
          if (!snap) return {}
          ok = true
          return {
            planHistory: pushSnapshot(
              s.planHistory,
              s.trainingPlan,
              'שוחזרה גרסה קודמת',
            ),
            trainingPlan: snap.plan,
          }
        })
        return ok
      },
      syncPlanWeekWithBoard: (weekStart) =>
        set((s) => {
          const inWeek = weekSlice(s.planned, weekStart)
          const plan: TrainingPlan = s.trainingPlan ?? { weeks: [] }
          const existing = plan.weeks.find((w) => w.weekStart === weekStart)
          if (!existing && inWeek.length === 0) return {}
          // a workout scheduled into a week with no plan yet still needs a home,
          // otherwise it can never show up on the "today" tile
          const week: PlanWeek = existing ?? { id: uid(), weekStart, sessions: [] }

          const { sessions, links } = reconcilePlanWeek(week, inWeek, uid)
          const unchanged =
            existing != null &&
            links.length === 0 &&
            sessions.length === existing.sessions.length &&
            sessions.every((x, i) => x === existing.sessions[i])
          if (unchanged) return {} // don't churn state when nothing moved

          const nextWeek = { ...week, sessions }
          const weeks = existing
            ? plan.weeks.map((w) => (w.weekStart === weekStart ? nextWeek : w))
            : [...plan.weeks, nextWeek]

          const linkById = new Map(links.map((l) => [l.id, l.planSessionId]))
          return {
            trainingPlan: { ...plan, weeks },
            ...(linkById.size
              ? {
                  planned: s.planned.map((p) =>
                    linkById.has(p.id)
                      ? { ...p, planSessionId: linkById.get(p.id) }
                      : p,
                  ),
                }
              : {}),
          }
        }),
      syncBoardWithPlanWeek: (weekStart) =>
        set((s) => {
          const week = s.trainingPlan?.weeks.find((w) => w.weekStart === weekStart)
          if (!week) return {}
          const inWeek = weekSlice(s.planned, weekStart)
          const { updates, creates, orphans } = boardWorkoutsForPlan(week, inWeek)

          // only unschedule what the plan itself put there — an ad-hoc workout
          // the user added by hand is theirs to keep
          const drop = new Set(
            orphans.filter((id) => inWeek.some((p) => p.id === id && p.planSessionId)),
          )
          if (!updates.length && !creates.length && !drop.size) return {}

          const patchById = new Map(updates.map((u) => [u.id, u.patch]))
          const planned = s.planned
            .filter((p) => !drop.has(p.id))
            .map((p) => (patchById.has(p.id) ? { ...p, ...patchById.get(p.id) } : p))
          for (const c of creates) planned.push({ ...c, id: uid() })

          const orphanEvents = s.planned
            .filter((p) => drop.has(p.id) && p.syncedEventId)
            .map((p) => p.syncedEventId as string)

          return {
            planned,
            pendingCalendarDeletes: [...s.pendingCalendarDeletes, ...orphanEvents],
          }
        }),
      clearPendingCalendarDeletes: (eventIds) =>
        set((s) => {
          const done = new Set(eventIds)
          return {
            pendingCalendarDeletes: s.pendingCalendarDeletes.filter(
              (id) => !done.has(id),
            ),
          }
        }),
      clearPlan: () =>
        set((s) => ({
          planHistory: pushSnapshot(s.planHistory, s.trainingPlan, 'התוכנית נמחקה'),
          trainingPlan: null,
        })),
      addChatMessage: (role, text) =>
        set((s) => ({
          coachMessages: [...s.coachMessages, { id: uid(), role, text }],
        })),
      clearCoachChat: () => set({ coachMessages: [] }),

      addMemory: (text) =>
        set((s) => {
          const t = text.trim()
          if (!t) return {}
          // avoid exact-duplicate facts
          if (s.coachMemory.some((m) => m.text === t)) return {}
          return {
            coachMemory: [
              ...s.coachMemory,
              { id: uid(), text: t, createdAt: new Date().toISOString() },
            ],
          }
        }),
      removeMemory: (id) =>
        set((s) => ({ coachMemory: s.coachMemory.filter((m) => m.id !== id) })),
      dismissNudge: (id) =>
        set((st) => ({
          dismissedNudges: { ...st.dismissedNudges, [id]: toISODate(new Date()) },
        })),
      setPlanProposals: (proposals) => set({ planProposals: proposals }),
      addPlanProposal: (proposal) =>
        set((s) => ({
          planProposals: [
            ...s.planProposals.filter((p) => p.weekStart !== proposal.weekStart),
            { ...proposal, id: uid() },
          ],
        })),
      removePlanProposal: (id) =>
        set((s) => ({ planProposals: s.planProposals.filter((p) => p.id !== id) })),
      clearPlanProposals: () => set({ planProposals: [] }),

      setCalendarQuery: (q) => set({ calendarQuery: q }),
      setCalendarBusy: (events) => set({ calendarBusy: events }),

      setGarminSettings: (patch) =>
        set((s) => ({ garminSettings: { ...s.garminSettings, ...patch } })),
      setGarminSyncStatus: (patch) =>
        set((s) => ({ garminSyncStatus: { ...s.garminSyncStatus, ...patch } })),
      setHomeLayout: (homeLayout) => set({ homeLayout }),
      setDailyHealthLayout: (dailyHealthLayout) => set({ dailyHealthLayout }),

      setGarminDaily: (days) =>
        set((s) => {
          const byDate = new Map<string, DailyHealth>()
          for (const d of s.garminDaily) byDate.set(d.date, d)
          for (const d of days) byDate.set(d.date, d)
          return {
            garminDaily: [...byDate.values()].sort((a, b) =>
              a.date.localeCompare(b.date),
            ),
          }
        }),
      upsertGarminEntries: (creates, updates, removes = []) =>
        set((s) => {
          const patchById = new Map(updates.map((u) => [u.id, u.patch]))
          const dropped = new Set(removes)
          const log = s.log
            .filter((e) => !dropped.has(e.id))
            .map((e) => (patchById.has(e.id) ? { ...e, ...patchById.get(e.id) } : e))
          for (const c of creates) log.push({ ...c, id: uid() })
          return { log }
        }),
    }),
    {
      name: 'training-app-v1',
      version: 6,
      migrate: (state) => {
        const prev = (state ?? {}) as { trainingPlan?: unknown }
        return {
          garminSettings: { connected: false },
          garminSyncStatus: { state: 'idle' },
          garminDaily: [],
          pendingCalendarDeletes: [], // added in v2
          dismissedNudges: {}, // added in v4
          planHistory: [], // added in v5
          gear: [], // added in v6
          ...(prev as object),
          // v3: a plan saved before the coach's input was validated can hold a
          // week with no weekStart, which throws while rendering the program
          // page. Repair it on load so a bad save heals itself.
          trainingPlan: sanitizePlan(prev.trainingPlan),
        }
      },
    },
  ),
)
