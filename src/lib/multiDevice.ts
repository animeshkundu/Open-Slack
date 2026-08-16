import {
  ActiveCallState,
  CallOfferPayload,
  CallResolvedPayload,
  CallTransferPayload,
  DeviceSubIdentity,
  DeviceSyncPayload,
  StoredPrivateKeyPair,
  UserIdentity,
  Workspace,
} from '../types';

function compactKeysForPairing(keys: StoredPrivateKeyPair) {
  try {
    const signPublic = JSON.parse(keys.signPublicKey);
    const signPrivate = JSON.parse(keys.signPrivateKey);
    const encPublic = JSON.parse(keys.encPublicKey);
    const encPrivate = JSON.parse(keys.encPrivateKey);
    if (![signPublic, signPrivate, encPublic, encPrivate].every((key) => key?.x && key?.y)) {
      return keys;
    }
    return {
      s: { x: signPublic.x, y: signPublic.y, d: signPrivate.d },
      e: { x: encPublic.x, y: encPublic.y, d: encPrivate.d },
    };
  } catch {
    return keys;
  }
}

function expandPairedKeys(keys: any): StoredPrivateKeyPair {
  if (!keys?.s || !keys?.e) return keys;
  const toKey = (key: { x: string; y: string; d?: string }) =>
    JSON.stringify({ kty: 'EC', crv: 'P-256', x: key.x, y: key.y, ...(key.d ? { d: key.d } : {}) });

  return {
    signPublicKey: toKey({ x: keys.s.x, y: keys.s.y }),
    signPrivateKey: toKey(keys.s),
    encPublicKey: toKey({ x: keys.e.x, y: keys.e.y }),
    encPrivateKey: toKey(keys.e),
  };
}

/**
  Generate a unique Device ID for the current browser/device instance.
 */
export function getOrCreateDeviceId(): { deviceId: string; deviceName: string; deviceType: 'desktop' | 'mobile' | 'browser' } {
  try {
    let deviceId = localStorage.getItem('openslack_device_id');
    let deviceName = localStorage.getItem('openslack_device_name');
    let deviceTypeStr = localStorage.getItem('openslack_device_type') as 'desktop' | 'mobile' | 'browser' | null;

    if (!deviceId) {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem('openslack_device_id', deviceId);
    }

    const isMobile = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

    if (!deviceTypeStr) {
      deviceTypeStr = isMobile ? 'mobile' : 'desktop';
      localStorage.setItem('openslack_device_type', deviceTypeStr);
    }

    if (!deviceName) {
      deviceName = isMobile ? 'Mobile App' : 'Desktop Browser';
      localStorage.setItem('openslack_device_name', deviceName);
    }

    return {
      deviceId,
      deviceName,
      deviceType: deviceTypeStr,
    };
  } catch {
    return {
      deviceId: `dev_fallback_${Date.now()}`,
      deviceName: 'Desktop Browser',
      deviceType: 'desktop',
    };
  }
}

/**
 * Creates a DeviceSyncPayload for pairing a secondary device (desktop/mobile).
 */
export function encodeDeviceSyncPayload(
  identity: UserIdentity,
  keys?: StoredPrivateKeyPair | null,
  workspaces: Workspace[] = []
): string {
  const device = getOrCreateDeviceId();
  const payload = {
    version: 1,
    masterPubkey: identity?.masterPubkey || identity?.pubkey || 'pubkey',
    deviceId: device.deviceId,
    deviceName: device.deviceName,
    handle: identity?.handle || '@user',
    displayName: identity?.displayName || 'User',
    identity: identity
      ? {
          pubkey: identity.pubkey || identity.masterPubkey || 'pubkey',
          masterPubkey: identity.masterPubkey || identity.pubkey,
          handle: identity.handle,
          displayName: identity.displayName,
          color: identity.color || '#1264A3',
          hasCustomName: true,
        }
      : undefined,
    keys: keys ? compactKeysForPairing(keys) : undefined,
    workspaces:
      workspaces.length > 0
        ? workspaces.slice(0, 20).map((w) => ({
            id: w.id,
            name: w.name,
            passphrase: w.passphrase || '',
            relays: w.relays || [],
            ownerPubkey: w.ownerPubkey || w.ownerId || '',
            ownerId: w.ownerId || w.ownerPubkey,
            settings: w.settings,
            created: w.created || Date.now(),
            createdAt: w.createdAt || new Date(w.created || Date.now()).toISOString(),
            slug: w.slug,
          }))
        : undefined,
    timestamp: Date.now(),
  };

  const jsonStr = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(jsonStr)));
}

/**
 * Decodes and validates a device sync payload string.
 */
