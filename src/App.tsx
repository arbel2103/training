import { useRef, useState } from 'react'
import HomePage from './pages/Home/HomePage'
import TrackingPage from './pages/Tracking/TrackingPage'
import ProgramPage from './pages/Program/ProgramPage'
import PlanningPage from './pages/Planning/PlanningPage'
import HealthPage from './pages/Health/HealthPage'
import CoachFab from './components/CoachFab'
import SyncModal from './components/SyncModal'
import { getTheme, toggleTheme, type Theme } from './lib/theme'

const PAGES = [
  { key: 'home', icon: '🏠', label: 'היום', short: 'היום', el: <HomePage /> },
  { key: 'tracking', icon: '📋', label: 'מעקב אימונים', short: 'מעקב', el: <TrackingPage /> },
  { key: 'program', icon: '🗂️', label: 'תוכנית אימונים', short: 'תוכנית', el: <ProgramPage /> },
  { key: 'planning', icon: '🗓️', label: 'תכנון האימונים', short: 'תכנון', el: <PlanningPage /> },
  { key: 'health', icon: '🩺', label: 'מעקב בריאות', short: 'בריאות', el: <HealthPage /> },
]

export default function App() {
  const [index, setIndex] = useState(0)
  const [syncOpen, setSyncOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => getTheme())
  const scrollerRef = useRef<HTMLDivElement>(null)

  // derive the active page from the horizontal scroll position
  // (Math.abs handles RTL, where scrollLeft is negative)
  const onScroll = () => {
    const el = scrollerRef.current
    if (!el || el.clientWidth === 0) return
    const i = Math.round(Math.abs(el.scrollLeft) / el.clientWidth)
    setIndex(Math.min(PAGES.length - 1, Math.max(0, i)))
  }

  const goTo = (i: number) => {
    const panel = scrollerRef.current?.children[i] as HTMLElement | undefined
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    setIndex(i)
  }

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-display text-2xl font-black leading-none tracking-tight">
              fitness
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
                  onClick={() => goTo(i)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-base transition ${
                    active
                      ? 'bg-ink text-white shadow-card'
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
            onClick={() => setTheme(toggleTheme())}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-lg text-muted hover:text-ink hover:bg-ink/5 transition"
            title={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
            aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
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
          <section
            key={p.key}
            className="min-w-full h-full overflow-y-auto snap-start no-scrollbar"
          >
            <div className="px-4 sm:px-6 md:px-10 py-6 max-w-6xl mx-auto">
              {p.el}
            </div>
          </section>
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
                onClick={() => goTo(i)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1.5 text-[11px] font-semibold transition ${
                  active ? 'text-accent' : 'text-muted'
                }`}
                aria-label={p.label}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={`text-xl leading-none transition-transform ${
                    active ? '-translate-y-0.5 scale-110' : ''
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
    </div>
  )
}
