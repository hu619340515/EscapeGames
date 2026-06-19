import type { ChapterId, CodeLifeBossRuntimeHud } from "../../types";
import { getCodeLifeChapterAtmosphere } from "./CodeLifeProceduralArt";

export type CodeLifeAmbienceMode = "explore" | "boss" | "enraged" | "devour-window";

export interface CodeLifeAmbienceMixInput {
  readonly chapterId: ChapterId;
  readonly mass: number;
  readonly integrity: number;
  readonly maxIntegrity: number;
  readonly boss?: CodeLifeBossRuntimeHud;
}

export interface CodeLifeAmbienceMix {
  readonly mode: CodeLifeAmbienceMode;
  readonly baseFrequencyHz: number;
  readonly harmonicRatios: readonly number[];
  readonly filterFrequencyHz: number;
  readonly masterGain: number;
  readonly bossGain: number;
  readonly bossFrequencyHz: number;
  readonly pulseRateHz: number;
}

export function createCodeLifeAmbienceMix(input: CodeLifeAmbienceMixInput): CodeLifeAmbienceMix {
  const atmosphere = getCodeLifeChapterAtmosphere(input.chapterId);
  const massRatio = clamp01((input.mass - 0.68) / (2.85 - 0.68));
  const integrityRatio = clamp01(input.integrity / Math.max(1, input.maxIntegrity));
  const boss = input.boss;
  const window = boss?.window;
  const mode: CodeLifeAmbienceMode =
    window === "devour" ? "devour-window" : boss?.state === "enraged" ? "enraged" : boss ? "boss" : "explore";
  const moodBase =
    atmosphere.mood === "hardware-body" ? 58 : atmosphere.mood === "network-core" ? 76 : atmosphere.mood === "drive-system" ? 66 : 48;
  const pressure = mode === "devour-window" ? 1 : mode === "enraged" ? 0.82 : mode === "boss" ? 0.55 : 0;

  return {
    mode,
    baseFrequencyHz: Math.round(moodBase + atmosphere.corruption * 24 + massRatio * 16),
    harmonicRatios: atmosphere.mood === "hardware-body" ? [1, 1.49, 2.02, 3.01] : [1, 1.51, 2.01],
    filterFrequencyHz: Math.round(260 + atmosphere.corruption * 360 + massRatio * 140 + pressure * 420),
    masterGain: round4(0.016 + atmosphere.ambientAlpha * 0.02 + (1 - integrityRatio) * 0.012 + pressure * 0.014),
    bossGain: round4(pressure * (0.018 + atmosphere.corruption * 0.014)),
    bossFrequencyHz: Math.round((moodBase * (mode === "devour-window" ? 0.54 : 0.68)) + pressure * 18),
    pulseRateHz: round4(atmosphere.pulseHz + pressure * 0.9 + massRatio * 0.28),
  };
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
