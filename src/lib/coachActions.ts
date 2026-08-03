// One-shot coach generations that don't belong to the chat.
// Reuses runCoach + buildContext.
import { useStore } from '../store/useStore'
import { getApiKey } from './apiKey'
import { runCoach } from './coachApi'
import { buildContext, COACH_TOOLS, executeTool, SYSTEM_PERSONA } from './coachTools'

const NO_KEY = 'צריך מפתח AI כדי להשתמש במאמן — פתח את המאמן (🏋️) והזן מפתח פעם אחת.'

const PROPOSE_SYSTEM = `${SYSTEM_PERSONA}

משימה כרגע: סקור את היענות המשתמש לתוכנית ("סיכום השבוע"), את התחושות (RPE/הערות) ואת נתוני ההתאוששות (שינה/HRV/סוללת גוף), והצע התאמות ל-1–3 השבועות הקרובים.
חובה: השתמש **אך ורק** בכלי propose_plan_week לכל שבוע שאתה משנה — אל תחיל שינויים ישירות. לכל הצעה כלול rationale קצר שמסביר למה. אחרי ההצעות כתוב סיכום קצר בעברית של מה שהצעת ולמה.`

// only the proposal tool — so this flow can never mutate the plan directly
const PROPOSE_TOOLS = COACH_TOOLS.filter((t) => t.name === 'propose_plan_week')

const ZONE_SYSTEM = `${SYSTEM_PERSONA}

משימה כרגע: המשתמש מציג לך את פילוח זמן האימון שלו לפי אזורי דופק בתקופה האחרונה.
נתח **האם היחס בין אימונים קלים לעצימים מתאים לו**, לפי עקרונות אימון סיבולת (אימון מקוטב: רוב הנפח קל מאוד, מיעוט עצים, מעט מאוד "אזור אפור" בינוני), ובהתחשב בתוכנית, בתחרות הקרובה, בנתוני ההתאוששות ובתחושות (RPE) שבמצב הנוכחי.
כתוב 3–5 משפטים בעברית: מה היחס אומר עליו, האם זה טוב למטרה שלו, ומה קונקרטית לשנות (אם צריך). בלי כלים — טקסט בלבד.`

/** Ask the coach to assess the easy/hard training-intensity balance. */
export async function requestZoneFeedback(summary: string): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error(NO_KEY)
  return runCoach({
    apiKey,
    system: `${ZONE_SYSTEM}\n\nמצב נוכחי:\n${buildContext()}`,
    messages: [{ role: 'user', content: `פילוח אזורי הדופק שלי:\n${summary}` }],
    tools: [],
    onToolCall: () => 'no tools',
  })
}

/** Ask the coach to propose plan changes (stored as proposals awaiting approval). */
export async function requestPlanRecommendations(): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error(NO_KEY)
  useStore.getState().clearPlanProposals()
  return runCoach({
    apiKey,
    system: `${PROPOSE_SYSTEM}\n\nמצב נוכחי:\n${buildContext()}`,
    messages: [
      { role: 'user', content: 'תן לי המלצות להמשך התוכנית, כהצעות לאישור.' },
    ],
    tools: PROPOSE_TOOLS,
    onToolCall: (name, args) => executeTool(name, args),
  })
}
