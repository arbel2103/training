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
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      strengthCategories: [],
      aerobicTargets: { run: [], bike: [], swim: [] },
      log: [],
      planned: [],

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
    }),
    { name: 'training-app-v1' },
  ),
)
