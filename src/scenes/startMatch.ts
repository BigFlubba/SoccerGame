import type { CareerMatch } from '../meta/career';
import type { GameContext } from './context';
import type { Scene } from './scene';
import { createVenueScene } from './venueScene';
import { createVsScene } from './vsScene';

/** The one way into a career match: the VS card, then the match. B on the card goes back to the venue screen, on this match. */
export function startMatch(ctx: GameContext, match: CareerMatch): Scene {
  return createVsScene(ctx, match, () => createVenueScene(ctx, match.venue, match.id));
}
