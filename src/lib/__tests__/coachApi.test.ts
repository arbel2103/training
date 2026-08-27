import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CoachAborted, CoachNetworkError, runCoach, verifyApiKey } from '../coachApi'

/** A Gemini 200 reply carrying whatever parts the test wants. */
const reply = (parts: unknown[], finishReason = 'STOP') => ({
  ok: true,
  status: 200,
  json: async () => ({ candidates: [{ content: { parts }, finishReason }] }),
})

const errorReply = (status: number, message = '') => ({
  ok: false,
  status,
  json: async () => ({ error: { message } }),
})

const base = {
  apiKey: 'k',
  system: 'persona',
  messages: [{ role: 'user' as const, content: 'שלום' }],
  tools: [{ name: 'log_workout' }],
  onToolCall: async () => 'בוצע',
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('runCoach — the happy paths', () => {
  it('returns the model text', async () => {
    fetchMock.mockResolvedValue(reply([{ text: 'בוקר טוב' }]))
    await expect(runCoach(base)).resolves.toBe('בוקר טוב')
  })

  it('runs a tool, then returns the closing sentence', async () => {
    fetchMock
      .mockResolvedValueOnce(
        reply([{ functionCall: { name: 'log_workout', args: { distance: 5 } } }]),
      )
      .mockResolvedValueOnce(reply([{ text: 'רשמתי' }]))
    const onToolCall = vi.fn(async () => 'נרשם')
    await expect(runCoach({ ...base, onToolCall })).resolves.toBe('רשמתי')
    expect(onToolCall).toHaveBeenCalledWith('log_workout', { distance: 5 })
  })
})

describe('runCoach — replies that must not look like a hang', () => {
  /**
   * The failure this whole file exists for. A thinking-enabled model can spend
   * the entire output budget reasoning and come back with MAX_TOKENS and no
   * parts at all — a 200 that contains nothing.
   */
  it('answers when the model burns the budget and returns no content', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [{ finishReason: 'MAX_TOKENS' }] }),
    })
    await expect(runCoach(base)).resolves.toMatch(/ארוכה מדי/)
  })

  it('moves to the next model when one rejects a field it does not know', async () => {
    fetchMock
      .mockResolvedValueOnce(
        errorReply(400, 'Unknown name "thinkingConfig" at generation_config'),
      )
      .mockResolvedValueOnce(reply([{ text: 'עברתי למודל אחר' }]))
    await expect(runCoach(base)).resolves.toBe('עברתי למודל אחר')
  })

  it('answers when the reply has no candidates at all (safety block)', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ promptFeedback: { blockReason: 'SAFETY' } }),
    })
    const out = await runCoach(base)
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })

  it('does not loop forever when the model only ever calls tools', async () => {
    fetchMock.mockResolvedValue(
      reply([{ functionCall: { name: 'log_workout', args: {} } }]),
    )
    const out = await runCoach(base)
    expect(out).toContain('בוצע')
    // bounded: 6 turns, not unbounded
    expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(6)
  })

  it('reports the quota instead of stalling when every model is rate-limited', async () => {
    fetchMock.mockResolvedValue(errorReply(429, 'quota'))
    await expect(runCoach(base)).rejects.toThrow(/מכסה/)
  })

  it('falls through to the next model on 404 and still answers', async () => {
    fetchMock
      .mockResolvedValueOnce(errorReply(404, 'not found'))
      .mockResolvedValueOnce(reply([{ text: 'הנה' }]))
    await expect(runCoach(base)).resolves.toBe('הנה')
  })
})

describe('runCoach — cancelling and timing out', () => {
  it('surfaces a user cancel as CoachAborted, not a scary error', async () => {
    const ac = new AbortController()
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => {
            const e = new Error('aborted')
            e.name = 'AbortError'
            rej(e)
          })
        }),
    )
    const p = runCoach({ ...base, signal: ac.signal })
    ac.abort()
    await expect(p).rejects.toBeInstanceOf(CoachAborted)
  })

  it('refuses immediately when handed an already-aborted signal', async () => {
    const ac = new AbortController()
    ac.abort()
    await expect(runCoach({ ...base, signal: ac.signal })).rejects.toBeInstanceOf(
      CoachAborted,
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gives up on a connection that never answers', async () => {
    vi.useFakeTimers()
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => {
            const e = new Error('aborted')
            e.name = 'AbortError'
            rej(e)
          })
        }),
    )
    const p = runCoach(base)
    const assertion = expect(p).rejects.toThrow(/בזמן/)
    await vi.advanceTimersByTimeAsync(95_000)
    await assertion
  })
})

describe('a connection that never reaches Google', () => {
  /** What Safari actually throws — the words the user was shown on screen. */
  const loadFailed = () => new TypeError('Load failed')

  it('retries once, and succeeds on the second try', async () => {
    fetchMock
      .mockRejectedValueOnce(loadFailed())
      .mockResolvedValueOnce(reply([{ text: 'הצליח בשנייה' }]))
    await expect(runCoach(base)).resolves.toBe('הצליח בשנייה')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('explains the failure in Hebrew instead of showing "Load failed"', async () => {
    fetchMock.mockRejectedValue(loadFailed())
    const err = await runCoach(base).catch((e) => e)
    expect(err).toBeInstanceOf(CoachNetworkError)
    expect(err.message).not.toContain('Load failed')
    expect(err.message).toMatch(/אינטרנט/)
  })

  it('does not blame the key when verification cannot reach Google', async () => {
    fetchMock.mockRejectedValue(loadFailed())
    const err = await verifyApiKey('k').catch((e) => e)
    expect(err).toBeInstanceOf(CoachNetworkError)
    expect(err.message).not.toMatch(/מפתח/)
  })

  it('keeps a user cancel distinct from a network failure', async () => {
    // Safari reports an aborted fetch as "Load failed" too, so the abort flag
    // is what has to decide — otherwise cancelling shows a connection error
    const ac = new AbortController()
    fetchMock.mockImplementation(
      (_u: string, init: RequestInit) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener('abort', () => rej(loadFailed()))
        }),
    )
    const p = runCoach({ ...base, signal: ac.signal })
    ac.abort()
    await expect(p).rejects.toBeInstanceOf(CoachAborted)
  })
})

describe('what actually gets sent to Gemini', () => {
  const bodyOf = () => JSON.parse(fetchMock.mock.calls[0][1].body as string)

  it('does not let the model spend the whole budget on hidden thinking', async () => {
    fetchMock.mockResolvedValue(reply([{ text: 'ok' }]))
    await runCoach(base)
    const cfg = bodyOf().generationConfig
    // a thinking model with an unbounded budget can return MAX_TOKENS and no
    // text at all, which reads to the user as the coach being stuck
    expect(cfg.thinkingConfig?.thinkingBudget).toBe(0)
  })

  it('sends the persona, the tools and the conversation', async () => {
    fetchMock.mockResolvedValue(reply([{ text: 'ok' }]))
    await runCoach(base)
    const body = bodyOf()
    expect(body.systemInstruction.parts[0].text).toBe('persona')
    expect(body.tools[0].functionDeclarations).toHaveLength(1)
    expect(body.contents[0].parts[0].text).toBe('שלום')
  })
})
