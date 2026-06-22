import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'מעקב אימונים', icon: '📋', end: true },
  { to: '/program', label: 'תוכנית אימונים', icon: '🗂️' },
  { to: '/planning', label: 'תכנון האימונים', icon: '🗓️' },
]

export default function Sidebar() {
  return (
    <aside className="shrink-0 w-64 border-l border-line bg-surface/70 backdrop-blur px-5 py-7 flex flex-col gap-8 sticky top-0 h-screen">
      <div>
        <div className="font-display text-2xl font-black tracking-tight leading-none">
          מערכת
          <br />
          אימונים
        </div>
        <div className="mt-2 h-1 w-10 rounded-full bg-accent" />
      </div>

      <nav className="flex flex-col gap-1.5">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3.5 py-3 font-semibold transition ${
                isActive
                  ? 'bg-ink text-white shadow-card'
                  : 'text-muted hover:text-ink hover:bg-ink/5'
              }`
            }
          >
            <span className="text-lg">{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto text-xs text-muted leading-relaxed">
        הנתונים נשמרים מקומית בדפדפן.
      </div>
    </aside>
  )
}
