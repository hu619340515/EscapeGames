import { describe, expect, it } from "vitest";
import { bosses } from "../../../data/bosses";
import {
  applyBite,
  applyGrab,
  applyHazard,
  applySlam,
  createEnemyState,
  isDevourable,
  updateEnemy,
  type CodeLifeEnemyState,
} from "./CodeLifeCombat";

function bossRuntime(state: CodeLifeEnemyState): NonNullable<CodeLifeEnemyState["boss"]> {
  expect(state.boss).toBeDefined();
  return state.boss!;
}

function breakBossArmor(state: CodeLifeEnemyState): CodeLifeEnemyState {
  return applySlam(state, { force: 240, damage: 120 });
}

describe("CodeLife minion combat", () => {
  it("supports grab, drag, slam stun, then devour", () => {
    let enemy = createEnemyState({ id: "scanner-minion", hp: 30, slamStunForce: 70, biteDamage: 8 }, { x: 10, y: 10 });

    enemy = applyGrab(enemy, { grabbedBy: "tendril" });
    expect(enemy.status).toBe("grabbed");
    expect(enemy.intent.canBeDragged).toBe(true);
    expect(enemy.grab?.grabbedBy).toBe("tendril");

    enemy = updateEnemy(enemy, { x: 32, y: 18 }, 16);
    expect(enemy.center).toEqual({ x: 32, y: 18 });
    expect(enemy.intent.dragTo).toEqual({ x: 32, y: 18 });

    enemy = applySlam(enemy, { force: 100, damage: 22 });
    expect(enemy.status).toBe("stunned");
    expect(enemy.hp).toBe(8);
    expect(isDevourable(enemy)).toBe(true);

    enemy = applyBite(enemy);
    expect(enemy.status).toBe("devoured");
    expect(enemy.hp).toBe(0);
  });

  it("devours minions only through the bite path when stunned or weak enough", () => {
    const enemy = createEnemyState({ id: "scanner-minion", hp: 40, devourHealthRatio: 0.25, slamStunForce: 120 });

    const weak = applySlam(enemy, { force: 20, damage: 30 });
    expect(weak.hp).toBe(10);
    expect(weak.status).not.toBe("stunned");
    expect(isDevourable(weak)).toBe(true);

    const bittenWithoutConsume = applyBite(weak, { damage: 1, consumeWhenPossible: false });
    expect(bittenWithoutConsume.status).not.toBe("devoured");
    expect(bittenWithoutConsume.hp).toBe(9);

    const consumedWeak = applyBite(weak);
    expect(consumedWeak.status).toBe("devoured");
    expect(consumedWeak.hp).toBe(0);

    const stunned = applySlam(enemy, { force: 140, damage: 1 });
    expect(stunned.hp).toBe(39);
    expect(stunned.status).toBe("stunned");
    expect(isDevourable(stunned)).toBe(true);

    const consumedStun = applyBite(stunned);
    expect(consumedStun.status).toBe("devoured");
    expect(consumedStun.hp).toBe(0);
  });
});

describe("CodeLife boss combat", () => {
  it("keeps closed-window armor as the boss damage and grab gate", () => {
    const boss = createEnemyState(bosses[0]);

    expect(bossRuntime(boss)).toMatchObject({
      armor: 29,
      maxArmor: 29,
      window: "closed",
      windowRemaining: 0,
    });

    const blockedGrab = applyGrab(boss);
    expect(blockedGrab.status).toBe("alert");
    expect(blockedGrab.lastEvent).toBe("grab-blocked");
    expect(blockedGrab.hp).toBe(160);
    expect(bossRuntime(blockedGrab).armor).toBe(29);

    const chipped = applyBite(boss, { damage: 10, consumeWhenPossible: false });
    expect(chipped.hp).toBe(160);
    expect(chipped.lastEvent).toBe("alerted");
    expect(bossRuntime(chipped)).toMatchObject({
      armor: 22,
      maxArmor: 29,
      window: "closed",
    });

    const broken = applySlam(chipped, { force: 240, damage: 22 });
    expect(broken.status).toBe("stunned");
    expect(broken.stunRemaining).toBeGreaterThan(0);
    expect(broken.lastEvent).toBe("armor-broken");
    expect(bossRuntime(broken)).toMatchObject({
      armor: 0,
      maxArmor: 29,
      window: "damage",
      windowRemaining: 2.6,
    });
  });

  it("uses BossDef phases and advances when a damage window crosses a threshold", () => {
    const bossDef = bosses[0];
    let boss = createEnemyState(bossDef);

    expect(boss.kind).toBe("boss");
    expect(boss.boss?.phaseIndex).toBe(0);
    expect(boss.boss?.phaseName).toBe(bossDef.phases[0]);
    expect(boss.boss?.window).toBe("closed");
    expect(boss.boss?.armor).toBeGreaterThan(0);

    boss = breakBossArmor(boss);
    expect(boss.boss?.window).toBe("damage");
    expect(boss.status).toBe("stunned");

    boss = applyBite(boss, { damage: 60 });
    expect(boss.hp).toBe(100);
    expect(boss.boss?.phaseIndex).toBe(1);
    expect(boss.boss?.phaseName).toBe(bossDef.phases[1]);
    expect(boss.boss?.window).toBe("closed");
    expect(boss.boss?.armor).toBe(boss.boss?.maxArmor);
    expect(boss.boss?.maxArmor).toBe(35);
    expect(boss.boss?.lastPhaseAdvance).toBe(1);
    expect(boss.intent.shouldDetachGrab).toBe(true);
  });

  it("requires the final boss devour window before consumption", () => {
    let boss = createEnemyState(bosses[0]);

    boss = breakBossArmor(boss);
    boss = applyBite(boss, { damage: 60 });
    boss = breakBossArmor(boss);
    boss = applyBite(boss, { damage: 60 });

    expect(boss.boss?.phaseIndex).toBe(2);
    expect(boss.hp).toBe(40);
    expect(boss.boss?.window).toBe("closed");
    expect(isDevourable(boss)).toBe(false);

    boss = breakBossArmor(boss);
    boss = applyBite(boss, { damage: 20 });

    expect(boss.hp).toBe(20);
    expect(boss.boss?.window).toBe("devour");
    expect(isDevourable(boss)).toBe(true);

    const escapedWindow = updateEnemy(boss, boss.center, 3000);
    expect(escapedWindow.boss?.window).toBe("closed");
    expect(escapedWindow.boss?.armor).toBe(escapedWindow.boss?.maxArmor);
    expect(escapedWindow.status).toBe("alert");
    expect(escapedWindow.intent.shouldDetachGrab).toBe(true);
    expect(isDevourable(escapedWindow)).toBe(false);

    boss = applyBite(boss);
    expect(boss.status).toBe("devoured");
    expect(boss.hp).toBe(0);
  });
});

describe("CodeLife hazards", () => {
  it("kills a vulnerable enemy as dead instead of devoured", () => {
    const enemy = createEnemyState({ id: "quarantine-drone", hp: 18 });
    const killed = applyHazard(enemy, { damage: 99 });

    expect(killed.status).toBe("dead");
    expect(killed.hp).toBe(0);
    expect(isDevourable(killed)).toBe(false);
  });
});
