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

interface RunArgs {
  apiKey: string
  system: string
  messages: ApiMessage[]
  tools: any[] // Gemini functionDeclarations
  onToolCall: (name: string, args: any) => string | Promise<string>
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
}: RunArgs): Promise<string> {
  const contents: any[] = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  // request one turn, falling through the model list on 404/429/503
  async function generate(): Promise<any> {
    let lastErr = ''
    for (const model of MODELS) {
      const res = await fetch(endpoint(model), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents,
          ...(tools.length ? { tools: [{ functionDeclarations: tools }] } : {}),
          // warm enough to coach in natural Hebrew, cool enough that "move
          // Tuesday's run to Thursday" reliably becomes a tool call
          generationConfig: { maxOutputTokens: 8000, temperature: 0.4 },
        }),
      })
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
