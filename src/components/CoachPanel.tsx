import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { clearApiKey, getApiKey, hasApiKey } from '../lib/apiKey'
import { runCoach, type ApiMessage } from '../lib/coachApi'
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
                <div className="bg-bg border border-line rounded-2xl px-4 py-3 w-fit flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
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
