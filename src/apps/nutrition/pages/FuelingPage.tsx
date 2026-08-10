import { useState } from 'react'
import { useStore } from '../store/useStore'
import {
  buildFuelPlan,
  sessionDurationMin,
  sessionIntensity,
  type FuelPlan,
} from '../lib/nutritionMath'
import { upcomingSessions, latestWeightKg, type FuelSession } from '../lib/triLink'
import { NUTRITION_PERSONA, buildNutritionContext } from '../lib/fuelCoach'
import { getApiKey, hasApiKey } from '../../../lib/apiKey'
import { runCoach } from '../../../lib/coachApi'
import Icon, { type IconName } from '../../../components/ui/Icon'
import InfoTip from '../../../components/ui/InfoTip'
import { formatDuration } from '../../../lib/calc'
import { sportColorClass } from '../../../lib/labels'

const intensityLabel = { easy: 'קל', moderate: 'בינוני', hard: 'עצים' } as const

function sessionIcon(sport: FuelSession['sport']): IconName {
  if (sport === 'strength') return 'strength'
  if (sport === 'other') return 'other'
  return sport
}

function sessionName(s: FuelSession): string {
  if (s.sport === 'strength') return s.label || 'אימון כוח'
  if (s.sport === 'other') return s.label || 'אימון'
  const base = { run: 'ריצה', bike: 'רכיבה', swim: 'שחייה' }[s.sport]
  return s.label ? `${base} · ${s.label}` : base
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <span className="text-muted shrink-0">{label}</span>
      <span className="font-semibold text-end">{value}</span>
    </div>
  )
}

function PlanCard({ session, plan }: { session: FuelSession; plan: FuelPlan }) {
  const { pre, intra, post } = plan
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-1">
        <Icon
          name={sessionIcon(session.sport)}
          className={`w-6 h-6 shrink-0 ${sportColorClass[session.sport] ?? 'text-muted'}`}
        />
        <div className="min-w-0 flex-1">
          <div className="font-display text-lg font-bold truncate">
            {sessionName(session)}
          </div>
          <div className="text-xs text-muted">
            {formatDuration(plan.durationMin)} · עצימות {intensityLabel[plan.intensity]}
            {session.distance
              ? ` · ${session.distance} ${session.sport === 'swim' ? 'מ׳' : 'ק״מ'}`
              : ''}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mt-4">
        {/* before */}
        <section className="rounded-xl bg-ink/5 p-3">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <Icon name="clock" className="w-4 h-4 text-muted" /> לפני
          </h4>
          <div className="grid grid-cols-1 gap-1">
            <Row
              label="פחמימות"
              value={`${pre.carbsGrams} ג׳ (${pre.carbsPerKg} ג׳/ק״ג)`}
            />
            <Row label="נוזלים" value={`${pre.fluidMl} מ״ל`} />
            <Row label="נתרן" value={`${pre.sodiumMg} מ״ג`} />
          </div>
          <p className="text-xs text-muted mt-2 leading-relaxed">{pre.timing}</p>
        </section>

        {/* during */}
        <section className="rounded-xl bg-ink/5 p-3">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <Icon name="flame" className="w-4 h-4 text-muted" /> תוך כדי
          </h4>
          {!intra ? (
            <p className="text-sm text-muted">
              אימון קצר — לא צריך תדלוק תוך כדי, רק לשתות לפי צמא.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-1">
                <Row
                  label="פחמימות"
                  value={
                    intra.carbsPerHour === 0
                      ? '—'
                      : `${intra.carbsPerHour} ג׳/שעה · ${intra.carbsTotal} ג׳ סה״כ`
                  }
                />
                <Row
                  label="נוזלים"
                  value={`${intra.fluidMlPerHour} מ״ל/שעה · ${intra.fluidMlTotal} מ״ל סה״כ`}
                />
                <Row label="נתרן" value={`${intra.sodiumMgPerHour} מ״ג/שעה`} />
              </div>
              <p className="text-xs text-muted mt-2 leading-relaxed">{intra.note}</p>
            </>
          )}
        </section>

        {/* after */}
        <section className="rounded-xl bg-ink/5 p-3">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
            <Icon name="refresh" className="w-4 h-4 text-muted" /> אחרי
          </h4>
          <div className="grid grid-cols-1 gap-1">
            <Row label="פחמימות" value={`${post.carbsGrams} ג׳`} />
            <Row label="חלבון" value={`${post.proteinGrams} ג׳`} />
            <Row label="נוזלים" value={`${post.fluidMl} מ״ל`} />
          </div>
          <p className="text-xs text-muted mt-2 leading-relaxed">{post.note}</p>
        </section>
      </div>
    </div>
  )
}

