import { describe, expect, it } from "vitest";
import { createCodeLifeAmbienceMix } from "./CodeLifeAudioState";

describe("CodeLife audio state", () => {
  it("keeps exploration ambience quiet but chapter-specific", () => {
    const router = createCodeLifeAmbienceMix({
      chapterId: "router-core",
      mass: 1,
      integrity: 90,
      maxIntegrity: 100,
    });
    const hardware = createCodeLifeAmbienceMix({
      chapterId: "dev-board",
      mass: 1,
      integrity: 90,
      maxIntegrity: 100,
    });

    expect(router.mode).toBe("explore");
    expect(router.bossGain).toBe(0);
    expect(hardware.mode).toBe("explore");
    expect(hardware.harmonicRatios).toHaveLength(4);
    expect(router.baseFrequencyHz).not.toBe(hardware.baseFrequencyHz);
  });

  it("raises boss layer intensity through enraged and devour-window states", () => {
    const baseBoss = {
      id: "print-queue-beast",
      name: "Print Queue Beast",
      hp: 90,
      maxHp: 180,
      phaseIndex: 1,
      phaseCount: 3,
      phaseLabel: "Jam",
      state: "phase" as const,
      shieldRatio: 0.5,
      window: "closed" as const,
    };
    const boss = createCodeLifeAmbienceMix({
      chapterId: "printer-belly",
      mass: 1.6,
      integrity: 80,
      maxIntegrity: 100,
      boss: baseBoss,
    });
    const enraged = createCodeLifeAmbienceMix({
      chapterId: "printer-belly",
      mass: 1.6,
      integrity: 80,
      maxIntegrity: 100,
      boss: { ...baseBoss, state: "enraged" as const },
    });
    const devour = createCodeLifeAmbienceMix({
      chapterId: "printer-belly",
      mass: 1.6,
      integrity: 80,
      maxIntegrity: 100,
      boss: { ...baseBoss, state: "enraged" as const, window: "devour" as const },
    });

    expect(boss.mode).toBe("boss");
    expect(enraged.mode).toBe("enraged");
    expect(devour.mode).toBe("devour-window");
    expect(enraged.bossGain).toBeGreaterThan(boss.bossGain);
    expect(devour.bossGain).toBeGreaterThan(enraged.bossGain);
    expect(devour.filterFrequencyHz).toBeGreaterThan(boss.filterFrequencyHz);
    expect(devour.pulseRateHz).toBeGreaterThan(enraged.pulseRateHz);
  });

  it("responds to damaged integrity and body mass", () => {
    const stable = createCodeLifeAmbienceMix({
      chapterId: "nas-graveyard",
      mass: 0.8,
      integrity: 100,
      maxIntegrity: 100,
    });
    const pressured = createCodeLifeAmbienceMix({
      chapterId: "nas-graveyard",
      mass: 2.5,
      integrity: 25,
      maxIntegrity: 100,
    });

    expect(pressured.masterGain).toBeGreaterThan(stable.masterGain);
    expect(pressured.filterFrequencyHz).toBeGreaterThan(stable.filterFrequencyHz);
    expect(pressured.baseFrequencyHz).toBeGreaterThan(stable.baseFrequencyHz);
  });
});
