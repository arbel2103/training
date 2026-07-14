import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  calendarQuery: string

  // strength categories
  addCategory: (name: string) => void
  renameCategory: (id: ID, name: string) => void
  removeCategory: (id: ID) => void

  // exercises
  addExercise: (categoryId: ID) => void
  updateExercise: (categoryId: ID, exerciseId: ID, patch: Partial<Exercise>) => void
  removeExercise: (categoryId: ID, exerciseId: ID) => void

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

  // calendar
  setCalendarQuery: (q: string) => void
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
      calendarQuery: 'אלבטרוס',

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
      removeExercise: (categoryId, exerciseId) =>
        set((s) => ({
          strengthCategories: s.strengthCategories.map((c) =>
            c.id === categoryId
              ? { ...c, exercises: c.exercises.filter((ex) => ex.id !== exerciseId) }
              : c,
          ),
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

      setCalendarQuery: (q) => set({ calendarQuery: q }),
    }),
    { name: 'training-app-v1' },
  ),
)
