import { describe, expect, it } from "vitest";
import {
  computeCodeLifeCarrionLocomotion,
  getClosestPointOnRectangleBoundary,
  type CodeLifeCarrionBodyNode,
  type CodeLifeCarrionBodySnapshot,
  type CodeLifeCarrionGripSurface,
  type CodeLifeCarrionPoint,
} from "./CodeLifeCarrionLocomotion";

function makeNodes(center: CodeLifeCarrionPoint, radius = 34, count = 12): CodeLifeCarrionBodyNode[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2;

    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
      radius: 5,
      mass: 1 / count,
    };
  });
}

function makeBody(
  overrides: Partial<CodeLifeCarrionBodySnapshot> = {},
): CodeLifeCarrionBodySnapshot {
  const center = overrides.center ?? { x: 100, y: 100 };

  return {
    nodes: overrides.nodes ?? makeNodes(center),
    center,
    velocity: overrides.velocity ?? { x: 0, y: 0 },
    mass: overrides.mass ?? 1,
  };
}

function speed(vector: CodeLifeCarrionPoint): number {
  return Math.hypot(vector.x, vector.y);
}

describe("CodeLifeCarrionLocomotion", () => {
  it("finds the nearest rectangle boundary point", () => {
    const rect = { x: 100, y: 80, width: 120, height: 70 };

    expect(getClosestPointOnRectangleBoundary({ x: 40, y: 110 }, rect)).toEqual({ x: 100, y: 110 });
    expect(getClosestPointOnRectangleBoundary({ x: 160, y: 40 }, rect)).toEqual({ x: 160, y: 80 });
    expect(getClosestPointOnRectangleBoundary({ x: 70, y: 180 }, rect)).toEqual({ x: 100, y: 150 });
  });

  it("pulls toward the pointer through left-button traction", () => {
    const result = computeCodeLifeCarrionLocomotion({
      body: makeBody(),
      pointerTarget: { x: 390, y: 100 },
      isPrimaryDown: true,
      gripSurfaces: [{ id: "front-wall", x: 250, y: 35, width: 42, height: 135 }],
      dtMs: 16,
    });

    expect(result.hasGrip).toBe(true);
    expect(result.nextVelocity.x).toBeGreaterThan(20);
    expect(Math.abs(result.nextVelocity.y)).toBeLessThan(20);
    expect(result.tractionStrength).toBeGreaterThan(0.2);
    expect(result.leadingDirection.x).toBeGreaterThan(0.99);
    expect(result.locomotionTendrils.length).toBeGreaterThan(0);
  });

  it("decays quickly when the left button is released", () => {
    const result = computeCodeLifeCarrionLocomotion({
      body: makeBody({ velocity: { x: 320, y: -140 } }),
      pointerTarget: { x: 390, y: 100 },
      isPrimaryDown: false,
      gripSurfaces: [{ x: 250, y: 35, width: 42, height: 135 }],
      dtMs: 120,
    });

    expect(result.hasGrip).toBe(false);
    expect(result.tractionStrength).toBe(0);
    expect(speed(result.nextVelocity)).toBeLessThan(120);
    expect(result.locomotionTendrils).toHaveLength(0);
  });

  it("does not sustain upward flight when no surface can be grabbed", () => {
    let velocity: CodeLifeCarrionPoint = { x: 0, y: 0 };

    for (let frame = 0; frame < 120; frame += 1) {
      const result = computeCodeLifeCarrionLocomotion({
        body: makeBody({ velocity }),
        pointerTarget: { x: 100, y: -260 },
        isPrimaryDown: true,
        gripSurfaces: [],
        dtMs: 16,
      });
      velocity = result.nextVelocity;
    }

    expect(velocity.y).toBeLessThan(0);
    expect(Math.abs(velocity.y)).toBeLessThan(18);
    expect(speed(velocity)).toBeLessThan(20);
  });

  it("can produce multiple locomotion tendrils but never more than six", () => {
    const result = computeCodeLifeCarrionLocomotion({
      body: makeBody({ nodes: makeNodes({ x: 100, y: 100 }, 40, 18) }),
      pointerTarget: { x: 395, y: 120 },
      isPrimaryDown: true,
      gripSurfaces: [{ id: "wide-panel", x: 255, y: 20, width: 60, height: 190 }],
      dtMs: 16,
    });

    expect(result.locomotionTendrils.length).toBeGreaterThanOrEqual(3);
    expect(result.locomotionTendrils.length).toBeLessThanOrEqual(6);
    expect(new Set(result.locomotionTendrils.map((tendril) => `${tendril.target.x}:${tendril.target.y}`)).size).toBeGreaterThan(1);
  });

  it("makes heavier bodies slower but gives them stronger traction", () => {
    const gripSurfaces: CodeLifeCarrionGripSurface[] = [{ x: 255, y: 25, width: 55, height: 155 }];
    const light = computeCodeLifeCarrionLocomotion({
      body: makeBody({ mass: 1 }),
      pointerTarget: { x: 390, y: 100 },
      isPrimaryDown: true,
      gripSurfaces,
      dtMs: 16,
    });
    const heavy = computeCodeLifeCarrionLocomotion({
      body: makeBody({ mass: 4 }),
      pointerTarget: { x: 390, y: 100 },
      isPrimaryDown: true,
      gripSurfaces,
      dtMs: 16,
    });

    expect(heavy.tractionStrength).toBeGreaterThan(light.tractionStrength);
    expect(speed(heavy.nextVelocity)).toBeLessThan(speed(light.nextVelocity));
  });

  it("does not return rectangle centers as grip points", () => {
    const rect = { x: 260, y: 60, width: 80, height: 80 };
    const rectCenter = { x: 300, y: 100 };
    const boundaryPoint = getClosestPointOnRectangleBoundary(rectCenter, rect);

    expect(boundaryPoint).not.toEqual(rectCenter);

    const result = computeCodeLifeCarrionLocomotion({
      body: makeBody(),
      pointerTarget: { x: 390, y: 100 },
      isPrimaryDown: true,
      gripSurfaces: [rect],
      dtMs: 16,
    });

    for (const tendril of result.locomotionTendrils) {
      expect(tendril.target).not.toEqual(rectCenter);
    }
  });
});
