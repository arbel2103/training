// One-shot coach generations that don't belong to the chat: the morning brief
// and plan-recommendation proposals. Both reuse runCoach + buildContext.
import { useStore } from '../store/useStore'
import { getApiKey } from './apiKey'
import { runCoach } from './coachApi'
import { buildContext, COACH_TOOLS, executeTool, SYSTEM_PERSONA } from './coachTools'
import { toISODate } from './dates'

const NO_KEY = 'צריך מפתח AI כדי להשתמש במאמן — פתח את המאמן (🏋️) והזן מפתח פעם אחת.'

const BRIEF_SYSTEM = `${SYSTEM_PERSONA}

משימה כרגע: כתוב "תדריך בוקר" קצר וממוקד (2–4 משפטים, בעברית, בגוף שני, טון מעודד).
התבסס על נתוני הבוקר שבמצב הנוכחי — שינה של אתמול (ציון/משך), HRV מול הבסיס, סוללת גוף, דופק מנוחה — ועל האימון/ים המתוכננים להיום.
כלול: (1) הערכת מוכנות/התאוששות קצרה, (2) המלצה קונקרטית אחת לאימון של היום (להתאים עצימות / לדחות / חימום / שתייה וכו').
אל תמציא נתונים שאין. אם אין נתוני גרמין עדכניים — תן טיפ קצר לאימון המתוכנן בלבד. ענה בטקסט בלבד, בלי כלים.`

/** Generate today's morning brief and store it (one per calendar day). */
export async function generateMorningBrief(): Promise<string> {
  const apiKey = getApiKey()
  if (!apiKey) throw new Error(NO_KEY)
  const text = await runCoach({
    apiKey,
    system: `${BRIEF_SYSTEM}\n\nמצב נוכחי:\n${buildContext()}`,
    messages: [{ role: 'user', content: 'תן לי את תדריך הבוקר להיום.' }],
    tools: [],
    onToolCall: () => 'no tools',
  })
  useStore.getState().setMorningBrief({
    date: toISODate(new Date()),
    text,
    createdAt: new Date().toISOString(),
  })
  return text
}

const PROPOSE_SYSTEM = `${SYSTEM_PERSONA}

משימה כרגע: סקור את היענות המשתמש לתוכנית ("סיכום השבוע"), את התחושות (RPE/הערות) ואת נתוני ההתאוששות (שינה/HRV/סוללת גוף), והצע התאמות ל-1–3 השבועות הקרובים.
חובה: השתמש **אך ורק** בכלי propose_plan_week לכל שבוע שאתה משנה — אל תחיל שינויים ישירות. לכל הצעה כלול rationale קצר שמסביר למה. אחרי ההצעות כתוב סיכום קצר בעברית של מה שהצעת ולמה.`

// only the proposal tool — so this flow can never mutate the plan directly
const PROPOSE_TOOLS = COACH_TOOLS.filter((t) => t.name === 'propose_plan_week')

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
