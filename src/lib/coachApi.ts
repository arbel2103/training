/* eslint-disable @typescript-eslint/no-explicit-any */
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-opus-4-8'

export interface ApiMessage {
  role: 'user' | 'assistant'
  content: any // string or content-block array
}

interface RunArgs {
  apiKey: string
  system: string
  messages: ApiMessage[]
  tools: any[]
  onToolCall: (name: string, input: any) => string | Promise<string>
}

/**
 * Runs one coach turn: calls the Messages API, executes any tool_use blocks,
 * loops until a final text answer. Returns the assistant's text.
 */
export async function runCoach({
  apiKey,
  system,
  messages,
  tools,
  onToolCall,
}: RunArgs): Promise<string> {
  const msgs: ApiMessage[] = [...messages]

  for (let i = 0; i < 6; i++) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8000,
        system,
        tools,
        messages: msgs,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      if (res.status === 401) throw new Error('מפתח ה-API לא תקין (401).')
      if (res.status === 429) throw new Error('חריגה ממכסת השימוש (429) — נסה שוב מאוחר יותר.')
      throw new Error(`שגיאת API (${res.status}): ${text.slice(0, 300)}`)
    }

    const data = await res.json()
    msgs.push({ role: 'assistant', content: data.content })

    if (data.stop_reason === 'tool_use') {
      const results: any[] = []
      for (const block of data.content) {
        if (block.type === 'tool_use') {
          const out = await onToolCall(block.name, block.input)
          results.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: out,
          })
        }
      }
      msgs.push({ role: 'user', content: results })
      continue
    }

    return (data.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim()
  }

  return 'לא הצלחתי להשלים את הפעולה — נסה שוב.'
}
