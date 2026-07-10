// The user's own Anthropic API key (BYOK), kept in localStorage separately from
// the main app store. Only ever sent directly to api.anthropic.com from the browser.
const KEY = 'anthropic-api-key'

export const getApiKey = (): string => localStorage.getItem(KEY) ?? ''
export const setApiKey = (k: string): void => localStorage.setItem(KEY, k.trim())
export const clearApiKey = (): void => localStorage.removeItem(KEY)
export const hasApiKey = (): boolean => getApiKey().length > 0
