import { useRef, useState } from 'react'
import TrackingPage from './pages/Tracking/TrackingPage'
import ProgramPage from './pages/Program/ProgramPage'
import PlanningPage from './pages/Planning/PlanningPage'

const PAGES = [
  { key: 'tracking', icon: '📋', label: 'מעקב אימונים', short: 'מעקב', el: <TrackingPage /> },
  { key: 'program', icon: '🗂️', label: 'תוכנית אימונים', short: 'תוכנית', el: <ProgramPage /> },
  { key: 'planning', icon: '🗓️', label: 'תכנון האימונים', short: 'תכנון', el: <PlanningPage /> },
]

export default function App() {
  const [index, setIndex] = useState(0)
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
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 shrink-0">
            <span className="font-display text-xl font-black leading-none">
              מערכת אימונים
            </span>
            <span className="h-6 w-px bg-line" />
          </div>
          <nav className="flex-1 flex gap-1.5 sm:gap-2">
            {PAGES.map((p, i) => {
              const active = i === index
              return (
                <button
                  key={p.key}
                  onClick={() => goTo(i)}
                  className={`flex-1 md:flex-none flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold transition ${
                    active
                      ? 'bg-ink text-white shadow-card'
                      : 'text-muted hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span className="sm:hidden">{p.short}</span>
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
              )
            })}
          </nav>
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
    </div>
  )
}
