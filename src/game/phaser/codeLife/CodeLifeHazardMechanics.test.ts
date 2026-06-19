import { describe, expect, it } from "vitest";
import { createCodeLifeHazardRuntime, isCodeLifeHazardTargetExposed } from "./CodeLifeHazardMechanics";

describe("CodeLife hazard mechanics", () => {
  it("makes camera optic burns directional instead of a constant circular hurtbox", () => {
    const runtime = createCodeLifeHazardRuntime("optic-burn", 600, 0);

    expect(runtime.damageActive).toBe(true);
    expect(runtime.alpha).toBeGreaterThan(0.7);
    expect(
      isCodeLifeHazardTargetExposed(
        "optic-burn",
        { x: 100, y: 100, width: 220, height: 140, angleDeg: 0 },
        { x: 260, y: 100 },
        600,
        0,
      ),
    ).toBe(true);
    expect(
      isCodeLifeHazardTargetExposed(
        "optic-burn",
        { x: 100, y: 100, width: 220, height: 140, angleDeg: 0 },
        { x: 100, y: 245 },
        600,
        0,
      ),
    ).toBe(false);
  });

  it("suppresses hazard exposure while a device has been hijacked", () => {
    expect(
      isCodeLifeHazardTargetExposed(
        "optic-burn",
        { x: 100, y: 100, width: 220, height: 140, angleDeg: 0, suppressed: true },
        { x: 260, y: 100 },
        600,
        0,
      ),
    ).toBe(false);
    expect(
      isCodeLifeHazardTargetExposed(
        "audio-feedback",
        { x: 0, y: 0, width: 160, height: 160, angleDeg: 0, suppressed: true },
        { x: 70, y: 0 },
        100,
        0,
      ),
    ).toBe(false);
  });

  it("lets authored camera cones use narrow FOVs and real blind spots", () => {
    expect(
      isCodeLifeHazardTargetExposed(
        "optic-burn",
        {
          x: 100,
          y: 100,
          width: 240,
          height: 140,
          angleDeg: 0,
          fovDeg: 30,
          blindSpotRects: [{ x: 150, y: 80, width: 100, height: 50 }],
        },
        { x: 180, y: 100 },
        600,
        0,
      ),
    ).toBe(false);
    expect(
      isCodeLifeHazardTargetExposed(
        "optic-burn",
        { x: 100, y: 100, width: 240, height: 140, angleDeg: 0, fovDeg: 30 },
        { x: 240, y: 190 },
        600,
        0,
      ),
    ).toBe(false);
    expect(
      isCodeLifeHazardTargetExposed(
        "optic-burn",
        { x: 100, y: 100, width: 240, height: 140, angleDeg: 0, fovDeg: 80 },
        { x: 240, y: 190 },
        600,
        0,
      ),
    ).toBe(true);
  });

  it("gives printer rollers a reversing conveyor force", () => {
    const forward = createCodeLifeHazardRuntime("printer-roller", 200, 0);
    const reverse = createCodeLifeHazardRuntime("printer-roller", 1200, 0);

    expect(forward.damageActive).toBe(true);
    expect(reverse.damageActive).toBe(true);
    expect(forward.conveyorForce).toBeGreaterThan(0);
    expect(reverse.conveyorForce).toBeLessThan(0);
  });

  it("turns speaker feedback into beat windows with safe gaps", () => {
    const beat = createCodeLifeHazardRuntime("audio-feedback", 100, 0);
    const gap = createCodeLifeHazardRuntime("audio-feedback", 500, 0);

    expect(beat.damageActive).toBe(true);
    expect(gap.damageActive).toBe(false);
    expect(beat.alpha).toBeGreaterThan(gap.alpha);
    expect(
      isCodeLifeHazardTargetExposed(
        "audio-feedback",
        { x: 0, y: 0, width: 160, height: 160, angleDeg: 0 },
        { x: 70, y: 0 },
        100,
        0,
      ),
    ).toBe(true);
    expect(
      isCodeLifeHazardTargetExposed(
        "audio-feedback",
        { x: 0, y: 0, width: 160, height: 160, angleDeg: 0 },
        { x: 70, y: 0 },
        500,
        0,
      ),
    ).toBe(false);
  });
});
