/**
 * Keeps big pictures (the wallpaper) in IndexedDB, where the quota is far larger than local storage.
 * Callers keep only a small reference in local storage.
 */

const DB_NAME = "cs-store";
const STORE = "blobs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Could not open storage"));
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = op(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error ?? new Error("Storage failed"));
      tx.onabort = () => reject(tx.error ?? new Error("Storage was blocked"));
    });
  } finally {
    db.close();
  }
}

export async function loadPicture(id: string): Promise<string | null> {
  const got = await run<unknown>("readonly", (s) => s.get(id));
  return typeof got === "string" ? got : null;
}

export async function savePicture(id: string, data: string): Promise<void> {
  await run("readwrite", (s) => s.put(data, id));
}

export async function deletePicture(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}
