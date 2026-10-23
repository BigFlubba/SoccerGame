/** Limb lengths and thicknesses in pixels for a side-view figure. */
export interface BodyProportions {
  thigh: number;
  shin: number;
  foot: number;
  ankleHeight: number;
  torso: number;
  upperArm: number;
  forearm: number;
  thighWidth: number;
  shinWidth: number;
  upperArmWidth: number;
  forearmWidth: number;
  torsoWidth: number;
}

/** Tall and lean for 12: about 40 px standing with the head. */
export const HARRISON_BODY: BodyProportions = {
  thigh: 9,
  shin: 9,
  foot: 4,
  ankleHeight: 1,
  torso: 12,
  upperArm: 7,
  forearm: 6,
  thighWidth: 4,
  shinWidth: 3,
  upperArmWidth: 3,
  forearmWidth: 2,
  torsoWidth: 6,
};

export const standingHipHeight = (b: BodyProportions): number => b.thigh + b.shin + b.ankleHeight;
