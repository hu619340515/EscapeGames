import type {
  CodeFluidBodyOptions,
  CodeFluidBounds,
  CodeFluidInput,
  CodeFluidNode,
  CodeFluidPoint,
} from "./CodeFluidTypes";

interface InternalNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx: number;
  fy: number;
  radius: number;
  mass: number;
  glyph: string;
  phase: number;
}

interface ResolvedBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface ActiveTendril {
  anchor: CodeFluidPoint;
  strength: number;
}

interface ResolvedOptions {
  mass: number;
  minMass: number;
  maxMass: number;
  baseRadius: number;
  nodeCount: number;
  minNodeCount: number;
  maxNodeCount: number;
  moveForce: number;
  targetForce: number;
  tendrilForce: number;
  springStiffness: number;
  bendStiffness: number;
  shapeStiffness: number;
  pressureStrength: number;
  damping: number;
  boundaryDamping: number;
  maxSpeed: number;
}

const DEFAULT_OPTIONS: ResolvedOptions = {
  mass: 1,
  minMass: 0.35,
  maxMass: 4,
  baseRadius: 30,
  nodeCount: 18,
  minNodeCount: 10,
  maxNodeCount: 36,
  moveForce: 850,
  targetForce: 520,
  tendrilForce: 2600,
  springStiffness: 82,
  bendStiffness: 18,
  shapeStiffness: 34,
  pressureStrength: 56,
  damping: 4.6,
  boundaryDamping: 0.36,
  maxSpeed: 520,
};

const CODE_GLYPHS = ["0", "1", "{", "}", "<", ">", "/", "\\", "#", "$", "%", "&"];
const TWO_PI = Math.PI * 2;
const MIN_DISTANCE = 0.0001;
const MAX_SUBSTEP = 1 / 90;

export class CodeFluidBody {
  private readonly options: ResolvedOptions;
  private readonly spawnCenter: CodeFluidPoint;
  private nodes: InternalNode[] = [];
  private totalMass = 1;
  private activeTendril: ActiveTendril | null = null;

  public constructor(center: CodeFluidPoint = { x: 0, y: 0 }, options: CodeFluidBodyOptions = {}) {
    this.options = resolveOptions(options);
    this.spawnCenter = { x: center.x, y: center.y };
    this.reset(center, this.options.mass);
  }

  public reset(center: CodeFluidPoint = this.spawnCenter, mass = this.options.mass): void {
    this.totalMass = clamp(mass, this.options.minMass, this.options.maxMass);
    this.activeTendril = null;
    const nodeCount = this.getTargetNodeCount();
    const radius = this.getTargetRadius();

    this.nodes = Array.from({ length: nodeCount }, (_, index) => {
      const angle = (index / nodeCount) * TWO_PI;
      const ripple = 1 + Math.sin(index * 2.399963229728653 + nodeCount) * 0.045;

      return {
        x: center.x + Math.cos(angle) * radius * ripple,
        y: center.y + Math.sin(angle) * radius * ripple,
        vx: 0,
        vy: 0,
        fx: 0,
        fy: 0,
        radius: 1,
        mass: 1,
        glyph: CODE_GLYPHS[index % CODE_GLYPHS.length],
        phase: index / nodeCount,
      };
    });

    this.syncNodeMassAndRadius();
  }

  public update(dt: number, input: CodeFluidInput = {}, bounds: CodeFluidBounds = {}): void {
    const seconds = normalizeDeltaTime(dt);
    if (seconds <= 0 || this.nodes.length === 0) {
      return;
    }

    this.reconcileNodeCount();

    const substeps = Math.max(1, Math.ceil(seconds / MAX_SUBSTEP));
    const step = seconds / substeps;
    const resolvedBounds = resolveBounds(bounds);

    for (let index = 0; index < substeps; index += 1) {
      this.step(step, input, resolvedBounds);
    }
  }

