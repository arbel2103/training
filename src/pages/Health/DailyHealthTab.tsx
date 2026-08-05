import { useState, type ReactNode } from 'react'
import { useStore, DEFAULT_DAILY_HEALTH_LAYOUT } from '../../store/useStore'
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
import LayoutCustomizer, { orderedIds } from '../../components/ui/LayoutCustomizer'

function dayLabel(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' })
}

const METRIC_LABELS: Record<string, string> = {
  steps: 'צעדים',
  rhr: 'דופק מנוחה',
  hrv: 'HRV מול הבסיס',
  bodyBattery: 'סוללת גוף',
  stress: 'לחץ (Stress)',
  calories: 'קלוריות',
  vo2: 'VO2max',
}

function Section({
  icon,
  iconClass,
  title,
  info,
  children,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  iconClass?: string
  title: string
  info: string
  children: ReactNode
}) {
  return (
    <div className="card p-5">
      <h4 className="font-semibold mb-3 flex items-center gap-1.5">
        <Icon name={icon} className={`w-5 h-5 ${iconClass ?? 'text-muted'}`} /> {title}
        <InfoTip text={info} />
      </h4>
      {children}
    </div>
  )
}

export default function DailyHealthTab() {
  const daily = useStore((s) => s.garminDaily)
  const layout = useStore((s) => s.dailyHealthLayout)
  const setLayout = useStore((s) => s.setDailyHealthLayout)
  const { inPeriod, controls, customInputs } = usePeriod('30')
  const [customizeOpen, setCustomizeOpen] = useState(false)

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
  const bar = (pick: (d: (typeof days)[number]) => number | undefined) =>
    days.filter((d) => pick(d) != null).map((d) => ({ label: dayLabel(d.date), value: pick(d)! }))

  const steps = bar((d) => d.steps)
  const rhr = bar((d) => d.restingHr)
  const stress = bar((d) => d.stressAvg)
  const calories = bar((d) => d.calories)

  const hrv = [
    { name: 'HRV בלילה', color: 'var(--accent)', values: days.map((d) => d.hrvLastNight ?? null) },
    { name: 'בסיס שבועי', color: 'var(--muted)', dashed: true, values: days.map((d) => d.hrvWeeklyAvg ?? null) },
  ]
  const bodyBattery = [
    { name: 'שיא', color: 'var(--c-swim)', values: days.map((d) => d.bodyBatteryHigh ?? null) },
    { name: 'שפל', color: 'var(--c-run)', values: days.map((d) => d.bodyBatteryLow ?? null) },
  ]
  const hasSeries = (s: { values: (number | null)[] }[]) =>
    s.some((x) => x.values.some((v) => v != null))

  // VO2max moves slowly, so always chart the full history rather than the range
  const vo2 = sorted
    .filter((d) => d.vo2max != null)
    .map((d) => ({ label: dayLabel(d.date), value: d.vo2max! }))
  const vo2Latest = vo2.length ? vo2[vo2.length - 1].value : null
  const vo2First = vo2.length ? vo2[0].value : null
  const vo2Delta = vo2Latest != null && vo2First != null ? vo2Latest - vo2First : null

  const metrics: Record<string, ReactNode> = {
    steps: steps.length > 0 && (
      <Section icon="steps" iconClass="text-accent" title="צעדים" info="סך הצעדים בכל יום — מדד פשוט לתנועה הכללית שלך מעבר לאימונים.">
        <BarChart data={steps} color="var(--accent)" />
      </Section>
    ),
    rhr: rhr.length > 0 && (
      <Section icon="heart" iconClass="text-run" title="דופק מנוחה" info="הדופק הנמוך ביותר במנוחה. ירידה לאורך זמן = שיפור בכושר; קפיצה פתאומית של 5+ פעימות = עומס, חוסר שינה או מחלה מתקרבת.">
        <LineChart data={rhr} />
      </Section>
    ),
    hrv: hasSeries(hrv) && (
      <Section icon="hrv" title="HRV מול הבסיס" info="שונות הדופק בלילה — מדד ההתאוששות המרכזי. הקו המקווקו הוא הבסיס האישי שלך; לילה מתחת לבסיס = הגוף עדיין מתאושש, שקול יום קל.">
        <MultiLineChart labels={labels} series={hrv} />
      </Section>
    ),
    bodyBattery: hasSeries(bodyBattery) && (
      <Section icon="battery" title="סוללת גוף" info="מדד האנרגיה של גרמין (0–100): כמה 'דלק' יש לגוף. שיא = כמה נטענת (בעיקר בשינה); שפל = כמה התרוקנת ביום. שפל גבוה עקבי מעיד על התאוששות טובה.">
        <MultiLineChart labels={labels} series={bodyBattery} />
      </Section>
    ),
    stress: stress.length > 0 && (
      <Section icon="brain" title="לחץ (Stress)" info="רמת הלחץ הממוצעת ביום לפי שונות הדופק (0–100). נמוך = רגוע/מאוזן; ימים גבוהים עקביים מרמזים על עומס נפשי/פיזי שמשפיע על ההתאוששות.">
        <LineChart data={stress} />
      </Section>
    ),
    calories: calories.length > 0 && (
      <Section icon="bulb" title="קלוריות" info="סך הקלוריות שנשרפו ביום (מנוחה + פעילות). שימושי למעקב מאזן אנרגטי לצד האימונים והתזונה.">
        <BarChart data={calories} color="var(--c-bike)" />
      </Section>
    ),
    vo2: vo2.length > 1 && (
      <div className="card p-5">
        <div className="flex items-baseline justify-between gap-2 mb-3 flex-wrap">
          <h4 className="font-semibold flex items-center gap-1.5"><Icon name="lungs" className="w-5 h-5 text-muted" /> VO2max (כושר אירובי) <InfoTip text="צריכת החמצן המרבית — המדד המרכזי לכושר אירובי. עולה לאט (שבועות-חודשים), וכל עלייה של נקודה היא שיפור אמיתי." /></h4>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-black leading-none">{vo2Latest}</span>
            {vo2Delta != null && Math.abs(vo2Delta) >= 0.1 && (
              <span className={`text-sm font-semibold ${vo2Delta > 0 ? 'text-bike' : 'text-run'}`}>
                {vo2Delta > 0 ? '▲' : '▼'} {Math.abs(vo2Delta).toFixed(1)}
              </span>
            )}
          </span>
        </div>
        <LineChart data={vo2} />
      </div>
    ),
  }

  const visible = orderedIds(layout, Object.keys(METRIC_LABELS)).filter(
    (id) => !layout.hidden.includes(id) && metrics[id],
  )

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <GarminRefreshChip />
        <div className="flex items-center gap-2 flex-wrap">
          {controls}
          <button
            onClick={() => setCustomizeOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink transition"
          >
            <Icon name="gear" className="w-4 h-4" /> התאמה אישית
          </button>
        </div>
      </div>
      {customInputs}

      {visible.map((id) => (
        <div key={id}>{metrics[id]}</div>
      ))}

      <LayoutCustomizer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="התאמה אישית — בריאות יומית"
        labels={METRIC_LABELS}
        layout={layout}
        setLayout={setLayout}
        onReset={() => setLayout(DEFAULT_DAILY_HEALTH_LAYOUT)}
      />
    </div>
  )
}
