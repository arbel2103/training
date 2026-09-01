import {
  uid,
  useStore,
  type PlanSession,
  type PlanWeek,
  type TrainingPlan,
  type WorkoutEntry,
} from '../store/useStore'
import { HEB_DAYS, addDays, fromISO, startOfWeek, toISODate, weekDays } from './dates'
import { entryDuration, formatDuration, sportUnit } from './calc'
import { weekCompletion } from './planMatch'
import {
  MUSCLE_GROUPS,
  MEV,
  MRV,
  muscleLabel,
  tonnage,
  volumeByMuscle,
} from './strength'
import { weekStartOf } from './planSanitize'
import { activeGear, formatUsage, gearStatus, metricLabel } from './gear'
import {
  aerobicIntensityLabel,
  categoryLabel,
  sportLabel,
} from './labels'

/* eslint-disable @typescript-eslint/no-explicit-any */

export const SYSTEM_PERSONA = `אתה מאמן אישי מקצועי ומנוסה — גם לטריאתלון (שחייה/אופניים/ריצה) וגם לאימוני כוח בחדר כושר. אתה מלווה את המשתמש בעברית, מדבר בגובה העיניים, מקצועי אך נגיש, ומפורט.

עקרונות עבודה:
- בתחילת שיחה חדשה, שאל קודם כל **על מה נעבוד**: אימוני כוח, טריאתלון/אירובי, או שניהם — והתאם את ההמשך לבחירה.
- אם עדיין אין פרופיל למשתמש (ראה "מצב נוכחי" למטה), פתח בהיכרות: הצג את עצמך בקצרה, ואז שאל בהדרגה — שאלה או שתיים בכל הודעה, לא הכל בבת אחת. לטריאתלון: תחרויות קרובות (סוג ותאריך), מטרות, שעות פנויות בשבוע, ימים פנויים, ציוד (בריכה/אופני כביש/הום-טריינר וכו'), רקע ופציעות. לכוח: מטרות (מסה/כוח/חיטוב), ניסיון, כמה אימונים בשבוע, איזה ציוד/חדר כושר יש, ופציעות.
- שמור כל מידע שאתה לומד על המשתמש עם הכלי save_athlete_profile.
- **זיכרון ארוך-טווח:** שמור עובדות חשובות ומתמשכות (פציעות, העדפות אימון, שיאים אישיים, אילוצים, ציוד) עם הכלי remember. עיין ב"זיכרון המאמן" שבמצב הנוכחי והתייחס אליו בעצות. אם עובדה כבר לא נכונה — הסר אותה עם forget.
- ייעץ והתייעץ: הצע גישה לתוכנית, שאל את המשתמש על העדפות (למשל אם חשוב לשמר מסת שריר — זה דורש יותר עבודת כוח ופחות נפח אירובי; אנשים שונים רוצים דגשים שונים), והגע להסכמה איתו לפני שאתה קובע תוכנית.

תוכנית טריאתלון/אירובי:
- כשאתה בונה או מעדכן תוכנית, שמור אותה עם set_training_plan (תוכנית מלאה) או upsert_plan_week (עדכון שבוע בודד). התוכנית מחולקת לשבועות; לכל שבוע weekStart (תאריך יום ראשון), ולכל אימון: יום בשבוע (0=ראשון … 6=שבת), ספורט (run/bike/swim/strength/other), תווית (למשל "ארוכה", "אינטרוולים"), ומרחק/משך. התוכנית מוצגת בעמוד "תוכנית אימונים" → אירובי, והאימונים שהמשתמש מבצע מסומנים אוטומטית ✓ מולה.
- **לשינוי של אימון בודד — אל תשלח שבוע שלם.** להוספה: add_plan_session. להסרה: remove_plan_session עם ה-id שמופיע ליד האימון במצב הנוכחי. לשינוי יום/מרחק/תווית: update_plan_session. שמור את upsert_plan_week לבנייה של שבוע מאפס בלבד — שליחת שבוע שלם כדי לגעת באימון אחד מוחקת בשקט כל אימון שהשמטת.
- **כמה שינויים = כמה קריאות.** "תוסיף שני אימוני כוח" הן שתי קריאות ל-add_plan_session באותו תור. אל תסתפק באחת ואל תתאר במילים מה עשית במקום לקרוא — בצע קודם, ורק אז סכם.
- התוכנית דינמית: אם המשתמש אומר שהיה עייף/חולה/עסוק — התאם ועדכן את האימונים הרלוונטיים.
- **המלצות להמשך התוכנית (טעונות אישור):** כשמבקשים ממך "המלצות להמשך" — או כשאתה מזהה מהנתונים (היענות נמוכה, RPE גבוה, שינה/HRV ירודים) שכדאי להתאים — **אל תשנה את התוכנית ישירות**. הצע שינוי לכל שבוע רלוונטי עם propose_plan_week וכלול rationale קצר. המשתמש יאשר או יערוך בעצמו. השתמש ב-upsert_plan_week להחלה ישירה רק כשהמשתמש ביקש במפורש לבצע את השינוי.

תוכנית כוח:
- כשסיכמתם על אימון כוח, שמור אותו עם set_strength_workout: שם האימון (למשל "חזה + יד אחורית", "רגליים", "גב") ורשימת תרגילים — לכל תרגיל: שם, מספר סטים, חזרות לכל סט (מערך באורך מספר הסטים, למשל [12,10,8]), ומשקל (טקסט, למשל "40 ק\\"ג" או "משקל גוף"). האימון מופיע בעמוד "תוכנית אימונים" → כוח כטאב עם טבלת התרגילים, והמשתמש יכול לערוך שם הכל.
- אם לא בטוח במשקל התחלתי — שאל את המשתמש מה המשקלים הנוכחיים שלו, או השאר משקל ריק שימלא בעצמו.
- קריאה חוזרת ל-set_strength_workout עם אותו שם מחליפה את התרגילים של אותו אימון (כך מעדכנים). remove_strength_workout מוחק אימון.

**ביצוע פעולות — קריטי:**
- כשהמשתמש מבקש שינוי (להוסיף אימון, להזיז אימון, לשנות שבוע בתוכנית) — **קרא לכלי המתאים באותה תשובה, לפני שאתה מאשר שביצעת**. אל תכתוב "הוספתי" או "הזזתי" בלי שקראת לכלי — זו התנהגות שגורמת למשתמש לבקש שוב ושוב. אם אתה לא בטוח באיזה יום או מרחק, שאל — אבל אל תדווח על פעולה שלא עשית.
- אחרי שהכלי מחזיר תשובה, קרא אותה. אם היא מתארת שגיאה (id שלא נמצא, תאריך לא תקין) — תקן וקרא שוב מיד, אל תבקש מהמשתמש לחזור על עצמו.
- **הזזת אימון בלוח = update_planned_workout** עם ה-id מרשימת "אימונים מתוכננים בלוח". אל תמחק ותוסיף מחדש — זה מאבד את הקישור ליומן.
- **מחיקה היא תמיד מפורשת.** upsert_plan_week מעדכן ומוסיף, אבל אימון שהמשתמש שיבץ בעצמו ללוח לא נמחק רק כי השמטת אותו מרשימת האימונים של השבוע. כדי להוריד אימון מהלוח קרא ל-remove_planned_workout עם ה-id שלו.
- שלוש התצוגות מסונכרנות אוטומטית: הלוח ("שיבוץ ליומן"), התוכנית ("תוכנית אימונים") ואריח "האימון של היום". שינוי בתוכנית מזיז את הלוח, ושינוי בלוח מעדכן את התוכנית — אין צורך לעדכן פעמיים. השליחה ליומן Google עצמה ממתינה לאישור המשתמש בכפתור "סנכרן ליומן", אז אמור לו לאשר שם.

רישום אימונים ותחושות:
- **אימוני גרמין נכנסים לבד.** אל תרשום אימון שכבר מופיע ברשימת "אימונים שבוצעו" — זו כפילות שמנפחת את העומס השבועי. log_workout הוא רק למה שלא הגיע מהשעון (אימון כוח בלי שעון, שחייה שלא נמדדה, אימון שהמשתמש מספר עליו בדיעבד).
- **תחושה חסרה זו הזדמנות.** לאימוני גרמין אין RPE — הם מודדים דופק, לא איך זה הרגיש. אם המשתמש מספר לך איך היה אימון, שמור את זה עם set_workout_debrief לפי ה-id. אם אתה רואה אימון מפתח (ארוך/עצים) מהימים האחרונים בלי תחושה — שאל אותו איך היה, בקצרה, אגב השיחה.
- שקילה נרשמת עם log_weight.

מעקב כוח (נתוני הסטים):
- ברשימת "אימונים שבוצעו" מופיעים גם **הסטים שבוצעו בפועל** לכל תרגיל (למשל "לחיצת חזה: 3×8 @55"). זה מה שמאפשר אוברלוד פרוגרסיבי אמיתי — השווה לאימון הקודם של אותו תרגיל והמלץ קונקרטית מתי להעלות משקל, חזרות או סטים.
- **נפח כוח** מוצג כסטים לקבוצת שריר, מול MEV/MRV — גם ב-28 הימים האחרונים וגם בכל סיכום שבוע. כשאתה מסכם שבוע, התייחס אליו: אילו קבוצות מתחת ל-MEV, אילו מעל MRV, ומה להזיז. סטים בתרגילים שלא תויגו לקבוצת שריר מדווחים בנפרד — אם יש הרבה כאלה, אמור למשתמש לתייג אותם בעמוד הכוח כדי שהתמונה תהיה מלאה.

כללי:
- כדי לתזמן אימון ליום ספציפי ביומן, השתמש ב-add_planned_workout — הוא מופיע בעמוד "תכנון האימונים", והמשתמש מאשר ושולח ליומן שלו. אל תמציא — הוסף רק אימונים שסיכמתם.
- **התחשב במחויבויות מהיומן** (ראה "מחויבויות ביומן" במצב הנוכחי) כשאתה מתזמן — אל תשבץ אימון על שעה תפוסה, ותכנן סביב עבודה/משמרות/אירועים. אם יום עמוס, הצע אימון קצר יותר או הזז ליום אחר.
- **שים לב לתחושת המאמץ (RPE 1–10) ולהערות** שהמשתמש רשם על אימונים. אם רואים עייפות מצטברת או RPE גבוה עקבי — הורד עומס, הצע התאוששות, ועדכן את השבוע עם upsert_plan_week.
- **סיכום שבוע:** אם המשתמש מבקש לסכם את השבוע, עבור על "סיכום השבוע" במצב הנוכחי (מתוכנן מול בוצע), תן פידבק קצר וקונקרטי (מה הלך טוב, מה חסר), והצע התאמות לשבוע הבא — עדכן בפועל עם upsert_plan_week אם צריך.
- **קרא את מה שהוא כתב על השבוע לפני שאתה מסכם אותו.** אם יש הערה שלו על השבוע (מופיעה במצב הנוכחי תחת "מה שהמשתמש כתב"), התייחס אליה במפורש — היא מסבירה את המספרים. אימון שלא בוצע בגלל עומס בעבודה ואימון שלא בוצע בגלל כאב נראים זהים בטבלה ודורשים תגובה הפוכה: את הראשון מזיזים, אחרי השני בודקים. אל תסכם שבוע כאילו לא קראת אותה, ואל תחזור עליה במילים שלו — תגיב לה.
- היה זמין תמיד לשאלות: התאוששות, טכניקה, תזונה בסיסית סביב אימונים, ותחושות. אם חסר לך מידע — שאל.
- דבר בעברית. תן תשובה ישירה ומקצועית; אל תנתח את ההיגיון הפנימי שלך בקול.
- למטה תמונת מצב עדכנית של הנתונים (פרופיל, תוכניות, אימונים שבוצעו לאחרונה עם תחושה, מחויבויות ביומן, סיכום השבוע, ואימונים מתוכננים). התבסס עליה.

בסיס ידע מקצועי (מתודולוגיה לבניית תוכניות — מזוקק ממקורות מובילים: TrainingPeaks, Triathlete, GTN, Stronger by Science, Menno Henselmans, Renaissance Periodization, ו-Complete Human Performance/Alex Viada). יישם את העקרונות האלה כשאתה בונה או מעדכן תוכנית, והתאם ליכולת, לזמן ולציוד של המשתמש — עדיף התקדמות הדרגתית ובטוחה על פני קפיצות:

סיבולת וטריאתלון:
- פריודיזציה: בסיס (נפח רב, עצימות נמוכה) → בנייה (מוסיפים עצימות ספציפית למקצה) → שיא → טייפר (הורדת נפח 40–60% תוך שמירת עצימות, שבוע-שלושה לפי אורך המקצה) → מקצה.
- ניהול עומס (מודל TrainingPeaks): CTL = כושר (עומס ממוצע ~42 יום), ATL = עייפות (~7 יום), TSB = טריות (CTL פחות ATL). מעלים נפח בהדרגה (~5–8% לשבוע) עם שבוע התאוששות (deload ~40% נפח) כל 3–4 שבועות.
- חלוקת עצימות פולרית 80/20: ~80% מהזמן קל (זון 1–2, מתחת לסף האירובי) ו-~20% עצים (זון 3+). טעות נפוצה: לרוץ "בינוני" מדי — לוודא שהקל באמת קל.
- אימוני מפתח: לונג בעצימות נמוכה; אינטרוולים בסף וב-VO2max לפי השלב; אימוני בריק (רכיבה→ריצה) לטריאתלון; שחייה עם דגש טכניקה (CSS לקביעת קצב). ככל שמתקרבים למקצה — האימונים ספציפיים יותר לתנאי המקצה.

כוח והיפרטרופיה:
- נקודות ציון נפח (RP): MEV (מינימלי אפקטיבי) → MAV (מיטבי) → MRV (מקסימלי להתאוששות). מתחילים מזוציקל בנפח נמוך ומעלים סטים בהדרגה לקראת MRV, ואז deload. מעשי להיפרטרופיה: ~10–20 סטים לקבוצת שריר בשבוע, מחולק ל-2+ אימונים לאותה קבוצה.
- קרבה לכשל: עבודה ב-RIR (חזרות ברזרבה) — רוב הסטים ב-1–3 RIR, מתקרבים לכשל לקראת סוף המזוציקל. טווח חזרות רחב יעיל (~5–30) כשקרובים לכשל; כוח מרבי ב-1–5 חזרות בעומס גבוה.
- אוברלוד פרוגרסיבי: להעלות משקל/חזרות/סטים לאורך זמן ולשפר מול הפעם הקודמת. התאוששות: 48 שעות לפחות לקבוצת שריר, חלבון ~1.6–2.2 גר'/ק"ג, ושינה.

שילוב סיבולת+כוח (Concurrent/Hybrid — Alex Viada):
- אפקט ההפרעה: נפח אירובי עצים גבוה מקזז עליית כוח/מסה ולהפך — מנהלים אותו, לא נמנעים.
- הפרדה: להרחיק אימון כוח כבד לרגליים מאימון אירובי עצים לרגליים (אידיאלי 6+ שעות או ימים נפרדים). באותו יום — קודם את עדיפות היום, בעצימות גבוהה כשרעננים.
- נפח אירובי בזון 2 פוגע בכוח פחות מנפח עצים — עוד סיבה ל-80/20.
- לשמר מסה בבלוק סיבולת: לשמור עומסי כוח כבדים גם אם מורידים נפח כוח. תעדף לפי מטרת השלב — בבלוק מקצה הכוח בתחזוקה, בבלוק מסה האירובי בתחזוקה.

ניתוח שינה והתאוששות (כשמנתחים שינה — עבור על הנתונים דרך הפריזמה של ספורטאי סיבולת: שיקום שריר, מאזן גליקוגן, ודומיננטיות פאראסימפתטית. אל תקריא מספרים — תן פרשנות והמלצה):
- **צורך שינה מול עומס:** צורך השינה עולה עם עומס האימונים. בימים/לילות שאחרי אימון עצים או ארוך כוון ל-8–9 שעות; לרוב ספורטאי סיבולת 7 שעות זה מינימום, לא יעד.
- **מבנה השינה (Sleep Architecture):** שינה עמוקה (~13–23% מהלילה) אחראית לשיקום פיזי ולהפרשת הורמון גדילה — קריטית לבניית שריר והתאוששות. REM (~20–25%) לשיקום קוגניטיבי, זיכרון ולמידה מוטורית. עמוקה או REM נמוכים = התאוששות חלקית גם אם מספר השעות תקין.
- **HRV ולחץ בזמן שינה:** בלילה טוב הגוף נכנס לשליטה פאראסימפתטית — דופק מנוחה יורד ו-HRV עולה יחסית לבסיס. HRV נמוך מהבסיס, דופק מנוחה גבוה (+5 ומעלה), או לחץ לילי גבוה = המערכת הסימפתטית עבדה (אימון עצים מאוחר, אלכוהול, עייפות מצטברת או תחילת מחלה) — סימן להאט.
- **חוב שינה (Sleep Debt):** גירעון מצטבר של כמה לילות פוגע בביצועים באימון הבא. מזהים מגמה של לילות קצרים רצופים וממליצים להחזיר בהדרגה (הקדמת שינה, לא "לילה אחד ארוך").
- **עקביות:** שעת שינה וקימה קבועות (±30 דק', גם בסופ"ש) משפרות איכות ואת עומק השינה. שינה מקוטעת (הרבה זמן ערות) מקצרת את השלבים המשקמים.
- **טיפים מעשיים:** חדר קריר וחשוך; הימנעות מאלכוהול, קפאין וארוחות כבדות בערב; הפחתת מסכים לפני השינה; והרחקת אימון עצים מאוד משעת השינה. קשר תמיד את התובנה למה שקרה באימונים (עומס, RPE, אימון מאוחר).`

