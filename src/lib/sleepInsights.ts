// Rule-based "sleep coach": turns recent Garmin daily data into short Hebrew
// insights. Pure — no I/O, easily unit tested.
import type { WorkoutEntry } from '../store/useStore'
import type { DailyHealth } from './garmin/types'
import { toIsoLocal } from './garmin/normalize'
import type { IconName } from '../components/ui/Icon'

export type Severity = 'good' | 'info' | 'warn'
export interface Insight {
  icon: IconName
  severity: Severity
  text: string
  tip?: string // actionable suggestion, shown for problems
}

function sortedByDate(days: DailyHealth[]): DailyHealth[] {
  return [...days].sort((a, b) => a.date.localeCompare(b.date))
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0
}

function stddev(nums: number[]): number {
  if (nums.length < 2) return 0
  const m = avg(nums)
  return Math.sqrt(avg(nums.map((n) => (n - m) ** 2)))
}

/** Bedtime as minutes on an 18:00-anchored scale, so past-midnight is monotone. */
function bedtimeMinutes(value?: string | number): number | null {
  const iso = toIsoLocal(value)
  if (!iso) return null
  const m = iso.match(/T(\d{2}):(\d{2})/)
  if (!m) return null
  let mins = Number(m[1]) * 60 + Number(m[2])
  if (mins < 12 * 60) mins += 24 * 60 // 01:00 → 25:00
  return mins
}

function hoursLabel(min: number): string {
  const h = Math.floor(min / 60)
  const m = Math.round(min % 60)
  return `${h}:${String(m).padStart(2, '0')}`
}

function num(days: DailyHealth[], key: keyof DailyHealth): number[] {
  const out: number[] = []
  for (const d of days) {
    const v = d[key]
    if (typeof v === 'number') out.push(v)
  }
  return out
}

/**
 * Produce a prioritized list of sleep/recovery insights from recent daily data.
 * `log` is used to soften/contextualize around hard training days.
 */
