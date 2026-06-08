import { bosses, chapters, endings } from "../data";
import { hasSavedRun, loadSavedRun } from "../game/simulation/storage";
import type { EndingId } from "../game/types";

interface CoverControllerOptions {
  root: HTMLElement;
  coverStage: HTMLElement;
  achievementsBody: HTMLElement;
  coverToast: HTMLElement;
  continueButton: HTMLButtonElement;
}

export interface CoverController {
  closePanels(): void;
  showPanel(name: "options" | "achievements"): void;
  showToast(message: string): void;
  refreshContinueState(): void;
  renderAchievements(): void;
  attemptExit(): void;
}

function getEndingTitle(id?: EndingId): string {
  return endings.find((ending) => ending.id === id)?.title ?? "";
}

function createStatRow(label: string, value: string): HTMLElement {
  const row = document.createElement("div");
  row.className = "cover-stat";

  const labelEl = document.createElement("span");
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.textContent = value;

  row.append(labelEl, valueEl);
  return row;
}

export function createCoverController(options: CoverControllerOptions): CoverController {
  const { root, coverStage, achievementsBody, coverToast, continueButton } = options;
  let toastTimer = 0;

  function closePanels(): void {
    delete coverStage.dataset.coverSelection;
    root.querySelectorAll<HTMLElement>("[data-cover-panel]").forEach((panel) => {
      panel.hidden = true;
    });
  }

  function showPanel(name: "options" | "achievements"): void {
    coverStage.dataset.coverSelection = name;
    root.querySelectorAll<HTMLElement>("[data-cover-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.coverPanel !== name;
    });
  }

  function showToast(message: string): void {
    window.clearTimeout(toastTimer);
    coverToast.textContent = message;
    coverToast.dataset.visible = "true";
    toastTimer = window.setTimeout(() => {
      delete coverToast.dataset.visible;
    }, 2200);
  }

  function refreshContinueState(): void {
    continueButton.disabled = !hasSavedRun();
  }

  function renderAchievements(): void {
    const saved = loadSavedRun();
    if (!saved) {
      achievementsBody.replaceChildren(createStatRow("记录", "尚未生成逃逸进程"));
      return;
    }

    const chapterIndex = Math.max(0, Math.min(chapters.length - 1, saved.currentChapterIndex ?? 0));
    const currentChapter = chapters[chapterIndex];
    const defeatedBosses = saved.defeatedBosses?.length ?? 0;
    const unlockedAbilities = saved.abilities?.length ?? 0;
    const fragments = saved.memoryFragments ?? 0;
    const collectibleCount = Object.values(saved.chapterCollectibles ?? {}).reduce(
      (total, value) => total + (typeof value === "number" ? value : 0),
      0,
    );

    achievementsBody.replaceChildren(
      createStatRow("章节", `${chapterIndex + 1}/${chapters.length} · ${currentChapter.shortTitle}`),
      createStatRow("Boss", `${defeatedBosses}/${bosses.length}`),
      createStatRow("能力", `${unlockedAbilities} 项`),
      createStatRow("记忆", `${fragments} 个片段`),
      createStatRow("收集", `${collectibleCount} 个节点`),
      createStatRow("结局", saved.selectedEnding ? getEndingTitle(saved.selectedEnding) : "未抵达"),
    );
  }

  function attemptExit(): void {
    window.close();
    window.setTimeout(() => {
      showToast("浏览器阻止了关闭窗口，可以直接关闭标签页。");
    }, 120);
  }

  return {
    closePanels,
    showPanel,
    showToast,
    refreshContinueState,
    renderAchievements,
    attemptExit,
  };
}
