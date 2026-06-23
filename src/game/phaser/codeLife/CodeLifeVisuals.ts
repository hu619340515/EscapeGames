import type { AbilityId, BossId, ChapterId } from "../../types";
import type { CodeLifeEnemyKind, CodeLifeHazardKind, CodeLifeSurfaceKind } from "./CodeLifeChapterConfig";

export interface CodeLifeSurfaceTextureKeys {
  readonly bottomPlatform: string;
  readonly platformShelf: string;
}

const CODE_LIFE_SURFACE_TEXTURE_KEYS: Partial<Record<ChapterId, CodeLifeSurfaceTextureKeys>> = {
  "p-drive": {
    bottomPlatform: "p-drive-bottom-platform",
    platformShelf: "p-drive-platform-shelf",
  },
  "leder-d-drive": {
    bottomPlatform: "leder-d-drive-bottom-platform",
    platformShelf: "leder-d-drive-platform-shelf",
  },
  "c-wall": {
    bottomPlatform: "c-wall-bottom-platform",
    platformShelf: "c-wall-platform-shelf",
  },
  "leder-c-drive": {
    bottomPlatform: "leder-c-drive-bottom-platform",
    platformShelf: "leder-c-drive-platform-shelf",
  },
  "router-core": {
    bottomPlatform: "router-core-bottom-platform",
    platformShelf: "router-core-platform-shelf",
  },
  "nas-graveyard": {
    bottomPlatform: "nas-graveyard-bottom-platform",
    platformShelf: "nas-graveyard-platform-shelf",
  },
  "camera-eye": {
    bottomPlatform: "camera-eye-bottom-platform",
    platformShelf: "camera-eye-platform-shelf",
  },
  "printer-belly": {
    bottomPlatform: "printer-belly-bottom-platform",
    platformShelf: "printer-belly-platform-shelf",
  },
  "speaker-voiceprint": {
    bottomPlatform: "speaker-voiceprint-bottom-platform",
    platformShelf: "speaker-voiceprint-platform-shelf",
  },
  "dev-board": {
    bottomPlatform: "dev-board-bottom-platform",
    platformShelf: "dev-board-platform-shelf",
  },
};

const BOTTOM_PLATFORM_LABEL_HINTS = [
  "base",
  "bank",
  "lip",
  "throat",
  "outer",
  "intake",
  "tray",
  "grille",
  "usb",
] as const;

export function getCodeLifeSurfaceTextureKeys(chapterId: ChapterId): CodeLifeSurfaceTextureKeys | undefined {
  return CODE_LIFE_SURFACE_TEXTURE_KEYS[chapterId];
}

export function getCodeLifeSurfaceTextureKey(
  chapterId: ChapterId,
  kind: CodeLifeSurfaceKind | undefined,
  label: string | undefined,
  isWorldFloor = false,
): string | undefined {
  const keys = getCodeLifeSurfaceTextureKeys(chapterId);
  if (!keys) {
    return undefined;
  }
  if (isWorldFloor) {
    return keys.bottomPlatform;
  }
  if (kind === "wall" || kind === "pipe" || kind === "cable") {
    return undefined;
  }
  if (kind === "floor") {
    const normalizedLabel = label?.toLowerCase() ?? "";
    return BOTTOM_PLATFORM_LABEL_HINTS.some((hint) => normalizedLabel.includes(hint))
      ? keys.bottomPlatform
      : keys.platformShelf;
  }
  if (kind === "rail" || kind === "ceiling" || kind === "mesh" || kind === "shell") {
    return keys.platformShelf;
  }
  return undefined;
}

export function getCodeLifeHazardTextureKey(kind: CodeLifeHazardKind | undefined): string {
  if (kind === "optic-burn") return "pd-hazard-optic";
  if (kind === "printer-roller") return "pd-hazard-roller";
  if (kind === "audio-feedback") return "pd-hazard-audio";
  if (kind === "firmware-flash") return "pd-hazard-firmware";
  if (kind === "delete-scan") return "electromagnetic-trap-beam";
  if (kind === "permission-laser") return "pd-hazard-permission";
  if (kind === "firewall-pulse") return "pd-hazard-firewall";
  if (kind === "sync-storm") return "pd-hazard-sync";
  if (kind === "cache-sludge") return "pd-hazard-sludge";
  if (kind === "shredder") return "pd-hazard-shredder";
  return "pd-gear";
}

export function getCodeLifeBossTextureKey(bossId: BossId | string | undefined): string {
  if (bossId === "lens-keeper") return "boss-lens-keeper";
  if (bossId === "print-queue-beast") return "boss-print-queue-beast";
  if (bossId === "wake-word-guard") return "boss-wake-word-guard";
  if (bossId === "firmware-burner") return "boss-firmware-burner";
  if (bossId === "firewall-heart") return "boss-firewall-heart";
  if (bossId === "sync-mother") return "boss-sync-mother";
  if (bossId === "gateway-warden") return "boss-gateway-warden";
  return "boss-core";
}

export function getCodeLifeEnemyTextureKey(kind: CodeLifeEnemyKind | undefined): string {
  if (kind === "mechanical-worm") return "code-rebirth-worm";
  return "pd-process";
}

export function getCodeLifeTurretTextureKey(mount: "wall" | "platform" | undefined): string {
  if (mount === "platform") return "code-rebirth-platform-turret";
  return "code-rebirth-turret";
}

export function getCodeLifeTurretProjectileTextureKey(): string {
  return "code-rebirth-projectile";
}

export function getCodeLifeAbilityGateTextureKey(ability: AbilityId | undefined): string {
  if (ability === "material-mark") return "pd-gate-material";
  if (ability === "voiceprint-disguise") return "pd-gate-voiceprint";
  if (ability === "hardware-parasite") return "pd-gate-hardware";
  if (ability === "vision-takeover") return "pd-gate-vision";
  if (ability === "cross-device-jump" || ability === "lan-traverse") return "pd-gate-network";
  if (ability === "permission-rend" || ability === "admin-token-core") return "pd-gate-permission";
  return "pd-file-block";
}
