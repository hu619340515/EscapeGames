import type { AbilityId, BossId, ChapterId, GameUiPayload } from "../../types";
import { createCodeLifeFormState, type CodeLifeFormTierId } from "./CodeLifeForm";

export type CodeLifeHudTone = "stable" | "warning" | "danger" | "locked" | "boss";
export type CodeLifeAbilityReadiness = "ready" | "cooldown" | "locked" | "charging";
export type CodeLifeBossPhaseState = "inactive" | "intro" | "phase" | "enraged" | "defeated";

export interface CodeLifeHudMeterState {
  readonly current: number;
  readonly max: number;
  readonly label: string;
  readonly tone?: CodeLifeHudTone;
}

export interface CodeLifeHudMassState extends CodeLifeHudMeterState {
  readonly segments: number;
  readonly instability: number;
  readonly formLabel?: string;
  readonly tierId?: CodeLifeFormTierId | string;
}

export interface CodeLifeAbilityHudItem {
  readonly id: AbilityId | string;
  readonly label: string;
  readonly inputLabel?: string;
  readonly readiness: CodeLifeAbilityReadiness;
  readonly cooldownRatio: number;
  readonly chargeRatio?: number;
  readonly isCurrent?: boolean;
  readonly isNew?: boolean;
}

export interface CodeLifeBossHudState {
  readonly id: BossId | string;
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  readonly phaseIndex: number;
  readonly phaseCount: number;
  readonly phaseLabel: string;
  readonly state: CodeLifeBossPhaseState;
  readonly shieldRatio?: number;
  readonly window?: "closed" | "damage" | "devour";
  readonly windowRemainingMs?: number;
  readonly weaknessLabel?: string;
}

export interface CodeLifeDevourPromptState {
  readonly visible: boolean;
  readonly targetId?: string;
  readonly targetLabel: string;
  readonly actionLabel: string;
  readonly holdRatio: number;
  readonly canDevour: boolean;
  readonly rewardPreview?: string;
}

export interface CodeLifeObjectiveHudState {
  readonly chapterId: ChapterId | string;
  readonly chapterTitle: string;
  readonly primary: string;
  readonly secondary?: string;
  readonly exitLabel?: string;
  readonly progressLabel?: string;
  readonly objectiveRatio?: number;
}

export interface CodeLifeHudWarning {
  readonly id: string;
  readonly label: string;
  readonly tone: Exclude<CodeLifeHudTone, "stable">;
  readonly ttlMs?: number;
}

export interface CodeLifeHudState {
  readonly integrity: CodeLifeHudMeterState;
  readonly mass: CodeLifeHudMassState;
  readonly currentAbility?: CodeLifeAbilityHudItem;
  readonly abilities: readonly CodeLifeAbilityHudItem[];
  readonly boss?: CodeLifeBossHudState;
  readonly devourPrompt?: CodeLifeDevourPromptState;
  readonly objective: CodeLifeObjectiveHudState;
  readonly warnings: readonly CodeLifeHudWarning[];
  readonly message?: string;
}

export interface CodeLifeHudMeterRender {
  readonly label: string;
  readonly valueLabel: string;
  readonly ratio: number;
  readonly tone: CodeLifeHudTone;
}

export interface CodeLifeHudAbilityRender {
  readonly id: string;
  readonly label: string;
  readonly inputLabel: string;
  readonly readiness: CodeLifeAbilityReadiness;
  readonly cooldownRatio: number;
  readonly chargeRatio: number;
  readonly isCurrent: boolean;
  readonly isNew: boolean;
}

export interface CodeLifeHudBossRender {
  readonly name: string;
  readonly hp: CodeLifeHudMeterRender;
  readonly phaseLabel: string;
  readonly phaseCounterLabel: string;
  readonly state: CodeLifeBossPhaseState;
  readonly shieldRatio: number;
  readonly shieldLabel: string;
  readonly windowLabel: string;
  readonly weaknessLabel: string;
}

export interface CodeLifeHudRenderModel {
  readonly integrity: CodeLifeHudMeterRender;
  readonly mass: CodeLifeHudMeterRender & {
    readonly segments: number;
    readonly instabilityLabel: string;
    readonly formLabel?: string;
  };
  readonly currentAbility?: CodeLifeHudAbilityRender;
  readonly abilities: readonly CodeLifeHudAbilityRender[];
  readonly boss?: CodeLifeHudBossRender;
  readonly devourPrompt?: CodeLifeDevourPromptState;
  readonly objective: CodeLifeObjectiveHudState;
  readonly warningText: string;
  readonly statusLine: string;
  readonly cssVars: Readonly<Record<string, string>>;
}

