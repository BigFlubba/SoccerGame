import { describe, expect, it } from 'vitest';
import { padMayUnlock } from './unlock';

describe('padMayUnlock', () => {
  it('tries when the browser cannot say whether the page has a user activation', () => {
    expect(padMayUnlock(undefined)).toBe(true);
    expect(padMayUnlock({})).toBe(true);
  });

  it('follows navigator.userActivation where the browser has it', () => {
    expect(padMayUnlock({ userActivation: { isActive: false } })).toBe(false);
    expect(padMayUnlock({ userActivation: { isActive: true } })).toBe(true);
  });
});
