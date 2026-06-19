import { chapters } from "../../data";
import type { ChapterId, GameState, PlayerCustomization } from "../types";

export const SAVE_KEY = "agent-pet-escape-save-v1";
export const STATE_VERSION = 2;
const MIN_CODE_LIFE_MASS = 0.68;
const MAX_CODE_LIFE_MASS = 2.85;

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
    if (parsed.version !== STATE_VERSION && parsed.version !== 1) {
      return undefined;
    }

    const savedCollectibles = parsed.chapterCollectibles as Record<string, number> | undefined;
    const legacyChapterOffset = Object.prototype.hasOwnProperty.call(savedCollectibles ?? {}, "generation") ? 1 : 0;
    const savedChapterIndex = (parsed.currentChapterIndex ?? 0) - legacyChapterOffset;
    const migratedChapterIndex = parsed.version === 1 ? migrateV1ChapterIndex(savedChapterIndex) : savedChapterIndex;
    const currentChapterIndex = Math.max(0, Math.min(chapters.length - 1, migratedChapterIndex));
    const chapterCollectibles = createCollectibleRecord();
    for (const chapter of chapters) {
      const count = savedCollectibles?.[chapter.id];
      if (typeof count === "number") {
        chapterCollectibles[chapter.id] = count;
      }
    }

    return {
      ...parsed,
      version: STATE_VERSION,
      currentChapterIndex,
      customization: {
        ...parsed.customization,
        petSpecies: parsed.customization.petSpecies ?? "cat",
      } as PlayerCustomization,
      chapterCollectibles,
      codeLifeMass: sanitizeCodeLifeMass(parsed.codeLifeMass),
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

function migrateV1ChapterIndex(index: number): number {
  if (index <= 1) {
    return index;
  }
  if (index <= 3) {
    return 2;
  }
  return index - 1;
}

function sanitizeCodeLifeMass(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 1;
  }
  return Math.max(MIN_CODE_LIFE_MASS, Math.min(MAX_CODE_LIFE_MASS, value));
}
