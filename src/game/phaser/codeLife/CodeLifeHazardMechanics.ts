import type { CodeLifeHazardKind } from "./CodeLifeChapterConfig";

export interface CodeLifeHazardRuntime {
  readonly damageActive: boolean;
  readonly alpha: number;
  readonly angularVelocityDeg: number;
  readonly conveyorForce: number;
  readonly pulseScale: number;
}

export interface CodeLifeHazardZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly angleDeg: number;
  readonly fovDeg?: number;
  readonly blindSpotRects?: readonly CodeLifeHazardRect[];
  readonly suppressed?: boolean;
}

export interface CodeLifeHazardTarget {
  readonly x: number;
  readonly y: number;
}

export interface CodeLifeHazardRect extends CodeLifeHazardTarget {
  readonly width: number;
  readonly height: number;
}

const TWO_PI = Math.PI * 2;

export function createCodeLifeHazardRuntime(
  kind: CodeLifeHazardKind | undefined,
  timeMs: number,
  seed = 0,
): CodeLifeHazardRuntime {
  const phase = normalizedPhase(timeMs, getHazardCycleMs(kind), seed);

  if (kind === "optic-burn") {
    const sweep = Math.sin(phase * TWO_PI);
    return {
      damageActive: phase > 0.14 && phase < 0.68,
      alpha: phase > 0.14 && phase < 0.68 ? 0.84 : 0.26,
      angularVelocityDeg: 0.62 + sweep * 0.34,
      conveyorForce: 0,
      pulseScale: 1 + Math.max(0, sweep) * 0.18,
    };
  }

  if (kind === "printer-roller") {
    const direction = phase < 0.5 ? 1 : -1;
    return {
      damageActive: true,
      alpha: 0.76 + Math.abs(phase - 0.5) * 0.28,
      angularVelocityDeg: direction * 6.2,
      conveyorForce: direction * 235,
      pulseScale: 1,
    };
  }

  if (kind === "audio-feedback") {
    const beatActive = phase < 0.32;
    return {
      damageActive: beatActive,
      alpha: beatActive ? 0.94 : 0.22,
      angularVelocityDeg: beatActive ? 5.5 : 0.8,
      conveyorForce: 0,
      pulseScale: beatActive ? 1.22 : 0.9,
    };
  }

  if (kind === "firmware-flash") {
    const flash = phase < 0.42;
    return {
      damageActive: flash,
      alpha: flash ? 0.9 : 0.34,
      angularVelocityDeg: flash ? 4.4 : 1.4,
      conveyorForce: 0,
      pulseScale: flash ? 1.15 : 0.96,
    };
  }

  return {
    damageActive: true,
    alpha: kind === "sync-storm" ? 0.88 : 0.78,
    angularVelocityDeg: kind === "sync-storm" ? 3.6 : 2.2,
    conveyorForce: 0,
    pulseScale: 1,
  };
}

export function isCodeLifeHazardTargetExposed(
  kind: CodeLifeHazardKind | undefined,
  zone: CodeLifeHazardZone,
  target: CodeLifeHazardTarget,
  timeMs: number,
  seed = 0,
): boolean {
  if (zone.suppressed) {
    return false;
  }

  const runtime = createCodeLifeHazardRuntime(kind, timeMs, seed);
  if (!runtime.damageActive) {
    return false;
  }

  if (kind === "optic-burn") {
    if (zone.blindSpotRects?.some((rect) => rectContainsPoint(rect, target))) {
      return false;
    }

    const distance = distanceBetween(zone, target);
    const maxDistance = Math.max(zone.width, zone.height) * 1.24;
    if (distance > maxDistance) {
      return false;
    }

    const targetAngle = Math.atan2(target.y - zone.y, target.x - zone.x);
    const hazardAngle = degreesToRadians(zone.angleDeg);
    const halfFov = degreesToRadians(zone.fovDeg ?? 66) / 2;
    return Math.abs(shortestAngleDistance(targetAngle, hazardAngle)) <= halfFov;
  }

  const radiusScale = kind === "audio-feedback" ? 0.72 : kind === "printer-roller" ? 0.52 : 0.46;
  return distanceBetween(zone, target) < Math.max(zone.width, zone.height) * radiusScale * runtime.pulseScale;
}

function getHazardCycleMs(kind: CodeLifeHazardKind | undefined): number {
  if (kind === "optic-burn") {
    return 2600;
  }
  if (kind === "audio-feedback") {
    return 920;
  }
  if (kind === "printer-roller") {
    return 1900;
  }
  if (kind === "firmware-flash") {
    return 1500;
  }
  return 1000;
}

function normalizedPhase(timeMs: number, cycleMs: number, seed: number): number {
  const value = (timeMs + seed) % cycleMs;
  return value < 0 ? (value + cycleMs) / cycleMs : value / cycleMs;
}

function distanceBetween(a: CodeLifeHazardTarget, b: CodeLifeHazardTarget): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rectContainsPoint(rect: CodeLifeHazardRect, point: CodeLifeHazardTarget): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function degreesToRadians(degrees: number): number {
  return (degrees / 180) * Math.PI;
}

function shortestAngleDistance(a: number, b: number): number {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}
