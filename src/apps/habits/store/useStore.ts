import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toISODate } from '../../../lib/dates'
import type { Category, GlobalFreeze, Habit, ISODate } from '../lib/types'
import { openFreeze } from '../lib/habitMath'

export type ID = string

export const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

const today = (): ISODate => toISODate(new Date())

/** The categories a fresh install starts with, per the spec. */
function seedCategories(): Category[] {
  return [
    { id: uid(), name: 'שגרת בוקר', order: 0, collapsed: false },
    { id: uid(), name: 'שגרת ערב', order: 1, collapsed: false },
    { id: uid(), name: 'יומי', order: 2, collapsed: false },
  ]
}

interface State {
  categories: Category[]
  habits: Habit[]
  /** every global freeze ever; at most one is open (end: null) at a time */
  freezes: GlobalFreeze[]

  // categories
  addCategory: (name: string) => void
  renameCategory: (id: ID, name: string) => void
  removeCategory: (id: ID) => void
  toggleCategory: (id: ID) => void
  moveCategory: (id: ID, dir: -1 | 1) => void

  // habits
  addHabit: (categoryId: ID, name: string) => void
  updateHabit: (id: ID, patch: Partial<Omit<Habit, 'id'>>) => void
  removeHabit: (id: ID) => void
  moveHabit: (id: ID, dir: -1 | 1) => void

  // a day's status for one habit
  toggleCompletion: (habitId: ID, date: ISODate) => void
  toggleDayFreeze: (habitId: ID, date: ISODate) => void

  // global freeze
  startGlobalFreeze: () => void
  endGlobalFreeze: () => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      categories: seedCategories(),
      habits: [],
      freezes: [],

      addCategory: (name) =>
        set((s) => ({
          categories: [
            ...s.categories,
            {
              id: uid(),
              name: name.trim() || 'קטגוריה',
              order: s.categories.length,
              collapsed: false,
            },
          ],
        })),
      renameCategory: (id, name) =>
        set((s) => ({
          categories: s.categories.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          // a category taking its habits with it is the least surprising thing
          habits: s.habits.filter((h) => h.categoryId !== id),
        })),
      toggleCategory: (id) =>
        set((s) => ({
          categories: s.categories.map((c) =>
            c.id === id ? { ...c, collapsed: !c.collapsed } : c,
          ),
        })),
      moveCategory: (id, dir) =>
        set((s) => ({ categories: reorder(s.categories, id, dir) })),

      addHabit: (categoryId, name) =>
        set((s) => ({
          habits: [
            ...s.habits,
            {
              id: uid(),
              categoryId,
              name: name.trim() || 'הרגל',
              order: s.habits.filter((h) => h.categoryId === categoryId).length,
              createdDate: today(),
              completions: {},
              frozenDays: {},
            },
          ],
        })),
      updateHabit: (id, patch) =>
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, ...patch } : h)),
        })),
      removeHabit: (id) =>
        set((s) => ({ habits: s.habits.filter((h) => h.id !== id) })),
      moveHabit: (id, dir) =>
        set((s) => {
          const target = s.habits.find((h) => h.id === id)
          if (!target) return {}
          // reorder only within the habit's own category
          const siblings = s.habits.filter((h) => h.categoryId === target.categoryId)
          const others = s.habits.filter((h) => h.categoryId !== target.categoryId)
          return { habits: [...others, ...reorder(siblings, id, dir)] }
        }),

      toggleCompletion: (habitId, date) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== habitId) return h
            const completions = { ...h.completions }
            if (completions[date]) delete completions[date]
            else {
              completions[date] = true
              // ticking a day it was excused for is a contradiction — the tick wins
              if (h.frozenDays[date]) {
                const frozenDays = { ...h.frozenDays }
                delete frozenDays[date]
                return { ...h, completions, frozenDays }
              }
            }
            return { ...h, completions }
          }),
        })),
      toggleDayFreeze: (habitId, date) =>
        set((s) => ({
          habits: s.habits.map((h) => {
            if (h.id !== habitId) return h
            const frozenDays = { ...h.frozenDays }
            if (frozenDays[date]) delete frozenDays[date]
            else {
              frozenDays[date] = true
              // excusing a day drops any tick on it, so the two can't disagree
              if (h.completions[date]) {
                const completions = { ...h.completions }
                delete completions[date]
                return { ...h, frozenDays, completions }
              }
            }
            return { ...h, frozenDays }
          }),
        })),

      startGlobalFreeze: () =>
        set((s) => {
          if (openFreeze(s.freezes)) return {} // already frozen
          return { freezes: [...s.freezes, { start: today(), end: null }] }
        }),
      endGlobalFreeze: () =>
        set((s) => {
          const open = openFreeze(s.freezes)
          if (!open) return {}
          return {
            freezes: s.freezes.map((f) =>
              f === open ? { ...f, end: today() } : f,
            ),
          }
        }),
    }),
    {
      name: 'habits-store',
      version: 1,
    },
  ),
)

/** Swap an item with its neighbour and renumber `order` to match. */
function reorder<T extends { id: ID; order: number }>(
  list: T[],
  id: ID,
  dir: -1 | 1,
): T[] {
  const sorted = [...list].sort((a, b) => a.order - b.order)
  const i = sorted.findIndex((x) => x.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= sorted.length) return list
  ;[sorted[i], sorted[j]] = [sorted[j], sorted[i]]
  return sorted.map((x, idx) => ({ ...x, order: idx }))
}
