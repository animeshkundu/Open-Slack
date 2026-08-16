import { describe, expect, it, vi } from 'vitest';
import { BatteryOptimizationManager } from '../lib/battery';

describe('BatteryOptimizationManager', () => {
  it('initializes with default intervals and state', () => {
    const manager = new BatteryOptimizationManager();
    const intervals = manager.getIntervals();
    expect(intervals.presenceHeartbeatMs).toBeGreaterThan(0);
    expect(intervals.antiEntropySyncMs).toBeGreaterThan(0);

    const state = manager.getState();
    expect(state).toHaveProperty('charging');
    expect(state).toHaveProperty('level');
    expect(state).toHaveProperty('powerProfile');
  });

  it('respects user preference overrides', () => {
    const manager = new BatteryOptimizationManager();

    manager.setUserPreference('always');
    expect(manager.getState().powerProfile).toBe('battery_saver');
    let intervals = manager.getIntervals();
    expect(intervals.presenceHeartbeatMs).toBe(30000);
    expect(intervals.antiEntropySyncMs).toBe(90000);

    manager.setUserPreference('never');
    expect(manager.getState().powerProfile).toBe('normal');
    intervals = manager.getIntervals();
    expect(intervals.presenceHeartbeatMs).toBe(15000);
    expect(intervals.antiEntropySyncMs).toBe(45000);

    manager.setUserPreference('auto');
    expect(manager.getState().userPreference).toBe('auto');
  });

  it('notifies subscribers on state changes and handles wakeup', () => {
    const manager = new BatteryOptimizationManager();
    const listener = vi.fn();
    const unsubscribe = manager.subscribe(listener);

    manager.setUserPreference('always');
    expect(listener).toHaveBeenCalled();

    const wakeupCallback = vi.fn();
    const unsubWakeup = manager.onWakeup(wakeupCallback);

    manager.triggerWakeup();
    expect(wakeupCallback).toHaveBeenCalledTimes(1);

    unsubWakeup();
    unsubscribe();
  });
});