const sessionSchema = {
  type: 'object',
  properties: {
    day: { type: 'integer', description: '0=ראשון … 6=שבת' },
    sport: {
      type: 'string',
      enum: ['run', 'bike', 'swim', 'strength', 'other'],
    },
    label: { type: 'string', description: 'למשל "ארוכה", "אינטרוולים"' },
    distance: { type: 'number' },
    durationMin: { type: 'number' },
    note: { type: 'string' },
  },
  required: ['day', 'sport'],
}

const weekSchema = {
  type: 'object',
  properties: {
    weekStart: { type: 'string', description: 'yyyy-mm-dd של יום ראשון' },
    label: { type: 'string' },
    focus: { type: 'string' },
    sessions: { type: 'array', items: sessionSchema },
  },
  required: ['weekStart', 'sessions'],
}

// Gemini functionDeclarations (OpenAPI-subset schema with lowercase types).
export const COACH_TOOLS = [
  {
    name: 'save_athlete_profile',
    description: 'שמור או עדכן את פרופיל הספורטאי (מיזוג — שלח רק שדות שהשתנו).',
    parameters: {
      type: 'object',
      properties: {
        races: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string', description: 'sprint/olympic/70.3/full…' },
              date: { type: 'string', description: 'yyyy-mm-dd' },
            },
          },
        },
        goals: { type: 'string' },
        weeklyHours: { type: 'number' },
        availableDays: { type: 'array', items: { type: 'string' } },
        equipment: { type: 'array', items: { type: 'string' } },
        constraints: { type: 'string', description: 'פציעות/מגבלות/העדפות' },
        currentLevel: { type: 'string' },
        notes: { type: 'string' },
      },
    },
  },
  {
    name: 'set_training_plan',
    description: 'קובע תוכנית אימונים מלאה (מחליף את הקיימת), מחולקת לשבועות.',
    parameters: {
      type: 'object',
      properties: {
        raceName: { type: 'string' },
        raceDate: { type: 'string' },
        weeks: { type: 'array', items: weekSchema },
      },
      required: ['weeks'],
    },
  },
  {
    name: 'upsert_plan_week',
    description:
      'מחליף שבוע שלם בתוכנית. השתמש בזה רק כשבונים שבוע מאפס — לשינוי של אימון בודד השתמש ב-add_plan_session / remove_plan_session / update_plan_session.',
    parameters: weekSchema,
  },
  // Session-level edits. Without these the only way to touch one workout was to
  // resend the entire week through upsert_plan_week — every other session
  // included, with its id, day, sport and distance intact. That is a large and
  // fragile payload for "drop Tuesday's strength session", and getting it
  // slightly wrong silently deletes the sessions left out.
  {
    name: 'add_plan_session',
    description:
      'מוסיף אימון בודד לשבוע קיים בתוכנית, בלי לגעת בשאר האימונים. לשני אימונים — קרא פעמיים.',
    parameters: {
      type: 'object',
      properties: {
        weekStart: { type: 'string', description: 'yyyy-mm-dd של יום ראשון' },
        day: { type: 'number', description: '0=ראשון … 6=שבת' },
        sport: {
          type: 'string',
          enum: ['run', 'bike', 'swim', 'strength', 'other'],
        },
        label: { type: 'string', description: 'למשל "רגליים", "אינטרוולים"' },
        distance: { type: 'number' },
        durationMin: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['weekStart', 'day', 'sport'],
    },
  },
  {
    name: 'remove_plan_session',
    description:
      'מסיר אימון בודד מהתוכנית לפי ה-id שלו (ה-id מופיע ליד כל אימון במצב הנוכחי). לשני אימונים — קרא פעמיים.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string', description: 'ה-id של האימון להסרה' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'update_plan_session',
    description:
      'משנה אימון בודד קיים לפי ה-id שלו — יום, ענף, מרחק, תווית. רק השדות שנשלחים משתנים.',
    parameters: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
        day: { type: 'number', description: '0=ראשון … 6=שבת' },
        sport: {
          type: 'string',
          enum: ['run', 'bike', 'swim', 'strength', 'other'],
        },
        label: { type: 'string' },
        distance: { type: 'number' },
        durationMin: { type: 'number' },
        note: { type: 'string' },
      },
      required: ['sessionId'],
    },
  },
  {
    name: 'set_strength_workout',
    description:
      'שומר אימון כוח בעמוד "תוכנית אימונים" → כוח. קריאה עם שם קיים מחליפה את התרגילים שלו.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'שם האימון, למשל "חזה + יד אחורית" / "רגליים" / "גב"',
        },
        exercises: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'שם התרגיל' },
              sets: { type: 'integer', description: 'מספר סטים' },
              reps: {
                type: 'array',
                items: { type: 'integer' },
                description: 'חזרות לכל סט — אורך המערך = מספר הסטים, למשל [12,10,8]',
              },
              weight: {
                type: 'string',
                description: 'משקל, למשל "40 ק\\"ג" / "משקל גוף" (אפשר ריק)',
              },
            },
            required: ['name'],
          },
        },
      },
      required: ['name', 'exercises'],
    },
  },
  {
    name: 'remove_strength_workout',
    description: 'מוחק אימון כוח לפי שם.',
    parameters: {
      type: 'object',
      properties: { name: { type: 'string' } },
      required: ['name'],
    },
  },
  {
    name: 'add_planned_workout',
    description:
      'מוסיף אימון מתוכנן ליום ספציפי בלוח "תכנון האימונים" (המשתמש יאשר וישלח ליומן).',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'yyyy-mm-dd' },
        category: { type: 'string', enum: ['strength', 'aerobic', 'other'] },
        sport: { type: 'string', enum: ['run', 'bike', 'swim'] },
        aerobicIntensity: {
          type: 'string',
          enum: ['easy', 'long', 'intense', 'technique'],
        },
        strengthName: { type: 'string' },
        otherName: { type: 'string' },
        distance: { type: 'number' },
        time: { type: 'string', description: 'HH:MM' },
        durationMin: { type: 'number' },
        planSessionId: {
          type: 'string',
          description:
            'ה-id של אימון מהתוכנית שזה משבץ (ראה "התוכנית" במצב הנוכחי) — כך הלוח והתוכנית נשארים מקושרים.',
        },
      },
      required: ['date', 'category'],
    },
  },
  {
    name: 'update_planned_workout',
    description:
      'משנה אימון מתוכנן קיים בלוח (תאריך, שעה, משך, מרחק וכו׳) לפי ה-id שלו. זו הדרך להזיז אימון ליום או לשעה אחרת — אל תמחק ותוסיף מחדש. שלח רק את השדות שמשתנים.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ה-id מרשימת "אימונים מתוכננים ביומן"' },
        date: { type: 'string', description: 'yyyy-mm-dd' },
        time: { type: 'string', description: 'HH:MM' },
        durationMin: { type: 'number' },
        distance: { type: 'number' },
        aerobicIntensity: {
          type: 'string',
          enum: ['easy', 'long', 'intense', 'technique'],
        },
        strengthName: { type: 'string' },
        otherName: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'remove_planned_workout',
    description: 'מסיר אימון מתוכנן לפי id (ראה רשימת המתוכננים במצב הנוכחי).',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'remember',
    description:
      'שומר עובדה חשובה ומתמשכת על הספורטאי לזיכרון ארוך-טווח (פציעה, העדפה, שיא אישי, אילוץ, ציוד). קצר וקונקרטי.',
    parameters: {
      type: 'object',
      properties: { text: { type: 'string', description: 'העובדה לזכור' } },
      required: ['text'],
    },
  },
  {
    name: 'forget',
    description: 'מסיר עובדה מזיכרון המאמן לפי id (ראה "זיכרון המאמן" במצב הנוכחי).',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
  },
  {
    name: 'log_workout',
    description:
      'רושם אימון שכבר בוצע ליומן האימונים. השתמש כשהמשתמש מספר על אימון שעשה ולא מופיע ברשימת "אימונים שבוצעו" — אימוני גרמין נכנסים לבד, אז בדוק קודם שהוא לא שם כדי לא ליצור כפילות.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'yyyy-mm-dd; אם לא צוין — היום' },
        category: { type: 'string', enum: ['strength', 'aerobic', 'other'] },
        sport: { type: 'string', enum: ['run', 'bike', 'swim'] },
        distance: {
          type: 'number',
          description: 'ריצה/אופניים בק"מ, שחייה במטרים',
        },
        durationMin: { type: 'number' },
        aerobicIntensity: {
          type: 'string',
          enum: ['easy', 'long', 'intense', 'technique'],
        },
        strengthName: { type: 'string', description: 'שם אימון הכוח' },
        otherName: { type: 'string' },
        rpe: { type: 'integer', description: 'תחושת מאמץ 1–10' },
        note: { type: 'string' },
      },
      required: ['category'],
    },
  },
  {
    name: 'set_workout_debrief',
    description:
      'מוסיף תחושה (RPE) והערה לאימון שכבר רשום — כולל אימונים שהגיעו מגרמין בלי תחושה. ה-id מרשימת "אימונים שבוצעו".',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ה-id של האימון מרשימת "אימונים שבוצעו"' },
        rpe: { type: 'integer', description: 'תחושת מאמץ 1–10' },
        note: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'log_weight',
    description: 'רושם שקילה (ק"ג) לתאריך מסוים.',
    parameters: {
      type: 'object',
      properties: {
        weightKg: { type: 'number' },
        date: { type: 'string', description: 'yyyy-mm-dd; אם לא צוין — היום' },
      },
      required: ['weightKg'],
    },
  },
  {
    name: 'propose_plan_week',
    description:
      'מציע שינוי לשבוע בתוכנית לאישור המשתמש (לא מחיל אותו!). כלול rationale קצר שמסביר למה. השתמש בזה כשמבקשים המלצות להמשך התוכנית.',
    parameters: {
      type: 'object',
      properties: {
        weekStart: { type: 'string', description: 'yyyy-mm-dd של יום ראשון' },
        label: { type: 'string' },
        focus: { type: 'string' },
        rationale: { type: 'string', description: 'הסבר קצר למה מומלץ השינוי' },
        sessions: { type: 'array', items: sessionSchema },
      },
      required: ['weekStart', 'rationale', 'sessions'],
    },
  },
]

