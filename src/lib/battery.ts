/**
 * Mobile Battery Life & Power Optimization Manager
 *
 * Implements adaptive power profiles for decentralized P2P (WebRTC/Nostr/Yjs):
 * - Dynamically throttles heartbeats and anti-entropy vector exchanges when in background or on low battery.
 * - Senses Page Visibility API (visible/hidden), Freeze/Resume events, and Battery Status API.
 * - Provides instant catch-up triggers upon wake/visibility restoration so responsiveness is never compromised.
 */

export type PowerProfileMode = 'normal' | 'battery_saver' | 'background_throttled';

export interface BatteryState {
  isSupported: boolean;
  charging: boolean;
  level: number; // 0.0 to 1.0
  isLowBattery: boolean;
  isPageHidden: boolean;
  isMobile: boolean;
  powerProfile: PowerProfileMode;
  userPreference: 'auto' | 'always' | 'never';
}

export interface PowerIntervalConfig {
  presenceHeartbeatMs: number;
  antiEntropySyncMs: number;
  relayPingIntervalMs: number;
}

const INTERVAL_CONFIGS: Record<PowerProfileMode, PowerIntervalConfig> = {
  normal: {
    presenceHeartbeatMs: 15000,     // 15 seconds
    antiEntropySyncMs: 45000,       // 45 seconds
    relayPingIntervalMs: 60000,     // 1 minute
  },
  battery_saver: {
    presenceHeartbeatMs: 30000,     // 30 seconds
    antiEntropySyncMs: 90000,       // 1.5 minutes
    relayPingIntervalMs: 120000,    // 2 minutes
  },
  background_throttled: {
    presenceHeartbeatMs: 90000,     // 90 seconds (reduced chatter)
    antiEntropySyncMs: 180000,      // 3 minutes
    relayPingIntervalMs: 300000,    // 5 minutes
  },
};

type BatteryListener = (state: BatteryState) => void;
type WakeupHandler = () => void;

export class BatteryOptimizationManager {
  private charging = true;
  private level = 1.0;
  private isSupported = false;
  private listeners: Set<BatteryListener> = new Set();
  private wakeupHandlers: Set<WakeupHandler> = new Set();
  private userPreference: 'auto' | 'always' | 'never' = 'auto';
  private wasHidden = false;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // 1. Page Visibility API
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('focus', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleVisibilityChange);

    // 2. Lifecycle Freeze / Resume
    window.addEventListener('freeze', this.handleVisibilityChange);
    window.addEventListener('resume', this.handleVisibilityChange);

    // 3. Online / Offline transitions
    window.addEventListener('online', this.handleOnline);

    // 4. Battery Status API (Chromium / Android)
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      try {
        (navigator as any)
          .getBattery()
          .then((battery: any) => {
            this.isSupported = true;
            this.charging = battery.charging;
            this.level = battery.level;

            battery.addEventListener('chargingchange', () => {
              this.charging = battery.charging;
              this.notifyListeners();
            });

            battery.addEventListener('levelchange', () => {
              this.level = battery.level;
              this.notifyListeners();
            });

            this.notifyListeners();
          })
          .catch(() => {
            this.isSupported = false;
          });
      } catch {
        this.isSupported = false;
      }
    }
  }

  public isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  }

  public setUserPreference(pref: 'auto' | 'always' | 'never') {
    this.userPreference = pref;
    this.notifyListeners();
  }

  public getUserPreference(): 'auto' | 'always' | 'never' {
    return this.userPreference;
  }

  public isPageHidden(): boolean {
    if (typeof document === 'undefined') return false;
    return document.visibilityState === 'hidden';
  }

  public getPowerProfile(): PowerProfileMode {
    if (this.isPageHidden()) {
      return 'background_throttled';
    }

    if (this.userPreference === 'always') {
      return 'battery_saver';
    }

    if (this.userPreference === 'never') {
      return 'normal';
    }

    // 'auto' mode evaluation
    const isMobile = this.isMobileDevice();
    const isLowBattery = !this.charging && this.level <= 0.25;

    if (isLowBattery || (isMobile && !this.charging)) {
      return 'battery_saver';
    }

    return 'normal';
  }

  public getIntervals(): PowerIntervalConfig {
    return INTERVAL_CONFIGS[this.getPowerProfile()];
  }

  public getState(): BatteryState {
    const isMobile = this.isMobileDevice();
    const isHidden = this.isPageHidden();
    const isLow = !this.charging && this.level <= 0.25;

    return {
      isSupported: this.isSupported,
      charging: this.charging,
      level: this.level,
      isLowBattery: isLow,
      isPageHidden: isHidden,
      isMobile,
      powerProfile: this.getPowerProfile(),
      userPreference: this.userPreference,
    };
  }

  public subscribe(listener: BatteryListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public onWakeup(handler: WakeupHandler): () => void {
    this.wakeupHandlers.add(handler);
    return () => this.wakeupHandlers.delete(handler);
  }

  private handleVisibilityChange = () => {
    const isHidden = this.isPageHidden();

    if (this.wasHidden && !isHidden) {
      // Transitioned from background to visible -> trigger immediate catch-up
      this.triggerWakeup();
    }

    this.wasHidden = isHidden;
    this.notifyListeners();
  };

  private handleOnline = () => {
    this.triggerWakeup();
    this.notifyListeners();
  };

  public triggerWakeup() {
    this.wakeupHandlers.forEach((handler) => {
      try {
        handler();
      } catch (err) {
        console.warn('[BatteryManager] Wakeup handler error:', err);
      }
    });
  }

  private notifyListeners() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.warn('[BatteryManager] Listener error:', err);
      }
    });
  }
}

export const batteryManager = new BatteryOptimizationManager();
