import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTFIT, type LockerItemId } from '../meta/locker';
import { newProfile, type Profile } from '../meta/profile';
import { aHint, drawLockerRoom, statusText, type LockerView } from './lockerRoomView';
import { OutfitFx } from './outfitView';
import { fakeArt, recordingContext } from './testDraw';

const VIEW: LockerView = { tab: 'kits', row: 0, shown: DEFAULT_OUTFIT, trying: false, sprinting: false, cheerS: 0, confirm: null, message: null };
const paid = (milestonesPaid: number, seen: LockerItemId[] = []): Profile => {
  const p = newProfile();
  return { ...p, career: { ...p.career, milestonesPaid }, locker: { ...p.locker, seen } };
};

function drawn(p: Profile, v: Partial<LockerView> = {}): string[] {
  const { g, drawn } = recordingContext();
  drawLockerRoom(g, fakeArt(), p, { ...VIEW, ...v }, new OutfitFx(DEFAULT_OUTFIT, 1), 0.5);
  return drawn;
}

describe('row text', () => {
  it('status text: WEARING, OWNED, the price, the stars a gift needs', () => {
    const p = newProfile();
    expect(['kit:home', 'kit:away', 'kit:sky', 'kit:navy', 'kit:gold', 'boots:gold'].map(id => statusText(p, id as LockerItemId))).toEqual(['WEARING', 'OWNED', '200', '250', '50', '75']);
  });

  it('the A hint: BUY, WEAR, TAKE OFF, or none on what he wears and on a locked gift', () => {
    const p = newProfile();
    expect(aHint(p, 'kit:sky')).toBe('BUY');
    expect(aHint(p, 'kit:away')).toBe('WEAR');
    expect(aHint(p, 'kit:home')).toBeNull();
    expect(aHint(p, 'extra:glasses')).toBe('WEAR');
    expect(aHint({ ...p, locker: { ...p.locker, extras: ['glasses'] } }, 'extra:glasses')).toBe('TAKE OFF');
    expect(aHint(p, 'kit:gold')).toBeNull();
  });
});

describe('drawLockerRoom', () => {
  it('Harrison comes from art.preview', () => {
    expect(drawn(newProfile()).some(n => n.startsWith('art.preview('))).toBe(true);
  });

  it('TRYING ON only while trying', () => {
    const plate = 'art.text(TRYING ON,1,white,outline)';
    expect(drawn(newProfile(), { trying: true })).toContain(plate);
    expect(drawn(newProfile())).not.toContain(plate);
  });

  it('NEW beside an unseen gift', () => {
    const tag = 'art.text(NEW,1,flameLight,outline)';
    expect(drawn(paid(2), { tab: 'boots' })).toContain(tag);
    expect(drawn(paid(2, ['boots:lightning']), { tab: 'boots' })).not.toContain(tag);
    expect(drawn(paid(0), { tab: 'boots' })).not.toContain(tag);
  });

  it('the buy box over the list', () => {
    const d = drawn(newProfile(), { confirm: { label: 'INFERNO', price: 1500, yes: true } });
    expect(d).toContain('art.text(BUY INFERNO?,2,energyGold,outline)');
    expect(d).toContain('art.text(YES,1,energyGold,outline)');
  });

  it('a long name asks in small letters, so the box holds it', () => {
    expect(drawn(newProfile(), { confirm: { label: 'BLACK GOLD', price: 1000, yes: true } })).toContain('art.text(BUY BLACK GOLD?,1,energyGold,outline)');
  });

  it('the message takes the blurb\'s place, in red', () => {
    const d = drawn(newProfile(), { message: 'NEED 300 MORE' });
    expect(d).toContain('art.text(NEED 300 MORE,1,redLight,outline)');
    expect(d).not.toContain('art.text(YOUR CLUB KIT,1,silver,outline)');
    expect(drawn(newProfile())).toContain('art.text(YOUR CLUB KIT,1,silver,outline)');
  });

  it('the hints: the A hint for the row, and B BACK', () => {
    expect(drawn(newProfile(), { row: 2 })).toEqual(expect.arrayContaining(['art.text(BUY,1,silver,outline)', 'art.text(BACK,1,silver,outline)']));
    expect(drawn(newProfile(), { row: 0 })).not.toContain('art.text(BUY,1,silver,outline)');
  });

  it('a sprinting try-on and the cheer draw his sprint and celebrate clips', () => {
    expect(drawn(newProfile(), { sprinting: true }).some(n => n.startsWith('art.preview([object Object],sprint,'))).toBe(true);
    expect(drawn(newProfile(), { cheerS: 1 }).some(n => n.startsWith('art.preview([object Object],celebrate,'))).toBe(true);
  });
});
