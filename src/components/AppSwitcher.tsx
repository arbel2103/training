import { useState } from 'react'
import { useAppShell, type AppId } from '../lib/appShell'
import { useTapAway } from './ui/useTapAway'
import Icon, { type IconName } from './ui/Icon'

interface AppEntry {
  id: AppId
  name: string
  sub: string
  icon: IconName
}

const APPS: AppEntry[] = [
  { id: 'tri', name: 'TriLife', sub: 'טריאתלון ובריאות', icon: 'run' },
  { id: 'finance', name: 'פיננסים', sub: 'הוצאות והון', icon: 'wallet' },
]

/** The header title, turned into a dropdown that switches between the apps. */
export default function AppSwitcher() {
  const appId = useAppShell((s) => s.appId)
  const setAppId = useAppShell((s) => s.setAppId)
  const [open, setOpen] = useState(false)
  useTapAway(open, () => setOpen(false))
  const active = APPS.find((a) => a.id === appId) ?? APPS[0]

  return (
    <div className="relative">
      <button
        data-guide="app-switcher"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="flex items-center gap-1.5 -ms-1 px-1 rounded-lg hover:bg-ink/5 transition"
        aria-label="החלף אפליקציה"
      >
        <span className="font-display text-2xl font-black leading-none tracking-tight">
          {active.name}
        </span>
        <Icon
          name="chevronDown"
          className={`w-4 h-4 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        /* opaque, not the translucent .card — the menu sits over busy content
           and the app names have to stay readable */
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute top-full mt-2 start-0 z-50 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-pop ring-1 ring-ink/5"
        >
          {APPS.map((a) => {
            const on = a.id === appId
            return (
              <button
                key={a.id}
                onClick={() => {
                  setAppId(a.id)
                  setOpen(false)
                }}
                className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-start transition ${
                  on ? 'bg-accent text-white' : 'hover:bg-ink/10'
                }`}
              >
                <Icon name={a.icon} className="w-5 h-5 shrink-0" />
                <span className="min-w-0">
                  <span className="font-semibold block leading-tight">{a.name}</span>
                  <span className={`text-xs ${on ? 'text-white/75' : 'text-muted'}`}>
                    {a.sub}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
