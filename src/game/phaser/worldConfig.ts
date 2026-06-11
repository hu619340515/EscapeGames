import type { ChapterId } from "../types";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 900;
export const CURSOR_HUNT_WORLD_WIDTH = 1672;
export const CURSOR_HUNT_WORLD_HEIGHT = 941;
export const PLAYER_SPEED = 250;
export const JUMP_SPEED = 480;

export type PlatformDef = readonly [x: number, y: number, width: number, height: number];

export interface WorldBounds {
  width: number;
  height: number;
}

const cursorHuntPlatforms: PlatformDef[] = [
  [CURSOR_HUNT_WORLD_WIDTH / 2, 908, CURSOR_HUNT_WORLD_WIDTH, 66],
  [154, 164, 294, 28],
  [170, 317, 120, 26],
  [480, 306, 285, 28],
  [332, 418, 330, 28],
  [320, 622, 330, 28],
  [300, 725, 190, 24],
  [565, 735, 160, 24],
  [670, 114, 160, 26],
  [755, 360, 54, 22],
  [812, 480, 280, 26],
  [785, 625, 220, 26],
  [1040, 420, 250, 26],
  [1130, 746, 300, 26],
  [1310, 133, 190, 26],
  [1310, 420, 210, 26],
  [1525, 420, 260, 26],
];

const cursorHuntCollectibles = [
  { x: 418, y: 365 },
  { x: 720, y: 330 },
  { x: 1005, y: 382 },
  { x: 1175, y: 704 },
  { x: 1400, y: 378 },
  { x: 520, y: 690 },
  { x: 1540, y: 850 },
] as const;

const cursorHuntHazards = [
  { x: 395, y: 684 },
  { x: 845, y: 525 },
  { x: 1190, y: 815 },
  { x: 1480, y: 510 },
] as const;

export function getWorldBounds(chapterId: ChapterId): WorldBounds {
  if (chapterId === "cursor-hunt") {
    return {
      width: CURSOR_HUNT_WORLD_WIDTH,
      height: CURSOR_HUNT_WORLD_HEIGHT,
    };
  }

  return {
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
  };
}

export function getPlatformDefs(chapterId: ChapterId, chapterIndex: number): PlatformDef[] {
  if (chapterId === "cursor-hunt") {
    return [...cursorHuntPlatforms];
  }

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
  if (chapterId === "cursor-hunt") {
    return cursorHuntCollectibles.length;
  }

  return chapterId === "leder-d-drive" ? 9 : 7;
}

export function getCollectiblePosition(
  index: number,
  chapterId: ChapterId,
  chapterIndex: number,
): { x: number; y: number } {
  if (chapterId === "cursor-hunt") {
    return cursorHuntCollectibles[index] ?? cursorHuntCollectibles[0];
  }

  return {
    x: 260 + index * 250,
    y: 520 - (index % 3) * 90 + (chapterIndex % 2) * 30,
  };
}

export function getHazardCount(chapterId: ChapterId, chapterIndex: number): number {
  if (chapterId === "cursor-hunt") {
    return cursorHuntHazards.length;
  }

  return chapterIndex < 4 ? 4 : 5;
}

export function getHazardPosition(index: number, chapterId: ChapterId): { x: number; y: number } {
  if (chapterId === "cursor-hunt") {
    return cursorHuntHazards[index] ?? cursorHuntHazards[0];
  }

  return {
    x: 430 + index * 370,
    y: 812,
  };
}