export interface CodeLifeHudDomRefs {
  readonly root?: HTMLElement;
  readonly integrityBar?: HTMLElement;
  readonly integrityText?: HTMLElement;
  readonly massBar?: HTMLElement;
  readonly massText?: HTMLElement;
  readonly currentAbility?: HTMLElement;
  readonly abilityStrip?: HTMLElement;
  readonly boss?: HTMLElement;
  readonly bossBar?: HTMLElement;
  readonly devourPrompt?: HTMLElement;
  readonly objectiveTitle?: HTMLElement;
  readonly objectiveBody?: HTMLElement;
  readonly warnings?: HTMLElement;
  readonly statusLine?: HTMLElement;
}

export interface CodeLifeHudPayloadOverrides {
  readonly mass?: Partial<CodeLifeHudMassState>;
  readonly currentAbilityId?: AbilityId | string;
  readonly abilities?: readonly CodeLifeAbilityHudItem[];
  readonly boss?: Partial<CodeLifeBossHudState>;
  readonly devourPrompt?: CodeLifeDevourPromptState;
  readonly objective?: Partial<CodeLifeObjectiveHudState>;
  readonly warnings?: readonly CodeLifeHudWarning[];
  readonly message?: string;
}

export const CODE_LIFE_ABILITY_INPUT_LABELS: Partial<Record<AbilityId, string>> = {
  cling: "SPACE",
  coil: "J",
  infiltrate: "L",
  "devour-code": "K",
  "ping-sense": "Q",
  "lan-traverse": "E",
  "mirror-disguise": "L",
  "devour-upgrade": "K",
  "clone-control": "E",
  "reverse-index": "Q",
  "permission-rend": "J",
  "process-parasite": "K",
  "quarantine-invert": "J",
  "backup-anchor": "L",
  "admin-token-core": "E",
  "cross-device-jump": "E",
  "version-split": "E",
  "vision-takeover": "Q",
  "material-mark": "K",
  "voiceprint-disguise": "L",
  "hardware-parasite": "E",
};

const VISIBLE_ABILITY_CHIP_LIMIT = 12;
const FOUNDATION_ABILITY_CHIP_COUNT = 4;

export function createCodeLifeHudStateFromGamePayload(
  payload: GameUiPayload,
  overrides: CodeLifeHudPayloadOverrides = {},
): CodeLifeHudState {
  const abilities =
    overrides.abilities ??
    payload.state.abilities.map<CodeLifeAbilityHudItem>((id, index) => ({
      id,
      label: payload.abilityNames[index] ?? formatAbilityId(id),
      inputLabel: CODE_LIFE_ABILITY_INPUT_LABELS[id],
      readiness: "ready",
      cooldownRatio: 0,
      isNew: payload.lastUnlockedAbility?.id === id,
    }));
  const currentAbilityId = overrides.currentAbilityId ?? abilities.at(-1)?.id;
  const currentAbility = abilities.find((ability) => ability.id === currentAbilityId) ?? abilities.at(-1);
  const baseMass = estimateMassFromPayload(payload);
  const boss = createBossHudState(payload, overrides.boss);

  return {
    integrity: {
      current: payload.state.integrity,
      max: payload.state.maxIntegrity,
      label: "INTEGRITY",
      tone: getIntegrityTone(payload.state.integrity, payload.state.maxIntegrity),
    },
    mass: {
      ...baseMass,
      ...overrides.mass,
    },
    currentAbility: currentAbility
      ? {
          ...currentAbility,
          isCurrent: true,
        }
      : undefined,
    abilities: abilities.map((ability) => ({
      ...ability,
      isCurrent: ability.id === currentAbility?.id,
    })),
    boss,
    devourPrompt: overrides.devourPrompt,
    objective: {
      chapterId: payload.chapter.id,
      chapterTitle: payload.chapter.shortTitle || payload.chapter.title,
      primary: payload.chapter.objective,
      secondary: payload.currentBoss ? payload.currentBoss.name : undefined,
      exitLabel: payload.chapter.exitLabel,
      ...overrides.objective,
    },
    warnings: overrides.warnings ?? [],
    message: overrides.message ?? payload.message,
  };
}

