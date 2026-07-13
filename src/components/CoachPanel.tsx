import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { clearApiKey, getApiKey, hasApiKey, setApiKey } from '../lib/apiKey'
import { runCoach, type ApiMessage } from '../lib/coachApi'
import {
  COACH_TOOLS,
  SYSTEM_PERSONA,
  buildContext,
  executeTool,
} from '../lib/coachTools'

const KICKOFF =
  'זוהי פתיחת השיחה הראשונה. הצג את עצמך בקצרה כמאמן הטריאתלון שלי, ואז התחל לשאול אותי בהדרגה את שאלות ההיכרות.'

function buildSystem() {
  return SYSTEM_PERSONA + '\n\n[מצב נוכחי]\n' + buildContext()
}

export default function CoachPanel({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const messages = useStore((s) => s.coachMessages)
  const addChatMessage = useStore((s) => s.addChatMessage)
  const clearCoachChat = useStore((s) => s.clearCoachChat)

  const [keySet, setKeySet] = useState(hasApiKey())
  const [keyInput, setKeyInput] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const kickedOff = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  async function callCoach(apiMessages: ApiMessage[]): Promise<string> {
    return runCoach({
      apiKey: getApiKey(),
      system: buildSystem(),
      messages: apiMessages,
      tools: COACH_TOOLS,
      onToolCall: (name, inp) => executeTool(name, inp),
    })
  }

  async function kickoff() {
    setLoading(true)
    setError(null)
    try {
      const reply = await callCoach([{ role: 'user', content: KICKOFF }])
      addChatMessage('assistant', reply)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setError(null)
    addChatMessage('user', text)
    const apiMessages: ApiMessage[] = useStore
      .getState()
      .coachMessages.map((m) => ({ role: m.role, content: m.text }))
    setLoading(true)
    try {
      const reply = await callCoach(apiMessages)
      addChatMessage('assistant', reply)
    } catch (e) {
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
          <div className="font-display text-lg font-bold">🏋️ המאמן שלי</div>
          <div className="flex items-center gap-1">
            {keySet && (
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="text-muted hover:text-ink px-2 py-1 text-sm"
                title="הגדרות"
              >
                ⚙️
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
          <div className="px-4 py-3 border-b border-line bg-bg text-sm flex flex-wrap gap-2 items-center">
            <span className="text-muted">מפתח API מחובר.</span>
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
        )}

        {!keySet ? (
          <div className="flex-1 overflow-auto p-6">
            <h3 className="font-display text-xl font-bold mb-2">חיבור המאמן</h3>
            <p className="text-sm text-muted mb-4 leading-relaxed">
              המאמן פועל עם <b>מפתח Google Gemini API משלך</b> (BYOK) —{' '}
              <b>חינם</b>, נשמר מקומית בדפדפן בלבד, ונשלח ישירות ל-Google. אין שרת
              ואין עלות.
            </p>
            <ol className="text-sm text-muted list-decimal pr-5 space-y-1 mb-4">
              <li>
                היכנס ל-{' '}
                <a
                  href="https://aistudio.google.com/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline"
                >
                  aistudio.google.com/apikey
                </a>{' '}
                → התחבר עם גוגל → <b>Create API key</b> (בלי כרטיס אשראי).
              </li>
              <li>העתק את המפתח (מתחיל ב-<code>AQ.</code> או <code>AIza</code>) והדבק כאן.</li>
            </ol>
            <input
              type="password"
              dir="ltr"
              className="input mb-3"
              placeholder="AQ...."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
            />
            <button
              onClick={() => {
                if (keyInput.trim().length < 20) {
                  setError('המפתח קצר מדי — ודא שהעתקת את כולו (Copy key).')
                  return
                }
                setApiKey(keyInput)
                setKeyInput('')
                setError(null)
                setKeySet(true)
              }}
              className="btn-primary"
            >
              שמור והתחל
            </button>
            {error && <p className="text-run text-sm mt-3">{error}</p>}
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && !loading && (
                <p className="text-muted text-sm text-center mt-6">
                  המאמן מתחיל שיחה…
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'ml-auto bg-ink text-white'
                      : 'bg-bg border border-line'
                  }`}
                >
                  {m.text}
                </div>
              ))}
              {loading && (
                <div className="bg-bg border border-line rounded-2xl px-4 py-2.5 text-muted text-sm w-fit">
                  המאמן כותב…
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
