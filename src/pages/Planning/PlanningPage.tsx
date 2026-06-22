import { useMemo, useState } from 'react'
import { useStore, type PlannedWorkout } from '../../store/useStore'
import {
  addDays,
  formatDayMonth,
  HEB_DAYS_SHORT,
  startOfWeek,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { describePlanned } from '../../lib/describe'
import { compareToTargets } from '../../lib/analysis'
import {
  connect,
  findCalendarId,
  insertEvent,
  isConfigured,
  listEvents,
  TIME_ZONE,
  type GCalEvent,
} from '../../lib/googleCalendar'
import PageHeader from '../../components/ui/PageHeader'
import GoalFeedback from '../../components/GoalFeedback'
import Modal from '../../components/ui/Modal'
import PlanFormModal from './PlanFormModal'

const ALBATROSS_NAME = 'אלבטרוס'

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  const hh = Math.floor((total % 1440) / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function planToEvent(p: PlannedWorkout): GCalEvent {
  const v = describePlanned(p)
  const time = p.time || '18:00'
  const endTime = addMinutes(time, p.durationMin || 60)
  return {
    summary: `${v.icon} ${v.title}${v.details.length ? ' · ' + v.details.join(' · ') : ''}`,
    description: 'נוצר ממערכת האימונים',
    start: { dateTime: `${p.date}T${time}:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${p.date}T${endTime}:00`, timeZone: TIME_ZONE },
  }
}

export default function PlanningPage() {
  const planned = useStore((s) => s.planned)
  const targets = useStore((s) => s.aerobicTargets)
  const removePlanned = useStore((s) => s.removePlanned)
  const updatePlanned = useStore((s) => s.updatePlanned)

  const [weekRef, setWeekRef] = useState(() => new Date())
  const days = useMemo(() => weekDays(weekRef), [weekRef])
  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])

  const [formDate, setFormDate] = useState<string | null>(null)
  const [showCheck, setShowCheck] = useState(false)

  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calEvents, setCalEvents] = useState<Record<string, GCalEvent[]>>({})

  const weekPlanned = planned.filter((p) => p.date >= weekStart && p.date <= weekEnd)
  const checkResults = compareToTargets(weekPlanned, targets)

  async function loadCalendar() {
    setBusy('טוען יומן…')
    setError(null)
    try {
      await connect()
      setConnected(true)
      const calId = (await findCalendarId(ALBATROSS_NAME)) ?? 'primary'
      const events = await listEvents(
        calId,
        `${weekStart}T00:00:00Z`,
        `${weekEnd}T23:59:59Z`,
      )
      const byDay: Record<string, GCalEvent[]> = {}
      for (const ev of events) {
        const d = ev.start?.dateTime?.slice(0, 10) ?? ev.start?.date
        if (!d) continue
        ;(byDay[d] ??= []).push(ev)
      }
      setCalEvents(byDay)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  async function approve() {
    setBusy('מוסיף ליומן…')
    setError(null)
    try {
      await connect()
      setConnected(true)
      for (const p of weekPlanned.filter((p) => !p.syncedEventId)) {
        const created = await insertEvent('primary', planToEvent(p))
        if (created.id) updatePlanned(p.id, { syncedEventId: created.id })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  const eventTime = (ev: GCalEvent) =>
    ev.start?.dateTime ? ev.start.dateTime.slice(11, 16) : 'כל היום'

  return (
    <div>
      <PageHeader
        title="תכנון האימונים"
        subtitle="תכנון שבועי מול היומן, ושליחה ליומן האישי לאחר אישור."
        actions={
          <>
            <button onClick={() => setShowCheck(true)} className="btn-ghost">
              בדוק מול יעדים
            </button>
            <button
              onClick={approve}
              disabled={!!busy || weekPlanned.length === 0}
              className="btn-primary"
            >
              אשר ושלח ליומן
            </button>
          </>
        }
      />

      {/* connection / status bar */}
      <div className="card p-4 mb-5 flex flex-wrap items-center gap-3">
        {!isConfigured() ? (
          <div className="text-sm text-muted">
            🔌 כדי לחבר את היומן צריך להגדיר <b>Google OAuth Client ID</b> (ראה
            הוראות ב-README). שאר התכנון עובד גם בלי חיבור.
          </div>
        ) : (
          <>
            <button onClick={loadCalendar} disabled={!!busy} className="btn-soft">
              {connected ? '↻ רענן יומן' : '🔗 התחבר וטען יומן אלבטרוס'}
            </button>
            {busy && <span className="text-sm text-muted">{busy}</span>}
            {connected && !busy && (
              <span className="text-sm text-bike">מחובר ליומן ✓</span>
            )}
          </>
        )}
        {error && <span className="text-sm text-run">שגיאה: {error}</span>}
      </div>

      {/* week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekRef((d) => addDays(startOfWeek(d), -7))}
          className="btn-ghost"
        >
          ← שבוע קודם
        </button>
        <div className="text-center">
          <button
            onClick={() => setWeekRef(new Date())}
            className="font-semibold hover:text-accent"
          >
            השבוע הנוכחי
          </button>
          <div className="text-sm text-muted">
            {formatDayMonth(days[0])} – {formatDayMonth(days[6])}
          </div>
        </div>
        <button
          onClick={() => setWeekRef((d) => addDays(startOfWeek(d), 7))}
          className="btn-ghost"
        >
          שבוע הבא →
        </button>
      </div>

      {/* week grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
        {days.map((d, i) => {
          const iso = toISODate(d)
          const dayPlanned = weekPlanned.filter((p) => p.date === iso)
          const dayEvents = calEvents[iso] ?? []
          const isToday = iso === toISODate(new Date())
          return (
            <div
              key={iso}
              className={`card p-3 flex flex-col gap-2 min-h-[180px] ${
                isToday ? 'ring-2 ring-accent/30' : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{HEB_DAYS_SHORT[i]}</span>
                <span className="text-xs text-muted">{formatDayMonth(d)}</span>
              </div>

              {/* existing calendar events (read-only) */}
              {dayEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="text-xs rounded-lg bg-ink/5 text-muted px-2 py-1 truncate"
                  title={ev.summary}
                >
                  <span dir="ltr">{eventTime(ev)}</span> · {ev.summary}
                </div>
              ))}

              {/* planned workouts */}
              {dayPlanned.map((p) => {
                const v = describePlanned(p)
                return (
                  <div
                    key={p.id}
                    className="text-xs rounded-lg px-2 py-1.5 border"
                    style={{
                      borderColor: v.color,
                      background: 'rgb(var(--surface))',
                    }}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold" style={{ color: v.color }}>
                        {v.icon} {v.title}
                      </span>
                      <button
                        onClick={() => removePlanned(p.id)}
                        className="text-muted hover:text-accent leading-none"
                        aria-label="הסר"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-muted">{v.details.join(' · ')}</div>
                    {p.syncedEventId && (
                      <div className="text-bike mt-0.5">ביומן ✓</div>
                    )}
                  </div>
                )
              })}

              <button
                onClick={() => setFormDate(iso)}
                className="mt-auto text-sm text-accent hover:bg-accent-soft rounded-lg py-1.5 font-semibold"
              >
                + הוסף
              </button>
            </div>
          )
        })}
      </div>

      <PlanFormModal
        open={formDate !== null}
        date={formDate ?? toISODate(new Date())}
        onClose={() => setFormDate(null)}
      />

      <Modal
        open={showCheck}
        onClose={() => setShowCheck(false)}
        title="בדיקת התכנון מול היעדים"
      >
        <p className="text-sm text-muted mb-4">
          השוואת המרחקים המתוכננים לשבוע זה למול היעדים השבועיים.
        </p>
        <GoalFeedback results={checkResults} />
      </Modal>
    </div>
  )
}
