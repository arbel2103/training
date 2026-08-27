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

/**
 * Room for the model to think *and* answer.
 *
 * A reasoning model bills its hidden thinking to this same budget, so a tight
 * ceiling can be spent entirely on thinking and come back MAX_TOKENS with no
 * text — a long wait that produces nothing. Turning thinking off is not an
 * option: `thinkingBudget: 0` is rejected by these models at dispatch time
 * ("Request contains an invalid argument"), and it validates fine against the
 * field name alone, so it only fails once a real key gets it to the model.
 * Giving the budget headroom fixes the empty reply without the bad parameter.
 */
const MAX_OUTPUT_TOKENS = 32_000
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
 * The request never reached Google — no status, no body.
 *
 * `fetch` rejects with a bare `TypeError` for everything at this layer, and
 * Safari's text for it is the untranslatable "Load failed". Naming it as a
 * connection problem is the difference between a user who can act and one
 * staring at two English words.
 */
export class CoachNetworkError extends Error {
  constructor(cause?: unknown) {
    super(
      'לא הצלחתי להגיע לשרתים של גוגל. בדוק חיבור לאינטרנט — ואם אתה על רשת של מקום עבודה, VPN או Private Relay, נסה לכבות אותם או לעבור לרשת אחרת.',
      { cause },
    )
    this.name = 'CoachNetworkError'
  }
}

/** True for a failure at the connection layer rather than an HTTP response. */
const isNetworkFailure = (e: unknown) =>
  e instanceof TypeError || /load failed|network|fetch/i.test(String(e))

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
    // Safari reports an aborted fetch as a plain "Load failed" rather than an
    // AbortError, so the reason has to come from our own flags, not from `e`
    if (external?.aborted) throw new CoachAborted()
    if (timedOut)
      throw new Error(
        'גוגל לא הגיבה בזמן. נסה שוב — אם זה חוזר, נסה שאלה קצרה יותר.',
        { cause: e },
      )
    if (isNetworkFailure(e)) throw new CoachNetworkError(e)
    throw e
  } finally {
    clearTimeout(timer)
    external?.removeEventListener('abort', onExternalAbort)
  }
}

/**
 * Retry once on a dropped connection.
 *
 * Safe precisely because the failure is at the connection layer: nothing
 * reached Google, so nothing was generated and no tool ran. Mobile networks
 * drop the first request often enough — handing off between wifi and cellular,
 * waking from sleep — that one quiet retry turns a visible error into a
 * slightly slower answer.
 */
async function withRetry(attempt: () => Promise<Response>): Promise<Response> {
  try {
    return await attempt()
  } catch (e) {
    if (!(e instanceof CoachNetworkError)) throw e
    await new Promise((r) => setTimeout(r, 600))
    return attempt()
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
    res = await withRetry(() =>
      fetchWithTimeout(
        'https://generativelanguage.googleapis.com/v1beta/models',
        { headers: { 'x-goog-api-key': apiKey } },
      ),
    )
  } catch (e) {
    // a connection that never got there says nothing about the key — saying
    // otherwise sends people off to generate a replacement for no reason
    if (e instanceof CoachNetworkError) throw e
    throw new Error('אין חיבור לאינטרנט, או שגוגל לא זמינה כרגע. נסה שוב.', {
      cause: e,
    })
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

export interface DiagStep {
  name: string
  ok: boolean
  ms: number
  detail: string
}

/**
 * Walk the same path the coach takes, one widening step at a time.
 *
 * Key verification is a bare GET and passes even when the coach hangs, so it
 * proves almost nothing. These steps add one variable each — POST, then the
 * real system prompt, then the tools — so whichever one stalls names the cause
 * instead of leaving it to guesswork.
 */
export async function diagnose(
  apiKey: string,
  system: string,
  tools: any[],
): Promise<DiagStep[]> {
  const steps: DiagStep[] = []
  const post = async (name: string, body: unknown) => {
    const t0 = Date.now()
    try {
      const res = await fetchWithTimeout(endpoint(MODELS[0]), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
      })
      const ms = Date.now() - t0
      if (res.ok) {
        const j = await res.json()
        const c = j.candidates?.[0]
        const txt = (c?.content?.parts ?? [])
          .filter((p: any) => typeof p.text === 'string')
          .map((p: any) => p.text)
          .join('')
        steps.push({
          name,
          ok: true,
          ms,
          detail: txt ? `החזיר טקסט` : `ריק (${c?.finishReason ?? 'לא ידוע'})`,
        })
        return
      }
      const msg = await res.json().then(
        (j) => j?.error?.message ?? '',
        () => '',
      )
      steps.push({ name, ok: false, ms, detail: `${res.status}: ${msg.slice(0, 120)}` })
    } catch (e) {
      steps.push({
        name,
        ok: false,
        ms: Date.now() - t0,
        detail: e instanceof Error ? e.message.slice(0, 120) : String(e),
      })
    }
  }

  // One request, shaped exactly like the coach's, capped to a token of output.
  // Three widening probes were more informative but spent three generations of
  // a free-tier quota per press — enough to trigger the very 429 the user was
  // trying to diagnose.
  await post('בקשה מלאה (כמו המאמן)', {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: 'אמור שלום' }] }],
    ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
    generationConfig: { maxOutputTokens: 16, temperature: 0.1 },
  })
  return steps
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
    let quotaOnly = true
    for (const model of MODELS) {
      const res = await withRetry(() =>
        fetchWithTimeout(
          endpoint(model),
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
                maxOutputTokens: MAX_OUTPUT_TOKENS,
                // cool. The coach's job is to *act* — "drop Tuesday's strength
                // session" has to become a tool call every time, not most
                // times. Warmth buys nothing here and costs reliability: at
                // 0.4 the model would sometimes describe the change in prose
                // instead of emitting it.
                temperature: 0.1,
              },
            }),
          },
          signal,
        ),
      )
      if (res.ok) return res.json()

      let msg = ''
      try {
        const j = await res.json()
        msg = j?.error?.message ?? ''
      } catch {
        /* ignore */
      }
      // a bad key is the one failure no other model can rescue
      if (res.status === 400 && /api key/i.test(msg))
        throw new Error('מפתח ה-API לא תקין.')
      // everything else is a bad pairing with *this* model, not a dead end:
      // a parameter it won't take, a quota only it has spent, a name that
      // moved. Trying the next one costs a second and often just works.
      lastErr = `(${res.status}) ${msg.slice(0, 160)}`
      quotaOnly = quotaOnly && (res.status === 429 || res.status === 503)
    }
    // out of models — say which wall we hit, rather than always blaming quota
    throw new Error(
      quotaOnly
        ? `הגעת למכסה החינמית של Gemini כרגע — המתן דקה ונסה שוב. אם זה חוזר, ייתכן שהמכסה היומית נגמרה ותתאפס מחר. ${lastErr}`
        : `אף אחד מהמודלים לא קיבל את הבקשה. ${lastErr}`,
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
