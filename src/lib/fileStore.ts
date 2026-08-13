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

/** Every stored file with its key, so a backup can carry them all. */
export async function allFiles(): Promise<{ id: string; blob: Blob }[]> {
  const ids = await tx('readonly', (s) => s.getAllKeys() as IDBRequest<IDBValidKey[]>)
  const blobs = await tx('readonly', (s) => s.getAll() as IDBRequest<Blob[]>)
  // getAllKeys and getAll return the same key order, so they line up by index
  return ids.map((id, i) => ({ id: String(id), blob: blobs[i] })).filter((f) => f.blob)
}

/* ---------------- base64 <-> Blob, for putting files inside a JSON backup ---------------- */

/** Base64 of a blob's bytes (no data: prefix). Chunked so big files don't
 *  blow the argument limit of String.fromCharCode. */
export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

export function base64ToBlob(b64: string, type = ''): Blob {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}
