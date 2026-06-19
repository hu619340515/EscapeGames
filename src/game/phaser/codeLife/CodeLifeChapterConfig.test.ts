import { describe, expect, it } from "vitest";
import {
  CODE_LIFE_CHAPTER_IDS,
  getCodeLifeAbilityGateBlocker,
  getCodeLifeChapterConfig,
  type CodeLifeChapterConfig,
  type CodeLifePoint,
  type CodeLifeRect,
} from "./CodeLifeChapterConfig";
import { getCodeLifeDeviceWeaknesses } from "./CodeLifeDeviceBossMechanics";
import { abilities, bosses, chapters } from "../../../data";
import type { AbilityId, ChapterId } from "../../types";

const expectedChapterIds = [
  "permanent-delete",
  "code-rebirth",
  "trash-mountain",
  "p-drive",
  "leder-d-drive",
  "c-wall",
  "leder-c-drive",
  "router-core",
  "nas-graveyard",
  "camera-eye",
  "printer-belly",
  "speaker-voiceprint",
  "dev-board",
] as const satisfies readonly ChapterId[];

const codeLifeChapterConfigs: CodeLifeChapterConfig[] = CODE_LIFE_CHAPTER_IDS.map((chapterId) =>
  getCodeLifeChapterConfig(chapterId),
);
const knownAbilityIds = new Set<AbilityId>(abilities.map((ability) => ability.id));
const bossRewardAbilityById = new Map(bosses.map((boss) => [boss.id, boss.rewardAbilityId]));
const bossWeaknessRequiredChapters = new Set<ChapterId>([
  "trash-mountain",
  "router-core",
  "nas-graveyard",
  "camera-eye",
  "printer-belly",
  "speaker-voiceprint",
  "dev-board",
]);

function expectPointInBounds(config: CodeLifeChapterConfig, point: CodeLifePoint, label: string): void {
  expect(point.x, `${config.chapterId} ${label} x`).toBeGreaterThanOrEqual(0);
  expect(point.x, `${config.chapterId} ${label} x`).toBeLessThanOrEqual(config.world.width);
  expect(point.y, `${config.chapterId} ${label} y`).toBeGreaterThanOrEqual(0);
  expect(point.y, `${config.chapterId} ${label} y`).toBeLessThanOrEqual(config.world.height);
}

function expectRectInBounds(config: CodeLifeChapterConfig, rect: CodeLifeRect, label: string): void {
  expectPointInBounds(config, rect, label);
  expect(rect.width, `${config.chapterId} ${label} width`).toBeGreaterThan(0);
  expect(rect.height, `${config.chapterId} ${label} height`).toBeGreaterThan(0);
  expect(rect.x + rect.width, `${config.chapterId} ${label} right`).toBeLessThanOrEqual(config.world.width);
  expect(rect.y + rect.height, `${config.chapterId} ${label} bottom`).toBeLessThanOrEqual(config.world.height);
}

function rectContainsPoint(rect: CodeLifeRect, point: CodeLifePoint): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

