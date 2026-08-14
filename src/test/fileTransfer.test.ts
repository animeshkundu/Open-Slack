import { describe, expect, it } from 'vitest';
import { CHUNK_SIZE, FileChunkTransferManager } from '../lib/fileTransfer';

describe('File Transfer & 16KB Chunking Module', () => {
  it('splits large payload into 16 KB frames with correct headers', async () => {
    const manager = new FileChunkTransferManager();

    // 40 KB buffer -> should create 3 chunks (16KB, 16KB, 8KB)
    const payloadSize = 40 * 1024;
    const testBuffer = new Uint8Array(payloadSize);
    for (let i = 0; i < payloadSize; i++) {
      testBuffer[i] = i % 256;
    }

    const { header, chunks, hash } = await manager.prepareFileForChunking({
      name: 'large-diagram.png',
      type: 'image/png',
      size: payloadSize,
      buffer: testBuffer.buffer,
    });

    expect(header.fileName).toBe('large-diagram.png');
    expect(header.fileSize).toBe(payloadSize);
    expect(header.chunkSize).toBe(CHUNK_SIZE);
    expect(header.totalChunks).toBe(3);
    expect(header.sha256).toBe(hash);

    expect(chunks).toHaveLength(3);
    expect(chunks[0].data.length).toBe(16384);
    expect(chunks[1].data.length).toBe(16384);
    expect(chunks[2].data.length).toBe(8192); // remainder 40960 - 32768 = 8192
  });

  it('reassembles incoming chunks and verifies SHA-256 integrity', async () => {
    const sender = new FileChunkTransferManager();
    const receiver = new FileChunkTransferManager();

    const data = new TextEncoder().encode('Hello P2P RTCDataChannel 16KB Chunking world!'.repeat(500));
    const { header, chunks } = await sender.prepareFileForChunking({
      name: 'document.txt',
      type: 'text/plain',
      size: data.byteLength,
      buffer: data.buffer,
    });

    receiver.handleChunkHeader(header);

    let progressCalls = 0;
    let finalAttachment = null;

    for (const chunk of chunks) {
      const res = await receiver.handleChunkData(chunk, (prog) => {
        progressCalls++;
        expect(prog.fileName).toBe('document.txt');
        expect(prog.percentage).toBeGreaterThanOrEqual(0);
        expect(prog.percentage).toBeLessThanOrEqual(100);
      });
      if (res) {
        finalAttachment = res;
      }
    }

    expect(progressCalls).toBe(chunks.length);
    expect(finalAttachment).not.toBeNull();
    expect(finalAttachment?.fileName).toBe('document.txt');
    expect(finalAttachment?.fileSize).toBe(data.byteLength);
    expect(finalAttachment?.sha256).toBe(header.sha256);
    expect(finalAttachment?.dataUrl).toBeTruthy();
  });

  it('transmits file with rate-limiting backpressure pacing', async () => {
    const manager = new FileChunkTransferManager();
    const testData = new Uint8Array(20 * 1024);

    const receivedFrames: any[] = [];
    const progressList: number[] = [];

    const attachment = await manager.sendFileWithBackpressure(
      {
        name: 'test-stream.bin',
        type: 'application/octet-stream',
        size: testData.byteLength,
        buffer: testData.buffer,
      },
      async (frame) => {
        receivedFrames.push(frame);
      },
      (p) => {
        progressList.push(p.percentage);
      },
      1 // 1ms delay
    );

    expect(attachment.fileName).toBe('test-stream.bin');
    expect(receivedFrames.length).toBeGreaterThanOrEqual(2); // 1 header + >= 2 chunks
    expect(receivedFrames[0].type).toBe('CHUNK_HEADER');
    expect(progressList.length).toBeGreaterThanOrEqual(2);
    expect(progressList[progressList.length - 1]).toBe(100);
  });

  it('fails reassembly when data is corrupted or checksum differs', async () => {
    const sender = new FileChunkTransferManager();
    const receiver = new FileChunkTransferManager();

    const data = new TextEncoder().encode('Test integrity tampering');
    const { header, chunks } = await sender.prepareFileForChunking({
      name: 'tampered.txt',
      type: 'text/plain',
      size: data.byteLength,
      buffer: data.buffer,
    });

    receiver.handleChunkHeader(header);

    // Corrupt one chunk
    chunks[0].data[0] = (chunks[0].data[0] + 1) % 255;

    await expect(receiver.handleChunkData(chunks[0])).rejects.toThrow('Checksum verification failed');
  });
});
