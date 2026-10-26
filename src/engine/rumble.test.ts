import { describe, expect, it } from 'vitest';
import { RUMBLE, createRumble } from './rumble';

/** A pad whose actuator records every effect it is asked to play. */
function fakePad(opts: { connected?: boolean; actuator?: boolean; reject?: boolean; throws?: boolean } = {}) {
  const effects: { type: string; params: unknown }[] = [];
  const actuator = {
    playEffect(type: string, params: unknown) {
      if (opts.throws) throw new Error('nope');
      effects.push({ type, params });
      return opts.reject ? Promise.reject(new Error('busy')) : Promise.resolve('complete');
    },
  };
  const pad = { connected: opts.connected ?? true, vibrationActuator: opts.actuator === false ? null : actuator } as unknown as Gamepad;
  return { pad, effects };
}

describe('rumble', () => {
  it('pulses the first connected pad with a dual-rumble effect', () => {
    const gone = fakePad({ connected: false });
    const live = fakePad();
    const r = createRumble(() => [null, gone.pad, live.pad]);
    r.pulse('goal');
    expect(gone.effects).toEqual([]);
    expect(live.effects).toEqual([{ type: 'dual-rumble', params: { duration: 700, strongMagnitude: 1, weakMagnitude: 0.8 } }]);
  });

  it('has a pulse for every kind, short except the goal and the Energy Wave', () => {
    for (const [kind, p] of Object.entries(RUMBLE)) {
      expect(p.ms, kind).toBeLessThanOrEqual(kind === 'goal' || kind === 'wave' ? 700 : 150);
      expect(p.strong, kind).toBeLessThanOrEqual(1);
      expect(p.weak, kind).toBeLessThanOrEqual(1);
    }
  });

  it('powering up kicks in with a firm pulse, and the wave goes off long and strong', () => {
    expect(RUMBLE.powerOn.strong).toBeGreaterThanOrEqual(0.5);
    expect(RUMBLE.wave.strong).toBe(1);
  });

  it('does nothing when disabled', () => {
    const live = fakePad();
    const r = createRumble(() => [live.pad]);
    r.enabled = false;
    r.pulse('goal');
    expect(live.effects).toEqual([]);
  });

  it('does nothing and does not throw with no pad, no vibrationActuator, or a rejecting playEffect', async () => {
    const noActuator = fakePad({ actuator: false });
    for (const pads of [[], [null], [noActuator.pad], [fakePad({ reject: true }).pad], [fakePad({ throws: true }).pad]]) {
      expect(() => createRumble(() => pads).pulse('tackle')).not.toThrow();
    }
    expect(() =>
      createRumble(() => {
        throw new Error('no gamepads');
      }).pulse('post'),
    ).not.toThrow();
    await new Promise(r => setTimeout(r, 0));
  });
});
