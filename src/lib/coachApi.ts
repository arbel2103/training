/* eslint-disable @typescript-eslint/no-explicit-any */
// Google Gemini (free tier) — called directly from the browser with the user's key.
// Tried in order; each model has its own FREE-tier quota, so on 404/429/503 we
// fall through to the next. (Preview/gemini-3 models require billing → avoided.)
// Ordered by function-calling reliability, not by quota: the coach's whole job
// is to actually call its tools, and the lite model regularly answers "done!"
// in prose without emitting the call — which reads as the app ignoring you.
/**
 * `thinking` marks a model that reasons before answering — and that bills that
 * reasoning to the same output budget as the reply. Left unbounded, it can
 * spend the entire budget thinking and return MAX_TOKENS with no text at all,
 * which the user experiences as the coach hanging and then saying nothing. The
 * budget is pinned to 0 for those; the older 2.0 model rejects the field, so it
 * must not be sent one.
 */
const MODELS: { id: string; thinking: boolean }[] = [
  { id: 'gemini-flash-latest', thinking: true },
  { id: 'gemini-2.0-flash', thinking: false },
  { id: 'gemini-flash-lite-latest', thinking: true },
]
// per Google AI Studio's quickstart: auth via the x-goog-api-key header
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
}

/**
 * A generation with a full context and tool calls is legitimately slow — this
 * is a stuck-connection guard, not a latency budget. Too tight and it kills
 * answers that were on their way.
 */
const REQUEST_TIMEOUT_MS = 90_000

/** Thrown when the user pressed cancel — the panel shows no error for it. */
export class CoachAborted extends Error {
  constructor() {
    super('בוטל.')
    this.name = 'CoachAborted'
  }
}

/**
 * `fetch` that cannot hang forever, and that the caller can cancel.
 *
 * Deliberately built from plain `AbortController` + `setTimeout`: the tidier
 * `AbortSignal.timeout()`/`signal.throwIfAborted()` are recent additions and
 * are missing on older iOS Safari, where merely calling them throws and takes
 * the whole coach down.
 */
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  external?: AbortSignal,
): Promise<Response> {
  if (external?.aborted) throw new CoachAborted()
  const ac = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ac.abort()
  }, REQUEST_TIMEOUT_MS)
  const onExternalAbort = () => ac.abort()
  external?.addEventListener('abort', onExternalAbort)
  try {
    return await fetch(url, { ...init, signal: ac.signal })
  } catch (e) {
    if (external?.aborted) throw new CoachAborted()
    if (timedOut)
      throw new Error(
        'גוגל לא הגיבה בזמן. נסה שוב — אם זה חוזר, נסה שאלה קצרה יותר.',
        { cause: e },
      )
    throw e
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', onExternalAbort)
  }
}

/** Google's reply to a bad key, in words the person setting it up can use. */
export function keyCheckMessage(status: number, detail = ''): string {
  if (status === 400 || status === 401 || status === 403)
    return /expired|disabled/i.test(detail)
      ? 'המפתח הזה בוטל או פג. צור מפתח חדש ב-Google AI Studio ונסה שוב.'
      : 'גוגל לא מזהה את המפתח הזה. ודא שהעתקת אותו במלואו מ-Google AI Studio, או צור מפתח חדש.'
  if (status === 429)
    return 'המפתח תקין, אבל גוגל מגבילה כרגע את מספר הבקשות. המתן דקה ונסה שוב.'
  return `לא הצלחתי לאמת את המפתח מול גוגל (שגיאה ${status}). בדוק חיבור לאינטרנט ונסה שוב.`
}

/**
 * Check a key against Google before saving it.
 *
 * Lists the available models rather than generating anything: it is the
 * cheapest call that still proves the key is real, and it spends none of the
 * free generation quota. Without this the key is accepted on length alone and
 * the first sign of a typo is the coach failing mid-sentence later.
 */
export async function verifyApiKey(apiKey: string): Promise<void> {
  let res: Response
  try {
    res = await fetchWithTimeout(
      'https://generativelanguage.googleapis.com/v1beta/models',
      { headers: { 'x-goog-api-key': apiKey } },
    )
  } catch {
    throw new Error('אין חיבור לאינטרנט, או שגוגל לא זמינה כרגע. נסה שוב.')
  }
  if (res.ok) return
  let detail = ''
  try {
    detail = (await res.json())?.error?.message ?? ''
  } catch {
    /* the status alone is enough to explain this */
  }
  throw new Error(keyCheckMessage(res.status, detail))
}