  public getNodes(): CodeFluidNode[] {
    return this.nodes.map((node) => ({
      x: node.x,
      y: node.y,
      vx: node.vx,
      vy: node.vy,
      radius: node.radius,
      mass: node.mass,
      glyph: node.glyph,
      phase: node.phase,
    }));
  }

  public getCenter(): CodeFluidPoint {
    return this.calculateCenter();
  }

  public applyDamage(amount: number, origin?: CodeFluidPoint): number {
    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    const previousMass = this.totalMass;
    this.totalMass = clamp(this.totalMass - amount, this.options.minMass, this.options.maxMass);
    const lostMass = previousMass - this.totalMass;

    if (lostMass > 0) {
      this.applyMassImpulse(origin, 135 * lostMass, 1);
      this.reconcileNodeCount();
      this.syncNodeMassAndRadius();
      this.relaxVolumeAfterMassChange();
    }

    return lostMass;
  }

  public devour(amount: number, source?: CodeFluidPoint): number {
    if (!Number.isFinite(amount) || amount <= 0) {
      return 0;
    }

    const previousMass = this.totalMass;
    this.totalMass = clamp(this.totalMass + amount, this.options.minMass, this.options.maxMass);
    const gainedMass = this.totalMass - previousMass;

    if (gainedMass > 0) {
      this.reconcileNodeCount(source);
      this.syncNodeMassAndRadius();
      this.applyMassImpulse(source, 90 * gainedMass, -1);
      this.relaxVolumeAfterMassChange();
    }

    return gainedMass;
  }

  public startTendril(anchor: CodeFluidPoint, strength = 1): void {
    this.activeTendril = {
      anchor: { x: anchor.x, y: anchor.y },
      strength: clamp(strength, 0, 3),
    };
  }

  public clearTendril(): void {
    this.activeTendril = null;
  }

  private step(dt: number, input: CodeFluidInput, bounds: ResolvedBounds): void {
    const center = this.calculateCenter();
    const targetRadius = this.getTargetRadius();
    const movement = normalizeOptional(input.move);
    const traction = input.traction ?? this.activeTendril?.anchor ?? null;
    const tractionStrength = clamp(
      input.tractionStrength ?? this.activeTendril?.strength ?? 1,
      0,
      3,
    );
    const shouldPreserveCenter = !movement && !traction && !input.target;

    for (const node of this.nodes) {
      node.fx = 0;
      node.fy = 0;
    }

    this.applyMovementForces(movement);
    this.applyTargetForce(input.target ?? null, clamp(input.targetWeight ?? 1, 0, 3));
    this.applyTendrilForce(traction, tractionStrength);
    this.applySpringForces(targetRadius);
    this.applyShapeForces(center, targetRadius, movement, traction);
    this.applyPressureForces(center, targetRadius);

    for (const node of this.nodes) {
      const inverseMass = 1 / Math.max(node.mass, MIN_DISTANCE);
      node.vx += node.fx * inverseMass * dt;
      node.vy += node.fy * inverseMass * dt;

      const drag = Math.max(0, 1 - this.options.damping * dt);
      node.vx *= drag;
      node.vy *= drag;

      const speed = Math.hypot(node.vx, node.vy);
      if (speed > this.options.maxSpeed) {
        const scale = this.options.maxSpeed / speed;
        node.vx *= scale;
        node.vy *= scale;
      }

      node.x += node.vx * dt;
      node.y += node.vy * dt;
      this.constrainNodeToBounds(node, bounds);
    }

    this.projectArea(center, targetRadius);
    if (shouldPreserveCenter) {
      this.translateCenterTo(center);
    }
  }

  private applyMovementForces(movement: CodeFluidPoint | null): void {
    if (!movement) {
      return;
    }

    for (const node of this.nodes) {
      node.fx += movement.x * this.options.moveForce * node.mass;
      node.fy += movement.y * this.options.moveForce * node.mass;
    }
  }

