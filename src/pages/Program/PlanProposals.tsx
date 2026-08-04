import { useState } from 'react'
import {
  uid,
  useStore,
  type PlanProposal,
  type PlanSession,
  type PlanSport,
} from '../../store/useStore'
import { HEB_DAYS_SHORT } from '../../lib/dates'
import { sportLabel } from '../../lib/labels'
import Icon, { type IconName } from '../../components/ui/Icon'
import { hasApiKey } from '../../lib/apiKey'
import { requestPlanRecommendations } from '../../lib/coachActions'

const sportMeta: Record<PlanSport, { iconName: IconName; label: string }> = {
  run: { iconName: 'run', label: sportLabel.run },
  bike: { iconName: 'bike', label: sportLabel.bike },
  swim: { iconName: 'swim', label: sportLabel.swim },
  strength: { iconName: 'strength', label: 'כוח' },
  other: { iconName: 'other', label: 'אחר' },
}
const unitFor = (s: PlanSport): string =>
  s === 'swim' ? 'מ׳' : s === 'run' || s === 'bike' ? 'ק״מ' : ''

function ProposalCard({ p }: { p: PlanProposal }) {
  const upsertPlanWeek = useStore((s) => s.upsertPlanWeek)
  const removePlanProposal = useStore((s) => s.removePlanProposal)
  const [sessions, setSessions] = useState<PlanSession[]>(p.sessions)

  const setDistance = (id: string, v: string) =>
    setSessions((list) =>
      list.map((s) => (s.id === id ? { ...s, distance: v ? Number(v) : undefined } : s)),
    )
  const removeSession = (id: string) =>
    setSessions((list) => list.filter((s) => s.id !== id))

  function approve() {
    upsertPlanWeek({
      id: uid(),
      weekStart: p.weekStart,
      label: p.label,
      focus: p.focus,
      sessions,
    })
    removePlanProposal(p.id)
  }

  const sorted = [...sessions].sort((a, b) => a.day - b.day)

  return (
    <div className="card p-4 border-accent/40" style={{ borderInlineStart: '4px solid rgb(var(--accent))' }}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <h4 className="font-semibold">
          שבוע {p.weekStart}
          {p.label ? ` · ${p.label}` : ''}
        </h4>
      </div>
      <p className="text-sm text-muted leading-relaxed mb-3 flex items-start gap-1.5">
        <Icon name="bulb" className="w-4 h-4 mt-0.5 shrink-0" /> {p.rationale}
      </p>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted mb-3">שבוע מנוחה (בלי אימונים).</p>
      ) : (
        <div className="grid gap-1.5 mb-3">
          {sorted.map((s) => {
            const meta = sportMeta[s.sport]
            const unit = unitFor(s.sport)
            return (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm"
              >
                <span className="w-6 text-xs font-bold text-muted shrink-0">
                  {HEB_DAYS_SHORT[s.day]}
                </span>
                <Icon name={meta.iconName} className="w-4 h-4 shrink-0" />
                <span className="flex-1 min-w-0 truncate">
                  {meta.label}
                  {s.label ? ` · ${s.label}` : ''}
                </span>
                {unit && (
                  <span className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      className="input py-1 px-2 w-16 text-sm text-center"
                      value={s.distance ?? ''}
                      onChange={(e) => setDistance(s.id, e.target.value)}
                    />
                    <span className="text-xs text-muted">{unit}</span>
                  </span>
                )}
                <button
                  onClick={() => removeSession(s.id)}
                  className="text-muted hover:text-run shrink-0 px-1"
                  aria-label="הסר אימון"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button onClick={approve} className="btn-primary text-sm">
          אשר והחל
        </button>
        <button onClick={() => removePlanProposal(p.id)} className="btn-ghost text-sm">
          דחה
        </button>
      </div>
    </div>
  )
}

export default function PlanProposals() {
  const proposals = useStore((s) => s.planProposals)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<string | null>(null)

  async function request() {
    setLoading(true)
    setError(null)
    setSummary(null)
    try {
      const txt = await requestPlanRecommendations()
      setSummary(txt)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => void request()}
          disabled={loading || !hasApiKey()}
          className="btn-soft text-sm"
        >
          {loading ? 'המאמן חושב…' : 'בקש המלצות להמשך'}
        </button>
        {!hasApiKey() && (
          <span className="text-xs text-muted">דורש חיבור מאמן</span>
        )}
      </div>

      {error && <p className="text-run text-sm mt-2">{error}</p>}

      {proposals.length > 0 && (
        <div className="grid gap-3 mt-3">
          <p className="text-sm text-muted">
            המאמן מציע {proposals.length} התאמות — אפשר לערוך מרחקים או להסיר אימונים, ואז לאשר:
          </p>
          {proposals.map((p) => (
            <ProposalCard key={p.id} p={p} />
          ))}
        </div>
      )}

      {summary && proposals.length === 0 && (
        <p className="text-sm text-muted mt-2 leading-relaxed">{summary}</p>
      )}
    </div>
  )
}
