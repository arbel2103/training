import { useState } from 'react'
import { useStore } from '../../store/useStore'
import { hasGarminSetup } from '../../lib/garmin/pat'
import Segmented from '../../components/ui/Segmented'
import BarChart from '../../components/ui/BarChart'
import LineChart from '../../components/ui/LineChart'
import MultiLineChart from '../../components/ui/MultiLineChart'
import {
  GarminConnectPrompt,
  GarminEmpty,
  GarminRefreshChip,
} from '../../components/garmin/GarminDataHeader'

type Range = '7' | '30'

function dayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

export default function DailyHealthTab() {
  const daily = useStore((s) => s.garminDaily)
  const [range, setRange] = useState<Range>('7')

  if (!hasGarminSetup()) return <GarminConnectPrompt />

  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) {
    return (
      <>
        <GarminRefreshChip />
        <GarminEmpty label="בריאות" />
      </>
    )
  }

  const days = sorted.slice(range === '7' ? -7 : -30)
  const labels = days.map((d) => dayLabel(d.date))

  const steps = days.filter((d) => d.steps != null).map((d) => ({ label: dayLabel(d.date), value: d.steps! }))
  const rhr = days.filter((d) => d.restingHr != null).map((d) => ({ label: dayLabel(d.date), value: d.restingHr! }))

  const hrv = [
    { name: 'HRV בלילה', color: 'var(--accent)', values: days.map((d) => d.hrvLastNight ?? null) },
    { name: 'בסיס שבועי', color: 'var(--muted)', dashed: true, values: days.map((d) => d.hrvWeeklyAvg ?? null) },
  ]

  const hasHrv = hrv.some((s) => s.values.some((v) => v != null))

  // VO2max moves slowly, so always chart the full history rather than the range
  const vo2 = sorted
    .filter((d) => d.vo2max != null)
    .map((d) => ({ label: dayLabel(d.date), value: d.vo2max! }))
  const vo2Latest = vo2.length ? vo2[vo2.length - 1].value : null
  const vo2First = vo2.length ? vo2[0].value : null
  const vo2Delta = vo2Latest != null && vo2First != null ? vo2Latest - vo2First : null

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <GarminRefreshChip />
        <Segmented
          value={range}
          onChange={setRange}
          size="sm"
          options={[
            { value: '7', label: '7 ימים' },
            { value: '30', label: '30 ימים' },
          ]}
        />
      </div>

      <div className="card p-5">
        <h4 className="font-semibold mb-3">👟 צעדים</h4>
        <BarChart data={steps} color="var(--accent)" />
      </div>

      <div className="card p-5">
        <h4 className="font-semibold mb-3">❤️ דופק מנוחה</h4>
        <LineChart data={rhr} />
      </div>

      {hasHrv && (
        <div className="card p-5">
          <h4 className="font-semibold mb-3">🫀 HRV מול הבסיס</h4>
          <MultiLineChart labels={labels} series={hrv} />
        </div>
      )}

      {vo2.length > 1 && (
        <div className="card p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
            <h4 className="font-semibold">🫁 VO2max (כושר אירובי)</h4>
            <span className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-black leading-none">
                {vo2Latest}
              </span>
              {vo2Delta != null && Math.abs(vo2Delta) >= 0.1 && (
                <span
                  className={`text-sm font-semibold ${vo2Delta > 0 ? 'text-bike' : 'text-run'}`}
                >
                  {vo2Delta > 0 ? '▲' : '▼'} {Math.abs(vo2Delta).toFixed(1)}
                </span>
              )}
            </span>
          </div>
          <LineChart data={vo2} />
        </div>
      )}
    </div>
  )
}
