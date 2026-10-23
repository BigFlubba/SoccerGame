// Ball physics, in px and seconds. Starting values; tune in playtest.
export const GRAVITY = 900,
  AIR_DRAG = 0.25,
  BALL_RESTITUTION = 0.55,
  WALL_RESTITUTION = 0.6,
  BAR_RESTITUTION = 0.7;
export const ROLL_FRICTION = 160,
  SPIN_DIP = 300,
  SPIN_DECAY = 0.5,
  NET_DAMPING = 0.05,
  BALL_SUBSTEP_PX = 2;
/** Below this bounce speed (px/s) the ball settles instead of bouncing again. */
export const SETTLE_SPEED = 30;
/** vx gained per unit of spin on a ground bounce: topspin skips on, backspin checks up. */
export const SPIN_SKIP = 0.1;
/** The rounded top of the crossbar: a ball resting there always rolls at least this fast. */
export const BAR_ROLL_SPEED = 20;