export default function FuelingPage() {
  const profile = useStore((s) => s.profile)
  const setProfile = useStore((s) => s.setProfile)

  const [hot, setHot] = useState(false)
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weightKg = profile.weightKg ?? latestWeightKg()
  const { today, tomorrow } = upcomingSessions()

  const planFor = (s: FuelSession, nextSoon: boolean): FuelPlan =>
    buildFuelPlan({
      durationMin: sessionDurationMin(s),
      intensity: sessionIntensity(s),
      weightKg,
      hot,
      nextSessionSoon: nextSoon,
    })

  const ask = async (prompt: string) => {
    setLoading(true)
    setError(null)
    setAnswer(null)
    try {
      const text = await runCoach({
        apiKey: getApiKey(),
        system: NUTRITION_PERSONA + '\n\n[מצב נוכחי]\n' + buildNutritionContext(),
        messages: [{ role: 'user', content: prompt }],
        tools: [],
        onToolCall: () => '',
      })
      setAnswer(text.trim())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בתשובה')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tight">תדלוק</h2>
        <p className="text-muted text-sm mt-0.5">
          תוכנית תזונה סביב האימונים של היום ומחר.
        </p>
      </div>

      {/* settings */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <label className="label">משקל גוף (ק״ג)</label>
            <input
              type="number"
              inputMode="decimal"
              value={profile.weightKg ?? weightKg ?? ''}
              onChange={(e) =>
                setProfile({ weightKg: Number(e.target.value) || undefined })
              }
              placeholder={weightKg ? String(weightKg) : '70'}
              className="input w-28"
            />
          </div>
          <button
            onClick={() => setHot((v) => !v)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
              hot
                ? 'border-run/50 bg-run/10 text-run'
                : 'border-line bg-surface text-muted hover:bg-ink/5'
            }`}
            title="מעלה את יעדי הנוזלים והנתרן"
          >
            <Icon name="droplet" className="w-4 h-4" />
            {hot ? 'תנאי חום ולחות' : 'תנאים רגילים'}
          </button>
        </div>
        {!weightKg && (
          <p className="text-xs text-muted mt-3">
            הזן משקל כדי שהכמויות יחושבו לפי גרם לק״ג (ברירת מחדל: 70 ק״ג).
          </p>
        )}
      </div>

      {/* today */}
      <div>
        <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-1.5">
          היום
          <InfoTip text="הכמויות מחושבות מהעקרונות המקובלים בתזונת ספורט (GSSI/ISSN): פחמימה לשעה לפי משך ועצימות, נוזלים 400–800 מ״ל לשעה, ונתרן לפי כמות הנוזלים. בחום היעדים עולים." />
        </h3>
        {today.length === 0 ? (
          <div className="card p-5">
            <p className="text-sm text-muted">
              אין אימון היום — יום מנוחה. שמור על חלבון מפוזר לאורך היום והתאוששות.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {today.map((s) => (
              <PlanCard key={s.id} session={s} plan={planFor(s, tomorrow.length > 0)} />
            ))}
          </div>
        )}
      </div>

      {/* tomorrow */}
      {tomorrow.length > 0 && (
        <div>
          <h3 className="font-display text-lg font-bold mb-3">מחר</h3>
          <div className="grid grid-cols-1 gap-4">
            {tomorrow.map((s) => (
              <PlanCard key={s.id} session={s} plan={planFor(s, false)} />
            ))}
          </div>
        </div>
      )}

      {/* AI coach */}
      <div className="card p-5">
        <h3 className="font-display text-lg font-bold mb-3 flex items-center gap-2">
          <Icon name="chat" className="w-5 h-5 text-accent" /> שאל את המאמן
        </h3>

        {!hasApiKey() ? (
          <p className="text-sm text-muted leading-relaxed">
            כדי לשאול את מאמן התזונה, חבר תחילה מפתח AI דרך <b>המאמן</b> ב-TriLife
            (הכפתור הצף בפינה).
          </p>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap mb-3">
              <button
                onClick={() => void ask('מה כדאי לי לאכול היום לפי האימונים והמאזן שלי? תן תוכנית קצרה לארוחות שנשארו.')}
                disabled={loading}
                className="btn-soft text-sm disabled:opacity-50"
              >
                מה לאכול היום?
              </button>
              <button
                onClick={() => void ask('נתח את מה שאכלתי היום מול העומס שלי — מה חסר ומה עודף, ומה לתקן.')}
                disabled={loading}
                className="btn-soft text-sm disabled:opacity-50"
              >
                נתח את היום
              </button>
              <button
                onClick={() => void ask('איך להיערך תזונתית לאימון של מחר? כולל הארוחה של הערב.')}
                disabled={loading}
                className="btn-soft text-sm disabled:opacity-50"
              >
                היערכות למחר
              </button>
            </div>

            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && question.trim() && !loading) {
                    void ask(question.trim())
                    setQuestion('')
                  }
                }}
                placeholder="שאלה חופשית — למשל: מה לקחת לרכיבה של 4 שעות?"
                className="input flex-1"
              />
              <button
                onClick={() => {
                  if (!question.trim()) return
                  void ask(question.trim())
                  setQuestion('')
                }}
                disabled={loading || !question.trim()}
                className="btn-accent disabled:opacity-50"
              >
                {loading ? '…' : 'שאל'}
              </button>
            </div>

            {loading && <p className="text-sm text-muted mt-3">חושב…</p>}
            {error && <p className="text-sm text-run mt-3">{error}</p>}
            {answer && (
              <div className="mt-3 rounded-xl bg-accent-soft/40 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                {answer}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
