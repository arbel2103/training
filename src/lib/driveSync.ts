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
const LAST_BACKUP_KEY = 'fitness-last-backup'
const DEVICE_KEY = 'fitness-device-name'

/** When this device last uploaded/restored a cloud backup (ISO), if ever. */
export const lastBackupAt = (): string | null =>
  localStorage.getItem(LAST_BACKUP_KEY)
const DRIVE = 'https://www.googleapis.com/drive/v3'
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3'

/** A short, human label for the browser/OS, used as a default device name. */
function defaultDeviceName(): string {
  const ua = navigator.userAgent
  let os = 'מכשיר'
  if (/iPhone/i.test(ua)) os = 'אייפון'
  else if (/iPad/i.test(ua)) os = 'אייפד'
  else if (/Android/i.test(ua)) os = 'אנדרואיד'
  else if (/Windows/i.test(ua)) os = 'מחשב Windows'
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'Mac'
  else if (/Linux/i.test(ua)) os = 'Linux'
  let br = ''
  if (/Edg\//i.test(ua)) br = 'Edge'
  else if (/OPR\//i.test(ua)) br = 'Opera'
  else if (/Chrome\//i.test(ua)) br = 'Chrome'
  else if (/Firefox\//i.test(ua)) br = 'Firefox'
  else if (/Safari\//i.test(ua)) br = 'Safari'
  return br ? `${os} · ${br}` : os
}

/** This device's label (editable, defaults from the browser/OS). */
export function getDeviceName(): string {
  return localStorage.getItem(DEVICE_KEY) || defaultDeviceName()
}
export function setDeviceName(name: string): void {
  const v = name.trim()
  if (v) localStorage.setItem(DEVICE_KEY, v)
  else localStorage.removeItem(DEVICE_KEY)
}

export interface BackupPayload {
  version: 1
  savedAt: string
  deviceName?: string
  store: unknown
  geminiKey?: string
}

export interface CloudInfo {
  fileId: string | null
  modifiedTime: string | null
  /** device + time the cloud backup was made (from Drive appProperties) */
  deviceName?: string | null
  savedAt?: string | null
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
    deviceName: getDeviceName(),
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
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  window.location.reload()
}

/** The email of the connected Google account (to catch wrong-account syncs). */
export async function getAccountEmail(): Promise<string | null> {
  try {
    const data = await readJson(
      await authFetch(`${DRIVE}/about?fields=user(emailAddress)`),
    )
    return data.user?.emailAddress ?? null
  } catch {
    return null
  }
}

/** Locate the backup file in the appDataFolder, if one exists. */
export async function findCloudBackup(): Promise<CloudInfo> {
  const q = new URLSearchParams({
    spaces: 'appDataFolder',
    q: `name='${FILE_NAME}'`,
    fields: 'files(id,name,modifiedTime,appProperties)',
  })
  const data = await readJson(await authFetch(`${DRIVE}/files?${q}`))
  const f = data.files?.[0]
  return {
    fileId: f?.id ?? null,
    modifiedTime: f?.modifiedTime ?? null,
    deviceName: f?.appProperties?.deviceName ?? null,
    savedAt: f?.appProperties?.savedAt ?? null,
  }
}

/**
 * Upload (create or overwrite) the backup in Drive. Returns the file id.
 * The device name + timestamp are stored as Drive appProperties so any device
 * can see who made the latest backup without downloading the whole file.
 */
export async function uploadBackup(existingId: string | null): Promise<string> {
  const payload = buildBackup(true)
  const content = JSON.stringify(payload)
  const metadata: Record<string, unknown> = {
    appProperties: {
      deviceName: payload.deviceName ?? '',
      savedAt: payload.savedAt,
    },
  }
  if (!existingId) {
    metadata.name = FILE_NAME
    metadata.parents = ['appDataFolder']
  }
  const boundary = 'fitness-backup-boundary'
  const body =
    `--${boundary}\r\n` +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    `\r\n--${boundary}\r\n` +
    'Content-Type: application/json\r\n\r\n' +
    content +
    `\r\n--${boundary}--`
  const url = existingId
    ? `${UPLOAD}/files/${existingId}?uploadType=multipart`
    : `${UPLOAD}/files?uploadType=multipart`
  const res = await authFetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  })
  const result = await readJson(res)
  localStorage.setItem(LAST_BACKUP_KEY, new Date().toISOString())
  return existingId ?? result.id
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