export function decodeDeviceSyncPayload(encodedStr: string): DeviceSyncPayload {
  try {
    const jsonStr = decodeURIComponent(escape(atob(encodedStr.trim())));
    const raw = JSON.parse(jsonStr);
    const rawIdentity = raw.identity || {
      pubkey: raw.masterPubkey || raw.mp || '',
      masterPubkey: raw.masterPubkey || raw.mp || '',
      handle: raw.handle || raw.h || '@user',
      displayName: raw.displayName || raw.dn || 'User',
    };

    const payload: DeviceSyncPayload = {
      version: raw.version || raw.v || 1,
      masterPubkey: raw.masterPubkey || raw.mp || (raw.identity && raw.identity.pubkey) || '',
      deviceId: raw.deviceId || raw.did || 'device',
      deviceName: raw.deviceName || raw.dn || 'Device',
      identity: {
        ...rawIdentity,
        avatarUrl: rawIdentity.avatarUrl || '',
        status: rawIdentity.status || '',
        lastSeen: rawIdentity.lastSeen || Date.now(),
        color: rawIdentity.color || '#1264A3',
        hasCustomName: rawIdentity.hasCustomName ?? true,
      },
      keys: raw.keys
        ? expandPairedKeys(raw.keys)
        : {
            signPublicKey: '',
            signPrivateKey: '',
            encPublicKey: '',
            encPrivateKey: '',
          },
      workspaces: raw.workspaces || (raw.workspace ? [raw.workspace] : []),
      timestamp: raw.timestamp || raw.ts || Date.now(),
    };

    if (!payload.masterPubkey && (!payload.workspaces || payload.workspaces.length === 0)) {
      throw new Error('Invalid device pairing payload structure');
    }
    return payload;
  } catch (err) {
    throw new Error(`Failed to parse device sync payload: ${(err as Error).message}`);
  }
}

/**
 * Multi-device call signaling manager managing incoming offers, simultaneous ringing,
 * first-answerer resolution, and call handoff.
 */
export class MultiDeviceCallManager {
  private currentDeviceId: string;
  private currentDeviceName: string;
  private state: ActiveCallState = {
    isRinging: false,
    incomingCall: null,
    answeredElsewhere: false,
    answeredDeviceName: undefined,
    activeCallId: undefined,
    channelId: undefined,
  };

  private listeners: Set<(state: ActiveCallState) => void> = new Set();

  constructor(deviceId: string, deviceName: string) {
    this.currentDeviceId = deviceId;
    this.currentDeviceName = deviceName;
  }

  public subscribe(listener: (state: ActiveCallState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => fn(this.state));
  }

  public getState(): ActiveCallState {
    return { ...this.state };
  }

  /**
   * Handles an incoming CALL_OFFER for simultaneous ringing.
   */
  public handleCallOffer(offer: CallOfferPayload) {
    // Start ringing simultaneously across registered devices
    this.state = {
      isRinging: true,
      incomingCall: offer,
      answeredElsewhere: false,
      answeredDeviceName: undefined,
      activeCallId: offer.callId,
      channelId: offer.channelId,
    };
    this.notify();
  }

  /**
   * Answers call locally on this device and creates a CALL_RESOLVED event for other devices.
   */
  public answerCallLocally(callId: string): CallResolvedPayload {
    const channelId = this.state.incomingCall?.channelId || this.state.channelId || 'general';
    this.state = {
      isRinging: false,
      incomingCall: null,
      answeredElsewhere: false,
      answeredDeviceName: undefined,
      activeCallId: callId,
      channelId,
    };
    this.notify();

    return {
      callId,
      channelId,
      answeredByDeviceId: this.currentDeviceId,
      answeredDeviceName: this.currentDeviceName,
      status: 'ANSWERED_ELSEWHERE',
      timestamp: Date.now(),
    };
  }

  /**
   * Handles CALL_RESOLVED event when call is answered by another device.
   */
  public handleCallResolved(resolved: CallResolvedPayload) {
    if (resolved.answeredByDeviceId === this.currentDeviceId) {
      // Local device answered, ignore resolution broadcast
      return;
    }

    if (resolved.status === 'ANSWERED_ELSEWHERE') {
      this.state = {
        isRinging: false,
        incomingCall: null,
        answeredElsewhere: true,
        answeredDeviceName: resolved.answeredDeviceName || 'another device',
        activeCallId: resolved.callId,
        channelId: resolved.channelId,
      };
      this.notify();
    } else if (resolved.status === 'COMPLETED' || resolved.status === 'DECLINED') {
      this.reset();
    }
  }

  /**
   * Creates a transfer request to handoff an active call to this device.
   */
  public createTransferRequest(toDeviceId: string, fromDeviceId: string, callId: string, channelId: string): CallTransferPayload {
    return {
      callId,
      channelId,
      fromDeviceId,
      toDeviceId,
      timestamp: Date.now(),
    };
  }

  /**
   * Completes call handoff locally.
   */
  public completeTransfer(callId: string, channelId: string) {
    this.state = {
      isRinging: false,
      incomingCall: null,
      answeredElsewhere: false,
      answeredDeviceName: undefined,
      activeCallId: callId,
      channelId,
    };
    this.notify();
  }

  /**
   * Resets call state (call ended/declined).
   */
  public reset() {
    this.state = {
      isRinging: false,
      incomingCall: null,
      answeredElsewhere: false,
      answeredDeviceName: undefined,
      activeCallId: undefined,
      channelId: undefined,
    };
    this.notify();
  }
}
