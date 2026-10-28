import { describe, expect, it } from 'vitest';
import { newProfile, type Profile } from '../meta/profile';
import { createSaveSlots, slotKey } from '../meta/saveSlots';
import { memoryStore } from '../meta/testStore';
import { openSave } from './context';
import { testContext } from './testContext';

const A: Profile = { ...newProfile(), name: 'A', coins: 100 };
const B: Profile = { ...newProfile(), name: 'B', difficulty: 'hard', coins: 7 };

describe('openSave', () => {
  function playingA() {
    const store = memoryStore();
    const saves = createSaveSlots(store, 'normal');
    saves.write(1, A);
    const ctx = testContext({ slot: 1, saves, profile: A });
    openSave(ctx, 2, B);
    return { ctx, store };
  }

  it('plays the save in its slot', () => {
    const { ctx } = playingA();
    expect([ctx.slot, ctx.profile]).toEqual([2, B]);
  });

  it('stores it at once, in its own slot only', () => {
    const { ctx, store } = playingA();
    expect(JSON.parse(store.data[slotKey(2)]!)).toEqual(B);
    expect(ctx.saves.read(1)).toEqual(A);
  });

  it('remembers it as the last save played', () => {
    expect(playingA().ctx.saves.lastPlayed()).toBe(2);
  });
});