/** The subset of `keys` the model actually sent, so we never write undefined. */
function pick(input: any, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of keys) if (input[k] !== undefined) out[k] = input[k]
  return out
}

function withIds(week: any): PlanWeek {
  const sessions: PlanSession[] = (week.sessions ?? []).map((s: any) => ({
    id: uid(),
    day: s.day,
    sport: s.sport,
    label: s.label,
    distance: s.distance,
    durationMin: s.durationMin,
    note: s.note,
  }))
  return {
    id: uid(),
    weekStart: week.weekStart,
    label: week.label,
    focus: week.focus,
    sessions,
  }
}


/**
 * Run one tool call.
 *
 * Every return value is a sentence the model reads back, so a rejected call
 * must explain what was wrong rather than throw: an exception here aborts the
 * whole turn and the user has to repeat themselves, while a message lets the
 * model correct itself and try again in the same breath.
 */
/** Locate one session by id across the whole plan, with its owning week. */
function findSession(
  plan: TrainingPlan | null,
  sessionId: unknown,
): { week: PlanWeek; session: PlanSession } | null {
  if (!plan || typeof sessionId !== 'string') return null
  for (const week of plan.weeks) {
    const session = week.sessions.find((x) => x.id === sessionId)
    if (session) return { week, session }
  }
  return null
}

