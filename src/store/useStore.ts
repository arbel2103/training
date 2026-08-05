import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DailyHealth } from '../lib/garmin/types'

export type ID = string

export const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/* ---------------- Program: Strength ---------------- */
export interface Exercise {
  id: ID
  name: string
  sets: number
  reps: number[] // length === sets, e.g. [10, 10, 12]
  weight: string
  updatedAt: string // ISO
}
export interface StrengthCategory {
  id: ID
  name: string
  exercises: Exercise[]
}

/* ---------------- Program: Aerobic ---------------- */
export type HomeTileId = 'race' | 'lastNight' | 'today' | 'week'
export interface HomeLayout {
  order: HomeTileId[]
  hidden: HomeTileId[]
}
export const DEFAULT_HOME_LAYOUT: HomeLayout = {
  order: ['race', 'lastNight', 'today', 'week'],
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
  // Garmin-sourced metrics (optional; present when source === 'garmin')
  source?: 'manual' | 'garmin'
  garminActivityId?: number
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
}
export interface PlanWeek {
  id: ID
  weekStart: string // yyyy-mm-dd (Sunday)
  label?: string
  focus?: string
  sessions: PlanSession[]
}
export interface TrainingPlan {
  raceName?: string
  raceDate?: string
  weeks: PlanWeek[]
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
  trainingPlan: TrainingPlan | null
  coachMessages: ChatMessage[]
  coachMemory: CoachMemory[]
  planProposals: PlanProposal[]
  calendarQuery: string
  calendarBusy: CalendarBusy[]
  garminSettings: GarminSettings
  garminSyncStatus: GarminSyncStatus
  garminDaily: DailyHealth[]

  // home dashboard layout (tile order + hidden tiles)
  homeLayout: HomeLayout
  setHomeLayout: (layout: HomeLayout) => void

  // strength categories
  addCategory: (name: string) => void
  renameCategory: (id: ID, name: string) => void
  removeCategory: (id: ID) => void

  // exercises
  addExercise: (categoryId: ID) => void
  updateExercise: (categoryId: ID, exerciseId: ID, patch: Partial<Exercise>) => void
  removeExercise: (categoryId: ID, exerciseId: ID) => void
  moveExercise: (categoryId: ID, exerciseId: ID, dir: -1 | 1) => void

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
  addCheckup: (c: Omit<Checkup, 'id'>) => void
  updateCheckup: (id: ID, patch: Partial<Checkup>) => void
  removeCheckup: (id: ID) => void

  // AI coach
  updateCoachProfile: (patch: Partial<CoachProfile>) => void
  setTrainingPlan: (plan: TrainingPlan) => void
  upsertPlanWeek: (week: PlanWeek) => void
  clearPlan: () => void
  addChatMessage: (role: 'user' | 'assistant', text: string) => void
  clearCoachChat: () => void

  // coach memory / brief / plan proposals
  addMemory: (text: string) => void
  removeMemory: (id: ID) => void
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
  ) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      strengthCategories: [],
      aerobicTargets: { run: [], bike: [], swim: [] },
      log: [],
      planned: [],
      weighIns: [],
      checkups: [],
      coachProfile: null,
      trainingPlan: null,
      coachMessages: [],
      coachMemory: [],
      planProposals: [],
      calendarQuery: 'אלבטרוס',
      calendarBusy: [],
      garminSettings: { connected: false },
      garminSyncStatus: { state: 'idle' },
      homeLayout: DEFAULT_HOME_LAYOUT,
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
          planned: s.planned.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePlanned: (id) =>
        set((s) => ({ planned: s.planned.filter((p) => p.id !== id) })),

      addWeighIn: (date, weight) =>
        set((s) => ({ weighIns: [...s.weighIns, { id: uid(), date, weight }] })),
      removeWeighIn: (id) =>
        set((s) => ({ weighIns: s.weighIns.filter((w) => w.id !== id) })),

      addCheckup: (c) =>
        set((s) => ({ checkups: [...s.checkups, { ...c, id: uid() }] })),
      updateCheckup: (id, patch) =>
        set((s) => ({
          checkups: s.checkups.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeCheckup: (id) =>
        set((s) => ({ checkups: s.checkups.filter((c) => c.id !== id) })),

      updateCoachProfile: (patch) =>
        set((s) => ({ coachProfile: { ...(s.coachProfile ?? {}), ...patch } })),
      setTrainingPlan: (plan) => set({ trainingPlan: plan }),
      upsertPlanWeek: (week) =>
        set((s) => {
          const plan: TrainingPlan = s.trainingPlan ?? { weeks: [] }
          const weeks = plan.weeks.some((w) => w.weekStart === week.weekStart)
            ? plan.weeks.map((w) => (w.weekStart === week.weekStart ? week : w))
            : [...plan.weeks, week]
          return { trainingPlan: { ...plan, weeks } }
        }),
      clearPlan: () => set({ trainingPlan: null }),
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
      upsertGarminEntries: (creates, updates) =>
        set((s) => {
          const patchById = new Map(updates.map((u) => [u.id, u.patch]))
          const log = s.log.map((e) =>
            patchById.has(e.id) ? { ...e, ...patchById.get(e.id) } : e,
          )
          for (const c of creates) log.push({ ...c, id: uid() })
          return { log }
        }),
    }),
    {
      name: 'training-app-v1',
      version: 1,
      migrate: (state) => ({
        garminSettings: { connected: false },
        garminSyncStatus: { state: 'idle' },
        garminDaily: [],
        ...(state as object),
      }),
    },
  ),
)
