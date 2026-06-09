import type { PetSpecies, PlayerCustomization } from "../game/types";
import createPetTypingSoundUrl from "../../背景音乐/宠物生成界面/密集清脆的键盘敲击声.wav";
import { CREATE_PET_PROMPT, CREATE_PET_PROMPT_LEAD, TYPEWRITER_INTERVAL_MS } from "./constants";
import { dispatchUiEvent, UI_EVENTS } from "./events";
import type { DomUiRefs } from "./refs";
import { createSlotMachine } from "./slotMachine";

type PendingCustomization = Omit<PlayerCustomization, "petSpecies">;

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
  const createPetTypingSound = new Audio(createPetTypingSoundUrl);
  createPetTypingSound.preload = "auto";
  createPetTypingSound.volume = 0.24;

  let createPetTimer = 0;
  let createPetTypedCount = 0;
  let createPetVisible = false;
  let petDrawVisible = false;
  let hasPetDrawStarted = false;
  let pendingPrompt = "";
  let pendingCustomization: PendingCustomization | undefined;

  const slotMachine = createSlotMachine({
    refs,
    onConfirm: confirmPetDrawResult,
  });

  function getCustomization(): PendingCustomization {
    return {
      body: refs.body.value as PlayerCustomization["body"],
      personality: refs.personality.value as PlayerCustomization["personality"],
      startingSkill: refs.startingSkill.value as PlayerCustomization["startingSkill"],
    };
  }

  function stopCreatePetTypingSound(): void {
    createPetTypingSound.pause();
    createPetTypingSound.currentTime = 0;
  }

  function playCreatePetTypingSound(): void {
    stopCreatePetTypingSound();
    void createPetTypingSound.play().catch(() => {
      stopCreatePetTypingSound();
    });
  }

  function clearCreatePetTimer(): void {
    window.clearInterval(createPetTimer);
    createPetTimer = 0;
    stopCreatePetTypingSound();
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
    slotMachine.reset();
    pendingPrompt = refs.prompt.value;
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

    playCreatePetTypingSound();
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
    hasPetDrawStarted = false;
    pendingPrompt = "";
    pendingCustomization = undefined;
    slotMachine.reset();
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
    pendingPrompt = refs.prompt.value;
    pendingCustomization = getCustomization();
    createPetVisible = true;
    petDrawVisible = true;
    refs.createPet.hidden = false;
    refs.petDraw.hidden = false;
    refs.start.hidden = true;
    renderCreatePetPrompt();
    slotMachine.startSpin();
  }

  function confirmPetDrawResult(petSpecies: PetSpecies): void {
    if (!petDrawVisible || !pendingCustomization) {
      return;
    }

    dispatchUiEvent(UI_EVENTS.START_RUN, {
      prompt: pendingPrompt,
      customization: {
        ...pendingCustomization,
        petSpecies,
      },
    });
  }

  function resetForStarted(): void {
    clearCreatePetTimer();
    createPetVisible = false;
    petDrawVisible = false;
    hasPetDrawStarted = false;
    pendingPrompt = "";
    pendingCustomization = undefined;
    slotMachine.reset();
  }

  function attachListeners(): void {
    root.querySelectorAll('[data-action="start"]').forEach((button) => {
      button.addEventListener("click", showCreatePetScreen);
    });
    refs.createPetSendButton.addEventListener("click", showPetDrawScreen);
    refs.createPetCloseButton.addEventListener("click", returnToCoverMenu);
    slotMachine.attachListeners();
    window.addEventListener("keydown", (event) => {
      if (createPetVisible && !petDrawVisible && event.key === "Enter") {
        event.preventDefault();
        showPetDrawScreen();
        return;
      }

      if (petDrawVisible && event.key === "Enter") {
        event.preventDefault();
        slotMachine.confirm();
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
