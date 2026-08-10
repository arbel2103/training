import { useStore } from '../store/useStore'
import { dayTotals, energyBalance, macroSplit, slotTotals } from '../store/selectors'
import { dayEnergy, latestWeightKg, upcomingSessions, type FuelSession } from '../lib/triLink'
import { dailyTargets, sessionDurationMin } from '../lib/nutritionMath'
import { mealSlotLabel } from '../lib/types'
import Ring from '../../../components/ui/Ring'
import Icon, { type IconName } from '../../../components/ui/Icon'
import InfoTip from '../../../components/ui/InfoTip'
import { formatDuration } from '../../../lib/calc'
import { sportColorClass } from '../../../lib/labels'
import { formatFullDate, toISODate } from '../../../lib/dates'

function sessionIcon(sport: FuelSession['sport']): IconName {
  if (sport === 'strength') return 'strength'
  if (sport === 'other') return 'other'
  return sport
}

function sessionTitle(s: FuelSession): string {
  const base =
    s.sport === 'strength'
      ? s.label || 'אימון כוח'
      : s.sport === 'other'
        ? s.label || 'אימון'
        : { run: 'ריצה', bike: 'רכיבה', swim: 'שחייה' }[s.sport]
  const bits = [
    s.distance ? `${s.distance} ${s.sport === 'swim' ? 'מ׳' : 'ק״מ'}` : '',
    s.durationMin ? formatDuration(s.durationMin) : '',
  ].filter(Boolean)
  return bits.length ? `${base} · ${bits.join(' · ')}` : base
}

