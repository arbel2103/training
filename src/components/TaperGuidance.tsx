import { useState } from 'react'
import { useStore, type PlanWeek } from '../store/useStore'
import { formatDuration, sportUnit } from '../lib/calc'
import { sportLabel } from '../lib/labels'
import { addDays, fromISO, toISODate } from '../lib/dates'
import { formatRange, intraFuel, practicalCarbs } from '../lib/fueling'
import {
  carbLoad,
  daysToRace,
  recentPaces,
  taperRules,
  taperVolume,
} from '../lib/taper'
import Icon from './ui/Icon'

/** min/km or min/100m as m:ss. */
function pace(minPerUnit: number, sport: 'run' | 'bike' | 'swim'): string {
  const per = sport === 'swim' ? minPerUnit * 100 : minPerUnit
  const m = Math.floor(per)
  const sec = Math.round((per - m) * 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** How long the race is expected to take, as the athlete chooses to say it. */
const HOURS = [1, 2, 3, 5]

/**
 * Everything a taper week is actually about, on the week it applies to.
 *
 * The plan has always carried taper weeks — the coach labels them — but the
 * label was the whole feature. The training in a taper no longer changes
 * fitness, so what decides the day is whether the volume really came down,
 * what gets eaten in the last 48 hours, and going out at a pace the athlete
 * has actually held before.
 */
export default function TaperGuidance({
  week,
  allWeeks,
}: {
  week: PlanWeek
  allWeeks: PlanWeek[]
}) {
  const log = useStore((s) => s.log)
  const weighIns = useStore((s) => s.weighIns)
  const plan = useStore((s) => s.trainingPlan)
  const [hours, setHours] = useState(2)

  const today = toISODate(new Date())
  const days = daysToRace(today, plan?.raceDate)
  const vol = taperVolume(week, allWeeks, log)
  // the loading window is the last 48h, not the whole taper
  const loading = days != null && days <= 2
  const weightKg = weighIns.length
    ? [...weighIns].sort((a, b) => a.date.localeCompare(b.date)).at(-1)!.weight
    : null
  const load = carbLoad(weightKg, loading)
  const paces = recentPaces(log, toISODate(addDays(fromISO(today), -56)))
  const fuel = intraFuel({
    durationMin: hours * 60,
    intensity: 'hard',
    endurance: true,
  })

  return (
    <div
      className="rounded-xl p-3 mb-3 bg-bike/10 grid gap-3 text-sm min-w-0"
      style={{ borderInlineStart: '3px solid rgb(var(--c-bike))' }}
    >
      <div className="flex items-center gap-1.5 font-bold text-bike">
        <Icon name="flag" className="w-4 h-4 shrink-0" />
        שבוע טייפר
        {days != null && (
          <span className="font-normal text-muted">
            · {days === 0 ? 'המרוץ היום' : days === 1 ? 'מחר המרוץ' : `${days} ימים למרוץ`}
          </span>
        )}
      </div>

      {/* did the volume actually come down? */}
      {vol && (
        <div>
          <div className="label mb-1">נפח מול השבועות שלפני</div>
          <p className="text-muted leading-relaxed">
            {formatDuration(vol.thisWeekMin)} מול ממוצע {formatDuration(vol.baselineMin)} —{' '}
            <b className={vol.onTarget ? 'text-bike' : 'text-run'}>
              {Math.round(vol.ratio * 100)}%
            </b>
            .{' '}
            {vol.onTarget
              ? 'בול בטווח הטייפר (40–60%).'
              : vol.tooHigh
                ? 'עדיין גבוה לטייפר — היעד הוא 40–60% מהנפח הרגיל, בלי לוותר על העצימות.'
                : 'נמוך מ-40% — ירידה חדה מדי עלולה להשאיר תחושת עצלות; שמור על כמה מקטעים בקצב מרוץ.'}
          </p>
        </div>
      )}

      {/* what to eat */}
      <div>
        <div className="label mb-1">
          תזונה {loading ? '· טעינת פחמימות (48 שעות אחרונות)' : 'בשבוע הטייפר'}
        </div>
        <p className="text-muted leading-relaxed">
          {load.perKg.low}–{load.perKg.high} גר׳ פחמימה לכל ק״ג משקל גוף ליום
          {load.grams ? (
            <>
              {' '}
              — עבורך ≈ <b>{load.grams.low}–{load.grams.high} גר׳ ליום</b> ({load.weightKg} ק״ג)
            </>
          ) : (
            <> (רשום שקילה כדי לראות את זה בגרמים)</>
          )}
          .{' '}
          {loading
            ? 'הימים האלה הם הטעינה עצמה: פחמימה זמינה, פחות סיבים ופחות שומן, וחלבון כרגיל.'
            : 'הנפח יורד אז גם התיאבון — אין צורך להעמיס עדיין, הטעינה מתחילה 48 שעות לפני.'}
        </p>
      </div>

      {/* how to fuel the race itself */}
      {fuel.needed && (
        <div>
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="label mb-0">תדלוק במרוץ</span>
            <div className="inline-flex rounded-lg border border-line overflow-hidden text-xs shrink-0">
              {HOURS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHours(h)}
                  className={`px-2 py-0.5 font-semibold ${
                    hours === h ? 'bg-bike text-white' : 'text-muted'
                  }`}
                >
                  {h} שע׳
                </button>
              ))}
            </div>
          </div>
          <ul className="text-muted leading-relaxed grid gap-0.5">
            <li>
              פחמימות: <b>{fuel.carbsPerHour} גר׳ לשעה</b> (≈ {fuel.carbsTotal} גר׳ סה״כ)
              {fuel.needsMixedCarbs && ' — מעל 60 גר׳ צריך גלוקוז+פרוקטוז כדי להיספג'}
            </li>
            <li>נוזלים: {formatRange(fuel.fluidMlPerHour, 'מ״ל לשעה')}</li>
            <li>נתרן: {formatRange(fuel.sodiumMgPerHour, 'מ״ג לשעה')}</li>
            {practicalCarbs(fuel.carbsPerHour) && (
              <li className="text-ink/80">{practicalCarbs(fuel.carbsPerHour)}</li>
            )}
          </ul>
        </div>
      )}

      {/* pace, from their own logs */}
      {paces.length > 0 && (
        <div>
          <div className="label mb-1">הקצב שלך ב-8 השבועות האחרונים</div>
          <div className="flex flex-wrap gap-1.5">
            {paces.map((p) => (
              <span key={p.sport} className="chip text-xs gap-1">
                <Icon name={p.sport} className="w-3.5 h-3.5" />
                {sportLabel[p.sport]} {pace(p.easyMinPerUnit, p.sport)}
                <span className="text-muted">
                  {p.sport === 'swim' ? '/100מ׳' : `/${sportUnit(p.sport)}`}
                </span>
              </span>
            ))}
          </div>
          <p className="text-muted text-xs mt-1.5 leading-relaxed">
            זה מה שביצעת בפועל, לא תחזית למרוץ. צא בקצב שאתה יודע שאתה מחזיק —
            במיוחד בריצה אחרי האופניים, שם קל מדי לצאת מהר.
          </p>
        </div>
      )}

      <ul className="text-muted text-xs leading-relaxed grid gap-1 list-disc pr-4">
        {taperRules(days).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    </div>
  )
}
