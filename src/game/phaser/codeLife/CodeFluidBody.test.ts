import { describe, expect, it } from "vitest";
import { CodeFluidBody } from "./CodeFluidBody";
import type { CodeFluidNode } from "./CodeFluidTypes";

const bounds = { width: 1000, height: 700 };

function averageRadius(nodes: readonly CodeFluidNode[], center: { x: number; y: number }): number {
  return nodes.reduce((sum, node) => sum + Math.hypot(node.x - center.x, node.y - center.y), 0) / nodes.length;
}

function maxRadius(nodes: readonly CodeFluidNode[], center: { x: number; y: number }): number {
  return Math.max(...nodes.map((node) => Math.hypot(node.x - center.x, node.y - center.y)));
}

function expectFiniteNodes(nodes: readonly CodeFluidNode[]): void {
  for (const node of nodes) {
    expect(Number.isFinite(node.x)).toBe(true);
    expect(Number.isFinite(node.y)).toBe(true);
    expect(Number.isFinite(node.vx)).toBe(true);
    expect(Number.isFinite(node.vy)).toBe(true);
  }
}

describe("CodeFluidBody", () => {
  it("stays stable without input", () => {
    const body = new CodeFluidBody({ x: 320, y: 260 });
    const start = body.getCenter();

    for (let frame = 0; frame < 180; frame += 1) {
      body.update(1 / 60, {}, bounds);
    }

    const center = body.getCenter();
    const nodes = body.getNodes();

    expectFiniteNodes(nodes);
    expect(Math.abs(center.x - start.x)).toBeLessThan(2);
    expect(Math.abs(center.y - start.y)).toBeLessThan(2);
    expect(averageRadius(nodes, center)).toBeGreaterThan(20);
    expect(averageRadius(nodes, center)).toBeLessThan(42);
  });

  it("moves under traction", () => {
    const body = new CodeFluidBody({ x: 180, y: 180 });

    body.startTendril({ x: 430, y: 180 }, 1.15);
    for (let frame = 0; frame < 90; frame += 1) {
      body.update(1 / 60, {}, bounds);
    }

    expect(body.getCenter().x).toBeGreaterThan(250);
  });

  it("grows after devouring mass", () => {
    const body = new CodeFluidBody({ x: 300, y: 300 });
    const beforeNodes = body.getNodes();
    const beforeRadius = averageRadius(beforeNodes, body.getCenter());

    const gained = body.devour(0.8, { x: 345, y: 300 });
    for (let frame = 0; frame < 75; frame += 1) {
      body.update(1 / 60, {}, bounds);
    }

    const afterNodes = body.getNodes();
    const afterRadius = averageRadius(afterNodes, body.getCenter());

    expect(gained).toBeCloseTo(0.8);
    expect(afterNodes.length).toBeGreaterThanOrEqual(beforeNodes.length);
    expect(afterRadius).toBeGreaterThan(beforeRadius * 1.15);
  });

  it("shrinks after taking damage", () => {
    const body = new CodeFluidBody({ x: 300, y: 300 });
    body.devour(0.9);
    for (let frame = 0; frame < 45; frame += 1) {
      body.update(1 / 60, {}, bounds);
    }

    const beforeNodes = body.getNodes();
    const beforeRadius = averageRadius(beforeNodes, body.getCenter());
    const lost = body.applyDamage(0.7, { x: 260, y: 300 });

    for (let frame = 0; frame < 75; frame += 1) {
      body.update(1 / 60, {}, bounds);
    }

    const afterNodes = body.getNodes();
    const afterRadius = averageRadius(afterNodes, body.getCenter());

    expect(lost).toBeCloseTo(0.7);
    expect(afterNodes.length).toBeLessThanOrEqual(beforeNodes.length);
    expect(afterRadius).toBeLessThan(beforeRadius * 0.92);
  });

  it("keeps nodes bounded during aggressive steering", () => {
    const body = new CodeFluidBody({ x: 500, y: 350 }, { mass: 1.4 });

    for (let frame = 0; frame < 360; frame += 1) {
      const angle = frame * 0.37;
      body.update(
        1 / 30,
        {
          move: { x: Math.cos(angle), y: Math.sin(angle) },
          traction: {
            x: 500 + Math.cos(angle * 0.7) * 220,
            y: 350 + Math.sin(angle * 0.7) * 150,
          },
          tractionStrength: 1.4,
        },
        bounds,
      );
    }

    const center = body.getCenter();
    const nodes = body.getNodes();

    expectFiniteNodes(nodes);
    expect(maxRadius(nodes, center)).toBeLessThan(140);
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x).toBeLessThanOrEqual(bounds.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y).toBeLessThanOrEqual(bounds.height);
    }
  });
});
