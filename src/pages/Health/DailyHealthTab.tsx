import { useStore } from '../../store/useStore'
import { hasGarminSetup } from '../../lib/garmin/pat'
import BarChart from '../../components/ui/BarChart'
import LineChart from '../../components/ui/LineChart'
import MultiLineChart from '../../components/ui/MultiLineChart'
import {
  GarminConnectPrompt,
  GarminEmpty,
  GarminRefreshChip,
} from '../../components/garmin/GarminDataHeader'
import InfoTip from '../../components/ui/InfoTip'
import Icon from '../../components/ui/Icon'
import { usePeriod } from '../../components/ui/usePeriod'

function dayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

export default function DailyHealthTab() {
  const daily = useStore((s) => s.garminDaily)
  const { inPeriod, controls, customInputs } = usePeriod('30')

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

  const days = sorted.filter((d) => inPeriod(d.date))
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
        {controls}
      </div>
      {customInputs}

      <div className="card p-5">
        <h4 className="font-semibold mb-3 flex items-center gap-1.5"><Icon name="steps" className="w-5 h-5 text-muted" /> צעדים <InfoTip text="סך הצעדים בכל יום — מדד פשוט לתנועה הכללית שלך מעבר לאימונים." /></h4>
        <BarChart data={steps} color="var(--accent)" />
      </div>

      <div className="card p-5">
        <h4 className="font-semibold mb-3 flex items-center gap-1.5"><Icon name="heart" className="w-5 h-5 text-run" /> דופק מנוחה <InfoTip text="הדופק הנמוך ביותר במנוחה. ירידה לאורך זמן = שיפור בכושר; קפיצה פתאומית של 5+ פעימות = עומס, חוסר שינה או מחלה מתקרבת." /></h4>
        <LineChart data={rhr} />
      </div>

      {hasHrv && (
        <div className="card p-5">
          <h4 className="font-semibold mb-3 flex items-center gap-1.5"><Icon name="hrv" className="w-5 h-5 text-muted" /> HRV מול הבסיס <InfoTip text="שונות הדופק בלילה — מדד ההתאוששות המרכזי. הקו המקווקו הוא הבסיס האישי שלך; לילה מתחת לבסיס = הגוף עדיין מתאושש, שקול יום קל." /></h4>
          <MultiLineChart labels={labels} series={hrv} />
        </div>
      )}

      {vo2.length > 1 && (
        <div className="card p-5">
          <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
            <h4 className="font-semibold flex items-center gap-1.5"><Icon name="lungs" className="w-5 h-5 text-muted" /> VO2max (כושר אירובי) <InfoTip text="צריכת החמצן המרבית — המדד המרכזי לכושר אירובי. עולה לאט (שבועות-חודשים), וכל עלייה של נקודה היא שיפור אמיתי." /></h4>
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
