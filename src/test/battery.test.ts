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

  it('handles errors in wakeup handlers and listeners gracefully', () => {
    const manager = new BatteryOptimizationManager();
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Test listener error
    manager.subscribe(() => { throw new Error('listener fail'); });
    manager.setUserPreference('always'); // Triggers notifyListeners
    expect(spy).toHaveBeenCalledWith('[BatteryManager] Listener error:', expect.any(Error));

    // Test wakeup handler error
    manager.onWakeup(() => { throw new Error('wakeup fail'); });
    manager.triggerWakeup();
    expect(spy).toHaveBeenCalledWith('[BatteryManager] Wakeup handler error:', expect.any(Error));

    spy.mockRestore();
  });

  it('triggers wakeup on online event', () => {
    const manager = new BatteryOptimizationManager();
    const wakeupCallback = vi.fn();
    manager.onWakeup(wakeupCallback);

    window.dispatchEvent(new Event('online'));
    expect(wakeupCallback).toHaveBeenCalledTimes(1);
  });

  it('triggers wakeup on visibility change from hidden to visible', () => {
    const manager = new BatteryOptimizationManager();
    const wakeupCallback = vi.fn();
    manager.onWakeup(wakeupCallback);

    // Mock document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    });
    
    // First trigger to set wasHidden = true
    document.dispatchEvent(new Event('visibilitychange'));
    expect(wakeupCallback).not.toHaveBeenCalled();

    // Now make it visible
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });
    document.dispatchEvent(new Event('visibilitychange'));
    
    expect(wakeupCallback).toHaveBeenCalledTimes(1);
  });

  it('identifies battery saver mode in auto preference for low battery', () => {
    const manager = new BatteryOptimizationManager();
    manager.setUserPreference('auto');
    
    // Mock low battery and not charging
    // We can't easily mock private fields directly if they aren't exposed, 
    // but we can check if they are set via listener or just ensure the logic works.
    // Let's assume we can trigger the internal update logic if we had a way.
    // Since we are unit testing the class, we can cast to any for these private mocks.
    (manager as any).level = 0.1;
    (manager as any).charging = false;
    
    expect(manager.getPowerProfile()).toBe('battery_saver');
  });

  it('identifies background_throttled profile when page is hidden', () => {
    const manager = new BatteryOptimizationManager();
    
    Object.defineProperty(document, 'visibilityState', {
      value: 'hidden',
      configurable: true
    });
    
    expect(manager.getPowerProfile()).toBe('background_throttled');
    
    // Reset
    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      configurable: true
    });
  });
});
