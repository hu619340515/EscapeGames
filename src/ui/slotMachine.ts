import type { PetSpecies } from "../game/types";
import type { DomUiRefs } from "./refs";

const RESULT_PETS: PetSpecies[] = ["pig", "cat", "panda"];
const PET_REEL_INDEX: Record<PetSpecies, number> = {
  panda: 2,
  cat: 3,
  pig: 4,
};

const REEL_SYMBOL_COUNT = 9;
const REEL_SOURCE_HEIGHT = 2560;
const REEL_CONTENT_WIDTH = 597;
const REEL_BASE_HEIGHT_RATIO = 0.408;
const REEL_DURATIONS_MS = [2200, 2850, 3500];
const REEL_CYCLES = [7, 9, 11];
const SPIN_PRESS_MS = 420;

interface SlotMachineOptions {
  refs: Pick<DomUiRefs, "slotReels" | "slotSpinButton" | "slotConfirmButton">;
  onConfirm(petSpecies: PetSpecies): void;
}

export interface SlotMachine {
  reset(): void;
  startSpin(): void;
  confirm(): void;
  attachListeners(): void;
}

function randomPetSpecies(): PetSpecies {
  return RESULT_PETS[Math.floor(Math.random() * RESULT_PETS.length)];
}

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function getCycleHeight(reel: HTMLElement): number {
  const reelWidth = reel.getBoundingClientRect().width || reel.clientWidth || 1;
  return (reelWidth * REEL_SOURCE_HEIGHT) / REEL_CONTENT_WIDTH;
}

function getTargetOffset(reel: HTMLElement, symbolIndex: number): number {
  const reelHeight = reel.getBoundingClientRect().height || reel.clientHeight || 1;
  const stageHeight = reel.closest(".slot-machine-stage")?.getBoundingClientRect().height ?? 0;
  const bottomReveal = Math.max(0, reelHeight - stageHeight * REEL_BASE_HEIGHT_RATIO);
  const targetCenterY = reelHeight / 2 - bottomReveal / 2;
  const cycleHeight = getCycleHeight(reel);
  const symbolHeight = cycleHeight / REEL_SYMBOL_COUNT;
  const rawOffset = targetCenterY - (symbolIndex + 0.5) * symbolHeight;
  return modulo(rawOffset, cycleHeight);
}

function getCurrentOffset(reel: HTMLElement): number {
  const offset = Number.parseFloat(reel.style.backgroundPositionY);
  return Number.isFinite(offset) ? offset : Math.random() * getCycleHeight(reel);
}

function setReelOffset(reel: HTMLElement, offset: number): void {
  reel.style.backgroundPositionY = `${offset}px`;
}

export function createSlotMachine(options: SlotMachineOptions): SlotMachine {
  const { refs, onConfirm } = options;
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  let selectedPet: PetSpecies | undefined;
  let isReady = false;
  let runId = 0;
  let animationFrameIds: number[] = [];
  let timerIds: number[] = [];

  function clearTimers(): void {
    for (const timerId of timerIds) {
      window.clearTimeout(timerId);
    }
    timerIds = [];
  }

  function clearFrames(): void {
    for (const frameId of animationFrameIds) {
      window.cancelAnimationFrame(frameId);
    }
    animationFrameIds = [];
  }

  function scheduleTimer(callback: () => void, delay: number): void {
    const timerId = window.setTimeout(() => {
      timerIds = timerIds.filter((candidate) => candidate !== timerId);
      callback();
    }, delay);
    timerIds.push(timerId);
  }

  function requestFrame(callback: FrameRequestCallback): void {
    const frameId = window.requestAnimationFrame((time) => {
      animationFrameIds = animationFrameIds.filter((candidate) => candidate !== frameId);
      callback(time);
    });
    animationFrameIds.push(frameId);
  }

  function setReady(ready: boolean): void {
    isReady = ready;
    refs.slotConfirmButton.disabled = !ready;
    refs.slotConfirmButton.dataset.ready = ready ? "true" : "false";
    refs.slotSpinButton.disabled = !ready;
    refs.slotSpinButton.dataset.ready = ready ? "true" : "false";
  }

  function setSpinPressed(pressed: boolean): void {
    refs.slotSpinButton.classList.toggle("is-pressed", pressed);
  }

  function setStaticResult(petSpecies: PetSpecies): void {
    const symbolIndex = PET_REEL_INDEX[petSpecies];
    for (const reel of refs.slotReels) {
      setReelOffset(reel, getTargetOffset(reel, symbolIndex));
    }
  }

  function cancelActiveRun(): void {
    runId += 1;
    clearFrames();
    clearTimers();
  }

  function animateReel(
    reel: HTMLElement,
    symbolIndex: number,
    duration: number,
    cycles: number,
    activeRunId: number,
  ): Promise<void> {
    const cycleHeight = getCycleHeight(reel);
    const startOffset = getCurrentOffset(reel);
    const targetOffset = getTargetOffset(reel, symbolIndex);
    let finalOffset = targetOffset + cycleHeight * cycles;

    if (finalOffset <= startOffset) {
      finalOffset += cycleHeight * Math.ceil((startOffset - finalOffset) / cycleHeight + 1);
    }

    return new Promise((resolve) => {
      let startTime = 0;

      const step = (time: number): void => {
        if (activeRunId !== runId) {
          resolve();
          return;
        }

        if (!startTime) {
          startTime = time;
        }

        const progress = Math.min((time - startTime) / duration, 1);
        const easedProgress = easeOutCubic(progress);
        const offset = startOffset + (finalOffset - startOffset) * easedProgress;
        setReelOffset(reel, offset);

        if (progress >= 1) {
          setReelOffset(reel, targetOffset);
          resolve();
          return;
        }

        requestFrame(step);
      };

      requestFrame(step);
    });
  }

  function reset(): void {
    cancelActiveRun();
    selectedPet = undefined;
    setReady(false);
    setSpinPressed(false);

    for (const reel of refs.slotReels) {
      setReelOffset(reel, 0);
    }
  }

  function startSpin(): void {
    cancelActiveRun();
    const activeRunId = runId;
    selectedPet = randomPetSpecies();
    setReady(false);
    setSpinPressed(true);

    if (reduceMotionQuery.matches) {
      setStaticResult(selectedPet);
      scheduleTimer(() => {
        setSpinPressed(false);
        setReady(true);
      }, 160);
      return;
    }

    scheduleTimer(() => setSpinPressed(false), SPIN_PRESS_MS);

    const symbolIndex = PET_REEL_INDEX[selectedPet];
    void Promise.all(
      refs.slotReels.map((reel, index) =>
        animateReel(reel, symbolIndex, REEL_DURATIONS_MS[index], REEL_CYCLES[index], activeRunId),
      ),
    ).then(() => {
      if (activeRunId !== runId || !selectedPet) {
        return;
      }

      setStaticResult(selectedPet);
      setReady(true);
    });
  }

  function confirm(): void {
    if (!isReady || !selectedPet) {
      return;
    }

    onConfirm(selectedPet);
  }

  function attachListeners(): void {
    refs.slotSpinButton.addEventListener("click", () => {
      if (isReady) {
        startSpin();
      }
    });
    refs.slotConfirmButton.addEventListener("click", confirm);
    window.addEventListener("resize", () => {
      if (isReady && selectedPet) {
        setStaticResult(selectedPet);
      }
    });
  }

  reset();

  return {
    reset,
    startSpin,
    confirm,
    attachListeners,
  };
}
