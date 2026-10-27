import { describe, expect, it } from 'vitest';
import { HARRISON_BODY } from '../art/body/proportions';
import { CREW_BODY, CREW_HEADS, crewLook } from '../art/opponents/crew';
import { MAX_HEADS, maxLook } from '../art/opponents/max';
import { SAM_HEADS, samLook } from '../art/opponents/sam';
import { OPPONENT_LOOKS } from './art';

describe("each human opponent's art", () => {
  it('Sam wears his own heads and colours, not a stand-in', () => {
    expect(OPPONENT_LOOKS.sam.heads).toBe(SAM_HEADS);
    expect(OPPONENT_LOOKS.sam.look).toEqual(samLook());
    expect(OPPONENT_LOOKS.sam.heads).not.toBe(CREW_HEADS.pete);
    expect(OPPONENT_LOOKS.sam.body).toBe(HARRISON_BODY);
  });

  it('Max and the crew wear their own', () => {
    expect(OPPONENT_LOOKS.max).toEqual({ heads: MAX_HEADS, look: maxLook(), body: HARRISON_BODY });
    for (const id of ['brick', 'leo', 'tia', 'pete'] as const) expect(OPPONENT_LOOKS[id]).toEqual({ heads: CREW_HEADS[id], look: crewLook(id), body: CREW_BODY[id] });
  });
});