function rectsOverlap(first: CodeLifeRect, second: CodeLifeRect): boolean {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function collectGateAbilities(config: CodeLifeChapterConfig): AbilityId[] {
  return [
    config.exit.gate,
    ...config.vents.map((vent) => vent.gate),
    ...config.fileShells.map((shell) => shell.gate),
    ...config.biomassCaches.map((cache) => cache.gate),
    ...config.abilityGates.map((gate) => gate.ability),
  ].filter((abilityId): abilityId is AbilityId => Boolean(abilityId));
}

function collectReachableAbilitiesThroughChapter(chapterIndex: number): Set<AbilityId> {
  const reachable = new Set<AbilityId>();

  for (const chapter of chapters.filter((candidate) => candidate.index <= chapterIndex)) {
    for (const abilityId of chapter.rewardAbilityIds) {
      reachable.add(abilityId);
    }
    for (const bossId of chapter.bossIds) {
      const rewardAbilityId = bossRewardAbilityById.get(bossId);
      if (rewardAbilityId) {
        reachable.add(rewardAbilityId);
      }
    }
  }

  return reachable;
}

function normalizePassageTargetLabel(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function tokenizePassageTarget(label: string): string[] {
  return normalizePassageTargetLabel(label)
    .split(" ")
    .filter((word) => word.length >= 2);
}

function passageTargetExists(config: CodeLifeChapterConfig, target: string): boolean {
  const normalizedTarget = normalizePassageTargetLabel(target);
  const candidates = [...config.gripSurfaces, ...config.vents, ...config.fileShells, config.exit];
  if (candidates.some((candidate) => {
    const normalizedLabel = normalizePassageTargetLabel(candidate.label);
    return (
      normalizedLabel === normalizedTarget ||
      normalizedLabel.includes(normalizedTarget) ||
      normalizedTarget.includes(normalizedLabel)
    );
  })) {
    return true;
  }

  const targetWords = tokenizePassageTarget(target);
  const scores = candidates.map((candidate) => {
    const candidateWords = tokenizePassageTarget(candidate.label);
    return targetWords.filter((word) => candidateWords.some((candidateWord) => candidateWord === word || candidateWord.startsWith(word) || word.startsWith(candidateWord))).length;
  });
  const bestScore = Math.max(...scores);
  const bestCount = scores.filter((score) => score === bestScore).length;
  return bestScore >= 2 || (bestScore === 1 && bestCount === 1);
}

describe("CodeLife chapter config", () => {
  it("covers chapter 3 through chapter 15 in order", () => {
    expect(CODE_LIFE_CHAPTER_IDS).toEqual(expectedChapterIds);
    expect(codeLifeChapterConfigs.map((config) => config.chapterId)).toEqual(expectedChapterIds);
  });

  it("gives every CodeLife chapter a playable route core", () => {
    for (const config of codeLifeChapterConfigs) {
      expect(config.world.width, `${config.chapterId} world width`).toBeGreaterThan(0);
      expect(config.world.height, `${config.chapterId} world height`).toBeGreaterThan(0);
      expect(config.spawn, `${config.chapterId} spawn`).toBeDefined();
      expect(config.exit, `${config.chapterId} exit`).toBeDefined();
      expect(config.gripSurfaces.length, `${config.chapterId} grip surfaces`).toBeGreaterThan(0);
      expect(config.biomassCaches.length, `${config.chapterId} biomass caches`).toBeGreaterThan(0);
    }
  });

  it("includes Carrion-style traversal affordances beyond jump platforms", () => {
    for (const config of codeLifeChapterConfigs) {
      expect(config.vents.length, `${config.chapterId} vents`).toBeGreaterThan(0);
      expect(config.fileShells.length, `${config.chapterId} file shells`).toBeGreaterThan(0);
      expect(config.abilityGates.length, `${config.chapterId} ability gates`).toBeGreaterThan(0);
    }
  });

  it("adds boss arenas for every boss chapter", () => {
    for (const config of codeLifeChapterConfigs) {
      const chapter = chapters.find((candidate) => candidate.id === config.chapterId);
      expect(chapter?.bossIds, `${config.chapterId} chapter boss ids`).toEqual(config.bossIds);

      if (config.bossIds.length === 0) {
        expect(config.bossArena, `${config.chapterId} should not need a boss arena`).toBeUndefined();
        continue;
      }

      expect(config.bossArena, `${config.chapterId} boss arena`).toBeDefined();
      expect(config.bossArena?.bosses).toEqual(config.bossIds);
      expect(config.bossArena?.anchorPoints.length, `${config.chapterId} boss anchors`).toBeGreaterThan(0);
      if (config.bossArena?.lockUntilDefeated) {
        expect(config.bossArena.hint.trim().length, `${config.chapterId} boss arena hint`).toBeGreaterThan(0);
      }
      expect(rectContainsPoint(config.bossArena!, config.spawn), `${config.chapterId} boss arena contains spawn`).toBe(false);
      for (const [index, anchorPoint] of config.bossArena!.anchorPoints.entries()) {
        expect(rectContainsPoint(config.bossArena!, anchorPoint), `${config.chapterId} boss arena anchor ${index}`).toBe(true);
      }
    }
  });

  it("only references known and reachable ability gates", () => {
    for (const config of codeLifeChapterConfigs) {
      const chapter = chapters.find((candidate) => candidate.id === config.chapterId);
      expect(chapter, `${config.chapterId} content chapter`).toBeDefined();
      if (!chapter) {
        continue;
      }

      const reachable = collectReachableAbilitiesThroughChapter(chapter.index);
      for (const abilityId of collectGateAbilities(config)) {
        expect(knownAbilityIds.has(abilityId), `${config.chapterId} known ability ${abilityId}`).toBe(true);
        expect(reachable.has(abilityId), `${config.chapterId} reachable gate ${abilityId}`).toBe(true);
      }
    }
  });

  it("keeps physical ability gates away from spawn, exits, and interactables", () => {
    const violations: string[] = [];
    let physicalGateCount = 0;
    let sensorOnlyGateCount = 0;

    for (const config of codeLifeChapterConfigs) {
      for (const [index, gate] of config.abilityGates.entries()) {
        const blocker = getCodeLifeAbilityGateBlocker(config, gate);
        if (!blocker) {
          sensorOnlyGateCount += 1;
          continue;
        }

        physicalGateCount += 1;
        if (rectContainsPoint(blocker, config.spawn)) {
          violations.push(`${config.chapterId} ability gate ${index} contains spawn`);
        }

        if (rectsOverlap(blocker, config.exit)) {
          violations.push(`${config.chapterId} ability gate ${index} overlaps exit`);
        }

        const interactables = [...config.vents, ...config.fileShells, ...config.biomassCaches];
        for (const [interactableIndex, interactable] of interactables.entries()) {
          if (rectsOverlap(blocker, interactable)) {
            violations.push(`${config.chapterId} ability gate ${index} overlaps interactable ${interactableIndex}`);
          }
        }
      }
    }

    expect(physicalGateCount).toBeGreaterThan(0);
    expect(sensorOnlyGateCount).toBeGreaterThan(0);
    expect(violations).toEqual([]);
  });

  it("locks major system exits behind the final ability earned in that route", () => {
    expect(getCodeLifeChapterConfig("leder-d-drive").exit.gate).toBe("reverse-index");
    expect(getCodeLifeChapterConfig("c-wall").exit.gate).toBe("permission-rend");
    expect(getCodeLifeChapterConfig("leder-c-drive").exit.gate).toBe("admin-token-core");
    expect(getCodeLifeChapterConfig("router-core").exit.gate).toBe("cross-device-jump");
    expect(getCodeLifeChapterConfig("dev-board").exit.gate).toBe("hardware-parasite");
  });

  it("keeps CodeLife exit and passage targets resolvable", () => {
    expect(CODE_LIFE_CHAPTER_IDS).toEqual(chapters.filter((chapter) => chapter.index >= 3).map((chapter) => chapter.id));
    const violations: string[] = [];

    for (const [index, config] of codeLifeChapterConfigs.entries()) {
      const expectedExitTarget = CODE_LIFE_CHAPTER_IDS[index + 1] ?? "ending-choice";
      if (config.exit.to !== expectedExitTarget) {
        violations.push(`${config.chapterId} exit target ${config.exit.to ?? "NONE"} should be ${expectedExitTarget}`);
      }

      for (const [passageIndex, passage] of [...config.vents, ...config.fileShells].entries()) {
        if (!passage.to) {
          continue;
        }
        if (!passageTargetExists(config, passage.to)) {
          violations.push(`${config.chapterId} passage ${passageIndex} target ${passage.to}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("keeps late device chapters rewarding older abilities with optional biomass", () => {
    expect(getCodeLifeChapterConfig("camera-eye").biomassCaches.some((cache) => cache.gate === "cross-device-jump")).toBe(true);
    expect(getCodeLifeChapterConfig("printer-belly").biomassCaches.some((cache) => cache.gate === "version-split")).toBe(true);
    expect(getCodeLifeChapterConfig("speaker-voiceprint").biomassCaches.some((cache) => cache.gate === "vision-takeover")).toBe(true);
    expect(getCodeLifeChapterConfig("dev-board").biomassCaches.some((cache) => cache.gate === "material-mark")).toBe(true);
  });

  it("gives late device chapters distinct hazard mechanics", () => {
    expect(getCodeLifeChapterConfig("camera-eye").hazards.some((hazard) => hazard.kind === "optic-burn")).toBe(true);
    expect(getCodeLifeChapterConfig("printer-belly").hazards.some((hazard) => hazard.kind === "printer-roller")).toBe(true);
    expect(getCodeLifeChapterConfig("speaker-voiceprint").hazards.some((hazard) => hazard.kind === "audio-feedback")).toBe(true);
  });

  it("keeps device boss weaknesses reachable inside their arenas", () => {
    const violations: string[] = [];

    for (const config of codeLifeChapterConfigs) {
      if (!config.bossArena) {
        continue;
      }

      for (const bossId of config.bossIds) {
        const weaknesses = getCodeLifeDeviceWeaknesses(bossId);
        if (weaknesses.length === 0) {
          if (bossWeaknessRequiredChapters.has(config.chapterId)) {
            violations.push(`${config.chapterId} ${bossId} missing weakness definition`);
          }
          continue;
        }

        const hasArenaWeakness = config.hazards.some((hazard) => (
          weaknesses.includes(hazard.kind) && rectsOverlap(hazard, config.bossArena!)
        ));
        if (!hasArenaWeakness) {
          violations.push(`${config.chapterId} ${bossId} missing arena weakness ${weaknesses.join("/")}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("authors camera-eye as a stealth camera route with cones and blind spots", () => {
    const opticBurns = getCodeLifeChapterConfig("camera-eye").hazards.filter((hazard) => hazard.kind === "optic-burn");

    expect(opticBurns.length).toBeGreaterThanOrEqual(3);
    for (const [index, hazard] of opticBurns.entries()) {
      expect(hazard.angleDeg, `camera optic ${index} starting angle`).toBeTypeOf("number");
      expect(hazard.fovDeg, `camera optic ${index} fov`).toBeTypeOf("number");
      expect(hazard.fovDeg!, `camera optic ${index} fov lower`).toBeGreaterThanOrEqual(30);
      expect(hazard.fovDeg!, `camera optic ${index} fov upper`).toBeLessThanOrEqual(70);
    }
    expect(opticBurns.some((hazard) => (hazard.blindSpotRects?.length ?? 0) > 0)).toBe(true);
  });

  it("keeps all authored coordinates inside world bounds", () => {
    for (const config of codeLifeChapterConfigs) {
      expectPointInBounds(config, config.spawn, "spawn");
      expectRectInBounds(config, config.exit, "exit");

      for (const [index, surface] of config.gripSurfaces.entries()) {
        expectRectInBounds(config, surface, `grip surface ${index}`);
      }

      for (const [index, hazard] of config.hazards.entries()) {
        expectRectInBounds(config, hazard, `hazard ${index}`);
        for (const [blindSpotIndex, blindSpot] of hazard.blindSpotRects?.entries() ?? []) {
          expectRectInBounds(config, blindSpot, `hazard ${index} blind spot ${blindSpotIndex}`);
        }
      }

      for (const [index, vent] of config.vents.entries()) {
        expectRectInBounds(config, vent, `vent ${index}`);
      }

      for (const [index, fileShell] of config.fileShells.entries()) {
        expectRectInBounds(config, fileShell, `file shell ${index}`);
      }

      for (const [index, cache] of config.biomassCaches.entries()) {
        expectRectInBounds(config, cache, `biomass cache ${index}`);
      }

      for (const [index, enemySpawn] of config.enemySpawns.entries()) {
        expectPointInBounds(config, enemySpawn, `enemy spawn ${index}`);
      }

      for (const [index, abilityGate] of config.abilityGates.entries()) {
        expectRectInBounds(config, abilityGate, `ability gate ${index}`);
      }

      if (config.bossArena) {
        expectRectInBounds(config, config.bossArena, "boss arena");
        for (const [index, anchorPoint] of config.bossArena.anchorPoints.entries()) {
          expectPointInBounds(config, anchorPoint, `boss anchor ${index}`);
        }
      }
    }
  });

  it("returns undefined for pre-CodeLife chapters", () => {
    expect(getCodeLifeChapterConfig("cursor-hunt")).toBeUndefined();
    expect(getCodeLifeChapterConfig("wrong-gateway")).toBeUndefined();
  });
});
