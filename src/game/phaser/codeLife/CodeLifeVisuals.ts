import type { AbilityId, BossId } from "../../types";
import type { CodeLifeEnemyKind, CodeLifeHazardKind } from "./CodeLifeChapterConfig";

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
