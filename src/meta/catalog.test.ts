import { describe, expect, it } from 'vitest';
import { POWER_FORMS, POWER_MOVES, SKILL_MOVES_LEVEL, buyMove, grantForms, hasSkillMoves, moveStatus, powerKit } from './catalog';
import { newProfile, type Profile } from './profile';

const at = (level: number, coins = 0): Profile => ({ ...newProfile(), level, coins });

describe('catalog', () => {
  it('lists the Energy Wave and Golden Form', () => {
    expect(POWER_MOVES.energyWave).toEqual({ label: 'ENERGY WAVE', blurb: 'A HUGE BEAM THAT KNOCKS MAX FLYING', unlockLevel: 3, price: 600 });
    expect(POWER_FORMS.golden).toEqual({ label: 'GOLDEN FORM', unlockLevel: 5 });
  });

  it('the Energy Wave is locked below level 3, for sale from 3 and owned once bought', () => {
    expect(moveStatus(at(2, 9999), 'energyWave')).toBe('locked');
    expect(moveStatus(at(3), 'energyWave')).toBe('buy');
    const bought = buyMove(at(3, 600), 'energyWave');
    expect(bought && moveStatus(bought, 'energyWave')).toBe('owned');
  });

  it('buying at exactly the price leaves 0 and owns and equips the move', () => {
    const p = at(3, 600);
    const bought = buyMove(p, 'energyWave');
    expect(bought?.coins).toBe(0);
    expect(bought?.powerMoves).toEqual({ owned: ['energyWave'], equipped: 'energyWave' });
    expect(p).toEqual(at(3, 600));
  });

  it('buying returns null when locked, owned or unaffordable', () => {
    expect(buyMove(at(2, 9999), 'energyWave')).toBeNull();
    expect(buyMove(at(3, 599), 'energyWave')).toBeNull();
    const owned = buyMove(at(3, 1200), 'energyWave');
    expect(owned && buyMove(owned, 'energyWave')).toBeNull();
  });

  it('Golden Form is granted and equipped from level 5, without changing the input', () => {
    expect(grantForms(at(4)).powerForms).toEqual({ owned: [], equipped: null });
    const p = at(5);
    expect(grantForms(p).powerForms).toEqual({ owned: ['golden'], equipped: 'golden' });
    expect(p.powerForms).toEqual({ owned: [], equipped: null });
  });

  it('the power kit needs an equipped move, and is golden with Golden Form', () => {
    expect(powerKit(at(5))).toBeNull();
    const wave = buyMove(at(3, 600), 'energyWave');
    expect(wave && powerKit(wave)).toEqual({ golden: false });
    const both = buyMove(grantForms(at(5, 600)), 'energyWave');
    expect(both && powerKit(both)).toEqual({ golden: true });
  });
});

describe('skill moves', () => {
  it('are his from level 4, worked out from his level alone', () => {
    expect(SKILL_MOVES_LEVEL).toBe(4);
    expect(hasSkillMoves({ ...newProfile(), level: 3 })).toBe(false);
    expect(hasSkillMoves({ ...newProfile(), level: 4 })).toBe(true);
  });
});
