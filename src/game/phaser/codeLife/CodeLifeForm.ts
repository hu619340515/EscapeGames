export type CodeLifeFormTierId = "thread" | "swarm" | "brute";
export type CodeLifeVersionFormId = "thread" | "packet" | "brute";

export interface CodeLifeFormTier {
  readonly id: CodeLifeFormTierId;
  readonly label: string;
  readonly minMass: number;
  readonly maxMass: number;
  readonly segments: number;
  readonly accelerationScale: number;
  readonly dragScale: number;
  readonly tendrilStrengthScale: number;
  readonly tearDamageScale: number;
  readonly tearRadiusPx: number;
  readonly biteDamageScale: number;
  readonly biomassGainScale: number;
  readonly damageTakenScale: number;
  readonly stealthMsBonus: number;
}

export interface CodeLifeFormState {
  readonly mass: number;
  readonly ratio: number;
  readonly tierRatio: number;
  readonly tierIndex: number;
  readonly tier: CodeLifeFormTier;
  readonly label: string;
  readonly segments: number;
  readonly accelerationScale: number;
  readonly dragScale: number;
  readonly tendrilStrengthScale: number;
  readonly tearDamageScale: number;
  readonly tearRadiusPx: number;
  readonly biteDamageScale: number;
  readonly biomassGainScale: number;
  readonly damageTakenScale: number;
  readonly stealthMsBonus: number;
}

export const CODE_LIFE_MIN_MASS = 0.68;
export const CODE_LIFE_MAX_MASS = 2.85;
export const CODE_LIFE_FORM_ORDER: readonly CodeLifeFormTierId[] = ["thread", "swarm", "brute"];
export const CODE_LIFE_VERSION_FORM_ORDER: readonly CodeLifeVersionFormId[] = ["thread", "packet", "brute"];

export const CODE_LIFE_FORM_TIERS: readonly CodeLifeFormTier[] = [
  {
    id: "thread",
    label: "细线体",
    minMass: CODE_LIFE_MIN_MASS,
    maxMass: 1.14,
    segments: 3,
    accelerationScale: 1.18,
    dragScale: 1.1,
    tendrilStrengthScale: 0.88,
    tearDamageScale: 0.82,
    tearRadiusPx: 145,
    biteDamageScale: 0.9,
    biomassGainScale: 1.08,
    damageTakenScale: 1.08,
    stealthMsBonus: 320,
  },
  {
    id: "swarm",
    label: "集群体",
    minMass: 1.14,
    maxMass: 2.05,
    segments: 5,
    accelerationScale: 1,
    dragScale: 1,
    tendrilStrengthScale: 1,
    tearDamageScale: 1,
    tearRadiusPx: 165,
    biteDamageScale: 1,
    biomassGainScale: 1,
    damageTakenScale: 1,
    stealthMsBonus: 0,
  },
  {
    id: "brute",
    label: "重代码体",
    minMass: 2.05,
    maxMass: CODE_LIFE_MAX_MASS,
    segments: 8,
    accelerationScale: 0.78,
    dragScale: 0.88,
    tendrilStrengthScale: 1.26,
    tearDamageScale: 1.34,
    tearRadiusPx: 198,
    biteDamageScale: 1.2,
    biomassGainScale: 0.92,
    damageTakenScale: 0.76,
    stealthMsBonus: -180,
  },
];

const VERSION_FORM_TIER_IDS: Record<CodeLifeVersionFormId, CodeLifeFormTierId> = {
  thread: "thread",
  packet: "swarm",
  brute: "brute",
};

const VERSION_FORM_PROFILES: Record<
  CodeLifeVersionFormId,
  {
    readonly label: string;
    readonly segments: number;
    readonly accelerationScale: number;
    readonly dragScale: number;
    readonly tendrilStrengthScale: number;
    readonly tearDamageScale: number;
    readonly tearRadiusScale: number;
    readonly biteDamageScale: number;
    readonly biomassGainScale: number;
    readonly damageTakenScale: number;
    readonly stealthMsBonus: number;
  }
