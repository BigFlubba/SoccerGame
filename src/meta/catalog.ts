import type { PowerKit } from '../game/power';
import type { PowerFormId, PowerMoveId, Profile } from './profile';

/** The power moves on sale in the Shop, in the order the save code stores them. */
export const POWER_MOVES: Record<PowerMoveId, { label: string; blurb: string; unlockLevel: number; price: number }> = {
  energyWave: { label: 'ENERGY WAVE', blurb: 'A HUGE BEAM THAT KNOCKS MAX FLYING', unlockLevel: 3, price: 600 },
};

/** The power forms, granted free by level, in the order the save code stores them. */
export const POWER_FORMS: Record<PowerFormId, { label: string; unlockLevel: number }> = {
  golden: { label: 'GOLDEN FORM', unlockLevel: 5 },
};

export const MOVE_IDS = Object.keys(POWER_MOVES) as PowerMoveId[];
export const FORM_IDS = Object.keys(POWER_FORMS) as PowerFormId[];

/** Every form his level has reached, owned and (when nothing is) equipped. Never changes `p`. */
export function grantForms(p: Profile): Profile {
  const owned = [...p.powerForms.owned];
  for (const id of FORM_IDS) if (POWER_FORMS[id].unlockLevel <= p.level && !owned.includes(id)) owned.push(id);
  return { ...p, powerForms: { owned, equipped: p.powerForms.equipped ?? owned[0] ?? null } };
}

export function moveStatus(p: Profile, id: PowerMoveId): 'locked' | 'buy' | 'owned' {
  if (p.powerMoves.owned.includes(id)) return 'owned';
  return p.level < POWER_MOVES[id].unlockLevel ? 'locked' : 'buy';
}

/** The profile after buying `id`, which equips it; null when it's locked, owned or too dear. */
export function buyMove(p: Profile, id: PowerMoveId): Profile | null {
  const { price } = POWER_MOVES[id];
  if (moveStatus(p, id) !== 'buy' || p.coins < price) return null;
  return { ...p, coins: p.coins - price, powerMoves: { owned: [...p.powerMoves.owned, id], equipped: id } };
}

/** What the match needs to know, or null when he has no move equipped and plays as before. */
export function powerKit(p: Profile): PowerKit | null {
  if (p.powerMoves.equipped === null) return null;
  return { golden: p.powerForms.equipped === 'golden' };
}
