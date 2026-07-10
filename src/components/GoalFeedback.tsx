import type { GoalResult } from '../lib/analysis'
import { sportLabel } from '../lib/labels'
import { sportUnit } from '../lib/calc'

const statusStyle: Record<GoalResult['status'], { label: string; cls: string }> = {
  met: { label: 'עומד ביעד', cls: 'bg-bike/10 text-bike border-bike/30' },
  under: { label: 'מתחת ליעד', cls: 'bg-run/10 text-run border-run/30' },
  over: { label: 'מעל היעד', cls: 'bg-swim/10 text-swim border-swim/30' },
}

export default function GoalFeedback({ results }: { results: GoalResult[] }) {
  if (results.length === 0) {
    return (
      <p className="text-muted text-sm">
        אין עדיין יעדי מרחק לשבוע זה בתוכנית. בקש מ<b>המאמן</b> (🏋️) לבנות תוכנית,
        או שהשבוע הזה הוא מנוחה.
      </p>
    )
  }
  return (
    <div className="grid gap-2.5">
      {results.map((r) => {
        const s = statusStyle[r.status]
        const unit = sportUnit(r.sport)
        const gap = Math.round(Math.abs(r.done - r.target) * 10) / 10
        const advice =
          r.status === 'under'
            ? `חסרים ${gap} ${unit} — כדאי להוסיף.`
            : r.status === 'over'
              ? `${gap} ${unit} מעל היעד — אפשר להפחית מעט.`
              : 'יפה, בדיוק בטווח.'
        return (
          <div
            key={r.sport}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${s.cls}`}
          >
            <div className="font-semibold">{sportLabel[r.sport]}</div>
            <div className="text-sm flex items-center gap-3">
              <span>
                בוצע {Math.round(r.done * 10) / 10} / יעד {r.target} {unit}
              </span>
              <span className="chip bg-surface/70">{s.label}</span>
            </div>
            <div className="text-sm hidden sm:block opacity-80">{advice}</div>
          </div>
        )
      })}
    </div>
  )
}