  private applyTargetForce(target: CodeFluidPoint | null, weight: number): void {
    if (!target || weight <= 0) {
      return;
    }

    const center = this.calculateCenter();
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
    const cappedDistance = Math.min(distance, this.getTargetRadius() * 5);
    const force = this.options.targetForce * weight * (cappedDistance / this.getTargetRadius());

    for (const node of this.nodes) {
      node.fx += (dx / distance) * force * node.mass;
      node.fy += (dy / distance) * force * node.mass;
    }
  }

  private applyTendrilForce(anchor: CodeFluidPoint | null, strength: number): void {
    if (!anchor || strength <= 0) {
      return;
    }

    const pullableCount = Math.max(3, Math.ceil(this.nodes.length * 0.35));
    const closest = this.nodes
      .map((node, index) => ({
        index,
        distance: squaredDistance(node, anchor),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, pullableCount);

    for (const item of closest) {
      const node = this.nodes[item.index];
      const dx = anchor.x - node.x;
      const dy = anchor.y - node.y;
      const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
      const falloff = 1 - closest.indexOf(item) / pullableCount;
      const force = this.options.tendrilForce * strength * (0.35 + falloff * 0.65);
      node.fx += (dx / distance) * force * node.mass;
      node.fy += (dy / distance) * force * node.mass;
    }

    const center = this.calculateCenter();
    const dx = anchor.x - center.x;
    const dy = anchor.y - center.y;
    const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
    const centerForce = this.options.tendrilForce * strength * 0.42;

    for (const node of this.nodes) {
      node.fx += (dx / distance) * centerForce * node.mass;
      node.fy += (dy / distance) * centerForce * node.mass;
    }
  }

  private applySpringForces(targetRadius: number): void {
    const count = this.nodes.length;
    const edgeRest = 2 * targetRadius * Math.sin(Math.PI / count);
    const bendRest = 2 * targetRadius * Math.sin((Math.PI * 2) / count);

    for (let index = 0; index < count; index += 1) {
      this.applyPairSpring(index, (index + 1) % count, edgeRest, this.options.springStiffness);
      this.applyPairSpring(index, (index + 2) % count, bendRest, this.options.bendStiffness);
    }
  }

  private applyPairSpring(aIndex: number, bIndex: number, restLength: number, stiffness: number): void {
    const a = this.nodes[aIndex];
    const b = this.nodes[bIndex];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
    const nx = dx / distance;
    const ny = dy / distance;
    const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    const force = ((distance - restLength) * stiffness + relativeVelocity * 2.7) * ((a.mass + b.mass) / 2);
    const fx = nx * force;
    const fy = ny * force;

    a.fx += fx;
    a.fy += fy;
    b.fx -= fx;
    b.fy -= fy;
  }

  private applyShapeForces(
    center: CodeFluidPoint,
    targetRadius: number,
    movement: CodeFluidPoint | null,
    traction: CodeFluidPoint | null,
  ): void {
    const count = this.nodes.length;
    const stretchAxis = traction
      ? normalizeVector(traction.x - center.x, traction.y - center.y)
      : movement;

    let netX = 0;
    let netY = 0;
    const forces: CodeFluidPoint[] = [];

    for (let index = 0; index < count; index += 1) {
      const node = this.nodes[index];
      const angle = (index / count) * TWO_PI;
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const stretch = stretchAxis ? 1 + Math.abs(ux * stretchAxis.x + uy * stretchAxis.y) * 0.18 : 1;
      const targetX = center.x + ux * targetRadius * stretch;
      const targetY = center.y + uy * targetRadius * stretch;
      const fx = (targetX - node.x) * this.options.shapeStiffness * node.mass;
      const fy = (targetY - node.y) * this.options.shapeStiffness * node.mass;

      forces.push({ x: fx, y: fy });
      netX += fx;
      netY += fy;
    }

    const correctionX = netX / count;
    const correctionY = netY / count;

    for (let index = 0; index < count; index += 1) {
      const node = this.nodes[index];
      const force = forces[index];
      node.fx += force.x - correctionX;
      node.fy += force.y - correctionY;
    }
  }

  private applyPressureForces(center: CodeFluidPoint, targetRadius: number): void {
    const targetArea = Math.PI * targetRadius * targetRadius;
    const currentArea = Math.max(Math.abs(getPolygonArea(this.nodes)), targetArea * 0.2);
    const pressure = clamp((targetArea - currentArea) / targetArea, -0.6, 0.6);

    if (Math.abs(pressure) < 0.002) {
      return;
    }

    let netX = 0;
    let netY = 0;
    const forces: CodeFluidPoint[] = [];

    for (const node of this.nodes) {
      const dx = node.x - center.x;
      const dy = node.y - center.y;
      const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
      const force = pressure * this.options.pressureStrength * node.mass;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      forces.push({ x: fx, y: fy });
      netX += fx;
      netY += fy;
    }

    const correctionX = netX / this.nodes.length;
    const correctionY = netY / this.nodes.length;

    for (let index = 0; index < this.nodes.length; index += 1) {
      const node = this.nodes[index];
      const force = forces[index];
      node.fx += force.x - correctionX;
      node.fy += force.y - correctionY;
    }
  }

  private projectArea(centerBeforeIntegration: CodeFluidPoint, targetRadius: number): void {
    const center = this.calculateCenter();
    const targetArea = Math.PI * targetRadius * targetRadius;
    const currentArea = Math.abs(getPolygonArea(this.nodes));

    if (currentArea <= MIN_DISTANCE) {
      this.reset(centerBeforeIntegration, this.totalMass);
      return;
    }

    const scale = clamp(Math.sqrt(targetArea / currentArea), 0.985, 1.015);
    const correction = 0.35;

    for (const node of this.nodes) {
      const dx = node.x - center.x;
      const dy = node.y - center.y;
      node.x = center.x + dx * (1 + (scale - 1) * correction);
      node.y = center.y + dy * (1 + (scale - 1) * correction);
    }
  }

  private constrainNodeToBounds(node: InternalNode, bounds: ResolvedBounds): void {
    const radius = node.radius;

    if (node.x < bounds.left + radius) {
      node.x = bounds.left + radius;
      node.vx = Math.abs(node.vx) * this.options.boundaryDamping;
    } else if (node.x > bounds.right - radius) {
      node.x = bounds.right - radius;
      node.vx = -Math.abs(node.vx) * this.options.boundaryDamping;
    }

    if (node.y < bounds.top + radius) {
      node.y = bounds.top + radius;
      node.vy = Math.abs(node.vy) * this.options.boundaryDamping;
    } else if (node.y > bounds.bottom - radius) {
      node.y = bounds.bottom - radius;
      node.vy = -Math.abs(node.vy) * this.options.boundaryDamping;
    }
  }

  private calculateCenter(): CodeFluidPoint {
    if (this.nodes.length === 0) {
      return { x: this.spawnCenter.x, y: this.spawnCenter.y };
    }

    let x = 0;
    let y = 0;
    let mass = 0;

    for (const node of this.nodes) {
      x += node.x * node.mass;
      y += node.y * node.mass;
      mass += node.mass;
    }

    return {
      x: x / mass,
      y: y / mass,
    };
  }

  private getTargetRadius(): number {
    return this.options.baseRadius * Math.sqrt(this.totalMass / this.options.mass);
  }

  private getTargetNodeCount(): number {
    const count = Math.round(this.options.nodeCount * Math.sqrt(this.totalMass / this.options.mass));
    return clampInt(count, this.options.minNodeCount, this.options.maxNodeCount);
  }

  private reconcileNodeCount(source?: CodeFluidPoint): void {
    const targetCount = this.getTargetNodeCount();

    while (this.nodes.length < targetCount) {
      this.insertNodeAtLongestEdge(source);
    }

    while (this.nodes.length > targetCount) {
      this.removeNodeAtShortestEdge();
    }

    this.syncNodeMassAndRadius();
  }

  private insertNodeAtLongestEdge(source?: CodeFluidPoint): void {
    let insertAfter = 0;
    let longestDistance = -Infinity;

    for (let index = 0; index < this.nodes.length; index += 1) {
      const next = (index + 1) % this.nodes.length;
      const distance = squaredDistance(this.nodes[index], this.nodes[next]);
      if (distance > longestDistance) {
        longestDistance = distance;
        insertAfter = index;
      }
    }

    const a = this.nodes[insertAfter];
    const b = this.nodes[(insertAfter + 1) % this.nodes.length];
    const center = this.calculateCenter();
    const x = source ? (a.x + b.x + source.x) / 3 : (a.x + b.x) / 2;
    const y = source ? (a.y + b.y + source.y) / 3 : (a.y + b.y) / 2;
    const outward = normalizeVector(x - center.x, y - center.y) ?? { x: 1, y: 0 };

    this.nodes.splice(insertAfter + 1, 0, {
      x: x + outward.x * 1.5,
      y: y + outward.y * 1.5,
      vx: (a.vx + b.vx) / 2,
      vy: (a.vy + b.vy) / 2,
      fx: 0,
      fy: 0,
      radius: a.radius,
      mass: a.mass,
      glyph: CODE_GLYPHS[this.nodes.length % CODE_GLYPHS.length],
      phase: 0,
    });
  }

  private removeNodeAtShortestEdge(): void {
    if (this.nodes.length <= this.options.minNodeCount) {
      return;
    }

    let removeIndex = 0;
    let shortestDistance = Infinity;

    for (let index = 0; index < this.nodes.length; index += 1) {
      const next = (index + 1) % this.nodes.length;
      const distance = squaredDistance(this.nodes[index], this.nodes[next]);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        removeIndex = next;
      }
    }

    this.nodes.splice(removeIndex, 1);
  }

  private syncNodeMassAndRadius(): void {
    const nodeMass = this.totalMass / this.nodes.length;
    const nodeRadius = clamp(this.getTargetRadius() * 0.13, 3.25, 9.5);
    const count = this.nodes.length;

    for (let index = 0; index < count; index += 1) {
      const node = this.nodes[index];
      node.mass = nodeMass;
      node.radius = nodeRadius;
      node.phase = index / count;
      node.glyph = CODE_GLYPHS[index % CODE_GLYPHS.length];
    }
  }

  private applyMassImpulse(origin: CodeFluidPoint | undefined, strength: number, direction: 1 | -1): void {
    if (!origin || strength <= 0) {
      return;
    }

    for (const node of this.nodes) {
      const dx = node.x - origin.x;
      const dy = node.y - origin.y;
      const distance = Math.max(Math.hypot(dx, dy), MIN_DISTANCE);
      const falloff = 1 / (1 + distance / Math.max(this.getTargetRadius(), 1));
      node.vx += (dx / distance) * strength * falloff * direction;
      node.vy += (dy / distance) * strength * falloff * direction;
    }
  }

  private relaxVolumeAfterMassChange(): void {
    const center = this.calculateCenter();
    const targetRadius = this.getTargetRadius();
    const currentArea = Math.abs(getPolygonArea(this.nodes));
    const targetArea = Math.PI * targetRadius * targetRadius;

    if (currentArea <= MIN_DISTANCE) {
      this.reset(center, this.totalMass);
      return;
    }

    const scale = Math.sqrt(targetArea / currentArea);
    const clampedScale = clamp(scale, 0.72, 1.28);

    for (const node of this.nodes) {
      node.x = center.x + (node.x - center.x) * clampedScale;
      node.y = center.y + (node.y - center.y) * clampedScale;
      node.vx *= 0.75;
      node.vy *= 0.75;
    }
  }

  private translateCenterTo(targetCenter: CodeFluidPoint): void {
    const center = this.calculateCenter();
    const dx = targetCenter.x - center.x;
    const dy = targetCenter.y - center.y;

    if (Math.abs(dx) < MIN_DISTANCE && Math.abs(dy) < MIN_DISTANCE) {
      return;
    }

    for (const node of this.nodes) {
      node.x += dx;
      node.y += dy;
    }
  }
}

function resolveOptions(options: CodeFluidBodyOptions): ResolvedOptions {
  const minNodeCount = Math.max(3, options.minNodeCount ?? DEFAULT_OPTIONS.minNodeCount);
  const maxNodeCount = Math.max(minNodeCount, options.maxNodeCount ?? DEFAULT_OPTIONS.maxNodeCount);
  const mass = Math.max(0.01, options.mass ?? DEFAULT_OPTIONS.mass);
  const minMass = Math.max(0.01, Math.min(options.minMass ?? DEFAULT_OPTIONS.minMass, mass));
  const maxMass = Math.max(options.maxMass ?? DEFAULT_OPTIONS.maxMass, mass);

  return {
    mass,
    minMass,
    maxMass,
    baseRadius: options.baseRadius ?? DEFAULT_OPTIONS.baseRadius,
    nodeCount: clampInt(options.nodeCount ?? DEFAULT_OPTIONS.nodeCount, minNodeCount, maxNodeCount),
    minNodeCount,
    maxNodeCount,
    moveForce: options.moveForce ?? DEFAULT_OPTIONS.moveForce,
    targetForce: options.targetForce ?? DEFAULT_OPTIONS.targetForce,
    tendrilForce: options.tendrilForce ?? DEFAULT_OPTIONS.tendrilForce,
    springStiffness: options.springStiffness ?? DEFAULT_OPTIONS.springStiffness,
    bendStiffness: options.bendStiffness ?? DEFAULT_OPTIONS.bendStiffness,
    shapeStiffness: options.shapeStiffness ?? DEFAULT_OPTIONS.shapeStiffness,
    pressureStrength: options.pressureStrength ?? DEFAULT_OPTIONS.pressureStrength,
    damping: options.damping ?? DEFAULT_OPTIONS.damping,
    boundaryDamping: options.boundaryDamping ?? DEFAULT_OPTIONS.boundaryDamping,
    maxSpeed: options.maxSpeed ?? DEFAULT_OPTIONS.maxSpeed,
  };
}

function resolveBounds(bounds: CodeFluidBounds): ResolvedBounds {
  const left = bounds.left ?? bounds.x ?? 0;
  const top = bounds.top ?? bounds.y ?? 0;
  const right = bounds.right ?? (bounds.width === undefined ? Number.POSITIVE_INFINITY : left + bounds.width);
  const bottom = bounds.bottom ?? (bounds.height === undefined ? Number.POSITIVE_INFINITY : top + bounds.height);

  return { left, top, right, bottom };
}

function normalizeDeltaTime(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) {
    return 0;
  }

  const seconds = dt > 1 ? dt / 1000 : dt;
  return Math.min(seconds, 0.08);
}

function normalizeOptional(point: Partial<CodeFluidPoint> | null | undefined): CodeFluidPoint | null {
  if (!point) {
    return null;
  }

  return normalizeVector(point.x ?? 0, point.y ?? 0);
}

function normalizeVector(x: number, y: number): CodeFluidPoint | null {
  const length = Math.hypot(x, y);
  if (length <= MIN_DISTANCE) {
    return null;
  }

  return {
    x: x / length,
    y: y / length,
  };
}

function getPolygonArea(nodes: readonly CodeFluidPoint[]): number {
  let area = 0;

  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    const next = nodes[(index + 1) % nodes.length];
    area += current.x * next.y - next.x * current.y;
  }

  return area / 2;
}

function squaredDistance(a: CodeFluidPoint, b: CodeFluidPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}
