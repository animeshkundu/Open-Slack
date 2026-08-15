import { Attachment } from '../types';
import { sha256 } from './crypto';

const DB_NAME = 'openslack_media_store';
const STORE_NAME = 'media_files';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

export function getMediaDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is not available'));
      }
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

export interface StorageQuotaInfo {
  usage: number;
  quota: number;
  percentUsed: number;
  isQuotaAvailable: boolean;
}

/**
 * Check storage quota using navigator.storage.estimate()
 */
export async function getStorageQuotaEstimate(): Promise<StorageQuotaInfo> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usage = estimate.usage || 0;
      const quota = estimate.quota || 0;
      const percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      return {
        usage,
        quota,
        percentUsed,
        isQuotaAvailable: true,
      };
    }
  } catch (err) {
    console.warn('[Storage] Error checking storage estimate:', err);
  }
  return {
    usage: 0,
    quota: 0,
    percentUsed: 0,
    isQuotaAvailable: false,
  };
}

/**
 * Request persistent storage from the browser
 */
export async function requestStoragePersistence(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
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
export async function storeLocalFile(file: File | { name: string; type?: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<Attachment> {
  const buffer = await file.arrayBuffer();
  const fileHash = await sha256(buffer);
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fileSize = file.size ?? buffer.byteLength;
  const mimeType = file.type || 'application/octet-stream';

  // Convert to Data URL for instant previewing
  let dataUrl = '';
  if (typeof FileReader !== 'undefined') {
    const blob = new Blob([buffer], { type: mimeType });
    dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } else {
    dataUrl = `data:${mimeType};base64,${Buffer.from(buffer).toString('base64')}`;
  }

  const attachment: Attachment = {
    id,
    fileName: file.name,
    fileSize,
    mimeType,
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
      mimeType,
      fileSize,
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
 * Get all stored media files from IndexedDB
 */
export async function getAllStoredFiles(): Promise<Attachment[]> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

/**
 * Clear all stored media files from IndexedDB
 */
export async function clearAllStoredFiles(): Promise<boolean> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Delete stored media file from IndexedDB
 */
export async function deleteStoredFile(id: string): Promise<boolean> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

/**
 * Clear older media files if storage quota exceeds 90%
 */
export async function autoPruneStorageIfExceeded(thresholdPercent = 90): Promise<number> {
  const estimate = await getStorageQuotaEstimate();
  if (estimate.isQuotaAvailable && estimate.percentUsed > thresholdPercent) {
    console.warn(`[Storage] Quota usage at ${estimate.percentUsed}%, pruning old media files...`);
    try {
      const db = await getMediaDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      let deletedCount = 0;
      return new Promise((resolve) => {
        const req = store.openCursor();
        req.onsuccess = (e: any) => {
          const cursor = e.target.result;
          if (cursor && deletedCount < 10) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
        req.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }
  return 0;
}

/**
 * Format bytes nicely (e.g. 1.2 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = Math.min(i, sizes.length - 1);
  return parseFloat((bytes / Math.pow(k, val)).toFixed(dm)) + ' ' + sizes[val];
}
