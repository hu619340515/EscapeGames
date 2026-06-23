import { describe, expect, it } from "vitest";
import { chapters } from "../../data";
import {
  HEALTH_PICKUP_COUNT,
  getChapterEnemyRoutes,
  getHealthPickupPosition,
  getLadderDefs,
  getPlatformDefs,
  getThrowSkillPickupPosition,
  getWorldBounds,
} from "./worldConfig";

function platformTop([, y, , height]: readonly [number, number, number, number]): number {
  return y - height / 2;
}

function horizontalEdgeGap(
  [leftX, , leftWidth]: readonly [number, number, number, number],
  [rightX, , rightWidth]: readonly [number, number, number, number],
): number {
  const leftRange = { min: leftX - leftWidth / 2, max: leftX + leftWidth / 2 };
  const rightRange = { min: rightX - rightWidth / 2, max: rightX + rightWidth / 2 };

  if (leftRange.max >= rightRange.min && rightRange.max >= leftRange.min) {
    return 0;
  }

  return Math.min(Math.abs(leftRange.min - rightRange.max), Math.abs(rightRange.min - leftRange.max));
}

describe("cursor hunt platform collision", () => {
  it("keeps collision tops aligned to the foreground art surfaces", () => {
    expect(getPlatformDefs("cursor-hunt", 1).map(platformTop)).toEqual([
      884, 164, 282, 256, 400, 614, 710, 731, 120, 342, 478, 630, 416, 710, 121, 411, 411,
    ]);
  });
});

describe("wrong gateway platform layout", () => {
  it("offers enough varied air platforms for a platformer route", () => {
    expect(getPlatformDefs("wrong-gateway", 2)).toHaveLength(27);
  });

  it("defines climbable ladders that bridge tall vertical gaps", () => {
    const ladders = getLadderDefs("wrong-gateway");

    expect(ladders).toHaveLength(4);
    expect(ladders.some(([, , , height]) => height >= 400)).toBe(true);
  });
});

describe("late vertical platform layouts", () => {
  it("keeps chapter 3 climb steps within the limited double-jump height", () => {
    const platforms = getPlatformDefs("code-rebirth", 3);
    const routeClimbGaps = platforms.slice(0, -1).map((platform, index) => platformTop(platform) - platformTop(platforms[index + 1]));

    expect(getWorldBounds("code-rebirth")).toEqual({ width: 1440, height: 2560 });
    expect(platforms).toHaveLength(15);
    expect(platforms[0]).toEqual([720, 2427, 1440, 47]);
    expect(Math.max(...routeClimbGaps)).toBeLessThanOrEqual(165);
    expect(Math.min(...platforms.map(platformTop))).toBeLessThan(240);
  });

  it("keeps chapter 4 climbable as a vertical scrolling platform route", () => {
    const bounds = getWorldBounds("trash-mountain");
    const platforms = getPlatformDefs("trash-mountain", 4);
    const routeTops = platforms.map(platformTop);
    const routeClimbGaps = routeTops.slice(0, -1).map((top, index) => top - routeTops[index + 1]);
    const routeHorizontalGaps = platforms
      .slice(0, -1)
      .map((platform, index) => horizontalEdgeGap(platform, platforms[index + 1]));

    expect(bounds).toEqual({ width: 1440, height: 2600 });
    expect(platforms).toHaveLength(17);
    expect(platforms[0]).toEqual([720, 2528, 1380, 84]);
    expect(platforms.at(-1)).toEqual([1180, 302, 360, 34]);
    expect(routeTops.every((top, index) => index === 0 || top < routeTops[index - 1])).toBe(true);
    expect(Math.max(...routeClimbGaps)).toBeLessThanOrEqual(145);
    expect(Math.max(...routeHorizontalGaps)).toBeLessThanOrEqual(20);
    expect(Math.min(...routeTops)).toBeLessThan(290);
    expect(Math.max(...routeTops)).toBeGreaterThan(2480);
  });
});

describe("support pickups", () => {
  it("places exactly four health pickups in every chapter world", () => {
    for (const chapter of chapters) {
      const bounds = getWorldBounds(chapter.id);
      const pickups = Array.from({ length: HEALTH_PICKUP_COUNT }, (_, index) =>
        getHealthPickupPosition(index, chapter.id, chapter.index),
      );

      expect(pickups).toHaveLength(4);
      expect(pickups.every(({ x, y }) => x > 0 && x < bounds.width && y > 0 && y < bounds.height)).toBe(true);
    }
  });

  it("places the platform throw buff inside every chapter world", () => {
    for (const chapter of chapters) {
      const bounds = getWorldBounds(chapter.id);
      const pickup = getThrowSkillPickupPosition(chapter.id, chapter.index);

      expect(pickup.x).toBeGreaterThan(0);
      expect(pickup.x).toBeLessThan(bounds.width);
      expect(pickup.y).toBeGreaterThan(0);
      expect(pickup.y).toBeLessThan(bounds.height);
    }
  });

  it("places boss chapter throw buffs close to the starting side of the route", () => {
    for (const chapter of chapters.filter((candidate) => candidate.bossIds.length > 0)) {
      const bounds = getWorldBounds(chapter.id);
      const pickup = getThrowSkillPickupPosition(chapter.id, chapter.index, true);

      expect(pickup.x).toBeGreaterThan(0);
      expect(pickup.x).toBeLessThan(bounds.width * 0.45);
      expect(pickup.y).toBeGreaterThan(bounds.height * 0.7);
      expect(pickup.y).toBeLessThan(bounds.height);
    }

    const trashMountainBuff = getThrowSkillPickupPosition("trash-mountain", 4, true);
    expect(trashMountainBuff.x).toBeLessThan(240);
    expect(trashMountainBuff.y).toBeGreaterThan(2400);
  });
});

describe("chapter minion difficulty", () => {
  it("scales enemy count, durability, and contact damage forward through the chapters", () => {
    const routesByChapter = chapters.map((chapter) => getChapterEnemyRoutes(chapter.id, chapter.index));
    const counts = routesByChapter.map((routes) => routes.length);
    const firstRoutes = routesByChapter[0];
    const lastRoutes = routesByChapter.at(-1)!;

    expect(counts).toEqual([...counts].sort((a, b) => a - b));
    expect(counts.at(-1)).toBeGreaterThan(counts[0]);
    expect(lastRoutes[0].hp).toBeGreaterThan(firstRoutes[0].hp);
    expect(lastRoutes[0].contactDamage).toBeGreaterThan(firstRoutes[0].contactDamage);

    for (const [chapterIndex, chapter] of chapters.entries()) {
      const bounds = getWorldBounds(chapter.id);
      for (const route of routesByChapter[chapterIndex]) {
        expect(route.x).toBeGreaterThan(0);
        expect(route.x).toBeLessThan(bounds.width);
        expect(route.y).toBeGreaterThan(0);
        expect(route.y).toBeLessThan(bounds.height);
        expect(route.maxX).toBeGreaterThan(route.minX);
      }
    }
  });
});
