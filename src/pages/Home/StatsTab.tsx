import { useMemo, useState } from 'react'
import { useStore, type Sport } from '../../store/useStore'
import { formatDuration, formatPace, sportUnit } from '../../lib/calc'
import { sportEntries, summarize, trend } from '../../lib/garmin/activityStats'
import { sportLabel } from '../../lib/labels'
import Segmented from '../../components/ui/Segmented'
import LineChart from '../../components/ui/LineChart'
import TrainingLoadCard from './TrainingLoadCard'
import ZoneDistributionCard from './ZoneDistributionCard'

type Period = '30' | '90' | 'all'

function withinPeriod(date: string, period: Period): boolean {
  if (period === 'all') return true
  const days = period === '30' ? 30 : 90
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return new Date(date + 'T00:00:00') >= cutoff
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink/5 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-xl font-bold mt-0.5">{value}</div>
    </div>
  )
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h4 className="font-semibold mb-3">{title}</h4>
      {children}
    </div>
  )
}

export default function StatsTab() {
  const log = useStore((s) => s.log)
  const [sport, setSport] = useState<Sport>('run')
  const [period, setPeriod] = useState<Period>('90')

  const entries = useMemo(
    () => sportEntries(log, sport).filter((e) => withinPeriod(e.date, period)),
    [log, sport, period],
  )
  const summary = useMemo(() => summarize(entries, sport), [entries, sport])

  const paceTrend = trend(entries, sport === 'bike' ? 'speedKmh' : 'paceSec')
  const hrTrend = trend(entries, 'avgHr')
  const cadenceTrend = trend(entries, 'cadence')

  return (
    <div className="grid gap-5">
      <TrainingLoadCard />
      <ZoneDistributionCard />

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-5">
        <Segmented
          value={sport}
          onChange={setSport}
          options={[
            { value: 'run', label: `🏃 ${sportLabel.run}` },
            { value: 'bike', label: `🚴 ${sportLabel.bike}` },
            { value: 'swim', label: `🏊 ${sportLabel.swim}` },
          ]}
        />
        <Segmented
          value={period}
          onChange={setPeriod}
          size="sm"
          options={[
            { value: '30', label: '30 יום' },
            { value: '90', label: '90 יום' },
            { value: 'all', label: 'הכל' },
          ]}
        />
      </div>

      {entries.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          אין אימוני {sportLabel[sport]} בתקופה הזו. סנכרן מגרמין או הזן אימון.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Stat label="אימונים" value={String(summary.count)} />
            <Stat
              label={`מרחק כולל (${sportUnit(sport)})`}
              value={String(summary.totalDistance)}
            />
            <Stat label="זמן כולל" value={formatDuration(summary.totalDurationMin)} />
            {summary.avgHr != null && <Stat label="דופק ממוצע" value={`${summary.avgHr}`} />}
            {sport === 'bike'
              ? summary.avgSpeedKmh != null && (
                  <Stat label="מהירות ממוצעת" value={`${summary.avgSpeedKmh} קמ״ש`} />
                )
              : summary.avgPaceSec != null && (
                  <Stat label="קצב ממוצע" value={formatPace(summary.avgPaceSec)} />
                )}
            {summary.avgCadence != null && (
              <Stat label="קדנס ממוצע" value={`${summary.avgCadence}`} />
            )}
          </div>

          <ChartCard title={sport === 'bike' ? 'מהירות (קמ״ש)' : 'קצב'}>
            <LineChart
              data={paceTrend}
              format={sport === 'bike' ? undefined : formatPace}
            />
          </ChartCard>

          {hrTrend.length > 0 && (
            <ChartCard title="דופק ממוצע לאימון">
              <LineChart data={hrTrend} />
            </ChartCard>
          )}

          {cadenceTrend.length > 0 && (
            <ChartCard title="קדנס">
              <LineChart data={cadenceTrend} />
            </ChartCard>
          )}

          {sport === 'run' && (
            <RunDynamics entries={entries} />
          )}
          {sport === 'bike' && <BikePower entries={entries} />}
          {sport === 'swim' && <SwimEfficiency entries={entries} />}
        </>
      )}
    </div>
  )
}

function RunDynamics({ entries }: { entries: ReturnType<typeof sportEntries> }) {
  const gct = trend(entries, 'gct')
  const vo = trend(entries, 'verticalOscillation')
  if (gct.length === 0 && vo.length === 0) return null
  return (
    <>
      {gct.length > 0 && (
        <ChartCard title="זמן מגע עם הקרקע (ms)">
          <LineChart data={gct} />
        </ChartCard>
      )}
      {vo.length > 0 && (
        <ChartCard title="תנודה אנכית (ס״מ)">
          <LineChart data={vo} />
        </ChartCard>
      )}
    </>
  )
}

function BikePower({ entries }: { entries: ReturnType<typeof sportEntries> }) {
  const power = trend(entries, 'power')
  if (power.length === 0) return null
  return (
    <ChartCard title="הספק ממוצע (וואט)">
      <LineChart data={power} />
    </ChartCard>
  )
}

function SwimEfficiency({ entries }: { entries: ReturnType<typeof sportEntries> }) {
  const swolf = trend(entries, 'swolf')
  if (swolf.length === 0) return null
  return (
    <ChartCard title="SWOLF (יעילות שחייה)">
      <LineChart data={swolf} />
    </ChartCard>
  )
}
