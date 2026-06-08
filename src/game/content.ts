import { abilities, bosses, chapters, endings } from "../data";
import type { AbilityDef, AbilityId, BossDef, BossId, ChapterDef, ChapterId, EndingDef, EndingId } from "./types";

export const abilityById = new Map<AbilityId, AbilityDef>(abilities.map((ability) => [ability.id, ability]));
export const bossById = new Map<BossId, BossDef>(bosses.map((boss) => [boss.id, boss]));
export const chapterById = new Map<ChapterId, ChapterDef>(chapters.map((chapter) => [chapter.id, chapter]));
export const endingById = new Map<EndingId, EndingDef>(endings.map((ending) => [ending.id, ending]));

export function getChapterByIndex(index: number): ChapterDef {
  const chapter = chapters[index];
  if (!chapter) {
    throw new Error(`Missing chapter at index ${index}`);
  }
  return chapter;
}

export function getBoss(id: BossId): BossDef {
  const boss = bossById.get(id);
  if (!boss) {
    throw new Error(`Missing boss ${id}`);
  }
  return boss;
}

export function getAbility(id: AbilityId): AbilityDef {
  const ability = abilityById.get(id);
  if (!ability) {
    throw new Error(`Missing ability ${id}`);
  }
  return ability;
}

export function getEnding(id: EndingId): EndingDef {
  const ending = endingById.get(id);
  if (!ending) {
    throw new Error(`Missing ending ${id}`);
  }
  return ending;
}
