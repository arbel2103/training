import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Which mini-app is active in the shell. Extend this union to add more. */
export type AppId = 'tri' | 'finance'

interface ShellState {
  appId: AppId
  setAppId: (id: AppId) => void
  /** cross-app request to open the walkthrough (lives in the TriLife app) */
  guideRequested: boolean
  requestGuide: () => void
  clearGuideRequest: () => void
}

export const useAppShell = create<ShellState>()(
  persist(
    (set) => ({
      appId: 'tri',
      setAppId: (appId) => set({ appId }),
      guideRequested: false,
      requestGuide: () => set({ guideRequested: true }),
      clearGuideRequest: () => set({ guideRequested: false }),
    }),
    {
      name: 'active-app',
      // guideRequested is a transient signal — never persist it
      partialize: (s) => ({ appId: s.appId }),
    },
  ),
)
