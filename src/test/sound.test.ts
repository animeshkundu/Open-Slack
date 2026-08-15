import { describe, expect, it, vi } from 'vitest';

describe('Sound cues', () => {
  it('silently no-ops when Web Audio is unavailable', async () => {
    vi.resetModules();
    vi.stubGlobal('AudioContext', undefined);
    const { playSound } = await import('../lib/sound');

    expect(() => {
      playSound.sent();
      playSound.received();
      playSound.pop();
      playSound.huddleJoin();
      playSound.huddleLeave();
    }).not.toThrow();

    vi.unstubAllGlobals();
  });

  it('resumes suspended audio and schedules every cue without throwing', async () => {
    const oscillators: Array<Record<string, unknown>> = [];
    const context = {
      state: 'suspended',
      currentTime: 10,
      destination: {},
      resume: vi.fn(async () => undefined),
      createOscillator: vi.fn(() => {
        const oscillator = {
          type: '',
          frequency: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        };
        oscillators.push(oscillator);
        return oscillator;
      }),
      createGain: vi.fn(() => ({
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      })),
    };
    const AudioContextMock = vi.fn(function AudioContextConstructor() {
      return context;
    });

    vi.resetModules();
    vi.stubGlobal('AudioContext', AudioContextMock);
    const { playSound } = await import('../lib/sound');

    playSound.sent();
    playSound.received();
    playSound.pop();
    playSound.huddleJoin();
    playSound.huddleLeave();

    expect(AudioContextMock).toHaveBeenCalled();
    expect(context.resume).toHaveBeenCalled();
    expect(oscillators.length).toBe(10); // sent, received, pop, join, and leave use 1, 2, 1, 3, and 3 oscillators.
    oscillators.forEach((oscillator) => {
      expect(oscillator.connect).toHaveBeenCalled();
      expect(oscillator.start).toHaveBeenCalled();
      expect(oscillator.stop).toHaveBeenCalled();
    });

    vi.unstubAllGlobals();
  });
});
