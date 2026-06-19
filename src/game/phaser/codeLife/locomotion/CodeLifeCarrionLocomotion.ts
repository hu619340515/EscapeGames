export interface CodeLifeCarrionPoint {
  readonly x: number;
  readonly y: number;
}

export interface CodeLifeCarrionBodyNode extends CodeLifeCarrionPoint {
  readonly vx?: number;
  readonly vy?: number;
  readonly radius?: number;
  readonly mass?: number;
}

export interface CodeLifeCarrionBodySnapshot {
  readonly nodes: readonly CodeLifeCarrionBodyNode[];
  readonly center: CodeLifeCarrionPoint;
  readonly velocity: CodeLifeCarrionPoint;
  readonly mass: number;
}

export interface CodeLifeCarrionGripSurface {
  readonly id?: string | number;
  readonly x?: number;
  readonly y?: number;
  readonly left?: number;
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly width?: number;
  readonly height?: number;
}

export interface CodeLifeCarrionLocomotionInput {
  readonly body: CodeLifeCarrionBodySnapshot;
  readonly pointerTarget?: CodeLifeCarrionPoint | null;
  readonly isPrimaryDown: boolean;
  readonly gripSurfaces: readonly CodeLifeCarrionGripSurface[];
  readonly dtMs: number;
}

export interface CodeLifeCarrionLocomotionOptions {
  readonly maxGripDistance?: number;
  readonly deadZone?: number;
  readonly minTendrils?: number;
  readonly maxTendrils?: number;
  readonly baseMaxSpeed?: number;
  readonly releaseDamping?: number;
  readonly idleDamping?: number;
  readonly airDamping?: number;
  readonly airAcceleration?: number;
  readonly airSpeedLimit?: number;
  readonly gripResponsiveness?: number;
}

export interface CodeLifeCarrionTendrilTarget {
  readonly target: CodeLifeCarrionPoint;
  readonly source: CodeLifeCarrionPoint;
  readonly surfaceId?: string | number;
  readonly surfaceIndex: number;
  readonly distance: number;
  readonly strength: number;
  readonly forwardScore: number;
  readonly angleScore: number;
}

export interface CodeLifeCarrionLocomotionOutput {
  readonly nextVelocity: CodeLifeCarrionPoint;
  readonly desiredVelocity: CodeLifeCarrionPoint;
  readonly gripDirection: CodeLifeCarrionPoint;
  readonly leadingDirection: CodeLifeCarrionPoint;
  readonly locomotionTendrils: readonly CodeLifeCarrionTendrilTarget[];
  readonly tractionStrength: number;
  readonly stretch: number;
  readonly targetDistance: number;
  readonly maxSpeed: number;
  readonly hasGrip: boolean;
  readonly isInDeadZone: boolean;
}

