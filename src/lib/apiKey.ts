// The user's own Google Gemini API key (BYOK, free tier), kept in localStorage
// separately from the main store. Only ever sent directly to Google from the browser.
const KEY = 'gemini-api-key'

export const getApiKey = (): string => localStorage.getItem(KEY) ?? ''
export const setApiKey = (k: string): void => localStorage.setItem(KEY, k.trim())
export const clearApiKey = (): void => localStorage.removeItem(KEY)
export const hasApiKey = (): boolean => getApiKey().length > 0
