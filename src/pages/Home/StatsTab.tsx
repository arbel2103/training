import { useMemo, useState } from 'react'
import { useStore, type Sport, type WorkoutEntry } from '../../store/useStore'
import { formatDuration, formatPace, sportUnit } from '../../lib/calc'
import {
  otherEntries,
  sportEntries,
  strengthEntries,
  summarize,
  summarizeOther,
  summarizeStrength,
  trend,
} from '../../lib/garmin/activityStats'
import { sportLabel } from '../../lib/labels'
import BarChart from '../../components/ui/BarChart'
import { formatDayMonth, startOfWeek } from '../../lib/dates'
import Segmented from '../../components/ui/Segmented'
import Icon from '../../components/ui/Icon'
import LineChart from '../../components/ui/LineChart'
import Modal from '../../components/ui/Modal'
import InfoTip from '../../components/ui/InfoTip'
import ListView from '../Tracking/ListView'
import { addDays, toISODate } from '../../lib/dates'

type Period = '30' | 'all' | 'custom'
type StatKind = Sport | 'strength' | 'other'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink/5 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-display text-xl font-bold mt-0.5">{value}</div>
    </div>
  )
}

function ChartCard({
  title,
  info,
  children,
}: {
  title: string
  info?: string
  children: React.ReactNode
}) {
  return (
    <div className="card p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-1.5">
        {title}
        {info && <InfoTip text={info} />}
      </h4>
      {children}
    </div>
  )
}

