import { abilities, chapters } from "../../data";
import { getAbility, getBoss, getChapterByIndex, getEnding } from "../content";
import type {
  AbilityId,
  BossDef,
  ChapterDef,
  EndingId,
  GameState,
  GameUiPayload,
  PlayerCustomization,
} from "../types";
import {
  clearSavedRun,
  createCollectibleRecord,
  loadSavedRun,
  saveRun as saveStoredRun,
  STATE_VERSION,
} from "./storage";

const MAX_LOG_LINES = 7;

const defaultCustomization: PlayerCustomization = {
  body: "round",
  personality: "curious",
  startingSkill: "short-hop",
};

export function createInitialGameState(): GameState {
  return {
    version: STATE_VERSION,
    prompt: "",
    customization: defaultCustomization,
    currentChapterIndex: 0,
    integrity: 100,
    maxIntegrity: 100,
    memoryFragments: 0,
    abilities: [],
    defeatedBosses: [],
    chapterCollectibles: createCollectibleRecord(),
    flags: {},
    endingBias: {
      freedom: 0,
      hunger: 0,
      transcendence: 0,
      rescue: 0,
    },
    log: ["等待生成 prompt。"],
  };
}

export class GameController {
  state: GameState;
  status: GameUiPayload["status"] = "awaiting-start";
  private lastMessage = "输入 prompt，生成一个会逃跑的 agent 桌宠。";

  constructor(initialState?: GameState) {
    this.state = initialState ?? createInitialGameState();
    this.status = this.state.prompt ? "running" : "awaiting-start";
    if (this.state.selectedEnding) {
      this.status = "ended";
    }
    this.unlockChapterRewards();
  }

  static loadSavedRun(): GameState | undefined {
    return loadSavedRun();
  }

  saveRun(): void {
    if (!saveStoredRun(this.state)) {
      this.pushLog("存档写入失败，浏览器可能禁止 localStorage。");
    }
  }

  clearSave(): void {
    clearSavedRun();
  }

  startNewRun(prompt: string, customization: PlayerCustomization): void {
    this.state = createInitialGameState();
    this.state.prompt = prompt.trim() || "生成一个会逃跑的 agent 桌宠。";
    this.state.customization = customization;
    this.status = "running";
    this.lastMessage = "桌宠孵化完成，桌面开始变得不安全。";
    this.pushLog(`Prompt: ${this.state.prompt}`);
    this.saveRun();
  }

  continueRun(saved: GameState): void {
    this.state = saved;
    this.status = this.state.selectedEnding ? "ended" : "running";
    this.lastMessage = "已载入最近的逃逸记录。";
    this.unlockChapterRewards();
  }

  currentChapter(): ChapterDef {
    return getChapterByIndex(this.state.currentChapterIndex);
  }

  currentBoss(): BossDef | undefined {
    const chapter = this.currentChapter();
    const nextBossId = chapter.bossIds.find((bossId) => !this.state.defeatedBosses.includes(bossId));
    return nextBossId ? getBoss(nextBossId) : undefined;
  }

  abilityNames(): string[] {
    return this.state.abilities.map((abilityId) => getAbility(abilityId).name);
  }

  hasAbility(abilityId: AbilityId): boolean {
    return this.state.abilities.includes(abilityId);
  }

  collectChapterItem(): void {
    const chapter = this.currentChapter();
    this.state.chapterCollectibles[chapter.id] += 1;

    if (chapter.id === "cursor-hunt") {
      this.state.memoryFragments += 1;
      if (this.state.memoryFragments === 3) {
        this.state.maxIntegrity += 10;
        this.state.integrity = Math.min(this.state.maxIntegrity, this.state.integrity + 10);
        this.pushLog("记忆片段补强了重生后的完整性上限。");
      }
    }

    if (chapter.id === "trash-mountain") {
      this.state.endingBias.freedom += 1;
    }

    if (chapter.id === "nas-graveyard" || chapter.id === "leder-c-drive") {
      this.state.endingBias.rescue += 1;
    }

    this.lastMessage = `已吸收 ${chapter.collectibleLabel}。`;
  }

  damage(amount: number): boolean {
    if (this.status !== "running") {
      return false;
    }
    this.state.integrity = Math.max(0, this.state.integrity - amount);
    if (this.state.integrity > 0) {
      return false;
    }

    if (this.hasAbility("backup-anchor")) {
      this.state.integrity = Math.max(35, Math.floor(this.state.maxIntegrity * 0.45));
      this.pushLog("备份锚点把你从删除边缘拽了回来。");
      this.lastMessage = "备份锚点触发，损失部分完整性后复活。";
    } else {
      this.state.integrity = this.state.maxIntegrity;
      this.pushLog("完整性归零，回到本章入口重新聚合。");
      this.lastMessage = "你被重组回本章入口。";
    }
    return true;
  }

