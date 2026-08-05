import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Which mini-app is active in the shell. Extend this union to add more. */
export type AppId = 'tri' | 'finance'

/** A guide navigation intent: which app to show and which page within it. */
export interface GuideNav {
  app: AppId
  page: number
  /** bumped every step so identical {app,page} still re-triggers navigation */
  nonce: number
}

interface ShellState {
  appId: AppId
  setAppId: (id: AppId) => void
  /** the walkthrough lives at the shell level so it survives app switches */
  guideOpen: boolean
  openGuide: () => void
  closeGuide: () => void
  /** where the guide wants the shell to be right now */
  guideNav: GuideNav | null
  setGuideNav: (app: AppId, page: number) => void
}

let navNonce = 0

export const useAppShell = create<ShellState>()(
  persist(
    (set) => ({
      appId: 'tri',
      setAppId: (appId) => set({ appId }),
      guideOpen: false,
      openGuide: () => set({ guideOpen: true }),
      closeGuide: () => set({ guideOpen: false, guideNav: null }),
      guideNav: null,
      setGuideNav: (app, page) =>
        set({ appId: app, guideNav: { app, page, nonce: ++navNonce } }),
    }),
    {
      name: 'active-app',
      // only the active app is persisted; guide state is transient
      partialize: (s) => ({ appId: s.appId }),
    },
  ),
)