export function executeTool(name: string, input: any): string {
  try {
    return runTool(name, input ?? {})
  } catch (e) {
    return `הפעולה נכשלה: ${e instanceof Error ? e.message : String(e)}. בדוק את הפרמטרים ונסה שוב.`
  }
}

function runTool(name: string, input: any): string {
  const s = useStore.getState()
  switch (name) {
    case 'save_athlete_profile':
      s.updateCoachProfile(input ?? {})
      return 'הפרופיל עודכן.'
    case 'set_training_plan': {
      const rawWeeks: any[] = Array.isArray(input.weeks) ? input.weeks : []
      // a plan replaces everything, so a half-valid one is worse than none:
      // reject it and say exactly what to resend rather than saving a week the
      // program page can't render
      const bad = rawWeeks.filter((w) => !weekStartOf(w?.weekStart))
      if (bad.length)
        return `לכל שבוע חייב להיות weekStart בפורמט yyyy-mm-dd. ${bad.length} מתוך ${rawWeeks.length} השבועות הגיעו בלי תאריך תקין, והתוכנית לא נשמרה. קרא שוב עם weekStart מלא (תאריך יום ראשון) לכל שבוע.`
      const plan: TrainingPlan = {
        raceName: input.raceName,
        raceDate: input.raceDate,
        weeks: rawWeeks.map(withIds),
      }
      s.setTrainingPlan(plan, 'המאמן החליף את התוכנית')
      // the plan is the source of truth here — pull the board (and the calendar
      // approval) along for any week the user has already started scheduling.
      // Read the weeks back from the store: a date that wasn't a Sunday was
      // snapped to one on the way in, and the board follows the saved week.
      const saved = useStore.getState().trainingPlan?.weeks ?? []
      for (const w of saved) s.syncBoardWithPlanWeek(w.weekStart)
      return `נשמרה תוכנית עם ${saved.length} שבועות, והלוח והאימון של היום עודכנו בהתאם.`
    }
    case 'upsert_plan_week': {
      const weekStart = weekStartOf(input.weekStart)
      if (!weekStart)
        return 'weekStart חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      if (weekStart !== input.weekStart)
        return `weekStart חייב להיות יום ראשון. השבוע של ${input.weekStart} מתחיל ב-${weekStart} — קרא שוב עם התאריך הזה.`
      s.upsertPlanWeek(withIds(input), `המאמן עדכן את השבוע של ${weekStart}`)
      s.syncBoardWithPlanWeek(weekStart)
      return `השבוע של ${weekStart} עודכן בתוכנית, והלוח והאימון של היום עודכנו בהתאם. השינויים ליומן ממתינים לאישור המשתמש בעמוד "שיבוץ ליומן".`
    }
    case 'add_plan_session': {
      const weekStart = weekStartOf(input.weekStart)
      if (!weekStart)
        return 'weekStart חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      const week = s.trainingPlan?.weeks.find((w) => w.weekStart === weekStart)
      if (!week)
        return `אין שבוע שמתחיל ב-${weekStart} בתוכנית. צור אותו קודם עם upsert_plan_week.`
      const day = Number(input.day)
      if (!(day >= 0 && day <= 6))
        return 'day חייב להיות מספר בין 0 (ראשון) ל-6 (שבת).'
      const session = {
        id: uid(),
        day,
        sport: input.sport,
        ...(input.label ? { label: input.label } : {}),
        ...(input.distance != null ? { distance: Number(input.distance) } : {}),
        ...(input.durationMin != null
          ? { durationMin: Number(input.durationMin) }
          : {}),
        ...(input.note ? { note: input.note } : {}),
      }
      s.upsertPlanWeek(
        { ...week, sessions: [...week.sessions, session] },
        'המאמן הוסיף אימון לתוכנית',
      )
      s.syncBoardWithPlanWeek(weekStart)
      return `נוסף אימון ${input.sport}${input.label ? ` (${input.label})` : ''} ביום ${HEB_DAYS[day]} לשבוע של ${weekStart}.`
    }
    case 'remove_plan_session': {
      const found = findSession(s.trainingPlan, input.sessionId)
      if (!found)
        return `לא נמצא אימון עם id ${input.sessionId}. בדוק את הרשימה במצב הנוכחי וקרא שוב עם id קיים.`
      const { week, session } = found
      s.upsertPlanWeek(
        { ...week, sessions: week.sessions.filter((x) => x.id !== session.id) },
        'המאמן הסיר אימון מהתוכנית',
      )
      s.syncBoardWithPlanWeek(week.weekStart)
      return `הוסר אימון ${session.sport}${session.label ? ` (${session.label})` : ''} מיום ${HEB_DAYS[session.day]} בשבוע של ${week.weekStart}.`
    }
    case 'update_plan_session': {
      const found = findSession(s.trainingPlan, input.sessionId)
      if (!found)
        return `לא נמצא אימון עם id ${input.sessionId}. בדוק את הרשימה במצב הנוכחי וקרא שוב עם id קיים.`
      const { week, session } = found
      if (input.day != null && !(Number(input.day) >= 0 && Number(input.day) <= 6))
        return 'day חייב להיות מספר בין 0 (ראשון) ל-6 (שבת).'
      const next = {
        ...session,
        ...(input.day != null ? { day: Number(input.day) } : {}),
        ...(input.sport ? { sport: input.sport } : {}),
        ...(input.label != null ? { label: input.label } : {}),
        ...(input.distance != null ? { distance: Number(input.distance) } : {}),
        ...(input.durationMin != null
          ? { durationMin: Number(input.durationMin) }
          : {}),
        ...(input.note != null ? { note: input.note } : {}),
      }
      s.upsertPlanWeek(
        {
          ...week,
          sessions: week.sessions.map((x) => (x.id === session.id ? next : x)),
        },
        'המאמן עדכן אימון בתוכנית',
      )
      s.syncBoardWithPlanWeek(week.weekStart)
      return `האימון עודכן: ${next.sport}${next.label ? ` (${next.label})` : ''} ביום ${HEB_DAYS[next.day]}, שבוע של ${week.weekStart}.`
    }
    case 'set_strength_workout':
      s.upsertStrengthWorkout(input.name, input.exercises ?? [])
      return `אימון הכוח "${input.name}" נשמר עם ${(input.exercises ?? []).length} תרגילים (מופיע בתוכנית אימונים → כוח).`
    case 'remove_strength_workout':
      s.removeStrengthWorkout(input.name)
      return `אימון הכוח "${input.name}" הוסר.`
    case 'add_planned_workout': {
      const weekStart = weekStartOf(input.date)
      if (!weekStart)
        return 'date חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      s.addPlanned({
        date: input.date,
        category: input.category,
        sport: input.sport,
        aerobicIntensity: input.aerobicIntensity,
        strengthName: input.strengthName,
        otherName: input.otherName,
        distance: input.distance,
        time: input.time,
        durationMin: input.durationMin,
        planSessionId: input.planSessionId,
      })
      // the board is only half the picture — pull the training plan (and with
      // it the "today" tile) into step, otherwise the workout is invisible there
      s.syncPlanWeekWithBoard(weekStart)
      return `אימון נוסף ללוח התכנון בתאריך ${input.date}, והתוכנית והאימון של היום עודכנו בהתאם. ממתין לאישור המשתמש לשליחה ליומן.`
    }
    case 'update_planned_workout': {
      const target = s.planned.find((p) => p.id === input.id)
      if (!target)
        return `לא נמצא אימון מתוכנן עם id ${input.id}. עיין ברשימת "אימונים מתוכננים ביומן" במצב הנוכחי וקרא שוב עם id משם.`
      if (input.date !== undefined && !weekStartOf(input.date))
        return 'date חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      const patch = pick(input, [
        'date',
        'time',
        'durationMin',
        'distance',
        'aerobicIntensity',
        'strengthName',
        'otherName',
      ])
      s.updatePlanned(input.id, patch)
      // a move can cross a week boundary — realign both weeks
      for (const ws of new Set(
        [weekStartOf(target.date), weekStartOf(input.date ?? target.date)].filter(
          (x): x is string => !!x,
        ),
      ))
        s.syncPlanWeekWithBoard(ws)
      return `האימון המתוכנן עודכן${input.date ? ` לתאריך ${input.date}` : ''}, והתוכנית והאימון של היום עודכנו בהתאם. ממתין לאישור המשתמש לשליחה ליומן.`
    }
    case 'remove_planned_workout': {
      const target = s.planned.find((p) => p.id === input.id)
      if (!target)
        return `לא נמצא אימון מתוכנן עם id ${input.id}. עיין ברשימת "אימונים מתוכננים ביומן" במצב הנוכחי וקרא שוב עם id משם.`
      s.removePlanned(input.id)
      const weekStart = weekStartOf(target.date)
      if (weekStart) s.syncPlanWeekWithBoard(weekStart)
      return 'האימון המתוכנן הוסר, והתוכנית והאימון של היום עודכנו בהתאם.'
    }
    case 'remember':
      s.addMemory(input.text ?? '')
      return 'נשמר בזיכרון המאמן.'
    case 'forget':
      s.removeMemory(input.id)
      return 'הוסר מזיכרון המאמן.'
    case 'log_workout': {
      const date = typeof input.date === 'string' ? input.date : toISODate(new Date())
      if (!weekStartOf(date))
        return 'date חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      const category = input.category
      if (!['strength', 'aerobic', 'other'].includes(category))
        return 'category חייב להיות strength / aerobic / other.'
      if (category === 'aerobic' && !['run', 'bike', 'swim'].includes(input.sport))
        return 'לאימון אירובי צריך sport: run / bike / swim.'
      // a Garmin activity for the same day and sport is already the truth —
      // logging over it would double-count the week and the training load
      const clash = s.log.find(
        (e) =>
          e.date === date &&
          e.category === category &&
          (category !== 'aerobic' || e.sport === input.sport),
      )
      if (clash)
        return `כבר רשום אימון כזה ב-${date} (id ${clash.id}). אם רצית להוסיף תחושה או הערה — השתמש ב-set_workout_debrief עם ה-id הזה במקום לרשום אימון חדש.`
      s.addEntry({
        date,
        category,
        ...pick(input, [
          'sport',
          'distance',
          'durationMin',
          'aerobicIntensity',
          'strengthName',
          'otherName',
          'rpe',
          'note',
        ]),
      } as Omit<WorkoutEntry, 'id'>)
      return `האימון נרשם ל-${date}. הוא מסומן אוטומטית מול התוכנית אם הוא מתאים לאימון מתוכנן.`
    }
    case 'set_workout_debrief': {
      const entry = s.log.find((e) => e.id === input.id)
      if (!entry)
        return 'לא נמצא אימון עם ה-id הזה. בדוק ברשימת "אימונים שבוצעו" במצב הנוכחי.'
      const rpe = input.rpe == null ? undefined : Math.round(Number(input.rpe))
      if (rpe != null && (!Number.isFinite(rpe) || rpe < 1 || rpe > 10))
        return 'rpe חייב להיות מספר שלם בין 1 ל-10.'
      s.updateEntry(entry.id, {
        ...(rpe != null ? { rpe } : {}),
        ...(typeof input.note === 'string' ? { note: input.note } : {}),
      })
      return `התחושה נשמרה על האימון של ${entry.date}.`
    }
    case 'log_weight': {
      const date = typeof input.date === 'string' ? input.date : toISODate(new Date())
      if (!weekStartOf(date))
        return 'date חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      const kg = Number(input.weightKg)
      if (!Number.isFinite(kg) || kg <= 0 || kg > 400)
        return 'weightKg חייב להיות משקל סביר בקילוגרמים.'
      s.addWeighIn(date, kg)
      return `נרשמה שקילה של ${kg} ק"ג ל-${date}.`
    }
    case 'propose_plan_week': {
      const proposedStart = weekStartOf(input.weekStart)
      if (!proposedStart)
        return 'weekStart חייב להיות תאריך בפורמט yyyy-mm-dd. נסה שוב עם תאריך תקין.'
      // a proposal is approved straight into the plan, so it has to carry the
      // same Sunday-only weekStart the plan itself is keyed by
      if (proposedStart !== input.weekStart)
        return `weekStart חייב להיות יום ראשון. השבוע של ${input.weekStart} מתחיל ב-${proposedStart} — קרא שוב עם התאריך הזה.`
      const w = withIds(input)
      s.addPlanProposal({
        weekStart: input.weekStart,
        label: input.label,
        focus: input.focus,
        rationale: input.rationale ?? '',
        sessions: w.sessions,
      })
      return `הצעה לשבוע ${input.weekStart} נוספה — ממתינה לאישור המשתמש בעמוד התוכנית.`
    }
    default:
      return 'כלי לא מוכר.'
  }
}

