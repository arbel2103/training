// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import CoachPanel from '../CoachPanel'
import { useStore } from '../../store/useStore'

vi.mock('../../lib/apiKey', () => ({
  hasApiKey: () => true,
  getApiKey: () => 'test-key',
  clearApiKey: vi.fn(),
}))

// the persona and the app-state snapshot are irrelevant here and expensive to
// build; what is under test is how the panel sequences requests
vi.mock('../../lib/coachTools', () => ({
  SYSTEM_PERSONA: 'persona',
  COACH_TOOLS: [],
  buildContext: () => 'context',
  executeTool: vi.fn(),
}))

const runCoach = vi.fn()
vi.mock('../../lib/coachApi', async (orig) => {
  const actual = await orig<typeof import('../../lib/coachApi')>()
  return { ...actual, runCoach: (...a: unknown[]) => runCoach(...a) }
})

const userMessages = () =>
  useStore.getState().coachMessages.filter((m) => m.role === 'user')

/** Never settles — stands in for a request still in flight. */
const pending = () => new Promise<string>(() => {})

/**
 * Two taps landing in one tick, the way a real double-tap does.
 *
 * `fireEvent.click` twice is not the same thing: each call flushes React state
 * on its way out, so the second one sees `loading` already true and the race
 * never happens. Dispatching both inside a single `act` keeps them in the same
 * batch, which is what made the message post twice on the phone.
 */
async function doubleTap(el: Element) {
  await act(async () => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

beforeEach(() => {
  // jsdom implements no scrolling at all; the panel autoscrolls on every new
  // message, so without this every render throws
  Element.prototype.scrollTo = () => {}
  runCoach.mockReset()
  // a chat with history so the panel does not fire its opening kickoff
  useStore.setState({
    coachMessages: [{ id: 'seed', role: 'assistant', text: 'שלום' }],
    coachMemory: [],
  })
})
afterEach(cleanup)

function open() {
  render(<CoachPanel open onClose={() => {}} />)
  return {
    box: screen.getByPlaceholderText('כתוב למאמן…'),
    send: screen.getByRole('button', { name: 'שלח' }),
  }
}

describe('sending a message', () => {
  it('sends once when the button is tapped twice in the same tick', async () => {
    runCoach.mockImplementation(pending)
    const { box, send } = open()
    fireEvent.change(box, { target: { value: 'תוריד את הכוח של שלישי' } })

    await doubleTap(send)

    await waitFor(() => expect(userMessages()).toHaveLength(1))
    expect(runCoach).toHaveBeenCalledTimes(1)
  })

  it('keeps showing it is working while the request is in flight', async () => {
    runCoach.mockImplementation(pending)
    const { box, send } = open()
    fireEvent.change(box, { target: { value: 'שאלה' } })
    await doubleTap(send)

    // the second call used to abort the first, whose finally then cleared the
    // spinner — leaving no dots, no error and no reply
    await waitFor(() => expect(screen.getByTitle('בטל')).toBeTruthy())
  })

  it('shows the reply and accepts the next message afterwards', async () => {
    runCoach.mockResolvedValueOnce('בוצע').mockResolvedValueOnce('ועוד אחד')
    const { box, send } = open()

    fireEvent.change(box, { target: { value: 'ראשונה' } })
    fireEvent.click(send)
    await screen.findByText('בוצע')

    fireEvent.change(box, { target: { value: 'שנייה' } })
    fireEvent.click(send)
    await screen.findByText('ועוד אחד')

    expect(userMessages().map((m) => m.text)).toEqual(['ראשונה', 'שנייה'])
  })

  it('surfaces a failure and lets the user try again', async () => {
    runCoach.mockRejectedValueOnce(new Error('נפילה')).mockResolvedValueOnce('שוב')
    const { box, send } = open()

    fireEvent.change(box, { target: { value: 'שאלה' } })
    fireEvent.click(send)
    await screen.findByText('נפילה')

    fireEvent.change(box, { target: { value: 'שוב בבקשה' } })
    fireEvent.click(send)
    await screen.findByText('שוב')
  })

  it('ignores an empty message', () => {
    runCoach.mockImplementation(pending)
    const { send } = open()
    fireEvent.click(send)
    expect(runCoach).not.toHaveBeenCalled()
    expect(userMessages()).toHaveLength(0)
  })
})

describe('cancelling', () => {
  it('frees the panel to send again', async () => {
    runCoach.mockImplementationOnce(pending).mockResolvedValueOnce('אחרי ביטול')
    const { box, send } = open()
    fireEvent.change(box, { target: { value: 'ראשונה' } })
    fireEvent.click(send)

    fireEvent.click(await screen.findByTitle('בטל'))

    fireEvent.change(box, { target: { value: 'שנייה' } })
    fireEvent.click(send)
    await screen.findByText('אחרי ביטול')
    expect(runCoach).toHaveBeenCalledTimes(2)
  })
})
