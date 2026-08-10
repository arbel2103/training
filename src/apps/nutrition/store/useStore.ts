import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Food,
  MealEntry,
  MealSlot,
  NutritionProfile,
  Nutrients,
  PortionUnit,
} from '../lib/types'

function uid(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

interface State {
  meals: MealEntry[]
  /** foods the user added by hand or via an AI estimate */
  customFoods: Food[]
  profile: NutritionProfile
  /** yyyy-mm-dd currently being viewed/logged */
  selectedDate: string

  setSelectedDate: (d: string) => void

  addMeal: (m: {
    date: string
    slot: MealSlot
    foodId: string
    foodName: string
    qty: number
    unit: PortionUnit
    grams: number
    nutrients: Nutrients
    estimated?: boolean
    describedAs?: string
  }) => void
  updateMeal: (id: string, patch: Partial<MealEntry>) => void
  removeMeal: (id: string) => void

  addCustomFood: (food: Omit<Food, 'id' | 'custom'>) => Food
  removeCustomFood: (id: string) => void

  setProfile: (patch: Partial<NutritionProfile>) => void
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      meals: [],
      customFoods: [],
      profile: {},
      selectedDate: new Date().toISOString().slice(0, 10),

      setSelectedDate: (selectedDate) => set({ selectedDate }),

      addMeal: (m) =>
        set((s) => ({ meals: [...s.meals, { id: uid('meal'), ...m }] })),

      updateMeal: (id, patch) =>
        set((s) => ({
          meals: s.meals.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),

      removeMeal: (id) =>
        set((s) => ({ meals: s.meals.filter((m) => m.id !== id) })),

      addCustomFood: (food) => {
        const created: Food = { ...food, id: uid('food'), custom: true }
        set((s) => ({ customFoods: [...s.customFoods, created] }))
        return created
      },

      removeCustomFood: (id) =>
        set((s) => ({ customFoods: s.customFoods.filter((f) => f.id !== id) })),

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
    }),
    { name: 'nutrition-store', version: 1 },
  ),
)
