/** One browser-local checkpoint for leaving project creation to upgrade. Files use structured clone. */
export const PROJECT_DRAFT_RETURN_KEY = "collacrew:project-upgrade-return";
const DATABASE = "collacrew-project-creation";
const STORE = "upgrade-drafts";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
export async function saveProjectCreationDraft<T>(owner: string, data: T) {
  if (!owner) throw new Error("Taslağı korumak için giriş yapmalısın.");
  const draftId = sessionStorage.getItem(PROJECT_DRAFT_RETURN_KEY) || crypto.randomUUID();
  await transaction("readwrite", store => store.put({version: 1, savedAt: Date.now(), data}, owner + ":" + draftId));
  sessionStorage.setItem(PROJECT_DRAFT_RETURN_KEY, draftId);
}
export async function readProjectCreationDraft<T>(owner: string): Promise<T | null> {
  if (!owner) return null;
  const draftId = sessionStorage.getItem(PROJECT_DRAFT_RETURN_KEY);
  if (!draftId) return null;
  const record = await transaction<{version: number; savedAt: number; data: T} | undefined>("readonly", store => store.get(owner + ":" + draftId));
  return record?.version === 1 ? record.data : null;
}
export async function clearProjectCreationDraft(owner: string) {
  const draftId = sessionStorage.getItem(PROJECT_DRAFT_RETURN_KEY);
  if (!draftId || !owner) return;
  await transaction("readwrite", store => store.delete(owner + ":" + draftId));
  sessionStorage.removeItem(PROJECT_DRAFT_RETURN_KEY);
}
