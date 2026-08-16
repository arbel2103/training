import PageHeader from '../../../components/ui/PageHeader'
import Icon from '../../../components/ui/Icon'
import { addDays, fromISO, toISODate } from '../../../lib/dates'
import { useStore } from '../store/useStore'
import { useStore as useTriStore } from '../../../store/useStore'
import {
  MIN_GROUP,
  buildDayFacts,
  coverage,
  dailyCompletion,
  findInsights,
  type Comparison,
} from '../lib/insights'
import Heatmap, { HeatmapLegend } from '../components/Heatmap'

/**
 * What the habit data looks like against training and sleep.
 *
 * The numbers come from TriLife's store — same bundle, same device, so this is
 * a direct read rather than a sync. Everything shown is a difference between
 * two groups of days, never a claim about cause.
 */
export default function InsightsPage() {
  const habits = useStore((s) => s.habits)
  const freezes = useStore((s) => s.freezes)
  const dayNotes = useStore((s) => s.dayNotes)
  const garminDaily = useTriStore((s) => s.garminDaily)
  const log = useTriStore((s) => s.log)

  const today = toISODate(new Date())
  const days = buildDayFacts(habits, freezes, garminDaily, log, today)
  const insights = findInsights(days, habits, freezes)
  const cover = coverage(days)

  const heat = dailyCompletion(
    habits,
    freezes,
    toISODate(addDays(fromISO(today), -(26 * 7 - 1))),
    today,
  )

  const notes = Object.entries(dayNotes).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div>
      <PageHeader title="תובנות" subtitle="מה הנתונים אומרים על ההרגלים שלך." />

      {/* overall heat map */}
      <div className="card p-4 mb-4">
        <h3 className="font-display text-lg font-bold mb-3">חצי שנה אחרונה</h3>
        <div className="overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          <Heatmap cells={heat} today={today} weeks={26} />
        </div>
        <div className="mt-2.5">
          <HeatmapLegend />
        </div>
      </div>

      {/* correlations */}
      <div className="card p-4 mb-4">
        <h3 className="font-display text-lg font-bold mb-1">הרגלים מול אימונים ושינה</h3>
        <p className="text-xs text-muted leading-relaxed mb-3">
          השוואה בין ימים שבהם ההרגל בוצע לימים שלא. זו תצפית, לא הוכחה לסיבתיות —
          ומוצגים רק ממצאים עם לפחות {MIN_GROUP} ימים בכל צד.
        </p>

        {insights.length === 0 ? (
          <div className="text-sm text-muted leading-relaxed">
            עוד אין מספיק נתונים.{' '}
            {cover.withSleep === 0
              ? 'חבר את גרמין ב-TriLife כדי שנוכל להשוות מול שינה.'
              : `יש ${cover.withHabits} ימים עם הרגלים ו-${cover.withSleep} ימים עם נתוני שינה — המשך לסמן ונתחיל להראות מגמות.`}
          </div>
        ) : (
          <div className="grid gap-2">
            {insights.slice(0, 8).map((c, i) => (
              <InsightRow key={i} c={c} />
            ))}
          </div>
        )}
      </div>

      {/* day notes history */}
      <div className="card p-4">
        <h3 className="font-display text-lg font-bold mb-3">הערות יומיות</h3>
        {notes.length === 0 ? (
          <p className="text-sm text-muted leading-relaxed">
            בימים שלא סגרת את כל ההרגלים תוכל להוסיף הערה קצרה — היא תופיע כאן,
            וכך אפשר לראות מה חוזר על עצמו.
          </p>
        ) : (
          <div className="grid gap-2">
            {notes.slice(0, 30).map(([date, text]) => (
              <div key={date} className="rounded-xl border border-line px-3 py-2">
                <div className="text-xs text-muted">{date}</div>
                <div className="text-sm leading-relaxed mt-0.5">{text}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function InsightRow({ c }: { c: Comparison }) {
  const good = c.higherIsBetter ? c.delta > 0 : c.delta < 0
  const sign = c.delta > 0 ? '+' : '−'
  const size = Math.abs(c.delta)

  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-sm min-w-0 truncate">{c.subject}</span>
        <span
          className={`font-display font-black text-lg shrink-0 tabular-nums ${
            good ? 'text-bike' : 'text-run'
          }`}
          dir="ltr"
        >
          {sign}
          {size}
          {c.unit === '%' ? '%' : ''}
        </span>
      </div>
      <div className="text-xs text-muted leading-relaxed mt-0.5">
        {c.metric} {c.unit && c.unit !== '%' ? `(${c.unit}) ` : ''}
        <span className="tabular-nums" dir="ltr">
          {c.withAvg}
        </span>{' '}
        {c.withLabel} מול{' '}
        <span className="tabular-nums" dir="ltr">
          {c.withoutAvg}
        </span>{' '}
        {c.withoutLabel}
      </div>
      <div className="text-[11px] text-muted/70 mt-1 flex items-center gap-1">
        <Icon name="chart" className="w-3 h-3" />
        {c.withN} מול {c.withoutN} ימים
      </div>
    </div>
  )
}
