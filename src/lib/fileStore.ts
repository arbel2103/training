/**
 * Tiny IndexedDB wrapper for storing checkup result files as Blobs,
 * keyed by the checkup id. Kept out of the Zustand/localStorage store so large
 * files don't bloat or corrupt the persisted JSON.
 */

const DB_NAME = 'fitness-files'
const STORE = 'files'

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

export const saveFile = (id: string, file: Blob): Promise<unknown> =>
  tx('readwrite', (s) => s.put(file, id))

export const getFile = (id: string): Promise<Blob | undefined> =>
  tx('readonly', (s) => s.get(id) as IDBRequest<Blob | undefined>)

export const deleteFile = (id: string): Promise<unknown> =>
  tx('readwrite', (s) => s.delete(id))
