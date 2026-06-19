export type CodeLifeBossSpecialStyle = "pulse" | "sweep" | "projectile";

export interface CodeLifeBossAttackPatternInput {
  readonly bossId: string;
  readonly phaseIndex: number;
  readonly phaseCount: number;
  readonly healthRatio?: number;
}

export interface CodeLifeBossAttackPattern {
  readonly style: CodeLifeBossSpecialStyle;
  readonly cooldownMs: number;
  readonly damageScale: number;
  readonly telegraphColor?: number;
}

const DEFAULT_PATTERN: CodeLifeBossAttackPattern = {
  style: "projectile",
  cooldownMs: 2050,
  damageScale: 1,
};

const PHASE_PATTERNS: Readonly<Record<string, readonly CodeLifeBossAttackPattern[]>> = {
  "gateway-warden": [
    { style: "projectile", cooldownMs: 2240, damageScale: 0.9 },
    { style: "sweep", cooldownMs: 2380, damageScale: 1 },
    { style: "pulse", cooldownMs: 2680, damageScale: 1.12 },
  ],
  "firewall-heart": [
    { style: "sweep", cooldownMs: 2500, damageScale: 1.05, telegraphColor: 0xff4f2e },
    { style: "pulse", cooldownMs: 2580, damageScale: 1.15, telegraphColor: 0xff4f2e },
    { style: "projectile", cooldownMs: 1760, damageScale: 1.2, telegraphColor: 0xff4f2e },
  ],
  "sync-mother": [
    { style: "projectile", cooldownMs: 2120, damageScale: 0.95, telegraphColor: 0x65d7ff },
    { style: "pulse", cooldownMs: 2380, damageScale: 1.06, telegraphColor: 0x65d7ff },
    { style: "sweep", cooldownMs: 2140, damageScale: 1.18, telegraphColor: 0x65d7ff },
  ],
  "lens-keeper": [
    { style: "sweep", cooldownMs: 2320, damageScale: 0.96, telegraphColor: 0xffef9a },
    { style: "projectile", cooldownMs: 1760, damageScale: 1.08, telegraphColor: 0xffef9a },
    { style: "sweep", cooldownMs: 1960, damageScale: 1.18, telegraphColor: 0xffef9a },
  ],
  "print-queue-beast": [
    { style: "sweep", cooldownMs: 2460, damageScale: 0.98, telegraphColor: 0xf7f0d0 },
    { style: "projectile", cooldownMs: 1880, damageScale: 1.08, telegraphColor: 0xf7f0d0 },
    { style: "pulse", cooldownMs: 2360, damageScale: 1.16, telegraphColor: 0xf7f0d0 },
  ],
  "wake-word-guard": [
    { style: "pulse", cooldownMs: 2660, damageScale: 0.96, telegraphColor: 0xe3a9ff },
    { style: "sweep", cooldownMs: 2220, damageScale: 1.1, telegraphColor: 0xe3a9ff },
    { style: "pulse", cooldownMs: 2180, damageScale: 1.22, telegraphColor: 0xe3a9ff },
  ],
  "firmware-burner": [
    { style: "sweep", cooldownMs: 2440, damageScale: 1.04, telegraphColor: 0xffc247 },
    { style: "projectile", cooldownMs: 1720, damageScale: 1.12, telegraphColor: 0xffc247 },
    { style: "pulse", cooldownMs: 2240, damageScale: 1.28, telegraphColor: 0xffc247 },
  ],
};

const PULSE_BOSSES = new Set(["uac-eye", "quarantine-warden", "restore-ghost", "admin-hand"]);
const SWEEP_BOSSES = new Set(["security-captain", "search-index-spider", "c-lock-colossus"]);

export function resolveCodeLifeBossAttackPattern(input: CodeLifeBossAttackPatternInput): CodeLifeBossAttackPattern {
  const phaseIndex = clampPhaseIndex(input.phaseIndex, input.phaseCount);
  const specific = PHASE_PATTERNS[input.bossId]?.[phaseIndex];
  const base =
    specific ??
    (PULSE_BOSSES.has(input.bossId)
      ? { style: "pulse", cooldownMs: 2850, damageScale: 1 }
      : SWEEP_BOSSES.has(input.bossId)
        ? { style: "sweep", cooldownMs: 2450, damageScale: 1 }
        : DEFAULT_PATTERN);

  const healthRatio = Number.isFinite(input.healthRatio) ? Math.max(0, Math.min(1, input.healthRatio ?? 1)) : 1;
  const enrage = healthRatio < 0.34 ? 0.88 : healthRatio < 0.5 ? 0.94 : 1;
  return {
    ...base,
    cooldownMs: Math.max(1250, Math.round(base.cooldownMs * enrage)),
    damageScale: Number((base.damageScale * (healthRatio < 0.34 ? 1.12 : 1)).toFixed(2)),
  };
}

function clampPhaseIndex(phaseIndex: number, phaseCount: number): number {
  if (!Number.isFinite(phaseIndex) || phaseIndex < 0) {
    return 0;
  }
  return Math.min(Math.floor(phaseIndex), Math.max(0, Math.floor(phaseCount) - 1));
}
