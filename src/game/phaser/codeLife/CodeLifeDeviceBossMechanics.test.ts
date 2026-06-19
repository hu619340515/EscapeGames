import { describe, expect, it } from "vitest";
import {
  getCodeLifeDeviceBossInteraction,
  getCodeLifeDeviceCueColor,
  getCodeLifeDeviceWeaknesses,
} from "./CodeLifeDeviceBossMechanics";

describe("CodeLife device boss mechanics", () => {
  it("keeps regular hazards lethal against minions", () => {
    const interaction = getCodeLifeDeviceBossInteraction({
      isBoss: false,
      hazardKind: "printer-roller",
    });

    expect(interaction).toMatchObject({
      damage: 99,
      force: 190,
      ignoresArmor: true,
    });
  });

  it("turns chapter devices into boss armor breakers", () => {
    expect(
      getCodeLifeDeviceBossInteraction({
        isBoss: true,
        bossId: "print-queue-beast",
        hazardKind: "printer-roller",
      }),
    ).toMatchObject({
      damage: 58,
      force: 190,
      ignoresArmor: false,
      cue: "roller-rip",
    });

    expect(
      getCodeLifeDeviceBossInteraction({
        isBoss: true,
        bossId: "wake-word-guard",
        hazardKind: "audio-feedback",
      }),
    ).toMatchObject({
      damage: 44,
      ignoresArmor: false,
      cue: "voiceprint-desync",
    });

    expect(
      getCodeLifeDeviceBossInteraction({
        isBoss: true,
        bossId: "firmware-burner",
        hazardKind: "firmware-flash",
      }),
    ).toMatchObject({
      damage: 46,
      ignoresArmor: false,
      cue: "firmware-short",
    });

    expect(
      getCodeLifeDeviceBossInteraction({
        isBoss: true,
        bossId: "firewall-heart",
        hazardKind: "firewall-pulse",
      }),
    ).toMatchObject({
      damage: 44,
      ignoresArmor: false,
      cue: "firewall-vent",
    });
  });

  it("falls back to generic armor chip when a boss has no device match", () => {
    expect(
      getCodeLifeDeviceBossInteraction({
        isBoss: true,
        bossId: "print-queue-beast",
        hazardKind: "audio-feedback",
      }),
    ).toMatchObject({
      damage: 22,
      force: 48,
      ignoresArmor: false,
    });
  });

  it("reports available device weaknesses for HUD and level reviews", () => {
    expect(getCodeLifeDeviceWeaknesses("print-queue-beast")).toContain("printer-roller");
    expect(getCodeLifeDeviceWeaknesses("firewall-heart")).toContain("firewall-pulse");
    expect(getCodeLifeDeviceWeaknesses("unknown-boss")).toEqual([]);
  });

  it("keeps boss weakness cue colors distinct", () => {
    expect(getCodeLifeDeviceCueColor("roller-rip")).toBe(0xfff06a);
    expect(getCodeLifeDeviceCueColor("lens-overload")).toBe(0x7affea);
    expect(getCodeLifeDeviceCueColor("voiceprint-desync")).toBe(0xe3a9ff);
    expect(getCodeLifeDeviceCueColor("firmware-short")).toBe(0x73ff8a);
    expect(getCodeLifeDeviceCueColor("firewall-vent")).toBe(0xff7a47);
    expect(getCodeLifeDeviceCueColor("sync-ground")).toBe(0x8ab4ff);
  });
});
