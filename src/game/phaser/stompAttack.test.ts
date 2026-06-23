import { describe, expect, it } from "vitest";
import { isStompAttack } from "./stompAttack";

describe("isStompAttack", () => {
  it("detects a downward landing across an enemy top", () => {
    expect(
      isStompAttack({
        attacker: { left: 96, right: 120, top: 94, bottom: 122 },
        target: { left: 90, right: 130, top: 112, bottom: 132 },
        attackerPreviousBottom: 106,
        attackerVelocityY: 360,
      }),
    ).toBe(true);
  });

  it("rejects side contacts even while falling", () => {
    expect(
      isStompAttack({
        attacker: { left: 55, right: 79, top: 96, bottom: 124 },
        target: { left: 90, right: 130, top: 112, bottom: 132 },
        attackerPreviousBottom: 106,
        attackerVelocityY: 360,
      }),
    ).toBe(false);
  });

  it("rejects contacts that start too deep below the enemy top", () => {
    expect(
      isStompAttack({
        attacker: { left: 96, right: 120, top: 116, bottom: 144 },
        target: { left: 90, right: 130, top: 112, bottom: 132 },
        attackerPreviousBottom: 136,
        attackerVelocityY: 260,
      }),
    ).toBe(false);
  });

  it("rejects upward jumps into an enemy", () => {
    expect(
      isStompAttack({
        attacker: { left: 96, right: 120, top: 96, bottom: 124 },
        target: { left: 90, right: 130, top: 112, bottom: 132 },
        attackerPreviousBottom: 126,
        attackerVelocityY: -240,
      }),
    ).toBe(false);
  });
});
