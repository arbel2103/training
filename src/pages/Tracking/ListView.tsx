import { useMemo, useState } from 'react'
import { useStore, type WorkoutEntry } from '../../store/useStore'
import { describeEntry } from '../../lib/describe'
import { formatFullDate } from '../../lib/dates'
import ActivityDetailModal from '../../components/garmin/ActivityDetailModal'

export default function ListView() {
  const log = useStore((s) => s.log)
  const removeEntry = useStore((s) => s.removeEntry)
  const [detail, setDetail] = useState<WorkoutEntry | null>(null)
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const groups = useMemo(() => {
    const match = (e: WorkoutEntry): boolean => {
      if (!q) return true
      const v = describeEntry(e)
      const hay = [v.title, ...v.details, e.note, e.date, e.strengthName, e.otherName]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return q.split(/\s+/).every((t) => hay.includes(t))
    }
    const byDate = new Map<string, WorkoutEntry[]>()
    for (const e of log) {
      if (!match(e)) continue
      const arr = byDate.get(e.date) ?? []
      arr.push(e)
      byDate.set(e.date, arr)
    }
    return [...byDate.entries()].sort((a, b) => b[0].localeCompare(a[0]))
  }, [log, q])

  if (log.length === 0) {
    return (
      <div className="card p-10 text-center text-muted">
        עדיין לא הוזנו אימונים. עבור לטאב <b>הזנה</b> כדי להתחיל.
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <input
        className="input"
        type="search"
        placeholder="🔍 חיפוש אימונים (ענף, תווית, הערה, תאריך…)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {groups.length === 0 && (
        <p className="text-sm text-muted text-center py-4">אין אימונים שתואמים לחיפוש.</p>
      )}
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
                    <div className="font-semibold flex items-center gap-1.5" style={{ color: v.color }}>
                      {v.title}
                      {e.source === 'garmin' && (
                        <span title="נמשך מגרמין" className="text-xs">⌚</span>
                      )}
                    </div>
                    <div className="text-sm text-muted">{v.details.join(' · ')}</div>
                  </div>
                  {e.garminActivityId != null && (
                    <button
                      onClick={() => setDetail(e)}
                      className="text-muted hover:text-accent px-1"
                      aria-label="פירוט"
                      title="פירוט אימון"
                    >
                      📊
                    </button>
                  )}
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
      <ActivityDetailModal entry={detail} onClose={() => setDetail(null)} />
    </div>
  )
}
