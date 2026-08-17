import type { BrowserContext, Page } from '@playwright/test';

/**
 * Client-side script injected into all pages before execution.
 * - Redirects external Nostr/tracker WebSockets to the shared local E2E relay
 *   so multi-browser contexts can truly peer-connect.
 * - Preserves a unique socket URL per original relay (query param) because
 *   Trystero keys subscription batchers by `client.url`.
 * - Mocks getUserMedia / getDisplayMedia with deterministic audio+video tracks.
 */
export const MOCK_NOSTR_RELAYS_INIT_SCRIPT = `
(() => {
  if (window.__openslack_mock_relays_active) return;
  window.__openslack_mock_relays_active = true;

  // Force a single logical relay in e2e so Trystero does not open 10 sockets to the
  // same local process (self-echo + race amplification under StrictMode).
  window.__OPENSLACK_E2E_RELAYS = window.__OPENSLACK_E2E_RELAYS || ['wss://e2e.openslack.local'];

  const NativeWebSocket = window.WebSocket;
  const E2E_RELAY_BASE = 'ws://127.0.0.1:' + (window.__OPENSLACK_E2E_RELAY_PORT || 7777);

  // Intercept WebSocket instantiation
  window.WebSocket = function (url, protocols) {
    const urlStr = String(url);
    // Allow local Vite dev server / HMR WebSockets to pass through natively
    if (
      urlStr.includes('/vite-hmr') ||
      urlStr.includes('localhost:3000') ||
      urlStr.includes('localhost:4173') ||
      urlStr.includes('127.0.0.1:3000') ||
      urlStr.includes('127.0.0.1:4173')
    ) {
      return new NativeWebSocket(url, protocols);
    }

    // Redirect external Nostr / tracker sockets to the shared local relay.
    // Keep a unique query identity so Trystero batchers (keyed by socket.url)
    // do not collapse multiple logical relays onto one batcher instance.
    const redirected =
      E2E_RELAY_BASE +
      '/?relay=' +
      encodeURIComponent(urlStr.replace(/^wss?:\\/\\//, '').slice(0, 80));
    return new NativeWebSocket(redirected, protocols);
  };
  window.WebSocket.prototype = NativeWebSocket.prototype;
  window.WebSocket.CONNECTING = 0;
  window.WebSocket.OPEN = 1;
  window.WebSocket.CLOSING = 2;
  window.WebSocket.CLOSED = 3;
  // Ensure instanceof checks still pass for redirected sockets.
  Object.setPrototypeOf(window.WebSocket, NativeWebSocket);

  // Mock getUserMedia & getDisplayMedia for WebRTC calls in headless browser
  if (navigator.mediaDevices) {
    const createMockMediaStream = async (constraints = {}) => {
      const tracks = [];

      // Tone audio track so huddle mic paths always have audio
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx && constraints.audio !== false) {
          const ctx = new AudioCtx();
          const oscillator = ctx.createOscillator();
          const gain = ctx.createGain();
          gain.gain.value = 0.02;
          const dest = ctx.createMediaStreamDestination();
          oscillator.frequency.value = 440;
          oscillator.connect(gain);
          gain.connect(dest);
          oscillator.start();
          const audioTrack = dest.stream.getAudioTracks()[0];
          if (audioTrack) {
            audioTrack.enabled = true;
            tracks.push(audioTrack);
          }
        }
      } catch (_) {}

      const wantsVideo = Boolean(constraints.video) || constraints.screen === true;
      if (wantsVideo) {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
          ctx2d.fillStyle = constraints.screen ? '#1264A3' : '#4A154B';
          ctx2d.fillRect(0, 0, 640, 480);
          ctx2d.fillStyle = '#FFFFFF';
          ctx2d.font = '28px sans-serif';
          ctx2d.fillText(constraints.screen ? 'SCREEN' : 'CAMERA', 40, 80);
        }
        if (canvas.captureStream) {
          const videoStream = canvas.captureStream(15);
          videoStream.getVideoTracks().forEach((t) => {
            try {
              t.contentHint = constraints.screen ? 'detail' : 'motion';
            } catch (_) {}
            tracks.push(t);
          });
        }
      }

      return new MediaStream(tracks);
    };

    navigator.mediaDevices.getUserMedia = async (constraints = {}) => {
      const normalized = {
        audio: constraints.audio !== false,
        video: Boolean(constraints.video),
      };
      return createMockMediaStream(normalized);
    };

    if (navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async () => {
        return createMockMediaStream({ audio: false, video: true, screen: true });
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
