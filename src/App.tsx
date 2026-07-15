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
        <div className="max-w-6xl mx-auto px-2 sm:px-6 h-16 flex items-center gap-1.5 sm:gap-3">
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span className="font-display text-2xl font-black leading-none tracking-tight">
              fitness
            </span>
            <span className="h-6 w-px bg-line" />
          </div>
          <nav className="flex-1 flex gap-0.5 sm:gap-2 min-w-0">
            {PAGES.map((p, i) => {
              const active = i === index
              return (
                <button
                  key={p.key}
                  onClick={() => goTo(i)}
                  className={`flex-1 md:flex-none min-w-0 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 rounded-xl px-1 sm:px-3 py-1.5 sm:py-2 font-semibold transition ${
                    active
                      ? 'bg-ink text-white shadow-card'
                      : 'text-muted hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span className="sm:hidden text-[11px] leading-tight">{p.short}</span>
                  <span className="hidden sm:inline text-base">{p.label}</span>
                </button>
              )
            })}
          </nav>
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

      <CoachFab />
      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  )
}
