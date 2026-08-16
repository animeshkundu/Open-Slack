import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWA_DISMISS_KEY = 'openslack_pwa_dismissed_ts';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days snooze

export function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isDismissed, setIsDismissed] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [swVersion, setSwVersion] = useState('1.0.0');

  useEffect(() => {
    // 1. Detect if standalone mode (already installed)
    if (
      typeof window !== 'undefined' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true)
    ) {
      setIsInstalled(true);
    }

    // 2. Check if dismissed recently
    try {
      const dismissedTs = localStorage.getItem(PWA_DISMISS_KEY);
      if (dismissedTs) {
        const timeDiff = Date.now() - parseInt(dismissedTs, 10);
        if (timeDiff < DISMISS_COOLDOWN_MS) {
          setIsDismissed(true);
        }
      }
    } catch (_) {}

    // 3. Service Worker Auto-Update listeners
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          }
        });
      });
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!installPrompt) {
      // In mobile Safari or browsers without beforeinstallprompt, instructions can be shown
      return false;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('PWA installation prompt error:', err);
      return false;
    }
  };

  const dismissPrompt = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(PWA_DISMISS_KEY, Date.now().toString());
    } catch (_) {}
  };

  const resetDismissal = () => {
    setIsDismissed(false);
    try {
      localStorage.removeItem(PWA_DISMISS_KEY);
    } catch (_) {}
  };

  const checkForUpdate = async (): Promise<{ updated: boolean; message: string }> => {
    setIsCheckingUpdate(true);
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          setIsCheckingUpdate(false);
          return {
            updated: updateAvailable,
            message: updateAvailable
              ? 'A new version is ready. Reload to apply updates.'
              : 'You are running the latest version of Open-Slack.',
          };
        }
      }
      // Synthetic check delay for UI responsiveness
      await new Promise((resolve) => setTimeout(resolve, 800));
      setIsCheckingUpdate(false);
      return {
        updated: false,
        message: 'Open-Slack client is up to date (v1.0.0).',
      };
    } catch (err) {
      setIsCheckingUpdate(false);
      return {
        updated: false,
        message: 'Unable to check for updates while offline.',
      };
    }
  };

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isOffline,
    isDismissed,
    updateAvailable,
    isCheckingUpdate,
    swVersion,
    installApp,
    dismissPrompt,
    resetDismissal,
    checkForUpdate,
  };
}
