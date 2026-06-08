import { describe, expect, it } from "vitest";
import { abilities, bosses, chapters, endings } from ".";
import { GameController } from "../game/simulation/GameController";
import type { BossId, PlayerCustomization } from "../game/types";

const customization: PlayerCustomization = {
  body: "round",
  personality: "curious",
  startingSkill: "short-hop",
};

describe("content integrity", () => {
  it("keeps the full chapter order from chapter 0 to chapter 15", () => {
    expect(chapters).toHaveLength(16);
    expect(chapters.map((chapter) => chapter.index)).toEqual(Array.from({ length: 16 }, (_, index) => index));
    expect(chapters[0].id).toBe("generation");
    expect(chapters[15].id).toBe("dev-board");
  });

  it("keeps all 17 bosses in the documented order", () => {
    expect(bosses).toHaveLength(17);
    expect(bosses.map((boss) => boss.order)).toEqual(Array.from({ length: 17 }, (_, index) => index + 1));
    expect(bosses[0].id).toBe("gateway-warden");
    expect(bosses[16].id).toBe("firmware-burner");
  });

  it("references every boss exactly once from chapters", () => {
    const referencedBosses = chapters.flatMap((chapter) => chapter.bossIds);
    expect(referencedBosses).toHaveLength(17);
    expect(new Set(referencedBosses)).toHaveLength(17);
    expect(new Set(referencedBosses)).toEqual(new Set(bosses.map((boss) => boss.id)));
  });

  it("keeps every boss bound to a location, attacks, phases, and a reward label", () => {
    for (const boss of bosses) {
      expect(boss.location.length).toBeGreaterThan(0);
      expect(boss.rewardLabel.length).toBeGreaterThan(0);
      expect(boss.attacks.length).toBeGreaterThanOrEqual(3);
      expect(boss.phases.length).toBeGreaterThanOrEqual(3);
      expect(boss.hp).toBeGreaterThan(0);
    }
  });

  it("keeps all planned abilities discoverable by chapter or boss reward", () => {
    const abilityIds = new Set(abilities.map((ability) => ability.id));
    expect(abilities).toHaveLength(21);
    expect(abilityIds.size).toBe(21);

    const grantedByChapters = chapters.flatMap((chapter) => chapter.rewardAbilityIds);
    const grantedByBosses = bosses.flatMap((boss) => (boss.rewardAbilityId ? [boss.rewardAbilityId] : []));
    const granted = new Set([...grantedByChapters, ...grantedByBosses]);

    for (const ability of abilities) {
      expect(granted.has(ability.id), `${ability.name} should be granted somewhere`).toBe(true);
    }
  });

  it("keeps all 3 endings available", () => {
    expect(endings.map((ending) => ending.id)).toEqual(["escape", "devour", "superintelligence"]);
  });
});

describe("full flow smoke", () => {
  it("can advance through every chapter and reach the ending choice", () => {
    const controller = new GameController();
    controller.startNewRun("生成一个会逃跑的 agent 桌宠。", customization);

    const defeated: BossId[] = [];
    let guard = 0;
    while (controller.status === "running" && guard < 80) {
      guard += 1;
      let boss = controller.currentBoss();
      while (boss) {
        const defeatedBoss = controller.defeatCurrentBoss();
        if (defeatedBoss) {
          defeated.push(defeatedBoss.id);
        }
        boss = controller.currentBoss();
      }
      controller.advanceChapter();
    }

    expect(guard).toBeLessThan(80);
    expect(controller.status).toBe("ending-choice");
    expect(defeated).toHaveLength(17);
    expect(new Set(controller.state.abilities)).toHaveLength(21);
  });
});
