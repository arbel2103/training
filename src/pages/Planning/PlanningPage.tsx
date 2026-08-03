import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  useStore,
  type CalendarBusy,
  type PlanSession,
  type PlannedWorkout,
} from '../../store/useStore'
import { sportIcon, sportLabel } from '../../lib/labels'
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
import { conflictsFor } from '../../lib/scheduling'
import {
  connect,
  deleteEvent,
  insertEvent,
  isConfigured,
  listCalendars,
  listEvents,
  preloadGis,
  TIME_ZONE,
  updateEvent,
  type GCalEvent,
} from '../../lib/googleCalendar'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'
import PlanFormModal from './PlanFormModal'

const AUTO_CONNECT_KEY = 'calendar-auto-connect'

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  const hh = Math.floor((total % 1440) / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** A plan session as the fields a planned workout needs. */
function sessionToPlanned(s: PlanSession, date: string): Partial<PlannedWorkout> {
  const base = {
    date,
    time: '18:00',
    durationMin: s.durationMin || 60,
    planSessionId: s.id,
  }
  if (s.sport === 'strength')
    return { ...base, category: 'strength', strengthName: s.label || undefined }
  if (s.sport === 'other')
    return { ...base, category: 'other', otherName: s.label || 'אימון' }
  return { ...base, category: 'aerobic', sport: s.sport, distance: s.distance }
}

function sessionChip(s: PlanSession): { icon: string; text: string } {
  if (s.sport === 'strength')
    return { icon: '💪', text: s.label || 'כוח' }
  if (s.sport === 'other') return { icon: '✨', text: s.label || 'אימון' }
  return {
    icon: sportIcon[s.sport],
    text: s.distance ? `${sportLabel[s.sport]} ${s.distance}` : sportLabel[s.sport],
  }
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
  const removePlanned = useStore((s) => s.removePlanned)
  const updatePlanned = useStore((s) => s.updatePlanned)
  const calendarQuery = useStore((s) => s.calendarQuery)
  const setCalendarQuery = useStore((s) => s.setCalendarQuery)
  const calendarBusy = useStore((s) => s.calendarBusy)
  const setCalendarBusy = useStore((s) => s.setCalendarBusy)

  const [weekRef, setWeekRef] = useState(() => new Date())
  const days = useMemo(() => weekDays(weekRef), [weekRef])
  const weekStart = toISODate(days[0])
  const weekEnd = toISODate(days[6])
  const todayISO = toISODate(new Date())

  const [formDate, setFormDate] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlannedWorkout | null>(null)
  const [prefill, setPrefill] = useState<Partial<PlannedWorkout> | null>(null)
  const [detailDate, setDetailDate] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState(todayISO)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragSession, setDragSession] = useState<PlanSession | null>(null)

  const trainingPlan = useStore((s) => s.trainingPlan)
  const addPlanned = useStore((s) => s.addPlanned)

  // sessions the plan prescribes for this week that aren't on the board yet
  const unscheduled = useMemo(() => {
    const week = trainingPlan?.weeks.find((w) => w.weekStart === weekStart)
    if (!week) return []
    const taken = new Set(
      planned
        .filter((p) => p.date >= weekStart && p.date <= weekEnd && p.planSessionId)
        .map((p) => p.planSessionId),
    )
    return week.sessions.filter((s) => !taken.has(s.id))
  }, [trainingPlan, planned, weekStart, weekEnd])

  const [connected, setConnected] = useState(false)
  const [account, setAccount] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [calEvents, setCalEvents] = useState<Record<string, GCalEvent[]>>({})
  const [calendars, setCalendars] = useState<{ id: string; summary: string }[]>([])
  const [calendarMissing, setCalendarMissing] = useState(false)

  const weekPlanned = planned.filter((p) => p.date >= weekStart && p.date <= weekEnd)

  // keep the mobile day view inside the displayed week
  useEffect(() => {
    if (selectedDay < weekStart || selectedDay > weekEnd) {
      setSelectedDay(todayISO >= weekStart && todayISO <= weekEnd ? todayISO : weekStart)
    }
  }, [weekStart, weekEnd, selectedDay, todayISO])

  // preload Google's script so the OAuth popup opens inside the click gesture
  useEffect(() => {
    if (isConfigured()) void preloadGis().catch(() => {})
  }, [])

  const loadCalendar = useCallback(
    async (silent = false, queryOverride?: string) => {
      if (!silent) setBusy('טוען יומן…')
      setError(null)
      try {
        await connect()
        setConnected(true)
        localStorage.setItem(AUTO_CONNECT_KEY, '1')
        const cals = await listCalendars()
        setAccount(cals.find((c) => c.primary)?.id ?? null)
        setCalendars(
          cals
            .filter((c) => c.summary)
            .map((c) => ({ id: c.id, summary: c.summary as string })),
        )
        const q = (queryOverride ?? calendarQuery).trim()
        const match = q
          ? cals.find((c) => (c.summary || '').includes(q))
          : cals.find((c) => c.primary)
        // a saved calendar that no longer exists must be visible, not silent —
        // otherwise the board just looks empty for no apparent reason
        setCalendarMissing(!!q && !match)
        if (q && !match) {
          setCalEvents({})
          return
        }
        const calId = match?.id ?? 'primary'
        // fetch a 2-week window so the coach sees upcoming commitments too
        const busyEnd = toISODate(addDays(days[0], 13))
        const events = await listEvents(
          calId,
          `${weekStart}T00:00:00Z`,
          `${busyEnd}T23:59:59Z`,
        )
        const byDay: Record<string, GCalEvent[]> = {}
        const busyList: CalendarBusy[] = []
        for (const ev of events) {
          const d = ev.start?.dateTime?.slice(0, 10) ?? ev.start?.date
          if (!d) continue
          ;(byDay[d] ??= []).push(ev)
          busyList.push({
            date: d,
            start: ev.start?.dateTime ? ev.start.dateTime.slice(11, 16) : undefined,
            end: ev.end?.dateTime ? ev.end.dateTime.slice(11, 16) : undefined,
            title: ev.summary || '(ללא כותרת)',
          })
        }
        setCalEvents(byDay)
        setCalendarBusy(busyList) // share commitments with the coach
      } catch (e) {
        if (!silent) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!silent) setBusy(null)
      }
    },
    [calendarQuery, days, weekStart, setCalendarBusy],
  )

  // reconnect quietly on load for anyone who already granted access
  useEffect(() => {
    if (!isConfigured()) return
    if (localStorage.getItem(AUTO_CONNECT_KEY) !== '1') return
    void loadCalendar(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /** Create or overwrite the Google event for one planned workout. */
  const pushToCalendar = useCallback(
    async (p: PlannedWorkout) => {
      if (!isConfigured() || !connected) return
      try {
        if (p.syncedEventId) {
          await updateEvent('primary', p.syncedEventId, planToEvent(p))
        } else {
          const created = await insertEvent('primary', planToEvent(p))
          if (created?.id) updatePlanned(p.id, { syncedEventId: created.id })
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    },
    [connected, updatePlanned],
  )

  /** Remove locally and from Google, so the two never drift apart. */
  async function removeEverywhere(p: PlannedWorkout) {
    if (p.syncedEventId && connected) {
      setBusy('מסיר מהיומן…')
      try {
        await deleteEvent('primary', p.syncedEventId)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
      }
    }
    removePlanned(p.id)
  }

  async function approve() {
    setBusy('מסנכרן ליומן…')
    setError(null)
    try {
      await connect()
      setConnected(true)
      localStorage.setItem(AUTO_CONNECT_KEY, '1')
      for (const p of weekPlanned) {
        if (p.syncedEventId) {
          await updateEvent('primary', p.syncedEventId, planToEvent(p))
        } else {
          const created = await insertEvent('primary', planToEvent(p))
          if (created?.id) updatePlanned(p.id, { syncedEventId: created.id })
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(null)
    }
  }

  /** After the form saves, keep an already-synced event in step. */
  function afterSave() {
    setTimeout(() => {
      const latest = useStore.getState().planned
      for (const p of latest.filter((x) => x.syncedEventId)) {
        if (p.date >= weekStart && p.date <= weekEnd) void pushToCalendar(p)
      }
    }, 0)
  }

  async function moveTo(p: PlannedWorkout, date: string) {
    if (p.date === date) return
    updatePlanned(p.id, { date })
    if (p.syncedEventId) await pushToCalendar({ ...p, date })
  }

  const eventTime = (ev: GCalEvent) =>
    ev.start?.dateTime ? ev.start.dateTime.slice(11, 16) : 'כל היום'

  function DayCard({ iso, index }: { iso: string; index: number }) {
    const dayPlanned = weekPlanned.filter((p) => p.date === iso)
    const dayEvents = calEvents[iso] ?? []
    const dayBusy = calendarBusy.filter((b) => b.date === iso)
    const isToday = iso === todayISO

    return (
      <div
        onClick={() => setDetailDate(iso)}
        onDragOver={(e) => {
          if (dragId || dragSession) e.preventDefault()
        }}
        onDrop={() => {
          if (dragSession) {
            addPlanned(
              sessionToPlanned(dragSession, iso) as Omit<PlannedWorkout, 'id'>,
            )
            setDragSession(null)
          }
          const p = planned.find((x) => x.id === dragId)
          if (p) void moveTo(p, iso)
          setDragId(null)
        }}
        title="לחץ להגדלה וצפייה בלו״ז המלא"
        className={`card p-3 flex flex-col gap-2 min-h-[180px] cursor-pointer transition hover:shadow-pop ${
          isToday ? 'ring-2 ring-accent/30' : ''
        } ${dragId || dragSession ? 'outline-dashed outline-1 outline-accent/40' : ''}`}
      >
        <div className="flex items-baseline justify-between">
          <span className="font-bold">{HEB_DAYS_SHORT[index]}</span>
          <span className="flex items-center gap-1 text-xs text-muted">
            {formatDayMonth(new Date(iso + 'T00:00:00'))}
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
          const clash = conflictsFor(p.time || '18:00', p.durationMin || 60, dayBusy)
          return (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation()
                setDragId(p.id)
              }}
              onDragEnd={() => setDragId(null)}
              className="text-xs rounded-lg px-2 py-1.5 border"
              style={{ borderColor: v.color, background: 'rgb(var(--surface))' }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold truncate" style={{ color: v.color }}>
                  {v.icon} {v.title}
                </span>
                <span className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditing(p)
                    }}
                    className="text-muted hover:text-accent leading-none"
                    aria-label="ערוך"
                    title="ערוך"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      void removeEverywhere(p)
                    }}
                    className="text-muted hover:text-run leading-none"
                    aria-label="הסר"
                  >
                    ×
                  </button>
                </span>
              </div>
              <div className="text-muted truncate">{v.details.join(' · ')}</div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <input
                  type="time"
                  value={p.time || '18:00'}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updatePlanned(p.id, { time: e.target.value })}
                  onBlur={() => {
                    const cur = useStore.getState().planned.find((x) => x.id === p.id)
                    if (cur?.syncedEventId) void pushToCalendar(cur)
                  }}
                  className="bg-transparent border border-line rounded-md px-1 py-0.5 text-xs text-ink"
                  title="שעת האימון ביומן"
                />
                <span className="text-muted">{p.durationMin || 60}׳</span>
                {p.syncedEventId && <span className="text-bike">ביומן ✓</span>}
                {clash.length > 0 && (
                  <span className="text-run" title={clash.map((c) => c.title).join(' · ')}>
                    ⚠️ התנגשות
                  </span>
                )}
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
  }

  return (
    <div>
      <PageHeader
        title="שיבוץ ליומן"
        subtitle="טוענים את שבוע התוכנית, קובעים שעות מול היומן, ושולחים ליומן האישי."
        actions={
          <button
            onClick={approve}
            disabled={!!busy || weekPlanned.length === 0}
            className="btn-primary"
          >
            סנכרן ליומן
          </button>
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
              <label className="label">היומן שממנו נטען הלו״ז</label>
              {calendars.length > 0 ? (
                <select
                  className="input w-56 text-sm"
                  value={
                    calendars.find((c) => c.summary.includes(calendarQuery.trim()))
                      ?.summary ?? ''
                  }
                  onChange={(e) => {
                    setCalendarQuery(e.target.value)
                    void loadCalendar(false, e.target.value)
                  }}
                >
                  <option value="">היומן הראשי</option>
                  {calendars.map((c) => (
                    <option key={c.id} value={c.summary}>
                      {c.summary}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input w-48"
                  value={calendarQuery}
                  onChange={(e) => setCalendarQuery(e.target.value)}
                  placeholder="למשל: אלבטרוס / עבודה"
                  title="אחרי חיבור תוכל לבחור מרשימת היומנים שלך"
                />
              )}
            </div>
            <button
              onClick={() => void loadCalendar()}
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
              <span className="chip text-sm self-end mb-1" title="חשבון Google המחובר">
                👤 {account}
              </span>
            )}
          </>
        )}
        {error && <span className="text-sm text-run">שגיאה: {error}</span>}
        {calendarMissing && (
          <div
            className="w-full text-sm rounded-xl px-3 py-2 bg-run/10 text-run"
            style={{ borderInlineStart: '3px solid rgb(var(--c-run))' }}
          >
            ⚠️ היומן <b>"{calendarQuery}"</b> כבר לא קיים בחשבון הזה — בחר יומן
            אחר מהרשימה כדי לראות את הלו״ז.
          </div>
        )}
      </div>

      {/* week navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setWeekRef((d) => addDays(startOfWeek(d), -7))}
          className="btn-ghost text-sm py-1.5 px-3"
        >
          ← קודם
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
          className="btn-ghost text-sm py-1.5 px-3"
        >
          הבא →
        </button>
      </div>

      {/* what the plan still owes this week — one compact scrollable row */}
      {unscheduled.length > 0 && (
        <div className="flex items-center gap-2 mb-3 overflow-x-auto no-scrollbar">
          <span className="text-xs text-muted shrink-0">מהתוכנית:</span>
          {unscheduled.map((s) => {
            const chip = sessionChip(s)
            return (
              <button
                key={s.id}
                draggable
                onDragStart={() => setDragSession(s)}
                onDragEnd={() => setDragSession(null)}
                onClick={() => setPrefill(sessionToPlanned(s, selectedDay))}
                className="chip text-xs shrink-0 hover:border-accent hover:text-accent transition"
                title="לחץ לשיבוץ ליום — או גרור ליום בלוח"
              >
                {chip.icon} {chip.text}
              </button>
            )
          })}
        </div>
      )}

      {/* phones: pick a day, see just that day — no endless scrolling */}
      <div className="lg:hidden">
        <div className="flex gap-1.5 mb-3">
          {days.map((d, i) => {
            const iso = toISODate(d)
            const active = iso === selectedDay
            const count = weekPlanned.filter((p) => p.date === iso).length
            return (
              <button
                key={iso}
                onClick={() => setSelectedDay(iso)}
                className={`flex-1 min-w-0 rounded-xl py-1.5 text-center transition border ${
                  active
                    ? 'bg-ink text-bg border-ink'
                    : iso === todayISO
                      ? 'border-accent/40 text-ink'
                      : 'border-line text-muted'
                }`}
              >
                <div className="text-xs font-bold">{HEB_DAYS_SHORT[i]}</div>
                <div className="text-[11px] opacity-70">{d.getDate()}</div>
                {count > 0 && (
                  <div
                    className={`mx-auto mt-0.5 w-1.5 h-1.5 rounded-full ${
                      active ? 'bg-bg' : 'bg-accent'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
        <DayCard iso={selectedDay} index={days.findIndex((d) => toISODate(d) === selectedDay)} />
      </div>

      {/* desktop: the whole week at a glance */}
      <div className="hidden lg:grid grid-cols-7 gap-3">
        {days.map((d, i) => (
          <DayCard key={toISODate(d)} iso={toISODate(d)} index={i} />
        ))}
      </div>

      <PlanFormModal
        open={formDate !== null}
        date={formDate ?? todayISO}
        onClose={() => setFormDate(null)}
      />

      <PlanFormModal
        open={prefill !== null}
        date={prefill?.date ?? selectedDay}
        prefill={prefill}
        onClose={() => setPrefill(null)}
      />

      <PlanFormModal
        open={editing !== null}
        date={editing?.date ?? todayISO}
        plan={editing}
        onClose={() => {
          setEditing(null)
          afterSave()
        }}
      />

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
                              <span className="font-semibold" style={{ color: v.color }}>
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
                            <span className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => {
                                  setDetailDate(null)
                                  setEditing(p)
                                }}
                                className="text-muted hover:text-accent"
                                aria-label="ערוך"
                              >
                                ✎
                              </button>
                              <button
                                onClick={() => void removeEverywhere(p)}
                                className="text-muted hover:text-run"
                                aria-label="הסר"
                              >
                                ×
                              </button>
                            </span>
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
