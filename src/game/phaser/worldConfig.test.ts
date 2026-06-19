import { describe, expect, it } from "vitest";
import { getLadderDefs, getPlatformDefs } from "./worldConfig";

function platformTop([, y, , height]: readonly [number, number, number, number]): number {
  return y - height / 2;
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
