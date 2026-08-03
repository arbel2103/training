import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { hasApiKey } from '../../lib/apiKey'
import { hasGarminSetup } from '../../lib/garmin/pat'
import { requestZoneFeedback } from '../../lib/coachActions'
import {
  aggregateZones,
  zoneVerdict,
  type ZoneTotals,
} from '../../lib/garmin/zoneStats'
import { garminErrorMessage } from '../../lib/garmin/sync'
import ZoneBars, { type Zone } from '../../components/ui/ZoneBars'

const ZONE_COLORS = ['var(--muted)', 'var(--c-swim)', 'var(--c-bike)', 'var(--accent)', 'var(--c-run)']
const severityClass = {
  good: 'bg-bike/10 text-bike',
  info: 'bg-accent-soft/60 text-ink',
  warn: 'bg-run/10 text-run',
} as const

function hours(sec: number): string {
  const m = Math.round(sec / 60)
  if (m < 60) return `${m} דק׳`
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} שע׳`
}

export default function ZoneDistributionCard({ days = 90 }: { days?: number }) {
  const log = useStore((s) => s.log)
  const [totals, setTotals] = useState<ZoneTotals | null>(null)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<[number, number]>([0, 0])
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const cutoffISO = cutoff.toISOString().slice(0, 10)
  const entries = log.filter((e) => e.date >= cutoffISO && e.garminActivityId != null)

  async function analyze() {
    setLoading(true)
    setError(null)
    setFeedback(null)
    try {
      const t = await aggregateZones(entries, (d, n) => setProgress([d, n]))
      setTotals(t)
    } catch (e) {
      setError(garminErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  async function askCoach() {
    if (!totals) return
    const v = zoneVerdict(totals)
    if (!v) return
    setFeedbackLoading(true)
    setError(null)
    try {
      const summary = [
        `תקופה: ${days} הימים האחרונים (${totals.used} אימונים עם נתוני דופק).`,
        `קל (Z1–Z2): ${v.easyPct}% · ${hours(totals.easy)}`,
        `בינוני (Z3): ${v.moderatePct}% · ${hours(totals.moderate)}`,
        `עצים (Z4–Z5): ${v.hardPct}% · ${hours(totals.hard)}`,
      ].join('\n')
      setFeedback(await requestZoneFeedback(summary))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setFeedbackLoading(false)
    }
  }

  if (!hasGarminSetup()) return null

  const verdict = totals ? zoneVerdict(totals) : null
  const zones: Zone[] = totals
    ? totals.perZone.map((sec, i) => ({
        label: `Z${i + 1}`,
        value: sec,
        color: ZONE_COLORS[i],
      }))
    : []

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="font-semibold">❤️ פילוח אזורי דופק</h4>
          <p className="text-xs text-muted mt-0.5">
            כמה מזמן האימון שלך היה קל מול עצים ({days} ימים אחרונים)
          </p>
        </div>
        <button onClick={() => void analyze()} disabled={loading} className="btn-soft text-sm">
          {loading
            ? `טוען… ${progress[0]}/${progress[1]}`
            : totals
              ? 'רענן'
              : 'נתח אימונים'}
        </button>
      </div>

      {error && <p className="text-run text-sm mb-2">{error}</p>}

      {!totals && !loading && (
        <p className="text-sm text-muted">
          {entries.length === 0
            ? 'אין אימונים מגרמין בתקופה הזו.'
            : `לחץ "נתח אימונים" כדי לאסוף נתוני דופק מ-${entries.length} אימונים.`}
        </p>
      )}

      {totals && totals.total === 0 && (
        <p className="text-sm text-muted">לא נמצאו נתוני אזורי דופק באימונים האלה.</p>
      )}

      {totals && totals.total > 0 && verdict && (
        <div className="grid gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'קל', pct: verdict.easyPct, sec: totals.easy, c: 'var(--c-bike)' },
              { label: 'בינוני', pct: verdict.moderatePct, sec: totals.moderate, c: 'var(--accent)' },
              { label: 'עצים', pct: verdict.hardPct, sec: totals.hard, c: 'var(--c-run)' },
            ].map((b) => (
              <div key={b.label} className="rounded-xl bg-ink/5 px-2 py-2">
                <div
                  className="font-display text-2xl font-black leading-none"
                  style={{ color: `rgb(${b.c})` }}
                >
                  {b.pct}%
                </div>
                <div className="text-xs text-muted mt-1">{b.label}</div>
                <div className="text-[11px] text-muted">{hours(b.sec)}</div>
              </div>
            ))}
          </div>

          <ZoneBars zones={zones} />

          <div className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${severityClass[verdict.severity]}`}>
            {verdict.text}
          </div>

          <div className="text-xs text-muted">
            מבוסס על {totals.used} אימונים
            {totals.skipped > 0 && ` (${totals.skipped} ללא נתוני דופק)`}
          </div>

          {feedbackLoading ? (
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="mr-1">המאמן מנתח…</span>
            </div>
          ) : feedback ? (
            <div className="rounded-xl bg-accent-soft/50 px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap">
              <span className="font-semibold">🏋️ המאמן: </span>
              {feedback}
            </div>
          ) : (
            <button
              onClick={() => void askCoach()}
              disabled={!hasApiKey()}
              className="btn-soft text-sm justify-self-start"
            >
              🏋️ בקש פידבק מהמאמן
            </button>
          )}
        </div>
      )}
    </div>
  )
}
