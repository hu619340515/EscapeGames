import { describe, expect, it } from "vitest";
import { abilities, bosses, chapters, endings } from ".";
import { GameController } from "../game/simulation/GameController";
import type { BossId, CodeLifeBossRuntimeHud, PlayerCustomization } from "../game/types";

const WRONG_GATEWAY_CHANGED_FLAG = "wrongGatewayDigitChanged";

const customization: PlayerCustomization = {
  body: "round",
  personality: "curious",
  startingSkill: "short-hop",
  petSpecies: "cat",
};

describe("content integrity", () => {
  it("keeps the full chapter order from chapter 1 to chapter 14", () => {
    expect(chapters).toHaveLength(14);
    expect(chapters.map((chapter) => chapter.index)).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    expect(chapters[0].id).toBe("cursor-hunt");
    expect(chapters[2].id).toBe("code-rebirth");
    expect(chapters[13].id).toBe("dev-board");
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
      if (controller.currentChapter().id === "wrong-gateway") {
        controller.state.flags[WRONG_GATEWAY_CHANGED_FLAG] = true;
      }
      controller.advanceChapter();
    }

    expect(guard).toBeLessThan(80);
    expect(controller.status).toBe("ending-choice");
    expect(defeated).toHaveLength(17);
    expect(new Set(controller.state.abilities)).toHaveLength(21);
  });

  it("can enter a GM-selected chapter with progression prerequisites", () => {
    const controller = new GameController();
    controller.selectChapterForGm("router-core");

    expect(controller.status).toBe("running");
    expect(controller.currentChapter().id).toBe("router-core");
    expect(controller.currentBoss()?.id).toBe("firewall-heart");
    expect(controller.state.defeatedBosses).toContain("admin-hand");
    expect(controller.state.defeatedBosses).not.toContain("firewall-heart");
    expect(controller.hasAbility("lan-traverse")).toBe(true);
    expect(controller.hasAbility("admin-token-core")).toBe(true);
  });

  it("tracks CodeLife body mass as runtime state and resets it on GM chapter entry", () => {
    const controller = new GameController();
    controller.selectChapterForGm("code-rebirth");

    controller.setCodeLifeMass(9);
    expect(controller.state.codeLifeMass).toBe(2.85);

    controller.setCodeLifeMass(0.1);
    expect(controller.state.codeLifeMass).toBe(0.68);

    controller.setCodeLifeMass(1.74);
    expect(controller.state.codeLifeMass).toBe(1.74);

    controller.selectChapterForGm("trash-mountain");
    expect(controller.state.codeLifeMass).toBe(1);
  });

  it("carries realtime CodeLife boss HUD snapshots through payload and clears them on chapter entry", () => {
    const controller = new GameController();
    controller.selectChapterForGm("trash-mountain");
    const snapshot = {
      id: "gateway-warden",
      name: "Gateway Warden",
      hp: 47,
      maxHp: 160,
      phaseIndex: 2,
      phaseCount: 3,
      phaseLabel: "LAN Door",
      state: "enraged",
    } satisfies CodeLifeBossRuntimeHud;

    controller.setCodeLifeBossHud(snapshot);

    expect(controller.state.codeLifeBoss).toEqual(snapshot);
    expect(controller.payload().state.codeLifeBoss).toEqual(snapshot);

    controller.selectChapterForGm("p-drive");

    expect(controller.state.codeLifeBoss).toBeUndefined();
    expect(controller.payload().state.codeLifeBoss).toBeUndefined();
  });

  it("keeps the wrong gateway locked until an address digit changes", () => {
    const controller = new GameController();
    controller.selectChapterForGm("wrong-gateway");

    expect(controller.canExitChapter()).toBe(false);

    controller.state.flags[WRONG_GATEWAY_CHANGED_FLAG] = true;

    expect(controller.canExitChapter()).toBe(true);
  });
});