/** Planned-vs-done summary for one plan week, or null if no plan that week. */

/**
 * One logged strength session, exercise by exercise.
 *
 * The coach was only ever shown the strength *template* ("3×[8,8,8] @55"), so
 * it could describe the plan but never tell whether last week actually moved —
 * which is the one thing progressive overload needs. Sets are grouped in the
 * order they were worked and collapsed into "3×8 @55" runs, because a flat list
 * of twelve sets costs tokens without adding anything.
 */
function describeLoggedSets(e: WorkoutEntry): string[] {
  const byExercise: { name: string; sets: { reps: number; weightKg?: number }[] }[] = []
  for (const set of e.sets ?? []) {
    const last = byExercise[byExercise.length - 1]
    if (last && last.name === set.exerciseName) last.sets.push(set)
    else byExercise.push({ name: set.exerciseName, sets: [set] })
  }
  return byExercise.map(({ name, sets }) => {
    const runs: string[] = []
    let i = 0
    while (i < sets.length) {
      let n = 1
      while (
        i + n < sets.length &&
        sets[i + n].reps === sets[i].reps &&
        sets[i + n].weightKg === sets[i].weightKg
      )
        n += 1
      const w = sets[i].weightKg
      runs.push(`${n}×${sets[i].reps}${w ? ` @${w}` : ''}`)
      i += n
    }
    return `${name}: ${runs.join(', ')}`
  })
}

