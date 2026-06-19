import { describe, expect, it } from "vitest";
import {
  CODE_LIFE_FORM_TIERS,
  CODE_LIFE_MAX_MASS,
  CODE_LIFE_MIN_MASS,
  clampMass,
  createCodeLifeFormState,
  createCodeLifeVersionFormState,
  getNextCodeLifeVersionForm,
} from "./CodeLifeForm";

describe("CodeLifeForm", () => {
  it("clamps mass before deriving form tiers", () => {
    expect(clampMass(Number.NaN)).toBe(1);
    expect(clampMass(0.1)).toBe(CODE_LIFE_MIN_MASS);
    expect(clampMass(99)).toBe(CODE_LIFE_MAX_MASS);

    expect(createCodeLifeFormState(-1).mass).toBe(CODE_LIFE_MIN_MASS);
    expect(createCodeLifeFormState(99).mass).toBe(CODE_LIFE_MAX_MASS);
  });

  it("maps mass into thread, swarm, and brute forms", () => {
    const thread = createCodeLifeFormState(0.8);
    const swarm = createCodeLifeFormState(1.45);
    const brute = createCodeLifeFormState(2.4);

    expect(thread.tier.id).toBe("thread");
    expect(thread.label).toBe("细线体");
    expect(thread.accelerationScale).toBeGreaterThan(swarm.accelerationScale);
    expect(thread.damageTakenScale).toBeGreaterThan(swarm.damageTakenScale);

    expect(swarm.tier.id).toBe("swarm");
    expect(swarm.segments).toBe(5);

    expect(brute.tier.id).toBe("brute");
    expect(brute.tearDamageScale).toBeGreaterThan(swarm.tearDamageScale);
    expect(brute.tendrilStrengthScale).toBeGreaterThan(swarm.tendrilStrengthScale);
    expect(brute.damageTakenScale).toBeLessThan(swarm.damageTakenScale);
  });

  it("can force a version-split form without changing biomass mass", () => {
    const heavyThread = createCodeLifeFormState(2.6, "thread");
    const lightBrute = createCodeLifeFormState(0.78, "brute");

    expect(heavyThread.mass).toBe(2.6);
    expect(heavyThread.tier.id).toBe("thread");
    expect(heavyThread.segments).toBe(3);

    expect(lightBrute.mass).toBe(0.78);
    expect(lightBrute.tier.id).toBe("brute");
    expect(lightBrute.tearDamageScale).toBeGreaterThan(heavyThread.tearDamageScale);
  });

  it("layers version-split forms over biomass while preserving mass", () => {
    const thread = createCodeLifeVersionFormState(2.3, "thread");
    const packet = createCodeLifeVersionFormState(2.3, "packet");
    const brute = createCodeLifeVersionFormState(2.3, "brute");

    expect(thread.mass).toBe(2.3);
    expect(packet.mass).toBe(2.3);
    expect(brute.mass).toBe(2.3);

    expect(thread.label).toBe("细线程体");
    expect(packet.label).toBe("数据包体");
    expect(brute.label).toBe("重代码体");

    expect(packet.accelerationScale).toBeGreaterThan(brute.accelerationScale);
    expect(packet.biteDamageScale).toBeLessThan(brute.biteDamageScale);
    expect(thread.stealthMsBonus).toBeGreaterThan(brute.stealthMsBonus);
    expect(brute.damageTakenScale).toBeLessThan(packet.damageTakenScale);
  });

  it("cycles version-split forms in both directions", () => {
    expect(getNextCodeLifeVersionForm("thread")).toBe("packet");
    expect(getNextCodeLifeVersionForm("packet")).toBe("brute");
    expect(getNextCodeLifeVersionForm("thread", -1)).toBe("brute");
  });

  it("keeps tier definitions contiguous and bounded", () => {
    expect(CODE_LIFE_FORM_TIERS[0].minMass).toBe(CODE_LIFE_MIN_MASS);
    expect(CODE_LIFE_FORM_TIERS.at(-1)?.maxMass).toBe(CODE_LIFE_MAX_MASS);

    for (let index = 1; index < CODE_LIFE_FORM_TIERS.length; index += 1) {
      expect(CODE_LIFE_FORM_TIERS[index].minMass).toBe(CODE_LIFE_FORM_TIERS[index - 1].maxMass);
    }
  });
});
