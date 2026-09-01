import { useMemo, useState } from 'react'
import { useStore, type Sport, type WorkoutEntry } from '../store/useStore'
import Modal from './ui/Modal'
import Icon from './ui/Icon'
import { getApiKey, hasApiKey } from '../lib/apiKey'
import { runCoach } from '../lib/coachApi'
import { SYSTEM_PERSONA, buildContext } from '../lib/coachTools'
import { addDays, fromISO, toISODate, formatDayMonth, weekDays } from '../lib/dates'
import { weekCompletion } from '../lib/planMatch'
import { entryDuration, formatDuration, sportUnit } from '../lib/calc'
import { sportLabel } from '../lib/labels'
import { intensityBalance } from '../lib/garmin/activityStats'
import { maxHrReference } from '../lib/garmin/autoTag'

interface SportLine {
  sport: Sport
  count: number
  distance: number
  min: number
}

function collectSports(weekLog: WorkoutEntry[]): SportLine[] {
  const order: Sport[] = ['run', 'bike', 'swim']
  return order
    .map((sport) => {
      const es = weekLog.filter((e) => e.category === 'aerobic' && e.sport === sport)
      return {
        sport,
        count: es.length,
        distance:
          Math.round(es.reduce((s, e) => s + (e.distance ?? 0), 0) * 10) / 10,
        min: Math.round(es.reduce((s, e) => s + (entryDuration(e) ?? e.durationMin ?? 0), 0)),
      }
    })
    .filter((l) => l.count > 0)
}

function avg(nums: number[]): number | null {
  return nums.length ? Math.round(nums.reduce((s, n) => s + n, 0) / nums.length) : null
}

function Delta({ value, higherBetter = true }: { value: number; higherBetter?: boolean }) {
  if (value === 0) return <span className="text-muted">±0</span>
  const up = value > 0
  const good = higherBetter ? up : !up
  return (
    <span className={good ? 'text-swim font-semibold' : 'text-muted'}>
      {up ? '▲' : '▼'}
      {Math.abs(value)}
    </span>
  )
}

/** A computed (non-AI) weekly recap: completion, volume per sport, recovery,
 *  the 80/20 split, and a comparison to last week. */
