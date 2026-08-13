import { useAppShell, type AppId } from '../lib/appShell'

const NAMES: Record<AppId, string> = {
  tri: 'TriLife',
  habits: 'הרגלים',
  finance: 'פיננסים',
}

/**
 * The app name shown in each header. Switching apps now lives in the thin bar
 * across the very top (AppTabs), so this is just a static title — no dropdown.
 */
export default function AppSwitcher() {
  const appId = useAppShell((s) => s.appId)
  return (
    <span
      data-guide="app-switcher"
      className="font-display text-2xl font-black leading-none tracking-tight"
    >
      {NAMES[appId] ?? NAMES.tri}
    </span>
  )
}
