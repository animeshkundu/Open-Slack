import 'fake-indexeddb/auto';
import { beforeEach, vi } from 'vitest';

// Polyfill RTCPeerConnection & WebRTC for jsdom
if (typeof globalThis.RTCPeerConnection === 'undefined') {
  class MockRTCPeerConnection {
    localDescription: any = null;
    remoteDescription: any = null;
    signalingState = 'stable';
    iceConnectionState = 'connected';
    iceGatheringState = 'complete';
    connectionState = 'connected';
    onicecandidate: any = null;
    ontrack: any = null;
    ondatachannel: any = null;

    createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
    createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
    setLocalDescription = vi.fn().mockResolvedValue(undefined);
    setRemoteDescription = vi.fn().mockResolvedValue(undefined);
    addIceCandidate = vi.fn().mockResolvedValue(undefined);
    addTrack = vi.fn();
    removeTrack = vi.fn();
    createDataChannel = vi.fn().mockReturnValue({
      binaryType: 'arraybuffer',
      bufferedAmount: 0,
      readyState: 'open',
      send: vi.fn(),
      close: vi.fn(),
      onopen: null,
      onclose: null,
      onmessage: null,
      onerror: null,
    });
    close = vi.fn();
  }
  (globalThis as any).RTCPeerConnection = MockRTCPeerConnection;
}

// Polyfill BroadcastChannel if missing in test environment
if (typeof globalThis.BroadcastChannel === 'undefined') {
  class MockBroadcastChannel {
    name: string;
    onmessage: ((event: MessageEvent) => void) | null = null;
    private static channels = new Map<string, Set<MockBroadcastChannel>>();

    constructor(name: string) {
      this.name = name;
      if (!MockBroadcastChannel.channels.has(name)) {
        MockBroadcastChannel.channels.set(name, new Set());
      }
      MockBroadcastChannel.channels.get(name)!.add(this);
    }

    postMessage(data: any) {
      const set = MockBroadcastChannel.channels.get(this.name);
      if (set) {
        set.forEach((ch) => {
          if (ch !== this && ch.onmessage) {
            ch.onmessage(new MessageEvent('message', { data }));
          }
        });
      }
    }

    close() {
      const set = MockBroadcastChannel.channels.get(this.name);
      if (set) {
        set.delete(this);
      }
    }
  }
  globalThis.BroadcastChannel = MockBroadcastChannel as any;
}

// Polyfill navigator.locks
if (typeof navigator !== 'undefined' && !navigator.locks) {
  (navigator as any).locks = {
    request: async (_name: string, callback: () => Promise<any>) => {
      return callback();
    },
  };
}

// Polyfill navigator.storage
if (typeof navigator !== 'undefined' && !navigator.storage) {
  (navigator as any).storage = {
    estimate: async () => ({ usage: 1024 * 1024, quota: 100 * 1024 * 1024 }),
    persist: async () => true,
    persisted: async () => true,
  };
}

// Polyfill navigator.mediaDevices
if (typeof navigator !== 'undefined' && !navigator.mediaDevices) {
  (navigator as any).mediaDevices = {
    getUserMedia: async () => {
      const audioTrack = { kind: 'audio', enabled: true, stop: vi.fn() };
      const videoTrack = { kind: 'video', enabled: true, stop: vi.fn() };
      return {
        getTracks: () => [audioTrack, videoTrack],
        getAudioTracks: () => [audioTrack],
        getVideoTracks: () => [videoTrack],
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
      } as unknown as MediaStream;
    },
    getDisplayMedia: async () => {
      const screenTrack = { kind: 'video', enabled: true, stop: vi.fn(), onended: null };
      return {
        getTracks: () => [screenTrack],
        getVideoTracks: () => [screenTrack],
        getAudioTracks: () => [],
        addTrack: vi.fn(),
        removeTrack: vi.fn(),
      } as unknown as MediaStream;
    },
  };
}

beforeEach(() => {
  localStorage.clear();
});
