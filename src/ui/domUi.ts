import type { EndingId } from "../game/types";
import { createCoverAnimation } from "./coverAnimation";
import { createCoverController } from "./coverController";
import { createCoverMusicController } from "./coverMusic";
import { createCreatePetFlow } from "./createPetFlow";
import { addGameStateListener, dispatchUiEvent, type GmFeature, UI_EVENTS } from "./events";
import { getGameStateFlags, renderHudAndEnding } from "./gameStateRenderer";
import { collectDomUiRefs } from "./refs";
import { renderDomUiTemplate } from "./template";

export function createDomUi(root: HTMLElement): void {
  root.innerHTML = renderDomUiTemplate();

  const refs = collectDomUiRefs(root);
  const coverAnimation = createCoverAnimation(refs.coverStage);
  const coverMusic = createCoverMusicController();
  const coverController = createCoverController({
    root,
    coverStage: refs.coverStage,
    achievementsBody: refs.achievementsBody,
    coverToast: refs.coverToast,
    continueButton: refs.continueButton,
  });
  const createPetFlow = createCreatePetFlow({
    root,
    refs,
    closeCoverPanels: coverController.closePanels,
    setCoverAnimationActive: (active) => {
      coverAnimation.setActive(active);
      coverMusic.setKeyboardActive(active);
    },
  });

  createPetFlow.attachListeners();

  refs.continueButton.addEventListener("click", () => {
    coverMusic.setKeyboardActive(false);
    dispatchUiEvent(UI_EVENTS.CONTINUE_RUN);
  });
  root.querySelector('[data-action="pause"]')!.addEventListener("click", () => dispatchUiEvent(UI_EVENTS.TOGGLE_PAUSE));
  root.querySelector('[data-action="resume"]')!.addEventListener("click", () => dispatchUiEvent(UI_EVENTS.TOGGLE_PAUSE));
  root.querySelector('[data-action="save"]')!.addEventListener("click", () => dispatchUiEvent(UI_EVENTS.SAVE_RUN));
  root.querySelector('[data-action="reset"]')!.addEventListener("click", () => dispatchUiEvent(UI_EVENTS.RESET_RUN));
  root.querySelector('[data-action="reset-ending"]')!.addEventListener("click", () => dispatchUiEvent(UI_EVENTS.RESET_RUN));
  root.querySelector('[data-action="gm-reset"]')!.addEventListener("click", () => dispatchUiEvent(UI_EVENTS.RESET_RUN));
  root.querySelectorAll<HTMLButtonElement>('[data-action="gm-toggle"]').forEach((button) => {
    button.addEventListener("click", () => {
      const enabled = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", String(enabled));
      button.dataset.active = String(enabled);
      dispatchUiEvent(UI_EVENTS.TOGGLE_GM_FEATURE, {
        feature: button.dataset.gmFeature as GmFeature,
        enabled,
      });
    });
  });
  root.querySelector('[data-action="cover-options"]')!.addEventListener("click", () => {
    coverController.refreshContinueState();
    coverController.showPanel("options");
  });
  root.querySelector('[data-action="cover-achievements"]')!.addEventListener("click", () => {
    coverController.renderAchievements();
    coverController.showPanel("achievements");
  });
  root.querySelector('[data-action="cover-exit"]')!.addEventListener("click", coverController.attemptExit);
  root.querySelectorAll('[data-action="close-cover-panel"]').forEach((button) => {
    button.addEventListener("click", coverController.closePanels);
  });
  root.querySelectorAll<HTMLButtonElement>("[data-ending]").forEach((button) => {
    button.addEventListener("click", () => {
      dispatchUiEvent(UI_EVENTS.CHOOSE_ENDING, { endingId: button.dataset.ending as EndingId });
    });
  });

  addGameStateListener((payload) => {
    const flags = getGameStateFlags(payload);

    if (flags.isStarted) {
      createPetFlow.resetForStarted();
    }

    refs.hud.hidden = !flags.isStarted || flags.isEnded;
    refs.start.hidden = flags.isStarted || createPetFlow.isCreatePetVisible() || createPetFlow.isPetDrawVisible();
    refs.createPet.hidden = flags.isStarted || !createPetFlow.isCreatePetVisible();
    refs.petDraw.hidden = flags.isStarted || !createPetFlow.isPetDrawVisible();
    refs.pause.hidden = !flags.isPaused;
    refs.ending.hidden = !(flags.isEndingChoice || flags.isEnded);
    const isCoverAnimationActive =
      !flags.isStarted && !createPetFlow.isCreatePetVisible() && !createPetFlow.isPetDrawVisible();
    coverAnimation.setActive(isCoverAnimationActive);
    coverMusic.setActive(!flags.isStarted);
    coverMusic.setKeyboardActive(isCoverAnimationActive);

    if (!flags.isStarted) {
      coverController.refreshContinueState();
      coverController.renderAchievements();
    }

    renderHudAndEnding(payload, refs);
  });

  coverController.refreshContinueState();
  coverController.renderAchievements();
  coverMusic.setActive(true);
  coverMusic.setKeyboardActive(true);
}
