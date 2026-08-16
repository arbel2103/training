import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { addDays, startOfWeek, toISODate } from '../../lib/dates'
import {
  MEV,
  MRV,
  MUSCLE_GROUPS,
  muscleLabel,
  volumeByMuscle,
  volumeZone,
} from '../../lib/strength'
import InfoTip from '../ui/InfoTip'

const ZONE_STYLE = {
  under: { bar: 'bg-muted/40', text: 'text-muted' },
  working: { bar: 'bg-accent', text: 'text-accent' },
  over: { bar: 'bg-run', text: 'text-run' },
} as const

/**
 * Weekly sets per muscle group — the number that actually decides whether a
 * muscle grows.
 *
 * Counted in hard sets rather than kilos, because sets per week is the unit the
 * volume-landmark research is stated in, and because it survives an exercise
 * being swapped for a harder one. A muscle you never tag simply doesn't appear —
 * so untagged sets are called out rather than quietly dropped.
 */
export default function WeeklyVolume() {
  const log = useStore((s) => s.log)
  const [weeksBack, setWeeksBack] = useState(0)

  const start = addDays(startOfWeek(new Date()), -7 * weeksBack)
  const from = toISODate(start)
  const to = toISODate(addDays(start, 6))

  const { byMuscle, untaggedSets } = volumeByMuscle(log, from, to)
  const trained = MUSCLE_GROUPS.filter((m) => byMuscle[m] > 0)
  const totalSets = MUSCLE_GROUPS.reduce((t, m) => t + byMuscle[m], 0)

  // scale so the MRV marker sits at a constant place and bars stay comparable
  const scaleMax = Math.max(MRV + 4, ...MUSCLE_GROUPS.map((m) => byMuscle[m]))
  const pctOf = (n: number) => `${(n / scaleMax) * 100}%`

  return (
    <div className="card p-4 mb-5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display font-bold">נפח שבועי לפי שריר</h3>
          <InfoTip
            text={`סטים לשבוע לכל קבוצת שריר. מתחת ל-${MEV} סטים זה בדרך כלל מעט מדי כדי לגרות גדילה, ${MEV}–${MRV} הוא הטווח שבו רוב האנשים מתקדמים, ומעל ${MRV} מצטברת עייפות מהר יותר ממה שמספיקים להתאושש ממנה. אלה מספרי ייחוס כלליים — הטווח האישי שלך יכול להיות שונה.`}
          />
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeeksBack((w) => w + 1)}
            className="text-muted hover:text-ink px-1.5"
            aria-label="שבוע קודם"
          >
            ›
          </button>
          <span className="text-xs text-muted tabular-nums">
            {weeksBack === 0 ? 'השבוע' : `לפני ${weeksBack} שבועות`}
          </span>
          <button
            onClick={() => setWeeksBack((w) => Math.max(0, w - 1))}
            disabled={weeksBack === 0}
            className="text-muted hover:text-ink px-1.5 disabled:opacity-30"
            aria-label="שבוע הבא"
          >
            ‹
          </button>
        </div>
      </div>

      {totalSets === 0 && untaggedSets === 0 ? (
        <p className="text-sm text-muted mt-3">
          אין סטים רשומים בשבוע הזה. התחל <b>אימון פעיל</b> כדי לרשום סטים —
          הנפח יתמלא מעצמו.
        </p>
      ) : (
        <>
          <div className="text-xs text-muted mb-3">
            {totalSets === 1 ? 'סט אחד' : `${totalSets} סטים`} ·{' '}
            {trained.length === 1 ? 'קבוצת שריר אחת' : `${trained.length} קבוצות שריר`}
          </div>

          <div className="grid gap-2">
            {MUSCLE_GROUPS.map((m) => {
              const n = byMuscle[m]
              const zone = volumeZone(n)
              const style = ZONE_STYLE[zone]
              return (
                <div key={m} className="flex items-center gap-2">
                  <span className="text-xs text-muted w-16 shrink-0 truncate">
                    {muscleLabel[m]}
                  </span>
                  <div className="relative flex-1 h-3 rounded-full bg-line/60 overflow-hidden">
                    {/* the working band, drawn behind the bar as a reference */}
                    <div
                      className="absolute inset-y-0 bg-accent/10"
                      style={{ right: pctOf(MEV), width: pctOf(MRV - MEV) }}
                    />
                    <div
                      className={`absolute inset-y-0 right-0 rounded-full ${style.bar} transition-[width]`}
                      style={{ width: pctOf(n) }}
                    />
                  </div>
                  <span
                    className={`text-xs tabular-nums w-6 text-left shrink-0 ${
                      n === 0 ? 'text-muted/50' : style.text
                    }`}
                  >
                    {n}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3 mt-3 text-[10px] text-muted">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-muted/40" /> מתחת ל-{MEV}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-accent" /> {MEV}–{MRV}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-run" /> מעל {MRV}
            </span>
          </div>

          {untaggedSets > 0 && (
            <p className="text-xs text-muted mt-3 border-t border-line pt-3">
              {untaggedSets === 1
                ? 'סט אחד לא נספר כי התרגיל לא משויך לקבוצת שריר.'
                : `${untaggedSets} סטים לא נספרו כי התרגיל לא משויך לקבוצת שריר.`}{' '}
              פתח תרגיל ולחץ על <b>שייך לקבוצת שריר</b>.
            </p>
          )}
        </>
      )}
    </div>
  )
}
