import { describe, expect, it } from "vitest";
import {
  getCodeLifeAbilityGateTextureKey,
  getCodeLifeBossTextureKey,
  getCodeLifeHazardTextureKey,
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
    expect(getCodeLifeBossTextureKey("duplicate-copy")).toBe("boss-core");
  });

  it("routes late ability gates to motif-specific locks", () => {
    expect(getCodeLifeAbilityGateTextureKey("material-mark")).toBe("pd-gate-material");
    expect(getCodeLifeAbilityGateTextureKey("voiceprint-disguise")).toBe("pd-gate-voiceprint");
    expect(getCodeLifeAbilityGateTextureKey("hardware-parasite")).toBe("pd-gate-hardware");
    expect(getCodeLifeAbilityGateTextureKey("vision-takeover")).toBe("pd-gate-vision");
    expect(getCodeLifeAbilityGateTextureKey("cling")).toBe("pd-file-block");
  });
});
