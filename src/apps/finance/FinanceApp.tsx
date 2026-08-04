import { useState } from 'react'
import { ExpensesPage } from './pages/ExpensesPage'
import { CapitalPage } from './pages/CapitalPage'
import AppSwitcher from '../../components/AppSwitcher'
import SyncModal from '../../components/SyncModal'
import ErrorBoundary from '../../components/ErrorBoundary'
import Icon, { type IconName } from '../../components/ui/Icon'
import { getTheme, toggleTheme, type Theme } from '../../lib/theme'

const TABS: { id: 'expenses' | 'capital'; label: string; short: string; icon: IconName }[] = [
  { id: 'expenses', label: 'מעקב הוצאות', short: 'הוצאות', icon: 'wallet' },
  { id: 'capital', label: 'הון והשקעות', short: 'הון', icon: 'coins' },
]

export default function FinanceApp() {
  const [tab, setTab] = useState<'expenses' | 'capital'>('expenses')
  const [syncOpen, setSyncOpen] = useState(false)
  const [theme, setTheme] = useState<Theme>(() => getTheme())

  return (
    <div className="flex flex-col h-[100dvh]">
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur border-b border-line">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-14 md:h-16 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <AppSwitcher />
            <span className="hidden md:block h-6 w-px bg-line" />
          </div>
          <nav className="hidden md:flex flex-1 gap-2 min-w-0">
            {TABS.map((t) => {
              const active = t.id === tab
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 font-semibold text-base transition ${
                    active ? 'bg-ink text-bg shadow-card' : 'text-muted hover:text-ink hover:bg-ink/5'
                  }`}
                >
                  <Icon name={t.icon} className="w-5 h-5" />
                  <span>{t.label}</span>
                </button>
              )
            })}
          </nav>
          <div className="flex-1 md:hidden" />
          <button
            onClick={() => setTheme(toggleTheme())}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition"
            aria-label={theme === 'dark' ? 'מצב בהיר' : 'מצב כהה'}
          >
            {theme === 'dark' ? <Icon name="sun" className="w-5 h-5" /> : <Icon name="moon" className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSyncOpen(true)}
            className="shrink-0 w-8 h-8 sm:w-9 sm:h-9 grid place-items-center rounded-xl text-muted hover:text-ink hover:bg-ink/5 transition"
            aria-label="גיבוי וסנכרון"
          >
            <Icon name="cloud" className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="px-4 sm:px-6 md:px-10 py-6 max-w-6xl mx-auto">
          <ErrorBoundary>{tab === 'expenses' ? <ExpensesPage /> : <CapitalPage />}</ErrorBoundary>
        </div>
      </div>

      <nav
        className="md:hidden bg-surface/95 backdrop-blur border-t border-line"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex">
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 text-[11px] font-semibold transition ${
                  active ? 'text-accent' : 'text-muted'
                }`}
              >
                <span className={`px-4 py-1 rounded-full transition ${active ? 'bg-accent-soft' : ''}`}>
                  <Icon name={t.icon} className="w-6 h-6" />
                </span>
                <span>{t.short}</span>
              </button>
            )
          })}
        </div>
      </nav>

      <SyncModal open={syncOpen} onClose={() => setSyncOpen(false)} />
    </div>
  )
}
