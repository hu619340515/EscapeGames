import type { ChapterId } from "../types";

export const WORLD_WIDTH = 2400;
export const WORLD_HEIGHT = 900;
export const CURSOR_HUNT_WORLD_WIDTH = 1672;
export const CURSOR_HUNT_WORLD_HEIGHT = 941;
export const WRONG_GATEWAY_WORLD_WIDTH = 2880;
export const WRONG_GATEWAY_WORLD_HEIGHT = 1080;
export const PLAYER_SPEED = 250;
export const JUMP_SPEED = 480;

export type PlatformDef = readonly [x: number, y: number, width: number, height: number];

export interface WorldBounds {
  width: number;
  height: number;
}

const CURSOR_HUNT_PLATFORM_SURFACE_HEIGHT = 12;

function cursorHuntSurface(
  x: number,
  top: number,
  width: number,
  height = CURSOR_HUNT_PLATFORM_SURFACE_HEIGHT,
): PlatformDef {
  return [x, top + height / 2, width, height];
}

const cursorHuntPlatforms: PlatformDef[] = [
  cursorHuntSurface(CURSOR_HUNT_WORLD_WIDTH / 2, 875, CURSOR_HUNT_WORLD_WIDTH, 18),
  cursorHuntSurface(154, 150, 294),
  cursorHuntSurface(170, 304, 120),
  cursorHuntSurface(480, 292, 285),
  cursorHuntSurface(332, 404, 330),
  cursorHuntSurface(320, 608, 330),
  cursorHuntSurface(300, 713, 190),
  cursorHuntSurface(565, 723, 160),
  cursorHuntSurface(670, 101, 160),
  cursorHuntSurface(755, 349, 54),
  cursorHuntSurface(812, 467, 280),
  cursorHuntSurface(785, 612, 220),
  cursorHuntSurface(1040, 407, 250),
  cursorHuntSurface(1130, 733, 300),
  cursorHuntSurface(1310, 120, 190),
  cursorHuntSurface(1310, 407, 210),
  cursorHuntSurface(1525, 407, 260),
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

const wrongGatewayPlatforms: PlatformDef[] = [
  [410, 996, 820, 28],
  [1160, 996, 560, 28],
  [1840, 996, 520, 28],
  [2560, 996, 640, 28],
  [170, 908, 220, 22],
  [410, 822, 210, 22],
  [670, 732, 250, 22],
  [960, 638, 270, 22],
  [1210, 544, 230, 22],
  [1440, 452, 240, 22],
  [900, 356, 560, 22],
  [1448, 356, 500, 22],
  [1900, 504, 260, 22],
  [2160, 654, 260, 22],
  [2578, 878, 560, 28],
];

const wrongGatewayHazards = [
  { x: 520, y: 812 },
  { x: 1840, y: 812 },
] as const;

export function getWorldBounds(chapterId: ChapterId): WorldBounds {
  if (chapterId === "cursor-hunt") {
    return {
      width: CURSOR_HUNT_WORLD_WIDTH,
      height: CURSOR_HUNT_WORLD_HEIGHT,
    };
  }
  if (chapterId === "wrong-gateway") {
    return {
      width: WRONG_GATEWAY_WORLD_WIDTH,
      height: WRONG_GATEWAY_WORLD_HEIGHT,
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
  if (chapterId === "wrong-gateway") {
    return [...wrongGatewayPlatforms];
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
  if (chapterId === "wrong-gateway") {
    return 0;
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
  if (chapterId === "wrong-gateway") {
    return 0;
  }

  return chapterIndex < 4 ? 4 : 5;
}

export function getHazardPosition(index: number, chapterId: ChapterId): { x: number; y: number } {
  if (chapterId === "cursor-hunt") {
    return cursorHuntHazards[index] ?? cursorHuntHazards[0];
  }
  if (chapterId === "wrong-gateway") {
    return wrongGatewayHazards[index] ?? wrongGatewayHazards[0];
  }

  return {
    x: 430 + index * 370,
    y: 812,
  };
}
