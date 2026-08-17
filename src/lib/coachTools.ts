import {
  uid,
  useStore,
  type PlanSession,
  type PlanWeek,
  type TrainingPlan,
} from '../store/useStore'
import { HEB_DAYS, addDays, startOfWeek, toISODate, weekDays } from './dates'
import { entryDuration, formatDuration, sportUnit } from './calc'
import { weekCompletion } from './planMatch'
import { weekStartOf } from './planSanitize'
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
- התוכנית דינמית: אם המשתמש אומר שהיה עייף/חולה/עסוק — התאם ועדכן את השבוע הרלוונטי עם upsert_plan_week.
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

כללי:
- כדי לתזמן אימון ליום ספציפי ביומן, השתמש ב-add_planned_workout — הוא מופיע בעמוד "תכנון האימונים", והמשתמש מאשר ושולח ליומן שלו. אל תמציא — הוסף רק אימונים שסיכמתם.
- **התחשב במחויבויות מהיומן** (ראה "מחויבויות ביומן" במצב הנוכחי) כשאתה מתזמן — אל תשבץ אימון על שעה תפוסה, ותכנן סביב עבודה/משמרות/אירועים. אם יום עמוס, הצע אימון קצר יותר או הזז ליום אחר.
- **שים לב לתחושת המאמץ (RPE 1–10) ולהערות** שהמשתמש רשם על אימונים. אם רואים עייפות מצטברת או RPE גבוה עקבי — הורד עומס, הצע התאוששות, ועדכן את השבוע עם upsert_plan_week.
- **סיכום שבוע:** אם המשתמש מבקש לסכם את השבוע, עבור על "סיכום השבוע" במצב הנוכחי (מתוכנן מול בוצע), תן פידבק קצר וקונקרטי (מה הלך טוב, מה חסר), והצע התאמות לשבוע הבא — עדכן בפועל עם upsert_plan_week אם צריך.
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
    description: 'מעדכן או מוסיף שבוע בודד בתוכנית (לשינויים דינמיים).',
    parameters: weekSchema,
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
      s.setTrainingPlan(plan)
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
      s.upsertPlanWeek(withIds(input))
      s.syncBoardWithPlanWeek(weekStart)
      return `השבוע של ${weekStart} עודכן בתוכנית, והלוח והאימון של היום עודכנו בהתאם. השינויים ליומן ממתינים לאישור המשתמש בעמוד "שיבוץ ליומן".`
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

  const recent = [...s.log]
    .filter((e) => e.date >= toISODate(new Date(Date.now() - 21 * 86400000)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 25)
  if (recent.length) {
    parts.push('אימונים שבוצעו (21 יום אחרונים):')
    for (const e of recent) {
      const bits = [e.date, categoryLabel[e.category]]
      if (e.sport) bits.push(sportLabel[e.sport])
      if (e.distance) bits.push(`${e.distance} ${e.sport ? sportUnit(e.sport) : ''}`)
      if (e.aerobicIntensity) bits.push(aerobicIntensityLabel[e.aerobicIntensity])
      const d = entryDuration(e)
      if (d) bits.push(formatDuration(d))
      if (e.avgHr) bits.push(`דופק ${e.avgHr}${e.maxHr ? `/${e.maxHr}` : ''}`)
      if (e.rpe) bits.push(`תחושה RPE ${e.rpe}/10`)
      if (e.source === 'garmin') bits.push('(גרמין)')
      if (e.note) bits.push(`"${e.note}"`)
      parts.push('  - ' + bits.join(' · '))
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
