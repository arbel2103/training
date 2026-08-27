/* eslint-disable @typescript-eslint/no-explicit-any */
// Google Gemini (free tier) — called directly from the browser with the user's key.
// Tried in order; each model has its own FREE-tier quota, so on 404/429/503 we
// fall through to the next. (Preview/gemini-3 models require billing → avoided.)
// Ordered by function-calling reliability, not by quota: the coach's whole job
// is to actually call its tools, and the lite model regularly answers "done!"
// in prose without emitting the call — which reads as the app ignoring you.
const MODELS = [
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-flash-lite-latest',
]
// per Google AI Studio's quickstart: auth via the x-goog-api-key header
const endpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: string
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
    res = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(15_000),
    })
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
      signal?.throwIfAborted()
      const timeout = AbortController.prototype ? new AbortController() : null
      const timer = timeout ? setTimeout(() => timeout.abort(), 30_000) : undefined
      const combined = new AbortController()
      signal?.addEventListener('abort', () => combined.abort(signal.reason), { once: true })
      timeout?.signal.addEventListener('abort', () => combined.abort('timeout'), { once: true })

      let res: Response
      try {
        res = await fetch(endpoint(model), {
          method: 'POST',
          signal: combined.signal,
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents,
            ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
            generationConfig: { maxOutputTokens: 8000, temperature: 0.4 },
          }),
        })
      } catch (e: any) {
        clearTimeout(timer)
        if (signal?.aborted) throw new Error('בוטל.')
        if (e?.name === 'AbortError' || String(e).includes('timeout'))
          throw new Error('הבקשה לקחה יותר מדי זמן — נסה שוב.')
        throw e
      } finally {
        clearTimeout(timer)
      }
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
    if (cand?.finishReason && cand.finishReason !== 'STOP' && !done.length)
      return 'לא הצלחתי לענות על זה — נסה לנסח אחרת.'
    return ranSomething()
  }

  return ranSomething()
}
