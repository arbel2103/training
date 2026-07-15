/**
 * Google Calendar integration via Google Identity Services (OAuth token client)
 * + Calendar REST API v3. Pure browser, no backend.
 *
 * Requires a Google OAuth Client ID in VITE_GOOGLE_CLIENT_ID (see README).
 * Without it, isConfigured() returns false and the UI shows a setup notice.
 */

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
// calendar for the planning page + drive.appdata for cloud backup/sync
const SCOPE =
  'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/drive.appdata'
const GIS_SRC = 'https://accounts.google.com/gsi/client'
export const TIME_ZONE = 'Asia/Jerusalem'

export interface GCalEvent {
  id?: string
  summary?: string
  description?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
}
export interface GCalCalendar {
  id: string
  summary: string
  primary?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    google?: any
  }
}

let accessToken: string | null = null
let tokenExpiry = 0

export const isConfigured = () => !!CLIENT_ID
export const isConnected = () => !!accessToken && Date.now() < tokenExpiry

let gisPromise: Promise<void> | null = null

/**
 * Load Google's sign-in script ahead of time. Calling this when a screen
 * opens (before the user clicks "connect") keeps the OAuth popup inside the
 * click's user-gesture window — otherwise mobile browsers block it.
 */
export function preloadGis(): Promise<void> {
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      if (window.google?.accounts?.oauth2) return resolve()
      const s = document.createElement('script')
      s.src = GIS_SRC
      s.async = true
      s.onload = () => resolve()
      s.onerror = () => {
        gisPromise = null
        reject(new Error('טעינת הסקריפט של גוגל נכשלה — בדוק חיבור לאינטרנט.'))
      }
      document.head.appendChild(s)
    })
  }
  return gisPromise
}

/** Trigger the OAuth consent / token flow. */
export async function connect(): Promise<void> {
  if (!CLIENT_ID) throw new Error('missing-client-id')
  await preloadGis()
  await new Promise<void>((resolve, reject) => {
    let settled = false
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        fn()
      }
    }
    const timer = setTimeout(
      () =>
        done(() =>
          reject(
            new Error(
              'ההתחברות לגוגל לא הושלמה. ודא שחלון ההתחברות לא נחסם ונסה שוב.',
            ),
          ),
        ),
      120_000,
    )
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (resp: any) => {
        if (resp.error) return done(() => reject(new Error(resp.error)))
        accessToken = resp.access_token
        tokenExpiry = Date.now() + (Number(resp.expires_in) - 60) * 1000
        done(resolve)
      },
      // fires when the popup is blocked or closed before finishing —
      // without it the promise hangs forever with no visible error
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error_callback: (err: any) => {
        const msg =
          err?.type === 'popup_closed'
            ? 'חלון ההתחברות נסגר לפני האישור — נסה שוב.'
            : err?.type === 'popup_failed_to_open'
              ? 'חלון ההתחברות נחסם על ידי הדפדפן — אפשר חלונות קופצים לאתר ונסה שוב.'
              : 'שגיאה בחיבור לגוגל: ' + (err?.type ?? 'לא ידוע')
        done(() => reject(new Error(msg)))
      },
    })
    tokenClient.requestAccessToken({ prompt: '' })
  })
}

/** Authenticated fetch to any Google API (connects first if needed). */
export async function authFetch(
  url: string,
  opts: RequestInit = {},
): Promise<Response> {
  if (!isConnected()) await connect()
  return fetch(url, {
    ...opts,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(opts.headers || {}),
    },
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function api(path: string, opts: RequestInit = {}): Promise<any> {
  if (!isConnected()) await connect()
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`)
  return res.json()
}

export async function listCalendars(): Promise<GCalCalendar[]> {
  const data = await api('/users/me/calendarList')
  return data.items ?? []
}

/** Find a calendar whose name contains `nameIncludes` (e.g. "אלבטרוס"). */
export async function findCalendarId(
  nameIncludes: string,
): Promise<string | undefined> {
  const cals = await listCalendars()
  const match = cals.find((c) => (c.summary || '').includes(nameIncludes))
  return match?.id
}

export async function listEvents(
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<GCalEvent[]> {
  const q = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '100',
  })
  const data = await api(
    `/calendars/${encodeURIComponent(calendarId)}/events?${q}`,
  )
  return data.items ?? []
}

export async function insertEvent(
  calendarId: string,
  event: GCalEvent,
): Promise<GCalEvent> {
  return api(`/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: 'POST',
    body: JSON.stringify(event),
  })
}