export function createCodeLifeHudRenderModel(state: CodeLifeHudState): CodeLifeHudRenderModel {
  const integrity = createMeterRender(state.integrity);
  const mass = {
    ...createMeterRender(state.mass),
    segments: Math.max(0, Math.round(state.mass.segments)),
    instabilityLabel: `DRIFT ${formatPercent(state.mass.instability)}`,
    formLabel: state.mass.formLabel,
  };
  const allAbilities = state.abilities.map(createAbilityRender);
  const currentAbility = state.currentAbility ? createAbilityRender(state.currentAbility) : undefined;
  const abilities = compactAbilityRenders(allAbilities, currentAbility);
  const boss = state.boss ? createBossRender(state.boss) : undefined;
  const warningText = state.warnings.map((warning) => warning.label).join(" / ");
  const statusLine = [
    state.message,
    currentAbility ? `ABILITY ${currentAbility.label}` : undefined,
    state.devourPrompt?.visible ? state.devourPrompt.actionLabel : undefined,
  ]
    .filter(Boolean)
    .join(" | ");

  return {
    integrity,
    mass,
    currentAbility,
    abilities,
    boss,
    devourPrompt: state.devourPrompt,
    objective: state.objective,
    warningText,
    statusLine,
    cssVars: {
      "--code-life-integrity": formatPercent(integrity.ratio),
      "--code-life-mass": formatPercent(mass.ratio),
      "--code-life-boss-hp": boss ? formatPercent(boss.hp.ratio) : "0%",
      "--code-life-boss-shield": boss ? formatPercent(boss.shieldRatio) : "0%",
    },
  };
}

export function renderCodeLifeHudToDom(state: CodeLifeHudState, refs: CodeLifeHudDomRefs): CodeLifeHudRenderModel {
  const model = createCodeLifeHudRenderModel(state);

  if (refs.root) {
    for (const [name, value] of Object.entries(model.cssVars)) {
      refs.root.style.setProperty(name, value);
    }
    refs.root.dataset.tone = model.integrity.tone;
    refs.root.dataset.boss = model.boss ? "true" : "false";
  }

  setBar(refs.integrityBar, model.integrity);
  setText(refs.integrityText, `${model.integrity.label} ${model.integrity.valueLabel}`);
  setBar(refs.massBar, model.mass);
  setText(refs.massText, `${model.mass.label} ${model.mass.valueLabel} / ${model.mass.instabilityLabel}`);
  setText(refs.currentAbility, model.currentAbility ? formatAbilityRender(model.currentAbility) : "ABILITY NONE");
  renderAbilityStrip(refs.abilityStrip, model.abilities);

  if (refs.boss) {
    refs.boss.hidden = !model.boss;
    refs.boss.textContent = model.boss
      ? [
          model.boss.name,
          model.boss.hp.valueLabel,
          model.boss.phaseCounterLabel,
          model.boss.phaseLabel,
          model.boss.shieldLabel,
          model.boss.windowLabel,
          model.boss.weaknessLabel,
        ]
          .filter(Boolean)
          .join(" / ")
      : "";
  }
  setBar(refs.bossBar, model.boss?.hp);

  if (refs.devourPrompt) {
    refs.devourPrompt.hidden = model.devourPrompt?.visible !== true;
    refs.devourPrompt.dataset.enabled = model.devourPrompt?.canDevour === true ? "true" : "false";
    refs.devourPrompt.textContent = model.devourPrompt
      ? formatDevourPrompt(model.devourPrompt)
      : "";
  }

  setText(refs.objectiveTitle, model.objective.chapterTitle);
  setText(refs.objectiveBody, formatObjective(model.objective));
  setText(refs.warnings, model.warningText);
  setText(refs.statusLine, model.statusLine);

  return model;
}

export function formatCodeLifeHudForDebug(state: CodeLifeHudState): readonly string[] {
  const model = createCodeLifeHudRenderModel(state);

  return [
    `${model.objective.chapterTitle}: ${model.objective.primary}`,
    `${model.integrity.label} ${model.integrity.valueLabel}`,
    `${model.mass.label} ${model.mass.valueLabel} ${model.mass.instabilityLabel}`,
    model.currentAbility ? `ABILITY ${formatAbilityRender(model.currentAbility)}` : "ABILITY NONE",
    model.boss
      ? `BOSS ${model.boss.name} ${model.boss.phaseCounterLabel} ${model.boss.hp.valueLabel} ${model.boss.shieldLabel} ${model.boss.windowLabel}`.trim()
      : "BOSS NONE",
    model.devourPrompt?.visible ? `DEVOUR ${formatDevourPrompt(model.devourPrompt)}` : "DEVOUR NONE",
    model.warningText ? `WARN ${model.warningText}` : "WARN NONE",
  ];
}

