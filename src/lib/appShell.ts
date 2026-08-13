import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Which mini-app is active in the shell. Extend this union to add more. */
export type AppId = 'tri' | 'habits' | 'finance'

const APP_IDS: AppId[] = ['tri', 'habits', 'finance']

/** Page indices within the training app, matching the PAGES order in App.tsx. */
export const TRI_PAGE = {
  home: 0,
  program: 1,
  planning: 2,
  health: 3,
} as const

/** A guide navigation intent: which app to show and which page within it. */
export interface GuideNav {
  app: AppId
  page: number
  /** bumped every step so identical {app,page} still re-triggers navigation */
  nonce: number
}

/** A direct navigation intent (e.g. a shortcut), optionally to a sub-tab. */
export interface AppNav {
  app: AppId
  page: number
  /** sub-tab key within the target page, if any */
  tab?: string
  /** bumped every time so an identical target still re-triggers navigation */
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
  /** a shortcut navigation request (page + optional sub-tab) */
  appNav: AppNav | null
  navigateTo: (app: AppId, page: number, tab?: string) => void
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
      appNav: null,
      navigateTo: (app, page, tab) =>
        set({ appId: app, appNav: { app, page, tab, nonce: ++navNonce } }),
    }),
    {
      name: 'active-app',
      // only the active app is persisted; guide state is transient
      partialize: (s) => ({ appId: s.appId }),
      // a device left on an app that no longer exists must not come back to a
      // blank shell — fall back to TriLife
      merge: (persisted, current) => {
        const saved = (persisted as { appId?: string } | undefined)?.appId
        const appId = APP_IDS.includes(saved as AppId) ? (saved as AppId) : 'tri'
        return { ...current, appId }
      },
    },
  ),
)