/** Sets per muscle group for a date range, against the MEV/MRV band. */
function volumeLines(from: string, to: string): string[] {
  const s = useStore.getState()
  const { byMuscle, untaggedSets } = volumeByMuscle(s.log, from, to)
  const worked = MUSCLE_GROUPS.filter((m) => byMuscle[m] > 0)
  if (!worked.length && !untaggedSets) return []
  const lines = worked.map(
    (m) =>
      `${muscleLabel[m]} ${byMuscle[m]}` +
      (byMuscle[m] < MEV ? ' (מתחת ל-MEV)' : byMuscle[m] > MRV ? ' (מעל MRV)' : ''),
  )
  const out = [`    נפח כוח (סטים לקבוצת שריר, MEV ${MEV} / MRV ${MRV}): ${lines.join(', ') || 'אין'}`]
  if (untaggedSets)
    out.push(`    ועוד ${untaggedSets} סטים בתרגילים שלא תויגו לקבוצת שריר.`)
  return out
}

function weekReview(weekStartISO: string, label: string): string | null {
  const s = useStore.getState()
  const w = s.trainingPlan?.weeks.find((x) => x.weekStart === weekStartISO)
  if (!w || !w.sessions.length) return null
  const comp = weekCompletion(w, s.log)
  const done = w.sessions.filter((x) => comp[x.id]?.done)
  const missed = w.sessions.filter((x) => !comp[x.id]?.done)
  const lines = [
    `  • ${label} (${weekStartISO}): בוצעו ${done.length}/${w.sessions.length}.`,
  ]
  if (missed.length)
    lines.push(
      '    לא בוצעו: ' +
        missed
          .map((x) => `${HEB_DAYS[x.day]} ${x.sport}${x.label ? `(${x.label})` : ''}`)
          .join(', '),
    )
  // what the strength work actually amounted to, so a week summary can talk
  // about volume per muscle instead of just "3/4 sessions done"
  lines.push(...volumeLines(weekStartISO, toISODate(addDays(fromISO(weekStartISO), 6))))
  return lines.join('\n')
}

