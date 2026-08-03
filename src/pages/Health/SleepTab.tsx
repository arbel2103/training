import { useStore } from '../../store/useStore'
import type { DailyHealth } from '../../lib/garmin/types'
import { sleepInsights, type Severity } from '../../lib/sleepInsights'
import { hasGarminSetup } from '../../lib/garmin/pat'
import LineChart from '../../components/ui/LineChart'
import StackedBarChart, { type StackBar } from '../../components/ui/StackedBarChart'
import {
  GarminConnectPrompt,
  GarminEmpty,
  GarminRefreshChip,
} from '../../components/garmin/GarminDataHeader'

const STAGE_COLORS = {
  deep: 'var(--c-swim)',
  light: 'var(--accent)',
  rem: 'var(--c-bike)',
  awake: 'var(--muted)',
}

function hoursLabel(min?: number): string {
  if (!min) return '—'
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function dayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

const severityClass: Record<Severity, string> = {
  good: 'bg-bike/10 text-bike',
  info: 'bg-accent-soft/60 text-ink',
  warn: 'bg-run/10 text-run',
}

export default function SleepTab() {
  const daily = useStore((s) => s.garminDaily)
  const log = useStore((s) => s.log)

  if (!hasGarminSetup()) return <GarminConnectPrompt />

  const withSleep = [...daily]
    .filter((d) => d.sleepMin != null)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (withSleep.length === 0) {
    return (
      <>
        <GarminRefreshChip />
        <GarminEmpty label="שינה" />
      </>
    )
  }

  const latest = withSleep[withSleep.length - 1]
  const last14 = withSleep.slice(-14)

  const stageBars: StackBar[] = last14.map((d: DailyHealth) => ({
    label: dayLabel(d.date),
    segments: [
      { value: d.deepMin ?? 0, color: STAGE_COLORS.deep },
      { value: d.remMin ?? 0, color: STAGE_COLORS.rem },
      { value: d.lightMin ?? 0, color: STAGE_COLORS.light },
      { value: d.awakeMin ?? 0, color: STAGE_COLORS.awake },
    ],
  }))

  const scoreData = withSleep
    .slice(-30)
    .filter((d) => d.sleepScore != null)
    .map((d) => ({ label: dayLabel(d.date), value: d.sleepScore! }))

  const insights = sleepInsights(daily, log)

  const stagePct = (v?: number) =>
    latest.sleepMin && v != null ? Math.round((v / latest.sleepMin) * 100) : null

  return (
    <div className="grid gap-6">
      <GarminRefreshChip />

      {/* last night */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold">הלילה האחרון</h4>
          <span className="text-xs text-muted">{dayLabel(latest.date)}</span>
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          <div className="text-center">
            <div className="font-display text-4xl font-black leading-none">
              {latest.sleepScore ?? '—'}
            </div>
            <div className="text-xs text-muted mt-1">ציון שינה</div>
          </div>
          <div className="text-center">
            <div className="font-display text-4xl font-black leading-none">
              {hoursLabel(latest.sleepMin)}
            </div>
            <div className="text-xs text-muted mt-1">שעות שינה</div>
          </div>
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-2 min-w-[12rem]">
            {[
              { label: 'עמוקה', v: latest.deepMin, c: STAGE_COLORS.deep },
              { label: 'REM', v: latest.remMin, c: STAGE_COLORS.rem },
              { label: 'קלה', v: latest.lightMin, c: STAGE_COLORS.light },
              { label: 'ערות', v: latest.awakeMin, c: STAGE_COLORS.awake },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-ink/5 px-2 py-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-sm"
                    style={{ background: `rgb(${s.c})` }}
                  />
                  <span className="text-xs text-muted">{s.label}</span>
                </div>
                <div className="font-semibold text-sm mt-0.5">
                  {hoursLabel(s.v)}
                  {stagePct(s.v) != null && (
                    <span className="text-muted font-normal"> · {stagePct(s.v)}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* insights */}
      <div className="card p-5">
        <h4 className="font-semibold mb-3">🧠 מאמן השינה</h4>
        <div className="grid gap-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${severityClass[ins.severity]}`}
            >
              <span className="leading-none text-base">{ins.icon}</span>
              <div className="leading-relaxed">
                <span>{ins.text}</span>
                {ins.tip && (
                  <div className="mt-1 flex items-start gap-1.5 text-xs opacity-80">
                    <span>💡</span>
                    <span>{ins.tip}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* stages over time */}
      <div className="card p-5">
        <h4 className="font-semibold mb-3">שלבי שינה (14 ימים)</h4>
        <StackedBarChart
          data={stageBars}
          format={(m) => `${Math.round(m / 60)}ש׳`}
          legend={[
            { label: 'עמוקה', color: STAGE_COLORS.deep },
            { label: 'REM', color: STAGE_COLORS.rem },
            { label: 'קלה', color: STAGE_COLORS.light },
            { label: 'ערות', color: STAGE_COLORS.awake },
          ]}
        />
      </div>

      {/* score trend */}
      <div className="card p-5">
        <h4 className="font-semibold mb-3">ציון שינה (30 ימים)</h4>
        <LineChart data={scoreData} />
      </div>
    </div>
  )
}
