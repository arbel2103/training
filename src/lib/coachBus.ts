/**
 * A one-line channel for "open the coach and ask it this".
 *
 * The nudge cards live on the home page and the coach lives in a floating
 * panel; routing a question between them through the store would persist a
 * transient string to localStorage, and through props would thread a callback
 * across half the tree. A single listener — there is only ever one coach panel
 * — is the smallest thing that works.
 */
type Listener = (prompt: string) => void

let listener: Listener | null = null

/** Open the coach with a question already asked. */
export function askCoach(prompt: string): void {
  listener?.(prompt)
}

/** The coach panel registers here; pass null on unmount. */
export function onAskCoach(fn: Listener | null): void {
  listener = fn
}
