import type { ChapterId } from "../types";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 900;
export const PLAYER_SPEED = 250;
export const JUMP_SPEED = 480;

export type PlatformDef = readonly [x: number, y: number, width: number, height: number];

export function getPlatformDefs(chapterIndex: number): PlatformDef[] {
  const yOffset = chapterIndex % 2 === 0 ? 0 : 32;
  return [
    [WORLD_WIDTH / 2, 850, WORLD_WIDTH, 80],
    [280, 690 - yOffset, 340, 32],
    [690, 590 + yOffset, 310, 32],
    [1050, 705, 270, 32],
    [1430, 585 - yOffset, 330, 32],
    [1780, 700 + yOffset, 280, 32],
    [2110, 620, 260, 32],
    [1320, 430, 220, 26],
  ];
}

export function getCollectibleCount(chapterId: ChapterId): number {
  return chapterId === "leder-d-drive" ? 9 : 7;
}

export function getCollectiblePosition(index: number, chapterIndex: number): { x: number; y: number } {
  return {
    x: 260 + index * 250,
    y: 520 - (index % 3) * 90 + (chapterIndex % 2) * 30,
  };
}

export function getHazardCount(chapterIndex: number): number {
  return chapterIndex < 4 ? 4 : 5;
}

export function getHazardPosition(index: number): { x: number; y: number } {
  return {
    x: 430 + index * 370,
    y: 812,
  };
}