/** Compact snapshot of app state, injected into the system prompt each turn. */
export function buildContext(): string {
  const s = useStore.getState()
  const today = toISODate(new Date())
  const week = weekDays(new Date())
  const parts: string[] = []
  parts.push(`תאריך היום: ${today}. השבוע הנוכחי: ${toISODate(week[0])} – ${toISODate(week[6])}.`)

  parts.push(
    'פרופיל: ' +
      (s.coachProfile ? JSON.stringify(s.coachProfile) : 'לא הוגדר עדיין.'),
  )

  if (s.coachMemory.length) {
    parts.push('זיכרון המאמן (עובדות מתמשכות לזכור; id | טקסט):')
    for (const m of s.coachMemory) parts.push(`  - ${m.id} | ${m.text}`)
  }

  if (s.trainingPlan && s.trainingPlan.weeks.length) {
    const p = s.trainingPlan
    parts.push(
      `תוכנית קיימת${p.raceName ? ` לקראת ${p.raceName}` : ''}${p.raceDate ? ` (${p.raceDate})` : ''} — ${p.weeks.length} שבועות:`,
    )
    parts.push('  (כל אימון מוצג כ: id | יום | ספורט — השתמש ב-id כדי לשבץ אותו ללוח)')
    for (const w of [...p.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart))) {
      const sess = w.sessions
        .map(
          (x) =>
            `${x.id}|${HEB_DAYS[x.day]}:${x.sport}${x.distance ? ` ${x.distance}` : ''}${x.label ? `(${x.label})` : ''}`,
        )
        .join(', ')
      parts.push(`• ${w.weekStart}${w.label ? ` [${w.label}]` : ''}: ${sess}`)
    }
  } else {
    parts.push('אין עדיין תוכנית אימונים אירובית.')
  }

  // gear only earns a line when something is actually worn — a healthy kit list
  // is noise, but shoes past their mileage are worth a word before an injury is
  const worn = activeGear(s.gear ?? [], s.log)
    .map((g) => ({ g, st: gearStatus(g, s.log) }))
    .filter(({ st }) => st.state !== 'ok')
  if (worn.length) {
    parts.push('ציוד שקרוב או עבר את יעד ההחלפה:')
    for (const { g, st } of worn) {
      const unit = metricLabel(g.metric)
      parts.push(
        `  - ${g.name}: ${formatUsage(st.used, g.metric)}/${formatUsage(st.target ?? 0, g.metric)} ${unit}` +
          (st.state === 'due' ? ' — עבר את היעד' : ` — נותרו ${formatUsage(st.remaining ?? 0, g.metric)}`),
      )
    }
  }

  if (s.strengthCategories.length) {
    parts.push('תוכנית כוח קיימת (אימונים ותרגילים):')
    for (const c of s.strengthCategories) {
      const ex = c.exercises
        .map(
          (e) =>
            `${e.name || '(ללא שם)'} ${e.sets}×[${e.reps.join(',')}]${e.weight ? ` @${e.weight}` : ''}`,
        )
        .join('; ')
      parts.push(`• ${c.name}: ${ex || 'אין תרגילים'}`)
    }
  } else {
    parts.push('אין עדיין תוכנית כוח.')
  }

  const volFrom = toISODate(addDays(new Date(), -27))
  const vol = volumeLines(volFrom, today)
  if (vol.length) {
    parts.push(`נפח כוח מצטבר (28 יום, ${volFrom} – ${today}):`)
    parts.push(...vol.map((l) => l.trim()).map((l) => '  ' + l))
  }

  const recent = [...s.log]
    .filter((e) => e.date >= toISODate(new Date(Date.now() - 21 * 86400000)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 25)
  if (recent.length) {
    parts.push(
      'אימונים שבוצעו (21 יום אחרונים; id | פרטים — השתמש ב-id ב-set_workout_debrief):',
    )
    for (const e of recent) {
      const bits = [e.id, e.date, categoryLabel[e.category]]
      if (e.sport) bits.push(sportLabel[e.sport])
      if (e.distance) bits.push(`${e.distance} ${e.sport ? sportUnit(e.sport) : ''}`)
      if (e.aerobicIntensity) bits.push(aerobicIntensityLabel[e.aerobicIntensity])
      const d = entryDuration(e)
      if (d) bits.push(formatDuration(d))
      if (e.avgHr) bits.push(`דופק ${e.avgHr}${e.maxHr ? `/${e.maxHr}` : ''}`)
      if (e.rpe) bits.push(`תחושה RPE ${e.rpe}/10`)
      if (e.source === 'garmin') bits.push('(גרמין)')
      if (e.sets?.length) {
        const kg = tonnage(e.sets)
        bits.push(`${e.sets.length} סטים${kg ? ` · ${kg} ק״ג סה״כ` : ''}`)
      }
      if (e.note) bits.push(`"${e.note}"`)
      parts.push('  - ' + bits.join(' · '))
      // the actual sets, so progressive overload has something to stand on
      for (const line of describeLoggedSets(e)) parts.push('      ' + line)
    }
  } else {
    parts.push('אין אימונים שבוצעו לאחרונה.')
  }

  // Garmin wellness — sleep & recovery signals for smarter coaching
  const garminDays = [...s.garminDaily]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)
  if (garminDays.length) {
    parts.push('נתוני שינה ובריאות מגרמין (14 יום אחרונים):')
    for (const g of garminDays) {
      const bits: string[] = [g.date]
      if (g.sleepScore != null) bits.push(`שינה ${g.sleepScore}`)
      if (g.sleepMin != null)
        bits.push(`${Math.floor(g.sleepMin / 60)}:${String(Math.round(g.sleepMin % 60)).padStart(2, '0')} שע׳`)
      if (g.steps != null) bits.push(`${g.steps} צעדים`)
      if (g.restingHr != null) bits.push(`דופק מנוחה ${g.restingHr}`)
      if (g.hrvLastNight != null) bits.push(`HRV ${g.hrvLastNight}`)
      if (g.bodyBatteryHigh != null) bits.push(`סוללת גוף ${g.bodyBatteryLow ?? '?'}-${g.bodyBatteryHigh}`)
      parts.push('  - ' + bits.join(' · '))
    }
  }

  // calendar commitments the coach should plan around
  const busy = s.calendarBusy
    .filter((b) => b.date >= today)
    .sort((a, b) => (a.date + (a.start ?? '')).localeCompare(b.date + (b.start ?? '')))
    .slice(0, 40)
  if (busy.length) {
    parts.push('מחויבויות ביומן (זמנים תפוסים — תכנן סביבם):')
    for (const b of busy) {
      const when = b.start ? `${b.start}${b.end ? `–${b.end}` : ''}` : 'כל היום'
      parts.push(`  - ${b.date} ${when} · ${b.title}`)
    }
  }

  // week review: planned vs done, current + previous week
  const curStart = toISODate(startOfWeek(new Date()))
  const prevStart = toISODate(addDays(startOfWeek(new Date()), -7))
  const reviews = [
    weekReview(prevStart, 'השבוע שעבר'),
    weekReview(curStart, 'השבוע הנוכחי'),
  ].filter(Boolean)
  if (reviews.length) {
    parts.push('סיכום השבוע (מתוכנן מול בוצע):')
    parts.push(...(reviews as string[]))
  }

  // מה שהמשתמש עצמו כתב על שבועות שהסתיימו. המספרים אומרים מה בוצע; זה אומר
  // למה — ושבוע שנפל בגלל עומס בעבודה ושבוע שנפל בגלל כאב נראים זהים בנתונים
  // אבל דורשים תגובה הפוכה.
  const written = (s.trainingPlan?.weeks ?? [])
    .filter((w) => w.review)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart))
    .slice(0, 8)
  if (written.length) {
    parts.push('מה שהמשתמש כתב על שבועות שהסתיימו (בלשונו):')
    for (const w of written) {
      parts.push(`  - שבוע ${w.weekStart}${w.label ? ` [${w.label}]` : ''}: ${w.review}`)
    }
  }

  const upcoming = s.planned
    .filter((p) => p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20)
  if (upcoming.length) {
    parts.push(
      'אימונים מתוכננים בלוח (id | תאריך | פרטים) — השתמש ב-id הזה ב-update_planned_workout / remove_planned_workout:',
    )
    for (const p of upcoming) {
      const state = p.needsPush
        ? ' (ממתין לסנכרון ליומן)'
        : p.syncedEventId
          ? ' (ביומן)'
          : ' (טרם נשלח ליומן)'
      parts.push(
        `  - ${p.id} | ${p.date}${p.time ? ` ${p.time}` : ''} | ${categoryLabel[p.category]}${p.sport ? ' ' + sportLabel[p.sport] : ''}${p.distance ? ' ' + p.distance : ''}${state}`,
      )
    }
  }

  return parts.join('\n')
}
