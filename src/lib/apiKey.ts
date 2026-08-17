// The user's own Google Gemini API key (BYOK, free tier), kept in localStorage
// separately from the main store. Only ever sent directly to Google from the browser.
const KEY = 'gemini-api-key'

export const getApiKey = (): string => localStorage.getItem(KEY) ?? ''
export const setApiKey = (k: string): void =>
  localStorage.setItem(KEY, normalizeApiKey(k))
export const clearApiKey = (): void => localStorage.removeItem(KEY)
export const hasApiKey = (): boolean => getApiKey().length > 0

/**
 * Clean up a pasted key.
 *
 * Copying from AI Studio on a phone drags along trailing newlines, stray
 * spaces, and sometimes the quotes or the `key=` label from a code sample. A
 * key that fails only because of an invisible character is the worst kind of
 * setup failure, so strip all of that before anything else looks at the value.
 *
 * Only the *edges* are trimmed: whitespace in the middle means surrounding
 * prose came along too, and squeezing it out would turn "Your API key is …"
 * into something that passes every check and then fails against Google.
 */
export function normalizeApiKey(raw: string): string {
  return (raw ?? '')
    .trim()
    .replace(/^(?:api[_-]?key|key)\s*[:=]\s*/i, '')
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim()
}

/**
 * Why this pasted text can't be a Gemini key — or null when it looks like one.
 *
 * Shape only; a real check needs Google. This exists to name the mistakes
 * people actually make (pasting the page URL, pasting the surrounding text,
 * half a key) instead of answering every one of them with "too short".
 */
export function apiKeyShapeError(raw: string): string | null {
  const key = normalizeApiKey(raw)
  if (!key) return 'לא הודבק מפתח. העתק אותו מ-Google AI Studio ונסה שוב.'
  if (/^https?:\/\//i.test(key))
    return 'זו כתובת של אתר, לא מפתח. באתר של גוגל לחץ "Create API key" ואז על כפתור ההעתקה שליד המפתח.'
  if (/\s/.test(key) || /[^A-Za-z0-9._-]/.test(key))
    return 'נראה שהועתק גם טקסט מסביב, לא רק המפתח. לחץ על סמל ההעתקה שליד המפתח באתר של גוגל.'
  if (key.length < 30)
    return 'המפתח קצר מדי — ודא שהעתקת אותו במלואו (עדיף עם כפתור ההעתקה שליד המפתח).'
  return null
}
