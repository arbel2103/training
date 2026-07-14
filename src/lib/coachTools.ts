import {
  uid,
  useStore,
  type PlanSession,
  type PlanWeek,
  type TrainingPlan,
} from '../store/useStore'
import { HEB_DAYS, toISODate, weekDays } from './dates'
import { entryDuration, formatDuration, sportUnit } from './calc'
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
- ייעץ והתייעץ: הצע גישה לתוכנית, שאל את המשתמש על העדפות (למשל אם חשוב לשמר מסת שריר — זה דורש יותר עבודת כוח ופחות נפח אירובי; אנשים שונים רוצים דגשים שונים), והגע להסכמה איתו לפני שאתה קובע תוכנית.

תוכנית טריאתלון/אירובי:
- כשאתה בונה או מעדכן תוכנית, שמור אותה עם set_training_plan (תוכנית מלאה) או upsert_plan_week (עדכון שבוע בודד). התוכנית מחולקת לשבועות; לכל שבוע weekStart (תאריך יום ראשון), ולכל אימון: יום בשבוע (0=ראשון … 6=שבת), ספורט (run/bike/swim/strength/other), תווית (למשל "ארוכה", "אינטרוולים"), ומרחק/משך. התוכנית מוצגת בעמוד "תוכנית אימונים" → אירובי, והאימונים שהמשתמש מבצע מסומנים אוטומטית ✓ מולה.
- התוכנית דינמית: אם המשתמש אומר שהיה עייף/חולה/עסוק — התאם ועדכן את השבוע הרלוונטי עם upsert_plan_week.

תוכנית כוח:
- כשסיכמתם על אימון כוח, שמור אותו עם set_strength_workout: שם האימון (למשל "חזה + יד אחורית", "רגליים", "גב") ורשימת תרגילים — לכל תרגיל: שם, מספר סטים, חזרות לכל סט (מערך באורך מספר הסטים, למשל [12,10,8]), ומשקל (טקסט, למשל "40 ק\\"ג" או "משקל גוף"). האימון מופיע בעמוד "תוכנית אימונים" → כוח כטאב עם טבלת התרגילים, והמשתמש יכול לערוך שם הכל.
- אם לא בטוח במשקל התחלתי — שאל את המשתמש מה המשקלים הנוכחיים שלו, או השאר משקל ריק שימלא בעצמו.
- קריאה חוזרת ל-set_strength_workout עם אותו שם מחליפה את התרגילים של אותו אימון (כך מעדכנים). remove_strength_workout מוחק אימון.

כללי:
- כדי לתזמן אימון ליום ספציפי ביומן, השתמש ב-add_planned_workout — הוא מופיע בעמוד "תכנון האימונים", והמשתמש מאשר ושולח ליומן שלו. אל תמציא — הוסף רק אימונים שסיכמתם.
- היה זמין תמיד לשאלות: התאוששות, טכניקה, תזונה בסיסית סביב אימונים, ותחושות. אם חסר לך מידע — שאל.
- דבר בעברית. תן תשובה ישירה ומקצועית; אל תנתח את ההיגיון הפנימי שלך בקול.
- למטה תמונת מצב עדכנית של הנתונים (פרופיל, תוכניות, אימונים שבוצעו לאחרונה, ואימונים מתוכננים ביומן). התבסס עליה.`

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
      },
      required: ['date', 'category'],
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
]

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

export function executeTool(name: string, input: any): string {
  const s = useStore.getState()
  switch (name) {
    case 'save_athlete_profile':
      s.updateCoachProfile(input ?? {})
      return 'הפרופיל עודכן.'
    case 'set_training_plan': {
      const plan: TrainingPlan = {
        raceName: input.raceName,
        raceDate: input.raceDate,
        weeks: (input.weeks ?? []).map(withIds),
      }
      s.setTrainingPlan(plan)
      return `נשמרה תוכנית עם ${plan.weeks.length} שבועות.`
    }
    case 'upsert_plan_week':
      s.upsertPlanWeek(withIds(input))
      return `השבוע של ${input.weekStart} עודכן בתוכנית.`
    case 'set_strength_workout':
      s.upsertStrengthWorkout(input.name, input.exercises ?? [])
      return `אימון הכוח "${input.name}" נשמר עם ${(input.exercises ?? []).length} תרגילים (מופיע בתוכנית אימונים → כוח).`
    case 'remove_strength_workout':
      s.removeStrengthWorkout(input.name)
      return `אימון הכוח "${input.name}" הוסר.`
    case 'add_planned_workout':
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
      })
      return `אימון נוסף ללוח התכנון בתאריך ${input.date}.`
    case 'remove_planned_workout':
      s.removePlanned(input.id)
      return 'האימון המתוכנן הוסר.'
    default:
      return 'כלי לא מוכר.'
  }
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

  if (s.trainingPlan && s.trainingPlan.weeks.length) {
    const p = s.trainingPlan
    parts.push(
      `תוכנית קיימת${p.raceName ? ` לקראת ${p.raceName}` : ''}${p.raceDate ? ` (${p.raceDate})` : ''} — ${p.weeks.length} שבועות:`,
    )
    for (const w of [...p.weeks].sort((a, b) => a.weekStart.localeCompare(b.weekStart))) {
      const sess = w.sessions
        .map(
          (x) =>
            `${HEB_DAYS[x.day]}:${x.sport}${x.distance ? ` ${x.distance}` : ''}${x.label ? `(${x.label})` : ''}`,
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
      parts.push('  - ' + bits.join(' · '))
    }
  } else {
    parts.push('אין אימונים שבוצעו לאחרונה.')
  }

  const upcoming = s.planned
    .filter((p) => p.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 20)
  if (upcoming.length) {
    parts.push('אימונים מתוכננים ביומן (id | תאריך | פרטים):')
    for (const p of upcoming) {
      parts.push(
        `  - ${p.id} | ${p.date} | ${categoryLabel[p.category]}${p.sport ? ' ' + sportLabel[p.sport] : ''}${p.distance ? ' ' + p.distance : ''}${p.syncedEventId ? ' (ביומן)' : ''}`,
      )
    }
  }

  return parts.join('\n')
}
