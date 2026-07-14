/**
 * Cloud backup/sync via the user's own Google Drive appDataFolder — a hidden,
 * app-private area in their Drive. No server involved; requires the
 * drive.appdata scope (see googleCalendar.ts SCOPE) and the Google Drive API
 * enabled on the OAuth project.
 *
 * The backup contains the whole persisted store plus the Gemini key, so a
 * restore on a new device brings everything (checkup result FILES, stored in
 * IndexedDB, are not included).
 */
import { authFetch } from './googleCalendar'
import { getApiKey, setApiKey } from './apiKey'

const STORE_KEY = 'training-app-v1'
const FILE_NAME = 'fitness-backup.json'
const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

export interface BackupPayload {
  version: 1
  savedAt: string
  store: unknown
  geminiKey?: string
}

export interface CloudInfo {
  fileId: string | null
  modifiedTime: string | null
}

async function readJson(res: Response): Promise<any> {
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    if (res.status === 403 && /has not been used|is disabled/i.test(text))
      throw new Error(
        'Google Drive API לא מופעל בפרויקט — הפעל אותו בקונסולת Google Cloud (Library → Google Drive API → Enable).',
      )
    throw new Error(`Drive API ${res.status}: ${text.slice(0, 180)}`)
  }
  return res.json()
}

/** Build the backup payload from this device's data. */
export function buildBackup(includeKey: boolean): BackupPayload {
  const raw = localStorage.getItem(STORE_KEY)
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    store: raw ? JSON.parse(raw) : null,
    ...(includeKey && getApiKey() ? { geminiKey: getApiKey() } : {}),
  }
}

/** Apply a backup to this device (overwrites local data) and reload. */
export function restoreBackup(payload: BackupPayload): void {
  if (!payload || payload.version !== 1 || !payload.store)
    throw new Error('קובץ הגיבוי לא תקין או ריק.')
  localStorage.setItem(STORE_KEY, JSON.stringify(payload.store))
  if (payload.geminiKey) setApiKey(payload.geminiKey)
  window.location.reload()
}

/** Locate the backup file in the appDataFolder, if one exists. */
export async function findCloudBackup(): Promise<CloudInfo> {
  const q = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}'`,
    fields: 'files(id,name,modifiedTime)',
  })
  const data = await readJson(await authFetch(`${DRIVE}/files?${q}`))
  const f = data.files?.[0]
  return { fileId: f?.id ?? null, modifiedTime: f?.modifiedTime ?? null }
}

/** Upload (create or overwrite) the backup in Drive. Returns the file id. */
export async function uploadBackup(existingId: string | null): Promise<string> {
  const content = JSON.stringify(buildBackup(true))
  if (existingId) {
    const res = await authFetch(
      `${UPLOAD}/files/${existingId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: content,
      },
    )
    await readJson(res)
    return existingId
  }
  const boundary = 'fitness-backup-boundary'
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify({ name: FILE_NAME, parents: ['appDataFolder'] }) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    content +
    `\r\n--${boundary}--`
  const res = await authFetch(`${UPLOAD}/files?uploadType=multipart`, {
    method: 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  const created = await readJson(res)
  return created.id
}

/** Download the cloud backup payload. */
export async function downloadBackup(fileId: string): Promise<BackupPayload> {
  const res = await authFetch(`${DRIVE}/files/${fileId}?alt=media`)
  if (!res.ok) throw new Error(`Drive API ${res.status}`)
  return res.json()
}

/* ---------- file export / import (offline backup, no Google needed) ---------- */

export function exportToFile(): void {
  // the key is intentionally NOT included in a file that may get shared
  const payload = buildBackup(false)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `fitness-backup-${payload.savedAt.slice(0, 10)}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
}

export function importFromFile(file: File): Promise<void> {
  return file.text().then((text) => {
    restoreBackup(JSON.parse(text))
  })
}
