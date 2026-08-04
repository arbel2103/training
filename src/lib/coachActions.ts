// One-shot coach generations that don't belong to the chat.
// Reuses runCoach + buildContext.
import { useStore } from '../store/useStore'
import { getApiKey } from './apiKey'
import { runCoach } from './coachApi'
import { buildContext, COACH_TOOLS, executeTool, SYSTEM_PERSONA } from './coachTools'

const NO_KEY = 'צריך מפתח AI כדי להשתמש במאמן — פתח את המאמן והזן מפתח פעם אחת.'

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