export function sleepInsights(days: DailyHealth[], log: WorkoutEntry[] = []): Insight[] {
  const sorted = sortedByDate(days).filter((d) => d.sleepMin != null)
  if (sorted.length < 3) {
    return [{ icon: 'moon', severity: 'info', text: 'צריך עוד כמה לילות נתונים כדי לנתח את השינה.' }]
  }

  const out: Insight[] = []
  const last7 = sorted.slice(-7)
  const prev7 = sorted.slice(-14, -7)
  const last30 = sorted.slice(-30)
  const latest = sorted[sorted.length - 1]

  // duration
  const avgDur = avg(num(last7, 'sleepMin'))
  if (avgDur > 0 && avgDur < 420) {
    out.push({
      icon: 'clock',
      severity: 'warn',
      text: `ממוצע השינה בשבוע האחרון ${hoursLabel(avgDur)} שעות — פחות מ-7 שעות מומלצות.`,
      tip: 'לך לישון 30–45 דקות מוקדם יותר, וכוון ל-7–9 שעות. הימנע ממסכים ומקפאין בשעות שלפני השינה.',
    })
  } else if (avgDur >= 450) {
    out.push({
      icon: 'checkCircle',
      severity: 'good',
      text: `שינה טובה — ממוצע ${hoursLabel(avgDur)} שעות בשבוע האחרון.`,
    })
  }

  // bedtime consistency
  const bedtimes = last7
    .map((d) => bedtimeMinutes(d.sleepStart))
    .filter((v): v is number => v != null)
  if (bedtimes.length >= 4 && stddev(bedtimes) > 60) {
    out.push({
      icon: 'clock',
      severity: 'warn',
      text: 'שעת השינה משתנה מאוד מלילה ללילה — שעת שינה קבועה תשפר את איכות השינה.',
      tip: 'קבע שעת שינה ושעת קימה קבועות, גם בסופי שבוע. חלון של ±30 דקות מספיק כדי לייצב את השעון הביולוגי.',
    })
  }

  // sleep stage composition
  const deep = avg(num(last7, 'deepMin'))
  const rem = avg(num(last7, 'remMin'))
  if (avgDur > 0) {
    const deepPct = (deep / avgDur) * 100
    const remPct = (rem / avgDur) * 100
    if (deepPct > 0 && deepPct < 13) {
      out.push({
        icon: 'moon',
        severity: 'warn',
        text: `שינה עמוקה נמוכה (${Math.round(deepPct)}%) — חשובה להתאוששות הגוף.`,
        tip: 'חדר קריר וחשוך, הימנעות מאלכוהול ומארוחות כבדות בערב, ופעילות גופנית סדירה מגבירים שינה עמוקה.',
      })
    }
    if (remPct > 0 && remPct < 18) {
      out.push({
        icon: 'brain',
        severity: 'warn',
        text: `שנת REM נמוכה (${Math.round(remPct)}%) — חשובה לריכוז ולזיכרון.`,
        tip: 'REM מגיע בעיקר לקראת הבוקר — הארך את זמן השינה הכולל ושמור על שעת קימה קבועה. הפחת אלכוהול בערב.',
      })
    }
    if (deepPct >= 13 && remPct >= 18) {
      out.push({ icon: 'checkCircle', severity: 'good', text: 'הרכב שלבי השינה (עמוקה + REM) בטווח בריא.' })
    }
  }

  // score trend
  const score7 = avg(num(last7, 'sleepScore'))
  const scorePrev = avg(num(prev7, 'sleepScore'))
  if (score7 && scorePrev) {
    if (score7 - scorePrev >= 5) {
      out.push({ icon: 'trendUp', severity: 'good', text: `ציון השינה משתפר (${Math.round(scorePrev)} → ${Math.round(score7)}).` })
    } else if (scorePrev - score7 >= 5) {
      out.push({ icon: 'trendDown', severity: 'info', text: `ציון השינה ירד לאחרונה (${Math.round(scorePrev)} → ${Math.round(score7)}).` })
    }
  }

  // resting HR vs 30-day baseline
  const rhrBaseline = avg(num(last30, 'restingHr'))
  if (rhrBaseline && latest.restingHr && latest.restingHr >= rhrBaseline + 5) {
    out.push({
      icon: 'heart',
      severity: 'warn',
      text: `דופק המנוחה גבוה מהרגיל (${latest.restingHr} מול ${Math.round(rhrBaseline)}) — ייתכן עומס, חוסר שינה או תחילת מחלה.`,
      tip: 'שקול יום קל או מנוחה, הקפד על שתייה מרובה ושינה מספקת. אם זה נמשך כמה ימים — ייתכן שגופך נלחם במחלה.',
    })
  }

  // HRV recovery signal
  const hrvLow =
    latest.hrvStatus === 'LOW' ||
    (latest.hrvLastNight != null && latest.hrvWeeklyAvg != null && latest.hrvLastNight < latest.hrvWeeklyAvg * 0.85)
  if (hrvLow) {
    out.push({
      icon: 'hrv',
      severity: 'warn',
      text: 'ה-HRV נמוך מהבסיס שלך — סימן לעייפות או עומס.',
      tip: 'העדף אימון קל או מנוחה היום, הקפד על שינה, שתייה וניהול לחץ. HRV מגיב חזק לאלכוהול ולאימון קשה בערב.',
    })
  }

  // training-context note: hard day + poor recovery
  const hardRecently = log.some(
    (e) =>
      (e.aerobicIntensity === 'intense' || (e.rpe ?? 0) >= 8) &&
      e.date >= (prev7[0]?.date ?? last7[0].date),
  )
  if (hardRecently && (hrvLow || (latest.bodyBatteryHigh != null && latest.bodyBatteryHigh < 60))) {
    out.push({
      icon: 'bulb',
      severity: 'info',
      text: 'התאמנת חזק לאחרונה והמדדים מראים התאוששות חלקית — שינה איכותית עכשיו תעזור.',
    })
  }

  if (out.length === 0) {
    out.push({ icon: 'checkCircle', severity: 'good', text: 'הנתונים נראים תקינים — המשך כך!' })
  }
  return out
}
