import { describe, expect, it } from "vitest";
import { resolveCodeLifeBossAttackPattern } from "./CodeLifeBossAttackPattern";

describe("CodeLife boss attack patterns", () => {
  it("changes device boss specials by phase", () => {
    expect(
      resolveCodeLifeBossAttackPattern({
        bossId: "print-queue-beast",
        phaseIndex: 0,
        phaseCount: 3,
        healthRatio: 0.9,
      }).style,
    ).toBe("sweep");

    expect(
      resolveCodeLifeBossAttackPattern({
        bossId: "print-queue-beast",
        phaseIndex: 1,
        phaseCount: 3,
        healthRatio: 0.62,
      }).style,
    ).toBe("projectile");

    expect(
      resolveCodeLifeBossAttackPattern({
        bossId: "print-queue-beast",
        phaseIndex: 2,
        phaseCount: 3,
        healthRatio: 0.3,
      }),
    ).toMatchObject({
      style: "pulse",
      telegraphColor: 0xf7f0d0,
    });
  });

  it("enrages low-health patterns without going below the floor", () => {
    const healthy = resolveCodeLifeBossAttackPattern({
      bossId: "firmware-burner",
      phaseIndex: 1,
      phaseCount: 3,
      healthRatio: 0.9,
    });
    const enraged = resolveCodeLifeBossAttackPattern({
      bossId: "firmware-burner",
      phaseIndex: 1,
      phaseCount: 3,
      healthRatio: 0.2,
    });

    expect(enraged.cooldownMs).toBeLessThan(healthy.cooldownMs);
    expect(enraged.cooldownMs).toBeGreaterThanOrEqual(1250);
    expect(enraged.damageScale).toBeGreaterThan(healthy.damageScale);
  });

  it("falls back for older bosses while preserving readable styles", () => {
    expect(
      resolveCodeLifeBossAttackPattern({
        bossId: "uac-eye",
        phaseIndex: 0,
        phaseCount: 3,
      }).style,
    ).toBe("pulse");

    expect(
      resolveCodeLifeBossAttackPattern({
        bossId: "search-index-spider",
        phaseIndex: 0,
        phaseCount: 3,
      }).style,
    ).toBe("sweep");

    expect(
      resolveCodeLifeBossAttackPattern({
        bossId: "duplicate-copy",
        phaseIndex: 4,
        phaseCount: 3,
      }).style,
    ).toBe("projectile");
  });
});
