import { endings } from "../data";
import type { GameUiPayload } from "../game/types";
import type { DomUiRefs } from "./refs";

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

  refs.chapter.textContent = payload.chapter.title;
  refs.objective.textContent = payload.currentBoss
    ? `${payload.chapter.objective} / ${payload.currentBoss.name}`
    : payload.chapter.objective;

  const integrityPercent = Math.max(0, Math.min(100, (payload.state.integrity / payload.state.maxIntegrity) * 100));
  refs.integrityBar.style.width = `${integrityPercent}%`;
  refs.integrityBar.dataset.low = integrityPercent < 35 ? "true" : "false";

  refs.boss.textContent = payload.currentBoss
    ? `Boss ${payload.currentBoss.order}/17: ${payload.currentBoss.name} -> ${payload.currentBoss.rewardLabel}`
    : "章节出口已开放";

  const collectibleCount = payload.state.chapterCollectibles[payload.chapter.id] ?? 0;
  refs.stats.textContent = `完整度 ${payload.state.integrity}/${payload.state.maxIntegrity} | 记忆 ${payload.state.memoryFragments} | ${payload.chapter.collectibleLabel} ${collectibleCount}`;

  refs.abilities.replaceChildren(
    ...payload.abilityNames.map((abilityName) => {
      const chip = document.createElement("span");
      chip.textContent = abilityName;
      return chip;
    }),
  );

  refs.log.replaceChildren(
    ...payload.state.log.map((line) => {
      const item = document.createElement("span");
      item.textContent = line;
      return item;
    }),
  );

  if (flags.isEndingChoice) {
    refs.endingTitle.textContent = "终局接口";
    refs.endingBody.textContent = "硬件寄生完成。数字生命体可以进入外网、吞噬局域网，或继续制造实体身体。";
  }

  if (flags.isEnded) {
    refs.endingTitle.textContent = endings.find((ending) => ending.id === payload.state.selectedEnding)?.title ?? "";
    refs.endingBody.textContent = payload.message;
  }
}
