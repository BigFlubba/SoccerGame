import { plantLeg, type ArmPose, type HeadFacing, type LegPose, type Pose } from './pose';
import { HARRISON_BODY, standingHipHeight, type BodyProportions } from './proportions';

export type AnimName = 'idle' | 'run' | 'jump' | 'shoot' | 'powerUp';

export interface AnimationClip {
  name: AnimName;
  keys: readonly Pose[];
  frameCount: number;
  fps: number;
  loop: boolean;
  /** Keys cover half a cycle; the second half mirrors near and far limbs. */
  mirrorHalf?: boolean;
}

type Leg = LegPose | { plant: number; ankle?: number };

interface KeySpec {
  x?: number;
  /** Hip height relative to standing (negative crouches); keeps clips valid for any leg length. */
  hip: number;
  torso: number;
  head?: { facing?: HeadFacing; dx?: number; dy?: number };
  near: Leg;
  far: Leg;
  nearArm: [shoulder: number, elbow: number];
  farArm: [shoulder: number, elbow: number];
}

/** Builds a pose; legs given as `{ plant: footX }` are solved so the foot rests on the ground there. */
function key(body: BodyProportions, s: KeySpec): Pose {
  const x = s.x ?? 0;
  const hipHeight = standingHipHeight(body) + s.hip;
  const leg = (l: Leg): LegPose => ('plant' in l ? plantLeg(body, x, hipHeight, l.plant, l.ankle) : { ...l });
  const arm = ([shoulder, elbow]: [number, number]): ArmPose => ({ shoulder, elbow });
  return {
    x,
    hipHeight,
    torso: s.torso,
    head: { facing: s.head?.facing ?? 'side', dx: s.head?.dx ?? 0, dy: s.head?.dy ?? 0 },
    nearLeg: leg(s.near),
    farLeg: leg(s.far),
    nearArm: arm(s.nearArm),
    farArm: arm(s.farArm),
  };
}

// Run half-cycle: the near leg strikes, takes the weight, passes under and pushes off
// while the far leg recovers and reaches forward. Arms swing opposite the legs.
const RUN_TORSO = 12;

/** Every clip, with planted feet solved for `body`. Hip offsets are relative to standing height. */
export function clipsFor(body: BodyProportions): Record<AnimName, AnimationClip> {
  const k = (s: KeySpec) => key(body, s);
  const idleKey = (hip: number, torso: number, sway: number) =>
    k({ hip, torso, near: { plant: 3 }, far: { plant: -2 }, nearArm: [5 + sway, 15], farArm: [-5 + sway, 15] });
  const powerKey = (x: number, hip: number) =>
    k({ x, hip, torso: -10, head: { dy: -1 }, near: { plant: 8 }, far: { plant: -9 }, nearArm: [-35, 80], farArm: [-30, 85] });

  return {
    idle: {
      name: 'idle',
      frameCount: 4,
      fps: 6,
      loop: true,
      keys: [idleKey(0, 2, 0), idleKey(-1, 4, 2), idleKey(-1, 4, 2), idleKey(0, 3, 1)],
    },
    run: {
      name: 'run',
      frameCount: 8,
      fps: 12,
      loop: true,
      mirrorHalf: true,
      keys: [
        k({ hip: -2, torso: RUN_TORSO, near: { plant: 7, ankle: -10 }, far: { hip: -25, knee: 60, ankle: 30 }, nearArm: [-35, 70], farArm: [40, 80] }),
        k({ hip: -3, torso: RUN_TORSO, near: { plant: 3 }, far: { hip: -5, knee: 90, ankle: 35 }, nearArm: [-20, 70], farArm: [25, 75] }),
        k({ hip: -2, torso: RUN_TORSO, near: { plant: -2 }, far: { hip: 25, knee: 95, ankle: 30 }, nearArm: [0, 70], farArm: [0, 70] }),
        k({ hip: -1, torso: RUN_TORSO, near: { hip: -25, knee: 25, ankle: 25 }, far: { hip: 40, knee: 50, ankle: 0 }, nearArm: [25, 75], farArm: [-20, 70] }),
      ],
    },
    jump: {
      name: 'jump',
      frameCount: 3,
      fps: 10,
      loop: false,
      keys: [
        // Crouch, arms swung back.
        k({ hip: -5, torso: 20, near: { plant: 3 }, far: { plant: -2 }, nearArm: [-50, 30], farArm: [-40, 30] }),
        // Rise: legs extended, toes pointed, arms up. Lifted in-frame so pointed toes clear the frame edge.
        k({ hip: 3, torso: 0, near: { hip: 5, knee: 0, ankle: 40 }, far: { hip: -5, knee: 5, ankle: 40 }, nearArm: [150, 10], farArm: [140, 10] }),
        // Tuck.
        k({ hip: 3, torso: 5, near: { hip: 40, knee: 70, ankle: 20 }, far: { hip: 10, knee: 60, ankle: 30 }, nearArm: [70, 20], farArm: [50, 20] }),
      ],
    },
    shoot: {
      name: 'shoot',
      frameCount: 5,
      fps: 15,
      loop: false,
      keys: [
        // Wind-up and charge-hold: kicking (near) leg drawn back, arms out for balance.
        k({ hip: -1, torso: -5, near: { hip: -40, knee: 90, ankle: 30 }, far: { plant: -1 }, nearArm: [-45, 20], farArm: [60, 20] }),
        k({ hip: -1, torso: -5, near: { hip: -55, knee: 100, ankle: 30 }, far: { plant: -1 }, nearArm: [-55, 20], farArm: [70, 20] }),
        // Strike, follow-through, recover.
        k({ hip: -1, torso: -10, near: { hip: 45, knee: 10, ankle: 20 }, far: { plant: -2 }, nearArm: [-20, 30], farArm: [30, 30] }),
        k({ hip: 0, torso: -15, near: { hip: 75, knee: 5, ankle: 20 }, far: { plant: -3 }, nearArm: [-30, 20], farArm: [120, 20] }),
        k({ hip: -1, torso: 0, near: { hip: 20, knee: 15, ankle: 0 }, far: { plant: -1 }, nearArm: [-10, 20], farArm: [10, 20] }),
      ],
    },
    powerUp: {
      name: 'powerUp',
      frameCount: 4,
      fps: 12,
      loop: true,
      // Wide low stance, chest out, fists at the hips, trembling with power.
      keys: [powerKey(-1, -4), powerKey(1, -5), powerKey(-1, -4), powerKey(1, -5)],
    },
  };
}

export const CLIPS: Record<AnimName, AnimationClip> = clipsFor(HARRISON_BODY);