function createBossHudState(
  payload: GameUiPayload,
  overrides: Partial<CodeLifeBossHudState> | undefined,
): CodeLifeBossHudState | undefined {
  if (!payload.currentBoss && !overrides?.id) {
    return undefined;
  }

  const sourceBoss = payload.currentBoss;
  const phaseIndex = Math.max(0, Math.round(overrides?.phaseIndex ?? 0));
  const phaseCount = Math.max(1, overrides?.phaseCount ?? sourceBoss?.phases.length ?? 1);

  return {
    id: overrides?.id ?? sourceBoss?.id ?? "boss",
    name: overrides?.name ?? sourceBoss?.name ?? "BOSS",
    hp: Math.max(0, overrides?.hp ?? sourceBoss?.hp ?? 1),
    maxHp: Math.max(1, overrides?.maxHp ?? sourceBoss?.hp ?? 1),
    phaseIndex,
    phaseCount,
    phaseLabel: overrides?.phaseLabel ?? sourceBoss?.phases[phaseIndex] ?? sourceBoss?.phases[0] ?? "PHASE",
    state: overrides?.state ?? "phase",
    shieldRatio: overrides?.shieldRatio ?? 0,
    window: overrides?.window,
    windowRemainingMs: overrides?.windowRemainingMs,
    weaknessLabel: overrides?.weaknessLabel,
  };
}

function createBossRender(boss: CodeLifeBossHudState): CodeLifeHudBossRender {
  return {
    name: boss.name,
    hp: createMeterRender({
      current: boss.hp,
      max: boss.maxHp,
      label: "BOSS",
      tone: boss.state === "enraged" ? "danger" : "boss",
    }),
    phaseLabel: boss.phaseLabel,
    phaseCounterLabel: `PHASE ${Math.min(boss.phaseIndex + 1, boss.phaseCount)}/${boss.phaseCount}`,
    state: boss.state,
    shieldRatio: clamp01(boss.shieldRatio ?? 0),
    shieldLabel: boss.shieldRatio !== undefined ? `ARMOR ${formatPercent(boss.shieldRatio)}` : "",
    windowLabel: formatBossWindow(boss.window, boss.windowRemainingMs),
    weaknessLabel: boss.weaknessLabel ? `WEAK ${boss.weaknessLabel}` : "",
  };
}

function createMeterRender(meter: CodeLifeHudMeterState): CodeLifeHudMeterRender {
  const ratio = getRatio(meter.current, meter.max);

  return {
    label: meter.label,
    valueLabel: `${Math.ceil(Math.max(0, meter.current))}/${Math.ceil(Math.max(1, meter.max))}`,
    ratio,
    tone: meter.tone ?? "stable",
  };
}

function createAbilityRender(ability: CodeLifeAbilityHudItem): CodeLifeHudAbilityRender {
  return {
    id: String(ability.id),
    label: ability.label,
    inputLabel: ability.inputLabel ?? "",
    readiness: ability.readiness,
    cooldownRatio: clamp01(ability.cooldownRatio),
    chargeRatio: clamp01(ability.chargeRatio ?? 0),
    isCurrent: ability.isCurrent === true,
    isNew: ability.isNew === true,
  };
}

function compactAbilityRenders(
  abilities: readonly CodeLifeHudAbilityRender[],
  currentAbility: CodeLifeHudAbilityRender | undefined,
): readonly CodeLifeHudAbilityRender[] {
  if (abilities.length <= VISIBLE_ABILITY_CHIP_LIMIT) {
    return abilities;
  }

  const selectedIds = new Set<string>();
  const selected: CodeLifeHudAbilityRender[] = [];
  const addAbility = (ability: CodeLifeHudAbilityRender | undefined): void => {
    if (!ability || selectedIds.has(ability.id)) {
      return;
    }
    selectedIds.add(ability.id);
    selected.push(ability);
  };

  for (const ability of abilities.slice(0, FOUNDATION_ABILITY_CHIP_COUNT)) {
    addAbility(ability);
  }
  addAbility(currentAbility);

  for (let index = abilities.length - 1; index >= 0 && selected.length < VISIBLE_ABILITY_CHIP_LIMIT - 1; index -= 1) {
    addAbility(abilities[index]);
  }

  const ordered = abilities.filter((ability) => selectedIds.has(ability.id));
  const hiddenCount = abilities.length - ordered.length;
  if (hiddenCount <= 0) {
    return ordered;
  }

  return [
    ...ordered,
    {
      id: "__overflow",
      label: `+${hiddenCount}`,
      inputLabel: "MEM",
      readiness: "charging",
      cooldownRatio: 0,
      chargeRatio: 0,
      isCurrent: false,
      isNew: false,
    },
  ];
}

