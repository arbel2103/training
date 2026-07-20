import { useEffect, useMemo, useState } from 'react'
import { useStore, type PlannedWorkout } from '../../store/useStore'
import {
  addDays,
  formatDayMonth,
  formatFullDate,
  HEB_DAYS_SHORT,
  startOfWeek,
  toISODate,
  weekDays,
} from '../../lib/dates'
import { describePlanned } from '../../lib/describe'
import { compareToTargets } from '../../lib/analysis'
import { targetsForWeek } from '../../lib/planMatch'
import {
  connect,
  insertEvent,
  isConfigured,
  listCalendars,
  listEvents,
  preloadGis,
  TIME_ZONE,
  type GCalEvent,
} from '../../lib/googleCalendar'
import PageHeader from '../../components/ui/PageHeader'
import GoalFeedback from '../../components/GoalFeedback'
import Modal from '../../components/ui/Modal'
import PlanFormModal from './PlanFormModal'

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
  const plan = useStore((s) => s.trainingPlan)
  const removePlanned = useStore((s) => s.removePlanned)
  const updatePlanned = useStore((s) => s.updatePlanned)
  const calendarQuery = useStore((s) => s.calendarQuery)
  const setCalendarQuery = useStore((s) => s.setCalendarQuery)

  const [weekRef, setWeekRef] = useState(() => new Date())
  const days = useMemo(() => weekDays(weekRef), [weekRef])
  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])

  const [formDate, setFormDate] = useState<string | null>(null)
  const [detailDate, setDetailDate] = useState<string | null>(null)
  const [showCheck, setShowCheck] = useState(false)

  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calEvents, setCalEvents] = useState<Record<string, GCalEvent[]>>({})

  const weekPlanned = planned.filter((p) => p.date >= weekStart && p.date <= weekEnd)
  const checkResults = compareToTargets(weekPlanned, targetsForWeek(plan, weekStart))

  // preload Google's script so the OAuth popup opens inside the click gesture
  useEffect(() => {
    if (isConfigured()) void preloadGis().catch(() => {})
  }, [])

  async function loadCalendar() {
    setBusy('טוען יומן…')
    setError(null)
    try {
      await connect()
      setConnected(true)
      const cals = await listCalendars()
      setAccount(cals.find((c) => c.primary)?.id ?? null)
      const q = calendarQuery.trim()
      const match = q
        ? cals.find((c) => (c.summary || '').includes(q))
        : cals.find((c) => c.primary)
      if (q && !match) {
        setCalEvents({})
        setError(
          `לא נמצא יומן שמכיל "${q}". היומנים הזמינים: ${cals
            .map((c) => c.summary)
            .filter(Boolean)
            .join(' · ')}`,
        )
        return
      }
      const calId = match?.id ?? 'primary'
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
        title="שיבוץ ליומן"
        subtitle="טוענים את שבוע התוכנית, קובעים שעות מול היומן, ושולחים ליומן האישי."
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
            <div>
              <label className="label">שם היומן לחיפוש</label>
              <input
                className="input w-48"
                value={calendarQuery}
                onChange={(e) => setCalendarQuery(e.target.value)}
                placeholder="למשל: אלבטרוס / עבודה / ספינה"
                title="שם היומן או מילת מפתח לחיפוש (נשמר)"
              />
            </div>
            <button
              onClick={loadCalendar}
              disabled={!!busy}
              className="btn-soft mb-px self-end"
            >
              {connected ? '↻ רענן יומן' : '🔗 התחבר וטען יומן'}
            </button>
            {busy && <span className="text-sm text-muted self-end mb-2">{busy}</span>}
            {connected && !busy && (
              <span className="text-sm text-bike self-end mb-2">מחובר ✓</span>
            )}
            {account && (
              <span
                className="chip text-sm self-end mb-1"
                title="חשבון Google המחובר"
              >
                👤 {account}
              </span>
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
              onClick={() => setDetailDate(iso)}
              title="לחץ להגדלה וצפייה בלו״ז המלא"
              className={`card p-3 flex flex-col gap-2 min-h-[180px] cursor-pointer transition hover:shadow-pop ${
                isToday ? 'ring-2 ring-accent/30' : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <span className="font-bold">{HEB_DAYS_SHORT[i]}</span>
                <span className="flex items-center gap-1 text-xs text-muted">
                  {formatDayMonth(d)}
                  <span className="opacity-50">⤢</span>
                </span>
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
                        onClick={(e) => {
                          e.stopPropagation()
                          removePlanned(p.id)
                        }}
                        className="text-muted hover:text-accent leading-none"
                        aria-label="הסר"
                      >
                        ×
                      </button>
                    </div>
                    <div className="text-muted">{v.details.join(' · ')}</div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <input
                        type="time"
                        value={p.time || '18:00'}
                        disabled={!!p.syncedEventId}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) =>
                          updatePlanned(p.id, { time: e.target.value })
                        }
                        className="bg-transparent border border-line rounded-md px-1 py-0.5 text-xs text-ink disabled:opacity-60"
                        title="שעת האימון ביומן"
                      />
                      {p.syncedEventId && <span className="text-bike">ביומן ✓</span>}
                    </div>
                  </div>
                )
              })}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setFormDate(iso)
                }}
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

      <Modal
        open={detailDate !== null}
        onClose={() => setDetailDate(null)}
        title={detailDate ? formatFullDate(detailDate) : ''}
        maxWidth="max-w-2xl"
      >
        {detailDate &&
          (() => {
            const evs = calEvents[detailDate] ?? []
            const pls = weekPlanned.filter((p) => p.date === detailDate)
            return (
              <div className="grid gap-6">
                <section>
                  <h4 className="font-semibold mb-2">🗓️ לו״ז היומן</h4>
                  {!connected ? (
                    <p className="text-sm text-muted">
                      התחבר וטען את היומן כדי לראות את הלו״ז.
                    </p>
                  ) : evs.length === 0 ? (
                    <p className="text-sm text-muted">אין אירועים ביומן ביום זה.</p>
                  ) : (
                    <div className="grid gap-2">
                      {evs.map((ev, idx) => (
                        <div key={idx} className="rounded-xl bg-ink/5 px-3 py-2">
                          <div className="text-sm font-semibold text-accent">
                            <span dir="ltr">{eventTime(ev)}</span>
                            {ev.end?.dateTime && (
                              <span dir="ltr">–{ev.end.dateTime.slice(11, 16)}</span>
                            )}
                          </div>
                          <div className="text-ink break-words">
                            {ev.summary || '(ללא כותרת)'}
                          </div>
                          {ev.description && (
                            <div className="text-sm text-muted mt-1 whitespace-pre-wrap break-words">
                              {ev.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">🏋️ אימונים מתוכננים</h4>
                    <button
                      onClick={() => {
                        const d = detailDate
                        setDetailDate(null)
                        setFormDate(d)
                      }}
                      className="btn-soft text-sm"
                    >
                      + הוסף אימון
                    </button>
                  </div>
                  {pls.length === 0 ? (
                    <p className="text-sm text-muted">לא תוכננו אימונים ליום זה.</p>
                  ) : (
                    <div className="grid gap-2">
                      {pls.map((p) => {
                        const v = describePlanned(p)
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2"
                            style={{ borderColor: v.color }}
                          >
                            <div className="min-w-0">
                              <span
                                className="font-semibold"
                                style={{ color: v.color }}
                              >
                                {v.icon} {v.title}
                              </span>
                              {v.details.length > 0 && (
                                <span className="text-sm text-muted">
                                  {' · '}
                                  {v.details.join(' · ')}
                                </span>
                              )}
                              {p.syncedEventId && (
                                <span className="text-bike text-sm"> · ביומן ✓</span>
                              )}
                            </div>
                            <button
                              onClick={() => removePlanned(p.id)}
                              className="text-muted hover:text-accent shrink-0"
                              aria-label="הסר"
                            >
                              ×
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>
            )
          })()}
      </Modal>
    </div>
  )
}
