import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { clearApiKey, getApiKey, hasApiKey } from '../lib/apiKey'
import {
  CoachAborted,
  CoachNetworkError,
  diagnose,
  runCoach,
  verifyApiKey,
  type ApiMessage,
  type DiagStep,
} from '../lib/coachApi'
import CoachSetup from './CoachSetup'
import {
  COACH_TOOLS,
  SYSTEM_PERSONA,
  buildContext,
  executeTool,
} from '../lib/coachTools'
import Icon from './ui/Icon'

const KICKOFF =
  'זוהי פתיחת השיחה הראשונה. הצג את עצמך בקצרה כמאמן האישי שלי, ושאל אותי קודם כל על מה נעבוד — אימוני כוח, טריאתלון/אירובי, או שניהם — ואז המשך לשאלות ההיכרות המתאימות.'

/** How many past chat turns to send. Enough to hold a thread of conversation. */
const HISTORY_TURNS = 30

function buildSystem() {
  return SYSTEM_PERSONA + '\n\n[מצב נוכחי]\n' + buildContext()
}

export default function CoachPanel({
  open,
  onClose,
  ask,
  onAsked,
}: {
  open: boolean
  onClose: () => void
  /** a question handed in from outside — asked once, on open */
  ask?: string | null
  onAsked?: () => void
}) {
  const messages = useStore((s) => s.coachMessages)
  const addChatMessage = useStore((s) => s.addChatMessage)
  const clearCoachChat = useStore((s) => s.clearCoachChat)
  const memory = useStore((s) => s.coachMemory)
  const removeMemory = useStore((s) => s.removeMemory)

  const [keySet, setKeySet] = useState(hasApiKey())
  const [showSettings, setShowSettings] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [diag, setDiag] = useState<string | null>(null)
  const [steps, setSteps] = useState<DiagStep[] | null>(null)
  const kickedOff = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages, loading])

  useEffect(() => {
    if (open && keySet && messages.length === 0 && !kickedOff.current) {
      kickedOff.current = true
      void kickoff()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, keySet])

  // a question routed in from a nudge card: ask it as though it were typed,
  // and clear it so reopening the panel doesn't ask again
  useEffect(() => {
    if (!open || !keySet || !ask) return
    kickedOff.current = true // it is the opener; no need for the introduction
    onAsked?.()
    void send(ask)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, keySet, ask])

  async function callCoach(apiMessages: ApiMessage[]): Promise<string> {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    return runCoach({
      apiKey: getApiKey(),
      system: buildSystem(),
      messages: apiMessages,
      tools: COACH_TOOLS,
      onToolCall: (name, inp) => executeTool(name, inp),
      signal: ac.signal,
    })
  }

  /**
   * Separates "the network can't get there" from "the key is wrong" from
   * "Google is fine and something else is broken" — three failures that look
   * identical from the chat, and need three different fixes.
   */
  async function testConnection() {
    setDiag('בודק…')
    setSteps(null)
    try {
      await verifyApiKey(getApiKey())
      setDiag('✓ הרשת והמפתח תקינים. בודק את הבקשה עצמה…')
    } catch (e) {
      if (e instanceof CoachNetworkError)
        setDiag('✗ אין דרך להגיע לגוגל מהמכשיר הזה. נסה רשת אחרת, או כבה VPN/Private Relay.')
      else setDiag(`✗ ${e instanceof Error ? e.message : String(e)}`)
      return
    }
    // the GET above passes even while the coach hangs, so keep going into the
    // POST path that actually carries the persona and the tools
    const out = await diagnose(getApiKey(), buildSystem(), COACH_TOOLS)
    setSteps(out)
    if (out.every((s) => s.ok)) {
      setDiag('✓ הכל תקין — הרשת, המפתח והבקשה של המאמן.')
      return
    }
    // 429 is the one failure the user can act on themselves, and it is by far
    // the most common on the free tier — name it instead of saying "נכשל"
    const quota = out.some((s) => s.detail.startsWith('429'))
    setDiag(
      quota
        ? '✗ נגמרה המכסה החינמית של Gemini לרגע זה. המתן דקה ונסה שוב — אם זה חוזר גם מחר, המכסה היומית נגמרה.'
        : '✗ הבקשה נכשלה — צלם את השורה למטה ושלח לי.',
    )
  }

  function cancelRequest() {
    abortRef.current?.abort()
    abortRef.current = null
    setLoading(false)
  }

  async function kickoff() {
    setLoading(true)
    setError(null)
    try {
      const reply = await callCoach([{ role: 'user', content: KICKOFF }])
      addChatMessage('assistant', reply)
    } catch (e) {
      if (!(e instanceof CoachAborted))
        setError(e instanceof Error ? e.message : String(e))
      kickedOff.current = false // allow retry
    } finally {
      setLoading(false)
    }
  }

  async function send(preset?: string) {
    const text = (preset ?? input).trim()
    if (!text || loading) return
    if (!preset) setInput('')
    setError(null)
    addChatMessage('user', text)
    // only the recent turns go to the model: the full state of the app is
    // rebuilt into the system prompt every turn anyway, so old chat adds
    // latency and cost without adding anything the coach doesn't already know
    const apiMessages: ApiMessage[] = useStore
      .getState()
      .coachMessages.slice(-HISTORY_TURNS)
      .map((m) => ({ role: m.role, content: m.text }))
    setLoading(true)
    try {
      const reply = await callCoach(apiMessages)
      addChatMessage('assistant', reply)
    } catch (e) {
      if (!(e instanceof CoachAborted))
        setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-stretch sm:items-center sm:justify-center bg-ink/40 backdrop-blur-sm sm:p-4">
      <div className="card shadow-pop w-full sm:max-w-2xl h-full sm:h-[85vh] flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <div className="font-display text-lg font-bold flex items-center gap-2">
            <Icon name="chat" className="w-5 h-5 text-accent" /> המאמן שלי
          </div>
          <div className="flex items-center gap-1">
            {keySet && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="text-muted hover:text-ink px-2 py-1"
                title="הגדרות"
              >
                <Icon name="gear" className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-muted hover:text-ink text-2xl leading-none px-2"
              aria-label="סגור"
            >
              ×
            </button>
          </div>
        </div>

        {showSettings && keySet && (
          <div className="px-4 py-3 border-b border-line bg-bg text-sm grid gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-muted">מפתח API מחובר.</span>
              <button onClick={() => void testConnection()} className="btn-ghost text-sm">
                בדוק חיבור
              </button>
              <button
                onClick={() => {
                  clearCoachChat()
                  kickedOff.current = false
                  setShowSettings(false)
                }}
                className="btn-ghost text-sm"
              >
                נקה שיחה
              </button>
              <button
                onClick={() => {
                  clearApiKey()
                  setKeySet(false)
                  setShowSettings(false)
                }}
                className="btn-ghost text-sm"
              >
                החלף/מחק מפתח
              </button>
            </div>
            {diag && <p className="text-xs leading-relaxed">{diag}</p>}
            {steps && (
              <ul className="grid gap-1 text-[11px]">
                {steps.map((s) => (
                  <li
                    key={s.name}
                    className="flex items-baseline gap-1.5 rounded-lg bg-surface border border-line px-2 py-1"
                  >
                    <span className={s.ok ? 'text-accent' : 'text-run'}>
                      {s.ok ? '✓' : '✗'}
                    </span>
                    <span className="flex-1 min-w-0">{s.name}</span>
                    <span className="text-muted tabular-nums shrink-0" dir="ltr">
                      {(s.ms / 1000).toFixed(1)}s
                    </span>
                    <span className="text-muted shrink-0">{s.detail}</span>
                  </li>
                ))}
              </ul>
            )}
            <div>
              <div className="font-semibold mb-1.5 flex items-center gap-1.5">
                <Icon name="brain" className="w-4 h-4 text-muted" /> מה שאני זוכר עליך
              </div>
              {memory.length === 0 ? (
                <p className="text-muted text-xs leading-relaxed">
                  עדיין לא שמרתי עובדות. ככל שנדבר, אזכור פציעות, העדפות ושיאים —
                  והם יופיעו כאן.
                </p>
              ) : (
                <ul className="grid gap-1.5">
                  {memory.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start gap-2 rounded-lg bg-surface border border-line px-2.5 py-1.5"
                    >
                      <span className="flex-1 leading-relaxed">{m.text}</span>
                      <button
                        onClick={() => removeMemory(m.id)}
                        className="text-muted hover:text-run shrink-0"
                        aria-label="הסר"
                        title="הסר מהזיכרון"
                      >
                        <Icon name="trash" className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!keySet ? (
          <CoachSetup onDone={() => setKeySet(true)} />
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && !loading && (
                <div className="text-center mt-8">
                  <Icon name="chat" className="w-10 h-10 mx-auto mb-3 text-accent" />
                  <p className="text-muted text-sm mb-4">
                    המאמן האישי שלך לטריאתלון — מוכן להתחיל.
                  </p>
                  <button
                    onClick={() => {
                      kickedOff.current = true
                      void kickoff()
                    }}
                    className="btn-primary"
                  >
                    התחל שיחה
                  </button>
                </div>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto bg-ink text-bg'
                      : 'bg-bg border border-line'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="bg-bg border border-line rounded-2xl px-4 py-3 w-fit flex items-center gap-1.5">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <button
                    onClick={cancelRequest}
                    className="text-muted hover:text-run text-xs shrink-0"
                    title="בטל"
                  >
                    ✕
                  </button>
                </div>
              )}
              {error && <p className="text-run text-sm">{error}</p>}
            </div>

            <div className="border-t border-line p-3 flex items-end gap-2 shrink-0">
              <textarea
                className="input flex-1 resize-none max-h-32"
                rows={1}
                placeholder="כתוב למאמן…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send()
                  }
                }}
              />
              <button
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="btn-primary shrink-0"
              >
                שלח
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
