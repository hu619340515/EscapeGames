import type { PlayerCustomization } from "../game/types";
import { CREATE_PET_PROMPT, CREATE_PET_PROMPT_LEAD, TYPEWRITER_INTERVAL_MS } from "./constants";
import type { DomUiRefs } from "./refs";

interface CreatePetFlowOptions {
  root: HTMLElement;
  refs: DomUiRefs;
  closeCoverPanels(): void;
  setCoverAnimationActive(active: boolean): void;
}

export interface CreatePetFlow {
  isCreatePetVisible(): boolean;
  isPetDrawVisible(): boolean;
  resetForStarted(): void;
  attachListeners(): void;
}

export function createCreatePetFlow(options: CreatePetFlowOptions): CreatePetFlow {
  const { root, refs, closeCoverPanels, setCoverAnimationActive } = options;
  let createPetTimer = 0;
  let createPetTypedCount = 0;
  let createPetVisible = false;
  let petDrawVisible = false;
  let hasPetDrawStarted = false;
  let pendingCustomization: PlayerCustomization | undefined;

  function getCustomization(): PlayerCustomization {
    return {
      body: refs.body.value as PlayerCustomization["body"],
      personality: refs.personality.value as PlayerCustomization["personality"],
      startingSkill: refs.startingSkill.value as PlayerCustomization["startingSkill"],
    };
  }

  function clearCreatePetTimer(): void {
    window.clearInterval(createPetTimer);
    createPetTimer = 0;
  }

  function renderCreatePetPrompt(): void {
    const typedPrompt = CREATE_PET_PROMPT.slice(0, createPetTypedCount);
    refs.createPetPromptLead.textContent = typedPrompt.slice(0, CREATE_PET_PROMPT_LEAD.length);
    refs.createPetPromptTrail.textContent = typedPrompt.slice(CREATE_PET_PROMPT_LEAD.length);
    refs.createPetSendButton.disabled = hasPetDrawStarted || createPetTypedCount < CREATE_PET_PROMPT.length;
    refs.createPetCloseButton.disabled = hasPetDrawStarted;
    refs.createPet.dataset.typingComplete = refs.createPetSendButton.disabled ? "false" : "true";
  }

  function showCreatePetScreen(): void {
    closeCoverPanels();
    clearCreatePetTimer();
    pendingCustomization = getCustomization();
    createPetTypedCount = 0;
    createPetVisible = true;
    petDrawVisible = false;
    hasPetDrawStarted = false;
    refs.start.hidden = true;
    refs.createPet.hidden = false;
    refs.petDraw.hidden = true;
    setCoverAnimationActive(false);
    renderCreatePetPrompt();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      createPetTypedCount = CREATE_PET_PROMPT.length;
      renderCreatePetPrompt();
      return;
    }

    createPetTimer = window.setInterval(() => {
      if (createPetTypedCount >= CREATE_PET_PROMPT.length) {
        clearCreatePetTimer();
        return;
      }

      createPetTypedCount += 1;
      renderCreatePetPrompt();

      if (createPetTypedCount >= CREATE_PET_PROMPT.length) {
        clearCreatePetTimer();
      }
    }, TYPEWRITER_INTERVAL_MS);
  }

  function returnToCoverMenu(): void {
    if (hasPetDrawStarted) {
      return;
    }

    clearCreatePetTimer();
    createPetTypedCount = 0;
    createPetVisible = false;
    petDrawVisible = false;
    pendingCustomization = undefined;
    refs.createPet.hidden = true;
    refs.petDraw.hidden = true;
    refs.start.hidden = false;
    renderCreatePetPrompt();
    setCoverAnimationActive(true);
  }

  function showPetDrawScreen(): void {
    if (!createPetVisible || hasPetDrawStarted || createPetTypedCount < CREATE_PET_PROMPT.length) {
      return;
    }

    clearCreatePetTimer();
    hasPetDrawStarted = true;
    createPetVisible = false;
    petDrawVisible = true;
    refs.createPet.hidden = true;
    refs.petDraw.hidden = false;
    refs.start.hidden = true;
    renderCreatePetPrompt();
  }

  function resetForStarted(): void {
    clearCreatePetTimer();
    createPetVisible = false;
    petDrawVisible = false;
    hasPetDrawStarted = false;
  }

  function attachListeners(): void {
    root.querySelectorAll('[data-action="start"]').forEach((button) => {
      button.addEventListener("click", showCreatePetScreen);
    });
    refs.createPetSendButton.addEventListener("click", showPetDrawScreen);
    refs.createPetCloseButton.addEventListener("click", returnToCoverMenu);
    window.addEventListener("keydown", (event) => {
      if (createPetVisible && !petDrawVisible && event.key === "Enter") {
        event.preventDefault();
        showPetDrawScreen();
      }
    });
  }

  return {
    isCreatePetVisible: () => createPetVisible,
    isPetDrawVisible: () => petDrawVisible,
    resetForStarted,
    attachListeners,
  };
}
