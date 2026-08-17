import { describe, expect, it } from 'vitest';
import {
  decodeDeviceSyncPayload,
  encodeDeviceSyncPayload,
  MultiDeviceCallManager,
} from '../lib/multiDevice';
import { StoredPrivateKeyPair, UserIdentity, Workspace } from '../types';

describe('Multi-Device Sync and Call Signaling Logic', () => {
  const mockIdentity: UserIdentity = {
    pubkey: 'pubkey_master_123',
    displayName: 'Alex Rivera',
    handle: 'alex.rivera',
    hasCustomName: true,
    avatarUrl: 'https://example.com/avatar.png',
    status: 'Active',
    lastSeen: Date.now(),
    color: '#1264A3',
  };

  const mockKeys: StoredPrivateKeyPair = {
    signPublicKey: 'sign_pub_123',
    signPrivateKey: 'sign_priv_123',
    encPublicKey: 'enc_pub_123',
    encPrivateKey: 'enc_priv_123',
  };

  const mockWorkspace: Workspace = {
    id: 'ws_general',
    name: 'Open-Slack Engineering',
    ownerPubkey: 'pubkey_master_123',
    created: Date.now(),
    relays: ['wss://relay.damus.io'],
  };

  it('encodes and decodes multi-device pairing payloads accurately', () => {
    const encoded = encodeDeviceSyncPayload(mockIdentity, mockKeys, [mockWorkspace]);
    expect(encoded).toBeTypeOf('string');

    const decoded = decodeDeviceSyncPayload(encoded);
    expect(decoded.masterPubkey).toBe('pubkey_master_123');
    expect(decoded.identity.displayName).toBe('Alex Rivera');
    expect(decoded.keys.signPublicKey).toBe('sign_pub_123');
    expect(decoded.workspaces?.[0].name).toBe('Open-Slack Engineering');
  });

  it('compacts cryptographic keys for QR pairing and reconstructs usable JWKs', () => {
    const key = (x: string, y: string, d?: string) =>
      JSON.stringify({ kty: 'EC', crv: 'P-256', x, y, ...(d ? { d } : {}) });
    const keys: StoredPrivateKeyPair = {
      signPublicKey: key('sign-x', 'sign-y'),
      signPrivateKey: key('sign-x', 'sign-y', 'sign-d'),
      encPublicKey: key('enc-x', 'enc-y'),
      encPrivateKey: key('enc-x', 'enc-y', 'enc-d'),
    };

    const decoded = decodeDeviceSyncPayload(encodeDeviceSyncPayload(mockIdentity, keys, [mockWorkspace]));

    expect(decoded.keys.signPrivateKey).toContain('"d":"sign-d"');
    expect(decoded.keys.encPrivateKey).toContain('"d":"enc-d"');
    expect(decoded.keys.signPublicKey).not.toContain('"d"');
    expect(decoded.keys.encPublicKey).not.toContain('"d"');
    expect(decoded.identity.avatarUrl).toBe('');
  });

  it('accepts legacy pairing payloads without keys or a full identity object', () => {
    const payload = btoa(
      JSON.stringify({
        masterPubkey: 'legacy-master',
        workspace: mockWorkspace,
        handle: '@legacy',
        displayName: 'Legacy User',
      })
    );

    const decoded = decodeDeviceSyncPayload(payload);

    expect(decoded.identity.displayName).toBe('Legacy User');
    expect(decoded.workspaces?.[0].id).toBe(mockWorkspace.id);
    expect(decoded.keys.signPrivateKey).toBe('');
  });

  it('handles simultaneous incoming calls and first-answerer resolution', () => {
    const desktopManager = new MultiDeviceCallManager('dev_desktop_1', 'MacBook Pro');
    const mobileManager = new MultiDeviceCallManager('dev_mobile_1', 'iPhone');

    const offer = {
      callId: 'call_999',
      channelId: 'chan_general',
      channelName: 'general',
      callerPubkey: 'pubkey_caller_456',
      callerName: 'Sarah Connor',
      timestamp: Date.now(),
    };

    // Both devices receive CALL_OFFER simultaneously
    desktopManager.handleCallOffer(offer);
    mobileManager.handleCallOffer(offer);

    expect(desktopManager.getState().isRinging).toBe(true);
    expect(mobileManager.getState().isRinging).toBe(true);
    expect(desktopManager.getState().answeredElsewhere).toBe(false);

    // Desktop answers call first
    const resolvedPayload = desktopManager.answerCallLocally('call_999');
    expect(resolvedPayload.status).toBe('ANSWERED_ELSEWHERE');
    expect(resolvedPayload.answeredByDeviceId).toBe('dev_desktop_1');
    expect(resolvedPayload.answeredDeviceName).toBe('MacBook Pro');

    // Desktop state transitions to active call
    expect(desktopManager.getState().isRinging).toBe(false);
    expect(desktopManager.getState().activeCallId).toBe('call_999');

    // Mobile receives CALL_RESOLVED event
    mobileManager.handleCallResolved(resolvedPayload);

    // Mobile ceases ringing and sets answeredElsewhere banner state
    expect(mobileManager.getState().isRinging).toBe(false);
    expect(mobileManager.getState().answeredElsewhere).toBe(true);
    expect(mobileManager.getState().answeredDeviceName).toBe('MacBook Pro');
  });

  it('allows seamless call transfer from primary to secondary device', () => {
    const desktopManager = new MultiDeviceCallManager('dev_desktop_1', 'MacBook Pro');
    const mobileManager = new MultiDeviceCallManager('dev_mobile_1', 'iPhone');

    desktopManager.answerCallLocally('call_999');
    mobileManager.handleCallResolved({
      callId: 'call_999',
      channelId: 'chan_general',
      answeredByDeviceId: 'dev_desktop_1',
      answeredDeviceName: 'MacBook Pro',
      status: 'ANSWERED_ELSEWHERE',
      timestamp: Date.now(),
    });

    // Mobile requests call transfer
    const transferReq = mobileManager.createTransferRequest('dev_mobile_1', 'dev_desktop_1', 'call_999', 'chan_general');
    expect(transferReq.fromDeviceId).toBe('dev_desktop_1');
    expect(transferReq.toDeviceId).toBe('dev_mobile_1');

    // Mobile completes transfer
    mobileManager.completeTransfer('call_999', 'chan_general');
    expect(mobileManager.getState().answeredElsewhere).toBe(false);
    expect(mobileManager.getState().activeCallId).toBe('call_999');

    // Desktop resets upon transferring call
    desktopManager.reset();
    expect(desktopManager.getState().activeCallId).toBeUndefined();
  });
});
