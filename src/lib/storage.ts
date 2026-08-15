import { Attachment, StoredPrivateKeyPair, UserIdentity } from '../types';
import { sha256 } from './crypto';

const DB_NAME = 'openslack_media_store';
const STORE_NAME = 'media_files';
const USER_STORE_NAME = 'user_identity';
const DB_VERSION = 3;

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Native Stream-based Gzip compression for stored blobs/buffers
 */
export async function compressBuffer(
  input: ArrayBuffer | Uint8Array
): Promise<{ compressed: ArrayBuffer; isCompressed: boolean }> {
  try {
    const rawBuffer: ArrayBuffer =
      input instanceof Uint8Array ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer : input;
    if (typeof CompressionStream !== 'undefined') {
      const stream = new Response(rawBuffer).body?.pipeThrough(new CompressionStream('gzip'));
      if (stream) {
        const compressed = await new Response(stream).arrayBuffer();
        // Only return compressed if it actually saved space
        if (compressed.byteLength < rawBuffer.byteLength) {
          return { compressed, isCompressed: true };
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Compression fallback note:', err);
  }
  const fallbackBuffer: ArrayBuffer =
    input instanceof Uint8Array ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer : input;
  return { compressed: fallbackBuffer, isCompressed: false };
}

/**
 * Native Stream-based Gzip decompression for stored blobs/buffers
 */
export async function decompressBuffer(input: ArrayBuffer | Uint8Array): Promise<ArrayBuffer> {
  try {
    const rawBuffer: ArrayBuffer =
      input instanceof Uint8Array ? input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer : input;
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new Response(rawBuffer).body?.pipeThrough(new DecompressionStream('gzip'));
      if (stream) {
        return await new Response(stream).arrayBuffer();
      }
    }
  } catch (err) {
    console.warn('[Storage] Decompression note, returning raw buffer:', err);
  }
  return input instanceof Uint8Array ? (input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength) as ArrayBuffer) : input;
}

export function getMediaDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        return reject(new Error('IndexedDB is not available'));
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(USER_STORE_NAME)) {
          db.createObjectStore(USER_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

/**
 * Save user identity & crypto keys to persistent IndexedDB
 */
export async function saveUserIdentityToIndexedDB(
  identity: UserIdentity,
  keys?: StoredPrivateKeyPair | null
): Promise<boolean> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    
    store.put({
      key: 'current_user_profile',
      identity,
      keys: keys || null,
      updatedAt: Date.now(),
    });

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[Storage] Error saving identity to IndexedDB:', err);
    return false;
  }
}

/**
 * Retrieve user identity & crypto keys from persistent IndexedDB
 */
export async function getUserIdentityFromIndexedDB(): Promise<{
  identity: UserIdentity;
  keys: StoredPrivateKeyPair | null;
} | null> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(USER_STORE_NAME, 'readonly');
    const store = tx.objectStore(USER_STORE_NAME);

    return new Promise((resolve) => {
      const req = store.get('current_user_profile');
      req.onsuccess = () => {
        if (req.result && req.result.identity) {
          resolve({
            identity: req.result.identity,
            keys: req.result.keys || null,
          });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('[Storage] Error loading identity from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete user identity from IndexedDB (e.g. for testing or reset)
 */
export async function deleteUserIdentityFromIndexedDB(): Promise<boolean> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(USER_STORE_NAME, 'readwrite');
    const store = tx.objectStore(USER_STORE_NAME);
    store.delete('current_user_profile');
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

export interface StorageQuotaInfo {
  usage: number;
  quota: number;
  percentUsed: number;
  isQuotaAvailable: boolean;
  compressionSavingsPercent?: number;
  isOpfsSupported?: boolean;
}

/**
 * Check storage quota using navigator.storage.estimate() and OPFS support
 */
export async function getStorageQuotaEstimate(): Promise<StorageQuotaInfo> {
  let isOpfsSupported = false;
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
      isOpfsSupported = true;
    }
  } catch (_) {}

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
        isOpfsSupported,
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
    isOpfsSupported,
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
 * Save file to local IndexedDB and OPFS with Gzip compression
 */
export async function storeLocalFile(
  file: File | { name: string; type?: string; size?: number; arrayBuffer: () => Promise<ArrayBuffer> }
): Promise<Attachment> {
  const rawBuffer = await file.arrayBuffer();
  const fileHash = await sha256(rawBuffer);
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const fileSize = file.size ?? rawBuffer.byteLength;
  const mimeType = file.type || 'application/octet-stream';

  // Transparent Gzip compression
  const { compressed, isCompressed } = await compressBuffer(rawBuffer);

  // Convert raw buffer to Data URL for immediate previewing
  let dataUrl = '';
  if (typeof FileReader !== 'undefined') {
    const blob = new Blob([rawBuffer], { type: mimeType });
    dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } else {
    dataUrl = `data:${mimeType};base64,${Buffer.from(rawBuffer).toString('base64')}`;
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
    // 1. IndexedDB persistence (with compressed payload if smaller)
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({
      id,
      fileName: file.name,
      mimeType,
      fileSize,
      compressedSize: compressed.byteLength,
      isCompressed,
      dataUrl,
      sha256: fileHash,
      createdAt: Date.now(),
    });

    // 2. OPFS (Origin Private File System) background persistence
    if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
      try {
        const root = await navigator.storage.getDirectory();
        const draftHandle = await root.getFileHandle(id, { create: true });
        const accessHandle = await (draftHandle as any).createWritable();
        await accessHandle.write(compressed);
        await accessHandle.close();
      } catch (opfsErr) {
        console.warn('[OPFS] Note saving to OPFS:', opfsErr);
      }
    }
  } catch (err) {
    console.warn('Error storing media in storage engines:', err);
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
 * Clear all stored media files from IndexedDB and OPFS
 */
export async function clearAllStoredFiles(): Promise<boolean> {
  try {
    const db = await getMediaDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await new Promise((resolve) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });

    if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
      try {
        const root = await navigator.storage.getDirectory();
        // Clear OPFS files
        for await (const name of (root as any).keys()) {
          await root.removeEntry(name);
        }
      } catch (_) {}
    }

    return true;
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
    await new Promise((resolve) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });

    if (typeof navigator !== 'undefined' && navigator.storage && 'getDirectory' in navigator.storage) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(id);
      } catch (_) {}
    }

    return true;
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

