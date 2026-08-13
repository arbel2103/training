import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ID = string

export const uid = (): ID =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

/**
 * The habits mini-app's own persisted state, under its own localStorage key so
 * it never collides with TriLife's or the finance app's.
 *
 * Empty for now — the app's behaviour is still to be specified. It exists so
 * the shell, the backup and the app switcher already have something real to
 * point at, and so the first feature is an addition rather than a rewiring.
 */
interface State {
  /** bumped by hand whenever the shape below changes in a breaking way */
  ready: boolean
}

export const useStore = create<State>()(
  persist<State>(() => ({ ready: true }), {
    name: 'habits-store',
    version: 1,
  }),
)

// zustand's persist writes lazily — only on the first state change — so a brand
// new install would have no `habits-store` key for the backup to pick up until
// the user did something. Nudge one write on load so the app is backed up from
// the start; harmless once real data exists.
if (typeof window !== 'undefined') {
  useStore.persist.rehydrate()
  useStore.setState((s) => ({ ...s }))
}
