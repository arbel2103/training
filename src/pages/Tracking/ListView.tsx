import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { describeEntry } from '../../lib/describe'
import { formatFullDate } from '../../lib/dates'

export default function ListView() {
  const log = useStore((s) => s.log)
  const removeEntry = useStore((s) => s.removeEntry)

  const groups = useMemo(() => {
    const byDate = new Map<string, typeof log>()
    for (const e of log) {
      const arr = byDate.get(e.date) ?? []
      arr.push(e)
      byDate.set(e.date, arr)
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [log])

  if (log.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        עדיין לא הוזנו אימונים. עבור לטאב <b>הזנה</b> כדי להתחיל.
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {groups.map(([date, entries]) => (
        <div key={date}>
          <h3 className="font-semibold text-muted mb-2">{formatFullDate(date)}</h3>
          <div className="grid gap-2">
            {entries.map((e) => {
              const v = describeEntry(e)
              return (
                <div key={e.id} className="card p-3.5 flex items-center gap-3">
                  <span
                    className="w-9 h-9 rounded-xl grid place-items-center text-lg"
                    style={{ background: 'rgb(var(--accent-soft))' }}
                  >
                    {v.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold" style={{ color: v.color }}>
                      {v.title}
                    </div>
                    <div className="text-sm text-muted">{v.details.join(' · ')}</div>
                  </div>
                  <button
                    onClick={() => removeEntry(e.id)}
                    className="text-muted hover:text-accent px-1"
                    aria-label="מחק"
                  >
                    🗑
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