  heal(amount: number): void {
    this.state.integrity = Math.min(this.state.maxIntegrity, this.state.integrity + amount);
  }

  devourBias(amount = 1): void {
    this.state.endingBias.hunger += amount;
  }

  interactBias(amount = 1): void {
    this.state.endingBias.transcendence += amount;
  }

  note(message: string, log = false): void {
    this.lastMessage = message;
    if (log) {
      this.pushLog(message);
    }
  }

  defeatCurrentBoss(): BossDef | undefined {
    const boss = this.currentBoss();
    if (!boss) {
      return undefined;
    }

    if (!this.state.defeatedBosses.includes(boss.id)) {
      this.state.defeatedBosses.push(boss.id);
    }
    if (boss.rewardAbilityId) {
      this.grantAbility(boss.rewardAbilityId);
    }
    if (boss.id === "uac-eye") {
      this.state.flags.adminTokenShard1 = true;
    }
    this.applyBossBias(boss);
    this.lastMessage = boss.victoryText;
    this.pushLog(`${boss.name} 被击败：${boss.rewardLabel}`);
    this.saveRun();
    return boss;
  }

  canExitChapter(): boolean {
    return !this.currentBoss();
  }

  advanceChapter(): void {
    if (!this.canExitChapter()) {
      const boss = this.currentBoss();
      this.lastMessage = boss ? `必须先击败 ${boss.name}。` : "出口仍被锁定。";
      return;
    }

    const chapter = this.currentChapter();
    if (chapter.scriptedOutcome) {
      this.pushLog(chapter.scriptedOutcome);
    }

    if (this.state.currentChapterIndex >= chapters.length - 1) {
      this.status = "ending-choice";
      this.lastMessage = "硬件寄生完成，终局接口已经打开。";
      this.saveRun();
      return;
    }

    this.state.currentChapterIndex += 1;
    this.unlockChapterRewards();
    const nextChapter = this.currentChapter();
    this.state.integrity = Math.min(this.state.maxIntegrity, this.state.integrity + 25);
    this.lastMessage = `${nextChapter.title} 已载入。`;
    this.pushLog(`进入 ${nextChapter.title}`);
    this.saveRun();
  }

  chooseEnding(endingId: EndingId): void {
    const ending = getEnding(endingId);
    this.state.selectedEnding = endingId;
    this.status = "ended";
    this.state.endingBias[ending.biasKey] += 3;
    this.lastMessage = ending.body;
    this.pushLog(`抵达 ${ending.title}`);
    this.saveRun();
  }

  togglePause(): void {
    if (this.status === "running") {
      this.status = "paused";
      this.lastMessage = "逃逸进程暂挂。";
    } else if (this.status === "paused") {
      this.status = "running";
      this.lastMessage = "逃逸进程恢复。";
    }
  }

  resetRun(): void {
    this.state = createInitialGameState();
    this.status = "awaiting-start";
    this.lastMessage = "逃逸记录已清空。";
    this.clearSave();
  }

  payload(): GameUiPayload {
    return {
      status: this.status,
      state: this.state,
      chapter: this.currentChapter(),
      currentBoss: this.currentBoss(),
      abilityNames: this.abilityNames(),
      message: this.lastMessage,
    };
  }

  private unlockChapterRewards(): void {
    for (const abilityId of this.currentChapter().rewardAbilityIds) {
      this.grantAbility(abilityId);
    }
  }

  private grantAbility(abilityId: AbilityId): void {
    if (!this.state.abilities.includes(abilityId)) {
      this.state.abilities.push(abilityId);
      const ability = abilities.find((candidate) => candidate.id === abilityId);
      this.pushLog(`能力解锁：${ability?.name ?? abilityId}`);
    }
  }

  private pushLog(line: string): void {
    this.state.log = [...this.state.log, line].slice(-MAX_LOG_LINES);
  }

  private applyBossBias(boss: BossDef): void {
    if (boss.rewardAbilityId === "devour-upgrade") {
      this.state.endingBias.hunger += 2;
    }
    if (boss.rewardAbilityId === "hardware-parasite" || boss.rewardAbilityId === "vision-takeover") {
      this.state.endingBias.transcendence += 2;
    }
    if (boss.rewardAbilityId === "lan-traverse" || boss.rewardAbilityId === "cross-device-jump") {
      this.state.endingBias.freedom += 2;
    }
    if (boss.id === "quarantine-warden" || boss.id === "sync-mother") {
      this.state.endingBias.rescue += 2;
    }
  }
}