interface RunArgs {
  apiKey: string
  system: string
  messages: ApiMessage[]
  tools: any[] // Gemini functionDeclarations
  onToolCall: (name: string, args: any) => string | Promise<string>
  signal?: AbortSignal
}

/**
 * Runs one coach turn against Gemini: sends the conversation, executes any
 * functionCall parts, loops until a final text answer. Returns the text.
 */
export async function runCoach({
  apiKey,
  system,
  messages,
  tools,
  onToolCall,
  signal,
}: RunArgs): Promise<string> {
  const contents: any[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // request one turn, falling through the model list on 404/429/503
  async function generate(): Promise<any> {
    let lastErr = ''
    for (const model of MODELS) {
      const res = await fetchWithTimeout(
        endpoint(model.id),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
            generationConfig: {
              maxOutputTokens: 8000,
              // warm enough to coach in natural Hebrew, cool enough that "move
              // Tuesday's run to Thursday" reliably becomes a tool call
              temperature: 0.4,
              ...(model.thinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
          }),
        },
        signal,
      )
      if (res.ok) return res.json()

      let msg = ''
      try {
        const j = await res.json()
        msg = j?.error?.message ?? ''
      } catch {
        /* ignore */
      }
      if (res.status === 400 && /api key/i.test(msg))
        throw new Error('מפתח ה-API לא תקין.')
      // a model that doesn't know a field we sent (thinkingConfig on an older
      // one) is a bad pairing, not a dead end — the next model may take it
      if (res.status === 400 && /unknown name|invalid json|not supported/i.test(msg)) {
        lastErr = `(400) ${msg.slice(0, 160)}`
        continue
      }
      if (res.status === 404 || res.status === 429 || res.status === 503) {
        lastErr = `(${res.status}) ${msg.slice(0, 160)}`
        continue // try the next model
      }
      throw new Error(`שגיאת API (${res.status}): ${msg.slice(0, 200)}`)
    }
    throw new Error(
      `הגעת למכסה החינמית של Gemini כרגע — המתן דקה ונסה שוב. אם זה חוזר, ייתכן שהמכסה היומית נגמרה ותתאפס מחר. ${lastErr}`,
    )
  }

  // once a tool has run the change is already saved, so a missing closing
  // sentence must not be reported as "nothing happened"
  const done: string[] = []
  const ranSomething = () =>
    done.length
      ? `בוצע: ${done.join(', ')}. (לא הצלחתי לנסח סיכום — בדוק בעמוד הרלוונטי.)`
      : 'לא הצלחתי להשלים את הפעולה — נסה שוב.'

  for (let i = 0; i < 6; i++) {
    if (signal?.aborted) throw new CoachAborted()
    const data = await generate()
    const cand = data.candidates?.[0]
    const parts: any[] = cand?.content?.parts ?? []
    contents.push({ role: 'model', parts })

    const calls = parts.filter((p) => p.functionCall)
    if (calls.length) {
      const respParts: any[] = []
      for (const c of calls) {
        const out = await onToolCall(c.functionCall.name, c.functionCall.args ?? {})
        done.push(c.functionCall.name)
        respParts.push({
          functionResponse: {
            name: c.functionCall.name,
            response: { result: out },
          },
        })
      }
      contents.push({ role: 'user', parts: respParts })
      continue
    }

    const text = parts
      .filter((p) => typeof p.text === 'string')
      .map((p) => p.text)
      .join('\n')
      .trim()
    if (text) return text
    // ran out of room before writing anything — the answer was too long, not
    // impossible, so say that rather than blaming the question
    if (cand?.finishReason === 'MAX_TOKENS' && !done.length)
      return 'התשובה יצאה ארוכה מדי ונקטעה. נסה לשאול על דבר אחד ספציפי.'
    if (cand?.finishReason && cand.finishReason !== 'STOP' && !done.length)
      return 'לא הצלחתי לענות על זה — נסה לנסח אחרת.'
    return ranSomething()
  }

  return ranSomething()
}
