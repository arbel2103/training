import { useMemo, useState } from 'react'
import { useStore, type Sport } from '../../store/useStore'
import { formatDuration, formatPace, sportUnit } from '../../lib/calc'
import { sportEntries, summarize, trend } from '../../lib/garmin/activityStats'
import { sportLabel } from '../../lib/labels'
import Segmented from '../../components/ui/Segmented'
import LineChart from '../../components/ui/LineChart'
import Modal from '../../components/ui/Modal'
import ListView from '../Tracking/ListView'
import { addDays, toISODate } from '../../lib/dates'

type Period = '30' | 'all' | 'custom'

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
  const [period, setPeriod] = useState<Period>('30')
  const [from, setFrom] = useState(() => toISODate(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => toISODate(new Date()))
  const [listOpen, setListOpen] = useState(false)

  const entries = useMemo(() => {
    const cutoff30 = toISODate(addDays(new Date(), -30))
    const inPeriod = (date: string): boolean => {
      if (period === 'all') return true
      if (period === 'custom') {
        return (!from || date >= from) && (!to || date <= to)
      }
      return date >= cutoff30
    }
    return sportEntries(log, sport).filter((e) => inPeriod(e.date))
  }, [log, sport, period, from, to])
  const summary = useMemo(() => summarize(entries, sport), [entries, sport])

  const paceTrend = trend(entries, sport === 'bike' ? 'speedKmh' : 'paceSec')
  const hrTrend = trend(entries, 'avgHr')
  const cadenceTrend = trend(entries, 'cadence')

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={sport}
          onChange={setSport}
          options={[
            { value: 'run', label: `🏃 ${sportLabel.run}` },
            { value: 'bike', label: `🚴 ${sportLabel.bike}` },
            { value: 'swim', label: `🏊 ${sportLabel.swim}` },
          ]}
        />
        <div className="flex items-center gap-2 flex-wrap">
          <Segmented
            value={period}
            onChange={setPeriod}
            size="sm"
            options={[
              { value: '30', label: '30 יום' },
              { value: 'all', label: 'הכל' },
              { value: 'custom', label: 'מותאם' },
            ]}
          />
          <button onClick={() => setListOpen(true)} className="btn-ghost text-sm py-1.5">
            📋 כל האימונים
          </button>
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="label">מתאריך</span>
            <input
              type="date"
              className="input text-sm"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>
          <label className="block">
            <span className="label">עד תאריך</span>
            <input
              type="date"
              className="input text-sm"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>
        </div>
      )}

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

      <Modal
        open={listOpen}
        onClose={() => setListOpen(false)}
        title="📋 כל האימונים"
        maxWidth="max-w-3xl"
      >
        <ListView />
      </Modal>
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