function estimateMassFromPayload(payload: GameUiPayload): CodeLifeHudMassState {
  if (payload.chapter.index >= 3) {
    const mass = clampNumber(payload.state.codeLifeMass, 1, 0.68, 2.85);
    const form = createCodeLifeFormState(mass);
    const runtimeForm = payload.codeLifeForm;
    const max = 285;
    const current = Math.round(mass * 100);

    return {
      current,
      max,
      label: "MASS",
      segments: runtimeForm?.segments ?? form.segments,
      instability: clamp01(0.08 + payload.chapter.index * 0.015 + Math.max(0, mass - 1) * 0.08),
      formLabel: runtimeForm?.label ?? form.label,
      tierId: runtimeForm?.id ?? form.tier.id,
      tone: mass > 2.35 ? "warning" : "stable",
    };
  }

  const abilityWeight = payload.state.abilities.length * 8;
  const fragmentWeight = payload.state.memoryFragments * 2;
  const collectibleCount = payload.state.chapterCollectibles[payload.chapter.id] ?? 0;
  const current = 18 + abilityWeight + fragmentWeight + collectibleCount * 3;
  const max = 120 + payload.chapter.index * 8;

  return {
    current,
    max,
    label: "MASS",
    segments: Math.max(1, Math.ceil(current / 18)),
    instability: clamp01(0.08 + payload.chapter.index * 0.015 + (1 - getRatio(payload.state.integrity, payload.state.maxIntegrity)) * 0.25),
    tone: current / max > 0.82 ? "warning" : "stable",
  };
}

function getIntegrityTone(current: number, max: number): CodeLifeHudTone {
  const ratio = getRatio(current, max);

  if (ratio <= 0.26) {
    return "danger";
  }
  if (ratio <= 0.48) {
    return "warning";
  }
  return "stable";
}

function renderAbilityStrip(container: HTMLElement | undefined, abilities: readonly CodeLifeHudAbilityRender[]): void {
  if (!container) {
    return;
  }

  const doc = container.ownerDocument;
  container.replaceChildren(
    ...abilities.map((ability) => {
      const chip = doc.createElement("span");
      chip.dataset.id = ability.id;
      chip.dataset.readiness = ability.readiness;
      chip.dataset.current = ability.isCurrent ? "true" : "false";
      chip.dataset.new = ability.isNew ? "true" : "false";
      chip.textContent = formatAbilityRender(ability);
      return chip;
    }),
  );
}

function setBar(element: HTMLElement | undefined, meter: CodeLifeHudMeterRender | undefined): void {
  if (!element) {
    return;
  }

  element.hidden = !meter;
  if (!meter) {
    return;
  }

  element.style.width = formatPercent(meter.ratio);
  element.dataset.tone = meter.tone;
}

function setText(element: HTMLElement | undefined, text: string): void {
  if (!element) {
    return;
  }

  element.textContent = text;
  element.hidden = text.length === 0;
}

function formatAbilityRender(ability: CodeLifeHudAbilityRender): string {
  const label = ability.inputLabel ? `${ability.inputLabel} ${ability.label}` : ability.label;
  return ability.isNew ? `NEW ${label}` : label;
}

function formatDevourPrompt(prompt: CodeLifeDevourPromptState): string {
  const hold = `HOLD ${formatPercent(prompt.holdRatio)}`;
  const reward = prompt.rewardPreview ? ` -> ${prompt.rewardPreview}` : "";
  const state = prompt.canDevour ? "READY" : "BLOCKED";
  return `${prompt.actionLabel} ${prompt.targetLabel} / ${hold} / ${state}${reward}`;
}

function formatBossWindow(window: CodeLifeBossHudState["window"], windowRemainingMs: number | undefined): string {
  if (!window || window === "closed") {
    return "";
  }
  const seconds = Number.isFinite(windowRemainingMs) ? Math.max(0, (windowRemainingMs ?? 0) / 1000).toFixed(1) : "";
  return `WINDOW ${window.toUpperCase()}${seconds ? ` ${seconds}s` : ""}`;
}

function formatObjective(objective: CodeLifeObjectiveHudState): string {
  return [
    objective.primary,
    objective.secondary,
    objective.progressLabel,
    objective.exitLabel ? `EXIT ${objective.exitLabel}` : undefined,
  ]
    .filter(Boolean)
    .join(" / ");
}

function formatAbilityId(id: AbilityId | string): string {
  return String(id).replaceAll("-", " ").toUpperCase();
}

function getRatio(current: number, max: number): number {
  return clamp01(current / Math.max(1, max));
}

function formatPercent(value: number): string {
  return `${Math.round(clamp01(value) * 100)}%`;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

function clampNumber(value: number, fallback: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}
