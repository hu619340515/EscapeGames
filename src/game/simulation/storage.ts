import { chapters } from "../../data";
import type { ChapterId, GameState, PlayerCustomization } from "../types";

export const SAVE_KEY = "agent-pet-escape-save-v1";
export const STATE_VERSION = 1;

export function createCollectibleRecord(): Record<ChapterId, number> {
  return Object.fromEntries(chapters.map((chapter) => [chapter.id, 0])) as Record<ChapterId, number>;
}

export function loadSavedRun(): GameState | undefined {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return undefined;
    }

    const parsed = JSON.parse(raw) as Omit<GameState, "customization"> & {
      customization: Partial<PlayerCustomization>;
    };
    if (parsed.version !== STATE_VERSION) {
      return undefined;
    }

    return {
      ...parsed,
      customization: {
        ...parsed.customization,
        petSpecies: parsed.customization.petSpecies ?? "cat",
      } as PlayerCustomization,
      chapterCollectibles: {
        ...createCollectibleRecord(),
        ...parsed.chapterCollectibles,
      },
    };
  } catch {
    return undefined;
  }
}

export function saveRun(state: GameState): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearSavedRun(): void {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // Ignore storage cleanup failures.
  }
}

export function hasSavedRun(): boolean {
  try {
    return Boolean(localStorage.getItem(SAVE_KEY));
  } catch {
    return false;
  }
}
