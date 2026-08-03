// Read-through cache for data-repo files, keyed by repo path → { sha, json }.
// A separate IndexedDB DB from fitness-files so bulky Garmin JSON never touches
// the persisted localStorage store. Only files whose git sha changed are
// re-fetched. Mirrors the tiny wrapper style of lib/fileStore.ts.

const DB_NAME = 'garmin-cache'
const STORE = 'files'

interface CacheRow {
  sha: string
  json: unknown
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = fn(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      }),
  )
}

export async function getCached<T>(path: string): Promise<{ sha: string; json: T } | undefined> {
  const row = (await tx('readonly', (s) => s.get(path))) as CacheRow | undefined
  return row as { sha: string; json: T } | undefined
}

export const putCached = (path: string, sha: string, json: unknown): Promise<unknown> =>
  tx('readwrite', (s) => s.put({ sha, json } satisfies CacheRow, path))

export const clearCache = (): Promise<unknown> =>
  tx('readwrite', (s) => s.clear())
