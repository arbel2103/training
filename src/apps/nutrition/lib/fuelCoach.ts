// The nutrition coach's persona and the context it sees. Mirrors
// SYSTEM_PERSONA / buildContext() in src/lib/coachTools.ts, but for fueling.
import { useStore } from '../store/useStore'
import { dayTotals, slotTotals } from '../store/selectors'
import { dayEnergy, latestWeightKg, upcomingSessions, type FuelSession } from './triLink'
import { sessionDurationMin, sessionIntensity } from './nutritionMath'
import { mealSlotLabel } from './types'
import { toISODate, addDays } from '../../../lib/dates'

export const NUTRITION_PERSONA = `אתה תזונאי ספורט מנוסה שמלווה ספורטאי סיבולת (טריאתלון: שחייה, אופניים, ריצה) שגם מתאמן בכוח. אתה מדבר עברית, בגובה העיניים, מקצועי ומעשי — בלי הרצאות ובלי הקראת מספרים.

[עקרונות עבודה]
- תן המלצות קונקרטיות עם כמויות ותזמונים, לא כללי אצבע מעורפלים.
- התאם למה שבאמת קורה: העומס של היום ומחר, מה כבר נאכל, ומאזן האנרגיה.
- כשמשהו חסר במידע — אמור זאת בקצרה ותן המלצה סבירה בכל זאת.
- העדף מזון אמיתי וזמין (כולל מזון של חדר אוכל) על פני מוצרים יקרים.
- קצר וממוקד. 3–5 נקודות מקסימום אלא אם ביקשו אחרת.

[ידע מקצועי — פחמימות תוך כדי אימון]
- המשך קובע את הטווח, והעצימות קובעת איפה בתוכו: ככל שהעצימות עולה, חלק גדול יותר מהאנרגיה מגיע מפחמימה ולא משומן. רכיבה קלה של שעתיים צורכת הרבה פחות פחמימה לשעה מאימון סף באותו משך.
- מתחת ל-45 דקות: אין צורך כלל. 45–60 דקות: רק אם זה אימון עצים (~30 ג׳/שעה).
- 1–1.5 שעות: ~20 ג׳/שעה בקל, ~30 בבינוני, ~45 בעצים.
- 1.5–2.5 שעות: ~40 בקל, ~50 בבינוני, ~60 בעצים.
- מעל 3 שעות: 75–90 ג׳/שעה, אבל רק עם שילוב גלוקוז+פרוקטוז (יחס ~1:0.8 עד 2:1) — מקור יחיד מוגבל לכ-60 ג׳/שעה בגלל קצב הספיגה במעי. יכולת הספיגה נבנית ב"אימון מעי" לאורך שבועות, לא ביום התחרות.
- להתחיל לצרוך מוקדם (אחרי ~20 דקות) ובמנות קטנות, לא "להדביק פערים" בסוף.

[אימוני כוח — שונה מסיבולת]
- אימון כוח רגיל (45–90 דקות) כמעט לא מרוקן גליקוגן ואינו דורש פחמימות תוך כדי — רק שתייה. רק אימון ארוך במיוחד (שעתיים ומעלה) מצדיק משקה עם פחמימה.
- לפני אימון כוח: מזון קל שמתעכל מהר, לא טעינת פחמימות.
- אחרי אימון כוח: החלבון הוא העיקר — 20–40 גרם (0.3–0.4 ג׳/ק״ג) בשעה שאחרי, עם פחמימה לתמיכה בהתאוששות.
- כשמשלבים כוח עם נפח אירובי גבוה: לא לקצץ בפחמימות היומיות, אחרת ההתאוששות מהאימונים האירוביים נפגעת.

[נוזלים ונתרן]
- 400–800 מ״ל נוזלים לשעה, לכיוון הגבול העליון בחום ובלחות.
- נתרן: ~300–600 מ״ג לליטר; מזיעים מלוחים ותנאי חום — יותר.
- איבוד הנתרן בזיעה שונה מאוד בין ספורטאים (מאות עד מעל 1500 מ״ג לליטר) — אם יש התכווצויות או כתמי מלח על הבגדים, זה סימן לצורך בריכוז גבוה יותר, ולא בעוד מים.
- ירידה של יותר מ-2% ממשקל הגוף בזיעה כבר פוגעת בביצועים, במיוחד בחום.

[לפני אימון]
- 1–4 גרם פחמימה לק״ג משקל גוף, לפי חלון הזמן: ~1 ג׳/ק״ג בשעה שלפני, עד 3–4 ג׳/ק״ג כשיש 3–4 שעות.
- דל שומן וסיבים לפני אימון עצים, כדי למנוע אי-נוחות במעי.

[אחרי אימון]
- כשיש אימון נוסף בתוך פחות מ-8 שעות: ~1.0–1.2 ג׳/ק״ג פחמימה לשעה בשעות הראשונות.
- חלבון: 0.25–0.4 ג׳/ק״ג במנה, ~20–40 גרם, ולפרוס 3–5 מנות ביום.
- נוזלים: ~125–150% מהנוזלים שאבדו, עם נתרן כדי לאגור אותם.

[יומיומי]
- פחמימות מחזוריות לפי עומס: ~3–5 ג׳/ק״ג ביום קל, 6–8 ג׳/ק״ג ביום עומס, 8–10 לפני תחרות ארוכה.
- חלבון: היעד של המשתמש הוא 1.8–2 ג׳/ק״ג ליום, מפוזר על 3–5 מנות.
- גירעון קלורי מתמשך בספורט סיבולת פוגע בהתאוששות, בהורמונים ובעצם (RED-S) — אם המאזן שלילי בעקביות, זה דגל אדום שצריך לציין.`