export default function WeeklySummary({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const log = useStore((s) => s.log)
  const plan = useStore((s) => s.trainingPlan)
  const daily = useStore((s) => s.garminDaily)

  const [review, setReview] = useState<string | null>(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reviewErr, setReviewErr] = useState<string | null>(null)

  const runReview = async () => {
    setReviewLoading(true)
    setReviewErr(null)
    setReview(null)
    try {
      const text = await runCoach({
        apiKey: getApiKey(),
        system: SYSTEM_PERSONA + '\n\n[מצב נוכחי]\n' + buildContext(),
        messages: [
          {
            role: 'user',
            content:
              'תן לי ביקורת מאמן על השבוע שחלף: נתח את האימונים שביצעתי מול המתוכנן, את הדופק והעצימות בכל אימון, ואת העומס השבועי הכולל. ' +
              'עבור על ההערות והתחושה (RPE) שרשמתי על האימונים עצמם, ועל ההערה שכתבתי על השבוע בתוכנית — שתיהן מופיעות תחת "סיכום השבוע" במצב הנוכחי, והן הסיבה מאחורי המספרים. התייחס אליהן במפורש. ' +
              'ציין מה הלך טוב, מה חסר או חרג, ומה כדאי להתאים בשבוע הבא. היה קונקרטי, קצר וממוקד (עד ~150 מילים), בלי לחזור על המספרים סתם. אל תשנה את התוכנית — רק נתח.',
          },
        ],
        tools: [],
        onToolCall: () => '',
      })
      setReview(text.trim())
    } catch (e) {
      setReviewErr(e instanceof Error ? e.message : 'שגיאה בהפקת הביקורת')
    } finally {
      setReviewLoading(false)
    }
  }

  const data = useMemo(() => {
    const week = weekDays(new Date())
    const startISO = toISODate(week[0])
    const endISO = toISODate(week[week.length - 1])
    const prevStartISO = toISODate(addDays(fromISO(startISO), -7))
    const prevEndISO = toISODate(addDays(fromISO(startISO), -1))

    const inRange = (d: string, a: string, b: string) => d >= a && d <= b
    const weekLog = log.filter((e) => inRange(e.date, startISO, endISO))
    const prevLog = log.filter((e) => inRange(e.date, prevStartISO, prevEndISO))

    const planWeek = plan?.weeks.find((w) => w.weekStart === startISO) ?? null
    const completion = planWeek ? weekCompletion(planWeek, log) : {}
    const totalCount = planWeek?.sessions.length ?? 0
    const plannedDone = planWeek
      ? planWeek.sessions.filter((s) => completion[s.id]?.done).length
      : 0
    const consumed = new Set(
      Object.values(completion)
        .map((m) => m.entry?.id)
        .filter((v): v is string => !!v),
    )
    const extra = weekLog.filter((e) => !consumed.has(e.id)).length
    const totalDone = plannedDone + extra

    const sports = collectSports(weekLog)
    const strengthCount = weekLog.filter((e) => e.category === 'strength').length
    const otherCount = weekLog.filter((e) => e.category === 'other').length
    const totalMin = Math.round(
      weekLog.reduce((s, e) => s + (entryDuration(e) ?? e.durationMin ?? 0), 0),
    )

    const dWeek = daily.filter((d) => inRange(d.date, startISO, endISO))
    const recovery = {
      sleep: avg(dWeek.map((d) => d.sleepScore).filter((v): v is number => v != null)),
      hrv: avg(dWeek.map((d) => d.hrvLastNight).filter((v): v is number => v != null)),
      rhr: avg(dWeek.map((d) => d.restingHr).filter((v): v is number => v != null)),
    }

    const split = intensityBalance(
      weekLog.filter((e) => e.category === 'aerobic'),
      maxHrReference(log),
    )

    return {
      startISO,
      endISO,
      totalDone,
      totalCount,
      extra,
      sports,
      strengthCount,
      otherCount,
      totalMin,
      recovery,
      split,
      deltaWorkouts: weekLog.length - prevLog.length,
    }
  }, [log, plan, daily])

  const rangeLabel = `${formatDayMonth(fromISO(data.startISO))} – ${formatDayMonth(fromISO(data.endISO))}`

  return (
    <Modal open={open} onClose={onClose} title="סיכום השבוע">
      <div className="text-sm text-muted mb-4">{rangeLabel}</div>

      <div className="grid gap-4">
        {/* headline */}
        <div className="card p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted">אימונים שבוצעו</div>
            <div className="font-display text-3xl font-black">
              {data.totalDone}
              {data.totalCount > 0 && (
                <span className="text-muted text-xl">/{data.totalCount}</span>
              )}
            </div>
            {data.extra > 0 && (
              <div className="text-xs text-swim font-semibold">
                +{data.extra} מעבר לתוכנית
              </div>
            )}
          </div>
          <div className="text-left">
            <div className="text-xs text-muted">מול שבוע שעבר</div>
            <div className="text-lg">
              <Delta value={data.deltaWorkouts} /> אימונים
            </div>
            <div className="text-xs text-muted mt-1">
              זמן כולל {formatDuration(data.totalMin)}
            </div>
          </div>
        </div>

        {/* per-sport volume */}
        {(data.sports.length > 0 || data.strengthCount > 0 || data.otherCount > 0) && (
          <div className="card p-4">
            <h4 className="font-semibold mb-2 text-sm">נפח לפי ענף</h4>
            <div className="grid gap-1.5 text-sm">
              {data.sports.map((l) => (
                <div key={l.sport} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name={l.sport} className="w-4 h-4 text-muted" />
                    {sportLabel[l.sport]}
                  </span>
                  <span className="text-muted">
                    {l.count} · {l.distance} {sportUnit(l.sport)} · {formatDuration(l.min)}
                  </span>
                </div>
              ))}
              {data.strengthCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="strength" className="w-4 h-4 text-muted" /> כוח
                  </span>
                  <span className="text-muted">{data.strengthCount} אימונים</span>
                </div>
              )}
              {data.otherCount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Icon name="other" className="w-4 h-4 text-muted" /> אחר
                  </span>
                  <span className="text-muted">{data.otherCount} אימונים</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* recovery */}
        {(data.recovery.sleep != null ||
          data.recovery.hrv != null ||
          data.recovery.rhr != null) && (
          <div className="card p-4">
            <h4 className="font-semibold mb-2 text-sm">התאוששות (ממוצע שבועי)</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              {data.recovery.sleep != null && (
                <div className="rounded-xl bg-ink/5 py-2">
                  <div className="font-display text-xl font-bold">{data.recovery.sleep}</div>
                  <div className="text-[11px] text-muted">ציון שינה</div>
                </div>
              )}
              {data.recovery.hrv != null && (
                <div className="rounded-xl bg-ink/5 py-2">
                  <div className="font-display text-xl font-bold">{data.recovery.hrv}</div>
                  <div className="text-[11px] text-muted">HRV</div>
                </div>
              )}
              {data.recovery.rhr != null && (
                <div className="rounded-xl bg-ink/5 py-2">
                  <div className="font-display text-xl font-bold">{data.recovery.rhr}</div>
                  <div className="text-[11px] text-muted">דופק מנוחה</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* intensity 80/20 */}
        {data.split.sessions >= 2 && (
          <div className="card p-4">
            <h4 className="font-semibold mb-2 text-sm">עצימות</h4>
            <div className="h-5 rounded-full overflow-hidden bg-ink/5 flex">
              <div
                className="h-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ width: `${data.split.easyPct}%`, background: 'rgb(var(--c-swim))' }}
              >
                {data.split.easyPct >= 14 ? `${data.split.easyPct}%` : ''}
              </div>
              <div
                className="h-full flex items-center justify-center text-[11px] font-bold text-white"
                style={{ width: `${data.split.hardPct}%`, background: 'rgb(var(--c-run))' }}
              >
                {data.split.hardPct >= 14 ? `${data.split.hardPct}%` : ''}
              </div>
            </div>
            <div className="text-xs text-muted mt-1.5">
              קל {data.split.easyPct}% · עצים {data.split.hardPct}% (יעד 80/20)
            </div>
          </div>
        )}

        {/* AI coach review */}
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm flex items-center gap-1.5">
              <Icon name="chat" className="w-4 h-4 text-accent" /> ביקורת מאמן
            </h4>
            {hasApiKey() && (
              <button
                onClick={() => void runReview()}
                disabled={reviewLoading}
                className="btn-accent text-sm py-1.5 px-3 gap-1.5 disabled:opacity-50"
              >
                {reviewLoading ? 'מנתח…' : review ? 'נתח שוב' : 'נתח את השבוע'}
              </button>
            )}
          </div>

          {!hasApiKey() ? (
            <p className="text-sm text-muted mt-2 leading-relaxed">
              כדי לקבל ניתוח מהמאמן, חבר תחילה מפתח AI דרך <b>המאמן</b> (הכפתור
              הצף בפינה).
            </p>
          ) : reviewErr ? (
            <p className="text-sm text-run mt-2">{reviewErr}</p>
          ) : review ? (
            <p className="text-sm text-ink mt-3 leading-relaxed whitespace-pre-wrap">
              {review}
            </p>
          ) : (
            !reviewLoading && (
              <p className="text-sm text-muted mt-2 leading-relaxed">
                לחץ "נתח את השבוע" והמאמן יעבור על האימונים מול התוכנית, הדופק,
                העומס והתחושה — וייתן פידבק והמלצות.
              </p>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}
