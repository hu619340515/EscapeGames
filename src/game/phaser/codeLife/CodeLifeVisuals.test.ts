import { describe, expect, it } from "vitest";
import {
  getCodeLifeAbilityGateTextureKey,
  getCodeLifeBossTextureKey,
  getCodeLifeHazardTextureKey,
  getCodeLifeSurfaceTextureKey,
  getCodeLifeSurfaceTextureKeys,
} from "./CodeLifeVisuals";

describe("CodeLife visual texture routing", () => {
  it("routes late hardware hazards away from the generic gear", () => {
    expect(getCodeLifeHazardTextureKey("optic-burn")).toBe("pd-hazard-optic");
    expect(getCodeLifeHazardTextureKey("printer-roller")).toBe("pd-hazard-roller");
    expect(getCodeLifeHazardTextureKey("audio-feedback")).toBe("pd-hazard-audio");
    expect(getCodeLifeHazardTextureKey("firmware-flash")).toBe("pd-hazard-firmware");
    expect(getCodeLifeHazardTextureKey("delete-scan")).toBe("electromagnetic-trap-beam");
  });

  it("routes late bosses to readable silhouettes", () => {
    expect(getCodeLifeBossTextureKey("lens-keeper")).toBe("boss-lens-keeper");
    expect(getCodeLifeBossTextureKey("print-queue-beast")).toBe("boss-print-queue-beast");
    expect(getCodeLifeBossTextureKey("wake-word-guard")).toBe("boss-wake-word-guard");
    expect(getCodeLifeBossTextureKey("firmware-burner")).toBe("boss-firmware-burner");
    expect(getCodeLifeBossTextureKey("duplicate-copy")).toBe("boss-duplicate-copy");
    expect(getCodeLifeBossTextureKey("c-lock-colossus")).toBe("boss-c-lock-colossus");
  });

  it("routes late ability gates to motif-specific locks", () => {
    expect(getCodeLifeAbilityGateTextureKey("material-mark")).toBe("pd-gate-material");
    expect(getCodeLifeAbilityGateTextureKey("voiceprint-disguise")).toBe("pd-gate-voiceprint");
    expect(getCodeLifeAbilityGateTextureKey("hardware-parasite")).toBe("pd-gate-hardware");
    expect(getCodeLifeAbilityGateTextureKey("vision-takeover")).toBe("pd-gate-vision");
    expect(getCodeLifeAbilityGateTextureKey("cling")).toBe("pd-file-block");
  });

  it("routes chapters 5 through 14 to generated ground and air platform art", () => {
    const chapterIds = [
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
    ] as const;

    for (const chapterId of chapterIds) {
      const keys = getCodeLifeSurfaceTextureKeys(chapterId);
      expect(keys?.bottomPlatform).toBe(`${chapterId}-bottom-platform`);
      expect(keys?.platformShelf).toBe(`${chapterId}-platform-shelf`);
      expect(getCodeLifeSurfaceTextureKey(chapterId, "floor", "world floor", true)).toBe(`${chapterId}-bottom-platform`);
      expect(getCodeLifeSurfaceTextureKey(chapterId, "rail", "air shelf")).toBe(`${chapterId}-platform-shelf`);
    }
  });
});
