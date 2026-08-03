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

  const bbStress = [
    { name: 'סוללת גוף (מקס׳)', color: 'var(--c-bike)', values: days.map((d) => d.bodyBatteryHigh ?? null) },
    { name: 'סוללת גוף (מינ׳)', color: 'var(--c-swim)', values: days.map((d) => d.bodyBatteryLow ?? null) },
    { name: 'לחץ ממוצע', color: 'var(--c-run)', values: days.map((d) => d.stressAvg ?? null) },
  ]

  const hrv = [
    { name: 'HRV אחרון', color: 'var(--c-bike)', values: days.map((d) => d.hrvLastNight ?? null) },
    { name: 'בסיס שבועי', color: 'var(--muted)', values: days.map((d) => d.hrvWeeklyAvg ?? null) },
  ]

  const hasBbStress = bbStress.some((s) => s.values.some((v) => v != null))
  const hasHrv = hrv.some((s) => s.values.some((v) => v != null))

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

      {hasBbStress && (
        <div className="card p-5">
          <h4 className="font-semibold mb-3">🔋 סוללת גוף ולחץ</h4>
          <MultiLineChart labels={labels} series={bbStress} />
        </div>
      )}

      {hasHrv && (
        <div className="card p-5">
          <h4 className="font-semibold mb-3">🫀 HRV מול הבסיס</h4>
          <MultiLineChart labels={labels} series={hrv} />
        </div>
      )}
    </div>
  )
}
