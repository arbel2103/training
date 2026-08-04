interface Tab {
  id: string
  label: string
}

interface TabsProps {
  tabs: Tab[]
  active: string
  onChange: (id: string) => void
}

export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="inline-flex rounded-xl bg-ink/5 p-1 gap-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
            active === t.id
              ? 'bg-surface text-ink shadow-soft'
              : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
