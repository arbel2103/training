import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Which mini-app is active in the shell. Extend this union to add more. */
export type AppId = 'tri' | 'finance'

interface ShellState {
  appId: AppId
  setAppId: (id: AppId) => void
}

export const useAppShell = create<ShellState>()(
  persist(
    (set) => ({
      appId: 'tri',
      setAppId: (appId) => set({ appId }),
    }),
    { name: 'active-app' },
  ),
)