> = {
  thread: {
    label: "细线程体",
    segments: 3,
    accelerationScale: 1.06,
    dragScale: 1.04,
    tendrilStrengthScale: 0.94,
    tearDamageScale: 0.92,
    tearRadiusScale: 0.88,
    biteDamageScale: 0.92,
    biomassGainScale: 1.04,
    damageTakenScale: 1.08,
    stealthMsBonus: 380,
  },
  packet: {
    label: "数据包体",
    segments: 4,
    accelerationScale: 1.22,
    dragScale: 1.16,
    tendrilStrengthScale: 0.82,
    tearDamageScale: 0.72,
    tearRadiusScale: 0.8,
    biteDamageScale: 0.72,
    biomassGainScale: 0.86,
    damageTakenScale: 1.28,
    stealthMsBonus: 160,
  },
  brute: {
    label: "重代码体",
    segments: 8,
    accelerationScale: 1,
    dragScale: 1,
    tendrilStrengthScale: 1,
    tearDamageScale: 1,
    tearRadiusScale: 1,
    biteDamageScale: 1,
    biomassGainScale: 1,
    damageTakenScale: 1,
    stealthMsBonus: 0,
  },
};

export function createCodeLifeFormState(mass: number, forcedTierId?: CodeLifeFormTierId): CodeLifeFormState {
  const clampedMass = clampMass(mass);
  const naturalTierIndex = CODE_LIFE_FORM_TIERS.findIndex(
    (tier, index) =>
      clampedMass >= tier.minMass &&
      (clampedMass < tier.maxMass || index === CODE_LIFE_FORM_TIERS.length - 1),
  );
  const forcedTierIndex = forcedTierId ? CODE_LIFE_FORM_TIERS.findIndex((tier) => tier.id === forcedTierId) : -1;
  const tierIndex = forcedTierIndex >= 0 ? forcedTierIndex : naturalTierIndex;
  const tier = CODE_LIFE_FORM_TIERS[Math.max(0, tierIndex)] ?? CODE_LIFE_FORM_TIERS[0];
  const tierRange = Math.max(0.01, tier.maxMass - tier.minMass);

  return {
    mass: clampedMass,
    ratio: (clampedMass - CODE_LIFE_MIN_MASS) / (CODE_LIFE_MAX_MASS - CODE_LIFE_MIN_MASS),
    tierRatio: Math.max(0, Math.min(1, (clampedMass - tier.minMass) / tierRange)),
    tierIndex: Math.max(0, tierIndex),
    tier,
    label: tier.label,
    segments: tier.segments,
    accelerationScale: tier.accelerationScale,
    dragScale: tier.dragScale,
    tendrilStrengthScale: tier.tendrilStrengthScale,
    tearDamageScale: tier.tearDamageScale,
    tearRadiusPx: tier.tearRadiusPx,
    biteDamageScale: tier.biteDamageScale,
    biomassGainScale: tier.biomassGainScale,
    damageTakenScale: tier.damageTakenScale,
    stealthMsBonus: tier.stealthMsBonus,
  };
}

export function createCodeLifeVersionFormState(mass: number, versionForm: CodeLifeVersionFormId): CodeLifeFormState {
  const base = createCodeLifeFormState(mass, VERSION_FORM_TIER_IDS[versionForm]);
  const profile = VERSION_FORM_PROFILES[versionForm];

  return {
    ...base,
    label: profile.label,
    segments: profile.segments,
    accelerationScale: base.accelerationScale * profile.accelerationScale,
    dragScale: base.dragScale * profile.dragScale,
    tendrilStrengthScale: base.tendrilStrengthScale * profile.tendrilStrengthScale,
    tearDamageScale: base.tearDamageScale * profile.tearDamageScale,
    tearRadiusPx: Math.round(base.tearRadiusPx * profile.tearRadiusScale),
    biteDamageScale: base.biteDamageScale * profile.biteDamageScale,
    biomassGainScale: base.biomassGainScale * profile.biomassGainScale,
    damageTakenScale: base.damageTakenScale * profile.damageTakenScale,
    stealthMsBonus: base.stealthMsBonus + profile.stealthMsBonus,
  };
}

export function getNextCodeLifeVersionForm(current: CodeLifeVersionFormId, direction = 1): CodeLifeVersionFormId {
  const index = CODE_LIFE_VERSION_FORM_ORDER.indexOf(current);
  const safeIndex = index >= 0 ? index : 0;
  const nextIndex = (safeIndex + Math.sign(direction || 1) + CODE_LIFE_VERSION_FORM_ORDER.length) % CODE_LIFE_VERSION_FORM_ORDER.length;
  return CODE_LIFE_VERSION_FORM_ORDER[nextIndex];
}

export function clampMass(mass: number): number {
  if (!Number.isFinite(mass)) {
    return 1;
  }
  return Math.max(CODE_LIFE_MIN_MASS, Math.min(CODE_LIFE_MAX_MASS, mass));
}
