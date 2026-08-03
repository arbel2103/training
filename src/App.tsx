import { useCallback, useEffect, useRef, useState } from 'react'
import HomePage from './pages/Home/HomePage'
import ProgramPage from './pages/Program/ProgramPage'
import PlanningPage from './pages/Planning/PlanningPage'
import HealthPage from './pages/Health/HealthPage'
import CoachFab from './components/CoachFab'
import SyncModal from './components/SyncModal'
import GuideOverlay from './components/GuideOverlay'
import ErrorBoundary from './components/ErrorBoundary'
import PageSection from './components/PageSection'
import { getTheme, toggleTheme, type Theme } from './lib/theme'
import { useGarminRefreshOnMount } from './lib/garmin/useGarminData'
import { hasGarminSetup } from './lib/garmin/pat'
import { smartRefresh } from './lib/garmin/sync'

const GUIDE_SEEN_KEY = 'fitness-guide-seen'

const PAGES = [
  { key: 'home', icon: '🏠', label: 'היום', short: 'היום', el: <HomePage /> },
  { key: 'program', icon: '🗂️', label: 'תוכנית אימונים', short: 'תוכנית', el: <ProgramPage /> },
  { key: 'planning', icon: '🗓️', label: 'שיבוץ ליומן', short: 'יומן', el: <PlanningPage /> },
  { key: 'health', icon: '🩺', label: 'מעקב בריאות', short: 'בריאות', el: <HealthPage /> },
]

export default function App() {
  const [index, setIndex] = useState(0)
  const [syncOpen, setSyncOpen] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => getTheme())
  const scrollerRef = useRef<HTMLDivElement>(null)
  const indexRef = useRef(0)

  // pull fresh Garmin data from the private repo on load (throttled, no-op without setup)
  useGarminRefreshOnMount()

  // pull-to-refresh: read the latest committed data and, if it's stale, kick
  // off a real Garmin sync in the background (no-op if not set up)
  const refresh = useCallback(async () => {
    if (!hasGarminSetup()) return
    try {
      await smartRefresh()
    } catch {
      /* errors surface via garminSyncStatus */
    }
  }, [])

  // show the walkthrough automatically on the very first visit
  useEffect(() => {
    if (!localStorage.getItem(GUIDE_SEEN_KEY)) setGuideOpen(true)
  }, [])

  const closeGuide = () => {
    localStorage.setItem(GUIDE_SEEN_KEY, '1')
    setGuideOpen(false)
  }

  // derive the active page from the horizontal scroll position
  // (Math.abs handles RTL, where scrollLeft is negative)
  const onScroll = () => {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.min(PAGES.length - 1, Math.max(0, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)))
    indexRef.current = i
    setIndex(i)
  }

  // stable identity so GuideOverlay's navigation effect doesn't refire each render
  const goTo = useCallback((i: number) => {
    const panel = scrollerRef.current?.children[i] as HTMLElement | undefined
    // tapping the already-active page scrolls it back to the top
    if (i === indexRef.current && panel) {
      panel.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    indexRef.current = i
    setIndex(i)
  }, [])

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-display text-2xl font-black leading-none tracking-tight">
              fitness<span className="text-accent">.</span>
            </span>
            <span className="hidden md:block h-6 w-px bg-line" />
          </div>
          {/* top nav — desktop only; on phones navigation moves to the bottom bar */}
          <nav className="hidden md:flex flex-1 gap-2 min-w-0">
            {PAGES.map((p, i) => {
              const active = i === index
              return (
                <button
                  key={p.key}
                  data-guide={`nav-${p.key}`}
                  onClick={() => goTo(i)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-base transition ${
                    active
                      ? 'bg-ink text-bg shadow-card'
                      : 'text-muted hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="flex-1 md:hidden" />
          <button
            onClick={() => setGuideOpen(true)}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-lg text-muted hover:text-ink hover:bg-ink/5 transition"
            title="מדריך שימוש"
            aria-label="מדריך שימוש"
          >
            ❓
          </button>
          <button
            data-guide="theme"
            onClick={() => setTheme(toggleTheme())}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-lg text-muted hover:text-ink hover:bg-ink/5 transition"
            title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
            aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            data-guide="sync"
            onClick={() => setSyncOpen(true)}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-lg text-muted hover:text-ink hover:bg-ink/5 transition"
            title="גיבוי וסנכרון"
            aria-label="גיבוי וסנכרון"
          >
            ☁️
          </button>
        </div>
      </header>

      <div
        ref={scrollerRef}
        onScroll={onScroll}
        className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory no-scrollbar"
      >
        {PAGES.map((p) => (
          <PageSection key={p.key} onRefresh={refresh}>
            <ErrorBoundary>{p.el}</ErrorBoundary>
          </PageSection>
        ))}
      </div>

      {/* bottom tab bar — phones only, like a native app */}
      <nav
        className="md:hidden bg-surface/95 backdrop-blur border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {PAGES.map((p, i) => {
            const active = i === index
            return (
              <button
                key={p.key}
                data-guide={`nav-${p.key}`}
                onClick={() => goTo(i)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] font-semibold transition ${
                  active ? 'text-accent' : 'text-muted'
                }`}
                aria-label={p.label}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`text-xl leading-none px-4 py-1 rounded-full transition ${
                    active ? 'bg-accent-soft' : ''
                  }`}
                >
                  {p.icon}
                </span>
                <span>{p.short}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <CoachFab />
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
      <GuideOverlay open={guideOpen} onClose={closeGuide} onNavigate={goTo} />
    </div>
  )
}
