import { describe, expect, it } from "vitest";
import { getLadderDefs, getPlatformDefs, getWorldBounds } from "./worldConfig";

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
    expect(platforms).toHaveLength(14);
    expect(platforms[0]).toEqual([720, 2528, 1380, 84]);
    expect(platforms.at(-1)).toEqual([1210, 324, 260, 34]);
    expect(routeTops.every((top, index) => index === 0 || top < routeTops[index - 1])).toBe(true);
    expect(Math.max(...routeClimbGaps)).toBeLessThanOrEqual(215);
    expect(Math.max(...routeHorizontalGaps)).toBeLessThanOrEqual(120);
    expect(Math.min(...routeTops)).toBeLessThan(320);
    expect(Math.max(...routeTops)).toBeGreaterThan(2480);
  });
});
