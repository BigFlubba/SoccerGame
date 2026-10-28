import { hasTrail } from '../art/harrison/outfitFx';
import {
  BOOTS_IDS, KIT_IDS, buyItem, dressedIn, item, itemPrice, itemStatus, itemsIn, markSeen, outfitKey, outfitOf, starsFor, takeOff, wearItem,
  type ExtraId, type LockerItemId, type LockerTab, type Outfit,
} from '../meta/locker';
import type { Profile } from '../meta/profile';
import type { GameContext } from './context';
import { CHEER_S, LOCKER_TABS, drawLockerRoom, type LockerView } from './lockerRoomView';
import { backsOut, menuAudio } from './menu';
import { OutfitFx } from './outfitView';
import type { Scene } from './scene';

export interface LockerRoomScene extends Scene {
  readonly view: LockerView;
}

/** His effects in the room run on these random numbers. */
const FX_SEED = 53;

const isExtra = (id: LockerItemId): id is `extra:${ExtraId}` => id.startsWith('extra:');

/**
 * The Locker Room, off the Hub. Up/down pick a row and left/right a tab,
 * both wrapping; whatever the cursor is on, he's shown in at once. A
 * wears, takes off, or opens a box that buys with YES; nothing he hasn't
 * chosen is ever saved, and B, Esc or Start goes back.
 */
export function createLockerRoomScene(ctx: GameContext, back: () => Scene): LockerRoomScene {
  const { art } = ctx;
  menuAudio(ctx);
  /** The row of what he wears in `tab`: the first row for EXTRAS. */
  const wornRow = (tab: LockerTab): number => {
    const o = outfitOf(ctx.profile);
    return tab === 'kits' ? KIT_IDS.indexOf(o.kit) : tab === 'boots' ? BOOTS_IDS.indexOf(o.boots) : 0;
  };
  let tab: LockerTab = 'kits';
  let row = wornRow(tab);
  let confirm: { id: LockerItemId; yes: boolean } | null = null;
  let message: string | null = null;
  let cheerS = 0;
  let burstOwed = false;
  let fx: OutfitFx | null = null;
  let fxKey = '';

  const current = (): LockerItemId => itemsIn(tab)[row]!.id;
  const shown = (): Outfit => dressedIn(outfitOf(ctx.profile), current());
  const save = (p: Profile) => ctx.saveProfile(p);
  const cheer = () => {
    cheerS = CHEER_S;
    burstOwed = true;
  };
  /** The cursor has landed on a row: a gift there is seen, for good. */
  const see = () => {
    const seen = markSeen(ctx.profile, current());
    if (seen !== ctx.profile) save(seen);
  };
  /** One OutfitFx for what he's shown in, remade when that changes. */
  const effects = (): OutfitFx => {
    const o = shown();
    const key = outfitKey(o);
    if (!fx || key !== fxKey) {
      fx = new OutfitFx(o, FX_SEED);
      fxKey = key;
    }
    return fx;
  };

  const act = () => {
    const id = current();
    const status = itemStatus(ctx.profile, id);
    if (status === 'wearing') {
      // What he's wearing: an extra comes off; a kit or boots stays on.
      const off = isExtra(id) ? takeOff(ctx.profile, id) : null;
      if (!off) return;
      save(off);
      ctx.audio.play('menuConfirm');
      return;
    }
    if (status === 'owned') {
      const worn = wearItem(ctx.profile, id);
      if (!worn) return;
      save(worn);
      ctx.audio.play('menuConfirm');
      cheer();
      return;
    }
    if (status === 'locked') {
      message = `REACH ${starsFor(id)} STARS`;
      ctx.audio.play('nope');
      return;
    }
    const price = itemPrice(id) ?? 0;
    if (ctx.profile.coins < price) {
      message = `NEED ${price - ctx.profile.coins} MORE`;
      ctx.audio.play('nope');
      return;
    }
    confirm = { id, yes: true };
    ctx.audio.play('menuConfirm');
  };

  /** The buy box: up/down pick, A or Enter acts, B, Esc or Start close it. Start never buys. */
  const stepConfirm = (input: Parameters<Scene['update']>[0], box: { id: LockerItemId; yes: boolean }) => {
    if (input.pressed.has('up') || input.pressed.has('down')) {
      confirm = { ...box, yes: !box.yes };
      ctx.audio.play('menuMove');
    }
    if (input.pressed.has('confirm')) {
      const bought = confirm?.yes ? buyItem(ctx.profile, box.id) : null;
      confirm = null;
      if (!bought) return ctx.audio.play('menuBack');
      save(bought);
      ctx.audio.play('buy');
      cheer();
      return;
    }
    if (backsOut(input)) {
      confirm = null;
      ctx.audio.play('menuBack');
    }
  };

  const view = (): LockerView => {
    const o = shown();
    return {
      tab,
      row,
      shown: o,
      trying: outfitKey(o) !== outfitKey(outfitOf(ctx.profile)),
      sprinting: tab === 'boots' && hasTrail(o.boots),
      cheerS,
      confirm: confirm && { label: item(confirm.id).label, price: itemPrice(confirm.id) ?? 0, yes: confirm.yes },
      message,
    };
  };

  see();
  return {
    kind: 'lockerRoom',
    get view() {
      return view();
    },
    update(input, dt) {
      cheerS = Math.max(0, cheerS - dt);
      if (confirm) {
        stepConfirm(input, confirm);
        effects();
        return null;
      }
      if (backsOut(input)) {
        ctx.audio.play('menuBack');
        return back();
      }
      const n = itemsIn(tab).length;
      const before = { tab, row };
      if (input.pressed.has('up')) row = (row - 1 + n) % n;
      if (input.pressed.has('down')) row = (row + 1) % n;
      const turn = (input.pressed.has('right') ? 1 : 0) - (input.pressed.has('left') ? 1 : 0);
      if (turn !== 0) {
        tab = LOCKER_TABS[(LOCKER_TABS.indexOf(tab) + turn + LOCKER_TABS.length) % LOCKER_TABS.length]!;
        row = wornRow(tab);
      }
      if (tab !== before.tab || row !== before.row) {
        message = null;
        ctx.audio.play('menuMove');
        see();
      }
      if (input.pressed.has('confirm')) act();
      effects();
      return null;
    },
    draw(g, nowS) {
      const fxNow = effects();
      if (burstOwed) {
        fxNow.sparkleBurst();
        burstOwed = false;
      }
      drawLockerRoom(g, art, ctx.profile, view(), fxNow, nowS);
    },
  };
}