export default function StatsTab() {
  const log = useStore((s) => s.log)
  const [kind, setKind] = useState<StatKind>('run')
  const [period, setPeriod] = useState<Period>('30')
  const [from, setFrom] = useState(() => toISODate(addDays(new Date(), -30)))
  const [to, setTo] = useState(() => toISODate(new Date()))
  const [listOpen, setListOpen] = useState(false)

  const inPeriod = useMemo(() => {
    const cutoff30 = toISODate(addDays(new Date(), -30))
    return (date: string): boolean => {
      if (period === 'all') return true
      if (period === 'custom') return (!from || date >= from) && (!to || date <= to)
      return date >= cutoff30
    }
  }, [period, from, to])

  const sport = kind === 'strength' || kind === 'other' ? 'run' : kind
  const entries = useMemo(
    () =>
      kind === 'strength' || kind === 'other'
        ? ([] as WorkoutEntry[])
        : sportEntries(log, kind).filter((e) => inPeriod(e.date)),
    [log, kind, inPeriod],
  )
  const summary = useMemo(() => summarize(entries, sport), [entries, sport])

  const paceTrend = trend(entries, sport === 'bike' ? 'speedKmh' : 'paceSec')
  const hrTrend = trend(entries, 'avgHr')
  const cadenceTrend = trend(entries, 'cadence')

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          value={kind}
          onChange={setKind}
          options={[
            { value: 'run', label: sportLabel.run },
            { value: 'bike', label: sportLabel.bike },
            { value: 'swim', label: sportLabel.swim },
            { value: 'strength', label: 'כוח' },
            { value: 'other', label: 'אחר' },
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
          <button onClick={() => setListOpen(true)} className="btn-ghost text-sm py-1.5 gap-1.5">
            <Icon name="clipboard" className="w-4 h-4" /> כל האימונים
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

      {kind === 'strength' ? (
        <StrengthStats log={log} inPeriod={inPeriod} />
      ) : kind === 'other' ? (
        <OtherStats log={log} inPeriod={inPeriod} />
      ) : entries.length === 0 ? (
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

          <ChartCard
            title={sport === 'bike' ? 'מהירות (קמ״ש)' : 'קצב'}
            info={
              sport === 'bike'
                ? 'המהירות הממוצעת בכל רכיבה לאורך התקופה. מגמת עלייה = שיפור בכושר הרכיבה.'
                : sport === 'swim'
                  ? 'הקצב הממוצע ל-100 מ׳ בכל שחייה. ככל שהקו יורד — אתה שוחה מהר יותר.'
                  : 'הקצב הממוצע לק״מ בכל ריצה. ככל שהקו יורד — אתה רץ מהר יותר.'
            }
          >
            <LineChart
              data={paceTrend}
              format={sport === 'bike' ? undefined : formatPace}
            />
          </ChartCard>

          {hrTrend.length > 0 && (
            <ChartCard
              title="דופק ממוצע לאימון"
              info="הדופק הממוצע בכל אימון. אם הדופק יורד באותו קצב/מהירות לאורך זמן — הלב מתייעל והכושר משתפר."
            >
              <LineChart data={hrTrend} />
            </ChartCard>
          )}

          {cadenceTrend.length > 0 && (
            <ChartCard
              title="קדנס"
              info="קצב התנועה: צעדים לדקה בריצה (אידיאלי ~170–180), סיבובי דוושה בדקה ברכיבה (~80–90), או משיכות בדקה בשחייה."
            >
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
        title="כל האימונים"
        maxWidth="max-w-3xl"
      >
        <ListView />
      </Modal>
    </div>
  )
}

function StrengthStats({
  log,
  inPeriod,
}: {
  log: WorkoutEntry[]
  inPeriod: (date: string) => boolean
}) {
  const entries = useMemo(
    () => strengthEntries(log).filter((e) => inPeriod(e.date)),
    [log, inPeriod],
  )

  // the calendar weeks the period actually spans, for a per-week bar chart
  const weekStarts = useMemo(() => {
    if (entries.length === 0) return []
    const first = startOfWeek(new Date(entries[0].date + 'T00:00:00'))
    const last = startOfWeek(new Date(entries[entries.length - 1].date + 'T00:00:00'))
    const out: string[] = []
    for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 7)) {
      out.push(toISODate(new Date(d)))
    }
    return out.slice(-16)
  }, [entries])

  const s = useMemo(
    () => summarizeStrength(entries, weekStarts),
    [entries, weekStarts],
  )

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">
        אין אימוני כוח בתקופה הזו.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="אימונים" value={String(s.count)} />
        <Stat label="ממוצע לשבוע" value={String(s.perWeek)} />
        <Stat label="זמן כולל" value={formatDuration(s.totalDurationMin)} />
        {s.avgDurationMin != null && (
          <Stat label="משך ממוצע" value={formatDuration(s.avgDurationMin)} />
        )}
      </div>

      {weekStarts.length > 1 && (
        <ChartCard
          title="אימוני כוח בשבוע"
          info="כמה אימוני כוח ביצעת בכל שבוע. עקביות של 2–3 בשבוע היא הבסיס לחיזוק ומניעת פציעות בטריאתלון."
        >
          <BarChart
            data={s.weeks.map((w) => ({
              label: formatDayMonth(new Date(w.weekStart + 'T00:00:00')),
              value: w.count,
            }))}
            color="var(--c-strength)"
          />
        </ChartCard>
      )}

    </>
  )
}

function OtherStats({
  log,
  inPeriod,
}: {
  log: WorkoutEntry[]
  inPeriod: (date: string) => boolean
}) {
  const entries = useMemo(
    () => otherEntries(log).filter((e) => inPeriod(e.date)),
    [log, inPeriod],
  )

  const weekStarts = useMemo(() => {
    if (entries.length === 0) return []
    const first = startOfWeek(new Date(entries[0].date + 'T00:00:00'))
    const last = startOfWeek(new Date(entries[entries.length - 1].date + 'T00:00:00'))
    const out: string[] = []
    for (const d = new Date(first); d <= last; d.setDate(d.getDate() + 7)) {
      out.push(toISODate(new Date(d)))
    }
    return out.slice(-16)
  }, [entries])

  const s = useMemo(() => summarizeOther(entries, weekStarts), [entries, weekStarts])

  if (entries.length === 0) {
    return (
      <div className="card p-8 text-center text-muted">
        אין אימונים אחרים בתקופה הזו. כל אימון שאינו ריצה/רכיבה/שחייה/כוח נכנס לכאן.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="אימונים" value={String(s.count)} />
        <Stat label="ממוצע לשבוע" value={String(s.perWeek)} />
        <Stat label="זמן כולל" value={formatDuration(s.totalDurationMin)} />
        {s.avgDurationMin != null && (
          <Stat label="משך ממוצע" value={formatDuration(s.avgDurationMin)} />
        )}
      </div>

      {s.byName.length > 0 && (
        <div className="card p-5">
          <h4 className="font-semibold mb-3">לפי סוג פעילות</h4>
          <div className="grid gap-1.5">
            {s.byName.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between rounded-xl bg-ink/5 px-3 py-2 text-sm"
              >
                <span className="font-medium">{r.name}</span>
                <span className="text-muted">{r.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {weekStarts.length > 1 && (
        <ChartCard
          title="אימונים אחרים בשבוע"
          info="כמה אימונים אחרים (שאינם ריצה/רכיבה/שחייה/כוח) ביצעת בכל שבוע."
        >
          <BarChart
            data={s.weeks.map((w) => ({
              label: formatDayMonth(new Date(w.weekStart + 'T00:00:00')),
              value: w.count,
            }))}
            color="var(--c-run)"
          />
        </ChartCard>
      )}
    </>
  )
}

function RunDynamics({ entries }: { entries: ReturnType<typeof sportEntries> }) {
  const gct = trend(entries, 'gct')
  const vo = trend(entries, 'verticalOscillation')
  if (gct.length === 0 && vo.length === 0) return null
  return (
    <>
      {gct.length > 0 && (
        <ChartCard
          title="זמן מגע עם הקרקע (ms)"
          info="כמה מילישניות כף הרגל נוגעת בקרקע בכל צעד. זמן קצר יותר (בד״כ מתחת ל-250ms) מעיד על ריצה יעילה וקפיצית יותר."
        >
          <LineChart data={gct} />
        </ChartCard>
      )}
      {vo.length > 0 && (
        <ChartCard
          title="תנודה אנכית (ס״מ)"
          info="כמה הגוף קופץ למעלה-למטה בכל צעד. פחות תנודה = יותר אנרגיה מופנית קדימה במקום למעלה. טווח טוב: 6–9 ס״מ."
        >
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
    <ChartCard
      title="הספק ממוצע (וואט)"
      info="הכוח שאתה מפיק על הדוושות. המדד האובייקטיבי ביותר לרכיבה — לא מושפע מרוח או שיפוע כמו מהירות."
    >
      <LineChart data={power} />
    </ChartCard>
  )
}

function SwimEfficiency({ entries }: { entries: ReturnType<typeof sportEntries> }) {
  const swolf = trend(entries, 'swolf')
  if (swolf.length === 0) return null
  return (
    <ChartCard
      title="SWOLF (יעילות שחייה)"
      info="זמן הבריכה בשניות + מספר המשיכות. מספר נמוך יותר = שחייה יעילה יותר (מתקדם רחוק יותר עם פחות משיכות)."
    >
      <LineChart data={swolf} />
    </ChartCard>
  )
}
