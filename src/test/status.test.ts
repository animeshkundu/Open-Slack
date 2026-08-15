import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeExpiryIso,
  formatStatusDisplay,
  isStatusExpired,
  STATUS_PRESETS,
} from '../lib/status';

describe('Status lifecycle helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computes deterministic expiry timestamps and leaves persistent statuses unset', () => {
    expect(computeExpiryIso(30)).toBe('2026-08-15T00:30:00.000Z');
    expect(computeExpiryIso(null)).toBeUndefined();
    expect(computeExpiryIso(undefined as never)).toBeUndefined();
  });

  it('treats an expiry at or before now as expired', () => {
    expect(isStatusExpired({ state: 'active', expiresAt: '2026-08-15T00:00:00.000Z' })).toBe(true);
    expect(isStatusExpired({ state: 'active', expiresAt: '2026-08-15T00:00:01.000Z' })).toBe(false);
    expect(isStatusExpired({ state: 'active' })).toBe(false);
    expect(isStatusExpired({ state: 'active', expiresAt: 'not-a-date' })).toBe(false);
  });

  it('formats active statuses, falling back to legacy text after expiry', () => {
    expect(
      formatStatusDisplay(
        { state: 'active', customEmoji: '🎯', customText: 'Focus time', expiresAt: '2026-08-15T01:00:00.000Z' },
        'Available'
      )
    ).toBe('🎯 Focus time');
    expect(
      formatStatusDisplay(
        { state: 'active', customEmoji: '🌴', customText: '', expiresAt: '2026-08-15T01:00:00.000Z' },
        'Available'
      )
    ).toBe('🌴');
    expect(
      formatStatusDisplay(
        { state: 'active', customText: 'Expired', expiresAt: '2026-08-14T23:00:00.000Z' },
        'Available'
      )
    ).toBe('Available');
  });

  it('keeps preset durations aligned with their intended user-facing labels', () => {
    expect(STATUS_PRESETS.find((preset) => preset.id === 'meeting')).toMatchObject({
      text: 'In a meeting',
      defaultDurationMinutes: 60,
    });
    expect(STATUS_PRESETS.find((preset) => preset.id === 'vacation')).toMatchObject({
      defaultDurationMinutes: 5 * 24 * 60,
    });
  });
});
