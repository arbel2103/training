import { useState } from 'react'
import { useStore } from '../../store/useStore'
import type { DailyHealth } from '../../lib/garmin/types'
import { sleepInsights, type Severity } from '../../lib/sleepInsights'
import { getApiKey, hasApiKey } from '../../lib/apiKey'
import { runCoach } from '../../lib/coachApi'
import { SYSTEM_PERSONA, buildContext } from '../../lib/coachTools'
import { hasGarminSetup } from '../../lib/garmin/pat'
import LineChart from '../../components/ui/LineChart'
import StackedBarChart, { type StackBar } from '../../components/ui/StackedBarChart'
import {
  GarminConnectPrompt,
  GarminEmpty,
  GarminRefreshChip,
} from '../../components/garmin/GarminDataHeader'
import InfoTip from '../../components/ui/InfoTip'
import Icon from '../../components/ui/Icon'
import { usePeriod } from '../../components/ui/usePeriod'

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
  const { inPeriod, controls, customInputs } = usePeriod('30')
  const [aiText, setAiText] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiErr, setAiErr] = useState<string | null>(null)

  const runSleepAnalysis = async () => {
    setAiLoading(true)
    setAiErr(null)
    setAiText(null)
    try {
      const text = await runCoach({
        apiKey: getApiKey(),
        system: SYSTEM_PERSONA + '\n\n[מצב נוכחי]\n' + buildContext(),
        messages: [
          {
            role: 'user',
            content:
              'נתח לעומק את השינה שלי בשבועות האחרונים כמאמן שינה לספורטאי סיבולת: משך מול צורך (בהתאם לעומס האימונים), מבנה השינה (עמוקה/REM), HRV ודופק מנוחה בזמן שינה מול הבסיס (האם הגוף נכנס למנוחה אמיתית), חוב שינה מצטבר, ועקביות. קשר את הממצאים לאימונים שביצעתי. תן 3–4 תובנות קונקרטיות עם המלצה מעשית לכל אחת. קצר וממוקד, בלי להקריא מספרים סתם.',
          },
        ],
        tools: [],
        onToolCall: () => '',
      })
      setAiText(text.trim())
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : 'שגיאה בניתוח')
    } finally {
      setAiLoading(false)
    }
  }

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
  const inRange = withSleep.filter((d) => inPeriod(d.date))

  const stageBars: StackBar[] = inRange.map((d: DailyHealth) => ({
    label: dayLabel(d.date),
    segments: [
      { value: d.deepMin ?? 0, color: STAGE_COLORS.deep },
      { value: d.remMin ?? 0, color: STAGE_COLORS.rem },
      { value: d.lightMin ?? 0, color: STAGE_COLORS.light },
      { value: d.awakeMin ?? 0, color: STAGE_COLORS.awake },
    ],
  }))

  const scoreData = inRange
    .filter((d) => d.sleepScore != null)
    .map((d) => ({ label: dayLabel(d.date), value: d.sleepScore! }))

  const insights = sleepInsights(daily, log)

  const stagePct = (v?: number) =>
    latest.sleepMin && v != null ? Math.round((v / latest.sleepMin) * 100) : null

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <GarminRefreshChip />
        {controls}
      </div>
      {customInputs}

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
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="font-semibold flex items-center gap-2">
              <Icon name="brain" className="w-5 h-5 text-muted" /> מאמן השינה
            </h4>
            <p className="text-xs text-muted mt-0.5">מגמת 7 הלילות האחרונים — לא רק הלילה האחרון</p>
          </div>
          {hasApiKey() && (
            <button
              onClick={() => void runSleepAnalysis()}
              disabled={aiLoading}
              className="btn-accent text-sm py-1.5 px-3 gap-1.5 disabled:opacity-50"
            >
              <Icon name="chat" className="w-4 h-4" />
              {aiLoading ? 'מנתח…' : aiText ? 'נתח שוב' : 'ניתוח מעמיק'}
            </button>
          )}
        </div>
        {(aiErr || aiText) && (
          <div className="mb-3 rounded-xl bg-accent-soft/40 p-3 text-sm leading-relaxed">
            {aiErr ? (
              <span className="text-run">{aiErr}</span>
            ) : (
              <span className="whitespace-pre-wrap text-ink">{aiText}</span>
            )}
          </div>
        )}
        <div className="grid gap-2">
          {insights.map((ins, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${severityClass[ins.severity]}`}
            >
              <Icon name={ins.icon} className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="leading-relaxed">
                <span>{ins.text}</span>
                {ins.tip && (
                  <div className="mt-1 flex items-start gap-1.5 text-xs opacity-80">
                    <Icon name="bulb" className="w-3.5 h-3.5 mt-0.5 shrink-0" />
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
        <h4 className="font-semibold mb-3 flex items-center gap-1.5">שלבי שינה <InfoTip text="כל עמודה היא לילה, מחולקת לשלבי השינה: עמוקה (התאוששות הגוף), REM (מוח וזיכרון), קלה וערות. גובה העמודה = סך שעות השינה." /></h4>
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
        <h4 className="font-semibold mb-3 flex items-center gap-1.5">ציון שינה <InfoTip text="ציון השינה של גרמין (0–100) המשקלל משך, איכות ושלבים. מעל 80 = מצוין, מתחת ל-60 = כדאי לשים לב." /></h4>
        <LineChart data={scoreData} />
      </div>
    </div>
  )
}
