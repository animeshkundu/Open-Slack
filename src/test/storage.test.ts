import { describe, expect, it } from 'vitest';
import {
  autoPruneStorageIfExceeded,
  clearAllStoredFiles,
  deleteStoredFile,
  formatBytes,
  getAllStoredFiles,
  getMediaDB,
  getStorageQuotaEstimate,
  getStoredFile,
  requestStoragePersistence,
  storeLocalFile,
} from '../lib/storage';

describe('Storage Module & Storage Quotas', () => {
  it('formats bytes into human readable units', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(512)).toBe('512 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(2 * 1024 * 1024 * 1024)).toBe('2 GB');
  });

  it('initializes IndexedDB database properly', async () => {
    const db = await getMediaDB();
    expect(db).toBeDefined();
    expect(db.objectStoreNames.contains('media_files')).toBe(true);
  });

  it('stores, lists, retrieves, and clears files in IndexedDB', async () => {
    const buffer1 = new TextEncoder().encode('Simulated PDF file content 1').buffer;
    const file1 = {
      name: 'annual-report.pdf',
      type: 'application/pdf',
      size: buffer1.byteLength,
      arrayBuffer: async () => buffer1,
    };

    const buffer2 = new TextEncoder().encode('Simulated Image file content 2').buffer;
    const file2 = {
      name: 'screenshot.png',
      type: 'image/png',
      size: buffer2.byteLength,
      arrayBuffer: async () => buffer2,
    };

    const att1 = await storeLocalFile(file1 as any);
    const att2 = await storeLocalFile(file2 as any);

    expect(att1.id.startsWith('att_')).toBe(true);
    expect(att2.id.startsWith('att_')).toBe(true);

    const allFiles = await getAllStoredFiles();
    expect(allFiles.length).toBeGreaterThanOrEqual(2);

    const retrieved1 = await getStoredFile(att1.id);
    expect(retrieved1?.fileName).toBe('annual-report.pdf');

    // Delete single
    const deleted = await deleteStoredFile(att1.id);
    expect(deleted).toBe(true);
    expect(await getStoredFile(att1.id)).toBeNull();

    // Clear all
    await clearAllStoredFiles();
    const afterClear = await getAllStoredFiles();
    expect(afterClear).toHaveLength(0);
  });

  it('estimates storage quota and requests persistence', async () => {
    const quota = await getStorageQuotaEstimate();
    expect(quota).toBeDefined();
    expect(typeof quota.usage).toBe('number');
    expect(typeof quota.quota).toBe('number');

    const persisted = await requestStoragePersistence();
    expect(typeof persisted).toBe('boolean');
  });

  it('runs autoPruneStorageIfExceeded safely when under or over limit', async () => {
    // Under limit
    const prunedUnder = await autoPruneStorageIfExceeded(99);
    expect(prunedUnder).toBe(0);

    // Over threshold test
    const dummyBuffer = new Uint8Array(5000).buffer;
    await storeLocalFile({
      name: 'old-prunable-item.dat',
      type: 'application/octet-stream',
      size: dummyBuffer.byteLength,
      arrayBuffer: async () => dummyBuffer,
    } as any);

    const prunedOver = await autoPruneStorageIfExceeded(0); // force threshold
    expect(typeof prunedOver).toBe('number');
  });
});
