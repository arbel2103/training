import { useState } from 'react'
import { useStore } from '../../store/useStore'
import {
  analyzePeriod,
  type AerobicStats,
  type CatStats,
} from '../../lib/analysis'
import { resolvePeriod, toISODate, type PeriodKind } from '../../lib/dates'
import { formatDuration, sportUnit } from '../../lib/calc'
import { SPORTS, sportColorVar, sportIcon, sportLabel } from '../../lib/labels'
import Segmented from '../../components/ui/Segmented'

const round1 = (n: number) => Math.round(n * 10) / 10

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 py-1.5 border-b border-line last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function StatCard({
  title,
  icon,
  color,
  stats,
  aerobic,
  unit,
}: {
  title: string
  icon: string
  color: string
  stats: CatStats
  aerobic?: AerobicStats
  unit?: string
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <h3 className="font-display text-xl font-bold" style={{ color }}>
          {title}
        </h3>
      </div>
      <Stat label="ממוצע אימונים שבועי" value={String(round1(stats.weeklyAvgCount))} />
      <Stat
        label="ממוצע משך שבועי"
        value={formatDuration(stats.weeklyAvgDuration)}
      />
      {aerobic && unit && (
        <Stat
          label="ממוצע מרחק שבועי"
          value={`${round1(aerobic.weeklyAvgDistance)} ${unit}`}
        />
      )}
      <Stat label='סה"כ אימונים' value={String(stats.count)} />
      <Stat label='סה"כ משך' value={formatDuration(stats.totalDuration)} />
      {aerobic && unit && (
        <Stat
          label='סה"כ מרחק'
          value={`${round1(aerobic.totalDistance)} ${unit}`}
        />
      )}
    </div>
  )
}

export default function AnalysisView() {
  const log = useStore((s) => s.log)
  const [kind, setKind] = useState<PeriodKind>('week')
  const today = toISODate(new Date())
  const [custom, setCustom] = useState({ start: today, end: today })

  const { start, end } = resolvePeriod(kind, custom)
  const a = analyzePeriod(log, start, end)

  return (
    <div>
      <div className="card p-4 mb-6 flex flex-wrap items-center gap-4">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'week', label: 'שבוע' },
            { value: 'month', label: 'חודש' },
            { value: 'custom', label: 'מותאם' },
          ]}
        />
        {kind === 'custom' && (
          <div className="flex items-end gap-3">
            <div>
              <label className="label">מתאריך</label>
              <input
                type="date"
                dir="ltr"
                className="input"
                value={custom.start}
                onChange={(e) => setCustom((c) => ({ ...c, start: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">עד תאריך</label>
              <input
                type="date"
                dir="ltr"
                className="input"
                value={custom.end}
                onChange={(e) => setCustom((c) => ({ ...c, end: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* totals (not in a sport card) */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="chip text-base">
          סה"כ אימונים בתקופה: <b className="mr-1">{a.totals.all}</b>
        </div>
        <div className="chip" style={{ color: 'rgb(var(--c-strength))' }}>
          כוח: <b className="mr-1">{a.totals.strength}</b>
        </div>
        <div className="chip" style={{ color: 'rgb(var(--c-swim))' }}>
          אירובי: <b className="mr-1">{a.totals.aerobic}</b>
        </div>
        <div className="chip" style={{ color: 'rgb(var(--c-other))' }}>
          אחר: <b className="mr-1">{a.totals.other}</b>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="כוח"
          icon="💪"
          color="rgb(var(--c-strength))"
          stats={a.strength}
        />
        {SPORTS.map((s) => (
          <StatCard
            key={s}
            title={sportLabel[s]}
            icon={sportIcon[s]}
            color={sportColorVar[s]}
            stats={a.aerobic[s]}
            aerobic={a.aerobic[s]}
            unit={sportUnit(s)}
          />
        ))}
        <StatCard
          title="אחר"
          icon="✨"
          color="rgb(var(--c-other))"
          stats={a.other}
        />
      </div>
    </div>
  )
}