interface ResolvedGripSurface {
  readonly id?: string | number;
  readonly index: number;
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface ResolvedOptions {
  readonly maxGripDistance: number;
  readonly deadZone: number;
  readonly minTendrils: number;
  readonly maxTendrils: number;
  readonly baseMaxSpeed: number;
  readonly releaseDamping: number;
  readonly idleDamping: number;
  readonly airDamping: number;
  readonly airAcceleration: number;
  readonly airSpeedLimit: number;
  readonly gripResponsiveness: number;
}

interface TendrilCandidate extends CodeLifeCarrionTendrilTarget {
  readonly score: number;
}

const DEFAULT_OPTIONS: ResolvedOptions = {
  maxGripDistance: 420,
  deadZone: 22,
  minTendrils: 3,
  maxTendrils: 6,
  baseMaxSpeed: 440,
  releaseDamping: 14,
  idleDamping: 9,
  airDamping: 10,
  airAcceleration: 95,
  airSpeedLimit: 58,
  gripResponsiveness: 12,
};

const ZERO: CodeLifeCarrionPoint = { x: 0, y: 0 };
const EPSILON = 0.0001;

export function computeCodeLifeCarrionLocomotion(
  input: CodeLifeCarrionLocomotionInput,
  options: CodeLifeCarrionLocomotionOptions = {},
): CodeLifeCarrionLocomotionOutput {
  const resolved = resolveOptions(options);
  const dt = normalizeDeltaMs(input.dtMs);
  const center = sanitizePoint(input.body.center);
  const currentVelocity = sanitizePoint(input.body.velocity);
  const mass = clamp(finiteOr(input.body.mass, 1), 0.25, 6);
  const pointerTarget = input.pointerTarget ? sanitizePoint(input.pointerTarget) : null;
  const toTarget = pointerTarget ? subtract(pointerTarget, center) : ZERO;
  const targetDistance = length(toTarget);
  const velocityDirection = normalize(currentVelocity) ?? { x: 1, y: 0 };
  const leadingDirection = normalize(toTarget) ?? velocityDirection;
  const isInDeadZone = !pointerTarget || targetDistance <= resolved.deadZone;
  const maxSpeed = getMassAdjustedMaxSpeed(resolved.baseMaxSpeed, mass);

  if (!input.isPrimaryDown || isInDeadZone) {
    const damping = input.isPrimaryDown ? resolved.idleDamping : resolved.releaseDamping;
    const nextVelocity = dampVelocity(currentVelocity, damping, dt);

    return {
      nextVelocity,
      desiredVelocity: ZERO,
      gripDirection: ZERO,
      leadingDirection,
      locomotionTendrils: [],
      tractionStrength: 0,
      stretch: getStretch(0, nextVelocity, maxSpeed),
      targetDistance,
      maxSpeed,
      hasGrip: false,
      isInDeadZone,
    };
  }

  const surfaces = input.gripSurfaces
    .map((surface, index) => resolveGripSurface(surface, index))
    .filter((surface): surface is ResolvedGripSurface => surface !== null);
  const locomotionTendrils = selectLocomotionTendrils(
    sanitizeNodes(input.body.nodes),
    center,
    leadingDirection,
    mass,
    surfaces,
    resolved,
  );

  if (locomotionTendrils.length === 0) {
    const airLimit = resolved.airSpeedLimit / Math.sqrt(mass);
    const retained = scale(currentVelocity, Math.exp(-resolved.airDamping * dt));
    const impulse = scale(leadingDirection, (resolved.airAcceleration / Math.sqrt(mass)) * dt);
    const nextVelocity = clampVector(add(retained, impulse), airLimit);
    const desiredVelocity = scale(leadingDirection, Math.min(airLimit, resolved.airAcceleration * 0.2));

    return {
      nextVelocity,
      desiredVelocity,
      gripDirection: leadingDirection,
      leadingDirection,
      locomotionTendrils: [],
      tractionStrength: 0.06,
      stretch: getStretch(0.06, nextVelocity, maxSpeed),
      targetDistance,
      maxSpeed,
      hasGrip: false,
      isInDeadZone: false,
    };
  }

  const gripDirection = getGripDirection(locomotionTendrils, center, leadingDirection);
  const averageStrength =
    locomotionTendrils.reduce((sum, tendril) => sum + tendril.strength, 0) / locomotionTendrils.length;
  const distanceIntent = clamp((targetDistance - resolved.deadZone) / (resolved.maxGripDistance * 0.62), 0.24, 1);
  const massTractionScale = 1 + (mass - 1) * 0.24;
  const tractionStrength = clamp(averageStrength * distanceIntent * massTractionScale, 0.12, 2.35);
  const moveDirection = normalize(add(scale(leadingDirection, 0.64), scale(gripDirection, 0.36))) ?? leadingDirection;
  const desiredSpeed = maxSpeed * clamp(0.38 + distanceIntent * 0.62, 0.28, 1);
  const desiredVelocity = scale(moveDirection, desiredSpeed);
  const responsiveness = resolved.gripResponsiveness + tractionStrength * 2.2;
  const blend = 1 - Math.exp(-responsiveness * dt);
  const nextVelocity = clampVector(lerpPoint(currentVelocity, desiredVelocity, blend), maxSpeed);

  return {
    nextVelocity,
    desiredVelocity,
    gripDirection,
    leadingDirection,
    locomotionTendrils,
    tractionStrength,
    stretch: getStretch(tractionStrength, nextVelocity, maxSpeed),
    targetDistance,
    maxSpeed,
    hasGrip: true,
    isInDeadZone: false,
  };
}

export const resolveCodeLifeCarrionLocomotion = computeCodeLifeCarrionLocomotion;

export function getClosestPointOnRectangleBoundary(
  point: CodeLifeCarrionPoint,
  surface: CodeLifeCarrionGripSurface,
): CodeLifeCarrionPoint {
  const rect = resolveGripSurface(surface, 0);
  if (!rect) {
    return sanitizePoint(point);
  }

  return getClosestPointOnResolvedRectangleBoundary(sanitizePoint(point), rect);
}

function selectLocomotionTendrils(
  nodes: readonly CodeLifeCarrionBodyNode[],
  center: CodeLifeCarrionPoint,
  leadingDirection: CodeLifeCarrionPoint,
  mass: number,
  surfaces: readonly ResolvedGripSurface[],
  options: ResolvedOptions,
): CodeLifeCarrionTendrilTarget[] {
  if (surfaces.length === 0) {
    return [];
  }

  const desiredCount = clampInt(Math.round(3 + mass * 0.9), options.minTendrils, options.maxTendrils);
  const sources = getLeadingSources(nodes, center, leadingDirection, desiredCount, options.maxTendrils);
  const candidates: TendrilCandidate[] = [];

  for (const source of sources) {
    const radial = subtract(source, center);
    const radialDirection = normalize(radial) ?? leadingDirection;
    const sourceForward = dot(radialDirection, leadingDirection);

    for (const surface of surfaces) {
      const target = getClosestPointOnResolvedRectangleBoundary(source, surface);
      const fromCenter = subtract(target, center);
      const fromSource = subtract(target, source);
      const centerDistance = length(fromCenter);
      const sourceDistance = length(fromSource);

      if (centerDistance > options.maxGripDistance || sourceDistance > options.maxGripDistance) {
        continue;
      }

      const targetDirection = normalize(fromCenter);
      if (!targetDirection) {
        continue;
      }

      const forwardScore = dot(targetDirection, leadingDirection);
      if (forwardScore < -0.18) {
        continue;
      }

      const distanceScore = 1 - Math.max(centerDistance, sourceDistance) / options.maxGripDistance;
      const lateralDistance = Math.abs(cross(leadingDirection, fromCenter));
      const lateralScore = 1 - Math.min(1, lateralDistance / options.maxGripDistance);
      const projectedDistance = dot(fromCenter, leadingDirection);
      const projectionScore =
        1 - Math.min(1, Math.abs(projectedDistance - options.maxGripDistance * 0.48) / options.maxGripDistance);
      const angleScore = clamp01((forwardScore + 1) / 2);
      const score =
        Math.max(0, forwardScore) * 0.38 +
        distanceScore * 0.24 +
        lateralScore * 0.14 +
        clamp01((sourceForward + 1) / 2) * 0.12 +
        projectionScore * 0.12;
      const strength = clamp(0.22 + score * 1.05 + distanceScore * 0.24, 0.16, 1.45);

      candidates.push({
        target,
        source,
        surfaceId: surface.id,
        surfaceIndex: surface.index,
        distance: sourceDistance,
        strength,
        forwardScore,
        angleScore,
        score,
      });
    }
  }

  return candidates
    .sort((a, b) => b.score - a.score || a.distance - b.distance)
    .reduce<CodeLifeCarrionTendrilTarget[]>((selected, candidate) => {
      if (selected.length >= desiredCount) {
        return selected;
      }

      const tooClose = selected.some(
        (tendril) =>
          tendril.surfaceIndex === candidate.surfaceIndex &&
          distance(tendril.target, candidate.target) < 12 &&
          distance(tendril.source, candidate.source) < 12,
      );

      if (!tooClose) {
        selected.push(stripCandidateScore(candidate));
      }

      return selected;
    }, []);
}

function getLeadingSources(
  nodes: readonly CodeLifeCarrionBodyNode[],
  center: CodeLifeCarrionPoint,
  leadingDirection: CodeLifeCarrionPoint,
  desiredCount: number,
  maxCount: number,
): CodeLifeCarrionPoint[] {
  const bodyRadius = getBodyRadius(nodes, center);
  const actualSources = nodes
    .map((node) => {
      const point = sanitizePoint(node);
      const direction = normalize(subtract(point, center)) ?? leadingDirection;

      return {
        point,
        forward: dot(direction, leadingDirection),
        distance: distance(point, center),
      };
    })
    .filter((source) => source.forward > -0.42)
    .sort((a, b) => b.forward - a.forward || b.distance - a.distance)
    .slice(0, Math.max(maxCount * 2, desiredCount))
    .map((source) => source.point);

  const sources = [...actualSources];
  const virtualCount = Math.max(0, desiredCount - sources.length);

  for (let index = 0; index < virtualCount; index += 1) {
    const offset = virtualCount === 1 ? 0 : (index / (virtualCount - 1) - 0.5) * 1.18;
    const direction = rotate(leadingDirection, offset);
    sources.push(add(center, scale(direction, bodyRadius)));
  }

  return sources.slice(0, Math.max(maxCount * 2, desiredCount));
}

function getGripDirection(
  tendrils: readonly CodeLifeCarrionTendrilTarget[],
  center: CodeLifeCarrionPoint,
  fallback: CodeLifeCarrionPoint,
): CodeLifeCarrionPoint {
  let x = 0;
  let y = 0;

  for (const tendril of tendrils) {
    const pull = normalize(subtract(tendril.target, tendril.source)) ?? normalize(subtract(tendril.target, center));
    if (pull) {
      x += pull.x * tendril.strength;
      y += pull.y * tendril.strength;
    }
  }

  return normalize({ x, y }) ?? fallback;
}

function getClosestPointOnResolvedRectangleBoundary(
  point: CodeLifeCarrionPoint,
  rect: ResolvedGripSurface,
): CodeLifeCarrionPoint {
  const clampedX = clamp(point.x, rect.left, rect.right);
  const clampedY = clamp(point.y, rect.top, rect.bottom);

  if (rect.left === rect.right && rect.top === rect.bottom) {
    return { x: rect.left, y: rect.top };
  }

  if (rect.left === rect.right) {
    return { x: rect.left, y: clampedY };
  }

  if (rect.top === rect.bottom) {
    return { x: clampedX, y: rect.top };
  }

  const isInside =
    point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;

  if (!isInside) {
    return { x: clampedX, y: clampedY };
  }

  const edges = [
    { x: rect.left, y: clampedY, distance: point.x - rect.left },
    { x: rect.right, y: clampedY, distance: rect.right - point.x },
    { x: clampedX, y: rect.top, distance: point.y - rect.top },
    { x: clampedX, y: rect.bottom, distance: rect.bottom - point.y },
  ];
  const closest = edges.reduce((best, edge) => (edge.distance < best.distance ? edge : best));

  return { x: closest.x, y: closest.y };
}

function resolveGripSurface(surface: CodeLifeCarrionGripSurface, index: number): ResolvedGripSurface | null {
  const x = finiteOrNull(surface.x);
  const y = finiteOrNull(surface.y);
  const width = finiteOrNull(surface.width);
  const height = finiteOrNull(surface.height);
  const surfaceLeft = finiteOrNull(surface.left);
  const surfaceTop = finiteOrNull(surface.top);
  const surfaceRight = finiteOrNull(surface.right);
  const surfaceBottom = finiteOrNull(surface.bottom);
  const left = surfaceLeft ?? x ?? (surfaceRight !== null && width !== null ? surfaceRight - width : null);
  const top = surfaceTop ?? y ?? (surfaceBottom !== null && height !== null ? surfaceBottom - height : null);
  const right = surfaceRight ?? (left !== null && width !== null ? left + width : null);
  const bottom = surfaceBottom ?? (top !== null && height !== null ? top + height : null);

  if (left === null || top === null || right === null || bottom === null) {
    return null;
  }

  return {
    id: surface.id,
    index,
    left: Math.min(left, right),
    top: Math.min(top, bottom),
    right: Math.max(left, right),
    bottom: Math.max(top, bottom),
  };
}

function resolveOptions(options: CodeLifeCarrionLocomotionOptions): ResolvedOptions {
  const minTendrils = clampInt(options.minTendrils ?? DEFAULT_OPTIONS.minTendrils, 1, 6);
  const maxTendrils = clampInt(options.maxTendrils ?? DEFAULT_OPTIONS.maxTendrils, minTendrils, 6);

  return {
    maxGripDistance: Math.max(1, options.maxGripDistance ?? DEFAULT_OPTIONS.maxGripDistance),
    deadZone: Math.max(0, options.deadZone ?? DEFAULT_OPTIONS.deadZone),
    minTendrils,
    maxTendrils,
    baseMaxSpeed: Math.max(1, options.baseMaxSpeed ?? DEFAULT_OPTIONS.baseMaxSpeed),
    releaseDamping: Math.max(0, options.releaseDamping ?? DEFAULT_OPTIONS.releaseDamping),
    idleDamping: Math.max(0, options.idleDamping ?? DEFAULT_OPTIONS.idleDamping),
    airDamping: Math.max(0, options.airDamping ?? DEFAULT_OPTIONS.airDamping),
    airAcceleration: Math.max(0, options.airAcceleration ?? DEFAULT_OPTIONS.airAcceleration),
    airSpeedLimit: Math.max(0, options.airSpeedLimit ?? DEFAULT_OPTIONS.airSpeedLimit),
    gripResponsiveness: Math.max(0, options.gripResponsiveness ?? DEFAULT_OPTIONS.gripResponsiveness),
  };
}

function sanitizeNodes(nodes: readonly CodeLifeCarrionBodyNode[]): CodeLifeCarrionBodyNode[] {
  return nodes.filter((node) => Number.isFinite(node.x) && Number.isFinite(node.y));
}

function sanitizePoint(point: CodeLifeCarrionPoint): CodeLifeCarrionPoint {
  return {
    x: finiteOr(point.x, 0),
    y: finiteOr(point.y, 0),
  };
}

function getBodyRadius(nodes: readonly CodeLifeCarrionBodyNode[], center: CodeLifeCarrionPoint): number {
  if (nodes.length === 0) {
    return 26;
  }

  const average = nodes.reduce((sum, node) => sum + distance(node, center), 0) / nodes.length;
  return clamp(average || 26, 12, 90);
}

function getMassAdjustedMaxSpeed(baseMaxSpeed: number, mass: number): number {
  return baseMaxSpeed / (1 + Math.max(0, mass - 1) * 0.18);
}

function getStretch(tractionStrength: number, velocity: CodeLifeCarrionPoint, maxSpeed: number): number {
  return clamp(1 + tractionStrength * 0.26 + (length(velocity) / Math.max(maxSpeed, 1)) * 0.18, 1, 1.72);
}

function dampVelocity(velocity: CodeLifeCarrionPoint, damping: number, dt: number): CodeLifeCarrionPoint {
  return scale(velocity, Math.exp(-damping * dt));
}

function normalizeDeltaMs(dtMs: number): number {
  if (!Number.isFinite(dtMs) || dtMs <= 0) {
    return 0;
  }

  return Math.min(dtMs, 80) / 1000;
}

function stripCandidateScore(candidate: TendrilCandidate): CodeLifeCarrionTendrilTarget {
  return {
    target: candidate.target,
    source: candidate.source,
    surfaceId: candidate.surfaceId,
    surfaceIndex: candidate.surfaceIndex,
    distance: candidate.distance,
    strength: candidate.strength,
    forwardScore: candidate.forwardScore,
    angleScore: candidate.angleScore,
  };
}

function add(a: CodeLifeCarrionPoint, b: CodeLifeCarrionPoint): CodeLifeCarrionPoint {
  return { x: a.x + b.x, y: a.y + b.y };
}

function subtract(a: CodeLifeCarrionPoint, b: CodeLifeCarrionPoint): CodeLifeCarrionPoint {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(point: CodeLifeCarrionPoint, scalar: number): CodeLifeCarrionPoint {
  return { x: point.x * scalar, y: point.y * scalar };
}

function lerpPoint(a: CodeLifeCarrionPoint, b: CodeLifeCarrionPoint, t: number): CodeLifeCarrionPoint {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function length(point: CodeLifeCarrionPoint): number {
  return Math.hypot(point.x, point.y);
}

function distance(a: CodeLifeCarrionPoint, b: CodeLifeCarrionPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function normalize(point: CodeLifeCarrionPoint): CodeLifeCarrionPoint | null {
  const pointLength = length(point);
  if (pointLength <= EPSILON) {
    return null;
  }

  return {
    x: point.x / pointLength,
    y: point.y / pointLength,
  };
}

function dot(a: CodeLifeCarrionPoint, b: CodeLifeCarrionPoint): number {
  return a.x * b.x + a.y * b.y;
}

function cross(a: CodeLifeCarrionPoint, b: CodeLifeCarrionPoint): number {
  return a.x * b.y - a.y * b.x;
}

function rotate(point: CodeLifeCarrionPoint, radians: number): CodeLifeCarrionPoint {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: point.x * cos - point.y * sin,
    y: point.x * sin + point.y * cos,
  };
}

function clampVector(point: CodeLifeCarrionPoint, maxLength: number): CodeLifeCarrionPoint {
  const pointLength = length(point);
  if (pointLength <= maxLength || pointLength <= EPSILON) {
    return point;
  }

  return scale(point, maxLength / pointLength);
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function finiteOrNull(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) ? value : null;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
