import {createRoot} from 'react-dom/client';
import {registerSW} from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Register the service worker for both browser tabs and installed PWAs.
// autoUpdate + skipWaiting means every release activates immediately and reloads
// open clients onto the content-hashed bundle for that build.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Activate waiting worker and reload so users never linger on a stale shell.
    void updateSW(true);
  },
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // Poll periodically and whenever the app becomes visible again.
    const check = () => {
      void registration.update();
    };
    window.setInterval(check, 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    window.addEventListener('online', check);
  },
});

// Intentionally not wrapping in React.StrictMode.
// StrictMode double-mounts effects in development, and Trystero's module-level
// Nostr relay manager + async room.leave() cannot safely survive leave→rejoin
// within the same tick. That race prevented multi-peer WebRTC offers/answers
// (huddles, CRDT sync). Production mounts once; e2e needs the same lifecycle.
createRoot(document.getElementById('root')!).render(<App />);
