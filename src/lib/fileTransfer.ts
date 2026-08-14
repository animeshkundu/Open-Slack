import { Attachment } from '../types';
import { sha256 } from './crypto';

export const CHUNK_SIZE = 16 * 1024; // 16 KB frames

export interface FileChunkHeader {
  type: 'CHUNK_HEADER';
  fileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunkSize: number;
  sha256: string;
}

export interface FileChunkData {
  type: 'CHUNK_DATA';
  fileId: string;
  chunkIndex: number;
  data: number[]; // serialized byte array for cross-transport safety
}

export interface FileTransferProgress {
  fileId: string;
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
}

export class FileChunkTransferManager {
  private incomingTransfers: Map<
    string,
    {
      header: FileChunkHeader;
      receivedChunks: Map<number, Uint8Array>;
      receivedBytes: number;
      startTime: number;
    }
  > = new Map();

  /**
   * Split a File or ArrayBuffer into 16 KB chunks
   */
  public async prepareFileForChunking(
    file: File | { name: string; type: string; size: number; buffer: ArrayBuffer }
  ): Promise<{
    header: FileChunkHeader;
    chunks: FileChunkData[];
    hash: string;
  }> {
    const buffer = 'arrayBuffer' in file ? await file.arrayBuffer() : file.buffer;
    const hash = await sha256(buffer);
    const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const totalChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE) || 1;

    const header: FileChunkHeader = {
      type: 'CHUNK_HEADER',
      fileId,
      fileName: file.name,
      fileSize: buffer.byteLength,
      mimeType: file.type || 'application/octet-stream',
      totalChunks,
      chunkSize: CHUNK_SIZE,
      sha256: hash,
    };

    const chunks: FileChunkData[] = [];
    const uint8View = new Uint8Array(buffer);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, buffer.byteLength);
      const chunkBytes = uint8View.slice(start, end);

      chunks.push({
        type: 'CHUNK_DATA',
        fileId,
        chunkIndex: i,
        data: Array.from(chunkBytes),
      });
    }

    return { header, chunks, hash };
  }

  /**
   * Handle incoming header frame
   */
  public handleChunkHeader(header: FileChunkHeader) {
    if (!this.incomingTransfers.has(header.fileId)) {
      this.incomingTransfers.set(header.fileId, {
        header,
        receivedChunks: new Map(),
        receivedBytes: 0,
        startTime: Date.now(),
      });
    }
  }

  /**
   * Handle incoming chunk frame & reassemble when complete
   */
  public async handleChunkData(
    chunk: FileChunkData,
    onProgress?: (progress: FileTransferProgress) => void
  ): Promise<Attachment | null> {
    const transfer = this.incomingTransfers.get(chunk.fileId);
    if (!transfer) {
      console.warn(`[FileTransfer] Received chunk for unknown fileId: ${chunk.fileId}`);
      return null;
    }

    if (!transfer.receivedChunks.has(chunk.chunkIndex)) {
      const bytes = new Uint8Array(chunk.data);
      transfer.receivedChunks.set(chunk.chunkIndex, bytes);
      transfer.receivedBytes += bytes.byteLength;
    }

    if (onProgress) {
      onProgress({
        fileId: chunk.fileId,
        fileName: transfer.header.fileName,
        loaded: transfer.receivedBytes,
        total: transfer.header.fileSize,
        percentage: Math.min(100, Math.round((transfer.receivedBytes / transfer.header.fileSize) * 100)),
      });
    }

    // Check if all chunks received
    if (transfer.receivedChunks.size === transfer.header.totalChunks) {
      return this.assembleFile(chunk.fileId);
    }

    return null;
  }

  /**
   * Assemble all chunks into full Attachment & verify SHA-256 integrity
   */
  public async assembleFile(fileId: string): Promise<Attachment | null> {
    const transfer = this.incomingTransfers.get(fileId);
    if (!transfer) return null;

    const { header, receivedChunks } = transfer;
    const combinedBuffer = new Uint8Array(header.fileSize);
    let offset = 0;

    for (let i = 0; i < header.totalChunks; i++) {
      const chunk = receivedChunks.get(i);
      if (!chunk) {
        throw new Error(`[FileTransfer] Missing chunk index ${i} for file ${header.fileName}`);
      }
      combinedBuffer.set(chunk, offset);
      offset += chunk.byteLength;
    }

    // Verify SHA-256 checksum
    const calculatedHash = await sha256(combinedBuffer.buffer);
    if (calculatedHash !== header.sha256) {
      console.error(`[FileTransfer] Checksum mismatch! Expected ${header.sha256}, got ${calculatedHash}`);
      this.incomingTransfers.delete(fileId);
      throw new Error(`Checksum verification failed for ${header.fileName}`);
    }

    // Create Blob & DataURL / ObjectURL
    const blob = new Blob([combinedBuffer], { type: header.mimeType });
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    const attachment: Attachment = {
      id: header.fileId,
      fileName: header.fileName,
      fileSize: header.fileSize,
      mimeType: header.mimeType,
      dataUrl,
      sha256: calculatedHash,
    };

    // Clean up
    this.incomingTransfers.delete(fileId);
    return attachment;
  }

  /**
   * Transmit file chunks with backpressure rate control
   */
  public async sendFileWithBackpressure(
    file: File | { name: string; type: string; size: number; buffer: ArrayBuffer },
    sendAction: (payload: FileChunkHeader | FileChunkData) => Promise<void> | void,
    onProgress?: (progress: FileTransferProgress) => void,
    chunkDelayMs = 5
  ): Promise<Attachment> {
    const { header, chunks, hash } = await this.prepareFileForChunking(file);

    // Send header first
    await sendAction(header);

    let sentBytes = 0;
    for (const chunk of chunks) {
      await sendAction(chunk);
      sentBytes += chunk.data.length;

      if (onProgress) {
        onProgress({
          fileId: header.fileId,
          fileName: header.fileName,
          loaded: sentBytes,
          total: header.fileSize,
          percentage: Math.min(100, Math.round((sentBytes / header.fileSize) * 100)),
        });
      }

      // Small throttle/pacing to prevent RTC buffer saturation
      if (chunkDelayMs > 0 && chunks.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, chunkDelayMs));
      }
    }

    const buffer = 'arrayBuffer' in file ? await file.arrayBuffer() : file.buffer;
    const blob = new Blob([buffer], { type: header.mimeType });
    const dataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });

    return {
      id: header.fileId,
      fileName: header.fileName,
      fileSize: header.fileSize,
      mimeType: header.mimeType,
      dataUrl,
      sha256: hash,
    };
  }
}

export const fileChunkManager = new FileChunkTransferManager();
