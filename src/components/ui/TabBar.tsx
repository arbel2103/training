interface Tab<T> {
  value: T
  label: string
}

interface TabBarProps<T extends string> {
  tabs: Tab<T>[]
  value: T
  onChange: (v: T) => void
  variant?: 'underline' | 'pill'
}

export default function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  variant = 'underline',
}: TabBarProps<T>) {
  if (variant === 'pill') {
    return (
      <div className="inline-flex gap-1 p-1 rounded-xl bg-ink/5">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-4 py-1.5 rounded-lg font-semibold transition ${
              t.value === value
                ? 'bg-surface text-ink shadow-card'
                : 'text-muted hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-6 border-b border-line">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`relative -mb-px pb-3 font-semibold transition ${
            t.value === value ? 'text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {t.label}
          {t.value === value && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent rounded-full" />
          )}
        </button>
      ))}
    </div>
  )
}
