import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/expenses', label: 'מעקב הוצאות', icon: '💳' },
  { to: '/capital', label: 'הון והשקעות', icon: '📈' },
]

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* סרגל צד (דסקטופ) */}
      <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-l border-line bg-surface/70 backdrop-blur px-4 py-6 gap-1">
        <div className="px-2 mb-6">
          <div className="text-lg font-semibold text-ink">מעקב פיננסי</div>
          <div className="text-xs text-muted">ניהול חכם של הכסף שלך</div>
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent-soft text-accent'
                  : 'text-muted hover:bg-ink/5 hover:text-ink'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <div className="mt-auto px-2 pt-6 text-[11px] leading-relaxed text-muted">
          הנתונים נשמרים מקומית בדפדפן שלך בלבד.
        </div>
      </aside>

      {/* ניווט עליון (מובייל) */}
      <nav className="md:hidden sticky top-0 z-30 flex items-center gap-1 border-b border-line bg-surface/90 backdrop-blur px-3 py-2">
        <span className="font-semibold text-ink me-2">מעקב פיננסי</span>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium ${
                isActive ? 'bg-accent-soft text-accent' : 'text-muted'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}
