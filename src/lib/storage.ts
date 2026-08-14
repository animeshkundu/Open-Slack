import { Attachment } from '../types';
import { sha256 } from './crypto';

const DB_NAME = 'quietslack_media_store';
const STORE_NAME = 'media_files';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function getMediaDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

/**
 * Request persistent storage from the browser
 */
export async function requestStoragePersistence(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const isPersisted = await navigator.storage.persist();
      console.log(`[Storage] Persistent storage granted: ${isPersisted}`);
      return isPersisted;
    }
  } catch (e) {
    console.warn('[Storage] Could not request persistence', e);
  }
  return false;
}

/**
 * Save file to local IndexedDB and generate Attachment metadata
 */
export async function storeLocalFile(file: File): Promise<Attachment> {
  const buffer = await file.arrayBuffer();
  const fileHash = await sha256(buffer);
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Convert to Data URL or Blob URL for instant rendering
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });

  const attachment: Attachment = {
    id,
    fileName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    dataUrl,
    sha256: fileHash,
  };

  try {
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      dataUrl,
      sha256: fileHash,
      createdAt: Date.now(),
    });
  } catch (err) {
    console.warn('Error storing media in IndexedDB:', err);
  }

  return attachment;
}

/**
 * Retrieve file from local IndexedDB
 */
export async function getStoredFile(id: string): Promise<Attachment | null> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Format bytes nicely (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
