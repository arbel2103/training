import { useMemo } from 'react'
import { useStore } from '../../store/useStore'
import { computeAcwr, weeklyLoads } from '../../lib/trainingLoad'
import { formatDayMonth, fromISO } from '../../lib/dates'
import BarChart from '../../components/ui/BarChart'

export default function TrainingLoadCard() {
  const log = useStore((s) => s.log)

  const weeks = useMemo(() => weeklyLoads(log, 12), [log])
  const acwr = useMemo(() => computeAcwr(log), [log])

  const data = weeks.map((w) => ({
    label: formatDayMonth(fromISO(w.weekStart)),
    value: w.load,
  }))
  const hasLoad = weeks.some((w) => w.load > 0)

  if (!hasLoad) {
    return (
      <div className="card p-6 text-center text-muted">
        אין עדיין מספיק אימונים כדי לחשב עומס. הזן אימונים או סנכרן מגרמין.
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h4 className="font-semibold">📈 עומס אימונים</h4>
          <p className="text-xs text-muted mt-0.5">
            עומס שבועי (משך × מאמץ) ב-12 השבועות האחרונים
          </p>
        </div>
        {acwr && (
          <div
            className="rounded-xl px-3 py-1.5 text-center shrink-0"
            style={{ background: `rgb(${acwr.color} / 0.12)` }}
          >
            <div
              className="font-display text-xl font-black leading-none"
              style={{ color: `rgb(${acwr.color})` }}
            >
              {acwr.ratio.toFixed(2)}
            </div>
            <div className="text-[11px] font-semibold" style={{ color: `rgb(${acwr.color})` }}>
              {acwr.label}
            </div>
          </div>
        )}
      </div>

      <BarChart data={data} />

      {acwr && (
        <div className="mt-3 grid gap-2">
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="chip">השבוע: {acwr.acute}</span>
            <span className="chip">ממוצע 4 שבועות: {acwr.chronic}</span>
          </div>
          {/* safe-zone bar: 0.8–1.3 is the commonly cited sweet spot */}
          <div className="relative h-2.5 rounded-full bg-ink/5 overflow-hidden">
            <div
              className="absolute inset-y-0 bg-bike/30"
              style={{ right: `${(0.8 / 2) * 100}%`, width: `${((1.3 - 0.8) / 2) * 100}%` }}
            />
            <div
              className="absolute inset-y-0 w-1 rounded-full"
              style={{
                right: `calc(${(Math.min(acwr.ratio, 2) / 2) * 100}% - 2px)`,
                background: `rgb(${acwr.color})`,
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted">
            <span>2.0</span>
            <span>אזור בטוח 0.8–1.3</span>
            <span>0</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: `rgb(${acwr.color})` }}>
            {acwr.advice}
          </p>
        </div>
      )}
    </div>
  )
}
