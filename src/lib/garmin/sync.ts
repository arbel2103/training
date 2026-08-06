// Orchestrates data flow between the private repo and the app store.
//  - refreshFromRepo(): pull changed JSON files, normalize, import activities.
//  - manualSync(): trigger the workflow, poll it, then refresh.
import { useStore } from '../../store/useStore'
import { getCached, putCached } from './cache'
import {
  dispatchSync,
  getJsonFile,
  GithubError,
  latestRun,
  listDir,
  type WorkflowRun,
} from './githubClient'
import { planImport } from './importer'
import { toDailyHealth } from './normalize'
import type {
  DailyHealth,
  GarminActivityMonth,
  GarminActivitySummary,
  GarminDailyMonth,
  GarminSyncStatusFile,
} from './types'

const POLL_MS = 5000
const RUN_TIMEOUT_MS = 15 * 60 * 1000

const sleep = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms))

/** Fetch a JSON file, skipping the network when the cached sha still matches. */
async function fetchCachedJson<T>(path: string, sha: string): Promise<T | null> {
  const cached = await getCached<T>(path)
  if (cached && cached.sha === sha) return cached.json
  const json = await getJsonFile<T>(path)
  if (json != null) await putCached(path, sha, json)
  return json
}

export function garminErrorMessage(e: unknown): string {
  if (e instanceof GithubError) {
    if (e.status === 403 && /not accessible|permission/i.test(e.message))
      return 'ל-Token אין הרשאת Actions: Read and write — עדכן את ההרשאות ב-GitHub והדבק Token חדש'
    if (e.status === 401 || e.status === 403)
      return 'ההרשאה ל-GitHub פגה או שגויה — עדכן את ה-Token בהגדרות'
    if (e.status === 404)
      return 'לא נמצא ריפו הנתונים — ודא שהריפו קיים ושה-Token מורשה אליו'
    return `שגיאת GitHub (${e.status}): ${e.message}`
  }
  return e instanceof Error ? e.message : 'שגיאה לא צפויה'
}

/** Pull all changed data files, update daily health and import activities. */
export async function refreshFromRepo(): Promise<void> {
  const store = useStore.getState()

  const days: DailyHealth[] = []
  for (const f of await listDir('data/daily')) {
    if (f.type !== 'file' || !f.name.endsWith('.json')) continue
    const month = await fetchCachedJson<GarminDailyMonth>(f.path, f.sha)
    if (!month) continue
    for (const [date, bundle] of Object.entries(month)) {
      days.push(toDailyHealth(date, bundle))
    }
  }
  if (days.length) store.setGarminDaily(days)

  const activities: GarminActivitySummary[] = []
  for (const f of await listDir('data/activities')) {
    if (f.type !== 'file' || !f.name.endsWith('.json')) continue
    const month = await fetchCachedJson<GarminActivityMonth>(f.path, f.sha)
    if (!month) continue
    activities.push(...Object.values(month))
  }
  if (activities.length) {
    const { creates, updates } = planImport(activities, useStore.getState().log)
    if (creates.length || updates.length) {
      store.upsertGarminEntries(creates, updates)
    }
  }

  const status = await getJsonFile<GarminSyncStatusFile>('data/sync-status.json')
  const now = new Date().toISOString()
  if (status && status.ok === false) {
    store.setGarminSyncStatus({
      state: 'error',
      lastFetchAt: now,
      lastGarminSyncAt: status.lastSyncAt,
      error: status.error ?? 'הסנכרון האחרון נכשל',
      errorCode: status.errorCode ?? undefined,
    })
  } else {
    store.setGarminSyncStatus({
      state: 'idle',
      lastFetchAt: now,
      lastGarminSyncAt: status?.lastSyncAt,
      error: undefined,
      errorCode: undefined,
    })
  }
}

/** Wait for a workflow run started after `sinceMs` to finish (or time out). */
async function waitForRun(sinceMs: number): Promise<WorkflowRun | null> {
  const deadline = Date.now() + RUN_TIMEOUT_MS
  let run: WorkflowRun | null = null
  while (Date.now() < deadline) {
    await sleep(POLL_MS)
    const latest = await latestRun()
    if (latest && new Date(latest.created_at).getTime() >= sinceMs - 60_000) {
      run = latest
      if (latest.status === 'completed') return latest
    }
  }
  return run
}

/** A queued/in-progress run started within the last few minutes. */
function isActiveRun(run: WorkflowRun | null): boolean {
  return (
    !!run &&
    run.status !== 'completed' &&
    Date.now() - new Date(run.created_at).getTime() < 12 * 60 * 1000
  )
}

/** Trigger a sync run, poll until done, then refresh local data. */
export async function manualSync(mfaCode?: string): Promise<void> {
  const { setGarminSyncStatus } = useStore.getState()
  setGarminSyncStatus({ state: 'dispatching', error: undefined, errorCode: undefined })
  const since = Date.now()
  try {
    // If a sync is already queued/running, attach to it instead of dispatching
    // another — GitHub serializes them (concurrency group), so extra dispatches
    // just pile up behind the runner queue and make the wait much longer.
    // An MFA retry must always start a fresh run to pass the code.
    const existing = await latestRun()
    let sinceMs = since
    if (isActiveRun(existing) && !mfaCode) {
      sinceMs = new Date(existing!.created_at).getTime()
    } else {
      const inputs: Record<string, string> = {}
      if (mfaCode) inputs.mfa_code = mfaCode
      await dispatchSync(inputs)
    }
    setGarminSyncStatus({ state: 'running' })

    const run = await waitForRun(sinceMs)
    await refreshFromRepo()

    const status = useStore.getState().garminSyncStatus
    if (status.error) return // sync-status.json already surfaced the failure
    if (run && run.conclusion && run.conclusion !== 'success') {
      setGarminSyncStatus({
        state: 'error',
        error: 'הסנכרון נכשל — בדוק את פרטי ההתחברות או נסה שוב',
      })
    }
  } catch (e) {
    setGarminSyncStatus({ state: 'error', error: garminErrorMessage(e) })
  }
}