/** One macro's progress toward its gram target. */
function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string
  value: number
  target?: number
  color: string
}) {
  const pct = target && target > 0 ? Math.min(100, (value / target) * 100) : 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm mb-1">
        <span className="text-muted">{label}</span>
        <span className="font-semibold">
          {Math.round(value)}
          <span className="text-muted font-normal">
            {target ? ` / ${Math.round(target)}` : ''} ג׳
          </span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-ink/10 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

export default function TodayPage() {
  const meals = useStore((s) => s.meals)
  const profile = useStore((s) => s.profile)

  const today = toISODate(new Date())
  const totals = dayTotals(meals, today)
  const energy = dayEnergy(today)
  const balance = energyBalance(meals, today, energy.totalBurned)
  const split = macroSplit(totals)
  const slots = slotTotals(meals, today)
  const { today: todaySessions, tomorrow } = upcomingSessions()

  // when the user hasn't set manual targets, derive them from body weight and
  // the day's training load (carb periodization) so the bars mean something
  const trainingMinutes = todaySessions.reduce((s, x) => s + sessionDurationMin(x), 0)
  const auto = dailyTargets(
    profile.weightKg ?? latestWeightKg(),
    trainingMinutes,
    energy.totalBurned,
  )
  const target = {
    kcal: profile.kcalTarget ?? auto.kcal,
    carbs: profile.carbsTarget ?? auto.carbs,
    protein: profile.proteinTarget ?? auto.protein,
    fat: profile.fatTarget ?? auto.fat,
  }
  const kcalTarget = target.kcal
  const eatenFrac = kcalTarget && kcalTarget > 0 ? balance.eaten / kcalTarget : 0
  const autoTargets =
    profile.carbsTarget == null &&
    profile.proteinTarget == null &&
    profile.fatTarget == null

  return (
    <div className="grid grid-cols-1 gap-5">
      <div>
        <h2 className="font-display text-2xl font-black tracking-tight">היום</h2>
        <p className="text-muted text-sm mt-0.5">{formatFullDate(today)}</p>
      </div>

      {/* energy balance */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Icon name="flame" className="w-5 h-5 text-muted" /> מאזן אנרגיה
          </h3>
          <InfoTip text="נכנס = מה שאכלת היום. נשרף = סך הקלוריות שגרמין מדד (פעילות + מנוחה). המאזן הוא ההפרש ביניהם — חיובי זה עודף, שלילי זה גירעון." />
        </div>

        <div className="flex items-center justify-around gap-4 flex-wrap">
          <div className="flex flex-col items-center gap-2">
            <Ring value={eatenFrac} max={1} color="rgb(var(--accent))">
              <div className="text-center leading-none">
                <span className="font-display text-2xl font-black">{balance.eaten}</span>
                <div className="text-[10px] text-muted mt-0.5">קק״ל</div>
              </div>
            </Ring>
            <div className="text-xs text-muted">נכנס</div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Ring
              value={energy.totalBurned ?? 0}
              max={Math.max(energy.totalBurned ?? 0, kcalTarget ?? 1)}
              color="rgb(var(--c-run))"
            >
              <div className="text-center leading-none">
                <span className="font-display text-2xl font-black">
                  {energy.totalBurned ?? '—'}
                </span>
                <div className="text-[10px] text-muted mt-0.5">קק״ל</div>
              </div>
            </Ring>
            <div className="text-xs text-muted">נשרף</div>
          </div>

          <div className="text-center">
            <div
              className={`font-display text-3xl font-black ${
                balance.net == null
                  ? 'text-muted'
                  : balance.net >= 0
                    ? 'text-bike'
                    : 'text-run'
              }`}
            >
              {/* isolate so the sign stays glued to the left of the digits in RTL */}
              {balance.net == null
                ? '—'
                : `⁦${balance.net > 0 ? '+' : '−'}${Math.abs(balance.net)}⁩`}
            </div>
            <div className="text-xs text-muted mt-1">מאזן</div>
            {energy.activeBurned != null && (
              <div className="text-[11px] text-muted mt-1.5 leading-tight">
                פעילות {energy.activeBurned}
                <br />
                מנוחה {energy.restingBurned}
              </div>
            )}
          </div>
        </div>

        {energy.totalBurned == null && (
          <p className="text-xs text-muted mt-4 text-center">
            אין עדיין נתוני גרמין להיום — המאזן יופיע אחרי הסנכרון.
          </p>
        )}
      </div>

      {/* macros */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold">מאקרו</h3>
          {autoTargets && (
            <InfoTip text="היעדים מחושבים אוטומטית ממשקל הגוף ומהעומס של היום: יותר פחמימות ביום אימונים כבד, פחות ביום קל. חלבון 1.8–2 ג׳ לק״ג." />
          )}
        </div>
        <div className="grid grid-cols-1 gap-3">
          <MacroBar
            label="פחמימות"
            value={totals.carbs}
            target={target.carbs}
            color="rgb(var(--c-bike))"
          />
          <MacroBar
            label="חלבון"
            value={totals.protein}
            target={target.protein}
            color="rgb(var(--c-swim))"
          />
          <MacroBar
            label="שומן"
            value={totals.fat}
            target={target.fat}
            color="rgb(var(--c-run))"
          />
        </div>
        {totals.kcal > 0 && (
          <div className="text-xs text-muted mt-3">
            חלוקה קלורית: פחמימות {split.carbs}% · חלבון {split.protein}% · שומן {split.fat}%
            {totals.sodium ? ` · נתרן ${totals.sodium} מ״ג` : ''}
          </div>
        )}
      </div>

      {/* meals so far */}
      <div className="card p-5">
        <h3 className="font-display text-lg font-bold mb-3">ארוחות היום</h3>
        {totals.kcal === 0 ? (
          <p className="text-sm text-muted">
            עוד לא רשמת ארוחות היום — עבור ל<b>יומן אכילה</b> כדי להוסיף.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-2">
            {slots.map((s) => (
              <div
                key={s.slot}
                className="flex items-center justify-between rounded-xl border border-line px-3 py-2"
              >
                <span className="font-semibold text-sm">{mealSlotLabel[s.slot]}</span>
                <span className="text-sm text-muted">
                  {s.entries.length === 0
                    ? '—'
                    : `${s.totals.kcal} קק״ל · ${s.entries.length} פריטים`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* training context */}
      <div className="card p-5">
        <h3 className="font-display text-lg font-bold mb-3">אימונים</h3>
        <div className="grid grid-cols-1 gap-3">
          <SessionList title="היום" sessions={todaySessions} />
          <SessionList title="מחר" sessions={tomorrow} />
        </div>
      </div>
    </div>
  )
}

function SessionList({ title, sessions }: { title: string; sessions: FuelSession[] }) {
  return (
    <div>
      <div className="text-xs text-muted mb-1.5">{title}</div>
      {sessions.length === 0 ? (
        <p className="text-sm text-muted">אין אימונים.</p>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${
                s.done ? 'border-bike/40 bg-bike/5' : 'border-line'
              }`}
            >
              <Icon
                name={sessionIcon(s.sport)}
                className={`w-5 h-5 shrink-0 ${sportColorClass[s.sport] ?? 'text-muted'}`}
              />
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                {sessionTitle(s)}
              </span>
              {s.done && <span className="text-bike text-xs font-bold shrink-0">בוצע ✓</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
