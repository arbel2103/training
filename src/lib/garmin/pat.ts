// The user's fine-grained GitHub PAT for the private data repo (BYOK), kept in
// localStorage separately from the main store — same pattern as the Gemini key.
// Only ever sent directly to the GitHub API from the browser.

const PAT_KEY = 'github-data-pat'
const REPO_KEY = 'garmin-data-repo'
const DEFAULT_REPO = 'arbel2103/training-data'

export const getPat = (): string => localStorage.getItem(PAT_KEY) ?? ''
export const setPat = (v: string): void => localStorage.setItem(PAT_KEY, v.trim())
export const clearPat = (): void => localStorage.removeItem(PAT_KEY)
export const hasPat = (): boolean => getPat().length > 0

/** "owner/repo" of the private data repo; overridable for future-proofing. */
export const getDataRepo = (): string =>
  localStorage.getItem(REPO_KEY)?.trim() || DEFAULT_REPO
export const setDataRepo = (v: string): void =>
  localStorage.setItem(REPO_KEY, v.trim())

/** True once the PAT is present — the app can then read from the data repo. */
export const hasGarminSetup = (): boolean => hasPat()