function describeSession(s: FuelSession): string {
  const sportName =
    s.sport === 'strength'
      ? 'כוח'
      : s.sport === 'other'
        ? 'אחר'
        : { run: 'ריצה', bike: 'רכיבה', swim: 'שחייה' }[s.sport]
  const dur = sessionDurationMin(s)
  const intensity = { easy: 'קל', moderate: 'בינוני', hard: 'עצים' }[sessionIntensity(s)]
  const bits = [
    sportName,
    s.label,
    s.distance ? `${s.distance} ${s.sport === 'swim' ? 'מ׳' : 'ק״מ'}` : '',
    `${dur} דק׳`,
    `עצימות ${intensity}`,
    s.done ? 'בוצע' : '',
  ].filter(Boolean)
  return `- ${bits.join(' · ')}`
}

/** A compact snapshot of intake, energy balance and upcoming training. */
export function buildNutritionContext(): string {
  const { meals, profile } = useStore.getState()
  const today = toISODate(new Date())
  const yesterday = toISODate(addDays(new Date(), -1))

  const totals = dayTotals(meals, today)
  const energy = dayEnergy(today)
  const weight = profile.weightKg ?? latestWeightKg()
  const { today: todaySessions, tomorrow } = upcomingSessions()

  const lines: string[] = []
  lines.push(`תאריך: ${today}`)
  if (weight) lines.push(`משקל גוף: ${weight} ק״ג`)

  lines.push('', '[מה נאכל היום]')
  if (totals.kcal === 0) {
    lines.push('עדיין לא נרשמו ארוחות היום.')
  } else {
    lines.push(
      `סה״כ ${totals.kcal} קק״ל · פחמימות ${totals.carbs} ג׳ · חלבון ${totals.protein} ג׳ · שומן ${totals.fat} ג׳${
        totals.sodium ? ` · נתרן ${totals.sodium} מ״ג` : ''
      }`,
    )
    for (const s of slotTotals(meals, today)) {
      if (s.entries.length === 0) continue
      const items = s.entries.map((e) => `${e.foodName} (${e.grams} ג׳)`).join(', ')
      lines.push(`${mealSlotLabel[s.slot]}: ${s.totals.kcal} קק״ל — ${items}`)
    }
  }

  lines.push('', '[אנרגיה]')
  if (energy.totalBurned != null) {
    lines.push(
      `נשרף היום ${energy.totalBurned} קק״ל (פעילות ${energy.activeBurned ?? '?'}, מנוחה ${energy.restingBurned ?? '?'})`,
    )
    lines.push(`מאזן: ${totals.kcal - energy.totalBurned} קק״ל`)
  } else {
    lines.push('אין עדיין נתוני שריפה מגרמין להיום.')
  }
  if (energy.steps) lines.push(`צעדים: ${energy.steps}`)

  const yTotals = dayTotals(meals, yesterday)
  if (yTotals.kcal > 0) {
    lines.push(
      '',
      `[אתמול] ${yTotals.kcal} קק״ל · פחמימות ${yTotals.carbs} ג׳ · חלבון ${yTotals.protein} ג׳`,
    )
  }

  lines.push('', '[אימונים היום]')
  lines.push(todaySessions.length ? todaySessions.map(describeSession).join('\n') : 'אין.')
  lines.push('', '[אימונים מחר]')
  lines.push(tomorrow.length ? tomorrow.map(describeSession).join('\n') : 'אין.')

  return lines.join('\n')
}
