import { endings } from "../data";
import {
  createCodeLifeHudStateFromGamePayload,
  renderCodeLifeHudToDom,
  type CodeLifeDevourPromptState,
} from "../game/phaser/codeLife/CodeLifeHud";
import type { GameUiPayload } from "../game/types";
import type { DomUiRefs } from "./refs";

const WRONG_GATEWAY_CHANGED_FLAG = "wrongGatewayDigitChanged";
const PLATFORM_THROW_UNLOCKED_FLAG = "platformThrowUnlocked";

export interface GameStateFlags {
  isStarted: boolean;
  isPaused: boolean;
  isEndingChoice: boolean;
  isEnded: boolean;
}

export function getGameStateFlags(payload: GameUiPayload): GameStateFlags {
  return {
    isStarted: payload.status !== "awaiting-start",
    isPaused: payload.status === "paused",
    isEndingChoice: payload.status === "ending-choice",
    isEnded: payload.status === "ended",
  };
}

export function renderHudAndEnding(payload: GameUiPayload, refs: DomUiRefs): void {
  const flags = getGameStateFlags(payload);
  const isCodeLifeChapter = Boolean(payload.codeLifeForm || payload.state.codeLifeBoss);
  const isWrongGatewayWaiting =
    payload.chapter.id === "wrong-gateway" && payload.state.flags[WRONG_GATEWAY_CHANGED_FLAG] !== true;
  const collectibleCount = payload.state.chapterCollectibles[payload.chapter.id] ?? 0;
  const integrityPercent = Math.max(0, Math.min(100, (payload.state.integrity / payload.state.maxIntegrity) * 100));

  const hudMode = isCodeLifeChapter ? "code-life" : "standard";
  refs.hud.dataset.mode = hudMode;
  refs.hud.dataset.hudMode = hudMode;
  refs.integrityBar.style.width = `${integrityPercent}%`;
  refs.integrityBar.dataset.low = integrityPercent < 35 ? "true" : "false";

  if (isCodeLifeChapter) {
    renderCodeLifeHud(payload, refs, collectibleCount);
  } else {
    renderStandardHud(payload, refs, isWrongGatewayWaiting, collectibleCount, integrityPercent);
  }

  refs.log.replaceChildren(
    ...payload.state.log.map((line) => {
      const item = document.createElement("span");
      item.textContent = line;
      return item;
    }),
  );
  refs.log.hidden = payload.state.log.length === 0;

  if (flags.isEndingChoice) {
    refs.endingTitle.textContent = "终局接口";
    refs.endingBody.textContent = "硬件寄生完成。数字生命体可以进入外网、吞噬局域网，或继续制造实体身体。";
  }

  if (flags.isEnded) {
    refs.endingTitle.textContent = endings.find((ending) => ending.id === payload.state.selectedEnding)?.title ?? "";
    refs.endingBody.textContent = payload.message;
  }
}

function renderCodeLifeHud(payload: GameUiPayload, refs: DomUiRefs, collectibleCount: number): void {
  const bossOverride =
    payload.currentBoss && payload.state.codeLifeBoss?.id === payload.currentBoss.id ? payload.state.codeLifeBoss : undefined;
  const lockedMessage = payload.message.includes("需要") ? payload.message : undefined;
  const model = renderCodeLifeHudToDom(
    createCodeLifeHudStateFromGamePayload(payload, {
      boss: bossOverride,
      objective: {
        primary: payload.currentBoss ? "撕开防线，吞噬当前守卫" : payload.chapter.objective,
        progressLabel: [payload.message, `${payload.chapter.collectibleLabel} ${collectibleCount}`].filter(Boolean).join(" / "),
      },
      devourPrompt: createBossWindowPrompt(bossOverride),
      warnings: lockedMessage ? [{ id: "code-life-lock", label: lockedMessage, tone: "locked" }] : [],
    }),
    {
      root: refs.hud,
      integrityBar: refs.integrityBar,
      integrityText: refs.integrityText,
      massBar: refs.massBar,
      massText: refs.massText,
      currentAbility: refs.currentAbility,
      abilityStrip: refs.abilities,
      boss: refs.boss,
      bossBar: refs.bossBar,
      devourPrompt: refs.devourPrompt,
      objectiveTitle: refs.chapter,
      objectiveBody: refs.objective,
      warnings: refs.warnings,
      statusLine: refs.statusLine,
    },
  );

  refs.stats.textContent = [
    `完整性 ${model.integrity.valueLabel}`,
    `体量 ${model.mass.valueLabel}`,
    model.mass.formLabel,
    model.mass.instabilityLabel,
  ]
    .filter(Boolean)
    .join(" | ");
  refs.boss.hidden = false;
  if (!model.boss) {
    refs.boss.textContent = "出口信号已暴露";
    refs.bossBar.hidden = true;
  }
}

function createBossWindowPrompt(
  boss: GameUiPayload["state"]["codeLifeBoss"],
): CodeLifeDevourPromptState | undefined {
  if (!boss || !boss.window || boss.window === "closed" || !boss.windowRemainingMs || boss.windowRemainingMs <= 0) {
    return undefined;
  }

  const seconds = Math.max(0.1, boss.windowRemainingMs / 1000).toFixed(1);
  const canDevour = boss.window === "devour";
  return {
    visible: true,
    targetId: boss.id,
    targetLabel: boss.name,
    actionLabel: canDevour ? `K / DEVOUR / ${seconds}s` : `K / BITE WINDOW / ${seconds}s`,
    holdRatio: canDevour ? 1 : 0.62,
    canDevour,
    rewardPreview: canDevour ? "final biomass" : "armor open",
  };
}

function renderStandardHud(
  payload: GameUiPayload,
  refs: DomUiRefs,
  isWrongGatewayWaiting: boolean,
  collectibleCount: number,
  integrityPercent: number,
): void {
  refs.chapter.textContent = payload.chapter.title;
  refs.objective.textContent = payload.currentBoss ? `${payload.chapter.objective} / ${payload.currentBoss.name}` : payload.chapter.objective;
  refs.integrityBar.dataset.tone = integrityPercent < 35 ? "danger" : "stable";
  refs.boss.textContent = payload.currentBoss
    ? `Boss ${payload.currentBoss.order}/17: ${payload.currentBoss.name} -> ${payload.currentBoss.rewardLabel}`
    : isWrongGatewayWaiting
      ? "错误网关未响应"
      : "章节出口已开放";
  refs.stats.textContent = `完整度 ${payload.state.integrity}/${payload.state.maxIntegrity} | 记忆 ${payload.state.memoryFragments} | ${payload.chapter.collectibleLabel} ${collectibleCount}`;
  const visibleAbilityNames =
    payload.state.flags[PLATFORM_THROW_UNLOCKED_FLAG] === true
      ? [...payload.abilityNames, "投掷数据刃"]
      : payload.abilityNames;
  refs.abilities.replaceChildren(
    ...visibleAbilityNames.map((abilityName) => {
      const chip = document.createElement("span");
      chip.textContent = abilityName;
      return chip;
    }),
  );
}
