import 'fake-indexeddb/auto';
import { beforeEach, vi } from 'vitest';

// Polyfill RTCPeerConnection & WebRTC for jsdom
if (typeof globalThis.RTCPeerConnection === 'undefined') {
  class MockRTCPeerConnection extends EventTarget {
    localDescription: any = null;
    remoteDescription: any = null;
    signalingState = 'stable';
    iceConnectionState = 'connected';
    iceGatheringState = 'complete';
    connectionState = 'connected';
    onicecandidate: any = null;
    ontrack: any = null;
    ondatachannel: any = null;
    onconnectionstatechange: any = null;

    createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
    createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
    setLocalDescription = vi.fn().mockResolvedValue(undefined);
    setRemoteDescription = vi.fn().mockResolvedValue(undefined);
    addIceCandidate = vi.fn().mockResolvedValue(undefined);
    addTrack = vi.fn();
    removeTrack = vi.fn();
    getSenders = vi.fn().mockReturnValue([]);
    getReceivers = vi.fn().mockReturnValue([]);
    getTransceivers = vi.fn().mockReturnValue([]);
    addTransceiver = vi.fn().mockReturnValue({
      receiver: { track: { kind: 'audio', enabled: true, stop: vi.fn() } },
      sender: { track: null, replaceTrack: vi.fn() },
    });
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
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    });
    close = vi.fn();
  }
  (globalThis as any).RTCPeerConnection = MockRTCPeerConnection;
}

// Use the in-memory relay mock in jsdom even when Node 22 exposes a native
// WebSocket; the native EventTarget is not compatible with jsdom's Event.
if (typeof window !== 'undefined') {
  type Listener = (event: any) => void;

  class MockTestWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    CONNECTING = 0;
    OPEN = 1;
    CLOSING = 2;
    CLOSED = 3;

    url: string;
    readyState: number = MockTestWebSocket.CONNECTING;
    binaryType = 'blob';
    bufferedAmount = 0;

    onopen: Listener | null = null;
    onmessage: Listener | null = null;
    onerror: Listener | null = null;
    onclose: Listener | null = null;

    private static activeSockets = new Set<MockTestWebSocket>();
    private subscriptions = new Map<string, any>();

    constructor(url: string) {
      super();
      this.url = url;
      MockTestWebSocket.activeSockets.add(this);

      queueMicrotask(() => {
        if (this.readyState === MockTestWebSocket.CONNECTING) {
          this.readyState = MockTestWebSocket.OPEN;
          const openEvent = new Event('open');
          this.onopen?.(openEvent);
          this.dispatchEvent(openEvent);
        }
      });
    }

    send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
      if (this.readyState !== MockTestWebSocket.OPEN) return;
      if (typeof data !== 'string') return;

      try {
        const parsed = JSON.parse(data);
        if (!Array.isArray(parsed)) return;
        const [type, arg1, arg2] = parsed;

        if (type === 'REQ') {
          const subId = arg1;
          this.subscriptions.set(subId, arg2);
          // Respond with EOSE (End of Stored Events)
          queueMicrotask(() => {
            if (this.readyState === MockTestWebSocket.OPEN) {
              const eoseData = JSON.stringify(['EOSE', subId]);
              const event = new MessageEvent('message', { data: eoseData });
              this.onmessage?.(event);
              this.dispatchEvent(event);
            }
          });
        } else if (type === 'EVENT') {
          const eventObj = arg1;
          // Respond with OK
          if (eventObj?.id) {
            queueMicrotask(() => {
              if (this.readyState === MockTestWebSocket.OPEN) {
                const okData = JSON.stringify(['OK', eventObj.id, true, '']);
                const event = new MessageEvent('message', { data: okData });
                this.onmessage?.(event);
                this.dispatchEvent(event);
              }
            });
          }

          // Broadcast to all other active sockets
          MockTestWebSocket.activeSockets.forEach((other) => {
            if (other !== this && other.readyState === MockTestWebSocket.OPEN) {
              other.subscriptions.forEach((_filter, subId) => {
                queueMicrotask(() => {
                  if (other.readyState === MockTestWebSocket.OPEN) {
                    const evtMsg = JSON.stringify(['EVENT', subId, eventObj]);
                    const event = new MessageEvent('message', { data: evtMsg });
                    other.onmessage?.(event);
                    other.dispatchEvent(event);
                  }
                });
              });
            }
          });
        } else if (type === 'CLOSE') {
          const subId = arg1;
          this.subscriptions.delete(subId);
        }
      } catch (_) {
        // Not a JSON Nostr frame, ignore
      }
    }

    close() {
      this.readyState = MockTestWebSocket.CLOSED;
      MockTestWebSocket.activeSockets.delete(this);
      const closeEvent = new CloseEvent('close', { wasClean: true, code: 1000 });
      this.onclose?.(closeEvent);
      this.dispatchEvent(closeEvent);
    }
  }

  (globalThis as any).WebSocket = MockTestWebSocket;
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
