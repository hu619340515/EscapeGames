export interface StompBodyBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface StompAttackContact {
  attacker: StompBodyBounds;
  target: StompBodyBounds;
  attackerPreviousBottom: number;
  attackerVelocityY: number;
}

export interface StompAttackOptions {
  minDownwardVelocity?: number;
  minHorizontalOverlap?: number;
  surfaceTolerance?: number;
  maxLandingDepth?: number;
}

const DEFAULT_MIN_DOWNWARD_VELOCITY = 90;
const DEFAULT_MIN_HORIZONTAL_OVERLAP = 8;
const DEFAULT_SURFACE_TOLERANCE = 8;
const DEFAULT_MAX_LANDING_DEPTH = 24;

export function isStompAttack(contact: StompAttackContact, options: StompAttackOptions = {}): boolean {
  const minDownwardVelocity = options.minDownwardVelocity ?? DEFAULT_MIN_DOWNWARD_VELOCITY;
  const minHorizontalOverlap = options.minHorizontalOverlap ?? DEFAULT_MIN_HORIZONTAL_OVERLAP;
  const surfaceTolerance = options.surfaceTolerance ?? DEFAULT_SURFACE_TOLERANCE;
  const maxLandingDepth = options.maxLandingDepth ?? DEFAULT_MAX_LANDING_DEPTH;

  if (contact.attackerVelocityY < minDownwardVelocity) {
    return false;
  }

  const horizontalOverlap =
    Math.min(contact.attacker.right, contact.target.right) - Math.max(contact.attacker.left, contact.target.left);
  if (horizontalOverlap < minHorizontalOverlap) {
    return false;
  }

  const crossedTargetTop =
    contact.attackerPreviousBottom <= contact.target.top + surfaceTolerance &&
    contact.attacker.bottom >= contact.target.top;
  const landedNearTop = contact.attacker.bottom <= contact.target.top + maxLandingDepth;
  const attackerCenterY = (contact.attacker.top + contact.attacker.bottom) / 2;
  const targetCenterY = (contact.target.top + contact.target.bottom) / 2;

  return crossedTargetTop && landedNearTop && attackerCenterY < targetCenterY;
}
