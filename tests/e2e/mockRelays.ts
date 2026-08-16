import type { BrowserContext, Page } from '@playwright/test';

/**
 * Client-side script injected into all pages before execution to mock
 * Nostr relays, WebRTC signaling sockets, and media devices.
 * This guarantees 100% deterministic, offline, fast E2E test runs
 * without any flakiness from remote public Nostr relays.
 */
export const MOCK_NOSTR_RELAYS_INIT_SCRIPT = `
(() => {
  if (window.__openslack_mock_relays_active) return;
  window.__openslack_mock_relays_active = true;

  const NativeWebSocket = window.WebSocket;
  const mockBus = new BroadcastChannel('openslack_e2e_nostr_relay_bus');

  // Shared in-memory event cache per tab/browser process
  const activeMockSockets = new Set();
  const globalEvents = new Map();

  // Listen for broadcast events from other tabs / browser pages
  mockBus.onmessage = (msgEvent) => {
    try {
      const { type, eventObj, senderSocketId } = msgEvent.data || {};
      if (type === 'EVENT' && eventObj) {
        globalEvents.set(eventObj.id, eventObj);
        activeMockSockets.forEach((sock) => {
          if (sock.__socketId !== senderSocketId && sock.readyState === 1) {
            sock.__dispatchNostrEvent(eventObj);
          }
        });
      }
    } catch (_) {}
  };

  class MockNostrWebSocket extends EventTarget {
    static CONNECTING = 0;
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    CONNECTING = 0;
    OPEN = 1;
    CLOSING = 2;
    CLOSED = 3;

    constructor(url, protocols) {
      super();
      this.url = String(url);
      this.protocols = protocols;
      this.readyState = MockNostrWebSocket.CONNECTING;
      this.binaryType = 'blob';
      this.bufferedAmount = 0;
      this.extensions = '';
      this.protocol = '';
      this.__socketId = 'mock_sock_' + Math.random().toString(36).slice(2);
      this.__subscriptions = new Map();

      this.onopen = null;
      this.onmessage = null;
      this.onerror = null;
      this.onclose = null;

      activeMockSockets.add(this);

      // Fast async connection simulation (5ms)
      setTimeout(() => {
        if (this.readyState === MockNostrWebSocket.CONNECTING) {
          this.readyState = MockNostrWebSocket.OPEN;
          const openEvent = new Event('open');
          if (typeof this.onopen === 'function') {
            this.onopen.call(this, openEvent);
          }
          this.dispatchEvent(openEvent);
        }
      }, 5);
    }

    send(data) {
      if (this.readyState !== MockNostrWebSocket.OPEN) {
        throw new Error('WebSocket is not open');
      }

      if (typeof data !== 'string') return;

      try {
        const payload = JSON.parse(data);
        if (!Array.isArray(payload)) return;

        const verb = payload[0];

        if (verb === 'REQ') {
          const subId = payload[1];
          const filters = payload.slice(2);
          this.__subscriptions.set(subId, filters);

          // Deliver any cached past events that match
          setTimeout(() => {
            if (this.readyState !== MockNostrWebSocket.OPEN) return;
            globalEvents.forEach((cachedEvt) => {
              this.__sendFrame(['EVENT', subId, cachedEvt]);
            });
            // Send EOSE (End of Stored Events)
            this.__sendFrame(['EOSE', subId]);
          }, 10);
        } else if (verb === 'EVENT') {
          const eventObj = payload[1];
          if (eventObj && eventObj.id) {
            globalEvents.set(eventObj.id, eventObj);

            // Acknowledge receipt with OK
            setTimeout(() => {
              this.__sendFrame(['OK', eventObj.id, true, '']);
            }, 5);

            // Deliver to other local sockets in this page
            activeMockSockets.forEach((other) => {
              if (other !== this && other.readyState === MockNostrWebSocket.OPEN) {
                other.__dispatchNostrEvent(eventObj);
              }
            });

            // Broadcast to other pages / contexts
            mockBus.postMessage({
              type: 'EVENT',
              eventObj,
              senderSocketId: this.__socketId,
            });
          }
        } else if (verb === 'CLOSE') {
          const subId = payload[1];
          this.__subscriptions.delete(subId);
        }
      } catch (_) {
        // Non-JSON or unsupported format
      }
    }

    __dispatchNostrEvent(eventObj) {
      this.__subscriptions.forEach((_filters, subId) => {
        this.__sendFrame(['EVENT', subId, eventObj]);
      });
    }

    __sendFrame(frameArray) {
      if (this.readyState !== MockNostrWebSocket.OPEN) return;
      const dataStr = JSON.stringify(frameArray);
      const msgEvent = new MessageEvent('message', { data: dataStr });
      if (typeof this.onmessage === 'function') {
        this.onmessage.call(this, msgEvent);
      }
      this.dispatchEvent(msgEvent);
    }

    close(code = 1000, reason = '') {
      if (this.readyState === MockNostrWebSocket.CLOSED || this.readyState === MockNostrWebSocket.CLOSING) {
        return;
      }
      this.readyState = MockNostrWebSocket.CLOSING;
      activeMockSockets.delete(this);
      setTimeout(() => {
        this.readyState = MockNostrWebSocket.CLOSED;
        const closeEvt = new CloseEvent('close', { wasClean: true, code, reason });
        if (typeof this.onclose === 'function') {
          this.onclose.call(this, closeEvt);
        }
        this.dispatchEvent(closeEvt);
      }, 5);
    }
  }

  // Intercept WebSocket instantiation
  window.WebSocket = function (url, protocols) {
    const urlStr = String(url);
    // Allow local Vite dev server / HMR WebSockets to pass through natively
    if (
      urlStr.includes('localhost:') ||
      urlStr.includes('127.0.0.1:') ||
      urlStr.includes('/vite-hmr') ||
      urlStr.startsWith('ws://localhost') ||
      urlStr.startsWith('ws://127.0.0.1')
    ) {
      return new NativeWebSocket(url, protocols);
    }

    // Mock all external Nostr relay and tracker connections
    return new MockNostrWebSocket(url, protocols);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;

  // Mock getUserMedia & getDisplayMedia for WebRTC calls in headless browser
  if (navigator.mediaDevices) {
    const createMockMediaStream = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#4A154B';
        ctx.fillRect(0, 0, 640, 480);
      }
      const stream = canvas.captureStream ? canvas.captureStream(10) : new MediaStream();
      return stream;
    };

    navigator.mediaDevices.getUserMedia = async (constraints) => {
      return createMockMediaStream();
    };

    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async () => {
        return createMockMediaStream();
      };
    }
  }
})();
`;

/**
 * Injects the mock Nostr relays script into a Playwright Page or BrowserContext.
 */
export async function injectNostrRelayMocks(target: Page | BrowserContext): Promise<void> {
  await target.addInitScript({
    content: MOCK_NOSTR_RELAYS_INIT_SCRIPT,
  });
}
